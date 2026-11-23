import { describe, expect, it } from 'vitest';
import type { APIContext } from 'astro';
import { onRequest } from './middleware';
import { SECURITY_HEADERS } from './config/security-headers';

/** Just enough of Astro's context for the middleware: no admin cookie, so admin pages redirect. */
function contextFor(path: string, method = 'GET'): APIContext {
	const url = new URL(path, 'https://example.test');
	return {
		url,
		request: new Request(url, { method }),
		isPrerendered: false,
		cookies: { get: () => undefined },
		redirect: (location: string, status = 302) => new Response(null, { status, headers: { Location: location } }),
	} as unknown as APIContext;
}

async function run(path: string): Promise<Response> {
	const response = await onRequest(contextFor(path), async () => new Response('ok'));
	if (!(response instanceof Response)) throw new Error('middleware returned no Response');
	return response;
}

describe('middleware security headers', () => {
	it.each(['/admin/login/', '/admin/', '/booking/pay/', '/book/x/review/', '/api/contact'])('sets the full set on %s', async (path) => {
		const response = await run(path);
		for (const name of ['Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options', 'Permissions-Policy', 'Strict-Transport-Security']) {
			expect(response.headers.get(name), name).toBe(SECURITY_HEADERS[name]);
		}
	});

	it.each(['/admin/login/', '/admin/', '/booking/pay/', '/booking/success/', '/book/x/review/'])('sends a Referer only to this site from private page %s', async (path) => {
		expect((await run(path)).headers.get('Referrer-Policy')).toBe('same-origin');
	});

	it('keeps the site-wide Referrer-Policy elsewhere', async () => {
		expect((await run('/api/contact')).headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
	});

	it('still redirects a signed-out admin request to the login page', async () => {
		const response = await run('/admin/bookings/');
		expect(response.status).toBe(303);
		expect(response.headers.get('Location')).toBe('/admin/login/?next=%2Fadmin%2Fbookings%2F');
		expect(response.headers.get('X-Frame-Options')).toBe('DENY');
	});
});

describe('middleware on not-found responses (P2-1)', () => {
	const notFound = async () => new Response('<h1>Page not found</h1>', { status: 404, headers: { 'Content-Type': 'text/html' } });
	const HEADERS = ['Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy', 'Strict-Transport-Security'];

	it('gives the server-rendered 404 for an unknown URL the full set', async () => {
		const response = await onRequest(contextFor('/wp-login.php'), notFound);
		if (!(response instanceof Response)) throw new Error('middleware returned no Response');
		expect(response.status).toBe(404);
		for (const name of HEADERS) expect(response.headers.get(name), name).toBe(SECURITY_HEADERS[name]);
	});

	it('also gives them to a 404 Astro marks prerendered, but leaves other prerendered pages to netlify.toml', async () => {
		const prerendered = (path: string) => ({ ...contextFor(path), isPrerendered: true }) as APIContext;
		const missing = await onRequest(prerendered('/404'), notFound);
		if (!(missing instanceof Response)) throw new Error('middleware returned no Response');
		for (const name of HEADERS) expect(missing.headers.get(name), name).toBe(SECURITY_HEADERS[name]);

		const page = await onRequest(prerendered('/tours/'), async () => new Response('ok'));
		if (!(page instanceof Response)) throw new Error('middleware returned no Response');
		expect(page.headers.get('Content-Security-Policy')).toBeNull();
	});
});
