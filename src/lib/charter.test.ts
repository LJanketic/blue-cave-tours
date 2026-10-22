import { beforeEach, describe, expect, it, vi } from 'vitest';
import { botCheck, parseCharterRequest, validateCharterRequest, validateQuote, type CharterRequestInput } from './charter';
import { CHARTER_ROUTES, closestDuration } from '../config/charter';
import { MAX_GUESTS } from './booking';
import { getTourBySlug } from './tours';
import { finalizePaidBooking, isDeadQuote, isPayable, recordEnquiry, sendCharterQuote, sweepPersonalData } from './bookings/service';
import { bookings, enquiries, outbox, resetMemoryStore, type Booking, type Enquiry } from './bookings/store';
import { departuresOn } from './admin/manifest';
import { SITE_EMAIL } from '../config/site';

const NOW = new Date('2027-06-01T10:00:00Z');

const request = (overrides: Partial<CharterRequestInput> = {}): CharterRequestInput => ({
	route: 'blue-cave-hvar-5-islands',
	date: '2027-06-10',
	time: '09:00',
	durationHours: 8,
	adults: 4,
	children: 1,
	infants: 0,
	firstName: 'Jane',
	lastName: 'Smith',
	email: 'jane@example.com',
	phone: '+44 7700 900123',
	notes: '',
	honeypot: '',
	startedAt: NOW.getTime() - 60_000,
	...overrides,
});

describe('charter routes', () => {
	it('follow the handoff order, with the custom route last', () => {
		expect(CHARTER_ROUTES.map((r) => r.label)).toEqual([
			'Blue Cave & Hvar 5 Islands',
			'Golden Horn & Hvar',
			'Blue Lagoon & Trogir',
			'Red Rocks & Pakleni',
			'Split to Dubrovnik',
			'Your own route',
		]);
	});

	it('each point at a real tour', () => {
		for (const route of CHARTER_ROUTES) expect(getTourBySlug(route.tourSlug), route.id).toBeTruthy();
	});

	it('each tour that offers a private option has a route, by slug or alias', () => {
		const matched = new Set(CHARTER_ROUTES.flatMap((r) => [r.tourSlug, ...(r.aliases ?? [])]));
		for (const slug of ['blue-cave-hvar-5-islands', 'golden-horn-brac-hvar', 'blue-lagoon-morning', 'blue-lagoon-afternoon', 'hvar-red-rocks-pakleni', 'dubrovnik-one-way', 'create-perfect-day-private']) {
			expect(matched.has(slug), slug).toBe(true);
		}
	});

	it('suggest the offered duration closest to the tour', () => {
		expect(closestDuration(10)).toBe(10);
		expect(closestDuration(8.5)).toBe(8);
		expect(closestDuration(4.5)).toBe(4);
		expect(closestDuration(1)).toBe(1);
	});
});

describe('validateCharterRequest', () => {
	it('accepts a complete request', () => {
		expect(validateCharterRequest(request(), NOW)).toBeNull();
	});

	it.each([
		[{ route: 'sunset-coast' }, 'route'],
		[{ date: '2027-02-30' }, 'date'],
		[{ date: '2027-06-01' }, 'past'],
		[{ date: '2027-05-31' }, 'past'],
		[{ time: '05:30' }, 'time'],
		[{ time: '21:00' }, 'time'],
		[{ time: '9:00' }, 'time'],
		[{ durationHours: 5 }, 'duration'],
		[{ lastName: '' }, 'last-name'],
		[{ adults: 0 }, 'guests'],
		[{ adults: MAX_GUESTS, infants: 1 }, 'guests'],
		[{ children: -1 }, 'guests'],
		[{ firstName: '' }, 'name'],
		[{ email: 'jane@' }, 'email'],
		[{ phone: '' }, 'phone'],
		[{ notes: 'x'.repeat(501) }, 'notes'],
	] as const)('refuses %o with %s', (overrides, code) => {
		expect(validateCharterRequest(request(overrides as Partial<CharterRequestInput>), NOW)).toBe(code);
	});

	it('keeps over-long special requests whole, so they are refused rather than cut', () => {
		const parsed = parseCharterRequest({ notes: 'x'.repeat(600) }, 'company');
		expect(parsed.notes).toHaveLength(600);
	});

	it('refuses winter dates, when the boats are out of the water, and opens again on 1 March', () => {
		const october = new Date('2026-10-22T09:00:00Z');
		const at = (date: string) => validateCharterRequest(request({ date, startedAt: october.getTime() - 60_000 }), october);
		expect(at('2026-10-31')).toBeNull();
		expect(at('2026-11-01')).toBe('season');
		expect(at('2027-02-15')).toBe('season');
		expect(at('2027-03-01')).toBeNull();
	});

	it('refuses a date outside the season', async () => {
		vi.resetModules();
		vi.doMock('../config/season', async (original) => ({ ...(await original<typeof import('../config/season')>()), isInSeason: () => false }));
		const fresh = await import('./charter');
		expect(fresh.validateCharterRequest(request(), NOW)).toBe('season');
		vi.doUnmock('../config/season');
		vi.resetModules();
	});

	it('reads form strings, and refuses decimals and words as guest counts', () => {
		const parsed = parseCharterRequest({ route: 'custom', date: '2027-06-10', time: '10:00', duration: '4', adults: '2', children: '', infants: '1', firstName: 'A', lastName: 'B', email: 'a@b.co', phone: '+385 91 000 0000' }, 'company');
		expect(parsed).toMatchObject({ durationHours: 4, adults: 2, children: 0, infants: 1 });
		expect(validateCharterRequest(parsed, NOW)).toBeNull();
		expect(validateCharterRequest(parseCharterRequest({ ...parsed, duration: '4', adults: '2.5' }, 'company'), NOW)).toBe('guests');
		expect(validateCharterRequest(parseCharterRequest({ ...parsed, duration: '4', adults: 'two' }, 'company'), NOW)).toBe('guests');
	});
});

