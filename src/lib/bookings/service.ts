import { randomBytes, randomUUID } from 'node:crypto';
import { MAX_GUESTS, parseIsoDate, seatCount, supportsInstantBook } from '../booking';
import { isInSeason, seasonLabel, withinHorizon } from '../../config/season';
import { TERMS_VERSION } from '../../config/legal';
import { BOOKING_CUTOFF_NOTE } from '../../config/booking';
import { computeBookingTotal, formatEuro, lineItemsFor, lineItemsTotal, privateLineItems } from '../price';
import { DEFAULT_PICKUP_ID, PRIVATE_LISTS, privateDepartureTimes, privateExtra, privatePickup, privateTour, type PrivateLists } from '../../config/private';
import { EMAIL_RE, PHONE_RE, asciiEmail } from '../contact-validation';
import { adminEmail, sendEmail, type EmailMessage } from '../email/send';
import { adminBookingEmail, adminEnquiryEmail, bookingConfirmationEmail, charterQuoteEmail } from '../email/templates';
import { charterTourSlug, durationLabel, routeById } from '../../config/charter';
import type { QuoteError, QuoteInput } from '../charter';
import type { TourDetail } from '../../types/tour';
import { bookingClosed, businessDate, departureHasLeft } from './dates';
import { newBookingRef, newId } from './ids';
import { neverPaid } from './retention';
import { awaitingPayment, markWaitingDigestDue, quoteExpired, sendWaitingDigest } from './waiting';
import { capacityChecked, capacityError, claimCapacity, heldOutOfCapacity, holdCapacity, PAYMENT_GATE, releaseCapacity, takesSeats, type CapacityClaimResult, type CapacityError } from './capacity';
import {
	bookingRefs,
	bookings,
	enquiries,
	isCharterQuote,
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
	infants?: number;
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	phone: string | null;
	notes: string | null;
	/** A private experience: the whole boat, paid now (src/config/private.ts). Group bookings leave these out. */
	kind?: 'private';
	extras?: string[];
	pickup?: string;
};

/** A private experience booking: the group fields, plus the extras and pick-up. */
export type PrivateBookingInput = NewBookingInput & { kind: 'private'; extras: string[]; pickup: string };

export const NOTES_MAX = 500;

/** Shown to the customer when the server rejects a booking. Redirects carry only these codes. */
export const BOOKING_ERRORS = {
	quote: 'This tour is booked on request. Please contact us.',
	guests: `Choose up to ${MAX_GUESTS} persons in total (infants included), with at least one adult.`,
	date: 'Choose a date for your tour.',
	past: `Booking for that departure has closed. ${BOOKING_CUTOFF_NOTE} Please choose another date or time.`,
	season: `Tours run ${seasonLabel()}. Please choose a date in the season.`,
	horizon: 'That date is too far ahead to book online yet. Please choose an earlier date, or contact us.',
	full: 'There aren\'t enough seats left on that departure. Please choose another time or date, or contact us and we will try to find you a place.',
	boat: 'Our private boats are all booked on that date. Please choose another date, or send us a request and we will check what we can offer.',
	slot: 'Choose one of the departure times.',
	name: 'Enter your first and last name.',
	email: 'Enter a valid email address.',
	phone: 'Enter a phone number with digits only (+ and spaces are fine).',
	notes: `Keep notes to ${NOTES_MAX} characters.`,
	private: 'This tour can\'t be booked as a private experience online. Please send us a request instead.',
	extras: 'Choose extras from the list.',
	pickup: 'Choose a pick-up point from the list, or send us a request for another place.',
	'session-expired': 'Your booking session expired, or was for another tour. Please fill in your details again.',
	'terms-changed': 'Our terms changed while you were booking. Please review them and confirm again.',
	'draft-changed': 'Your booking changed in another tab or window. Please check the details below and confirm again.',
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
	if (!withinHorizon(input.date, businessDate(now))) return 'horizon';
	// A tour with fixed departures needs one of them; one with none takes no time (D-16).
	const slot = input.slot ?? '';
	if (tour.departures.length === 0 ? slot !== '' : !tour.departures.some((d) => d.time === slot)) return 'slot';
	// Today's departure may already be closed (cut-off before it leaves): the date alone isn't enough.
	if (bookingClosed(input.date, slot, now)) return 'past';
	if (!input.firstName || !input.lastName) return 'name';
	if (!input.email || !EMAIL_RE.test(input.email)) return 'email';
	// Optional, but a number the crew can call when given.
	if (input.phone && !PHONE_RE.test(input.phone.trim())) return 'phone';
	if ((input.notes ?? '').length > NOTES_MAX) return 'notes';
	return null;
}

