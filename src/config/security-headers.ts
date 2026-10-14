/**
 * Security headers for every response. netlify.toml sets the same values on
 * the prerendered pages; its header rules don't reach responses from the
 * server function (admin, booking, API), so middleware sets these there.
 * security-headers.test.ts keeps the two in step.
 *
 * 'unsafe-inline' on script-src/style-src: see the note in netlify.toml.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
	'X-Frame-Options': 'DENY',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
	'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
	'Content-Security-Policy':
		"default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src https://challenges.cloudflare.com; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
};

/**
 * Pages whose URL can identify a booking or a customer. They send a Referer
 * only to this site, so a link out of them (map, payment provider) leaks
 * nothing. Not `no-referrer`: with it, browsers send `Origin: null` on form
 * posts, and Astro's checkOrigin then refuses the admin login and checkout.
 */
export function isPrivatePage(pathname: string): boolean {
	return (
		pathname === '/admin' ||
		pathname.startsWith('/admin/') ||
		pathname.startsWith('/booking/') ||
		/^\/book\/[^/]+\/review\/?$/.test(pathname)
	);
}

/** The headers middleware sets on a server-rendered response for `pathname`. */
export function securityHeadersFor(pathname: string): Record<string, string> {
	return isPrivatePage(pathname) ? { ...SECURITY_HEADERS, 'Referrer-Policy': 'same-origin' } : { ...SECURITY_HEADERS };
}
