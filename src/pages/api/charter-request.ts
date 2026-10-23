import type { APIRoute } from 'astro';
import { HONEYPOT_FIELD, asciiEmail, joinName } from '../../lib/contact-validation';
import {
	CHARTER_ERRORS,
	CHARTER_ERROR_FIELDS,
	botCheck,
	parseCharterRequest,
	validateCharterRequest,
	type CharterError,
} from '../../lib/charter';
import { routeById } from '../../config/charter';
import { jsonResponse } from '../../lib/json-response';
import { readFormOrJson } from '../../lib/request-body';
import { checkGlobalLimit, checkRateLimit, clientIp as getClientIp } from '../../lib/rate-limit';
import { verifyTurnstileToken } from '../../lib/turnstile';
import { recordEnquiry } from '../../lib/bookings/service';

export const prerender = false;

/** Where a form post without JavaScript lands (static pages; §3.5). */
const SENT_PAGE = '/private-charter/sent/';
const PROBLEM_PAGE = '/private-charter/problem/';

/**
 * Private charter request (spec §8.2). Stores an enquiry of kind 'charter'
 * and notifies the admin (capped, S-6); there is no customer auto-reply
 * (D-22). The boss answers with a quote from the admin.
 *
 * Replies as asked: JSON for the page script, a 303 for a plain form post.
 * Redirects carry only an error code, never what was typed (S-2).
 */
function reply(asForm: boolean, status: number, result: { ok: true } | { code: CharterError }) {
	if (!asForm) {
		if ('ok' in result) return jsonResponse({ ok: true }, status);
		const field = CHARTER_ERROR_FIELDS[result.code];
		return jsonResponse({ error: CHARTER_ERRORS[result.code], code: result.code, errors: field ? { [field]: CHARTER_ERRORS[result.code] } : {} }, status);
	}
	const location = 'ok' in result ? SENT_PAGE : `${PROBLEM_PAGE}?error=${encodeURIComponent(result.code)}`;
	return new Response(null, { status: 303, headers: { Location: location } });
}

/**
 * Charter requests per hour from everyone together (spec §8.2: 30). CHARTER_HOURLY_CAP
 * raises it only where many test runs share one store (playwright.config.ts).
 */
function hourlyCap(): number {
	if ((process.env.CONTEXT || import.meta.env.CONTEXT) === 'production') return 30;
	const cap = Number.parseInt(process.env.CHARTER_HOURLY_CAP ?? '', 10);
	return Number.isInteger(cap) && cap > 0 ? cap : 30;
}

export const POST: APIRoute = async ({ request }) => {
	const body = await readFormOrJson(request);
	if (!body.ok) {
		if (body.status === 415) return jsonResponse({ error: 'Send JSON or a form' }, 415);
		return reply(body.asForm, body.status, { code: 'invalid' });
	}
	const { asForm, fields } = body;

	// Fails closed (S-11), unlike the contact form: a charter request asks staff for a quote.
	const ip = getClientIp(request);
	if (!(await checkRateLimit('charter', ip, { max: 5, failClosed: true })).ok) return reply(asForm, 429, { code: 'busy' });

	const input = parseCharterRequest(fields, HONEYPOT_FIELD);
	const bot = botCheck(input, asForm);
	if (bot === 'silent') return reply(asForm, 200, { ok: true });
	if (bot !== 'ok') return reply(asForm, bot === 'too-fast' ? 429 : 400, { code: bot });

	const error = validateCharterRequest(input);
	if (error) return reply(asForm, 400, { code: error });

	// Enforced once both Turnstile keys are set (src/lib/turnstile.ts). Required before go-live (S-6).
	const token = typeof (fields.turnstileToken ?? fields['cf-turnstile-response']) === 'string' ? String(fields.turnstileToken ?? fields['cf-turnstile-response']).slice(0, 2048) : '';
	if (!(await verifyTurnstileToken(token, ip)).ok) return reply(asForm, 400, { code: 'check' });
	// The cap on everyone together counts only requests that passed every check, so junk posts can't use it up.
	if (!(await checkGlobalLimit('charter', { max: hourlyCap(), windowMs: 3_600_000, failClosed: true })).ok) return reply(asForm, 429, { code: 'busy' });

	const route = routeById(input.route);
	try {
		await recordEnquiry(
			{
				kind: 'charter',
				topic: 'charter',
				name: joinName(input.firstName, input.lastName),
				email: asciiEmail(input.email),
				phone: input.phone,
				tourSlug: route?.tourSlug ?? '',
				message: input.notes,
				charter: {
					route: input.route,
					date: input.date,
					time: input.time,
					durationHours: input.durationHours,
					adults: input.adults,
					children: input.children,
					infants: input.infants,
					firstName: input.firstName,
					lastName: input.lastName,
					...(input.pickup ? { pickup: input.pickup } : {}),
					...(input.extras ? { extras: input.extras } : {}),
				},
			},
			new URL(request.url).origin,
		);
	} catch (err) {
		console.error('[charter] could not store request', err);
		return reply(asForm, 503, { code: 'server' });
	}
	return reply(asForm, 200, { ok: true });
};
