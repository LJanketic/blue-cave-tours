import { randomBytes, randomUUID } from 'node:crypto';
import { MAX_GUESTS, parseIsoDate, supportsInstantBook } from '../booking';
import { computeBookingTotal } from '../price';
import { EMAIL_RE } from '../contact-validation';
import { adminEmail, sendEmail, type EmailMessage } from '../email/send';
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
	type UpdateResult,
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

	const total = computeBookingTotal(tour, adults, children);
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

	await sendBookingEmail(booking.id, bookingConfirmationEmail(booking, siteOrigin), at);
	await sendBookingEmail(booking.id, adminBookingEmail(booking, adminEmail(), `${siteOrigin}/admin/bookings/${booking.id}/`), at);
	return booking;
}

/**
 * Sends one of a booking's emails and notes it on the booking: its id (so the
 * admin page loads just this booking's emails) and, for the customer
 * confirmation, whether it went out (read by the public success page).
 */
async function sendBookingEmail(bookingId: string, message: EmailMessage, at: string): Promise<void> {
	const email = await sendEmail(message);
	await bookings().update(bookingId, (current) => ({
		...current,
		emailIds: [...(current.emailIds ?? []), email.id],
		...(message.kind === 'booking_confirmation' ? { confirmationEmail: { delivery: email.delivery, at } } : {}),
	}));
}

/** A second "Resend confirmation" this soon after the last one is a double click, and is ignored. */
const RESEND_COOLDOWN_MS = 60_000;

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
	/** `siteOrigin`: the website address shown in the email's signature. */
	| { type: 'resend'; siteOrigin: string };

/** Statuses that only make sense for a booking that was paid. */
const PAID_ONLY_STATUSES: BookingStatus[] = ['confirmed', 'completed', 'no_show'];

/**
 * Applies one admin action and logs it. The server enforces the same rules
 * the buttons follow (e.g. no confirmation email for an unpaid booking).
 * Returns the booking (null if it doesn't exist) and whether this action
 * changed it; `written: false` means it was refused or ignored, e.g. a resend
 * within a minute of the last confirmation.
 */
export async function applyAdminAction(
	id: string,
	action: AdminAction,
	by: string,
	now: Date = new Date(),
): Promise<UpdateResult<Booking>> {
	const at = now.toISOString();
	const { record, written } = await bookings().update(id, (booking) => {
		const paid = booking.paymentStatus === 'paid';
		switch (action.type) {
			case 'status':
				if (booking.status === action.status) return null;
				if (PAID_ONLY_STATUSES.includes(action.status) && !paid) return null;
				booking.history.push({ at, by, action: `Status: ${STATUS_LABELS[booking.status]} → ${STATUS_LABELS[action.status]}` });
				// Reinstated: it takes its seats now, so it counts as the latest one in when checking for overbooking.
				if (booking.status === 'cancelled') booking.seatsSince = at;
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
			case 'resend': {
				if (!paid) return null;
				// Double clicks and repeated form posts send once: the compare-and-swap lets only one request
				// record the resend, and another within a minute of the last confirmation is ignored.
				const last = booking.confirmationEmail ? Date.parse(booking.confirmationEmail.at) : Number.NaN;
				if (now.getTime() - last < RESEND_COOLDOWN_MS) return null;
				booking.confirmationEmail = { delivery: 'outbox', at };
				booking.history.push({ at, by, action: `Confirmation email created again for ${booking.email}` });
				break;
			}
		}
		booking.updatedAt = at;
		return booking;
	});
	if (written && record && action.type === 'resend') await sendBookingEmail(record.id, bookingConfirmationEmail(record, action.siteOrigin), at);
	return { record, written };
}

/**
 * Admin notification emails for contact (and later charter) messages per UTC
 * day (S-6). Past it, messages are stored and shown in the admin, but not
 * emailed: a flood can't burn the Resend quota. Booking emails aren't capped.
 */
export const ADMIN_NOTIFY_DAILY_CAP = 40;

export async function recordEnquiry(
	input: Omit<Enquiry, 'id' | 'createdAt' | 'status' | 'notified'>,
	siteOrigin: string,
	now: Date = new Date(),
): Promise<Enquiry> {
	const sentToday = await nextCounterValue(`admin-notify:${now.toISOString().slice(0, 10)}`);
	const notified = sentToday <= ADMIN_NOTIFY_DAILY_CAP;
	const enquiry: Enquiry = { ...input, id: newId(), createdAt: now.toISOString(), status: 'new', notified };
	await enquiries().put(enquiry);
	if (notified) await sendEmail(adminEnquiryEmail(enquiry, adminEmail(), `${siteOrigin}/admin/enquiries/`));
	return enquiry;
}

/** Seats counted against a departure: everything paid that hasn't been cancelled. */
export function takesSeats(booking: Booking): boolean {
	return booking.paymentStatus === 'paid' && booking.status !== 'cancelled';
}
