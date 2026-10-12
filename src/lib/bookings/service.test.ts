import { beforeEach, describe, expect, it } from 'vitest';
import { getTourBySlug } from '../tours';
import type { TourDetail } from '../../types/tour';
import { applyAdminAction, createPendingBooking, finalizePaidBooking, isPayable, recordEnquiry, recordFailedPayment } from './service';
import { businessDate } from './dates';
import { bookings, outbox, resetMemoryStore } from './store';
import { newBookingRef } from './ids';

const NOW = new Date('2027-06-01T10:00:00Z');
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

	it('rejects what the browser should have caught', async () => {
		const cases = [
			{ ...input, email: 'not-an-email' },
			{ ...input, date: '2027-05-31' },
			{ ...input, adults: 0 },
			{ ...input, adults: 12, children: 1 },
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

	it('refuses quote-only tours', async () => {
		const quoteOnly = getTourBySlug('create-perfect-day-private') as TourDetail;
		expect((await createPendingBooking(quoteOnly, input, NOW)).ok).toBe(false);
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
		await applyAdminAction(booking.id, { type: 'resend' }, 'Admin', NOW);
		await applyAdminAction(booking.id, { type: 'refund' }, 'Admin', NOW);
		await applyAdminAction(booking.id, { type: 'resend' }, 'Admin', NOW); // refunded: ignored

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
		await applyAdminAction(booking.id, { type: 'resend' }, 'Admin', NOW);
		await applyAdminAction(booking.id, { type: 'status', status: 'confirmed' }, 'Admin', NOW);
		await applyAdminAction(booking.id, { type: 'refund' }, 'Admin', NOW);
		const stored = await bookings().get(booking.id);
		expect(stored?.status).toBe('pending_payment');
		expect(stored?.paymentStatus).toBe('unpaid');
		expect(await outbox().list()).toHaveLength(0);
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
