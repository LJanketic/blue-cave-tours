import type { APIRoute } from 'astro';
import { isPastBookingDate } from '../../../lib/dates';
import { jsonResponse } from '../../../lib/json-response';
import { insertReservation } from '../../../lib/db';
import { getSiteUrl, isTeyaConfigured } from '../../../lib/env';
import { computeQuote } from '../../../lib/pricing';
import { createCheckoutSession } from '../../../lib/teya';
import { checkRateLimit, getClientIp } from '../../../lib/rate-limit';

export const prerender = false;

export const POST: APIRoute = async ({ request, url }) => {
	if (!isTeyaConfigured()) {
		return jsonResponse({ error: 'Teya is not configured' }, 503);
	}

	const ip = getClientIp(request);
	const limited = checkRateLimit(`teya-session:${ip}`, 20, 60_000);
	if (!limited.ok) {
		return jsonResponse({ error: 'Too many requests', retryAfterSec: limited.retryAfterSec }, 429);
	}

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: 'Invalid JSON' }, 400);
	}

	const tourSlug = typeof body.tourSlug === 'string' ? body.tourSlug.trim() : '';
	const tourDate = typeof body.tourDate === 'string' ? body.tourDate.trim() : '';
	const customerName = typeof body.name === 'string' ? body.name.trim() : '';
	const customerEmail = typeof body.email === 'string' ? body.email.trim() : '';
	const customerPhone = typeof body.phone === 'string' ? body.phone.trim() : '';
	const locale = typeof body.locale === 'string' ? body.locale.trim() : 'hr';

	if (!tourSlug || !tourDate || !customerName || !customerEmail) {
		return jsonResponse({ error: 'tourSlug, tourDate, name, and email are required' }, 400);
	}

	if (isPastBookingDate(tourDate)) {
		return jsonResponse({ error: 'Tour date must be today or in the future' }, 400);
	}

	const adults = Number(body.adults ?? 1);
	const children = Number(body.children ?? 0);
	const infants = Number(body.infants ?? 0);

	const quote = computeQuote(tourSlug, { adults, children, infants }, locale);
	if ('error' in quote) return jsonResponse({ error: quote.error }, 400);
	if (quote.requiresContact) {
		return jsonResponse({ error: 'This tour requires a custom quote — please contact us' }, 400);
	}
	if (quote.total <= 0) return jsonResponse({ error: 'Invalid total' }, 400);

	const siteUrl = getSiteUrl(url.origin);
	const successUrl = `${siteUrl}/booking/success?tourId=${encodeURIComponent(tourSlug)}&provider=teya`;
	const failureUrl = `${siteUrl}/booking/cancel?provider=teya`;

	try {
		const session = await createCheckoutSession({
			amount: quote.total,
			currency: quote.currency,
			successUrl,
			failureUrl,
			idempotencyKey: `${tourSlug}-${tourDate}-${customerEmail}`,
		});

		const row = await insertReservation({
			order_id: session.sessionId,
			status: 'pending',
			payment_provider: 'teya',
			tour_slug: tourSlug,
			tour_date: tourDate,
			adults,
			children,
			infants,
			customer_name: customerName,
			customer_email: customerEmail,
			customer_phone: customerPhone || null,
			locale,
			currency: quote.currency,
			amount_total: quote.total,
			quote_json: quote as unknown as Record<string, unknown>,
			teya_session_id: session.sessionId,
		});

		if (!row) {
			return jsonResponse({ error: 'Could not save reservation — check Supabase configuration' }, 503);
		}

		return jsonResponse({
			sessionId: session.sessionId,
			redirectUrl: session.sessionUrl,
			provider: 'teya',
		});
	} catch (err) {
		console.error('[teya] create-session', err);
		return jsonResponse({ error: 'Payment provider error — please try again or contact us' }, 502);
	}
};
