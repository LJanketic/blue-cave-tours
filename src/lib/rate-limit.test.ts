import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A store where every compare-and-swap loses: someone else always wrote first
 * (S2). `bucket` is what each read sees; null means the key isn't there yet.
 */
const contended = vi.hoisted(() => ({ bucket: null as { count: number; windowStart: number } | null, writes: 0, down: false }));

vi.mock('@netlify/blobs', () => ({
	getStore: () => ({
		get: async () => {
			if (contended.down) throw new Error('Blobs unavailable');
			return contended.bucket;
		},
		getWithMetadata: async () => {
			if (contended.down) throw new Error('Blobs unavailable');
			return contended.bucket ? { data: contended.bucket, etag: 'e1' } : null;
		},
		setJSON: async () => {
			contended.writes++;
			return { modified: false };
		},
		list: async () => ({ blobs: [] }),
		delete: async () => undefined,
	}),
}));

import { checkGlobalLimit, checkRateLimit, hashClient, ipNetwork, reserveGlobalLimit } from './rate-limit';

describe('rate-limit keys (S-11)', () => {
	it('cuts IPv6 to its /64, keeps IPv4 whole', () => {
		expect(ipNetwork('2001:db8:85a3:12:8a2e:370:7334:1')).toBe('2001:db8:85a3:12::/64');
		expect(ipNetwork('2001:db8::1')).toBe('2001:db8:0:0::/64');
		// IPv4 written as IPv6 keeps its own bucket instead of sharing ::/64 with every IPv4 visitor.
		expect(ipNetwork('::ffff:1.2.3.4')).toBe('1.2.3.4');
		expect(ipNetwork('::FFFF:8.8.8.8')).toBe('8.8.8.8');
		expect(ipNetwork('203.0.113.7')).toBe('203.0.113.7');
	});

	it('never stores the IP: a 16-byte keyed hash, the same for one /64', () => {
		const a = hashClient('2001:db8:85a3:12:8a2e:370:7334:1') as string;
		expect(a).not.toContain('2001');
		expect(Buffer.from(a, 'base64url')).toHaveLength(16);
		expect(hashClient('2001:db8:85a3:12::99')).toBe(a);
		expect(hashClient('2001:db8:85a3:13::1')).not.toBe(a);
		expect(hashClient('203.0.113.7')).not.toContain('203');
	});
});

describe('rate limit when every compare-and-swap is lost (S2)', () => {
	beforeEach(() => {
		contended.writes = 0;
		contended.down = false;
	});

	it.each([
		['an existing bucket under the limit', { count: 1, windowStart: Date.now() }],
		['a key that is not there yet', null],
	])('refuses a per-IP failClosed scope (%s), after several tries', async (_label, bucket) => {
		contended.bucket = bucket;
		expect(await checkRateLimit('admin-login', '203.0.113.7', { failClosed: true })).toEqual({ ok: false });
		// It did try, more than once: the refusal comes from the lost races, not from skipping the store.
		expect(contended.writes).toBeGreaterThan(3);
		expect(await checkRateLimit('pay', '203.0.113.7', { max: 20, failClosed: true })).toEqual({ ok: false });
	});

	it.each([
		['an existing bucket under the limit', { count: 1, windowStart: Date.now() }],
		['a key that is not there yet', null],
	])('lets a global failClosed scope through: a lost race is busy guests, not an outage (%s)', async (_label, bucket) => {
		contended.bucket = bucket;
		expect(await checkGlobalLimit('booking', { max: 1000, failClosed: true })).toEqual({ ok: true });
		expect(await checkGlobalLimit('charter', { max: 30, windowMs: 3_600_000, failClosed: true })).toEqual({ ok: true });
		expect(contended.writes).toBeGreaterThan(3);
	});

	it('a global failClosed scope still refuses when the limiter cannot run, and over its cap', async () => {
		contended.down = true;
		expect(await checkGlobalLimit('booking', { max: 1000, failClosed: true })).toEqual({ ok: false });
		expect(await checkGlobalLimit('contact', { max: 100 })).toEqual({ ok: true });
		contended.down = false;
		contended.bucket = { count: 1000, windowStart: Date.now() };
		expect(await checkGlobalLimit('booking', { max: 1000, failClosed: true })).toEqual({ ok: false });
	});

	it.each([
		['an existing bucket under the limit', { count: 1, windowStart: Date.now() }],
		['a key that is not there yet', null],
	])('a strict global reservation counts a lost race as a hit and refuses, after 4 tries (%s)', async (_label, bucket) => {
		contended.bucket = bucket;
		expect(await reserveGlobalLimit('admin-login-all', { max: 200, windowMs: 3_600_000 })).toEqual({ ok: false, reason: 'contended' });
		expect(contended.writes).toBe(4);
		contended.down = true;
		expect(await reserveGlobalLimit('admin-login-all', { max: 200 })).toEqual({ ok: false, reason: 'unavailable' });
		contended.down = false;
		contended.bucket = { count: 200, windowStart: Date.now() };
		expect(await reserveGlobalLimit('admin-login-all', { max: 200, windowMs: 3_600_000 })).toEqual({ ok: false, reason: 'over' });
	});

	it('still lets a normal scope through, as before', async () => {
		contended.bucket = { count: 1, windowStart: Date.now() };
		expect(await checkRateLimit('contact', '203.0.113.7')).toEqual({ ok: true });
		expect(await checkGlobalLimit('contact', { max: 100 })).toEqual({ ok: true });
	});

	it('refuses an IP over the limit without writing', async () => {
		contended.bucket = { count: 5, windowStart: Date.now() };
		expect(await checkRateLimit('contact', '203.0.113.7')).toEqual({ ok: false });
		expect(contended.writes).toBe(0);
	});
});
