import { randomBytes, randomUUID } from 'node:crypto';
import { MAX_GUESTS, parseIsoDate, supportsInstantBook } from '../booking';
import { computeBookingTotal } from '../price';
import { EMAIL_RE } from '../contact-validation';
import { adminEmail, sendEmail } from '../email/send';
import { adminBookingEmail, adminEnquiryEmail, bookingConfirmationEmail } from '../email/templates';
import type { TourDetail } from '../../types/tour';
import { businessDate } from './dates';
import { newBookingRef, newId } from './ids';
import {
	bookings,
	enquiries,
	nextCounterValue,
	type Booking,
	type BookingStatus,
	type DemoInvoice,
	type Enquiry,
	type PaymentProvider,
} from './store';

export type NewBookingInput = {
	date: string | null;
	slot: string | null;
	adults: number | null;
	children: number;
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	phone: string | null;
	notes: string | null;
};

/** Shown to the customer on the review page when the server rejects a booking. */
export const BOOKING_ERRORS = {
	quote: 'This tour is booked on request. Please contact us.',
	guests: `Choose between 1 and ${MAX_GUESTS} guests, with at least one adult.`,
	date: 'Choose a date for your tour.',
	past: 'That date has already passed in Split. Please choose another date.',
	name: 'Enter your first and last name.',
	email: 'Enter a valid email address.',
} as const;
export type BookingError = keyof typeof BOOKING_ERRORS;

export type CreateResult = { ok: true; booking: Booking } | { ok: false; error: BookingError };

/**
 * Validates on the server (the browser's checks are a convenience only),
 * recomputes the price from the tour's data, and stores an unpaid booking.
 * Seats are not held: overbooking protection comes with the real database.
 */
export async function createPendingBooking(
	tour: TourDetail,
	input: NewBookingInput,
	now: Date = new Date(),
): Promise<CreateResult> {
	if (!supportsInstantBook(tour)) return { ok: false, error: 'quote' };
	const adults = input.adults ?? 0;
	const children = input.children;
	if (adults < 1 || adults + children > MAX_GUESTS) return { ok: false, error: 'guests' };
	if (!input.date || !parseIsoDate(input.date)) return { ok: false, error: 'date' };
	if (input.date < businessDate(now)) return { ok: false, error: 'past' };
	if (!input.firstName || !input.lastName) return { ok: false, error: 'name' };
	if (!input.email || !EMAIL_RE.test(input.email)) return { ok: false, error: 'email' };

	const total = computeBookingTotal(tour.fromPrice, tour.priceNotes, adults, children);
	if (total === null) return { ok: false, error: 'quote' };

	const at = now.toISOString();
	const booking: Booking = {
		id: newId(),
		ref: newBookingRef(),
		createdAt: at,
		updatedAt: at,
		status: 'pending_payment',
		paymentStatus: 'unpaid',
		paymentProvider: null,
		paymentRef: null,
		paidAt: null,
		tourSlug: tour.slug,
		tourTitle: tour.title,
		date: input.date,
		slot: input.slot ?? '',
		adults,
		children,
		total,
		firstName: input.firstName,
		lastName: input.lastName,
		email: input.email,
		phone: input.phone ?? '',
		customerNotes: input.notes ?? '',
		invoice: null,
		staffNotes: [],
		history: [{ at, by: 'customer', action: 'Booking started, waiting for payment' }],
	};
	await bookings().put(booking);
	return { ok: true, booking };
}

/**
 * Whether the customer may pay for this booking now: still waiting for
 * payment (never paid, cancelled or refunded) and the trip hasn't passed.
 */
export function isPayable(booking: Booking, now: Date = new Date()): boolean {
	return (
		booking.status === 'pending_payment' &&
		(booking.paymentStatus === 'unpaid' || booking.paymentStatus === 'failed') &&
		booking.date >= businessDate(now)
	);
}

/** Stand-in for the fiscalization service (Phase 3): same shape, clearly fake values. */
async function issueDemoInvoice(now: Date): Promise<DemoInvoice> {
	return {
		number: `${await nextCounterValue('invoice')}/HBC1/1`,
		jir: randomUUID(),
		zki: randomBytes(16).toString('hex'),
		issuedAt: now.toISOString(),
	};
}

function providerName(provider: PaymentProvider): string {
	return provider === 'paypal' ? 'PayPal' : 'Teya';
}

/**
 * Marks a booking paid, issues the (demo) račun and sends the customer
 * confirmation and the admin notification. Only the request whose write
 * actually flips the booking to paid does the rest, so a double click,
 * concurrent requests or a repeated payment webhook never send twice or
 * burn an invoice number. Bookings that aren't payable are left alone.
 */
