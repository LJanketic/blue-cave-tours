import { beforeEach, describe, expect, it } from 'vitest';
import { RETENTION_DAYS, sweepPersonalData } from './service';
import { bookings, enquiries, outbox, resetMemoryStore, type Booking } from './store';

const base = {
	ref: 'HBC-AAAAAA', createdAt: '2027-01-01T00:00:00Z', updatedAt: '2027-01-01T00:00:00Z', status: 'completed', paymentStatus: 'paid',
	paymentProvider: 'teya', paymentRef: 'T', paidAt: '2027-01-01T00:00:00Z', tourSlug: 'blue-lagoon-morning', tourTitle: 'Blue Lagoon',
	slot: '09:30', adults: 2, children: 0, infants: 0, total: 150, firstName: 'A', lastName: 'B', email: 'a@b.co', phone: '+385 1',
	customerNotes: 'allergy', invoice: null, staffNotes: [], history: [],
} as const;

describe('retention sweep (S-13)', () => {
	beforeEach(() => resetMemoryStore());

	it('drops notes after 30 days and phones after 90, keeping what accounting needs', async () => {
		const now = new Date('2027-07-01T10:00:00Z');
		await bookings().put({ ...base, id: 'recent', date: '2027-06-20' } as unknown as Booking);
		await bookings().put({ ...base, id: 'notes-gone', date: '2027-05-01' } as unknown as Booking);
		await bookings().put({ ...base, id: 'both-gone', date: '2027-03-01' } as unknown as Booking);
		await sweepPersonalData(now);
		const [recent, notesGone, bothGone] = await Promise.all(['recent', 'notes-gone', 'both-gone'].map((id) => bookings().get(id)));
		expect(recent).toMatchObject({ customerNotes: 'allergy', phone: '+385 1' });
		expect(recent?.personalDataRemovedAt).toBeUndefined();
		expect(notesGone).toMatchObject({ customerNotes: '', phone: '+385 1', ref: 'HBC-AAAAAA', total: 150 });
		expect(notesGone?.personalDataRemovedAt).toBe(now.toISOString());
		expect(bothGone).toMatchObject({ customerNotes: '', phone: '', firstName: 'A', total: 150 });
	});

	it(`deletes enquiries after ${RETENTION_DAYS.enquiry} days and trims old email bodies`, async () => {
		const now = new Date('2027-07-01T10:00:00Z');
		const enquiry = { name: 'N', email: 'n@x.co', phone: '', tourSlug: '', message: 'hello there' };
		await enquiries().put({ ...enquiry, id: 'old', createdAt: '2026-06-01T00:00:00Z', status: 'closed' });
		await enquiries().put({ ...enquiry, id: 'new', createdAt: '2027-06-01T00:00:00Z', status: 'new' });
		const mail = { kind: 'admin_enquiry', to: 'a@b.co', replyTo: null, subject: 'S', relatedId: null, delivery: 'outbox' } as const;
		await outbox().put({ ...mail, id: 'm-old', createdAt: '2027-03-01T00:00:00Z', html: '<p>x</p>', text: 'x' });
		await outbox().put({ ...mail, id: 'm-new', createdAt: '2027-06-20T00:00:00Z', html: '<p>y</p>', text: 'y' });
		expect(await sweepPersonalData(now)).toEqual({ bookings: 0, enquiries: 1, emails: 1 });
		expect((await enquiries().list()).map((e) => e.id)).toEqual(['new']);
		expect(await outbox().get('m-old')).toMatchObject({ html: '', text: '', subject: 'S' });
		expect(await outbox().get('m-new')).toMatchObject({ text: 'y' });
	});

	it(`deletes never-paid bookings ${RETENTION_DAYS.unpaidBooking} days after the trip, with their emails`, async () => {
		const now = new Date('2027-07-01T10:00:00Z');
		const unpaid = { ...base, status: 'pending_payment', paymentStatus: 'unpaid', paymentProvider: null, paymentRef: null, paidAt: null };
		await bookings().put({ ...unpaid, id: 'abandoned', date: '2027-05-01' } as unknown as Booking);
		await bookings().put({ ...unpaid, id: 'failed', paymentStatus: 'failed', date: '2027-05-01' } as unknown as Booking);
		await bookings().put({ ...unpaid, id: 'still-open', date: '2027-06-20' } as unknown as Booking);
		await bookings().put({ ...base, id: 'paid-old', date: '2027-05-01' } as unknown as Booking);
		const mail = { kind: 'admin_booking', to: 'staff@x.co', replyTo: 'a@b.co', subject: 'S', html: '<p>x</p>', text: 'x', delivery: 'outbox' } as const;
		await outbox().put({ ...mail, id: 'm-abandoned', createdAt: '2027-04-20T00:00:00Z', relatedId: 'abandoned' });
		await outbox().put({ ...mail, id: 'm-paid', createdAt: '2027-06-25T00:00:00Z', relatedId: 'paid-old' });
		await sweepPersonalData(now);
		expect((await bookings().list()).map((b) => b.id).sort()).toEqual(['paid-old', 'still-open']);
		expect(await outbox().get('m-abandoned')).toBeNull();
		expect(await outbox().get('m-paid')).toMatchObject({ replyTo: 'a@b.co', text: 'x' });
	});

	it('deletes the notification email with its enquiry, and drops reply-to and errors from old emails', async () => {
		const now = new Date('2027-07-01T10:00:00Z');
		await enquiries().put({ id: 'old', name: 'Ana', email: 'ana@x.co', phone: '', tourSlug: '', message: 'hello there', createdAt: '2026-06-01T00:00:00Z', status: 'closed' });
		const mail = { to: 'staff@x.co', html: '<p>x</p>', text: 'x', delivery: 'failed', deliveryError: 'bad ana@x.co' } as const;
		await outbox().put({ ...mail, id: 'm-enquiry', kind: 'admin_enquiry', replyTo: 'ana@x.co', subject: 'New enquiry from Ana', relatedId: 'old', createdAt: '2026-06-01T00:00:00Z' });
		await outbox().put({ ...mail, id: 'm-booking', kind: 'admin_booking', replyTo: 'b@x.co', subject: 'New booking', relatedId: 'kept', createdAt: '2027-03-01T00:00:00Z' });
		await sweepPersonalData(now);
		expect(await outbox().get('m-enquiry')).toBeNull();
		const trimmed = await outbox().get('m-booking');
		expect(trimmed).toMatchObject({ html: '', text: '', replyTo: null, subject: 'New booking' });
		expect(trimmed?.deliveryError).toBeUndefined();
	});
});
