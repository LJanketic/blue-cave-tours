import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTourBySlug } from '../tours';
import type { TourDetail } from '../../types/tour';
import {
	applyAdminAction,
	createPendingBooking,
	finalizePaidBooking,
	isDeadQuote,
	isPayable,
	recordEnquiry,
	recordFailedPayment,
	termsDueOnPayment,
	validatePrivateBookingInput,
	type PrivateBookingInput,
} from './service';
import { adminBookingEmail, bookingConfirmationEmail } from '../email/templates';
import type { PrivateLists } from '../../config/private';
import { businessDate } from './dates';
import { bookings, outbox, resetMemoryStore } from './store';
import { newBookingRef } from './ids';
import { MEETING_POINT_MAP_URL } from '../../config/site';
import { meetingPointMapUrl } from '../email/templates';

const NOW = new Date('2027-06-01T10:00:00Z');
const LATER = new Date('2027-06-01T10:05:00Z');
const tour = getTourBySlug('blue-cave-hvar-5-islands') as TourDetail;

const input = {
	date: '2027-07-15',
	slot: '07:20',
	adults: 2,
	children: 1,
	firstName: 'Jane',
	lastName: 'Smith',
	email: 'jane@example.com',
	phone: '+44 7700 900123',
	notes: null,
};

async function pending() {
	const result = await createPendingBooking(tour, input, NOW);
	if (!result.ok) throw new Error(result.error);
	return result.booking;
}

beforeEach(() => resetMemoryStore());

describe('createPendingBooking', () => {
	it('stores an unpaid booking with a server-computed total', async () => {
		const booking = await pending();
		expect(booking.status).toBe('pending_payment');
		expect(booking.paymentStatus).toBe('unpaid');
		expect(booking.total).toBe(169 * 2 + 139);
		expect(booking.ref).toMatch(/^HBC-[A-Z2-9]{6}$/);
		expect(await bookings().get(booking.id)).toEqual(booking);
	});

	it('prices by the tour date’s season, not the day of purchase', async () => {
		// Bought on 1 April (low season) for 10 July (peak season): peak prices.
		// (A forged client total can't reach this input type; the endpoint test covers that.)
		const april = new Date('2027-04-01T09:00:00Z');
		const peak = await createPendingBooking(tour, { ...input, date: '2027-07-10' }, april);
		if (!peak.ok) throw new Error(peak.error);
		expect(peak.booking.total).toBe(169 * 2 + 139);
		expect(peak.booking.lineItems?.map((i) => i.unit)).toEqual([169, 139]);
		// The same purchase day for a low-season date: low prices.
		const low = await createPendingBooking(tour, { ...input, date: '2027-10-01' }, april);
		if (!low.ok) throw new Error(low.error);
		expect(low.booking.total).toBe(149 * 2 + 129);
	});

	it('stores an accented email domain in its ASCII form', async () => {
		const result = await createPendingBooking(tour, { ...input, email: 'ana@žena.hr' }, NOW);
		if (!result.ok) throw new Error(result.error);
		expect(result.booking.email).toBe('ana@xn--ena-b3a.hr');
	});

	it('rejects what the browser should have caught', async () => {
		const cases = [
			{ ...input, email: 'not-an-email' },
			{ ...input, date: '2027-05-31' },
			{ ...input, adults: 0 },
			{ ...input, adults: 14, children: 1 },
			{ ...input, firstName: null },
		];
		const errors = [];
		for (const bad of cases) {
			const result = await createPendingBooking(tour, bad, NOW);
			errors.push(result.ok ? 'ok' : result.error);
		}
		expect(errors).toEqual(['email', 'past', 'guests', 'guests', 'name']);
		expect(await bookings().list()).toHaveLength(0);
	});

	it('refuses winter dates, when the boats are out of the water, and opens again on 1 March', async () => {
		// Booked on 22 Oct 2026, the last open week of that season.
		const october = new Date('2026-10-22T09:00:00Z');
		expect(await createPendingBooking(tour, { ...input, date: '2026-10-31' }, october)).toMatchObject({ ok: true });
		expect(await createPendingBooking(tour, { ...input, date: '2026-11-01' }, october)).toEqual({ ok: false, error: 'season' });
		expect(await createPendingBooking(tour, { ...input, date: '2027-02-15' }, october)).toEqual({ ok: false, error: 'season' });
		const march = await createPendingBooking(tour, { ...input, date: '2027-03-01' }, october);
		if (!march.ok) throw new Error(march.error);
		expect(march.booking.total).toBe(149 * 2 + 129);
	});

	it("refuses today's departure from 15 minutes before it leaves Split", async () => {
		// 2027-07-15 in Split (UTC+2): booking for the 07:20 boat closes at 07:05.
		const today = { ...input, date: '2027-07-15' };
		expect(await createPendingBooking(tour, today, new Date('2027-07-15T05:04:00Z'))).toMatchObject({ ok: true });
		expect(await createPendingBooking(tour, today, new Date('2027-07-15T05:05:00Z'))).toEqual({ ok: false, error: 'past' });
		expect(await createPendingBooking(tour, today, new Date('2027-07-15T05:30:00Z'))).toEqual({ ok: false, error: 'past' });
	});

	it('refuses quote-only tours', async () => {
		const quoteOnly = getTourBySlug('create-perfect-day-private') as TourDetail;
		expect((await createPendingBooking(quoteOnly, input, NOW)).ok).toBe(false);
	});
});

