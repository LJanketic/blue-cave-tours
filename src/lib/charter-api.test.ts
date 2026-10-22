import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isInSeason } from '../config/season';
import { businessDate } from './bookings/dates';
import { enquiries, resetMemoryStore } from './bookings/store';

// The limiter needs Netlify Blobs; here it allows unless a test says otherwise.
const rateLimit = vi.hoisted(() => ({ ok: true, global: true }));
vi.mock('./rate-limit', () => ({
	checkRateLimit: async () => ({ ok: rateLimit.ok }),
	checkGlobalLimit: async () => ({ ok: rateLimit.global }),
	clientIp: () => '203.0.113.1',
}));

const turnstile = vi.hoisted(() => ({ ok: true }));
vi.mock('./turnstile', () => ({ verifyTurnstileToken: async () => (turnstile.ok ? { ok: true } : { ok: false, error: 'Verification failed' }) }));
const store = vi.hoisted(() => ({ fail: false }));
vi.mock('./bookings/service', async (original) => {
	const real = await original<typeof import('./bookings/service')>();
	return { ...real, recordEnquiry: async (...args: Parameters<typeof real.recordEnquiry>) => (store.fail ? Promise.reject(new Error('Blobs down')) : real.recordEnquiry(...args)) };
});

const { POST } = await import('../pages/api/charter-request');

/** The fields as a plain form post sends them: strings, and no start time (only the page script sets it). */
const asForm = (overrides: Record<string, unknown> = {}) =>
	new URLSearchParams(Object.entries({ ...fields(overrides), _startedAt: '' }).map(([k, v]) => [k, String(v)])).toString();

function post(body: string, type = 'application/json') {
	const request = new Request('http://localhost/api/charter-request', { method: 'POST', headers: { 'content-type': type }, body });
	return POST({ request } as Parameters<typeof POST>[0]);
}

/** A week or more ahead and in the season, whatever day the tests run (the boats are closed Nov–Feb). */
const SEASON_DATE = (() => {
	let days = 7;
	while (!isInSeason(businessDate(new Date(), days))) days++;
	return businessDate(new Date(), days);
})();

const fields = (overrides: Record<string, unknown> = {}) => ({
	route: 'blue-lagoon',
	date: SEASON_DATE,
	time: '10:00',
	duration: '4',
	adults: 3,
	children: 0,
	infants: 0,
	firstName: 'Jane',
	lastName: 'Smith',
	email: 'jane@example.com',
	phone: '+44 7700 900123',
	notes: 'Birthday',
	_startedAt: Date.now() - 10_000,
	...overrides,
});

describe('POST /api/charter-request', () => {
	beforeEach(() => {
		rateLimit.ok = true;
		rateLimit.global = true;
		turnstile.ok = true;
		store.fail = false;
		resetMemoryStore();
	});

	it('stores a charter enquiry with the structured details', async () => {
		const res = await post(JSON.stringify(fields()));
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
		const [stored] = await enquiries().list();
		expect(stored).toMatchObject({
			kind: 'charter',
			topic: 'charter',
			name: 'Jane Smith',
			tourSlug: 'blue-lagoon-morning',
			message: 'Birthday',
			charter: { route: 'blue-lagoon', time: '10:00', durationHours: 4, adults: 3, firstName: 'Jane', lastName: 'Smith' },
		});
	});

	it('answers a plain form post with a redirect, and errors carry only a code', async () => {
		const ok = await post(asForm(), 'application/x-www-form-urlencoded');
		expect(ok.status).toBe(303);
		expect(ok.headers.get('location')).toBe('/private-charter/sent/');
		const bad = await post(asForm({ email: 'jane@' }), 'application/x-www-form-urlencoded');
		expect(bad.headers.get('location')).toBe('/private-charter/problem/?error=email');
	});

	it('points the page script at the field that is wrong', async () => {
		const res = await post(JSON.stringify(fields({ time: '23:00' })));
		expect(res.status).toBe(400);
		const json = await res.json();
		expect(json.code).toBe('time');
		expect(Object.keys(json.errors)).toEqual(['time']);
	});

	it('drops a bot that fills the honeypot, without storing anything', async () => {
		const res = await post(JSON.stringify(fields({ company: 'Acme' })));
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
		expect(await enquiries().list()).toHaveLength(0);
	});

	it('refuses a form sent within two seconds of loading', async () => {
		const res = await post(JSON.stringify(fields({ _startedAt: Date.now() - 500 })));
		expect(res.status).toBe(429);
		expect((await res.json()).code).toBe('too-fast');
	});

	it('refuses a failed Turnstile check', async () => {
		turnstile.ok = false;
		const res = await post(JSON.stringify(fields()));
		expect(res.status).toBe(400);
		expect((await res.json()).code).toBe('check');
		expect(await enquiries().list()).toHaveLength(0);
	});

	it('says so when the request could not be stored', async () => {
		store.fail = true;
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const res = await post(JSON.stringify(fields()));
		expect(res.status).toBe(503);
		expect((await res.json()).code).toBe('server');
	});

	it('fails closed when rate limited, per visitor and overall', async () => {
		rateLimit.ok = false;
		expect((await post(JSON.stringify(fields()))).status).toBe(429);
		rateLimit.ok = true;
		rateLimit.global = false;
		expect((await post(JSON.stringify(fields()))).status).toBe(429);
		expect(await enquiries().list()).toHaveLength(0);
	});

	it.each(['null', '[]', '{broken'])('returns 400 for a %s body', async (body) => {
		expect((await post(body)).status).toBe(400);
	});

	it('refuses other content types', async () => {
		expect((await post('x', 'text/plain')).status).toBe(415);
	});
});
