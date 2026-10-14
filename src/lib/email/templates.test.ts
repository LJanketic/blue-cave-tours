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

describe('booking emails (§9.4, S-5)', () => {
	const paid = {
		id: 'b1', ref: 'HBC-7K3QXM', createdAt: '2027-07-01T10:00:00Z', updatedAt: '2027-07-01T10:00:00Z',
		status: 'confirmed', paymentStatus: 'paid', paymentProvider: 'teya', paymentRef: 'T', paidAt: '2027-07-01T10:00:00Z',
		tourSlug: 'blue-cave-hvar-5-islands', tourTitle: 'Blue Cave, Hvar & 5 islands', date: '2027-07-15', slot: '07:20',
		adults: 2, children: 1, infants: 1, total: 477,
		lineItems: [
			{ label: 'Adults', unit: 169, qty: 2, amount: 338 },
			{ label: 'Children', unit: 139, qty: 1, amount: 139 },
			{ label: 'Infants (free)', unit: 0, qty: 1, amount: 0 },
		],
		termsVersion: '2025-06-01', termsAcceptedAt: '2027-07-01T10:00:00Z',
		firstName: 'Ivan', lastName: 'Kovač', email: 'ivan@example.com', phone: '+385 91 000 0000',
		customerNotes: 'My son has a nut allergy', invoice: null, staffNotes: [], history: [],
	} as const;

	it('the confirmation states its terms as text: line items, fees, cancellation, withdrawal, complaints, version', async () => {
		const { bookingConfirmationEmail } = await import('./templates');
		const { text } = bookingConfirmationEmail(structuredClone(paid) as never, 'https://example.org');
		expect(text).toContain('2 adults, 1 child, 1 infant');
		expect(text).toContain('Adults (2 × €169): €338');
		expect(text).toContain('Blue Cave ticket, paid on site');
		expect(text).toContain('Free cancellation up to 48 hours');
		expect(text).toContain('right of withdrawal');
		expect(text).toContain('reply within 15 days');
		expect(text).toContain('terms of 2025-06-01');
	});

	it('never puts customer notes in an email body', async () => {
		const { adminBookingEmail, bookingConfirmationEmail } = await import('./templates');
		for (const email of [adminBookingEmail(structuredClone(paid) as never, 'admin@example.org', 'https://x/admin/'), bookingConfirmationEmail(structuredClone(paid) as never, 'https://x')]) {
			expect(email.html).not.toContain('nut allergy');
			expect(email.text).not.toContain('nut allergy');
		}
		expect(adminBookingEmail(structuredClone(paid) as never, 'a@b.co', 'https://x').text).toContain('Has notes, see admin');
	});
});
