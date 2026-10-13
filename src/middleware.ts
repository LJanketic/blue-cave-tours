import type { APIContext, MiddlewareNext } from 'astro';
import { defineMiddleware } from 'astro:middleware';
import { ADMIN_COOKIE, verifySessionToken } from './lib/admin/auth';
import { SECURITY_HEADERS } from './config/security-headers';

const LOGIN_PATH = '/admin/login/';

function isAdminPath(pathname: string): boolean {
	return pathname === '/admin' || pathname.startsWith('/admin/');
}

/**
 * Server-rendered booking pages and API responses carry customers' details.
 * Set here rather than in netlify.toml, whose header rules don't reliably
 * reach responses from the server function.
 */
function carriesCustomerData(pathname: string): boolean {
	return pathname.startsWith('/booking/') || pathname.startsWith('/api/') || pathname.startsWith('/book/');
}

function setHeaders(response: Response, headers: Record<string, string>): Response {
	try {
		for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
	} catch {
		// Some responses (e.g. Response.redirect) have immutable headers; a redirect has no page to frame or cache.
	}
	return response;
}

function noStore(response: Response, robots: boolean): Response {
	return setHeaders(response, { 'Cache-Control': 'no-store', ...(robots ? { 'X-Robots-Tag': 'noindex, nofollow' } : {}) });
}

/**
 * Guards every /admin page behind the session cookie, keeps private pages out
 * of caches and search engines, and gives server-rendered responses the
 * security headers that netlify.toml gives prerendered pages.
 */
export const onRequest = defineMiddleware(async (context, next) => {
	if (context.isPrerendered) return next();
	return setHeaders(await guard(context, next), SECURITY_HEADERS);
});

async function guard(context: APIContext, next: MiddlewareNext): Promise<Response> {
	const { pathname } = context.url;

	if (isAdminPath(pathname)) {
		const isLogin = pathname === LOGIN_PATH || pathname === LOGIN_PATH.slice(0, -1);
		if (!isLogin && !verifySessionToken(context.cookies.get(ADMIN_COOKIE)?.value)) {
			// Remember where they were going (e.g. a link in a booking email).
			const next = context.request.method === 'GET' ? `?next=${encodeURIComponent(pathname + context.url.search)}` : '';
			return context.redirect(`${LOGIN_PATH}${next}`, 303);
		}
		return noStore(await next(), true);
	}

	if (carriesCustomerData(pathname)) return noStore(await next(), false);
	return next();
}
