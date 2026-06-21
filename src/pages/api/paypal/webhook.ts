import type { APIRoute } from 'astro';
import { jsonResponse } from '../../../lib/json-response';
import { finalizePaidReservation } from '../../../lib/payments/finalize';
import { verifyWebhook } from '../../../lib/paypal';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	const webhookId = import.meta.env.PAYPAL_WEBHOOK_ID;

	// Never process webhooks without verification configured (production safety).
	if (!webhookId) {
		console.error('[paypal] PAYPAL_WEBHOOK_ID not set — rejecting webhook');
		return jsonResponse({ error: 'Webhook verification not configured' }, 503);
	}

	let event: Record<string, unknown>;
	try {
		event = await request.json();
	} catch {
		return jsonResponse({ error: 'Invalid JSON' }, 400);
	}

	const verified = await verifyWebhook({
		transmissionId: request.headers.get('paypal-transmission-id') ?? '',
		timestamp: request.headers.get('paypal-transmission-time') ?? '',
		webhookId,
		event,
		certUrl: request.headers.get('paypal-cert-url') ?? '',
		authAlgo: request.headers.get('paypal-auth-algo') ?? '',
		transmissionSig: request.headers.get('paypal-transmission-sig') ?? '',
	});

	if (!verified) {
		return jsonResponse({ error: 'Webhook verification failed' }, 401);
	}

	const eventType = typeof event.event_type === 'string' ? event.event_type : '';

	// Only mark paid on actual capture — not on CHECKOUT.ORDER.APPROVED (buyer approved, funds not captured).
	if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
		const resource = event.resource as Record<string, unknown> | undefined;
		const orderId =
			(typeof resource?.id === 'string' && resource.id) ||
			(typeof (resource?.supplementary_data as Record<string, unknown> | undefined)?.related_ids ===
				'object' &&
				typeof (
					(resource?.supplementary_data as Record<string, unknown>).related_ids as Record<string, unknown>
				)?.order_id === 'string' &&
				((resource?.supplementary_data as Record<string, unknown>).related_ids as Record<string, unknown>)
					.order_id) ||
			'';

		if (orderId) {
			const amountValue =
				typeof (resource?.amount as Record<string, unknown> | undefined)?.value === 'string'
					? Number.parseFloat((resource!.amount as Record<string, unknown>).value as string)
					: undefined;

			await finalizePaidReservation({
				orderId: String(orderId),
				captureId: typeof resource?.id === 'string' ? resource.id : null,
				capturedAmount: amountValue,
			});
		}
	}

	return jsonResponse({ ok: true });
};
