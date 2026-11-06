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

	it('keeps the pick-up place a private experience booking asked for', async () => {
		const res = await post(JSON.stringify(fields({ pickup: '  Villa Sunce, Podstrana  ' })));
		expect(res.status).toBe(200);
		const [stored] = await enquiries().list();
		expect(stored.charter).toMatchObject({ pickup: 'Villa Sunce, Podstrana' });
		expect(stored.charter?.extras).toBeUndefined();
		const { charterRequestRows } = await import('./email/templates');
		expect(charterRequestRows(stored.charter!)).toContainEqual(['Pick-up wanted', 'Villa Sunce, Podstrana']);
	});

	it('refuses extras off the list, and stores no pick-up from the charter form', async () => {
		const bad = await post(JSON.stringify(fields({ extras: ['helicopter'] })));
		expect(bad.status).toBe(400);
		expect((await bad.json()).code).toBe('invalid');
		await post(JSON.stringify(fields()));
		const [stored] = await enquiries().list();
		expect(stored.charter?.pickup).toBeUndefined();
		expect(stored.charter?.extras).toBeUndefined();
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

// C5 (ClickUp 31 Oct 2026): the private step of a tour with no boat price posts here with its tour slug.
describe('POST /api/charter-request: the tour a private step request comes from', () => {
	beforeEach(() => {
		rateLimit.ok = true;
		rateLimit.global = true;
		turnstile.ok = true;
		store.fail = false;
		resetMemoryStore();
	});

	const stored = async () => (await enquiries().list())[0];

	it.each([
		['golden-horn-brac-hvar', 'golden-horn-brac-hvar', '08:30', '10'],
		['blue-lagoon', 'blue-lagoon-morning', '09:30', '4'],
		['blue-lagoon', 'blue-lagoon-afternoon', '14:30', '4'],
		['hvar-red-rocks-pakleni', 'hvar-red-rocks-pakleni', '06:00', '8'],
		['dubrovnik-one-way', 'dubrovnik-one-way', '20:00', '10'],
	])('route %s from %s at %s is stored under that tour', async (route, tourSlug, time, duration) => {
		const res = await post(JSON.stringify(fields({ route, tourSlug, time, duration, pickup: '', extras: [] })));
		expect(res.status, tourSlug).toBe(200);
		const enquiry = await stored();
		expect(enquiry.tourSlug).toBe(tourSlug);
		expect(enquiry.charter).toMatchObject({ route, time });
		expect(enquiry.charter?.pickup).toBeUndefined();
	});

	it.each(['05:55', '20:05'])('refuses %s, outside the charter window', async (time) => {
		const res = await post(JSON.stringify(fields({ route: 'hvar-red-rocks-pakleni', tourSlug: 'hvar-red-rocks-pakleni', time })));
		expect(res.status).toBe(400);
		expect((await res.json()).code).toBe('time');
		expect(await enquiries().list()).toHaveLength(0);
	});

	it.each([
		['another route\'s tour', 'blue-cave-hvar-5-islands'],
		['an unknown tour', 'no-such-tour'],
		['markup', '<img src=x onerror=alert(1)>'],
		['a path', '../../admin'],
		['an over-long slug', `blue-lagoon-afternoon${'x'.repeat(5000)}`],
		['a number', 42],
		['an object', { $ne: null }],
	])('files %s under the route\'s own tour', async (_name, tourSlug) => {
		const res = await post(JSON.stringify(fields({ route: 'blue-lagoon', tourSlug })));
		expect(res.status).toBe(200);
		const enquiry = await stored();
		expect(enquiry.tourSlug).toBe('blue-lagoon-morning');
		expect(JSON.stringify(enquiry)).not.toContain('onerror');
		expect(JSON.stringify(enquiry)).not.toContain('xxxxxxxxxx');
	});

	it('takes the tour slug from a plain form post too', async () => {
		const res = await post(asForm({ route: 'blue-lagoon', tourSlug: 'blue-lagoon-afternoon', time: '14:30' }), 'application/x-www-form-urlencoded');
		expect(res.status).toBe(303);
		expect((await stored()).tourSlug).toBe('blue-lagoon-afternoon');
	});

	it('keeps the custom route on the Perfect Day landing, whatever tour is sent', async () => {
		const res = await post(JSON.stringify(fields({ route: 'custom', tourSlug: 'blue-cave-hvar-5-islands' })));
		expect(res.status).toBe(200);
		expect((await stored()).tourSlug).toBe('create-perfect-day-private');
	});
});
