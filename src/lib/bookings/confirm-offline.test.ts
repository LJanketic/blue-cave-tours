import { beforeEach, describe, expect, it } from 'vitest';
import { getTourBySlug } from '../tours';
import type { TourDetail } from '../../types/tour';
import {
	applyAdminAction,
	createPendingBooking,
	DEMO_INVOICE_COUNTER,
	finalizePaidBooking,
	INVOICE_COUNTER,
	isPayable,
	notifyPaymentNotOpen,
	sweepPersonalData,
	waitingForConfirmation,
	type NewBookingInput,
} from './service';
import { capacityError } from './capacity';
import { DIGEST_MAX_ITEMS } from '../email/digest';
import { hourlySiteOrigin, runHourly } from '../hourly';
import { bookings, nextCounterValue, outbox, readLedger, resetMemoryStore, type Booking } from './store';

/*
 * Review B1: a booking the guest couldn't pay online (online payment not open
 * to them) is confirmed by staff with "Confirm, pay offline". It takes its
 * seats, is never invoiced, survives the retention sweep, and the guest gets
 * the confirmation email saying our team will contact them about payment.
 */

const NOW = new Date('2027-06-01T10:00:00Z');
const ORIGIN = 'https://example.test';
const tour = getTourBySlug('blue-cave-hvar-5-islands') as TourDetail;
const DATE = '2027-07-15';
const LEDGER = `seats:${tour.slug}|${DATE}|07:20`;

const input = (overrides: Partial<NewBookingInput> = {}): NewBookingInput => ({
	date: DATE,
	slot: '07:20',
	adults: 2,
	children: 0,
	infants: 0,
	firstName: 'Jane',
	lastName: 'Smith',
	email: 'jane@example.com',
	phone: '',
	notes: null,
	...overrides,
});

async function waiting(overrides: Partial<NewBookingInput> = {}): Promise<Booking> {
	const result = await createPendingBooking(tour, input(overrides), NOW);
	if (!result.ok) throw new Error(result.error);
	await notifyPaymentNotOpen(result.booking.id, ORIGIN, NOW);
	return (await bookings().get(result.booking.id)) as Booking;
}

const confirm = (id: string, now: Date = NOW) => applyAdminAction(id, { type: 'confirm_offline', siteOrigin: ORIGIN }, 'Admin', now);

beforeEach(() => resetMemoryStore());

