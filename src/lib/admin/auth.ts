import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Showcase login for /admin: one shared password from `ADMIN_PASSWORD`, and a
 * signed, expiring session cookie. Real per-person accounts come later
 * (plan D17). Without `ADMIN_PASSWORD` the admin is locked, except in
 * `astro dev`, where the password is "demo".
 */

export const ADMIN_COOKIE = 'hbc_admin';
export const SESSION_HOURS = 12;

export function adminPassword(): string | null {
	return process.env.ADMIN_PASSWORD || (import.meta.env.DEV ? 'demo' : null);
}

function signingKey(): string | null {
	const password = adminPassword();
	if (!password) return null;
	// Changing the password signs everyone out.
	return process.env.ADMIN_SESSION_SECRET || `hbc-admin-session:${password}`;
}

function sameText(a: string, b: string): boolean {
	// Hash first so lengths always match and timing doesn't reveal the length.
	return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}

export function checkAdminPassword(input: string): boolean {
	const password = adminPassword();
	return Boolean(password) && sameText(input, password as string);
}

function sign(payload: string, key: string): string {
	return createHmac('sha256', key).update(payload).digest('base64url');
}

export function createSessionToken(now: number = Date.now()): string | null {
	const key = signingKey();
	if (!key) return null;
	const expires = String(now + SESSION_HOURS * 3_600_000);
	return `${expires}.${sign(expires, key)}`;
}

export function verifySessionToken(token: string | undefined, now: number = Date.now()): boolean {
	const key = signingKey();
	if (!key || !token) return false;
	const [expires, signature] = token.split('.');
	if (!expires || !signature || !/^\d+$/.test(expires)) return false;
	if (Number(expires) < now) return false;
	return sameText(signature, sign(expires, key));
}