/**
 * The private experience's rules (plan P), checked on the server: the tour is
 * sold privately, the date is open, the time is one the boat can leave at
 * (never a time the client made up), the cut-off hasn't passed for it, and
 * every extra and the pick-up are on the lists. 'other' pick-ups are refused
 * here: they go to /api/charter-request as a request. `lists` is for tests
 * only (fixtures); the site always checks against the config.
 */
export function validatePrivateBookingInput(
	tour: TourDetail,
	input: PrivateBookingInput,
	now: Date = new Date(),
	lists: PrivateLists = PRIVATE_LISTS,
): BookingError | null {
	const config = privateTour(tour.slug, lists);
	// supportsPrivateBook, against `lists`.
	if (!config || !tour.types.includes('private') || tour.departures.length === 0) return 'private';
	const adults = input.adults ?? 0;
	if (adults < 1 || seatCount({ adults, children: input.children, infants: input.infants ?? 0 }) > MAX_GUESTS) return 'guests';
	if (!input.date || !parseIsoDate(input.date)) return 'date';
	if (input.date < businessDate(now)) return 'past';
	if (!isInSeason(input.date)) return 'season';
	if (!withinHorizon(input.date, businessDate(now))) return 'horizon';
	const slot = input.slot ?? '';
	if (!privateDepartureTimes(tour.departures[0].time, config.latestDeparture).includes(slot)) return 'slot';
	if (bookingClosed(input.date, slot, now)) return 'past';
	const known = new Set(lists.extras.map((extra) => extra.id));
	if (input.extras.length > known.size || new Set(input.extras).size !== input.extras.length || !input.extras.every((id) => known.has(id))) return 'extras';
	if (!privatePickup(input.pickup, lists)) return 'pickup';
	if (!input.firstName || !input.lastName) return 'name';
	if (!input.email || !EMAIL_RE.test(input.email)) return 'email';
	// Optional, but a number the crew can call when given.
	if (input.phone && !PHONE_RE.test(input.phone.trim())) return 'phone';
	if ((input.notes ?? '').length > NOTES_MAX) return 'notes';
	return null;
}

export type CreateResult = { ok: true; booking: Booking } | { ok: false; error: BookingError };

/**
 * Validates, recomputes the price from the tour's data for the booking date's
 * season, and stores an unpaid booking with the terms version the server
 * knows (S-4). A departure without the seats left is refused ('full', see
 * capacity.ts); seats are not held until payment, which checks again.
 */
export async function createPendingBooking(
	tour: TourDetail,
	input: NewBookingInput,
	now: Date = new Date(),
	/** Private only, and for tests only (fixtures): the lists to sell from. */
	lists: PrivateLists = PRIVATE_LISTS,
): Promise<CreateResult> {
	if (input.kind === 'private') return createPendingPrivateBooking(tour, { ...input, kind: 'private', extras: input.extras ?? [], pickup: input.pickup ?? '' }, now, lists);
	const error = validateBookingInput(tour, input, now);
	if (error) return { ok: false, error };
	const adults = input.adults ?? 0;
	const children = input.children;
	const infants = input.infants ?? 0;
	const full = await capacityError({ kind: 'group', tourSlug: tour.slug, date: input.date as string, slot: input.slot ?? '', adults, children, infants }, now);
	if (full) return { ok: false, error: full };

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
	await saveNewBooking(booking);
	return { ok: true, booking };
}