describe('Confirm, pay offline (review B1)', () => {
	it('confirms the booking without a payment or an invoice, and its seats are taken', async () => {
		const booking = await waiting();
		expect(waitingForConfirmation(booking, NOW)).toBe(true);

		const { record, written } = await confirm(booking.id);
		expect(written).toBe(true);
		expect(record?.status).toBe('confirmed');
		expect(record?.paymentStatus).toBe('offline');
		expect(record?.paymentProvider).toBeNull();
		expect(record?.paidAt).toBeNull();
		expect(record?.invoice).toBeNull();
		expect(record?.seatsSince).toBe(NOW.toISOString());
		expect(record?.history.at(-1)?.action).toBe('Confirmed without online payment: payment arranged with staff, nothing charged');
		expect(waitingForConfirmation(record as Booking, NOW)).toBe(false);
		expect(isPayable(record as Booking, NOW)).toBe(false);

		// Neither invoice series moved.
		expect(await nextCounterValue(INVOICE_COUNTER)).toBe(1);
		expect(await nextCounterValue(DEMO_INVOICE_COUNTER)).toBe(1);

		// The departure counts its 2 seats: 13 more no longer fit on the 14-seat boat, 12 do.
		expect((await readLedger(LEDGER))?.claims[booking.id]).toMatchObject({ seats: 2, paid: true });
		expect(await capacityError({ kind: 'group', tourSlug: tour.slug, date: DATE, slot: '07:20', adults: 13, children: 0, infants: 0 }, NOW)).toBe('full');
		expect(await capacityError({ kind: 'group', tourSlug: tour.slug, date: DATE, slot: '07:20', adults: 12, children: 0, infants: 0 }, NOW)).toBeNull();
	});

	it('sends the guest the booking confirmation, saying our team will contact them about payment', async () => {
		const booking = await waiting();
		await confirm(booking.id);
		const sent = (await outbox().list()).filter((email) => email.kind === 'booking_confirmation');
		expect(sent).toHaveLength(1);
		expect(sent[0].to).toBe('jane@example.com');
		expect(sent[0].text).toContain("We haven't taken a payment online for this booking. Our team will contact you about payment.");
		expect(sent[0].text).toContain('Not paid online');
		expect(sent[0].text).not.toMatch(/Paid with|Invoice \(račun\)/);
		const stored = await bookings().get(booking.id);
		expect(stored?.confirmationEmail?.delivery).toBe('outbox');
		expect(stored?.emailIds).toContain(sent[0].id);
	});

	it('never calls it a demo booking: the guest does pay, just not on the site (review round 2, N1)', async () => {
		// The test build runs in demo payment mode, where a paid booking's email carries the demo notice.
		const booking = await waiting();
		await confirm(booking.id);
		const [sent] = (await outbox().list()).filter((email) => email.kind === 'booking_confirmation');
		for (const body of [sent.html, sent.text]) {
			expect(body).not.toContain('This is a demo booking');
			expect(body).not.toContain('No payment was taken');
			expect(body).not.toContain('demo, no money taken');
			expect(body).toContain('Our team will contact you about payment.');
		}

		// A demo-paid booking still says so, so the line above is really what the offline wording drops.
		const paid = await waiting();
		await finalizePaidBooking(paid.id, 'teya', 'DEMO-1', ORIGIN, NOW);
		const paidMail = (await outbox().list()).find((email) => email.kind === 'booking_confirmation' && email.relatedId === paid.id);
		expect(paidMail?.text).toContain('This is a demo booking. No payment was taken.');
		expect(paidMail?.html).toContain('demo, no money taken');
	});

	it('confirms once: a double click sends one email', async () => {
		const booking = await waiting();
		const results = await Promise.all([confirm(booking.id), confirm(booking.id)]);
		expect(results.filter((r) => r.written)).toHaveLength(1);
		expect((await outbox().list()).filter((email) => email.kind === 'booking_confirmation')).toHaveLength(1);
	});

	it('is refused for a paid, cancelled or departed booking', async () => {
		const paid = await waiting();
		await finalizePaidBooking(paid.id, 'teya', 'T-1', ORIGIN, NOW);
		expect((await confirm(paid.id)).written).toBe(false);
		expect((await bookings().get(paid.id))?.paymentStatus).toBe('paid');

		const cancelled = await waiting();
		await applyAdminAction(cancelled.id, { type: 'status', status: 'cancelled' }, 'Admin', NOW);
		expect((await confirm(cancelled.id)).written).toBe(false);

		const departed = await waiting();
		expect((await confirm(departed.id, new Date('2027-07-16T08:00:00Z'))).written).toBe(false);
		expect((await bookings().get(departed.id))?.status).toBe('pending_payment');
	});

	it('is kept and flagged when the departure is already full, as when reinstating', async () => {
		// Booked while seats were free; meanwhile another guest paid for the whole boat.
		const late = await waiting();
		const full = await createPendingBooking(tour, input({ adults: 14 }), NOW);
		if (!full.ok) throw new Error(full.error);
		await finalizePaidBooking(full.booking.id, 'teya', 'T-full', ORIGIN, NOW);
		const { record, written } = await confirm(late.id);
		expect(written).toBe(true);
		expect(record?.staffNotes.at(-1)?.text).toBe('Confirmed when the departure was already full: over capacity. Move the guest or contact them.');
		expect((await readLedger(LEDGER))?.claims[late.id]?.paid).toBe(true);
	});

	it('can be cancelled, which frees its seats, and put back, which takes them again', async () => {
		const booking = await waiting();
		await confirm(booking.id);
		await applyAdminAction(booking.id, { type: 'status', status: 'cancelled' }, 'Admin', NOW);
		expect((await readLedger(LEDGER))?.claims[booking.id]).toBeUndefined();
		expect((await bookings().get(booking.id))?.paymentStatus).toBe('offline');

		const back = await applyAdminAction(booking.id, { type: 'status', status: 'confirmed' }, 'Admin', NOW);
		expect(back.written).toBe(true);
		expect((await readLedger(LEDGER))?.claims[booking.id]?.paid).toBe(true);
	});

	it('can be marked completed or no-show and its confirmation resent, but never marked refunded (no money moved)', async () => {
		const booking = await waiting();
		await confirm(booking.id);
		expect((await applyAdminAction(booking.id, { type: 'refund' }, 'Admin', NOW)).written).toBe(false);
		expect((await applyAdminAction(booking.id, { type: 'resend', siteOrigin: ORIGIN }, 'Admin', new Date(NOW.getTime() + 120_000))).written).toBe(true);
		expect((await applyAdminAction(booking.id, { type: 'status', status: 'completed' }, 'Admin', NOW)).written).toBe(true);
	});

	it('is kept by the retention sweep, unlike a booking that was never paid', async () => {
		const confirmed = await waiting();
		await confirm(confirmed.id);
		const unpaid = await waiting();
		await sweepPersonalData(new Date('2027-09-01T10:00:00Z'));
		expect(await bookings().get(confirmed.id)).not.toBeNull();
		expect(await bookings().get(unpaid.id)).toBeNull();
	});
});

