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
});
