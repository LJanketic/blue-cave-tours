import { beforeEach, describe, expect, it } from 'vitest';
import { getTourBySlug } from '../tours';
import type { TourDetail } from '../../types/tour';
import { ADMIN_NOTIFY_DAILY_CAP, ADMIN_NOTIFY_PER_REF_DAILY_CAP, createPendingBooking, notifyCapKind, recordEnquiry } from './service';
import { bookingRefs, enquiries, outbox, resetMemoryStore } from './store';

const input = { name: 'Jane Smith', email: 'jane@example.com', phone: '', tourSlug: '', message: 'Hello there, a question.' };

describe('admin notification cap (S-6)', () => {
	beforeEach(() => resetMemoryStore());

	it(`emails the first ${ADMIN_NOTIFY_DAILY_CAP} enquiries of a day, then only stores them`, async () => {
		const day = new Date('2026-07-01T10:00:00Z');
		for (let i = 0; i < ADMIN_NOTIFY_DAILY_CAP + 2; i++) await recordEnquiry(input, 'http://localhost', day);
		const stored = await enquiries().list();
		expect(stored).toHaveLength(ADMIN_NOTIFY_DAILY_CAP + 2);
		expect(stored.filter((e) => e.notified === false)).toHaveLength(2);
		expect((await outbox().list()).filter((m) => m.kind === 'admin_enquiry')).toHaveLength(ADMIN_NOTIFY_DAILY_CAP);

		// A new day starts a new count.
		const next = await recordEnquiry(input, 'http://localhost', new Date('2026-07-02T08:00:00Z'));
		expect(next.notified).toBe(true);
	});

	async function realRef(): Promise<string> {
		const tour = getTourBySlug('blue-cave-hvar-5-islands') as TourDetail;
		const result = await createPendingBooking(
			tour,
			{ date: '2027-07-15', slot: '07:20', adults: 2, children: 0, infants: 0, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', phone: '', notes: null },
			new Date('2027-06-01T10:00:00Z'),
		);
		if (!result.ok) throw new Error(result.error);
		return result.booking.ref;
	}

	it('counts each kind on its own: a contact flood leaves charter messages and messages about a real booking emailed (S5)', async () => {
		const ref = await realRef();
		const day = new Date('2026-07-03T10:00:00Z');
		for (let i = 0; i < ADMIN_NOTIFY_DAILY_CAP + 5; i++) await recordEnquiry(input, 'http://localhost', day);
		const charter = await recordEnquiry({ ...input, kind: 'charter', topic: 'charter' }, 'http://localhost', day);
		const byRef = await recordEnquiry({ ...input, topic: 'change', bookingRef: ref }, 'http://localhost', day);
		expect([charter.notified, byRef.notified]).toEqual([true, true]);
		expect((await recordEnquiry(input, 'http://localhost', day)).notified).toBe(false);
	});

	it('a flood can not use the booking count by typing a topic or a made-up ref', async () => {
		const day = new Date('2026-07-04T10:00:00Z');
		for (let i = 0; i < ADMIN_NOTIFY_DAILY_CAP; i++) await recordEnquiry({ ...input, topic: 'change', bookingRef: 'HBC-7K3QXM' }, 'http://localhost', day);
		// All of those counted as contact messages: the contact count is used up, the booking count isn't.
		expect((await recordEnquiry(input, 'http://localhost', day)).notified).toBe(false);
		expect((await recordEnquiry({ ...input, bookingRef: await realRef() }, 'http://localhost', day)).notified).toBe(true);
	});

	it('sorts messages into charter, booking and contact counts', async () => {
		const ref = await realRef();
		const email = 'jane@example.com';
		expect(await notifyCapKind({ kind: 'charter', topic: 'charter', email })).toBe('charter');
		// A contact message on the charter topic is still a contact message, not the charter form.
		expect(await notifyCapKind({ kind: 'contact', topic: 'charter', email })).toBe('contact');
		expect(await notifyCapKind({ topic: 'general', bookingRef: ref, email })).toBe('booking');
		// The topic alone, or a ref that names no booking, is a contact message.
		expect(await notifyCapKind({ topic: 'change', email })).toBe('contact');
		expect(await notifyCapKind({ topic: 'change', bookingRef: 'HBC-7K3QXM', email })).toBe('contact');
		expect(await notifyCapKind({ email })).toBe('contact');
	});

	it("uses the booking count only when the sender's email is the booking's (review S2)", async () => {
		const ref = await realRef();
		// The same address, typed with other case and spaces, still matches.
		expect(await notifyCapKind({ topic: 'change', bookingRef: ref, email: '  Jane@Example.COM ' })).toBe('booking');
		// Someone quoting a ref that isn't theirs (or their own booking's ref from another address) is a contact message.
		expect(await notifyCapKind({ topic: 'change', bookingRef: ref, email: 'someone@example.org' })).toBe('contact');
		expect(await notifyCapKind({ topic: 'change', bookingRef: ref, email: '' })).toBe('contact');
	});

	it('a flood quoting a real ref from another address can not use up the booking count', async () => {
		const ref = await realRef();
		const day = new Date('2026-07-05T10:00:00Z');
		for (let i = 0; i < ADMIN_NOTIFY_DAILY_CAP; i++) await recordEnquiry({ ...input, email: 'flood@example.org', topic: 'change', bookingRef: ref }, 'http://localhost', day);
		expect((await recordEnquiry({ ...input, email: 'other@example.org' }, 'http://localhost', day)).notified).toBe(false);
		// The real guest, from their booking's address, still reaches the admin.
		expect((await recordEnquiry({ ...input, topic: 'change', bookingRef: ref }, 'http://localhost', day)).notified).toBe(true);
	});

	it(`uses the booking count for ${ADMIN_NOTIFY_PER_REF_DAILY_CAP} messages per booking a day, then the contact count`, async () => {
		const ref = await realRef();
		const day = new Date('2026-07-06T10:00:00Z');
		// The contact count is used up, so a message past the per-booking cap is stored but not emailed.
		for (let i = 0; i < ADMIN_NOTIFY_DAILY_CAP; i++) await recordEnquiry({ ...input, email: 'other@example.org' }, 'http://localhost', day);
		const byRef = { ...input, topic: 'change' as const, bookingRef: ref };
		for (let i = 0; i < ADMIN_NOTIFY_PER_REF_DAILY_CAP; i++) expect((await recordEnquiry(byRef, 'http://localhost', day)).notified).toBe(true);
		expect((await recordEnquiry(byRef, 'http://localhost', day)).notified).toBe(false);
		// The next day the booking count starts again.
		expect((await recordEnquiry(byRef, 'http://localhost', new Date('2026-07-07T10:00:00Z'))).notified).toBe(true);
	});

	it('checks a ref with the ref index, and only for a booking that still exists', async () => {
		const ref = await realRef();
		const about = (bookingRef: string | undefined) => notifyCapKind({ kind: 'contact', topic: 'change', bookingRef, email: 'jane@example.com' });
		expect(await about(ref)).toBe('booking');
		expect(await about('not-a-ref')).toBe('contact');
		expect(await about(undefined)).toBe('contact');
		await bookingRefs().put({ id: 'HBC-ABCDEF', bookingId: crypto.randomUUID() });
		expect(await about('HBC-ABCDEF')).toBe('contact');
	});
});
