import type { APIRoute } from 'astro';
import { jsonResponse } from '../../lib/json-response';
import { sendContactEmail } from '../../lib/email';
import { checkRateLimit, getClientIp } from '../../lib/rate-limit';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	const ip = getClientIp(request);
	const limited = checkRateLimit(`contact:${ip}`, 10, 60_000);
	if (!limited.ok) {
		return jsonResponse({ error: 'Too many requests', retryAfterSec: limited.retryAfterSec }, 429);
	}

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: 'Invalid JSON' }, 400);
	}

	const honeypot = typeof body.website === 'string' ? body.website.trim() : '';
	if (honeypot) {
		return jsonResponse({ ok: true, emailed: false });
	}

	const name = typeof body.name === 'string' ? body.name.trim() : '';
	const email = typeof body.email === 'string' ? body.email.trim() : '';
	const message = typeof body.message === 'string' ? body.message.trim() : '';
	const phone = typeof body.phone === 'string' ? body.phone.trim() : undefined;
	const tourSlug = typeof body.tourSlug === 'string' ? body.tourSlug.trim() : undefined;

	if (!name || !email || !message) {
		return jsonResponse({ error: 'Name, email, and message are required' }, 400);
	}

	const sent = await sendContactEmail({ name, email, phone, tourSlug, message });
	if (import.meta.env.DEV && !sent) {
		console.info('[contact]', { name, email, phone, tourSlug, message, receivedAt: new Date().toISOString() });
	}

	return jsonResponse({ ok: true, emailed: sent });
};
