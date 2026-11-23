import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BACKUPS_KEPT, BACKUP_STORES, writeBackup, type BackupStore, type OpenStore, type Snapshot } from './backup';
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
		expect(left[0]).toBe('2027-06-08');
		expect(left.at(-1)).toBe('2027-06-21');
		expect(result.deleted.sort()).toEqual(['2027-06-01', '2027-06-02', '2027-06-03', '2027-06-04', '2027-06-05', '2027-06-06', '2027-06-07']);
		expect(backups.get('notes')).toBe('keep me');
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
