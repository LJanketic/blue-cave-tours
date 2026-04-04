import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getStripePriceIdForTour } from '../../server/stripe-prices';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	const secret = import.meta.env.STRIPE_SECRET_KEY;
	if (!secret) {
		return new Response(JSON.stringify({ error: 'Payments are not configured. Add STRIPE_SECRET_KEY to your environment.' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	let body: { tourId?: string };
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const tourId = body.tourId;
	if (!tourId || typeof tourId !== 'string') {
		return new Response(JSON.stringify({ error: 'Missing tourId' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const priceId = getStripePriceIdForTour(tourId);
	if (!priceId) {
		return new Response(
			JSON.stringify({
				error:
					'No Stripe Price ID for this tour. Create a Price in Stripe and set the matching STRIPE_PRICE_* env var.',
			}),
			{ status: 400, headers: { 'Content-Type': 'application/json' } },
		);
	}

	const stripe = new Stripe(secret);
	const origin = new URL(request.url).origin;

	try {
		const session = await stripe.checkout.sessions.create({
			mode: 'payment',
			line_items: [{ price: priceId, quantity: 1 }],
			success_url: `${origin}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${origin}/booking/cancel`,
			metadata: { tourId },
			allow_promotion_codes: true,
		});

		if (!session.url) {
			return new Response(JSON.stringify({ error: 'Stripe did not return a checkout URL' }), {
				status: 502,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response(JSON.stringify({ url: session.url }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Stripe error';
		return new Response(JSON.stringify({ error: message }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
