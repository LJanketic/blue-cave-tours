import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { secretKey } from '../secrets';
import { checkGlobalLimit, checkRateLimit, peekGlobalLimit } from '../rate-limit';

/**
 * Showcase login for /admin: one shared password from `ADMIN_PASSWORD`, and a
 * session cookie signed with ADMIN_SESSION_SECRET, expiring after SESSION_HOURS. Real per-person accounts come later
 * (plan D17). Without `ADMIN_PASSWORD` or `ADMIN_SESSION_SECRET` the admin is
 * locked, except in `astro dev`, where the password is "demo".
 *
 * Changing ADMIN_PASSWORD (and redeploying) signs everyone out: each session
 * is signed over a fingerprint of the password it was issued under.
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

/** Per IP: 5 tries every 10 minutes. */
export const LOGIN_LIMIT_PER_IP = { max: 5, windowMs: 10 * 60_000 } as const;
/**
 * Everyone together: 200 wrong passwords an hour, against guessing spread over
 * many IPs. Only failed attempts count, so staff logging in never use it up.
 * While it's reached nobody can log in, staff included, until the hour's
 * window ends: the price of a cap that holds against many IPs.
 */
export const LOGIN_LIMIT_GLOBAL = { max: 200, windowMs: 60 * 60_000 } as const;
const GLOBAL_SCOPE = 'admin-login-all';

/**
 * ADMIN_LOGIN_HOURLY_CAP raises the global cap only where many test runs share
 * one store (playwright.config.ts), like CHARTER_HOURLY_CAP; never on production.
 */
function globalLoginCap(): number {
	if ((process.env.CONTEXT || import.meta.env.CONTEXT) === 'production') return LOGIN_LIMIT_GLOBAL.max;
	const cap = Number.parseInt(process.env.ADMIN_LOGIN_HOURLY_CAP ?? '', 10);
	return Number.isInteger(cap) && cap > 0 ? cap : LOGIN_LIMIT_GLOBAL.max;
}

/**
 * Before the password check: counts the attempt per IP, and checks (without
 * counting) that the hour's failed attempts haven't reached the global cap.
 * Both fail closed: without the limiter there's no cap on password guesses.
 * A wrong password then counts against the global cap (recordFailedLogin).
 */
export async function checkLoginAllowed(ip: string | null): Promise<{ ok: true } | { ok: false; reason: 'ip' | 'global' }> {
	const perIp = await checkRateLimit('admin-login', ip, { ...LOGIN_LIMIT_PER_IP, failClosed: true });
	if (!perIp.ok) return { ok: false, reason: 'ip' };
	const global = await peekGlobalLimit(GLOBAL_SCOPE, { ...LOGIN_LIMIT_GLOBAL, max: globalLoginCap(), failClosed: true });
	if (!global.ok) return { ok: false, reason: 'global' };
	return { ok: true };
}

/** A wrong password: one more against the hour's global cap. */
export async function recordFailedLogin(): Promise<void> {
	await checkGlobalLimit(GLOBAL_SCOPE, { ...LOGIN_LIMIT_GLOBAL, max: globalLoginCap() });
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
function passwordFingerprint(): string {
	return createHash('sha256').update(`hbc-admin-password:${adminPassword() ?? ''}`).digest('base64url').slice(0, 16);
}

function sign(expires: string, key: Buffer): string {
	return createHmac('sha256', key).update(`${expires}.${passwordFingerprint()}`).digest('base64url');
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
