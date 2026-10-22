import { randomBytes, randomUUID } from 'node:crypto';
import { MAX_GUESTS, parseIsoDate, seatCount, supportsInstantBook } from '../booking';
import { isInSeason, seasonLabel } from '../../config/season';
import { TERMS_VERSION } from '../../config/legal';
import { BOOKING_CUTOFF_NOTE } from '../../config/booking';
import { computeBookingTotal, lineItemsFor } from '../price';
import { EMAIL_RE, asciiEmail } from '../contact-validation';
import { adminEmail, sendEmail, type EmailMessage } from '../email/send';
import { adminBookingEmail, adminEnquiryEmail, bookingConfirmationEmail, charterQuoteEmail } from '../email/templates';
import { durationLabel, routeById } from '../../config/charter';
import type { QuoteError, QuoteInput } from '../charter';
import type { TourDetail } from '../../types/tour';
import { bookingClosed, businessDate } from './dates';
import { newBookingRef, newId } from './ids';
import {
	bookings,
	enquiries,
	nextCounterValue,
	outbox,
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
	infants?: number;
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	phone: string | null;
	notes: string | null;
};

export const NOTES_MAX = 500;

/** Shown to the customer when the server rejects a booking. Redirects carry only these codes. */
export const BOOKING_ERRORS = {
	quote: 'This tour is booked on request. Please contact us.',
	guests: `Choose up to ${MAX_GUESTS} persons in total (infants included), with at least one adult.`,
	date: 'Choose a date for your tour.',
	past: `Booking for that departure has closed. ${BOOKING_CUTOFF_NOTE} Please choose another date or time.`,
	season: `Tours run ${seasonLabel()}. Please choose a date in the season.`,
	slot: 'Choose one of the departure times.',
	name: 'Enter your first and last name.',
	email: 'Enter a valid email address.',
	notes: `Keep notes to ${NOTES_MAX} characters.`,
	'session-expired': 'Your booking session expired, or was for another tour. Please fill in your details again.',
	'terms-changed': 'Our terms changed while you were booking. Please review them and confirm again.',
	busy: 'Too many attempts from your connection. Please wait a few minutes and try again.',
	server: 'We could not save your booking. Please try again, or call us and we will book it for you.',
} as const;
export type BookingError = keyof typeof BOOKING_ERRORS;

export function isBookingError(code: string | null | undefined): code is BookingError {
	return Boolean(code) && Object.hasOwn(BOOKING_ERRORS, code as string);
}

/**
 * Every rule a booking must meet, checked on the server (the browser's checks
 * are a convenience only). Shared by the draft endpoint and /api/bookings.
 */
export function validateBookingInput(tour: TourDetail, input: NewBookingInput, now: Date = new Date()): BookingError | null {
	if (!supportsInstantBook(tour)) return 'quote';
	const adults = input.adults ?? 0;
	if (adults < 1 || seatCount({ adults, children: input.children, infants: input.infants ?? 0 }) > MAX_GUESTS) return 'guests';
	if (!input.date || !parseIsoDate(input.date)) return 'date';
	if (input.date < businessDate(now)) return 'past';
	if (!isInSeason(input.date)) return 'season';
	// A tour with fixed departures needs one of them; one with none takes no time (D-16).
	const slot = input.slot ?? '';
	if (tour.departures.length === 0 ? slot !== '' : !tour.departures.some((d) => d.time === slot)) return 'slot';
	// Today's departure may already be closed (cut-off before it leaves): the date alone isn't enough.
	if (bookingClosed(input.date, slot, now)) return 'past';
	if (!input.firstName || !input.lastName) return 'name';
	if (!input.email || !EMAIL_RE.test(input.email)) return 'email';
	if ((input.notes ?? '').length > NOTES_MAX) return 'notes';
	return null;
}

export type CreateResult = { ok: true; booking: Booking } | { ok: false; error: BookingError };

