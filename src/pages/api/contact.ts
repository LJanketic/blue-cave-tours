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
import { checkRateLimit } from '../../lib/rate-limit';
import { verifyTurnstileToken } from '../../lib/turnstile';
import { recordEnquiry } from '../../lib/bookings/service';

export const prerender = false;

const MAX_BODY_BYTES = 16_384;
const MAX_TURNSTILE_TOKEN_LEN = 2048;

/**
 * Reads the body as text, stopping as soon as it passes `limit` bytes. The
 * content-length check above can't catch chunked requests that omit the
 * header, and `request.text()` would buffer the whole body before any check.
 */
async function readBodyWithLimit(request: Request, limit: number): Promise<string | null> {
	if (!request.body) return '';
	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.byteLength;
		if (size > limit) {
			await reader.cancel();
			return null;
		}
		chunks.push(value);
	}
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return new TextDecoder().decode(bytes);
}

export const POST: APIRoute = async ({ request }) => {
	const contentLength = request.headers.get('content-length');
	if (contentLength && Number.parseInt(contentLength, 10) > MAX_BODY_BYTES) {
		return jsonResponse({ error: 'Request too large' }, 413);
	}

	const clientIp =
		request.headers.get('x-nf-client-connection-ip') ??
		request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
		null;

	const rateLimit = await checkRateLimit(`contact:${clientIp ?? 'unknown'}`);
	if (!rateLimit.ok) {
		return jsonResponse({ error: 'Too many requests — please try again later' }, 429);
	}

	let raw: string | null;
	try {
		raw = await readBodyWithLimit(request, MAX_BODY_BYTES);
	} catch {
		// Aborted or broken upload.
		return jsonResponse({ error: 'Invalid request body' }, 400);
	}
	if (raw === null) {
		return jsonResponse({ error: 'Request too large' }, 413);
	}

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
	const body = parsed as Record<string, unknown>;

	const fields = {
		name: trimField(body.name, CONTACT_LIMITS.name),
		email: trimField(body.email, CONTACT_LIMITS.email),
		message: trimField(body.message, CONTACT_LIMITS.message),
		phone: trimField(body.phone, CONTACT_LIMITS.phone),
		tourSlug: trimField(body.tourSlug, CONTACT_LIMITS.tourSlug),
		honeypot: trimField(body[HONEYPOT_FIELD], 200),
		startedAt: parseStartedAt(body._startedAt),
	};
	const turnstileToken = trimField(body.turnstileToken, MAX_TURNSTILE_TOKEN_LEN);

	const result = validateContactSubmission(fields);
	if (!result.ok) {
		return jsonResponse({ error: result.error, fields: result.fields }, result.status ?? 400);
	}
	if (result.silent) {
		return jsonResponse({ ok: true });
	}

	if (fields.tourSlug && !getTourBySlug(fields.tourSlug)) {
		return jsonResponse({ error: 'Invalid tour selection', fields: ['tourSlug'] }, 400);
	}

	const turnstile = await verifyTurnstileToken(turnstileToken, clientIp);
	if (!turnstile.ok) {
		return jsonResponse({ error: turnstile.error }, 400);
	}

	try {
		await recordEnquiry(
			{
				name: fields.name,
				email: fields.email,
				phone: fields.phone,
				tourSlug: fields.tourSlug,
				message: fields.message,
			},
			new URL(request.url).origin,
		);
	} catch (error) {
		console.error('[contact] could not store enquiry', error);
		return jsonResponse({ error: 'We could not send your message — please try again or call us' }, 503);
	}

	return jsonResponse({ ok: true });
};
