import type { APIRoute } from 'astro';
import {
	HONEYPOT_FIELD,
	CONTACT_LIMITS,
	joinName,
	parseStartedAt,
	trimField,
	validateContactSubmission,
	type ContactFieldName,
	type ContactTopic,
} from '../../lib/contact-validation';
import { getTourBySlug } from '../../lib/tours';
import { jsonResponse } from '../../lib/json-response';
import { MAX_BODY_BYTES, readBodyWithLimit } from '../../lib/request-body';
import { checkRateLimit, clientIp as getClientIp } from '../../lib/rate-limit';
import { verifyTurnstileToken } from '../../lib/turnstile';
import { recordEnquiry } from '../../lib/bookings/service';

export const prerender = false;

const MAX_TURNSTILE_TOKEN_LEN = 2048;

/** Where a form post without JavaScript lands (static pages; §3.5). */
const SENT_PAGE = '/contact/sent/';
const PROBLEM_PAGE = '/contact/problem/';

/**
 * One reply, in the shape the request asked for: JSON for the page script,
 * a 303 redirect for a plain form post. Redirects carry only a code, never
 * what was typed (no personal data in URLs).
 */
function reply(asForm: boolean, status: number, body: { ok: true } | { error: string; code: string; fields?: ContactFieldName[] }) {
	if (!asForm) {
		const { code: _code, ...json } = body as { code?: string };
		return jsonResponse(json, status);
	}
	const location = 'ok' in body ? SENT_PAGE : `${PROBLEM_PAGE}?error=${encodeURIComponent(body.code)}`;
	return new Response(null, { status: 303, headers: { Location: location } });
}

const ERROR_CODES: Record<string, string> = { name: 'name', email: 'email', message: 'message', phone: 'phone', tourSlug: 'tour', topic: 'topic', bookingRef: 'booking-ref' };

export const POST: APIRoute = async ({ request }) => {
	const type = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
	const asForm = type === 'application/x-www-form-urlencoded';
	if (!asForm && type !== 'application/json') {
		return jsonResponse({ error: 'Send JSON or a form' }, 415);
	}

	const contentLength = request.headers.get('content-length');
	if (contentLength && Number.parseInt(contentLength, 10) > MAX_BODY_BYTES) {
		return reply(asForm, 413, { error: 'Request too large', code: 'too-large' });
	}

	const clientIp = getClientIp(request);
	// Fails open: the honeypot, time check and Turnstile still apply (S-11).
	const rateLimit = await checkRateLimit('contact', clientIp);
	if (!rateLimit.ok) {
		return reply(asForm, 429, { error: 'Too many requests, please try again later', code: 'busy' });
	}

	let raw: string | null;
	try {
		raw = await readBodyWithLimit(request, MAX_BODY_BYTES);
	} catch {
		// Aborted or broken upload.
		return reply(asForm, 400, { error: 'Invalid request body', code: 'invalid' });
	}
	if (raw === null) {
		return reply(asForm, 413, { error: 'Request too large', code: 'too-large' });
	}

	let body: Record<string, unknown>;
	if (asForm) {
		body = Object.fromEntries(new URLSearchParams(raw));
	} else {
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			return jsonResponse({ error: 'Invalid JSON' }, 400);
		}
		// `null`, arrays and primitives are valid JSON but not a form submission.
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			return jsonResponse({ error: 'Invalid JSON' }, 400);
		}
		body = parsed as Record<string, unknown>;
	}

	// The form has first and last name (D-10); older clients send one name.
	const name =
		trimField(body.name, CONTACT_LIMITS.name) ||
		joinName(trimField(body.firstName, CONTACT_LIMITS.firstName), trimField(body.lastName, CONTACT_LIMITS.lastName));
	const fields = {
		name,
		email: trimField(body.email, CONTACT_LIMITS.email),
		message: trimField(body.message, CONTACT_LIMITS.message),
		phone: trimField(body.phone, CONTACT_LIMITS.phone),
		tourSlug: trimField(body.tourSlug, CONTACT_LIMITS.tourSlug),
		topic: trimField(body.topic, 20),
		bookingRef: trimField(body.bookingRef, CONTACT_LIMITS.bookingRef).toUpperCase(),
		honeypot: trimField(body[HONEYPOT_FIELD], 200),
		startedAt: parseStartedAt(body._startedAt),
	};
	const turnstileToken = trimField(body.turnstileToken ?? body['cf-turnstile-response'], MAX_TURNSTILE_TOKEN_LEN);

	const result = validateContactSubmission(fields, { startedAtOptional: asForm });
	if (!result.ok) {
		const code = result.fields?.length ? (ERROR_CODES[result.fields[0]] ?? 'invalid') : result.status === 429 ? 'too-fast' : 'invalid';
		return reply(asForm, result.status ?? 400, { error: result.error, code, fields: result.fields });
	}
	if (result.silent) {
		return reply(asForm, 200, { ok: true });
	}

	if (fields.tourSlug && !getTourBySlug(fields.tourSlug)) {
		return reply(asForm, 400, { error: 'Invalid tour selection', code: 'tour', fields: ['tourSlug'] });
	}

	const turnstile = await verifyTurnstileToken(turnstileToken, clientIp);
	if (!turnstile.ok) {
		return reply(asForm, 400, { error: turnstile.error, code: 'check' });
	}

	try {
		await recordEnquiry(
			{
				name: fields.name,
				email: fields.email,
				phone: fields.phone,
				tourSlug: fields.tourSlug,
				message: fields.message,
				...(fields.topic ? { topic: fields.topic as ContactTopic } : {}),
				...(fields.bookingRef ? { bookingRef: fields.bookingRef } : {}),
			},
			new URL(request.url).origin,
		);
	} catch (error) {
		console.error('[contact] could not store enquiry', error);
		return reply(asForm, 503, { error: 'We could not send your message. Please try again or call us.', code: 'server' });
	}

	return reply(asForm, 200, { ok: true });
};