describe('waiting for confirmation (review S1)', () => {
	it('lists bookings the guest could not pay online until staff confirm or cancel them, or their day passes', async () => {
		const result = await createPendingBooking(tour, input(), NOW);
		if (!result.ok) throw new Error(result.error);
		// Booked, but the pay page was never reached: not waiting.
		expect(waitingForConfirmation(result.booking, NOW)).toBe(false);

		const booking = await waiting();
		expect(waitingForConfirmation(booking, NOW)).toBe(true);
		expect(waitingForConfirmation(booking, new Date('2027-07-15T20:00:00Z'))).toBe(true);
		expect(waitingForConfirmation(booking, new Date('2027-07-16T10:00:00Z'))).toBe(false);

		await applyAdminAction(booking.id, { type: 'status', status: 'cancelled' }, 'Admin', NOW);
		expect(waitingForConfirmation((await bookings().get(booking.id)) as Booking, NOW)).toBe(false);
	});

	it('the next digest still lists a booking recorded after the hour’s email went out', async () => {
		const first = await waiting();
		const second = await waiting();
		// Same hour: the second booking is recorded, not emailed on its own.
		expect((await outbox().list()).filter((e) => e.kind === 'admin_booking')).toHaveLength(1);
		const third = await createPendingBooking(tour, input(), NOW);
		if (!third.ok) throw new Error(third.error);
		expect(await notifyPaymentNotOpen(third.booking.id, ORIGIN, new Date(NOW.getTime() + 3_600_000))).toBe(true);
		const latest = (await outbox().list()).filter((e) => e.kind === 'admin_booking').find((e) => e.subject.startsWith('3 bookings'));
		expect(latest?.subject).toBe('3 bookings waiting for confirmation (2 new)');
		expect(latest?.text).toContain(`${second.ref} (new)`);
		expect(latest?.text).toContain(`${third.booking.ref} (new)`);
		// The first was set out in the previous digest: counted here, not repeated (round 2, N3).
		expect(latest?.text).not.toContain(first.ref);
		expect(latest?.text).toContain('1 booking from earlier emails is still waiting: see the admin.');
	});
});