/**
 * Validates, recomputes the price from the tour's data for the booking date's
 * season, and stores an unpaid booking with the terms version the server
 * knows (S-4). Seats are not held: overbooking protection comes with the
 * real database.
 */
export async function createPendingBooking(
	tour: TourDetail,
	input: NewBookingInput,
	now: Date = new Date(),
): Promise<CreateResult> {
	const error = validateBookingInput(tour, input, now);
	if (error) return { ok: false, error };
	const adults = input.adults ?? 0;
	const children = input.children;
	const infants = input.infants ?? 0;

	// The tour date's season sets the price (seasonFor), never a total from the client.
	const date = input.date as string;
	const total = computeBookingTotal(tour, date, adults, children);
	const lineItems = lineItemsFor(tour, date, adults, children, infants);
	if (total === null || lineItems === null) return { ok: false, error: 'quote' };

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
		kind: 'group',
		tourSlug: tour.slug,
		tourTitle: tour.title,
		date,
		slot: input.slot ?? '',
		adults,
		children,
		infants,
		total,
		lineItems,
		termsVersion: TERMS_VERSION,
		termsAcceptedAt: at,
		firstName: input.firstName as string,
		lastName: input.lastName as string,
		email: asciiEmail(input.email as string),
		phone: input.phone ?? '',
		customerNotes: input.notes ?? '',
		invoice: null,
		staffNotes: [],
		history: [{ at, by: 'customer', action: 'Booking started, waiting for payment' }],
	};
	await bookings().put(booking);
	return { ok: true, booking };
}

/** Still waiting for payment: never paid, cancelled or refunded. */
function awaitingPayment(booking: Booking): boolean {
	return booking.status === 'pending_payment' && (booking.paymentStatus === 'unpaid' || booking.paymentStatus === 'failed');
}

/** A private charter quote past its "valid until". */
export function quoteExpired(booking: Booking, now: Date = new Date()): boolean {
	return Boolean(booking.quoteExpiresAt) && now.toISOString() > (booking.quoteExpiresAt as string);
}

/**
 * A charter quote that will never be paid: replaced by a newer quote, withdrawn,
 * or expired. The admin's lists and the day's boats leave these out.
 */
export function isDeadQuote(booking: Booking, now: Date = new Date()): boolean {
	return booking.kind === 'private' && neverPaid(booking) && (booking.status === 'cancelled' || quoteExpired(booking, now));
}

/**
 * Whether the customer may start paying for this booking now: still waiting
 * for payment, booking for its departure hasn't closed yet (the same cut-off
 * as a new booking) and, for a charter quote, the quote is still valid.
 */
