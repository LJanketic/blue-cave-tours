import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReservationRow } from '../db';

const { getReservationByOrderId, updateReservationByOrderId, sendBookingEmails } = vi.hoisted(() => ({
	getReservationByOrderId: vi.fn(),
	updateReservationByOrderId: vi.fn(),
	sendBookingEmails: vi.fn(),
}));

vi.mock('../db', () => ({
	getReservationByOrderId,
	updateReservationByOrderId,
}));

vi.mock('../email', () => ({
	sendBookingEmails,
}));

import { finalizePaidReservation } from './finalize';

const baseReservation: ReservationRow = {
	id: 'res-1',
	order_id: 'order-abc',
	status: 'pending',
	payment_provider: 'paypal',
	tour_slug: 'three-islands',
	tour_date: '2099-06-01',
	adults: 2,
	children: 0,
	infants: 0,
	customer_name: 'Test Guest',
	customer_email: 'guest@example.com',
	customer_phone: null,
	locale: 'en',
	currency: 'EUR',
	amount_total: 278,
	quote_json: null,
	paypal_capture_id: null,
	teya_session_id: null,
	teya_transaction_id: null,
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
};

describe('finalizePaidReservation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 404 when reservation is missing', async () => {
		getReservationByOrderId.mockResolvedValue(null);

		const result = await finalizePaidReservation({ orderId: 'missing' });

		expect(result).toEqual({ ok: false, error: 'Reservation not found', status: 404 });
	});

	it('rejects captured amount mismatch', async () => {
		getReservationByOrderId.mockResolvedValue(baseReservation);

		const result = await finalizePaidReservation({
			orderId: baseReservation.order_id,
			expectedAmount: 278,
			capturedAmount: 100,
		});

		expect(result).toEqual({
			ok: false,
			error: 'Captured amount does not match reservation',
			status: 402,
		});
		expect(updateReservationByOrderId).not.toHaveBeenCalled();
	});

	it('is idempotent when already paid', async () => {
		getReservationByOrderId.mockResolvedValue({ ...baseReservation, status: 'paid' });

		const result = await finalizePaidReservation({ orderId: baseReservation.order_id });

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.alreadyPaid).toBe(true);
		}
		expect(updateReservationByOrderId).not.toHaveBeenCalled();
		expect(sendBookingEmails).not.toHaveBeenCalled();
	});

	it('marks pending reservation paid and sends email once', async () => {
		getReservationByOrderId.mockResolvedValue(baseReservation);
		updateReservationByOrderId.mockResolvedValue({ ...baseReservation, status: 'paid' });

		const result = await finalizePaidReservation({
			orderId: baseReservation.order_id,
			captureId: 'cap-123',
			expectedAmount: 278,
			capturedAmount: 278,
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.alreadyPaid).toBe(false);
			expect(result.reservation.status).toBe('paid');
		}
		expect(updateReservationByOrderId).toHaveBeenCalledWith(baseReservation.order_id, {
			status: 'paid',
			paypal_capture_id: 'cap-123',
		});
		expect(sendBookingEmails).toHaveBeenCalledOnce();
	});
});
