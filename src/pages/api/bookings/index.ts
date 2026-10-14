import type { APIRoute } from 'astro';
import { TERMS_VERSION } from '../../../config/legal';
import { createPendingBooking, type BookingError } from '../../../lib/bookings/service';
import { bookings } from '../../../lib/bookings/store';
import { BOOKING_COOKIE, bookingCookieOptions, openDraft, sealDraft } from '../../../lib/bookings/session';
import { getTourBySlug } from '../../../lib/tours';
import { checkRateLimit, clientIp } from '../../../lib/rate-limit';
import { readFormOrJson } from '../../../lib/request-body';

export const prerender = false;

/**
 * The review page's "Continue to payment" form posts here (spec §8.1.6). The
 * booking details come from the sealed cookie, never from the form; the form
 * only confirms the terms version the customer saw. Stores an unpaid booking
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
	const review = (code: BookingError) => see(`/book/${tour.slug}/review/?error=${code}`);
	if (!body.ok) return review('server');

	// A second submit (double click, back button) goes to the booking already made.
	if (draft.bookingId) {
		const existing = await bookings().get(draft.bookingId);
		if (existing?.status === 'pending_payment') return see(`/booking/pay/?id=${existing.id}`);
		if (existing?.paymentStatus === 'paid') return see(`/booking/success/?id=${existing.id}`);
	}

	// Fails closed (S-11): a booking endpoint never runs without its limit.
	if (!(await checkRateLimit('booking', clientIp(request), { max: 20, failClosed: true })).ok) return review('busy');

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