/**
 * A private experience paid on the site: the whole boat for the tour's own
 * length, priced on the server from src/config/private.ts for the date's
 * season. The terms were accepted on the review page (S-4), so the pay page
 * doesn't ask again. Unlike a quote it has no request and no expiry.
 */
async function createPendingPrivateBooking(tour: TourDetail, input: PrivateBookingInput, now: Date, lists: PrivateLists): Promise<CreateResult> {
	const error = validatePrivateBookingInput(tour, input, now, lists);
	if (error) return { ok: false, error };
	const date = input.date as string;
	// The day's private boat(s) already sold: refused here, so the guest asks for a quote instead (capacity.ts).
	const taken = await capacityError({ kind: 'private', tourSlug: tour.slug, date, slot: input.slot ?? '', adults: input.adults ?? 0, children: input.children, infants: input.infants ?? 0 }, now);
	if (taken) return { ok: false, error: taken };
	const lineItems = privateLineItems(tour.slug, date, input.extras, input.pickup, lists);
	if (!lineItems) return { ok: false, error: 'private' };
	const pickup = input.pickup !== DEFAULT_PICKUP_ID ? privatePickup(input.pickup, lists)?.label : undefined;

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
		kind: 'private',
		durationHours: tour.durationHours,
		tourSlug: tour.slug,
		tourTitle: `Private experience: ${tour.title}`,
		date,
		slot: input.slot as string,
		adults: input.adults ?? 0,
		children: input.children,
		infants: input.infants ?? 0,
		total: lineItemsTotal(lineItems),
		lineItems,
		...(pickup ? { pickup } : {}),
		termsVersion: TERMS_VERSION,
		termsAcceptedAt: at,
		firstName: input.firstName as string,
		lastName: input.lastName as string,
		email: asciiEmail(input.email as string),
		phone: input.phone ?? '',
		customerNotes: input.notes ?? '',
		invoice: null,
		staffNotes: [],
		history: [{ at, by: 'customer', action: 'Private experience booked, waiting for payment' }],
	};
	await saveNewBooking(booking);
	return { ok: true, booking };
}

/**
 * Stores a new booking, and its ref in the ref index (store.ts bookingRefs).
 * The index only decides which daily count a contact message quoting the ref
 * uses (notifyCapKind), so a failure there is logged, never thrown.
 */
async function saveNewBooking(booking: Booking): Promise<void> {
	await bookings().put(booking);
	await bookingRefs()
		.put({ id: booking.ref, bookingId: booking.id })
		.catch((err) => console.error(`[booking ${booking.id}] ref not indexed`, err));
}

/** The booking `ref` (HBC-7K3QXM) names, if it exists: one read of the ref index, one of the booking. */
async function bookingByRef(ref: string | undefined): Promise<Booking | null> {
	if (!ref || !/^HBC-[A-Z0-9]{6}$/.test(ref)) return null;
	const entry = await bookingRefs().get(ref);
	return entry ? bookings().get(entry.bookingId) : null;
}

/**
 * Whether the pay page must ask for the terms: only a charter quote, which has
 * no review step. Group bookings and private experiences booked on the site
 * accepted them on the review page (termsAcceptedAt is set).
 */
export function termsDueOnPayment(booking: Pick<Booking, 'kind' | 'termsAcceptedAt'>): boolean {
	return booking.kind === 'private' && !booking.termsAcceptedAt;
}

/**
 * A charter quote that will never be paid: replaced by a newer quote, withdrawn,
 * or expired. The admin's lists and the day's boats leave these out.
 */