describe('private experience (pay now)', () => {
	// Blue Cave: departs 07:20 (check-in 07:05), no latest departure yet, boat €1,500 low / €2,000 peak.
	const privateInput: PrivateBookingInput = { ...input, slot: '07:20', kind: 'private', extras: [], pickup: 'riva' };
	// A made-up list, for tests only: the site has no latest departures, extras or priced pick-ups yet.
	const lists: PrivateLists = {
		tours: { 'blue-cave-hvar-5-islands': { boat: { low: 100, peak: 200 }, latestDeparture: '08:30' } },
		extras: [{ id: 'test-extra', label: 'Test extra', desc: '', price: 10 }],
		pickups: [{ id: 'riva', label: 'Riva', price: 0 }, { id: 'test-pickup', label: 'Test pick-up', price: 25 }],
	};

	it('takes only the usual departure, no extras, and only the Riva, as the config stands', () => {
		const check = (over: Partial<PrivateBookingInput>) => validatePrivateBookingInput(tour, { ...privateInput, ...over }, NOW);
		expect(check({})).toBeNull();
		// No latest departure from the operator yet: any other time is refused.
		expect(check({ slot: '07:35' })).toBe('slot');
		expect(check({ slot: '08:30' })).toBe('slot');
		expect(check({ slot: '07:05' })).toBe('slot');
		expect(check({ slot: null })).toBe('slot');
		// No extras are offered yet: any id is refused.
		expect(check({ extras: ['champagne'] })).toBe('extras');
		expect(check({ pickup: 'other' })).toBe('pickup');
		expect(check({ pickup: 'moon' })).toBe('pickup');
		expect(check({ adults: 0 })).toBe('guests');
		expect(check({ adults: 14, children: 1 })).toBe('guests');
		expect(check({ date: '2027-11-15' })).toBe('season');
		expect(check({ date: '2027-05-31' })).toBe('past');
		expect(check({ email: 'nope' })).toBe('email');
		expect(check({ lastName: null })).toBe('name');
	});

	it('checks shifted times, extras and pick-ups against the lists once the operator sets them', () => {
		const check = (over: Partial<PrivateBookingInput>) => validatePrivateBookingInput(tour, { ...privateInput, ...over }, NOW, lists);
		expect(check({ slot: '08:05', extras: ['test-extra'], pickup: 'test-pickup' })).toBeNull();
		expect(check({ slot: '08:30' })).toBeNull();
		// Off the 15-minute steps, or after the latest.
		expect(check({ slot: '07:30' })).toBe('slot');
		expect(check({ slot: '08:45' })).toBe('slot');
		expect(check({ extras: ['test-extra', 'test-extra'] })).toBe('extras');
		expect(check({ extras: ['caviar'] })).toBe('extras');
	});

	it('refuses tours that are not sold privately on the site', () => {
		for (const slug of ['golden-horn-brac-hvar', 'blue-lagoon-morning', 'dubrovnik-one-way', 'create-perfect-day-private']) {
			const other = getTourBySlug(slug) as TourDetail;
			expect(validatePrivateBookingInput(other, { ...privateInput, slot: other.departures[0]?.time ?? '' }, NOW), slug).toBe('private');
		}
	});

	it("closes today's private departure 15 minutes before it leaves; a shifted one closes later", async () => {
		// 2027-07-15 in Split (UTC+2): the 07:20 boat closes at 07:05; a shifted 08:05 one at 07:50.
		const today = { ...privateInput, date: '2027-07-15' };
		expect(validatePrivateBookingInput(tour, today, new Date('2027-07-15T05:04:00Z'))).toBeNull();
		expect(validatePrivateBookingInput(tour, today, new Date('2027-07-15T05:05:00Z'))).toBe('past');
		expect(validatePrivateBookingInput(tour, { ...today, slot: '08:05' }, new Date('2027-07-15T05:49:00Z'), lists)).toBeNull();
		expect(validatePrivateBookingInput(tour, { ...today, slot: '08:05' }, new Date('2027-07-15T05:50:00Z'), lists)).toBe('past');
	});

	it('stores the whole boat at the season price, meeting at the Riva, terms accepted, and no quote', async () => {
		const result = await createPendingBooking(tour, privateInput, NOW);
		if (!result.ok) throw new Error(result.error);
		const booking = result.booking;
		expect(booking).toMatchObject({
			kind: 'private',
			tourTitle: `Private experience: ${tour.title}`,
			slot: '07:20',
			durationHours: tour.durationHours,
			total: 2000,
			termsAcceptedAt: NOW.toISOString(),
		});
		expect(booking.quoteExpiresAt).toBeUndefined();
		expect(booking.enquiryId).toBeUndefined();
		expect(booking.pickup).toBeUndefined();
		expect(booking.lineItems).toEqual([{ label: 'Private boat with skipper', unit: 2000, qty: 1, amount: 2000 }]);
		expect(isPayable(booking, NOW)).toBe(true);
		expect(termsDueOnPayment(booking)).toBe(false);
		// Cancelled before paying, it's still a booking in the admin, not a dead quote.
		expect(isDeadQuote({ ...booking, status: 'cancelled' }, NOW)).toBe(false);
	});

	it('charges extras and a priced pick-up from the lists, and keeps the pick-up on the booking', async () => {
		const result = await createPendingBooking(tour, { ...privateInput, slot: '08:05', extras: ['test-extra'], pickup: 'test-pickup' }, NOW, lists);
		if (!result.ok) throw new Error(result.error);
		expect(result.booking).toMatchObject({ slot: '08:05', total: 200 + 10 + 25, pickup: 'Test pick-up' });
		expect(result.booking.lineItems?.map((i) => i.label)).toEqual(['Private boat with skipper', 'Test extra', 'Pick-up: Test pick-up']);
		const admin = adminBookingEmail(result.booking, 'boss@example.com', 'https://example.test/admin/');
		expect(admin.text).toContain('Test extra (1 × €10)');
	});

	it('emails a private experience, not a quote; a pick-up replaces the meeting point', async () => {
		const result = await createPendingBooking(tour, privateInput, NOW);
		if (!result.ok) throw new Error(result.error);
		const admin = adminBookingEmail(result.booking, 'boss@example.com', 'https://example.test/admin/');
		expect(admin.subject).toMatch(/^New private experience /);
		expect(admin.text).not.toMatch(/quote/i);
		expect(admin.text).toContain('Private boat with skipper (1 × €2000)');
		expect(bookingConfirmationEmail(result.booking, 'https://example.test').text).toContain('Meeting point:');
		// Pick-ups come from a quoted "Other location" request today.
		const pickedUp = { ...result.booking, pickup: 'Villa Sunce, Podstrana' };
		expect(adminBookingEmail(pickedUp, 'boss@example.com', 'https://example.test/admin/').text).toContain('Pick-up: Villa Sunce, Podstrana');
		const customer = bookingConfirmationEmail(pickedUp, 'https://example.test');
		expect(customer.text).toContain('Pick-up: Villa Sunce, Podstrana');
		expect(customer.text).not.toContain('Meeting point:');
	});

	it('leaves group bookings as they were: the pay page asks no terms, a quote still does', async () => {
		const group = await pending();
		expect(group.kind).toBe('group');
		expect(group.pickup).toBeUndefined();
		expect(termsDueOnPayment(group)).toBe(false);
		expect(termsDueOnPayment({ kind: 'private', termsAcceptedAt: undefined })).toBe(true);
	});
});

