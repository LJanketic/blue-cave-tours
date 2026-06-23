import type { APIRoute } from 'astro';
import {
	HONEYPOT_FIELD,
	CONTACT_LIMITS,
	parseStartedAt,
	trimField,
	validateContactSubmission,
} from '../../lib/contact-validation';
import { getTourBySlug } from '../../lib/tours';
import { jsonResponse } from '../../lib/json-response';

export const prerender = false;

const MAX_BODY_BYTES = 16_384;

export const POST: APIRoute = async ({ request }) => {
	const contentLength = request.headers.get('content-length');
	if (contentLength && Number.parseInt(contentLength, 10) > MAX_BODY_BYTES) {
		return jsonResponse({ error: 'Request too large' }, 413);
	}

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: 'Invalid JSON' }, 400);
	}

	const fields = {
		name: trimField(body.name, CONTACT_LIMITS.name),
		email: trimField(body.email, CONTACT_LIMITS.email),
		message: trimField(body.message, CONTACT_LIMITS.message),
		phone: trimField(body.phone, CONTACT_LIMITS.phone),
		tourSlug: trimField(body.tourSlug, CONTACT_LIMITS.tourSlug),
		honeypot: trimField(body[HONEYPOT_FIELD], 200),
		startedAt: parseStartedAt(body._startedAt),
	};

	const result = validateContactSubmission(fields);
	if (!result.ok) {
		return jsonResponse({ error: result.error }, result.status ?? 400);
	}
	if (result.silent) {
		return jsonResponse({ ok: true });
	}

	if (fields.tourSlug && !getTourBySlug(fields.tourSlug)) {
		return jsonResponse({ error: 'Invalid tour selection' }, 400);
	}

	// Showcase: validated and accepted. Wire email delivery + Turnstile/rate limits before production.
	void fields.phone;
	void fields.tourSlug;

	return jsonResponse({ ok: true });
};