describe('botCheck', () => {
	const now = NOW.getTime();
	it('drops a filled honeypot silently', () => expect(botCheck({ honeypot: 'Acme', startedAt: null }, true, now)).toBe('silent'));
	it('lets a plain form post through without a start time', () => expect(botCheck({ honeypot: '', startedAt: null }, true, now)).toBe('ok'));
	it('needs a start time from the page script', () => expect(botCheck({ honeypot: '', startedAt: null }, false, now)).toBe('invalid'));
	it('refuses a form filled in under two seconds', () => expect(botCheck({ honeypot: '', startedAt: now - 500 }, false, now)).toBe('too-fast'));
	it('refuses a start time in the future or over a day old', () => {
		expect(botCheck({ honeypot: '', startedAt: now + 60_000 }, false, now)).toBe('invalid');
		expect(botCheck({ honeypot: '', startedAt: now - 2 * 86_400_000 }, false, now)).toBe('invalid');
	});
});

describe('validateQuote', () => {
	const quote = { price: 1200, date: '2027-06-10', time: '09:00', durationHours: 8, validDays: 3, note: '' };
	it('accepts a quote', () => expect(validateQuote(quote, NOW)).toBeNull());
	it.each([
		[{ price: 0 }, 'price'],
		[{ price: 20_001 }, 'price'],
		[{ price: Number.NaN }, 'price'],
		[{ date: '2027-06-01' }, 'date'],
		[{ date: '2027-11-02' }, 'season'],
		[{ time: '25:00' }, 'time'],
		[{ durationHours: 5 }, 'duration'],
		[{ validDays: 0 }, 'valid'],
		[{ validDays: 15 }, 'valid'],
		[{ note: 'x'.repeat(1001) }, 'note'],
	] as const)('refuses %o with %s', (overrides, code) => {
		expect(validateQuote({ ...quote, ...overrides }, NOW)).toBe(code);
	});
});

