import type { APIRoute } from 'astro';
import { isPastBookingDate } from '../../../lib/dates';
import { jsonResponse } from '../../../lib/json-response';
import { computeQuote } from '../../../lib/pricing';
import { checkRateLimit, getClientIp } from '../../../lib/rate-limit';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	const ip = getClientIp(request);
	const limited = checkRateLimit(`quote:${ip}`, 60, 60_000);
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
	if (!tourSlug) return jsonResponse({ error: 'tourSlug is required' }, 400);

	const tourDate = typeof body.tourDate === 'string' ? body.tourDate.trim() : '';
	if (tourDate && isPastBookingDate(tourDate)) {
		return jsonResponse({ error: 'Tour date must be today or later' }, 400);
	}

	const adults = Number(body.adults ?? 1);
	const children = Number(body.children ?? 0);
	const infants = Number(body.infants ?? 0);

	const locale = typeof body.locale === 'string' ? body.locale.trim() : undefined;

	const quote = computeQuote(tourSlug, { adults, children, infants }, locale);
	if ('error' in quote) return jsonResponse({ error: quote.error }, 400);

	return jsonResponse({ quote });
};
