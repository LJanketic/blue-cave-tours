import { getStore } from '@netlify/blobs';

/** Fixed-window IP rate limit for public API routes, backed by Netlify Blobs
 * so counts survive cold starts across function invocations. */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;
const MAX_CAS_ATTEMPTS = 3;

type Bucket = { count: number; windowStart: number };

/**
 * Falls open (allows the request) if Blobs isn't reachable in this
 * environment — e.g. plain `astro dev` without `netlify dev` — or if a
 * concurrent writer keeps winning the compare-and-swap race after a few
 * tries. The honeypot and min-submit-time checks in contact-validation still
 * apply either way, so this is defense in depth, not the only gate.
 *
 * Uses `onlyIfNew`/`onlyIfMatch` (compare-and-swap on the blob's etag)
 * instead of a plain read-then-write: two requests from the same IP landing
 * within milliseconds of each other would otherwise both read the same
 * count and both succeed, letting bursts sneak past MAX_REQUESTS. Note:
 * `astro dev`'s local Blobs emulator has a non-atomic check-then-write in
 * its own PUT handler, so this can't be proven race-free against local dev —
 * only against the real Netlify Blobs backend in production, which documents
 * these conditions as atomic.
 */
export async function checkRateLimit(key: string): Promise<{ ok: boolean }> {
	let store;
	try {
		store = getStore({ name: 'rate-limits', consistency: 'strong' });
	} catch {
		return { ok: true };
	}

	const now = Date.now();
	try {
		for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
			const existing = await store.getWithMetadata(key, { type: 'json' });

			if (!existing || now - (existing.data as Bucket).windowStart > WINDOW_MS) {
				const fresh: Bucket = { count: 1, windowStart: now };
				const result = existing
					? await store.setJSON(key, fresh, { onlyIfMatch: existing.etag })
					: await store.setJSON(key, fresh, { onlyIfNew: true });
				if (result.modified) return { ok: true };
				continue;
			}

			const bucket = existing.data as Bucket;
			if (bucket.count >= MAX_REQUESTS) {
				return { ok: false };
			}

			const result = await store.setJSON(
				key,
				{ count: bucket.count + 1, windowStart: bucket.windowStart } satisfies Bucket,
				{ onlyIfMatch: existing.etag },
			);
			if (result.modified) return { ok: true };
		}
		return { ok: true };
	} catch {
		return { ok: true };
	}
}