export function isPayable(booking: Booking, now: Date = new Date()): boolean {
	return awaitingPayment(booking) && !bookingClosed(booking.date, booking.slot, now) && !quoteExpired(booking, now);
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
		// Not isPayable: a charge that started before departure and succeeds after it
		// (a provider's webhook) must still be recorded. The pay page gates the start.
		if (!awaitingPayment(booking)) return null;
		// A charter quote's terms are accepted on the pay page (it has no review step), so they're recorded with the payment.
		if (booking.kind === 'private' && !booking.termsAcceptedAt) {
			booking.termsVersion = TERMS_VERSION;
			booking.termsAcceptedAt = at;
		}
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
		if (!awaitingPayment(booking)) return null;
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

export type QuoteResult = { ok: true; booking: Booking } | { ok: false; error: QuoteError | 'stale' };

/**
 * Answers a private charter request with a quote (spec §8.2, payments plan
 * Phase 5, mocked): an unpaid private booking for the whole boat at the
 * quoted price, and an email to the customer with a link to pay it.
 *
 * `previousQuoteId` is the quote the form was showing (or ''). If the request
 * was quoted since, nothing happens: a double click or a stale tab can't send
 * two quotes. A newer quote replaces an unpaid older one, which is cancelled;
 * a request whose quote was paid can't be quoted again.
 */
export async function sendCharterQuote(
	enquiryId: string,
	quote: QuoteInput,
	previousQuoteId: string,
	by: string,
	siteOrigin: string,
	now: Date = new Date(),
): Promise<QuoteResult> {
	const enquiry = await enquiries().get(enquiryId);
	const request = enquiry?.charter;
	if (!enquiry || enquiry.kind !== 'charter' || !request) return { ok: false, error: 'missing' };
	if ((enquiry.quoteBookingId ?? '') !== previousQuoteId) return { ok: false, error: 'stale' };
	const previous = enquiry.quoteBookingId ? await bookings().get(enquiry.quoteBookingId) : null;
	if (previous?.paymentStatus === 'paid' || previous?.paymentStatus === 'refunded') return { ok: false, error: 'paid' };

	const route = routeById(request.route);
	const at = now.toISOString();
	// The boss may offer another length than asked for (e.g. 6 h instead of 8): the quote's length is what's sold.
	const duration = durationLabel(quote.durationHours);
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
		kind: 'private',
		enquiryId: enquiry.id,
		quoteExpiresAt: new Date(now.getTime() + quote.validDays * 86_400_000).toISOString(),
		durationHours: quote.durationHours,
		tourSlug: route?.tourSlug ?? enquiry.tourSlug,
		tourTitle: `Private experience: ${route?.label ?? 'Your own route'}`,
		date: quote.date,
		slot: quote.time,
		adults: request.adults,
		children: request.children,
		infants: request.infants,
		total: quote.price,
		lineItems: [{ label: `Private boat with skipper, ${duration.toLowerCase()}`, unit: quote.price, qty: 1, amount: quote.price }],
		firstName: request.firstName,
		lastName: request.lastName,
		email: enquiry.email,
		phone: enquiry.phone,
		customerNotes: enquiry.message,
		invoice: null,
		staffNotes: quote.note ? [{ at, by, text: `Note sent with the quote: ${quote.note}` }] : [],
		history: [{ at, by, action: `Quote sent: €${quote.price}, valid ${quote.validDays} day${quote.validDays === 1 ? '' : 's'}` }],
		...(enquiry.sample ? { sample: true } : {}),
	};

	// 1. Withdraw the old link first, and stop if the customer paid it meanwhile: they must never be able to pay twice.
	if (previous) {
		let paidMeanwhile = false;
		await bookings().update(previous.id, (old) => {
			if (old.paymentStatus === 'paid' || old.paymentStatus === 'refunded') {
				paidMeanwhile = true;
				return null;
			}
			if (old.status === 'cancelled') return null;
			old.status = 'cancelled';
			old.updatedAt = at;
			old.history.push({ at, by, action: `Quote replaced by a newer one (${booking.ref})` });
			return old;
		});
		if (paidMeanwhile) return { ok: false, error: 'paid' };
	}
	// 2. Save the new quote, then 3. claim the request for it: only the request that moves it to this quote goes on.
	await bookings().put(booking);
	const claimed = await enquiries().update(enquiry.id, (current) =>
		(current.quoteBookingId ?? '') === previousQuoteId ? { ...current, quoteBookingId: booking.id, status: 'replied' } : null,
	);
	if (!claimed.written) {
		await bookings().delete(booking.id);
		return { ok: false, error: 'stale' };
	}
	// The pay link uses this deploy's address, not the public site's: each deploy keeps its own bookings.
	const payUrl = `${siteOrigin}/booking/pay/?id=${booking.id}`;
	await sendBookingEmail(booking.id, charterQuoteEmail(booking, quote.note, payUrl, siteOrigin, Boolean(previous)), at);
	return { ok: true, booking: (await bookings().get(booking.id)) ?? booking };
}

/** Seats counted against a departure: everything paid that hasn't been cancelled. */
export function takesSeats(booking: Booking): boolean {
	return booking.paymentStatus === 'paid' && booking.status !== 'cancelled';
}

