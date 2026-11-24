import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BACKUPS_KEPT, BACKUP_READ_CONCURRENCY, BACKUP_STORES, writeBackup, type BackupStore, type OpenStore, type Snapshot } from './backup';
import { runNightly } from './nightly';
import { bookings, meta, resetMemoryStore, type Booking } from './bookings/store';

/** In-memory stand-ins for Blobs stores, by name. */
function fakeBlobs() {
	const stores = new Map<string, Map<string, unknown>>();
	const open: OpenStore = (name): BackupStore => {
		const data = stores.get(name) ?? new Map<string, unknown>();
		stores.set(name, data);
		return {
			async list() {
				return { blobs: [...data.keys()].map((key) => ({ key })) };
			},
			async get(key) {
				return data.has(key) ? structuredClone(data.get(key)) : null;
			},
			async setJSON(key, value) {
				data.set(key, structuredClone(value));
			},
			async delete(key) {
				data.delete(key);
			},
		};
	};
	return { stores, open };
}

describe('nightly backup', () => {
	it('writes one snapshot of every business store, keyed by the Split date', async () => {
		const { stores, open } = fakeBlobs();
		stores.set('bookings', new Map([['b1', { id: 'b1', ref: 'HBC-1' }]]));
		stores.set('counters', new Map([['invoice-2027', { id: 'invoice-2027', value: 7 }]]));
		stores.set('rate-limits', new Map([['contact:x', { count: 1 }]]));
		// 23:30 UTC on 30 June is already 1 July in Split.
		const result = await writeBackup(open, new Date('2027-06-30T23:30:00Z'));
		expect(result).toEqual({ key: '2027-07-01', records: 2, deleted: [] });
		const snapshot = stores.get('backups')?.get('2027-07-01') as Snapshot;
		expect(Object.keys(snapshot.stores)).toEqual([...BACKUP_STORES]);
		expect(snapshot.stores.bookings).toEqual({ b1: { id: 'b1', ref: 'HBC-1' } });
		expect(snapshot.stores.counters['invoice-2027']).toEqual({ id: 'invoice-2027', value: 7 });
		expect(snapshot.stores).not.toHaveProperty('rate-limits');
		expect(snapshot.createdAt).toBe('2027-06-30T23:30:00.000Z');
	});

	it(`keeps only the newest ${BACKUPS_KEPT} snapshots (retention), leaving other keys alone`, async () => {
		const { stores, open } = fakeBlobs();
		const backups = new Map<string, unknown>([['notes', 'keep me']]);
		for (let day = 1; day <= 20; day++) backups.set(`2027-06-${String(day).padStart(2, '0')}`, {});
		stores.set('backups', backups);
		const result = await writeBackup(open, new Date('2027-06-21T10:00:00Z'));
		const left = [...backups.keys()].filter((key) => key !== 'notes').sort();
		expect(left).toHaveLength(BACKUPS_KEPT);
		expect(BACKUPS_KEPT).toBe(7);
		expect(left[0]).toBe('2027-06-15');
		expect(left.at(-1)).toBe('2027-06-21');
		expect(result.deleted.sort()).toEqual(Array.from({ length: 14 }, (_, i) => `2027-06-${String(i + 1).padStart(2, '0')}`));
		expect(backups.get('notes')).toBe('keep me');
	});

	it('leaves out what is rebuilt from the bookings, and outbox bodies, keeping the email metadata', async () => {
		const { stores, open } = fakeBlobs();
		stores.set('capacity', new Map([['tour|2027-07-02', { id: 'tour|2027-07-02', claims: {} }]]));
		stores.set('booking-refs', new Map([['HBC-1', { id: 'HBC-1', bookingId: 'b1' }]]));
		stores.set(
			'meta',
			new Map<string, unknown>([
				['capacity-ledgers-backfilled', { id: 'capacity-ledgers-backfilled', value: '2026-11-24' }],
				['retention-sweep', { id: 'retention-sweep', value: '2027-07-01' }],
			]),
		);
		const email = {
			id: 'm1',
			createdAt: '2027-07-01T08:00:00Z',
			kind: 'booking_confirmation',
			to: 'a@example.com',
			replyTo: null,
			subject: 'Booked',
			html: '<p>x</p>',
			text: 'x',
			relatedId: 'b1',
			delivery: 'sent',
		};
		stores.set('outbox', new Map([['m1', email]]));
		await writeBackup(open, new Date('2027-07-01T10:00:00Z'));
		const snapshot = stores.get('backups')?.get('2027-07-01') as Snapshot;
		expect(snapshot.stores).not.toHaveProperty('capacity');
		expect(snapshot.stores).not.toHaveProperty('booking-refs');
		// Without the marker, a restored site runs the capacity backfill and rebuilds its ledgers.
		expect(Object.keys(snapshot.stores.meta)).toEqual(['retention-sweep']);
		const { html: _html, text: _text, ...metadata } = email;
		expect(snapshot.stores.outbox).toEqual({ m1: metadata });
		// The live outbox keeps its bodies.
		expect(stores.get('outbox')?.get('m1')).toMatchObject({ html: '<p>x</p>', text: 'x' });
	});

	it(`reads at most ${BACKUP_READ_CONCURRENCY} records at a time`, async () => {
		const { stores, open } = fakeBlobs();
		stores.set('bookings', new Map(Array.from({ length: 200 }, (_, i) => [`b${i}`, { id: `b${i}` }] as [string, unknown])));
		let inFlight = 0;
		let peak = 0;
		const slow: OpenStore = (name) => {
			const store = open(name);
			return {
				...store,
				async get(key, options) {
					inFlight++;
					peak = Math.max(peak, inFlight);
					await new Promise((resolve) => setTimeout(resolve, 1));
					inFlight--;
					return store.get(key, options);
				},
			};
		};
		const result = await writeBackup(slow, new Date('2027-07-01T10:00:00Z'));
		expect(result.records).toBe(200);
		expect(peak).toBe(BACKUP_READ_CONCURRENCY);
		expect(Object.keys((stores.get('backups')?.get('2027-07-01') as Snapshot).stores.bookings)).toHaveLength(200);
	});

	it('rewrites the same day’s snapshot when run twice', async () => {
		const { stores, open } = fakeBlobs();
		await writeBackup(open, new Date('2027-07-01T08:00:00Z'));
		stores.set('enquiries', new Map([['e1', { id: 'e1' }]]));
		await writeBackup(open, new Date('2027-07-01T09:00:00Z'));
		expect([...(stores.get('backups')?.keys() ?? [])]).toEqual(['2027-07-01']);
		expect((stores.get('backups')?.get('2027-07-01') as Snapshot).stores.enquiries).toEqual({ e1: { id: 'e1' } });
	});
});