describe('finalizePaidBooking', () => {
	it('confirms, issues an invoice and emails customer and admin', async () => {
		const booking = await pending();
		const paid = await finalizePaidBooking(booking.id, 'teya', 'T-1', 'https://example.test', NOW);
		expect(paid?.status).toBe('confirmed');
		expect(paid?.paymentStatus).toBe('paid');
		expect(paid?.invoice?.number).toBe('1/HBC1/1');

		const emails = await outbox().list();
		expect(emails.map((e) => e.kind).sort()).toEqual(['admin_booking', 'booking_confirmation']);
		const admin = emails.find((e) => e.kind === 'admin_booking');
		expect(admin?.replyTo).toBe('jane@example.com');
		expect(admin?.html).toContain(`https://example.test/admin/bookings/${booking.id}/`);

		// The owner's wording (2026-10-12), with the meeting point as a link to the stand 14 pin.
		const customer = emails.find((e) => e.kind === 'booking_confirmation');
		expect(customer?.subject).toBe('Your Hello Blue Cave booking confirmation – Blue Cave, Hvar & 5 islands, Thursday, 15 Jul 2027');
		expect(customer?.html).toContain(`<a href="${MEETING_POINT_MAP_URL.replace(/&/g, '&amp;')}"`);
		expect(customer?.html).toContain('Open in Google Maps');
		const text = customer?.text ?? '';
		for (const line of [
			'Dear Jane,',
			'Thank you for booking with Hello Blue Cave! Here are your booking details:',
			`Booking ref: ${booking.ref}`,
			'Departure: 07:20',
			`Meeting point: Riva promenade, stand 14, Split — ${MEETING_POINT_MAP_URL}`,
			"As you'll be joining a group, please be at the meeting point at least 15 minutes before departure. The boat can't wait, and we don't want to keep your fellow travelers waiting.",
			'Guests: 2 adults, 1 child',
			`Total (incl. VAT): €${booking.total} — Paid (demo, no money taken)`,
			'Bring: Swimsuit and towel, Sunscreen and sunglasses, Hat or cap, Cash or card for lunch and extras, Light jacket for cooler sea breezes',
			"If we cancel for safety reasons, we'll let you know at least 4 hours before departure.",
			'See you aboard!',
			'The Hello Blue Cave team · Hello Blue Cave · Split, Croatia',
			'example.test · +385 91 988 88 38 · info@hellobluecave.com',
		]) {
			expect(text).toContain(line);
		}
		expect(text.startsWith('This is a demo booking. No payment was taken.')).toBe(true);
	});

	it('does nothing the second time (duplicate webhook or double click)', async () => {
		const booking = await pending();
		await finalizePaidBooking(booking.id, 'teya', 'T-1', 'https://example.test', NOW);
		await finalizePaidBooking(booking.id, 'paypal', 'P-2', 'https://example.test', NOW);
		const stored = await bookings().get(booking.id);
		expect(stored?.paymentProvider).toBe('teya');
		expect(await outbox().list()).toHaveLength(2);
	});

	it('numbers invoices in sequence', async () => {
		const a = await pending();
		const b = await pending();
		await finalizePaidBooking(a.id, 'teya', 'T-1', 'https://example.test', NOW);
		const second = await finalizePaidBooking(b.id, 'teya', 'T-2', 'https://example.test', NOW);
		expect(second?.invoice?.number).toBe('2/HBC1/1');
	});

	it('pays once when requests race, and numbers invoices without gaps', async () => {
		const booking = await pending();
		const results = await Promise.all(
			[1, 2, 3, 4, 5].map((n) => finalizePaidBooking(booking.id, 'teya', `T-${n}`, 'https://example.test', NOW)),
		);
		expect(new Set(results.map((r) => r?.paymentRef)).size).toBe(1);
		expect(await outbox().list()).toHaveLength(2);
		const other = await pending();
		const second = await finalizePaidBooking(other.id, 'teya', 'T-9', 'https://example.test', NOW);
		expect(second?.invoice?.number).toBe('2/HBC1/1');
	});

	it('never takes payment for a cancelled, refunded or past booking', async () => {
		const cancelled = await pending();
		await applyAdminAction(cancelled.id, { type: 'status', status: 'cancelled' }, 'Admin', NOW);
		expect(await finalizePaidBooking(cancelled.id, 'teya', 'T', 'https://example.test', NOW)).toMatchObject({
			status: 'cancelled',
			paymentStatus: 'unpaid',
		});

		const refunded = await pending();
		await finalizePaidBooking(refunded.id, 'teya', 'T', 'https://example.test', NOW);
		await applyAdminAction(refunded.id, { type: 'refund' }, 'Admin', NOW);
		const again = await finalizePaidBooking(refunded.id, 'teya', 'T2', 'https://example.test', NOW);
		expect(again?.paymentStatus).toBe('refunded');
		expect(again?.invoice?.number).toBe('1/HBC1/1');

		const upcoming = await pending();
		expect(isPayable(upcoming, NOW)).toBe(true);
		expect(isPayable(upcoming, new Date('2027-07-16T10:00:00Z'))).toBe(false);
		// Same day: payment can start until 07:04 and not from 07:05 (Split time), the booking cut-off.
		expect(isPayable(upcoming, new Date('2027-07-15T05:04:00Z'))).toBe(true);
		expect(isPayable(upcoming, new Date('2027-07-15T05:05:00Z'))).toBe(false);
		expect(isPayable(upcoming, new Date('2027-07-15T05:30:00Z'))).toBe(false);
	});

	it('records a charge that succeeds after the boat left, though no new payment may start', async () => {
		const booking = await pending();
		const afterDeparture = new Date('2027-07-15T05:30:00Z');
		expect(isPayable(booking, afterDeparture)).toBe(false);
		expect(await finalizePaidBooking(booking.id, 'teya', 'T-late', 'https://example.test', afterDeparture)).toMatchObject({ paymentStatus: 'paid' });
	});

	it('a declined payment leaves the booking payable', async () => {
		const booking = await pending();
		await recordFailedPayment(booking.id, 'teya', NOW);
		expect((await bookings().get(booking.id))?.paymentStatus).toBe('failed');
		const paid = await finalizePaidBooking(booking.id, 'paypal', 'P-1', 'https://example.test', NOW);
		expect(paid?.paymentStatus).toBe('paid');
	});
});

