import { beforeEach, describe, expect, it } from 'vitest';
import { getTourBySlug } from '../tours';
import type { TourDetail } from '../../types/tour';
import { createPendingBooking } from '../bookings/service';
import { resetMemoryStore, type Booking, type Enquiry } from '../bookings/store';
import { adminBookingEmail, adminEnquiryEmail, bookingConfirmationEmail } from './templates';

const ATTACK = '<img src=x onerror=alert(1)>';
const tour = getTourBySlug('blue-cave-hvar-5-islands') as TourDetail;

async function hostileBooking(): Promise<Booking> {
	const result = await createPendingBooking(
		tour,
		{ date: '2027-07-15', slot: '07:20', adults: 2, children: 0, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', phone: '+44 7700 900123', notes: null },
		new Date('2027-06-01T10:00:00Z'),
	);
	if (!result.ok) throw new Error(result.error);
	// Straight into the record, past validation: the templates must escape on their own.
	return { ...result.booking, firstName: ATTACK, lastName: ATTACK, phone: ATTACK, customerNotes: ATTACK };
}

function expectEscaped(html: string) {
	expect(html).not.toContain(ATTACK);
	expect(html).not.toMatch(/<img/i);
	expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
}

beforeEach(() => resetMemoryStore());

describe('email templates escape customer text', () => {
	it('in the customer confirmation', async () => {
		expectEscaped(bookingConfirmationEmail(await hostileBooking(), 'https://example.test').html);
	});

	it('in the admin booking notification', async () => {
		expectEscaped(adminBookingEmail(await hostileBooking(), 'admin@example.test', 'https://example.test/admin/').html);
	});

	it('in the admin enquiry notification', () => {
		const enquiry = {
			id: 'e1',
			createdAt: '2027-06-01T10:00:00Z',
			status: 'new',
			name: ATTACK,
			email: 'jane@example.com',
			phone: ATTACK,
			tourSlug: null,
			message: ATTACK,
		} as unknown as Enquiry;
		expectEscaped(adminEnquiryEmail(enquiry, 'admin@example.test', 'https://example.test/admin/enquiries/').html);
	});
});
