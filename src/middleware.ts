import { defineMiddleware } from 'astro:middleware';
import { ADMIN_COOKIE, verifySessionToken } from './lib/admin/auth';

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

function noStore(response: Response, robots: boolean): Response {
	try {
		response.headers.set('Cache-Control', 'no-store');
		if (robots) response.headers.set('X-Robots-Tag', 'noindex, nofollow');
	} catch {
		// Some responses (e.g. Response.redirect) have immutable headers; they carry no data worth caching anyway.
	}
	return response;
}

/** Guards every /admin page behind the session cookie, and keeps private pages out of caches and search engines. */
export const onRequest = defineMiddleware(async (context, next) => {
	const { pathname } = context.url;
	if (context.isPrerendered) return next();

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
});
