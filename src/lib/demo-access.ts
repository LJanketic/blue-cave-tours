import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { adminPasswordFingerprint } from './admin/auth';
import { secretKey } from './secrets';
import { deployContext } from './bookings/store';

/**
 * The demo-access cookie: lets one browser use the demo checkout on a build
 * where it isn't open to everyone (production, while payments are a demo).
 * An admin sets it from /admin/tools ("Enable demo checkout in this browser"),
 * so the boss can still show the whole flow; guests never get it. Signed with
 * DEMO_ACCESS_SECRET alone: without it (or with one under 32 characters) no
 * cookie is valid and the admin button says so. Rotating the secret switches
 * demo checkout off in every browser.
 *
 * The value is `v2.<expiry ms>.<HMAC>`, and holds nothing about the person.
 * The HMAC also covers two things the cookie doesn't carry (W0 review S7):
 * - the deploy context inlined at build time, so a cookie minted on a deploy
 *   preview or branch deploy (which share DEMO_ACCESS_SECRET with production)
 *   is refused on production, and the other way round;
 * - a fingerprint of ADMIN_PASSWORD, so changing the admin password switches
 *   demo checkout off in every browser, like it signs every admin out.
 */

export const DEMO_ACCESS_COOKIE = 'hbc_demo';
export const DEMO_ACCESS_DAYS = 7;

const VERSION = 'v2';


function signingKey(): Buffer | null {
	return secretKey('demo-access');
}

/** A demo-access cookie can be issued: DEMO_ACCESS_SECRET is set (or `astro dev`'s fixed key stands in). */
export function demoAccessConfigured(): boolean {
	return signingKey() !== null;
}

function sign(expires: string, key: Buffer): string {
	return createHmac('sha256', key)
		.update(`demo-access:${VERSION}:${deployContext() ?? ''}:${adminPasswordFingerprint()}:${expires}`)
		.digest('base64url');
}

function sameText(a: string, b: string): boolean {
	// Hash first so lengths always match and timing doesn't reveal the length.
	return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}

export function createDemoAccessToken(now: number = Date.now()): string | null {
	const key = signingKey();
	if (!key) return null;
	const expires = String(now + DEMO_ACCESS_DAYS * 86_400_000);
	return `${VERSION}.${expires}.${sign(expires, key)}`;
}

/** The cookie's expiry (ms) when it is genuine and not expired, otherwise null. */
export function demoAccessExpiry(token: string | undefined, now: number = Date.now()): number | null {
	const key = signingKey();
	if (!key || !token) return null;
	const [version, expires, signature, extra] = token.split('.');
	if (version !== VERSION || !expires || !signature || extra !== undefined || !/^\d+$/.test(expires)) return null;
	if (Number(expires) < now) return null;
	return sameText(signature, sign(expires, key)) ? Number(expires) : null;
}

export function verifyDemoAccessToken(token: string | undefined, now: number = Date.now()): boolean {
	return demoAccessExpiry(token, now) !== null;
}

/**
 * HttpOnly (page scripts can't read it), Secure outside `astro dev`, and Lax
 * so it still goes along when the boss opens a payment link from an email.
 * Cross-site posts to the pay page are refused by Astro's checkOrigin anyway.
 */
export function demoAccessCookieOptions() {
	return {
		httpOnly: true,
		secure: import.meta.env.PROD,
		sameSite: 'lax' as const,
		path: '/',
		maxAge: DEMO_ACCESS_DAYS * 86_400,
	};
}

/**
 * Test seam for `astro dev` only: a request with this header set to `closed`
 * is treated as if DEMO_CHECKOUT weren't open, so the Playwright server
 * (which opens the demo checkout for the existing flows) can also test the
 * closed gate. It can only take access away, never grant it, and production
 * builds ignore it.
 */
export const DEMO_CHECKOUT_TEST_HEADER = 'x-hbc-demo-checkout';

export function testHeaderClosesGate(headers: Headers): boolean {
	return Boolean(import.meta.env.DEV) && headers.get(DEMO_CHECKOUT_TEST_HEADER) === 'closed';
}