describe('nightly run', () => {
	beforeEach(() => resetMemoryStore());

	it('sweeps first, marks the day swept (so the dashboard skips it), then backs up', async () => {
		const now = new Date('2027-07-01T00:00:00Z');
		const old = { id: 'old', date: '2027-03-01', paymentStatus: 'paid', invoice: null, customerNotes: 'allergy', phone: '+385 1' };
		await bookings().put(old as unknown as Booking);
		const { open, stores } = fakeBlobs();
		const result = await runNightly(now, open);
		expect(result.swept).toEqual({ bookings: 1, enquiries: 0, emails: 0 });
		expect(await meta().get('retention-sweep')).toMatchObject({ value: '2027-07-01' });
		expect(await bookings().get('old')).toMatchObject({ customerNotes: '', phone: '' });
		expect(result.backup).toMatchObject({ key: '2027-07-01' });
		expect(stores.get('backups')?.has('2027-07-01')).toBe(true);
	});

	it('still sweeps when the backup fails, then reports the failure', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const old = { id: 'old', date: '2027-03-01', paymentStatus: 'paid', invoice: null, customerNotes: 'allergy', phone: '' };
		await bookings().put(old as unknown as Booking);
		const broken: OpenStore = () => {
			throw new Error('no Blobs');
		};
		await expect(runNightly(new Date('2027-07-01T00:00:00Z'), broken)).rejects.toThrow('[nightly] failed');
		expect(await bookings().get('old')).toMatchObject({ customerNotes: '' });
		vi.restoreAllMocks();
	});
});