export async function finalizePaidBooking(
	id: string,
	provider: PaymentProvider,
	paymentRef: string,
	siteOrigin: string,
	now: Date = new Date(),
): Promise<Booking | null> {
	const at = now.toISOString();
	const paid = await bookings().update(id, (booking) => {
		if (!isPayable(booking, now)) return null;
		booking.paymentStatus = 'paid';
		booking.status = 'confirmed';
		booking.paymentProvider = provider;
		booking.paymentRef = paymentRef;
		booking.paidAt = at;
		booking.updatedAt = at;
		booking.history.push({ at, by: providerName(provider), action: `Paid €${booking.total}` });
		return booking;
	});
	if (!paid.written || !paid.record) return paid.record;

	const invoice = await issueDemoInvoice(now);
	const { record } = await bookings().update(id, (booking) => {
		booking.invoice = invoice;
		booking.history.push({ at, by: 'System', action: `Invoice ${invoice.number} issued` });
		return booking;
	});
	const booking = record ?? { ...paid.record, invoice };

	await sendEmail(bookingConfirmationEmail(booking));
	await sendEmail(adminBookingEmail(booking, adminEmail(), `${siteOrigin}/admin/bookings/${booking.id}/`));
	return booking;
}

export async function recordFailedPayment(id: string, provider: PaymentProvider, now: Date = new Date()): Promise<void> {
	const at = now.toISOString();
	await bookings().update(id, (booking) => {
		if (!isPayable(booking, now)) return null;
		booking.paymentStatus = 'failed';
		booking.updatedAt = at;
		booking.history.push({ at, by: providerName(provider), action: 'Payment declined' });
		return booking;
	});
}

export const STATUS_LABELS: Record<BookingStatus, string> = {
	pending_payment: 'Awaiting payment',
	confirmed: 'Confirmed',
	cancelled: 'Cancelled',
	completed: 'Completed',
	no_show: 'No-show',
};

export type AdminAction =
	| { type: 'status'; status: BookingStatus }
	| { type: 'refund' }
	| { type: 'note'; text: string }
	| { type: 'resend' };

/** Statuses that only make sense for a booking that was paid. */
const PAID_ONLY_STATUSES: BookingStatus[] = ['confirmed', 'completed', 'no_show'];

/**
 * Applies one admin action and logs it. The server enforces the same rules
 * the buttons follow (e.g. no confirmation email for an unpaid booking).
 * Returns the booking, or null if it doesn't exist.
 */
export async function applyAdminAction(id: string, action: AdminAction, by: string, now: Date = new Date()): Promise<Booking | null> {
	const at = now.toISOString();
	const { record, written } = await bookings().update(id, (booking) => {
		const paid = booking.paymentStatus === 'paid';
		switch (action.type) {
			case 'status':
				if (booking.status === action.status) return null;
				if (PAID_ONLY_STATUSES.includes(action.status) && !paid) return null;
				booking.history.push({ at, by, action: `Status: ${STATUS_LABELS[booking.status]} → ${STATUS_LABELS[action.status]}` });
				booking.status = action.status;
				break;
			case 'refund':
				if (!paid) return null;
				booking.paymentStatus = 'refunded';
				booking.history.push({ at, by, action: `Marked €${booking.total} as refunded (demo, no money moved)` });
				break;
			case 'note': {
				const text = action.text.trim().slice(0, 1000);
				if (!text) return null;
				booking.staffNotes.push({ at, by, text });
				break;
			}
			case 'resend':
				if (!paid) return null;
				booking.history.push({ at, by, action: `Confirmation email created again for ${booking.email}` });
				break;
		}
		booking.updatedAt = at;
		return booking;
	});
	if (written && record && action.type === 'resend') await sendEmail(bookingConfirmationEmail(record));
	return record;
}

export async function recordEnquiry(
	input: Omit<Enquiry, 'id' | 'createdAt' | 'status'>,
	siteOrigin: string,
	now: Date = new Date(),
): Promise<Enquiry> {
	const enquiry: Enquiry = { ...input, id: newId(), createdAt: now.toISOString(), status: 'new' };
	await enquiries().put(enquiry);
	await sendEmail(adminEnquiryEmail(enquiry, adminEmail(), `${siteOrigin}/admin/enquiries/`));
	return enquiry;
}

/** Seats counted against a departure: everything paid that hasn't been cancelled. */
export function takesSeats(booking: Booking): boolean {
	return booking.paymentStatus === 'paid' && booking.status !== 'cancelled';
}
