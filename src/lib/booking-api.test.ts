import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TERMS_VERSION } from '../config/legal';
import { bookings, resetMemoryStore } from './bookings/store';

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

		const form = new URLSearchParams({ termsVersion: TERMS_VERSION, total: '1' }).toString();
		const res = await call(postBooking, '/api/bookings', form, 'application/x-www-form-urlencoded', cookies);
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
