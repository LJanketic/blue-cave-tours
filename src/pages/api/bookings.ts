import type { APIRoute } from 'astro';
import { bookingReviewPath, parseGroupBookingParams } from '../../lib/booking';
import { createPendingBooking } from '../../lib/bookings/service';
import { getTourBySlug } from '../../lib/tours';
import { checkRateLimit } from '../../lib/rate-limit';

export const prerender = false;

/**
 * The review page's "Continue to payment" form posts here. Stores an unpaid
 * booking and sends the customer to the payment page, which only ever sees
 * the booking id, never the customer's details.
 */
export const POST: APIRoute = async ({ request, redirect }) => {
	const ip = request.headers.get('x-nf-client-connection-ip') ?? 'unknown';
	// Generous enough for a family or an office sharing one connection.
	if (!(await checkRateLimit(`booking:${ip}`, 20)).ok) {
		return new Response('Too many bookings from this connection. Please wait a few minutes.', { status: 429 });
	}

	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return redirect('/tours/', 303);
	}

	const tour = getTourBySlug(String(form.get('tourId') ?? ''));
	if (!tour) return redirect('/tours/', 303);

	const params = new URLSearchParams();
	for (const [key, value] of form) if (typeof value === 'string') params.set(key, value);
	const details = parseGroupBookingParams(params);

	try {
		const result = await createPendingBooking(tour, details);
		// Back to the review page with what they entered and why it was refused.
		if (!result.ok) {
			const back: Record<string, string> = Object.fromEntries(params);
			return redirect(bookingReviewPath(tour.slug, { ...back, error: result.error }), 303);
		}
		return redirect(`/booking/pay/?id=${result.booking.id}`, 303);
	} catch (error) {
		console.error('[bookings] could not create booking', error);
		return redirect(`/booking/error/?tourId=${encodeURIComponent(tour.slug)}`, 303);
	}
};