describe('applyAdminAction', () => {
	it('logs status changes, notes, refunds and resends', async () => {
		const booking = await pending();
		await finalizePaidBooking(booking.id, 'teya', 'T-1', 'https://example.test', NOW);
		await applyAdminAction(booking.id, { type: 'status', status: 'no_show' }, 'Admin', NOW);
		await applyAdminAction(booking.id, { type: 'note', text: '  Called, no answer  ' }, 'Admin', NOW);
		await applyAdminAction(booking.id, { type: 'note', text: '   ' }, 'Admin', NOW);
		await applyAdminAction(booking.id, { type: 'resend', siteOrigin: 'https://example.test' }, 'Admin', LATER);
		await applyAdminAction(booking.id, { type: 'refund' }, 'Admin', NOW);
		await applyAdminAction(booking.id, { type: 'resend', siteOrigin: 'https://example.test' }, 'Admin', NOW); // refunded: ignored

		const stored = await bookings().get(booking.id);
		expect(stored?.status).toBe('no_show');
		expect(stored?.paymentStatus).toBe('refunded');
		expect(stored?.staffNotes.map((n) => n.text)).toEqual(['Called, no answer']);
		expect(stored?.history.map((h) => h.action).join('\n')).toMatch(/Confirmed → No-show[\s\S]*created again[\s\S]*refunded/);
		expect((await outbox().list()).filter((e) => e.kind === 'booking_confirmation')).toHaveLength(2);
	});
});

