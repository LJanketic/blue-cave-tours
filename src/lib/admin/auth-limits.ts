import { checkRateLimit, reserveGlobalLimit } from '../rate-limit';
import { deployContext } from '../bookings/store';

/**
 * Limits on admin login attempts. Kept apart from auth.ts because they need
 * Netlify Blobs, and the middleware imports auth.ts on every request.
 */

/** Per IP: 5 tries every 10 minutes. */
export const LOGIN_LIMIT_PER_IP = { max: 5, windowMs: 10 * 60_000 } as const;
/**
 * Everyone together: 200 wrong passwords an hour, against guessing spread over
 * many IPs. Each attempt is counted before the password is compared, and a
 * correct password takes its count back, so in effect only failures count and
 * a parallel burst can't run past the cap uncounted (a lost race counts as a
 * hit). While the cap is reached, only a browser with a valid known-device
 * cookie (set at its last successful login, auth.ts) can log in, still with
 * the password and still under its per-IP limit.
 */
export const LOGIN_LIMIT_GLOBAL = { max: 200, windowMs: 60 * 60_000 } as const;
const GLOBAL_SCOPE = 'admin-login-all';

/**
 * ADMIN_LOGIN_HOURLY_CAP raises the global cap only where many test runs share
 * one store (playwright.config.ts), like CHARTER_HOURLY_CAP; never on production.
 */
function globalLoginCap(): number {
	if (deployContext() === 'production') return LOGIN_LIMIT_GLOBAL.max;
	const cap = Number.parseInt(process.env.ADMIN_LOGIN_HOURLY_CAP ?? '', 10);
	return Number.isInteger(cap) && cap > 0 ? cap : LOGIN_LIMIT_GLOBAL.max;
}

export type LoginAllowance =
	| { ok: true; /** Call when the password was right: its count comes off the global cap. */ succeeded(): Promise<void> }
	| { ok: false; reason: 'ip' | 'global' };

const nothing = async () => {};

/**
 * Before the password check. Counts the attempt per IP, failing closed (no
 * limiter, no cap on guesses), then counts it against the global cap. Past
 * the global cap, after a lost race on it, or when it can't be counted, the
 * attempt is refused, unless the browser is a known device (`knownDevice`,
 * from a verified cookie): then it may still try its password.
 */
export async function checkLoginAllowed(ip: string | null, { knownDevice = false }: { knownDevice?: boolean } = {}): Promise<LoginAllowance> {
	const perIp = await checkRateLimit('admin-login', ip, { ...LOGIN_LIMIT_PER_IP, failClosed: true });
	if (!perIp.ok) return { ok: false, reason: 'ip' };
	const global = await reserveGlobalLimit(GLOBAL_SCOPE, { ...LOGIN_LIMIT_GLOBAL, max: globalLoginCap() });
	if (global.ok) return { ok: true, succeeded: global.release };
	return knownDevice ? { ok: true, succeeded: nothing } : { ok: false, reason: 'global' };
}
