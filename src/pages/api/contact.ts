import type { APIRoute } from 'astro';
import { getTourBySlug } from '../../lib/tours';
import { jsonResponse } from '../../lib/json-response';

export const prerender = false;

const LIMITS = { name: 200, email: 254, message: 5000, phone: 30, tourSlug: 80 } as const;
const MAX_BODY_BYTES = 16_384;

function trimField(value: unknown, max: number): string {
	return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

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

	const name = trimField(body.name, LIMITS.name);
	const email = trimField(body.email, LIMITS.email);
	const message = trimField(body.message, LIMITS.message);
	const phone = trimField(body.phone, LIMITS.phone);
	const tourSlug = trimField(body.tourSlug, LIMITS.tourSlug);

	if (!name || !email || !message) {
		return jsonResponse({ error: 'Name, email, and message are required' }, 400);
	}
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return jsonResponse({ error: 'Enter a valid email address' }, 400);
	}
	if (tourSlug && !getTourBySlug(tourSlug)) {
		return jsonResponse({ error: 'Invalid tour selection' }, 400);
	}

	// Showcase: validated and accepted. Wire email delivery before production.
	void phone;
	void tourSlug;

	return jsonResponse({ ok: true });
};
