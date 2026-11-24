import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { secretKey } from '../secrets';

/**
 * Showcase login for /admin: one shared password from `ADMIN_PASSWORD`, and a
 * session cookie signed with ADMIN_SESSION_SECRET, expiring after SESSION_HOURS. Real per-person accounts come later
 * (plan D17). Without `ADMIN_PASSWORD` or `ADMIN_SESSION_SECRET` the admin is
 * locked, except in `astro dev`, where the password is "demo".
 *
 * Changing ADMIN_PASSWORD (and redeploying) signs everyone out: each session
 * is signed over a fingerprint of the password it was issued under.
 *
 * The login limits live in auth-limits.ts: they need Netlify Blobs, and this
 * module is imported by the middleware on every request, so it stays free of
 * Blobs.
 */

export const ADMIN_COOKIE = 'hbc_admin';
export const SESSION_HOURS = 12;

export function adminPassword(): string | null {
	return process.env.ADMIN_PASSWORD || (import.meta.env.DEV ? 'demo' : null);
}

/** Shorter than this, the admin still works but shows a warning (it never locks staff out). */
export const MIN_ADMIN_PASSWORD_LENGTH = 12;

let warnedShort = false;

/** ADMIN_PASSWORD is set but short. Logs a warning once per server process. Dev's built-in "demo" doesn't count. */
export function adminPasswordTooShort(): boolean {
	const password = process.env.ADMIN_PASSWORD;
	const short = Boolean(password) && (password as string).length < MIN_ADMIN_PASSWORD_LENGTH;
	if (short && !warnedShort) {
		warnedShort = true;
		console.warn(`[admin] ADMIN_PASSWORD is shorter than ${MIN_ADMIN_PASSWORD_LENGTH} characters. Set a longer one in Netlify.`);
	}
	return short;
}

/**
 * Signs session cookies with ADMIN_SESSION_SECRET (the key is never derived
 * from the password). Rotating the secret signs everyone out.
 */
function signingKey(): Buffer | null {
	if (!adminPassword()) return null;
	return secretKey('admin-session');
}

/** Login is possible: a password to check and a secret to sign the session with. */
export function adminConfigured(): boolean {
	return signingKey() !== null;
}

function sameText(a: string, b: string): boolean {
	// Hash first so lengths always match and timing doesn't reveal the length.
	return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}

export function checkAdminPassword(input: string): boolean {
	const password = adminPassword();
	return Boolean(password) && sameText(input, password as string);
}

/**
 * Signed with each session, never stored in it: when ADMIN_PASSWORD changes,
 * every existing cookie stops verifying.
 */
export function adminPasswordFingerprint(): string {
	return createHash('sha256').update(`hbc-admin-password:${adminPassword() ?? ''}`).digest('base64url').slice(0, 16);
}

function sign(expires: string, key: Buffer): string {
	return createHmac('sha256', key).update(`${expires}.${adminPasswordFingerprint()}`).digest('base64url');
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

/**
 * The "known device" cookie (W0 review B4): set at every successful login,
 * so a browser that has logged in before can still log in while the global
 * cap on failed logins is reached (someone guessing from many IPs). It never
 * replaces the password, and the per-IP limit still applies to it.
 *
 * The value is `v1.<device id>.<expiry ms>.<HMAC>`: a random id, nothing
 * about the person. The HMAC (ADMIN_SESSION_SECRET) also covers the admin
 * password's fingerprint, so a password change retires every known device,
 * like it signs every session out. HttpOnly, Secure outside `astro dev`,
 * SameSite=Strict (the login form posts from this site) and only sent to
 * /admin/.
 */
export const KNOWN_DEVICE_COOKIE = 'hbc_admin_device';
export const KNOWN_DEVICE_DAYS = 90;
const DEVICE_VERSION = 'v1';

function signDevice(id: string, expires: string, key: Buffer): string {
	return createHmac('sha256', key).update(`known-device:${DEVICE_VERSION}:${id}:${expires}:${adminPasswordFingerprint()}`).digest('base64url');
}

/** The device id of a genuine, unexpired known-device cookie issued under the current password, otherwise null. */
export function knownDeviceId(token: string | undefined, now: number = Date.now()): string | null {
	const key = signingKey();
	if (!key || !token) return null;
	const [version, id, expires, signature, extra] = token.split('.');
	if (version !== DEVICE_VERSION || !id || !expires || !signature || extra !== undefined) return null;
	if (!/^[\w-]{22}$/.test(id) || !/^\d+$/.test(expires) || Number(expires) < now) return null;
	return sameText(signature, signDevice(id, expires, key)) ? id : null;
}

/** A fresh cookie value for 90 days, keeping the device id when the browser already had one. */
export function createKnownDeviceToken(existingId: string | null = null, now: number = Date.now()): string | null {
	const key = signingKey();
	if (!key) return null;
	const id = existingId ?? randomBytes(16).toString('base64url');
	const expires = String(now + KNOWN_DEVICE_DAYS * 86_400_000);
	return `${DEVICE_VERSION}.${id}.${expires}.${signDevice(id, expires, key)}`;
}

export function knownDeviceCookieOptions() {
	return {
		httpOnly: true,
		secure: import.meta.env.PROD,
		sameSite: 'strict' as const,
		path: '/admin/',
		maxAge: KNOWN_DEVICE_DAYS * 86_400,
	};
}