/**
 * Retention (S-13; figures confirmed by the lawyer in PR 11). Removes personal
 * data that's no longer needed, and keeps what accounting needs (ref, date,
 * amounts, invoice, name):
 * - booking notes 30 days after the trip, phone numbers 90 days after
 * - bookings that were never paid (no invoice, so no accounting record) 30 days after the trip
 * - contact enquiries 12 months after they came in, with the notification email about them
 * - the text and reply-to address of sent emails after 90 days (who, when and what kind stay)
 * Runs when the admin dashboard loads. Returns what it changed.
 */
export const RETENTION_DAYS = { notes: 30, phone: 90, unpaidBooking: 30, enquiry: 365, emailBody: 90 } as const;

function neverPaid(booking: Booking): boolean {
	return booking.invoice === null && (booking.paymentStatus === 'unpaid' || booking.paymentStatus === 'failed');
}

export async function sweepPersonalData(now: Date = new Date()): Promise<{ bookings: number; enquiries: number; emails: number }> {
	const day = (offset: number) => businessDate(now, -offset);
	const at = now.toISOString();
	let changedBookings = 0;
	// Emails about records deleted here go with them: their subject and reply-to name the person.
	const deletedIds = new Set<string>();
	for (const booking of await bookings().list()) {
		if (neverPaid(booking) && booking.date < day(RETENTION_DAYS.unpaidBooking)) {
			await bookings().delete(booking.id);
			deletedIds.add(booking.id);
			changedBookings++;
			continue;
		}
		const dropNotes = booking.customerNotes && booking.date < day(RETENTION_DAYS.notes);
		const dropPhone = booking.phone && booking.date < day(RETENTION_DAYS.phone);
		if (!dropNotes && !dropPhone) continue;
		const { written } = await bookings().update(booking.id, (current) => ({
			...current,
			customerNotes: dropNotes ? '' : current.customerNotes,
			phone: dropPhone ? '' : current.phone,
			personalDataRemovedAt: at,
		}));
		if (written) changedBookings++;
	}
	let removedEnquiries = 0;
	const enquiryCutoff = new Date(now.getTime() - RETENTION_DAYS.enquiry * 86_400_000).toISOString();
	for (const enquiry of await enquiries().list()) {
		if (enquiry.createdAt < enquiryCutoff) {
			await enquiries().delete(enquiry.id);
			deletedIds.add(enquiry.id);
			removedEnquiries++;
		} else if (enquiry.charter) {
			// A charter request holds what its booking holds: special requests go 30 days after the trip, the phone after 90.
			const dropMessage = enquiry.message && enquiry.charter.date < day(RETENTION_DAYS.notes);
			const dropPhone = enquiry.phone && enquiry.charter.date < day(RETENTION_DAYS.phone);
			if (!dropMessage && !dropPhone) continue;
			const { written } = await enquiries().update(enquiry.id, (current) => ({
				...current,
				message: dropMessage ? '' : current.message,
				phone: dropPhone ? '' : current.phone,
				personalDataRemovedAt: at,
			}));
			if (written) removedEnquiries++;
		}
	}
	let trimmedEmails = 0;
	const emailCutoff = new Date(now.getTime() - RETENTION_DAYS.emailBody * 86_400_000).toISOString();
	for (const email of await outbox().list()) {
		if (email.relatedId && deletedIds.has(email.relatedId)) {
			await outbox().delete(email.id);
			trimmedEmails++;
		} else if (email.createdAt < emailCutoff && (email.html || email.text || email.replyTo || email.deliveryError)) {
			// A provider's error message can quote the recipient, so it goes too.
			await outbox().put({ ...email, html: '', text: '', replyTo: null, deliveryError: undefined });
			trimmedEmails++;
		}
	}
	return { bookings: changedBookings, enquiries: removedEnquiries, emails: trimmedEmails };
}
