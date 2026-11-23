import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const limiter = vi.hoisted(() => ({
	checkRateLimit: vi.fn(async (..._args: unknown[]) => ({ ok: true })),
	checkGlobalLimit: vi.fn(async (..._args: unknown[]) => ({ ok: true })),
	peekGlobalLimit: vi.fn(async (..._args: unknown[]) => ({ ok: true })),
}));
vi.mock('../rate-limit', () => limiter);

import {
	LOGIN_LIMIT_GLOBAL,
	MIN_ADMIN_PASSWORD_LENGTH,
	adminConfigured,
	adminPasswordTooShort,
	checkAdminPassword,
	checkLoginAllowed,
	createSessionToken,
	recordFailedLogin,
	verifySessionToken,
} from './auth';

const NOW = 1_800_000_000_000;

afterEach(() => {
	delete process.env.ADMIN_PASSWORD;
	delete process.env.ADMIN_SESSION_SECRET;
	delete process.env.ADMIN_LOGIN_HOURLY_CAP;
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

describe('admin login caps', () => {
	beforeEach(() => {
		limiter.checkRateLimit.mockClear().mockResolvedValue({ ok: true });
		limiter.checkGlobalLimit.mockClear().mockResolvedValue({ ok: true });
		limiter.peekGlobalLimit.mockClear().mockResolvedValue({ ok: true });
	});

	it('counts each attempt per IP, and only peeks at a global cap of 200 failures an hour, both failing closed', async () => {
		expect(await checkLoginAllowed('198.51.100.7')).toEqual({ ok: true });
		expect(limiter.checkRateLimit).toHaveBeenCalledWith('admin-login', '198.51.100.7', expect.objectContaining({ max: 5, failClosed: true }));
		expect(limiter.peekGlobalLimit).toHaveBeenCalledWith(
			'admin-login-all',
			expect.objectContaining({ max: 200, windowMs: 3_600_000, failClosed: true }),
		);
		// Checking counts nothing globally: a staff login that succeeds never uses the cap up.
		expect(limiter.checkGlobalLimit).not.toHaveBeenCalled();
		expect(LOGIN_LIMIT_GLOBAL.max).toBe(200);
	});

	it('counts a wrong password against the global cap', async () => {
		await recordFailedLogin();
		expect(limiter.checkGlobalLimit).toHaveBeenCalledWith('admin-login-all', expect.objectContaining({ max: 200, windowMs: 3_600_000 }));
	});

	it('refuses once the global cap is reached, whatever the IP', async () => {
		limiter.peekGlobalLimit.mockResolvedValue({ ok: false });
		expect(await checkLoginAllowed('203.0.113.9')).toEqual({ ok: false, reason: 'global' });
	});

	it('refuses an IP over its own cap without looking at the global one', async () => {
		limiter.checkRateLimit.mockResolvedValue({ ok: false });
		expect(await checkLoginAllowed('203.0.113.9')).toEqual({ ok: false, reason: 'ip' });
		expect(limiter.peekGlobalLimit).not.toHaveBeenCalled();
	});

	it('lets ADMIN_LOGIN_HOURLY_CAP raise the global cap for test runs, never on production', async () => {
		process.env.ADMIN_LOGIN_HOURLY_CAP = '10000';
		await checkLoginAllowed('198.51.100.7');
		expect(limiter.peekGlobalLimit).toHaveBeenLastCalledWith('admin-login-all', expect.objectContaining({ max: 10000 }));
		await recordFailedLogin();
		expect(limiter.checkGlobalLimit).toHaveBeenLastCalledWith('admin-login-all', expect.objectContaining({ max: 10000 }));
		vi.stubEnv('CONTEXT', 'production');
		await checkLoginAllowed('198.51.100.7');
		expect(limiter.peekGlobalLimit).toHaveBeenLastCalledWith('admin-login-all', expect.objectContaining({ max: 200 }));
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
