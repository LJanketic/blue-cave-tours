import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A Blobs store with real compare-and-swap (etags, onlyIfMatch, onlyIfNew),
 * where every call yields for a random moment, so parallel logins interleave
 * between reading the count and writing it, like they do on Netlify.
 */
const blobs = vi.hoisted(() => {
	const data = new Map<string, { value: unknown; etag: string }>();
	let version = 0;
	const tick = () => new Promise((resolve) => setTimeout(resolve, Math.random() * 3));
	const state = { data, writes: 0, down: false };
	const store = {
		async getWithMetadata(key: string) {
			await tick();
			if (state.down) throw new Error('Blobs unavailable');
			const entry = data.get(key);
			return entry ? { data: structuredClone(entry.value), etag: entry.etag } : null;
		},
		async get(key: string) {
			await tick();
			if (state.down) throw new Error('Blobs unavailable');
			return structuredClone(data.get(key)?.value ?? null);
		},
		async setJSON(key: string, value: unknown, options: { onlyIfMatch?: string; onlyIfNew?: boolean } = {}) {
			await tick();
			const current = data.get(key);
			if (options.onlyIfNew && current) return { modified: false };
			if (options.onlyIfMatch && current?.etag !== options.onlyIfMatch) return { modified: false };
			state.writes++;
			data.set(key, { value: structuredClone(value), etag: `e${++version}` });
			return { modified: true };
		},
		async list() {
			return { blobs: [] };
		},
		async delete() {},
	};
	return { state, store };
});
vi.mock('@netlify/blobs', () => ({ getStore: () => blobs.store }));

import { checkLoginAllowed } from './auth-limits';
import { reserveGlobalLimit } from '../rate-limit';

function globalCount(): number {
	for (const [key, entry] of blobs.state.data) if (key.startsWith('admin-login-all:')) return (entry.value as { count: number }).count;
	return 0;
}

beforeEach(() => {
	blobs.state.data.clear();
	blobs.state.writes = 0;
	blobs.state.down = false;
});

describe('admin login cap under a parallel burst (W0 review B4)', () => {
	it('lets no more attempts through than it counted: a lost race refuses instead of slipping past', async () => {
		// 260 wrong passwords at once, each from its own IP, against a cap of 40. One IP each: parallel attempts
		// from one IP contend on its per-IP count too, and a lost race there is refused as 'ip', not 'global'.
		process.env.ADMIN_LOGIN_HOURLY_CAP = '40';
		try {
			const attempts = Array.from({ length: 260 }, (_, i) => checkLoginAllowed(`198.51.${100 + Math.floor(i / 200)}.${i % 200}`));
			const results = await Promise.all(attempts);
			const allowed = results.filter((result) => result.ok).length;
			// Every attempt that reached the password check is in the count; none beyond the cap.
			expect(allowed).toBe(globalCount());
			expect(allowed).toBeLessThanOrEqual(40);
			expect(allowed).toBeGreaterThan(0);
			expect(results.filter((result) => !result.ok).every((result) => !result.ok && result.reason === 'global')).toBe(true);
		} finally {
			delete process.env.ADMIN_LOGIN_HOURLY_CAP;
		}
	});

	it('the strict global count never lets through more than it wrote, at any cap', async () => {
		const results = await Promise.all(Array.from({ length: 150 }, () => reserveGlobalLimit('burst', { max: 1000, windowMs: 3_600_000 })));
		const allowed = results.filter((result) => result.ok).length;
		const [entry] = [...blobs.state.data.values()];
		expect(allowed).toBe((entry.value as { count: number }).count);
		// Some lost every race and were refused, not waved through.
		expect(results.some((result) => !result.ok && result.reason === 'contended')).toBe(true);
	});

	it('a right password takes its count back, so only failures use the cap up', async () => {
		const first = await checkLoginAllowed('203.0.113.1');
		const second = await checkLoginAllowed('203.0.113.2');
		expect(globalCount()).toBe(2);
		if (first.ok) await first.succeeded();
		expect(globalCount()).toBe(1);
		expect(second.ok).toBe(true);
	});

	it('past the cap, refuses a fresh browser but lets a known device try; the per-IP limit holds for both', async () => {
		process.env.ADMIN_LOGIN_HOURLY_CAP = '3';
		try {
			for (const ip of ['192.0.2.1', '192.0.2.2', '192.0.2.3']) expect((await checkLoginAllowed(ip)).ok).toBe(true);
			expect(await checkLoginAllowed('192.0.2.9')).toEqual({ ok: false, reason: 'global' });
			expect((await checkLoginAllowed('192.0.2.10', { knownDevice: true })).ok).toBe(true);
			for (let i = 0; i < 5; i++) expect((await checkLoginAllowed('192.0.2.11', { knownDevice: true })).ok).toBe(true);
			expect(await checkLoginAllowed('192.0.2.11', { knownDevice: true })).toEqual({ ok: false, reason: 'ip' });
		} finally {
			delete process.env.ADMIN_LOGIN_HOURLY_CAP;
		}
	});

	it('fails closed when the store is down, even for a known device (per-IP limit)', async () => {
		blobs.state.down = true;
		expect(await checkLoginAllowed('192.0.2.1')).toEqual({ ok: false, reason: 'ip' });
		expect(await checkLoginAllowed('192.0.2.1', { knownDevice: true })).toEqual({ ok: false, reason: 'ip' });
	});
});
