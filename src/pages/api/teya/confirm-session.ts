import type { APIRoute } from 'astro';
import { jsonResponse } from '../../../lib/json-response';
import { finalizePaidReservation } from '../../../lib/payments/finalize';
import { isTeyaConfigured } from '../../../lib/env';
import { getCheckoutSession } from '../../../lib/teya';
import { checkRateLimit, getClientIp } from '../../../lib/rate-limit';
import { updateReservationByOrderId } from '../../../lib/db';

export const prerender = false;

/**
 * Called after customer returns from Teya Hosted Checkout.
 * Polls session status and finalizes reservation when payment_status = SUCCESS.
 */
export const POST: APIRoute = async ({ request }) => {
	if (!isTeyaConfigured()) {
		return jsonResponse({ error: 'Teya is not configured' }, 503);
	}

	const ip = getClientIp(request);
	const limited = checkRateLimit(`teya-confirm:${ip}`, 30, 60_000);
	if (!limited.ok) {
		return jsonResponse({ error: 'Too many requests', retryAfterSec: limited.retryAfterSec }, 429);
	}

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: 'Invalid JSON' }, 400);
	}

	const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
	if (!sessionId) return jsonResponse({ error: 'sessionId is required' }, 400);

	try {
		const session = await getCheckoutSession(sessionId);

		if (session.paymentStatus !== 'SUCCESS') {
			if (session.paymentStatus === 'FAILED') {
				await updateReservationByOrderId(sessionId, { status: 'failed' });
			}
			return jsonResponse(
				{
					ok: false,
					status: session.paymentStatus,
					sessionStatus: session.sessionStatus,
				},
				402,
			);
		}

		const result = await finalizePaidReservation({ orderId: sessionId });
		if (!result.ok) {
			return jsonResponse({ error: result.error }, result.status ?? 500);
		}

		return jsonResponse({
			ok: true,
			status: 'paid',
			sessionId,
			alreadyPaid: result.alreadyPaid,
		});
	} catch (err) {
		console.error('[teya] confirm-session', err);
		return jsonResponse({ error: 'Payment provider error' }, 502);
	}
};
