/**
 * In-process fixed-window rate limiter (best-effort abuse throttle).
 *
 * ## Netlify / serverless limitation
 * Astro SSR on Netlify runs in ephemeral function instances. Each warm instance
 * keeps its own in-memory Map, so limits apply **per instance**, not globally.
 * A determined client can exceed the nominal cap by hitting different instances.
 *
 * For production, combine this with:
 * - [Netlify rate limiting / WAF](https://docs.netlify.com/security/secure-access-to-sites/rate-limiting/)
 * - A shared store (Upstash Redis, Supabase row locks, etc.) if you need hard global caps
 *
 * This module still helps against casual scraping and form spam on a single instance.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const DEFAULT_LIMIT = 30;
const DEFAULT_WINDOW_MS = 60_000;
/** Prevent unbounded growth on long-lived warm Netlify instances. */
const MAX_BUCKETS = 10_000;

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

function pruneStaleBuckets(now: number): void {
	if (buckets.size <= MAX_BUCKETS) return;
	for (const [key, bucket] of buckets) {
		if (now >= bucket.resetAt) buckets.delete(key);
	}
}

export function checkRateLimit(
	key: string,
	limit = DEFAULT_LIMIT,
	windowMs = DEFAULT_WINDOW_MS,
): RateLimitResult {
	const now = Date.now();
	pruneStaleBuckets(now);

	let bucket = buckets.get(key);
	if (!bucket || now >= bucket.resetAt) {
		bucket = { count: 0, resetAt: now + windowMs };
		buckets.set(key, bucket);
	}
	bucket.count += 1;
	if (bucket.count > limit) {
		return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
	}
	return { ok: true };
}

/**
 * Prefer Netlify's trusted client IP header when present.
 * `x-forwarded-for` alone can be spoofed before the CDN; Netlify sets
 * `x-nf-client-connection-ip` to the connecting client.
 */
export function getClientIp(request: Request): string {
	const netlifyIp = request.headers.get('x-nf-client-connection-ip');
	if (netlifyIp) return netlifyIp.trim();

	const forwarded = request.headers.get('x-forwarded-for');
	if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';

	return request.headers.get('x-real-ip') ?? 'unknown';
}
