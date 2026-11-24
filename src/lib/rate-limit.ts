import { createHmac } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { scopedName } from './bookings/store';
import { secretKey } from './secrets';

/**
 * Fixed-window rate limits for public routes, in Netlify Blobs so counts
 * survive cold starts (spec S-11).
 *
 * Privacy: keys never hold the raw IP. It's HMAC-SHA256'd with a secret salt
 * (RATE_LIMIT_SALT, its own secret) and cut to 16 bytes;
 * IPv6 addresses are first cut to their /64, since one household gets a whole
 * /64. Keys carry the UTC date, and writes now and then sweep earlier days'
 * keys, so nothing about a visitor outlives the day it was counted (S-13).
 *
 * Concurrency: compare-and-swap on the blob's etag, so a burst from one IP
 * can't all read the same count. `astro dev`'s Blobs emulator isn't atomic,
 * so that's only guaranteed against the real Netlify backend.
 *
 * Failure: by default it fails open (the contact form has other gates).
 * `failClosed` means something different for the two kinds of limit:
 * - Per IP (checkRateLimit): it refuses when the limiter can't run, and when
 *   it loses every compare-and-swap race. Lost races on one IP's bucket mean
 *   that IP is sending a burst, so refusing it costs nobody else anything.
 * - Everyone together (checkGlobalLimit): it refuses only
 *   when the limiter can't run. A lost race on the shared bucket is just many
 *   real guests at once, so it lets the request through: the per-IP limits
 *   still hold each of them, and a busy hour must never refuse real bookings.
 * - A strict global cap (reserveGlobalLimit, for admin logins): a lost race
 *   counts as a hit and refuses the request, so a parallel burst can't slip
 *   past the cap uncounted.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;
const MAX_CAS_ATTEMPTS = 4;
/** Before each retry, a short random wait, so racing writers stop colliding in step. */
const RETRY_JITTER_MS = 25;
/** One write in this many also deletes earlier days' buckets. */
const SWEEP_ONE_IN = 25;

type Bucket = { count: number; windowStart: number };
export type LimitOptions = { max?: number; windowMs?: number };
/** Per IP: `failClosed` refuses when the limiter can't run or loses every race on the bucket. */
export type RateLimitOptions = LimitOptions & { failClosed?: boolean };
/** Everyone together: `failClosed` refuses only when the limiter can't run; a lost race lets the request through. */
export type GlobalLimitOptions = LimitOptions & { failClosed?: boolean };

/** What one count did: counted, over the limit, lost every race, or couldn't reach the store. */
type Outcome = 'counted' | 'over' | 'contended' | 'unavailable';

const pause = () => new Promise((resolve) => setTimeout(resolve, 1 + Math.random() * RETRY_JITTER_MS));

/** The /64 network for IPv6, the address for IPv4. */
export function ipNetwork(ip: string): string {
	// An IPv4 address written as IPv6 (::ffff:1.2.3.4) is that IPv4 address, not a shared /64.
	const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
	if (mapped) return mapped[1];
	if (!ip.includes(':')) return ip;
	const [head] = ip.split('%');
	const parts = head.split('::');
	const left = parts[0] ? parts[0].split(':') : [];
	const right = parts[1] ? parts[1].split(':') : [];
	const full = parts.length === 2 ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right] : left;
	return full.slice(0, 4).map((group) => group.toLowerCase().replace(/^0+(?=.)/, '')).join(':') + '::/64';
}

/** What the store keeps instead of the IP: a keyed hash, 16 bytes. */
export function hashClient(ip: string): string | null {
	const salt = secretKey('rate-limit');
	return salt ? createHmac('sha256', salt).update(ipNetwork(ip)).digest().subarray(0, 16).toString('base64url') : null;
}

function day(now: number): string {
	return new Date(now).toISOString().slice(0, 10);
}

function openStore() {
	try {
		// Per deploy context, like the bookings: previews and tests never count against production's limits.
		return getStore({ name: scopedName('rate-limits'), consistency: 'strong' });
	} catch {
		return null;
	}
}

/** One count, and the window it landed in when it was counted (so it can be released). */
type Counted = { outcome: Outcome; windowStart?: number };

async function count(key: string, max: number, windowMs: number, now: number): Promise<Counted> {
	const store = openStore();
	if (!store) return { outcome: 'unavailable' };
	try {
		for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
			if (attempt > 0) await pause();
			const existing = await store.getWithMetadata(key, { type: 'json' });
			if (!existing || now - (existing.data as Bucket).windowStart > windowMs) {
				const fresh: Bucket = { count: 1, windowStart: now };
				const result = existing
					? await store.setJSON(key, fresh, { onlyIfMatch: existing.etag })
					: await store.setJSON(key, fresh, { onlyIfNew: true });
				if (result.modified) return { outcome: 'counted', windowStart: now };
				continue;
			}
			const bucket = existing.data as Bucket;
			if (bucket.count >= max) return { outcome: 'over' };
			const result = await store.setJSON(key, { count: bucket.count + 1, windowStart: bucket.windowStart } satisfies Bucket, {
				onlyIfMatch: existing.etag,
			});
			if (result.modified) return { outcome: 'counted', windowStart: bucket.windowStart };
		}
		return { outcome: 'contended' };
	} catch {
		return { outcome: 'unavailable' };
	}
}

