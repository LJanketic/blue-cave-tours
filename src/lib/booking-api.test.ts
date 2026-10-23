import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TERMS_VERSION } from '../config/legal';
import { bookings, resetMemoryStore } from './bookings/store';
import { BOOKING_COOKIE, openDraft } from './bookings/session';

// Netlify Blobs isn't available in tests; the limiter always allows here (see contact-api.test.ts).
vi.mock('./rate-limit', () => ({
	checkRateLimit: async () => ({ ok: true }),
	checkGlobalLimit: async () => ({ ok: true }),
	clientIp: () => '203.0.113.1',
}));

const { POST: postDraft } = await import('../pages/api/bookings/draft');
const { POST: postBooking } = await import('../pages/api/bookings/index');

/** Just enough of Astro's cookies for the two endpoints: get and set. */
function fakeCookies() {
	const jar = new Map<string, string>();
	return {
		get: (name: string) => (jar.has(name) ? { value: jar.get(name) as string } : undefined),
		set: (name: string, value: string) => void jar.set(name, value),
	};
}

type Context = Parameters<typeof postDraft>[0];

/** What the review page posts: the terms version and the stamp of the draft it showed. */
function reviewForm(cookies: ReturnType<typeof fakeCookies>, extra: Record<string, string> = {}): string {
	const draftAt = String(openDraft(cookies.get(BOOKING_COOKIE)?.value)?.createdAt ?? '');
	return new URLSearchParams({ termsVersion: TERMS_VERSION, draftAt, ...extra }).toString();
}

function call(handler: typeof postDraft, path: string, body: string, contentType: string, cookies: ReturnType<typeof fakeCookies>) {
	const url = new URL(`http://localhost${path}`);
	const request = new Request(url, { method: 'POST', headers: { 'content-type': contentType }, body });
	return handler({ request, cookies, url } as unknown as Context);
}

const draftBody = (overrides: Record<string, unknown> = {}) =>
	JSON.stringify({
		tourId: 'blue-lagoon-morning',
		date: '2027-05-15', // low season
		slot: '09:30',
		adults: 2,
		children: 0,
		infants: 0,
		firstName: 'Jane',
		lastName: 'Smith',
		email: 'jane@example.com',
		...overrides,
	});

describe('booking endpoints', () => {
	const saved = { ...process.env };
	beforeEach(() => {
		process.env.BOOKING_COOKIE_SECRET = Buffer.alloc(32, 7).toString('base64');
		// Only Date is faked: 1 April 2027, before the tour date.
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2027-04-01T09:00:00Z'));
		resetMemoryStore();
	});
	afterEach(() => {
		vi.useRealTimers();
		process.env = { ...saved };
	});

	it('stores the season price, whatever total the client sends', async () => {
		const cookies = fakeCookies();
		const draft = await call(postDraft, '/api/bookings/draft', draftBody({ total: 1, lineItems: [] }), 'application/json', cookies);
		expect(draft.status).toBe(200);
		expect(await draft.json()).toEqual({ redirect: '/book/blue-lagoon-morning/review/' });

		const res = await call(postBooking, '/api/bookings', reviewForm(cookies, { total: '1' }), 'application/x-www-form-urlencoded', cookies);
		expect(res.status).toBe(303);
		const id = new URL(res.headers.get('location') as string, 'http://localhost').searchParams.get('id') as string;
		const booking = await bookings().get(id);
		// 2 adults × €65, the low-season adult price.
		expect(booking?.total).toBe(130);
	});

	it('refuses a guest count above the limit with the guests error, not as a missing count', async () => {
		const res = await call(postDraft, '/api/bookings/draft', draftBody({ children: 99 }), 'application/json', fakeCookies());
		expect(res.status).toBe(400);
		expect((await res.json()).code).toBe('guests');
	});

	it('sends a plain form post with too many guests back with only the error code', async () => {
		const form = new URLSearchParams({ ...JSON.parse(draftBody()), adults: '2', children: '40' }).toString();
		const res = await call(postDraft, '/api/bookings/draft', form, 'application/x-www-form-urlencoded', fakeCookies());
		expect(res.status).toBe(303);
		expect(res.headers.get('location')).toBe('/book/blue-lagoon-morning/group/?error=guests');
	});
});

