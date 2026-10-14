import { createHmac } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { secretKey } from './secrets';

/**
 * Fixed-window rate limits for public routes, in Netlify Blobs so counts
 * survive cold starts (spec S-11).
 *
 * Privacy: keys never hold the raw IP. It's HMAC-SHA256'd with a secret salt
 * (RATE_LIMIT_SALT, else derived from the admin secret) and cut to 16 bytes;
 * IPv6 addresses are first cut to their /64, since one household gets a whole
 * /64. Keys carry the UTC date, and writes now and then sweep earlier days'
 * keys, so nothing about a visitor outlives the day it was counted (S-13).
 *
 * Concurrency: compare-and-swap on the blob's etag, so a burst from one IP
 * can't all read the same count. `astro dev`'s Blobs emulator isn't atomic,
 * so that's only guaranteed against the real Netlify backend.
 *
 * Failure: by default it fails open (the contact form and admin login have
 * other gates). Booking endpoints pass `failClosed`: if the limiter can't run,
 * they refuse rather than run unlimited.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;
const MAX_CAS_ATTEMPTS = 3;
/** One write in this many also deletes earlier days' buckets. */
const SWEEP_ONE_IN = 25;

type Bucket = { count: number; windowStart: number };
export type RateLimitOptions = { max?: number; windowMs?: number; failClosed?: boolean };

/** The /64 network for IPv6, the address for IPv4. */
export function ipNetwork(ip: string): string {
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
	const salt = secretKey('rate-limit', 'RATE_LIMIT_SALT');
	return salt ? createHmac('sha256', salt).update(ipNetwork(ip)).digest().subarray(0, 16).toString('base64url') : null;
}

function day(now: number): string {
	return new Date(now).toISOString().slice(0, 10);
}

function openStore() {
	try {
		return getStore({ name: 'rate-limits', consistency: 'strong' });
	} catch {
		return null;
	}
}

async function count(key: string, max: number, windowMs: number, now: number): Promise<boolean | null> {
	const store = openStore();
	if (!store) return null;
	try {
		for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
			const existing = await store.getWithMetadata(key, { type: 'json' });
			if (!existing || now - (existing.data as Bucket).windowStart > windowMs) {
				const fresh: Bucket = { count: 1, windowStart: now };
				const result = existing
					? await store.setJSON(key, fresh, { onlyIfMatch: existing.etag })
					: await store.setJSON(key, fresh, { onlyIfNew: true });
				if (result.modified) return true;
				continue;
			}
			const bucket = existing.data as Bucket;
			if (bucket.count >= max) return false;
			const result = await store.setJSON(key, { count: bucket.count + 1, windowStart: bucket.windowStart } satisfies Bucket, {
				onlyIfMatch: existing.etag,
			});
			if (result.modified) return true;
		}
		// Lost every race: let it through rather than fail a real visitor.
		return true;
	} catch {
		return null;
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
 * when over the limit, or when the limiter can't run and `failClosed` is set.
 */
export async function checkRateLimit(scope: string, ip: string | null, options: RateLimitOptions = {}): Promise<{ ok: boolean }> {
	const { max = MAX_REQUESTS, windowMs = WINDOW_MS, failClosed = false } = options;
	const now = Date.now();
	const client = hashClient(ip ?? 'unknown');
	if (!client) return { ok: !failClosed };
	const allowed = await count(`${scope}:${day(now)}:${client}`, max, windowMs, now);
	if (allowed === null) return { ok: !failClosed };
	void sweep(scope, now);
	return { ok: allowed };
}

/** A cap on everyone together (e.g. 300 drafts per 10 minutes), against floods from many IPs. */
export async function checkGlobalLimit(scope: string, options: RateLimitOptions = {}): Promise<{ ok: boolean }> {
	const { max = MAX_REQUESTS, windowMs = WINDOW_MS, failClosed = false } = options;
	const now = Date.now();
	const allowed = await count(`${scope}:${day(now)}:all`, max, windowMs, now);
	if (allowed === null) return { ok: !failClosed };
	void sweep(scope, now);
	return { ok: allowed };
}

/** The visitor's IP as Netlify reports it. */
export function clientIp(request: Request): string | null {
	return request.headers.get('x-nf-client-connection-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
}
