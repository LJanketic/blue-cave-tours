import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTourBySlug } from './tours';
import type { TourDetail } from '../types/tour';
import type { NewBookingInput } from './bookings/service';
import type { Booking } from './bookings/store';

/*
 * The pay page checks capacity again before it offers or takes a payment
 * (src/pages/booking/pay.astro): a departure sold out since the booking was
 * made shows the sold-out message and no Pay buttons, and a POST pays nothing.
 * The demo checkout is opened for this file (DEMO_CHECKOUT=open on a dev
 * build), so the refusal comes from the capacity check, not the demo gate.
 */

// A date ahead of today whatever day the tests run (inside the booking horizon and the season).
const DATE = `${new Date().getUTCFullYear() + (new Date().getUTCMonth() >= 2 ? 1 : 0)}-07-15`;
const tour = getTourBySlug('blue-cave-hvar-5-islands') as TourDetail;
const group = (adults: number, firstName = 'Jane'): NewBookingInput => ({
	date: DATE,
	slot: '07:20',
	adults,
	children: 0,
	infants: 0,
	firstName,
	lastName: 'Smith',
	email: 'jane@example.com',
	phone: '',
	notes: null,
});

// Imported after the env is stubbed, with the page: one module graph, so one in-memory store.
let service: typeof import('./bookings/service');
let store: typeof import('./bookings/store');

async function create(adults: number, firstName?: string): Promise<Booking> {
	const result = await service.createPendingBooking(tour, group(adults, firstName));
	if (!result.ok) throw new Error(result.error);
	return result.booking;
}

let PayPage: Awaited<typeof import('../pages/booking/pay.astro')>['default'];
let container: AstroContainer;

beforeAll(async () => {
	vi.stubEnv('DEMO_CHECKOUT', 'open');
	vi.resetModules();
	PayPage = (await import('../pages/booking/pay.astro')).default;
	service = await import('./bookings/service');
	store = await import('./bookings/store');
	container = await AstroContainer.create();
});
afterAll(() => vi.unstubAllEnvs());
beforeEach(() => store.resetMemoryStore());

const url = (booking: Booking) => `http://localhost/booking/pay/?id=${booking.id}`;

describe('pay page capacity check', () => {
	it('offers the Pay buttons while the booking still fits', async () => {
		const booking = await create(2);
		const html = await container.renderToString(PayPage, { request: new Request(url(booking)) });
		expect(html).toContain('pay__form');
		expect(html).not.toContain('pay-sold-out');
	});

	it('shows the sold-out message and no Pay buttons once others paid for the seats, and a POST pays nothing', async () => {
		const booking = await create(2);
		const other = await create(13, 'Other');
		await service.finalizePaidBooking(other.id, 'teya', 'T-1', 'http://localhost');
		const html = await container.renderToString(PayPage, { request: new Request(url(booking)) });
		expect(html).toContain('pay-sold-out');
		expect(html).toContain(service.BOOKING_ERRORS.full.replace(/'/g, '&#39;'));
		expect(html).not.toContain('pay__form');

		const response = await container.renderToResponse(PayPage, {
			request: new Request(url(booking), {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: 'provider=teya&outcome=success',
			}),
		});
		expect(response.status).toBe(303);
		expect((await store.bookings().get(booking.id))?.paymentStatus).toBe('unpaid');
	});
});
