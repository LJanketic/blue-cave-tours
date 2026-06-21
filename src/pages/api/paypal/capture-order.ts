import type { APIRoute } from 'astro';
import { jsonResponse } from '../../../lib/json-response';
import { getReservationByOrderId, updateReservationByOrderId } from '../../../lib/db';
import { isPayPalConfigured } from '../../../lib/env';
import { finalizePaidReservation } from '../../../lib/payments/finalize';
import { captureOrder } from '../../../lib/paypal';
import { checkRateLimit, getClientIp } from '../../../lib/rate-limit';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	if (!isPayPalConfigured()) {
		return jsonResponse({ error: 'PayPal is not configured' }, 503);
	}

	const ip = getClientIp(request);
	const limited = checkRateLimit(`capture-order:${ip}`, 20, 60_000);
	if (!limited.ok) {
		return jsonResponse({ error: 'Too many requests', retryAfterSec: limited.retryAfterSec }, 429);
	}

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: 'Invalid JSON' }, 400);
	}

	const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
	if (!orderId) return jsonResponse({ error: 'orderId is required' }, 400);

	const existing = await getReservationByOrderId(orderId);
	if (!existing) {
		return jsonResponse({ error: 'Reservation not found for this order' }, 404);
	}

	if (existing.status === 'paid') {
		return jsonResponse({ ok: true, status: 'paid', orderId });
	}

	try {
		const captured = await captureOrder(orderId);
		if (captured.status !== 'COMPLETED') {
			await updateReservationByOrderId(orderId, { status: 'failed' });
			return jsonResponse({ error: 'Payment not completed', status: captured.status }, 402);
		}

		const capturedAmount = captured.amount?.value
			? Number.parseFloat(captured.amount.value)
			: undefined;

		const result = await finalizePaidReservation({
			orderId,
			captureId: captured.captureId ?? null,
			expectedAmount: existing.amount_total,
			capturedAmount,
		});

		if (!result.ok) {
			return jsonResponse({ error: result.error }, result.status ?? 500);
		}

		return jsonResponse({
			ok: true,
			status: 'paid',
			orderId,
			captureId: captured.captureId,
			alreadyPaid: result.alreadyPaid,
		});
	} catch (err) {
		console.error('[paypal] capture-order', err);
		return jsonResponse({ error: 'Payment provider error' }, 502);
	}
};