/** Takes back one count, if the window it landed in is still the current one. Best effort: a lost race keeps the count. */
async function uncount(key: string, windowStart: number): Promise<void> {
	const store = openStore();
	if (!store) return;
	try {
		for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
			if (attempt > 0) await pause();
			const existing = await store.getWithMetadata(key, { type: 'json' });
			const bucket = existing?.data as Bucket | undefined;
			if (!existing || !bucket || bucket.windowStart !== windowStart || bucket.count <= 0) return;
			const result = await store.setJSON(key, { count: bucket.count - 1, windowStart } satisfies Bucket, { onlyIfMatch: existing.etag });
			if (result.modified) return;
		}
	} catch {
		// Kept counted: the safe side.
	}
}

async function sweep(scope: string, now: number): Promise<void> {
	if (Math.random() * SWEEP_ONE_IN >= 1) return;
	const store = openStore();
	if (!store) return;
	try {
		const today = day(now);
		const { blobs } = await store.list({ prefix: `${scope}:` });
		await Promise.all(blobs.filter(({ key }) => key.split(':')[1] !== today).map(({ key }) => store.delete(key)));
	} catch {
		// Best effort: the next sweep tries again.
	}
}

/**
 * Counts one request from `ip` in `scope` (e.g. 'contact', 'draft'). ok:false
 * when over the limit, or, with `failClosed`, when the limiter can't run or
 * loses every compare-and-swap race on this IP's bucket.
 */
export async function checkRateLimit(scope: string, ip: string | null, options: RateLimitOptions = {}): Promise<{ ok: boolean }> {
	const { max = MAX_REQUESTS, windowMs = WINDOW_MS, failClosed = false } = options;
	const now = Date.now();
	const client = hashClient(ip ?? 'unknown');
	if (!client) return { ok: !failClosed };
	const { outcome } = await count(`${scope}:${day(now)}:${client}`, max, windowMs, now);
	if (outcome === 'unavailable' || outcome === 'contended') return { ok: !failClosed };
	void sweep(scope, now);
	return { ok: outcome === 'counted' };
}

/**
 * A cap on everyone together (e.g. 1000 bookings per 10 minutes), against
 * floods from many IPs. Counts one request. A lost race lets it through, even
 * with `failClosed` (which then only covers a limiter that can't run): the
 * shared bucket is contended by real guests too.
 */
export async function checkGlobalLimit(scope: string, options: GlobalLimitOptions = {}): Promise<{ ok: boolean }> {
	const { max = MAX_REQUESTS, windowMs = WINDOW_MS, failClosed = false } = options;
	const now = Date.now();
	const { outcome } = await count(`${scope}:${day(now)}:all`, max, windowMs, now);
	if (outcome === 'unavailable') return { ok: !failClosed };
	if (outcome === 'contended') return { ok: true };
	void sweep(scope, now);
	return { ok: outcome === 'counted' };
}

export type Reservation = { ok: true; release(): Promise<void> } | { ok: false; reason: 'over' | 'contended' | 'unavailable' };

/**
 * A strict cap on everyone together: counts one request BEFORE the work it
 * guards (e.g. comparing an admin password), and lets it through only when
 * the count was written. Over the cap, a lost race (counted as a hit, so a
 * parallel burst can't run past the cap uncounted) and a limiter that can't
 * run all refuse. `release()` takes the count back, best effort, for a
 * request that turned out not to count (a correct password).
 */
export async function reserveGlobalLimit(scope: string, options: LimitOptions = {}): Promise<Reservation> {
	const { max = MAX_REQUESTS, windowMs = WINDOW_MS } = options;
	const now = Date.now();
	const key = `${scope}:${day(now)}:all`;
	const { outcome, windowStart } = await count(key, max, windowMs, now);
	if (outcome !== 'counted') return { ok: false, reason: outcome };
	void sweep(scope, now);
	return { ok: true, release: () => uncount(key, windowStart as number) };
}

/** The visitor's IP as Netlify reports it. */
export function clientIp(request: Request): string | null {
	// X-Forwarded-For is client-controlled: trusted only by the local dev server, which has no Netlify header.
	const netlify = request.headers.get('x-nf-client-connection-ip');
	if (netlify || !import.meta.env.DEV) return netlify;
	return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
}
