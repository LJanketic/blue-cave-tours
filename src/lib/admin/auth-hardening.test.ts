import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const limiter = vi.hoisted(() => ({
	checkRateLimit: vi.fn(async (..._args: unknown[]) => ({ ok: true })),
	reserveGlobalLimit: vi.fn(async (..._args: unknown[]): Promise<unknown> => ({ ok: true, release: async () => {} })),
}));
vi.mock('../rate-limit', () => limiter);

import {
	KNOWN_DEVICE_DAYS,
	MIN_ADMIN_PASSWORD_LENGTH,
	adminConfigured,
	adminPasswordTooShort,
	checkAdminPassword,
	createKnownDeviceToken,
	createSessionToken,
	knownDeviceCookieOptions,
	knownDeviceId,
	verifySessionToken,
} from './auth';
import { LOGIN_LIMIT_GLOBAL, checkLoginAllowed } from './auth-limits';

const NOW = 1_800_000_000_000;

afterEach(() => {
	delete process.env.ADMIN_PASSWORD;
	delete process.env.ADMIN_SESSION_SECRET;
	delete process.env.ADMIN_LOGIN_HOURLY_CAP;
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

describe('admin login caps', () => {
	const release = vi.fn(async () => {});
	beforeEach(() => {
		release.mockClear();
		limiter.checkRateLimit.mockClear().mockResolvedValue({ ok: true });
		limiter.reserveGlobalLimit.mockClear().mockResolvedValue({ ok: true, release });
	});

	it('counts each attempt per IP and against a global cap of 200 an hour before the password is compared', async () => {
		const allowed = await checkLoginAllowed('198.51.100.7');
		expect(allowed.ok).toBe(true);
		expect(limiter.checkRateLimit).toHaveBeenCalledWith('admin-login', '198.51.100.7', expect.objectContaining({ max: 5, failClosed: true }));
		expect(limiter.reserveGlobalLimit).toHaveBeenCalledWith('admin-login-all', expect.objectContaining({ max: 200, windowMs: 3_600_000 }));
		expect(LOGIN_LIMIT_GLOBAL.max).toBe(200);
		// A right password takes its count back: staff logging in never use the cap up.
		if (allowed.ok) await allowed.succeeded();
		expect(release).toHaveBeenCalledTimes(1);
	});

	it.each(['over', 'contended', 'unavailable'])('refuses when the global count is %s, whatever the IP', async (reason) => {
		limiter.reserveGlobalLimit.mockResolvedValue({ ok: false, reason });
		expect(await checkLoginAllowed('203.0.113.9')).toEqual({ ok: false, reason: 'global' });
	});

	it.each(['over', 'contended', 'unavailable'])('lets a known device try its password when the global count is %s', async (reason) => {
		limiter.reserveGlobalLimit.mockResolvedValue({ ok: false, reason });
		const allowed = await checkLoginAllowed('203.0.113.9', { knownDevice: true });
		expect(allowed.ok).toBe(true);
		if (allowed.ok) await allowed.succeeded();
		expect(release).not.toHaveBeenCalled();
	});

	it('refuses an IP over its own cap (or a per-IP limiter that cannot run) without touching the global one, known device or not', async () => {
		limiter.checkRateLimit.mockResolvedValue({ ok: false });
		expect(await checkLoginAllowed('203.0.113.9')).toEqual({ ok: false, reason: 'ip' });
		expect(await checkLoginAllowed('203.0.113.9', { knownDevice: true })).toEqual({ ok: false, reason: 'ip' });
		expect(limiter.reserveGlobalLimit).not.toHaveBeenCalled();
	});

	it('lets ADMIN_LOGIN_HOURLY_CAP raise the global cap for test runs, never on production', async () => {
		process.env.ADMIN_LOGIN_HOURLY_CAP = '10000';
		await checkLoginAllowed('198.51.100.7');
		expect(limiter.reserveGlobalLimit).toHaveBeenLastCalledWith('admin-login-all', expect.objectContaining({ max: 10000 }));
		vi.stubEnv('CONTEXT', 'production');
		await checkLoginAllowed('198.51.100.7');
		expect(limiter.reserveGlobalLimit).toHaveBeenLastCalledWith('admin-login-all', expect.objectContaining({ max: 200 }));
	});
});

describe('known-device cookie', () => {
	beforeEach(() => {
		process.env.ADMIN_SESSION_SECRET = 'a'.repeat(44);
		process.env.ADMIN_PASSWORD = 'first-long-password';
	});

	it('is valid for 90 days under the password it was issued with, and keeps its device id when renewed', () => {
		const token = createKnownDeviceToken(null, NOW) as string;
		expect(token).toMatch(/^v1\.[\w-]{22}\.\d+\.[\w-]+$/);
		const id = knownDeviceId(token, NOW + 60_000);
		expect(id).toMatch(/^[\w-]{22}$/);
		expect(knownDeviceId(token, NOW + KNOWN_DEVICE_DAYS * 86_400_000)).toBe(id);
		// Expired.
		expect(knownDeviceId(token, NOW + KNOWN_DEVICE_DAYS * 86_400_000 + 1)).toBeNull();
		const renewed = createKnownDeviceToken(id, NOW + 86_400_000) as string;
		expect(knownDeviceId(renewed, NOW + KNOWN_DEVICE_DAYS * 86_400_000 + 1)).toBe(id);
		// Two browsers get two ids.
		expect(knownDeviceId(createKnownDeviceToken(null, NOW) as string, NOW)).not.toBe(id);
	});

	it('refuses a forged or altered cookie', () => {
		const token = createKnownDeviceToken(null, NOW) as string;
		const [version, id, expires, signature] = token.split('.');
		expect(knownDeviceId(`${version}.${id}.${Number(expires) + 86_400_000}.${signature}`, NOW)).toBeNull();
		expect(knownDeviceId(`${version}.${'A'.repeat(22)}.${expires}.${signature}`, NOW)).toBeNull();
		expect(knownDeviceId(`${token}x`, NOW)).toBeNull();
		expect(knownDeviceId(`${token}.extra`, NOW)).toBeNull();
		expect(knownDeviceId(`v2.${id}.${expires}.${signature}`, NOW)).toBeNull();
		expect(knownDeviceId('', NOW)).toBeNull();
		expect(knownDeviceId(undefined, NOW)).toBeNull();
		// An admin session cookie is not a known device.
		expect(knownDeviceId(createSessionToken(NOW) as string, NOW)).toBeNull();
		// A rotated ADMIN_SESSION_SECRET.
		process.env.ADMIN_SESSION_SECRET = 'b'.repeat(44);
		expect(knownDeviceId(token, NOW)).toBeNull();
	});

	it('stops working when ADMIN_PASSWORD changes (a cookie from before the change)', () => {
		const token = createKnownDeviceToken(null, NOW) as string;
		expect(knownDeviceId(token, NOW)).not.toBeNull();
		process.env.ADMIN_PASSWORD = 'second-long-password';
		expect(knownDeviceId(token, NOW)).toBeNull();
		expect(knownDeviceId(createKnownDeviceToken(null, NOW) as string, NOW)).not.toBeNull();
	});

	it('is HttpOnly, SameSite=Strict, only sent to /admin/, kept 90 days, and none is issued while the admin is locked', () => {
		expect(knownDeviceCookieOptions()).toMatchObject({ httpOnly: true, sameSite: 'strict', path: '/admin/', maxAge: 90 * 86_400 });
		delete process.env.ADMIN_PASSWORD;
		vi.stubEnv('DEV', false);
		vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(createKnownDeviceToken(null, NOW)).toBeNull();
	});
});

describe('admin sessions and the password', () => {
	it('signs everyone out when ADMIN_PASSWORD changes, and back in only under that password', () => {
		process.env.ADMIN_SESSION_SECRET = 'a'.repeat(44);
		process.env.ADMIN_PASSWORD = 'first-long-password';
		const token = createSessionToken(NOW) as string;
		expect(verifySessionToken(token, NOW + 60_000)).toBe(true);
		process.env.ADMIN_PASSWORD = 'second-long-password';
		expect(verifySessionToken(token, NOW + 60_000)).toBe(false);
		const fresh = createSessionToken(NOW) as string;
		expect(verifySessionToken(fresh, NOW + 60_000)).toBe(true);
		// The cookie carries no trace of the password: only the expiry and the signature.
		expect(fresh.split('.')).toHaveLength(2);
		process.env.ADMIN_PASSWORD = 'first-long-password';
		expect(verifySessionToken(token, NOW + 60_000)).toBe(true);
	});
});

describe('short admin password', () => {
	it('warns (once) but never locks the admin out', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		process.env.ADMIN_SESSION_SECRET = 'a'.repeat(44);
		process.env.ADMIN_PASSWORD = 'x'.repeat(MIN_ADMIN_PASSWORD_LENGTH - 1);
		expect(adminPasswordTooShort()).toBe(true);
		expect(adminPasswordTooShort()).toBe(true);
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0][0]).toMatch(/ADMIN_PASSWORD is shorter than 12/);
		expect(adminConfigured()).toBe(true);
		expect(checkAdminPassword('x'.repeat(MIN_ADMIN_PASSWORD_LENGTH - 1))).toBe(true);
		expect(verifySessionToken(createSessionToken(NOW) as string, NOW)).toBe(true);
	});

	it('is quiet for a long password, and for the dev default when none is set', () => {
		process.env.ADMIN_PASSWORD = 'x'.repeat(MIN_ADMIN_PASSWORD_LENGTH);
		expect(adminPasswordTooShort()).toBe(false);
		delete process.env.ADMIN_PASSWORD;
		expect(adminPasswordTooShort()).toBe(false);
	});
});
