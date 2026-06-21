import { getReservationByOrderId, updateReservationByOrderId, type ReservationRow } from '../db';
import { sendBookingEmails } from '../email';

export type FinalizePaidInput = {
	orderId: string;
	captureId?: string | null;
	expectedAmount?: number;
	capturedAmount?: number;
};

export type FinalizePaidResult =
	| { ok: true; reservation: ReservationRow; alreadyPaid: boolean }
	| { ok: false; error: string; status?: number };

/**
 * Idempotent: mark reservation paid and send confirmation emails once.
 * Used by PayPal capture, PayPal webhook, and future Teya confirm flow.
 */
export async function finalizePaidReservation(input: FinalizePaidInput): Promise<FinalizePaidResult> {
	const { orderId, captureId, expectedAmount, capturedAmount } = input;

	const existing = await getReservationByOrderId(orderId);
	if (!existing) {
		return { ok: false, error: 'Reservation not found', status: 404 };
	}

	if (
		expectedAmount != null &&
		capturedAmount != null &&
		Math.abs(capturedAmount - expectedAmount) > 0.01
	) {
		return { ok: false, error: 'Captured amount does not match reservation', status: 402 };
	}

	if (existing.status === 'paid') {
		return { ok: true, reservation: existing, alreadyPaid: true };
	}

	const updated = await updateReservationByOrderId(orderId, {
		status: 'paid',
		paypal_capture_id: captureId ?? existing.paypal_capture_id ?? null,
	});

	const reservation = updated ?? existing;
	if (reservation.status !== 'paid') {
		return { ok: false, error: 'Failed to update reservation', status: 500 };
	}

	await sendBookingEmails({
		tourSlug: reservation.tour_slug,
		tourDate: reservation.tour_date,
		adults: reservation.adults,
		children: reservation.children,
		infants: reservation.infants,
		customerName: reservation.customer_name,
		customerEmail: reservation.customer_email,
		customerPhone: reservation.customer_phone ?? undefined,
		total: reservation.amount_total,
		currency: reservation.currency,
		orderId,
	});

	return { ok: true, reservation, alreadyPaid: false };
}
