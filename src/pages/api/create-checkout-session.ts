import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { jsonResponse } from '../../lib/json-response';
import { getCheckoutMode } from '../../server/checkout-mode';
import { getStripePriceIdForTour } from '../../server/stripe-prices';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	let body: { tourId?: string };
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: 'Invalid JSON body' }, 400);
	}

	const tourId = body.tourId;
	if (!tourId || typeof tourId !== 'string') {
		return jsonResponse({ error: 'Missing tourId' }, 400);
	}

	const origin = new URL(request.url).origin;
	const mode = getCheckoutMode();

	if (mode === 'off') {
		return jsonResponse(
			{
				error: 'Online booking is not available yet. Please contact us to reserve your tour.',
			},
			503,
		);
	}

	if (mode === 'mock') {
		const url = new URL('/booking/success', origin);
		url.searchParams.set('demo', '1');
		url.searchParams.set('tourId', tourId);
		return jsonResponse({ url: url.href });
	}

	const secret = import.meta.env.STRIPE_SECRET_KEY;
	if (!secret) {
		return jsonResponse({ error: 'Stripe mode requested but STRIPE_SECRET_KEY is not set.' }, 503);
	}

	const priceId = getStripePriceIdForTour(tourId);
	if (!priceId) {
		return jsonResponse(
			{
				error: `No Stripe Price ID for this tour. Set ${import.meta.env.PROD ? 'env' : 'e.g.'} STRIPE_PRICE_* for slug "${tourId}" in .env.`,
			},
			400,
		);
	}

	const stripe = new Stripe(secret);

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
			return jsonResponse({ error: 'Stripe did not return a checkout URL' }, 502);
		}

		return jsonResponse({ url: session.url });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Stripe error';
		return jsonResponse({ error: message }, 502);
	}
};