describe('applyAdminAction guards', () => {
	it('ignores actions that only make sense for paid bookings', async () => {
		const booking = await pending();
		await applyAdminAction(booking.id, { type: 'resend', siteOrigin: 'https://example.test' }, 'Admin', NOW);
		await applyAdminAction(booking.id, { type: 'status', status: 'confirmed' }, 'Admin', NOW);
		await applyAdminAction(booking.id, { type: 'refund' }, 'Admin', NOW);
		const stored = await bookings().get(booking.id);
		expect(stored?.status).toBe('pending_payment');
		expect(stored?.paymentStatus).toBe('unpaid');
		expect(await outbox().list()).toHaveLength(0);
	});

	it('sends a resend once on a double click, and records each confirmation on the booking', async () => {
		const booking = await pending();
		await finalizePaidBooking(booking.id, 'teya', 'T-1', 'https://example.test', NOW);
		expect((await bookings().get(booking.id))?.confirmationEmail).toEqual({ delivery: 'outbox', at: NOW.toISOString() });

		// Within a minute of the payment's confirmation: ignored.
		await applyAdminAction(booking.id, { type: 'resend', siteOrigin: 'https://example.test' }, 'Admin', new Date('2027-06-01T10:00:30Z'));
		// Two clicks landing together later: only one gets through.
		await Promise.all([
			applyAdminAction(booking.id, { type: 'resend', siteOrigin: 'https://example.test' }, 'Admin', LATER),
			applyAdminAction(booking.id, { type: 'resend', siteOrigin: 'https://example.test' }, 'Admin', LATER),
		]);
		const confirmations = (await outbox().list()).filter((e) => e.kind === 'booking_confirmation');
		expect(confirmations).toHaveLength(2);
		// The booking lists exactly its own emails (payment: confirmation + admin; one resend).
		const ids = (await bookings().get(booking.id))?.emailIds ?? [];
		expect(ids).toHaveLength(3);
		expect(new Set(ids)).toEqual(new Set((await outbox().list()).filter((e) => e.relatedId === booking.id).map((e) => e.id)));
		expect((await bookings().get(booking.id))?.confirmationEmail?.at).toBe(LATER.toISOString());
	});

	it('records "sent" on the booking only when the confirmation really went out', async () => {
		process.env.RESEND_API_KEY = 're_test';
		process.env.EMAIL_SENDING = 'on';
		process.env.EMAIL_DEMO_ALLOWLIST = 'jane@example.com';
		vi.stubGlobal('fetch', vi.fn(async () => new Response('{"id":"x"}', { status: 200 })));
		const booking = await pending();
		await finalizePaidBooking(booking.id, 'teya', 'T-1', 'https://example.test', NOW);
		expect((await bookings().get(booking.id))?.confirmationEmail?.delivery).toBe('sent');
	});

	it('never sends admin notifications without ADMIN_EMAIL, even with sending on', async () => {
		process.env.RESEND_API_KEY = 're_test';
		process.env.EMAIL_SENDING = 'on';
		const fetchMock = vi.fn(async () => new Response('{"id":"x"}', { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);
		const booking = await pending();
		await finalizePaidBooking(booking.id, 'teya', 'T-1', 'https://example.test', NOW);
		const admin = (await outbox().list()).find((e) => e.kind === 'admin_booking');
		expect(admin?.to).toBe('');
		expect(admin?.delivery).toBe('outbox');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('records when a cancelled, paid booking is put back, so it counts as the latest to take seats', async () => {
		const booking = await pending();
		await finalizePaidBooking(booking.id, 'teya', 'T-1', 'https://example.com', NOW);
		await applyAdminAction(booking.id, { type: 'status', status: 'cancelled' }, 'Admin', NOW);
		expect((await bookings().get(booking.id))?.seatsSince).toBeUndefined();
		const later = new Date('2027-06-03T09:00:00Z');
		await applyAdminAction(booking.id, { type: 'status', status: 'confirmed' }, 'Admin', later);
		expect((await bookings().get(booking.id))?.seatsSince).toBe(later.toISOString());
	});
});

describe('businessDate', () => {
	it('uses Split time and steps calendar days across daylight-saving changes', () => {
		expect(businessDate(new Date('2027-06-30T22:30:00Z'))).toBe('2027-07-01');
		// 27 Mar 2027, 23:30 in Split: tomorrow is the 28th (clocks change that night), not the 29th.
		expect(businessDate(new Date('2027-03-27T22:30:00Z'), 1)).toBe('2027-03-28');
		// 30 Oct 2027, 23:30 in Split (UTC+2 until the 31st): tomorrow is the 31st.
		expect(businessDate(new Date('2027-10-30T21:30:00Z'), 1)).toBe('2027-10-31');
	});
});

describe('recordEnquiry', () => {
	it('stores the enquiry and notifies the admin with Reply-To set to the sender', async () => {
		const enquiry = await recordEnquiry(
			{ name: 'Ana', email: 'ana@example.com', phone: '', tourSlug: '', message: 'Hello <b>there</b>' },
			'https://example.test',
			NOW,
		);
		expect(enquiry.status).toBe('new');
		const [email] = await outbox().list();
		expect(email.replyTo).toBe('ana@example.com');
		expect(email.html).toContain('Hello &lt;b&gt;there&lt;/b&gt;');
	});
});

describe('newBookingRef', () => {
	it('avoids look-alike characters', () => {
		for (let i = 0; i < 200; i++) expect(newBookingRef()).not.toMatch(/[01IO]/);
	});
});

describe('meetingPointMapUrl', () => {
	it('uses the website link for Riva tours and searches other meeting points by name', () => {
		expect(meetingPointMapUrl('Meet at Split’s Riva promenade, stand number 14.')).toBe(MEETING_POINT_MAP_URL);
		expect(meetingPointMapUrl('Meet at Trogir marina. Look for our flag.')).toBe(
			'https://www.google.com/maps/search/?api=1&query=Trogir%20marina%2C%20Split%2C%20Croatia',
		);
	});
});
