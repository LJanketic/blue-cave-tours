import type { APIRoute, AstroCookies } from 'astro';
import type { TourDetail } from '../../../types/tour';
import { parseGroupBookingParams } from '../../../lib/booking';
import { BOOKING_ERRORS, validateBookingInput, validatePrivateBookingInput, type BookingError } from '../../../lib/bookings/service';
import { BOOKING_COOKIE, bookingCookieOptions, openDraft, sealDraft, type BookingDraft } from '../../../lib/bookings/session';
import { getTourBySlug } from '../../../lib/tours';
import { checkRateLimit, clientIp } from '../../../lib/rate-limit';
import { readFormOrJson } from '../../../lib/request-body';
import { jsonResponse } from '../../../lib/json-response';
import { DEFAULT_PICKUP_ID } from '../../../config/private';

export const prerender = false;

/**
 * Step 2 of the group booking (spec §8.1.6), and of the private experience
 * (`kind: 'private'`, plan P). Checks the details and keeps
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
	extras: 'extras',
	pickup: 'pickup',
};

function fail(asForm: boolean, slug: string | null, code: BookingError, status: number, flow: 'group' | 'private' = 'group') {
	if (!asForm) {
		const field = ERROR_FIELDS[code];
		return jsonResponse({ error: BOOKING_ERRORS[code], code, errors: field ? { [field]: BOOKING_ERRORS[code] } : {} }, status);
	}
	const step2 = slug ? `/book/${encodeURIComponent(slug)}/${flow}/` : '/tours/';
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

	if (fields.kind === 'private') return privateDraft(fields, body.asForm, tour, cookies, url);

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

/**
 * The chosen extras: a JSON array from the island, or one `extra_<id>` checkbox
 * each from the plain form (a form can't post a list under one name here).
 * Kept as sent, so the validator refuses anything off the list.
 */
function parseExtras(fields: Record<string, unknown>): string[] {
	const sent = Array.isArray(fields.extras) ? fields.extras : [];
	// Every `extra_<id>` sent, listed or not, so a forged one is refused rather than ignored.
	const fromForm = Object.keys(fields).filter((key) => key.startsWith('extra_')).slice(0, 20).map((key) => key.slice('extra_'.length, 'extra_'.length + 40));
	return [...sent.map((id) => String(id).slice(0, 40)).slice(0, 20), ...fromForm];
}

/** The private experience's step 2: same cookie, plus the extras and pick-up. */
function privateDraft(fields: Record<string, unknown>, asForm: boolean, tour: TourDetail, cookies: AstroCookies, url: URL) {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(fields)) if (typeof value === 'string' || typeof value === 'number') params.set(key, String(value));
	const details = parseGroupBookingParams(params);
	const rawNotes = typeof fields.notes === 'string' ? fields.notes.trim() : '';
	const extras = parseExtras(fields);
	const pickup = typeof fields.pickup === 'string' && fields.pickup ? fields.pickup.slice(0, 40) : DEFAULT_PICKUP_ID;
	const error = validatePrivateBookingInput(tour, { ...details, notes: rawNotes || null, kind: 'private', extras, pickup });
	if (error) return fail(asForm, tour.slug, error, 400, 'private');

	const draft: BookingDraft = {
		v: 2,
		tourSlug: tour.slug,
		date: details.date as string,
		slot: details.slot as string,
		adults: details.adults as number,
		children: details.children,
		infants: details.infants,
		firstName: details.firstName as string,
		lastName: details.lastName as string,
		email: details.email as string,
		phone: details.phone ?? '',
		notes: rawNotes,
		createdAt: Date.now(),
		kind: 'private',
		extras,
		pickup,
	};
	const sealed = sealDraft(draft);
	if (!sealed) return fail(asForm, tour.slug, 'server', 503, 'private');
	cookies.set(BOOKING_COOKIE, sealed, bookingCookieOptions(url));

	// `flow` says which step 2 to go back to if the cookie is gone by then; nothing personal.
	const next = `/book/${tour.slug}/review/?flow=private`;
	return asForm ? new Response(null, { status: 303, headers: { Location: next } }) : jsonResponse({ redirect: next });
}

/** The draft for this browser, to prefill step 2 when coming back to edit (WCAG 3.3.7). */
export const GET: APIRoute = async ({ cookies }) => {
	const draft = openDraft(cookies.get(BOOKING_COOKIE)?.value);
	const headers = { 'Cache-Control': 'no-store' };
	if (!draft) return new Response(null, { status: 204, headers });
	const { v: _v, createdAt: _createdAt, bookingId: _bookingId, ...fields } = draft;
	return new Response(JSON.stringify(fields), { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });
};