describe('the hourly digest (round 2, N3)', () => {
	const HOUR = 3_600_000;
	const later = (hours: number) => new Date(NOW.getTime() + hours * HOUR);
	const digests = async () => (await outbox().list()).filter((e) => e.kind === 'admin_booking');

	it('sets out only the bookings new since the last digest, with their name, email and phone', async () => {
		const first = await waiting({ firstName: 'Ana', lastName: 'Old', email: 'ana.old@example.com', phone: '+385 91 111 1111' });
		const created = await createPendingBooking(tour, input({ firstName: 'Ben', lastName: 'New', email: 'ben.new@example.com', phone: '+44 7700 900999' }), NOW);
		if (!created.ok) throw new Error(created.error);
		await notifyPaymentNotOpen(created.booking.id, ORIGIN, later(0.5));
		// That hour's digest had gone: the hourly run sends the next.
		expect(await digests()).toHaveLength(1);
		expect(await runHourly(ORIGIN, later(1))).toEqual({ digestSent: true });
		const latest = (await digests()).find((e) => e.subject === '2 bookings waiting for confirmation (1 new)');
		expect(latest).toBeDefined();
		for (const body of [latest?.html ?? '', latest?.text ?? '']) {
			expect(body).toContain('ben.new@example.com');
			expect(body).toContain('+44 7700 900999');
			expect(body).toContain('Ben New');
			// The earlier booking's details were in the first digest only.
			expect(body).not.toContain('ana.old@example.com');
			expect(body).not.toContain('+385 91 111 1111');
			expect(body).not.toContain(first.ref);
		}
		expect(latest?.text).toContain(`${ORIGIN}/admin/bookings/?show=waiting`);
		expect(latest?.relatedIds).toEqual([created.booking.id]);
	});

	it('does nothing when no booking started waiting since the last digest: no listing, no email', async () => {
		expect(await runHourly(ORIGIN, later(1))).toEqual({ digestSent: false });
		await waiting();
		expect(await digests()).toHaveLength(1);
		// Still waiting, but already in a digest: no hourly reminder.
		expect(await runHourly(ORIGIN, later(1))).toEqual({ digestSent: false });
		expect(await runHourly(ORIGIN, later(2))).toEqual({ digestSent: false });
		expect(await digests()).toHaveLength(1);
		// Nor its hour's counter: an hour with nothing due leaves it for a booking later that hour.
		expect(await nextCounterValue(`admin-waiting-digest:hour:${later(2).toISOString().slice(0, 13)}`)).toBe(1);
	});

	it('sends nothing if staff dealt with the new booking before the hour', async () => {
		await waiting();
		const created = await createPendingBooking(tour, input({ firstName: 'Late' }), NOW);
		if (!created.ok) throw new Error(created.error);
		await notifyPaymentNotOpen(created.booking.id, ORIGIN, later(0.5));
		await confirm(created.booking.id, later(0.6));
		expect(await runHourly(ORIGIN, later(1))).toEqual({ digestSent: false });
		expect(await digests()).toHaveLength(1);
	});

	it(`sets out at most ${DIGEST_MAX_ITEMS} bookings and counts the rest`, async () => {
		const ids: string[] = [];
		for (let i = 0; i < DIGEST_MAX_ITEMS + 5; i++) {
			const created = await createPendingBooking(tour, input({ firstName: `Guest${i}`, email: `guest${i}@example.com` }), NOW);
			if (!created.ok) throw new Error(created.error);
			ids.push(created.booking.id);
			// Recorded in an hour whose digest already went (the test's first claim below), so all wait for the next run.
			await bookings().update(created.booking.id, (b) => ({ ...b, paymentNotOpenNotifiedAt: NOW.toISOString() }));
		}
		await nextCounterValue(`admin-waiting-digest:hour:${NOW.toISOString().slice(0, 13)}`);
		const created = await createPendingBooking(tour, input(), NOW);
		if (!created.ok) throw new Error(created.error);
		await notifyPaymentNotOpen(created.booking.id, ORIGIN, NOW);
		expect(await runHourly(ORIGIN, later(1))).toEqual({ digestSent: true });
		const [digest] = await digests();
		expect(digest.subject).toBe(`${DIGEST_MAX_ITEMS + 6} bookings waiting for confirmation (${DIGEST_MAX_ITEMS + 6} new)`);
		expect(digest.text.match(/ \(new\)\n/g)).toHaveLength(DIGEST_MAX_ITEMS);
		expect(digest.relatedIds).toHaveLength(DIGEST_MAX_ITEMS);
		expect(digest.text).toContain('6 more new bookings are waiting: see the admin.');
	});

	it('is deleted by the retention sweep with any booking it sets out', async () => {
		const booking = await waiting();
		const [digest] = await digests();
		expect(digest.relatedIds).toEqual([booking.id]);
		// Never confirmed: the booking goes 30 days after its trip, and the digest with it.
		await sweepPersonalData(new Date('2027-09-01T10:00:00Z'));
		expect(await bookings().get(booking.id)).toBeNull();
		expect(await outbox().get(digest.id)).toBeNull();
	});

	it('finds the site address the way Netlify gives it to functions', () => {
		expect(hourlySiteOrigin({ URL: 'https://hellobluecave.com' }, 'https://other.example')).toBe('https://hellobluecave.com');
		expect(hourlySiteOrigin({}, 'https://hello-blue-cave.netlify.app/')).toBe('https://hello-blue-cave.netlify.app');
		expect(hourlySiteOrigin({ PUBLIC_SITE_URL: 'https://hello-blue-cave.netlify.app' })).toBe('https://hello-blue-cave.netlify.app');
		expect(hourlySiteOrigin({ URL: 'not a url' })).toBeNull();
		expect(hourlySiteOrigin({})).toBeNull();
	});
});
