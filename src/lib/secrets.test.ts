import { afterEach, describe, expect, it, vi } from 'vitest';
import { secretKey } from './secrets';

const NAMES = ['ADMIN_PASSWORD', 'ADMIN_SESSION_SECRET', 'BOOKING_COOKIE_SECRET', 'RATE_LIMIT_SALT'];

describe('secretKey', () => {
	afterEach(() => {
		for (const name of NAMES) delete process.env[name];
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	it('uses each purpose’s own secret, and a base64 32-byte value as is', () => {
		const raw = Buffer.alloc(32, 3);
		process.env.BOOKING_COOKIE_SECRET = raw.toString('base64');
		expect(secretKey('booking-cookie')).toEqual(raw);
	});

	it('never derives a key from the admin password or another purpose’s secret', () => {
		vi.stubEnv('DEV', false);
		vi.spyOn(console, 'error').mockImplementation(() => {});
		process.env.ADMIN_PASSWORD = 'a-long-admin-password-that-is-set';
		process.env.ADMIN_SESSION_SECRET = 'x'.repeat(44);
		expect(secretKey('booking-cookie')).toBeNull();
		expect(secretKey('rate-limit')).toBeNull();
		process.env.BOOKING_COOKIE_SECRET = 'y'.repeat(44);
		process.env.RATE_LIMIT_SALT = 'z'.repeat(44);
		expect(secretKey('booking-cookie')).not.toEqual(secretKey('rate-limit'));
		expect(secretKey('booking-cookie')).not.toEqual(secretKey('admin-session'));
	});

	it('in production, refuses a missing or short secret and says why', () => {
		vi.stubEnv('DEV', false);
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(secretKey('admin-session')).toBeNull();
		process.env.RATE_LIMIT_SALT = 'too-short';
		expect(secretKey('rate-limit')).toBeNull();
		expect(error.mock.calls.flat().join('\n')).toMatch(/ADMIN_SESSION_SECRET is not set[\s\S]*RATE_LIMIT_SALT is shorter/);
	});

	it('in astro dev, falls back to a fixed dev-only key per purpose', () => {
		vi.stubEnv('DEV', true);
		expect(secretKey('booking-cookie')).toEqual(secretKey('booking-cookie'));
		expect(secretKey('booking-cookie')).not.toEqual(secretKey('rate-limit'));
	});
});
