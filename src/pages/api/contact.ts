import type { APIRoute } from 'astro';
import { jsonResponse } from '../../lib/json-response';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: 'Invalid JSON' }, 400);
	}

	const name = typeof body.name === 'string' ? body.name.trim() : '';
	const email = typeof body.email === 'string' ? body.email.trim() : '';
	if (!name || !email) {
		return jsonResponse({ error: 'Name and email are required' }, 400);
	}

	// Demo: no email provider wired — log server-side for inspection in dev
	if (import.meta.env.DEV) {
		console.info('[contact]', { ...body, receivedAt: new Date().toISOString() });
	}

	return jsonResponse({ ok: true });
};
