import type { APIRoute } from 'astro';
import { TERMS_VERSION } from '../../../config/legal';
import { createPendingBooking, type BookingError } from '../../../lib/bookings/service';
import { bookings } from '../../../lib/bookings/store';
import { BOOKING_COOKIE, bookingCookieOptions, openDraft, sealDraft } from '../../../lib/bookings/session';
import { getTourBySlug } from '../../../lib/tours';
import { checkGlobalLimit, checkRateLimit, clientIp } from '../../../lib/rate-limit';
import { readFormOrJson } from '../../../lib/request-body';

export const prerender = false;

/**
 * The review page's "Continue to payment" form posts here (spec §8.1.6). The
 * booking details come from the sealed cookie, never from the form; the form
 * only confirms the terms version the customer saw, and which draft the
 * review page showed (`draftAt`, its createdAt). Stores an unpaid booking
 * and sends the customer to the payment page with its opaque id. Every
 * redirect carries an id or an error code, never personal data (S-2).
 */
function see(location: string) {
	return new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } });
}

export const POST: APIRoute = async ({ request, cookies, url }) => {
	const body = await readFormOrJson(request);
	if (!body.ok && body.status === 415) return new Response('Send a form', { status: 415 });

	const draft = openDraft(cookies.get(BOOKING_COOKIE)?.value);
	const tour = draft ? getTourBySlug(draft.tourSlug) : undefined;
	if (!draft || !tour) return see('/tours/');
	const flow = draft.kind === 'private' ? 'flow=private&' : '';
	const review = (code: BookingError) => see(`/book/${tour.slug}/review/?${flow}error=${code}`);
	if (!body.ok) return review('server');

	// The draft the customer reviewed, not one another tab has written since (e.g. a group booking
	// started after a private one): a mismatch shows them the review of what the cookie holds now.
	if (String(body.fields.draftAt ?? '') !== String(draft.createdAt)) return review('draft-changed');

	// A second submit (double click, back button) goes to the booking already made.
	if (draft.bookingId) {
		const existing = await bookings().get(draft.bookingId);
		if (existing?.status === 'pending_payment') return see(`/booking/pay/?id=${existing.id}`);
		if (existing?.paymentStatus === 'paid') return see(`/booking/success/?id=${existing.id}`);
	}

	// Fails closed (S-11): a booking endpoint never runs without its limit.
	if (!(await checkRateLimit('booking', clientIp(request), { max: 20, failClosed: true })).ok) return review('busy');
	// And a cap on everyone together, so many IPs can't flood the store with unpaid
	// bookings. Set far above real traffic so a handful of IPs can't use it to lock
	// customers out; when it trips, the log says so.
	if (!(await checkGlobalLimit('booking', { max: 1000, failClosed: true })).ok) {
		console.error('[bookings] global booking cap reached: refusing new bookings for up to 10 minutes');
		return review('busy');
	}

	// The customer confirmed the terms they were shown; if those changed since, they see them again (S-4).
	if (String(body.fields.termsVersion ?? '') !== TERMS_VERSION) return review('terms-changed');

	try {
		const result = await createPendingBooking(tour, {
			date: draft.date,
			slot: draft.slot,
			adults: draft.adults,
			children: draft.children,
			infants: draft.infants,
			firstName: draft.firstName,
			lastName: draft.lastName,
			email: draft.email,
			phone: draft.phone,
			notes: draft.notes,
			...(draft.kind === 'private' ? { kind: 'private' as const, extras: draft.extras ?? [], pickup: draft.pickup ?? '' } : {}),
		});
		if (!result.ok) return review(result.error);
		const sealed = sealDraft({ ...draft, bookingId: result.booking.id });
		if (sealed) cookies.set(BOOKING_COOKIE, sealed, bookingCookieOptions(url));
		return see(`/booking/pay/?id=${result.booking.id}`);
	} catch (error) {
		console.error('[bookings] could not create booking', error);
		return review('server');
	}
};