describe('charter request → quote → payment', () => {
	beforeEach(() => {
		resetMemoryStore();
		vi.unstubAllEnvs();
	});

	async function charterEnquiry(): Promise<Enquiry> {
		return recordEnquiry(
			{
				kind: 'charter',
				topic: 'charter',
				name: 'Jane Smith',
				email: 'jane@example.com',
				phone: '+44 7700 900123',
				tourSlug: 'blue-cave-hvar-5-islands',
				message: 'Anniversary, champagne please',
				charter: { route: 'blue-cave-hvar-5-islands', date: '2027-06-10', time: '09:00', durationHours: 8, adults: 4, children: 1, infants: 0, firstName: 'Jane', lastName: 'Smith' },
			},
			'http://localhost',
			NOW,
		);
	}
	const quote = { price: 1200, date: '2027-06-10', time: '08:30', durationHours: 8, validDays: 3, note: 'Lunch stop in Hvar town.' };

	it('emails the admin the charter details, but not the special requests', async () => {
		await charterEnquiry();
		const [mail] = await outbox().list();
		expect(mail.kind).toBe('admin_enquiry');
		expect(mail.subject).toBe('Private charter request from Jane Smith: Blue Cave & Hvar 5 Islands, Thursday, 10 Jun 2027');
		expect(mail.text).toContain('Duration: Full day (8 h)');
		expect(mail.text).toContain('Guests: 4 adults, 1 child');
		expect(mail.text).not.toContain('champagne');
	});

	it('sells the length the quote offers, not the one asked for', async () => {
		const enquiry = await charterEnquiry();
		const { booking } = (await sendCharterQuote(enquiry.id, { ...quote, durationHours: 6 }, '', 'Admin', 'http://localhost', NOW)) as { booking: Booking };
		expect(booking.durationHours).toBe(6);
		expect(booking.lineItems?.[0].label).toBe('Private boat with skipper, 6 hours');
		const mail = (await outbox().list()).find((m) => m.kind === 'charter_quote');
		expect(mail?.text).toContain('Duration: 6 hours');
		// "Just reply to this email" reaches us, whatever the sending address is.
		expect(mail?.replyTo).toBe(SITE_EMAIL);
	});

	it('creates an unpaid private booking at the quoted price and emails the customer a pay link', async () => {
		const enquiry = await charterEnquiry();
		const result = await sendCharterQuote(enquiry.id, quote, '', 'Admin', 'http://localhost', NOW);
		expect(result.ok).toBe(true);
		const booking = (result as { booking: Booking }).booking;
		expect(booking).toMatchObject({
			kind: 'private',
			enquiryId: enquiry.id,
			status: 'pending_payment',
			paymentStatus: 'unpaid',
			total: 1200,
			date: '2027-06-10',
			slot: '08:30',
			durationHours: 8,
			tourTitle: 'Private experience: Blue Cave & Hvar 5 Islands',
			firstName: 'Jane',
			adults: 4,
			children: 1,
			quoteExpiresAt: '2027-06-04T10:00:00.000Z',
		});
		expect(await enquiries().get(enquiry.id)).toMatchObject({ quoteBookingId: booking.id, status: 'replied' });

		const mail = (await outbox().list()).find((m) => m.kind === 'charter_quote');
		expect(mail?.to).toBe('jane@example.com');
		expect(mail?.text).toContain(`http://localhost/booking/pay/?id=${booking.id}`);
		expect(mail?.text).toContain('Lunch stop in Hvar town.');
		expect(booking.emailIds).toEqual([mail?.id]);
	});

	it('sends one quote for a double click (the second post carries a stale previous id)', async () => {
		const enquiry = await charterEnquiry();
		const [a, b] = await Promise.all([
			sendCharterQuote(enquiry.id, quote, '', 'Admin', 'http://localhost', NOW),
			sendCharterQuote(enquiry.id, quote, '', 'Admin', 'http://localhost', NOW),
		]);
		expect([a.ok, b.ok].sort()).toEqual([false, true]);
		expect((await bookings().list()).filter((x) => x.kind === 'private')).toHaveLength(1);
		expect((await outbox().list()).filter((m) => m.kind === 'charter_quote')).toHaveLength(1);
	});

	it('replaces an unpaid quote with a new one, cancelling the old link', async () => {
		const enquiry = await charterEnquiry();
		const first = await sendCharterQuote(enquiry.id, quote, '', 'Admin', 'http://localhost', NOW);
		const firstId = (first as { booking: Booking }).booking.id;
		const second = await sendCharterQuote(enquiry.id, { ...quote, price: 1100 }, firstId, 'Admin', 'http://localhost', NOW);
		expect(second.ok).toBe(true);
		const old = await bookings().get(firstId);
		expect(old?.status).toBe('cancelled');
		expect(isPayable(old as Booking, NOW)).toBe(false);
		expect((await enquiries().get(enquiry.id))?.quoteBookingId).toBe((second as { booking: Booking }).booking.id);
	});

	it('expires: the link stops working after "valid until"', async () => {
		const enquiry = await charterEnquiry();
		const { booking } = (await sendCharterQuote(enquiry.id, { ...quote, validDays: 1 }, '', 'Admin', 'http://localhost', NOW)) as { booking: Booking };
		expect(isPayable(booking, new Date('2027-06-02T09:59:00Z'))).toBe(true);
		expect(isPayable(booking, new Date('2027-06-02T10:01:00Z'))).toBe(false);
	});

	it('pays like a group booking: račun, confirmation in private wording, terms recorded; no new quote after', async () => {
		const enquiry = await charterEnquiry();
		const { booking } = (await sendCharterQuote(enquiry.id, quote, '', 'Admin', 'http://localhost', NOW)) as { booking: Booking };
		const paid = await finalizePaidBooking(booking.id, 'teya', 'DEMO-TEYA-1', 'http://localhost', NOW);
		expect(paid).toMatchObject({ paymentStatus: 'paid', status: 'confirmed', termsAcceptedAt: NOW.toISOString() });
		expect(paid?.invoice?.number).toMatch(/\/HBC1\/1$/);
		const confirmation = (await outbox().list()).find((m) => m.kind === 'booking_confirmation');
		expect(confirmation?.text).toContain('The boat and skipper are yours');
		expect(confirmation?.text).not.toContain('joining a group');
		expect(confirmation?.text).toContain('Duration: Full day (8 h)');
		expect(confirmation?.text).toContain('/legal/cancellation/#private');
		const admin = (await outbox().list()).find((m) => m.kind === 'admin_booking');
		expect(admin?.subject).toMatch(/^New private charter HBC-/);

		const again = await sendCharterQuote(enquiry.id, quote, booking.id, 'Admin', 'http://localhost', NOW);
		expect(again).toEqual({ ok: false, error: 'paid' });
	});

	it('is its own boat on the day: never counted against the group departure', async () => {
		const enquiry = await charterEnquiry();
		const { booking } = (await sendCharterQuote(enquiry.id, { ...quote, time: '07:20' }, '', 'Admin', 'http://localhost', NOW)) as { booking: Booking };
		await finalizePaidBooking(booking.id, 'teya', 'DEMO-TEYA-1', 'http://localhost', NOW);
		const cards = departuresOn('2027-06-10', await bookings().list());
		expect(cards).toHaveLength(1);
		// Its capacity is its own party: no free seats to sell on a private boat.
		expect(cards[0]).toMatchObject({ private: true, seatsTaken: 5, capacity: 5, overBy: 0 });
		expect(cards[0].key).toBe(`private:${booking.id}|07:20`);
	});

	it('stops a new quote if the old one was paid meanwhile, so nobody pays twice', async () => {
		const enquiry = await charterEnquiry();
		const { booking } = (await sendCharterQuote(enquiry.id, quote, '', 'Admin', 'http://localhost', NOW)) as { booking: Booking };
		await finalizePaidBooking(booking.id, 'teya', 'DEMO-TEYA-1', 'http://localhost', NOW);
		// The admin's tab still shows the unpaid quote: it posts with that quote as "previous".
		expect(await sendCharterQuote(enquiry.id, { ...quote, price: 999 }, booking.id, 'Admin', 'http://localhost', NOW)).toEqual({ ok: false, error: 'paid' });
		expect((await bookings().list()).filter((b) => b.kind === 'private')).toHaveLength(1);
		expect((await outbox().list()).filter((m) => m.kind === 'charter_quote')).toHaveLength(1);
	});

	it('says in the new email that it replaces the earlier quote', async () => {
		const enquiry = await charterEnquiry();
		const first = (await sendCharterQuote(enquiry.id, quote, '', 'Admin', 'http://localhost', NOW)) as { booking: Booking };
		await sendCharterQuote(enquiry.id, { ...quote, price: 1100 }, first.booking.id, 'Admin', 'http://localhost', NOW);
		const quotes = (await outbox().list()).filter((m) => m.kind === 'charter_quote');
		expect(quotes.map((m) => m.subject.startsWith('Your updated private experience quote')).sort()).toEqual([false, true]);
		expect(quotes.find((m) => m.subject.includes('updated'))?.text).toContain('replaces our earlier one');
	});

	it('leaves replaced and expired quotes off the day\'s boats', async () => {
		const enquiry = await charterEnquiry();
		const first = (await sendCharterQuote(enquiry.id, { ...quote, validDays: 1 }, '', 'Admin', 'http://localhost', NOW)) as { booking: Booking };
		const second = (await sendCharterQuote(enquiry.id, { ...quote, validDays: 1 }, first.booking.id, 'Admin', 'http://localhost', NOW)) as { booking: Booking };
		const all = await bookings().list();
		expect(isDeadQuote(all.find((b) => b.id === first.booking.id) as Booking, NOW)).toBe(true);
		expect(isDeadQuote(second.booking, NOW)).toBe(false);
		expect(departuresOn('2027-06-10', all).map((d) => d.unpaid.map((b) => b.id))).toEqual([[second.booking.id]]);
		const dayLater = new Date('2027-06-02T10:01:00Z');
		expect(isDeadQuote(second.booking, dayLater)).toBe(true);
	});

	it("removes a charter request's special requests 30 days after the trip, as booking notes are", async () => {
		const enquiry = await charterEnquiry();
		await sweepPersonalData(new Date('2027-07-09T10:00:00Z'));
		expect((await enquiries().get(enquiry.id))?.message).toBe('Anniversary, champagne please');
		await sweepPersonalData(new Date('2027-07-11T10:00:00Z'));
		expect(await enquiries().get(enquiry.id)).toMatchObject({ message: '', phone: '+44 7700 900123', charter: { route: 'blue-cave-hvar-5-islands' } });
		// The phone goes 90 days after the trip, as on a booking.
		await sweepPersonalData(new Date('2027-09-09T10:00:00Z'));
		expect((await enquiries().get(enquiry.id))?.phone).toBe('');
	});
});