export function isDeadQuote(booking: Booking, now: Date = new Date()): boolean {
	return booking.kind === 'private' && isCharterQuote(booking) && neverPaid(booking) && (booking.status === 'cancelled' || quoteExpired(booking, now));
}

/**
 * Whether the customer may start paying for this booking now: still waiting
 * for payment, booking for its departure hasn't closed yet (the same cut-off
 * as a new booking) and, for a charter quote, the quote is still valid.
 */
export function isPayable(booking: Booking, now: Date = new Date()): boolean {
	return awaitingPayment(booking) && !bookingClosed(booking.date, booking.slot, now) && !quoteExpired(booking, now);
}

/**
 * The real račun series' counter. Only the fiscalization service (Phase 3) may
 * take numbers from it: Croatian invoice numbers must run without gaps, so a
 * demo payment must never use one up.
 */
export const INVOICE_COUNTER = 'invoice';
/** The demo's own series, numbered DEMO-1/HBC1/1, DEMO-2/HBC1/1 and so on. */
export const DEMO_INVOICE_COUNTER = 'demo-invoice';

/**
 * Stand-in for the fiscalization service (Phase 3): same shape, clearly fake
 * values, and its own DEMO- series, so the real invoice counter stays untouched.
 */
export async function issueDemoInvoice(now: Date): Promise<DemoInvoice> {
	return {
		number: `DEMO-${await nextCounterValue(DEMO_INVOICE_COUNTER)}/HBC1/1`,
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
 *
 * Before the booking is marked paid, the payment claims its seats (or the
 * day's private boat) in the capacity ledger, atomically against other
 * payments (capacity.ts). If they had just been sold, the payment still
 * stands, and the booking is flagged overbookedAtPayment for staff.
 */
export async function finalizePaidBooking(
	id: string,
	provider: PaymentProvider,
	paymentRef: string,
	siteOrigin: string,
	now: Date = new Date(),
): Promise<Booking | null> {
	const at = now.toISOString();
	const before = await bookings().get(id);
	if (!before) return null;
	let claim: CapacityClaimResult | null = null;
	// The money is taken by now: if the check itself fails, the payment is still recorded, with a note for staff.
	let unchecked = false;
	// Demo data, and a demo payment on production, hold no seats (heldOutOfCapacity): nothing to claim.
	const counted = !heldOutOfCapacity({ ...before, paymentStatus: 'paid', paymentProvider: provider, paymentRef, paidAt: at, paymentGate: PAYMENT_GATE });
	if (awaitingPayment(before) && counted) {
		try {
			claim = await claimCapacity(before, now);
		} catch (err) {
			unchecked = capacityChecked(before);
			console.error(`[booking ${id}] capacity not checked at payment`, err);
		}
	}
	const over = claim?.over && capacityChecked(before) ? claim : null;
	let paid: UpdateResult<Booking>;
	try {
		paid = await bookings().update(id, (booking) => {
			// Not isPayable: a charge that started before departure and succeeds after it
			// (a provider's webhook) must still be recorded. The pay page gates the start.
			if (!awaitingPayment(booking)) return null;
			// A charter quote's terms are accepted on the pay page (it has no review step), so they're recorded with the
			// payment. A private experience booked on the site accepted them on its review page, like a group booking.
			if (booking.kind === 'private' && !booking.termsAcceptedAt) {
				booking.termsVersion = TERMS_VERSION;
				booking.termsAcceptedAt = at;
			}
			booking.paymentStatus = 'paid';
			booking.status = 'confirmed';
			booking.paymentProvider = provider;
			booking.paymentRef = paymentRef;
			booking.paidAt = at;
			// Recorded by the gated code: a paid booking without it came through an outdated deploy (GATE_CUTOVER).
			booking.paymentGate = PAYMENT_GATE;
			booking.updatedAt = at;
			booking.history.push({ at, by: providerName(provider), action: `Paid ${formatEuro(booking.total)}` });
			if (over) {
				const what = over.unit === 'boats' ? `${over.takenBefore} of ${over.capacity} private boats` : `${over.takenBefore} of ${over.capacity} seats`;
				booking.overbookedAtPayment = at;
				booking.history.push({ at, by: 'System', action: `Paid when ${what} were already taken: over capacity, needs staff` });
				booking.staffNotes.push({ at, by: 'System', text: `Over capacity at payment (${what} already taken). Move the guest or refund them.` });
			} else if (unchecked) {
				booking.staffNotes.push({ at, by: 'System', text: 'Seats could not be checked at payment (storage error). Check the departure is not overbooked.' });
			}
			return booking;
		});
	} catch (err) {
		// Not recorded: the claim mustn't hold the seats of a booking that isn't paid.
		if (claim) await releaseCapacity(before, { inFlightOnly: true }).catch((releaseErr) => console.error(`[booking ${id}] capacity claim not released`, releaseErr));
		throw err;
	}
	// Not paid by this call: take back its claim, unless the booking is paid anyway (a double click whose twin won).
	if (claim && paid.record?.paymentStatus !== 'paid') {
		await releaseCapacity(before, { inFlightOnly: true }).catch((err) => console.error(`[booking ${id}] capacity claim not released`, err));
	} else if (paid.record && takesSeats(paid.record)) {
		// Paid: its seats are taken for good. If this fails, capacity.ts finds the expired claim's booking paid and still counts it.
		await holdCapacity(paid.record, now, claim?.ledger).catch((err) => console.error(`[booking ${id}] capacity claim not marked paid`, err));
	}
	if (!paid.written || !paid.record) return paid.record;

	/*
	 * The booking is paid from here on. The invoice and the emails come after,
	 * and a failure in either is logged, not thrown: the guest still lands on
	 * the success page, and the admin detail shows the booking without an
	 * invoice or with an unsent email.
	 */
	let booking: Booking = paid.record;
	try {
		const invoice = await issueDemoInvoice(now);
		const { record } = await bookings().update(id, (b) => {
			b.invoice = invoice;
			b.history.push({ at, by: 'System', action: `Invoice ${invoice.number} issued` });
			return b;
		});
		booking = record ?? { ...booking, invoice };
	} catch (err) {
		console.error(`[booking ${id}] invoice not issued after payment`, err);
	}
	const emails: [string, () => EmailMessage][] = [
		['confirmation', () => bookingConfirmationEmail(booking, siteOrigin)],
		['admin', () => adminBookingEmail(booking, adminEmail(), `${siteOrigin}/admin/bookings/${booking.id}/`)],
	];
	for (const [name, message] of emails) {
		try {
			await sendBookingEmail(booking.id, message(), at);
		} catch (err) {
			console.error(`[booking ${id}] ${name} email failed after payment`, err);
		}
	}
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

/**
 * Records, once per booking, that a guest reached the pay page while online
 * payment isn't open to them (src/pages/booking/pay.astro): the booking is
 * then "waiting for confirmation" in the admin (waitingForConfirmation) until
 * staff confirm it with "Confirm, pay offline" or cancel it. The booking
 * stays awaiting payment. Only the request whose write records it goes on,
 * so a reload or a second tab does nothing more.
 *
 * The admin isn't emailed per booking (a flood of bookings could silence the
 * emails for the day, review S1): the recording request marks the digest
 * due and asks for it (sendWaitingDigest), which goes out at most once per
 * hour; if this hour's has gone, the hourly scheduled function
 * (netlify/functions/hourly.mts) sends the next. Returns whether a digest
 * email was created.
 */
export async function notifyPaymentNotOpen(id: string, siteOrigin: string, now: Date = new Date()): Promise<boolean> {
	const at = now.toISOString();
	const { record, written } = await bookings().update(id, (booking) => {
		if (booking.paymentNotOpenNotifiedAt || !awaitingPayment(booking)) return null;
		booking.paymentNotOpenNotifiedAt = at;
		booking.updatedAt = at;
		booking.history.push({ at, by: 'System', action: 'Online payment not open yet: confirm with the guest by email' });
		return booking;
	});
	if (!written || !record) return false;
	await markWaitingDigestDue(now);
	return sendWaitingDigest(siteOrigin, now);
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
	| { type: 'resend'; siteOrigin: string }
	/**
	 * Staff confirm a booking the guest couldn't pay online (review B1): it
	 * takes its seats, the guest gets the confirmation email saying our team
	 * will contact them about payment, and nothing is charged or invoiced.
	 */
	| { type: 'confirm_offline'; siteOrigin: string };

/** Statuses that only make sense for a booking that was paid, or confirmed by staff to be paid offline. */
const PAID_ONLY_STATUSES: BookingStatus[] = ['confirmed', 'completed', 'no_show'];

/**
 * Paid online, or confirmed by staff with the payment arranged offline: a
 * booking that stands. Only an online payment can be marked refunded.
 */
export function bookingSettled(booking: Pick<Booking, 'paymentStatus'>): boolean {
	return booking.paymentStatus === 'paid' || booking.paymentStatus === 'offline';
}

/**
 * Whether staff may confirm this booking with the payment arranged offline:
 * still awaiting payment, and its departure hasn't left. A charter quote past
 * its "valid until" may still be confirmed: staff made it.
 */
export function canConfirmOffline(booking: Booking, now: Date = new Date()): boolean {
	return awaitingPayment(booking) && !departureHasLeft(booking.date, booking.slot, now);
}

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
	let heldBefore = false;
	// Confirming without payment: is the departure (or the day's private boat) already full? Kept and flagged if so, as when reinstating.
	let full: CapacityError | null = null;
	if (action.type === 'confirm_offline') {
		const current = await bookings().get(id);
		if (current && canConfirmOffline(current, now) && capacityChecked(current)) {
			full = await capacityError(current, now, current.id).catch((err) => {
				console.error(`[booking ${id}] capacity not checked when confirming offline`, err);
				return null;
			});
		}
	}
	const { record, written } = await bookings().update(id, (booking) => {
		heldBefore = takesSeats(booking);
		const paid = booking.paymentStatus === 'paid';
		const settled = bookingSettled(booking);
		switch (action.type) {
			case 'status':
				if (booking.status === action.status) return null;
				if (PAID_ONLY_STATUSES.includes(action.status) && !settled) return null;
				booking.history.push({ at, by, action: `Status: ${STATUS_LABELS[booking.status]} → ${STATUS_LABELS[action.status]}` });
				// Reinstated: it takes its seats now, so it counts as the latest one in when checking for overbooking.
				if (booking.status === 'cancelled') booking.seatsSince = at;
				booking.status = action.status;
				break;
			case 'refund':
				if (!paid) return null;
				booking.paymentStatus = 'refunded';
				booking.history.push({ at, by, action: `Marked ${formatEuro(booking.total)} as refunded (demo, no money moved)` });
				break;
			case 'note': {
				const text = action.text.trim().slice(0, 1000);
				if (!text) return null;
				booking.staffNotes.push({ at, by, text });
				break;
			}
			case 'resend': {
				if (!settled) return null;
				// Double clicks and repeated form posts send once: the compare-and-swap lets only one request
				// record the resend, and another within a minute of the last confirmation is ignored.
				const last = booking.confirmationEmail ? Date.parse(booking.confirmationEmail.at) : Number.NaN;
				if (now.getTime() - last < RESEND_COOLDOWN_MS) return null;
				booking.confirmationEmail = { delivery: 'outbox', at };
				booking.history.push({ at, by, action: `Confirmation email created again for ${booking.email}` });
				break;
			}
			case 'confirm_offline': {
				if (!canConfirmOffline(booking, now)) return null;
				booking.paymentStatus = 'offline';
				booking.status = 'confirmed';
				// It takes its seats from now: the latest one in when checking for overbooking (manifest.ts), as when reinstating.
				booking.seatsSince = at;
				booking.history.push({ at, by, action: 'Confirmed without online payment: payment arranged with staff, nothing charged' });
				if (booking.kind === 'private' && !booking.termsAcceptedAt) {
					booking.history.push({ at, by: 'System', action: 'Terms not accepted on the website: they are stated in the confirmation email' });
				}
				if (full) {
					const what = full === 'boat' ? "the day's private boats were already taken" : 'the departure was already full';
					booking.staffNotes.push({ at, by: 'System', text: `Confirmed when ${what}: over capacity. Move the guest or contact them.` });
				}
				break;
			}
		}
		booking.updatedAt = at;
		return booking;
	});
	if (written && record) await syncCapacity(record, heldBefore, now);
	if (written && record && action.type === 'resend') await sendBookingEmail(record.id, bookingConfirmationEmail(record, action.siteOrigin), at);
	if (written && record && action.type === 'confirm_offline') {
		// The booking stands even if the email fails: its admin page shows no confirmation sent, and "Resend" tries again.
		await sendBookingEmail(record.id, bookingConfirmationEmail(record, action.siteOrigin), at).catch((err) =>
			console.error(`[booking ${id}] confirmation email failed after confirming offline`, err),
		);
	}
	return { record, written };
}

/**
 * Keeps the capacity ledger in step with a staff change: cancelling or
 * refunding a paid booking frees its seats, reinstating it takes them again
 * (even past capacity: staff chose to, and the admin then shows the
 * departure overbooked). A ledger failure is logged and noted on the booking,
 * never undoes the change.
 */
async function syncCapacity(booking: Booking, heldBefore: boolean, now: Date): Promise<void> {
	const heldNow = takesSeats(booking);
	if (heldNow === heldBefore) return;
	try {
		await (heldNow ? holdCapacity(booking, now) : releaseCapacity(booking));
	} catch (err) {
		console.error(`[booking ${booking.id}] capacity ledger not updated after a staff change`, err);
		const at = now.toISOString();
		const text = heldNow
			? 'Seats could not be counted after confirming or reinstating (storage error). Check the departure is not overbooked.'
			: 'Seats could not be freed after cancelling or refunding (storage error). The departure may show fewer seats left than it has.';
		await bookings()
			.update(booking.id, (current) => ({ ...current, staffNotes: [...current.staffNotes, { at, by: 'System', text }] }))
			.catch(() => undefined);
	}
}

/**
 * Admin notification emails per kind of message per UTC day (S-6, S5). Past
 * it, messages are stored and shown in the admin, but not emailed: a flood
 * can't burn the Resend quota. Each kind counts on its own, so a flood of
 * contact messages can't silence charter requests or messages about an
 * existing booking. Booking emails aren't capped.
 */
export const ADMIN_NOTIFY_DAILY_CAP = 40;

/** Messages about one booking that use the booking count per UTC day; more go to the contact count (review S2). */
export const ADMIN_NOTIFY_PER_REF_DAILY_CAP = 3;

/** Email addresses compared the way people type them: trimmed, any case. */
function sameEmail(a: string | undefined, b: string | undefined): boolean {
	return Boolean(a && b) && (a as string).trim().toLowerCase() === (b as string).trim().toLowerCase();
}

/**
 * Which daily notification count a message uses: charter, about a booking,
 * or contact. "About a booking" needs a ref that names a real booking, sent
 * from that booking's email address: the topic, the ref and the address are
 * typed by the sender, and a ref alone is easy to come by (anyone's own
 * booking), so a flood quoting it would otherwise use up the booking count.
 */
export async function notifyCapKind(input: Pick<Enquiry, 'kind' | 'topic' | 'bookingRef' | 'email'>): Promise<'charter' | 'booking' | 'contact'> {
	if (input.kind === 'charter') return 'charter';
	try {
		const booking = await bookingByRef(input.bookingRef);
		return booking && sameEmail(booking.email, input.email) ? 'booking' : 'contact';
	} catch (err) {
		console.error('[enquiry] booking ref not checked', err);
		return 'contact';
	}
}

/**
 * Stores a contact or charter message and, within the day's cap for its kind,
 * emails the admin. `notify: false` stores it without emailing (and without
 * counting): the contact form past its hourly cap on everyone together.
 */
export async function recordEnquiry(
	input: Omit<Enquiry, 'id' | 'createdAt' | 'status' | 'notified'>,
	siteOrigin: string,
	now: Date = new Date(),
	{ notify = true }: { notify?: boolean } = {},
): Promise<Enquiry> {
	let notified = false;
	if (notify) {
		const day = now.toISOString().slice(0, 10);
		let kind = await notifyCapKind(input);
		// One booking's own messages use the booking count a few times a day; past that they count as contact messages.
		if (kind === 'booking' && (await nextCounterValue(`admin-notify:booking-ref:${input.bookingRef}:${day}`)) > ADMIN_NOTIFY_PER_REF_DAILY_CAP) kind = 'contact';
		const sentToday = await nextCounterValue(`admin-notify:${kind}:${day}`);
		notified = sentToday <= ADMIN_NOTIFY_DAILY_CAP;
	}
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
	if (previous && (bookingSettled(previous) || previous.paymentStatus === 'refunded')) return { ok: false, error: 'paid' };

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
		// The tour the request was filed under, when it's one of the route's (Blue Lagoon afternoon, not morning).
		tourSlug: route ? charterTourSlug(route, enquiry.tourSlug) : enquiry.tourSlug,
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
		// Asked for from a private experience booking: where to pick them up, and the extras they wanted.
		...(request.pickup ? { pickup: request.pickup } : {}),
		staffNotes: [
			...(quote.note ? [{ at, by, text: `Note sent with the quote: ${quote.note}` }] : []),
			...(request.extras?.length
				? [{ at, by: 'System', text: `Extras asked for: ${request.extras.map((id) => privateExtra(id)?.label ?? id).join(', ')}` }]
				: []),
		],
		history: [{ at, by, action: `Quote sent: ${formatEuro(quote.price)}, valid ${quote.validDays} day${quote.validDays === 1 ? '' : 's'}` }],
		...(enquiry.sample ? { sample: true } : {}),
	};

	// 1. Withdraw the old link first, and stop if the customer paid it meanwhile: they must never be able to pay twice.
	if (previous) {
		let paidMeanwhile = false;
		await bookings().update(previous.id, (old) => {
			if (bookingSettled(old) || old.paymentStatus === 'refunded') {
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
	await saveNewBooking(booking);
	const claimed = await enquiries().update(enquiry.id, (current) =>
		(current.quoteBookingId ?? '') === previousQuoteId ? { ...current, quoteBookingId: booking.id, status: 'replied' } : null,
	);
	if (!claimed.written) {
		await bookings().delete(booking.id);
		await bookingRefs().delete(booking.ref);
		return { ok: false, error: 'stale' };
	}
	// The pay link uses this deploy's address, not the public site's: each deploy keeps its own bookings.
	const payUrl = `${siteOrigin}/booking/pay/?id=${booking.id}`;
	await sendBookingEmail(booking.id, charterQuoteEmail(booking, quote.note, payUrl, siteOrigin, Boolean(previous)), at);
	return { ok: true, booking: (await bookings().get(booking.id)) ?? booking };
}

/** Seats counted against a departure: paid, not cancelled, and not held out of capacity (capacity.ts). */
export { takesSeats };

export { RETENTION_DAYS, sweepPersonalData, sweepPersonalDataDaily } from './retention';
export { quoteExpired, sendWaitingDigest, waitingForConfirmation, WAITING_DIGEST_DAILY_CAP } from './waiting';