describe('private experience endpoints', () => {
	const saved = { ...process.env };
	beforeEach(() => {
		process.env.BOOKING_COOKIE_SECRET = Buffer.alloc(32, 7).toString('base64');
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2027-04-01T09:00:00Z'));
		resetMemoryStore();
	});
	afterEach(() => {
		vi.useRealTimers();
		process.env = { ...saved };
	});

	// Blue Cave: departs 07:20, no latest departure yet; boat €1,500 low (operator doc). 15 May is low season.
	const privateBody = (overrides: Record<string, unknown> = {}) =>
		draftBody({ kind: 'private', tourId: 'blue-cave-hvar-5-islands', slot: '07:20', extras: [], pickup: 'riva', ...overrides });

	it('keeps the private draft and charges what the server prices, whatever the client sends', async () => {
		const cookies = fakeCookies();
		const draft = await call(postDraft, '/api/bookings/draft', privateBody({ total: 1, lineItems: [] }), 'application/json', cookies);
		expect(draft.status).toBe(200);
		expect(await draft.json()).toEqual({ redirect: '/book/blue-cave-hvar-5-islands/review/?flow=private' });
		expect(openDraft(cookies.get(BOOKING_COOKIE)?.value)).toMatchObject({ v: 2, kind: 'private' });

		const res = await call(postBooking, '/api/bookings', reviewForm(cookies, { total: '1' }), 'application/x-www-form-urlencoded', cookies);
		expect(res.status).toBe(303);
		const id = new URL(res.headers.get('location') as string, 'http://localhost').searchParams.get('id') as string;
		const booking = await bookings().get(id);
		expect(booking).toMatchObject({ kind: 'private', slot: '07:20', total: 1500 });
		expect(booking?.pickup).toBeUndefined();
		expect(booking?.termsAcceptedAt).toBeTruthy();
		expect(booking?.quoteExpiresAt).toBeUndefined();
	});

	it.each([
		['a time other than the usual departure', { slot: '07:35' }, 'slot', 'slot'],
		['a later time, with no latest departure set', { slot: '08:30' }, 'slot', 'slot'],
		['any extra, while none is offered', { extras: ['champagne'] }, 'extras', 'extras'],
		['an "other" pick-up', { pickup: 'other' }, 'pickup', 'pickup'],
		['a pick-up off the list', { pickup: 'hotel' }, 'pickup', 'pickup'],
	])('refuses %s', async (_name, overrides, code, field) => {
		const res = await call(postDraft, '/api/bookings/draft', privateBody(overrides), 'application/json', fakeCookies());
		expect(res.status).toBe(400);
		const json = await res.json();
		expect(json.code).toBe(code);
		expect(Object.keys(json.errors)).toEqual([field]);
	});

	it('takes the plain form, refuses an extra checkbox, and sends errors back to the private page', async () => {
		const fields = { ...JSON.parse(privateBody()), extras: '', adults: '2', children: '0', infants: '0' };
		const cookies = fakeCookies();
		const ok = await call(postDraft, '/api/bookings/draft', new URLSearchParams(fields).toString(), 'application/x-www-form-urlencoded', cookies);
		expect(ok.status).toBe(303);
		expect(ok.headers.get('location')).toBe('/book/blue-cave-hvar-5-islands/review/?flow=private');

		const res = await call(postBooking, '/api/bookings', reviewForm(cookies), 'application/x-www-form-urlencoded', cookies);
		const id = new URL(res.headers.get('location') as string, 'http://localhost').searchParams.get('id') as string;
		expect((await bookings().get(id))?.lineItems?.map((i) => i.label)).toEqual(['Private boat with skipper']);

		const bad = await call(postDraft, '/api/bookings/draft', new URLSearchParams({ ...fields, slot: '07:21' }).toString(), 'application/x-www-form-urlencoded', fakeCookies());
		expect(bad.status).toBe(303);
		expect(bad.headers.get('location')).toBe('/book/blue-cave-hvar-5-islands/private/?error=slot');
		// A forged checkbox for an extra that isn't offered (the form has none today).
		const extra = await call(postDraft, '/api/bookings/draft', new URLSearchParams({ ...fields, extra_champagne: 'yes' }).toString(), 'application/x-www-form-urlencoded', fakeCookies());
		expect(extra.headers.get('location')).toBe('/book/blue-cave-hvar-5-islands/private/?error=extras');
	});

	it('books nothing when another tab replaced the reviewed draft, and keeps the private flow in the redirect', async () => {
		const cookies = fakeCookies();
		await call(postDraft, '/api/bookings/draft', privateBody(), 'application/json', cookies);
		const reviewed = reviewForm(cookies);
		// Another tab starts a group booking before this one confirms.
		vi.setSystemTime(new Date('2027-04-01T09:01:00Z'));
		await call(postDraft, '/api/bookings/draft', draftBody(), 'application/json', cookies);
		const res = await call(postBooking, '/api/bookings', reviewed, 'application/x-www-form-urlencoded', cookies);
		expect(res.headers.get('location')).toBe('/book/blue-lagoon-morning/review/?error=draft-changed');
		const missing = await call(postBooking, '/api/bookings', new URLSearchParams({ termsVersion: TERMS_VERSION }).toString(), 'application/x-www-form-urlencoded', cookies);
		expect(missing.headers.get('location')).toBe('/book/blue-lagoon-morning/review/?error=draft-changed');
		expect(await bookings().list()).toHaveLength(0);

		// And the other way round: a private draft's errors go back to the private review.
		await call(postDraft, '/api/bookings/draft', privateBody(), 'application/json', cookies);
		const stale = await call(postBooking, '/api/bookings', reviewed, 'application/x-www-form-urlencoded', cookies);
		expect(stale.headers.get('location')).toBe('/book/blue-cave-hvar-5-islands/review/?flow=private&error=draft-changed');
	});

	it('refuses a private booking of a tour that is only planned on request', async () => {
		for (const tourId of ['dubrovnik-one-way', 'blue-lagoon-morning']) {
			const res = await call(postDraft, '/api/bookings/draft', privateBody({ tourId, slot: '09:30' }), 'application/json', fakeCookies());
			expect(res.status, tourId).toBe(400);
			expect((await res.json()).code, tourId).toBe('private');
		}
	});
});
