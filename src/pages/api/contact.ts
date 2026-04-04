import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const name = typeof body.name === 'string' ? body.name.trim() : '';
	const email = typeof body.email === 'string' ? body.email.trim() : '';
	if (!name || !email) {
		return new Response(JSON.stringify({ error: 'Name and email are required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// Demo: no email provider wired — log server-side for inspection in dev
	if (import.meta.env.DEV) {
		console.info('[contact]', { ...body, receivedAt: new Date().toISOString() });
	}

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
