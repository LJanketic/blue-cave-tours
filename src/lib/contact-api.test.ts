import { beforeEach, describe, expect, it, vi } from 'vitest';

// Netlify Blobs isn't available in tests; the limiter is covered by its own
// behaviour in production. Here it always allows unless a test says otherwise.
const rateLimit = vi.hoisted(() => ({ ok: true }));
vi.mock('./rate-limit', () => ({ checkRateLimit: async () => rateLimit }));

const { POST } = await import('../pages/api/contact');

function post(body: string, headers: Record<string, string> = {}) {
	const request = new Request('http://localhost/api/contact', {
		method: 'POST',
		headers: { 'content-type': 'application/json', ...headers },
		body,
	});
	// The handler only reads `request` from the Astro context.
	return POST({ request } as Parameters<typeof POST>[0]);
}

const validBody = (overrides: Record<string, unknown> = {}) =>
	JSON.stringify({
		name: 'Jane Smith',
		email: 'jane@example.com',
		message: 'Two adults on 15 July, please.',
		_startedAt: Date.now() - 10_000,
		...overrides,
	});

describe('POST /api/contact', () => {
	beforeEach(() => {
		rateLimit.ok = true;
	});

	it('accepts a valid submission', async () => {
		const res = await post(validBody());
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
	});

	it.each(['null', '[]', '"text"', '{broken'])('returns 400 (not 500) for a %s body', async (body) => {
		const res = await post(body);
		expect(res.status).toBe(400);
	});

	it('rejects oversized bodies even without a content-length header', async () => {
		const res = await post(validBody({ message: 'x'.repeat(20_000) }));
		expect(res.status).toBe(413);
	});

	it('stops reading a chunked body with no content-length once it passes the cap', async () => {
		let pulled = 0;
		const chunk = new TextEncoder().encode('x'.repeat(8_192));
		const body = new ReadableStream<Uint8Array>({
			pull(controller) {
				pulled += 1;
				if (pulled > 100) controller.close();
				else controller.enqueue(chunk);
			},
		});
		const request = new Request('http://localhost/api/contact', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body,
			// Required by Node's fetch for streamed request bodies.
			duplex: 'half',
		} as RequestInit);
		expect(request.headers.get('content-length')).toBeNull();
		const res = await POST({ request } as Parameters<typeof POST>[0]);
		expect(res.status).toBe(413);
		expect(pulled).toBeLessThan(10);
	});

	it('rejects unknown tours and points at the tour field', async () => {
		const res = await post(validBody({ tourSlug: 'no-such-tour' }));
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: 'Invalid tour selection', fields: ['tourSlug'] });
	});

	it('returns 429 when the rate limit is hit', async () => {
		rateLimit.ok = false;
		const res = await post(validBody());
		expect(res.status).toBe(429);
	});
});
