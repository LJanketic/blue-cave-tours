import { beforeEach, describe, expect, it, vi } from 'vitest';

// Netlify Blobs isn't available in tests; the limiter is covered by its own
// behaviour in production. Here it always allows unless a test says otherwise.
const rateLimit = vi.hoisted(() => ({ ok: true }));
vi.mock('./rate-limit', () => ({ checkRateLimit: async () => rateLimit, clientIp: () => '203.0.113.1' }));

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

describe('POST /api/contact without JavaScript (form posts)', () => {
	beforeEach(() => {
		rateLimit.ok = true;
	});

	function postForm(fields: Record<string, string>) {
		const request = new Request('http://localhost/api/contact', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams(fields).toString(),
		});
		return POST({ request } as Parameters<typeof POST>[0]);
	}
	const form = (overrides: Record<string, string> = {}) => ({
		firstName: 'Jane',
		lastName: 'Smith',
		email: 'jane@example.com',
		message: 'Two adults on 15 July, please.',
		topic: 'group',
		_startedAt: String(Date.now() - 10_000),
		...overrides,
	});

	it('redirects to the sent page, with nothing personal in the URL', async () => {
		const res = await postForm(form());
		expect(res.status).toBe(303);
		expect(res.headers.get('location')).toBe('/contact/sent/');
	});

	it('redirects to the problem page with only an error code', async () => {
		const res = await postForm(form({ email: 'not-an-email' }));
		expect(res.status).toBe(303);
		expect(res.headers.get('location')).toBe('/contact/problem/?error=email');
	});

	it('joins first and last name, and checks topic and booking reference', async () => {
		expect((await postForm(form({ firstName: '', lastName: '' }))).headers.get('location')).toBe('/contact/problem/?error=name');
		expect((await postForm(form({ topic: 'spam' }))).headers.get('location')).toBe('/contact/problem/?error=topic');
		expect((await postForm(form({ topic: 'change', bookingRef: 'nope' }))).headers.get('location')).toBe(
			'/contact/problem/?error=booking-ref',
		);
		expect((await postForm(form({ topic: 'change', bookingRef: 'hbc-7k3qxm' }))).headers.get('location')).toBe('/contact/sent/');
	});

	it('accepts a plain form post without a start time (no JavaScript sets one)', async () => {
		const { _startedAt, ...rest } = form();
		expect(_startedAt).toBeTruthy();
		expect((await postForm(rest)).headers.get('location')).toBe('/contact/sent/');
	});

	it('still drops honeypot posts silently', async () => {
		expect((await postForm(form({ company: 'Acme' }))).headers.get('location')).toBe('/contact/sent/');
	});

	it('refuses other content types', async () => {
		const request = new Request('http://localhost/api/contact', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'hi' });
		expect((await POST({ request } as Parameters<typeof POST>[0])).status).toBe(415);
	});
});
