import type { APIRoute } from 'astro';
import { parseGroupBookingParams } from '../../../lib/booking';
import { BOOKING_ERRORS, validateBookingInput, type BookingError } from '../../../lib/bookings/service';
import { BOOKING_COOKIE, bookingCookieOptions, openDraft, sealDraft, type BookingDraft } from '../../../lib/bookings/session';
import { getTourBySlug } from '../../../lib/tours';
import { checkRateLimit, clientIp } from '../../../lib/rate-limit';
import { readFormOrJson } from '../../../lib/request-body';
import { jsonResponse } from '../../../lib/json-response';

export const prerender = false;

/**
 * Step 2 of the group booking (spec §8.1.6). Checks the details and keeps
 * them in the sealed `hbc_booking` cookie, then sends the visitor to the
 * review page. Nothing personal goes in a URL: failures redirect with a code.
 *
 * Replies as asked: JSON for the page script ({redirect} or {errors}), a 303
 * for a plain form post.
 */

/** Which form field each error belongs to, for the page script. */
const ERROR_FIELDS: Partial<Record<BookingError, string>> = {
	guests: 'adults',
	date: 'date',
	past: 'date',
	season: 'date',
	slot: 'slot',
	name: 'firstName',
	email: 'email',
	notes: 'notes',
};

function fail(asForm: boolean, slug: string | null, code: BookingError, status: number) {
	if (!asForm) {
		const field = ERROR_FIELDS[code];
		return jsonResponse({ error: BOOKING_ERRORS[code], code, errors: field ? { [field]: BOOKING_ERRORS[code] } : {} }, status);
	}
	const step2 = slug ? `/book/${encodeURIComponent(slug)}/group/` : '/tours/';
	return new Response(null, { status: 303, headers: { Location: `${step2}?error=${code}` } });
}

export const POST: APIRoute = async ({ request, cookies, url }) => {
	const body = await readFormOrJson(request);
	if (!body.ok) {
		if (body.status === 415) return jsonResponse({ error: 'Send JSON or a form' }, 415);
		return fail(body.asForm, null, 'server', body.status);
	}
	const fields = body.fields;
	const tour = getTourBySlug(String(fields.tourId ?? fields.tourSlug ?? ''));
	if (!tour) return fail(body.asForm, null, 'session-expired', 400);

	// Fails closed (S-11): a booking endpoint never runs without its limit. No cap
	// on everyone together here: a draft is only a sealed cookie and stores
	// nothing, and a shared cap would let a few IPs lock every customer out.
	if (!(await checkRateLimit('draft', clientIp(request), { max: 30, failClosed: true })).ok) return fail(body.asForm, tour.slug, 'busy', 429);

	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(fields)) if (typeof value === 'string' || typeof value === 'number') params.set(key, String(value));
	const details = parseGroupBookingParams(params);
	// Notes longer than the cap are refused rather than cut (the parser clips at 500).
	const rawNotes = typeof fields.notes === 'string' ? fields.notes.trim() : '';
	const error = validateBookingInput(tour, { ...details, notes: rawNotes || null });
	if (error) return fail(body.asForm, tour.slug, error, 400);

	const draft: BookingDraft = {
		v: 1,
		tourSlug: tour.slug,
		date: details.date as string,
		slot: details.slot ?? '',
		adults: details.adults as number,
		children: details.children,
		infants: details.infants,
		firstName: details.firstName as string,
		lastName: details.lastName as string,
		email: details.email as string,
		phone: details.phone ?? '',
		notes: rawNotes,
		createdAt: Date.now(),
	};
	const sealed = sealDraft(draft);
	if (!sealed) return fail(body.asForm, tour.slug, 'server', 503);
	cookies.set(BOOKING_COOKIE, sealed, bookingCookieOptions(url));

	const next = `/book/${tour.slug}/review/`;
	return body.asForm ? new Response(null, { status: 303, headers: { Location: next } }) : jsonResponse({ redirect: next });
};

/** The draft for this browser, to prefill step 2 when coming back to edit (WCAG 3.3.7). */
export const GET: APIRoute = async ({ cookies }) => {
	const draft = openDraft(cookies.get(BOOKING_COOKIE)?.value);
	const headers = { 'Cache-Control': 'no-store' };
	if (!draft) return new Response(null, { status: 204, headers });
	const { v: _v, createdAt: _createdAt, bookingId: _bookingId, ...fields } = draft;
	return new Response(JSON.stringify(fields), { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });
};
