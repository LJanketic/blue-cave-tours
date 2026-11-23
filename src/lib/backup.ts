import { getStore } from '@netlify/blobs';
import { businessDate } from './bookings/dates';
import { scopedName } from './bookings/store';

/**
 * Nightly backup: one JSON snapshot of the business data, in its own Blobs
 * store (`backups`, scoped per deploy context like the rest), keyed by the
 * Split date. Run by the scheduled function netlify/functions/nightly.mts,
 * right after the retention sweep, so a snapshot never holds what the sweep
 * has just removed.
 *
 * Retention (GDPR, S-13): only the newest BACKUPS_KEPT snapshots are kept and
 * older ones are deleted on each run. So personal data the sweep removes from
 * the live stores is gone from the backups at most BACKUPS_KEPT days later.
 * That's a short, bounded technical copy for disaster recovery; the Privacy
 * page's retention periods count from the trip or the enquiry, and a deleted
 * record lingering here for up to two weeks should be stated there too.
 *
 * Like store.ts, this module avoids Astro-only imports, so Netlify's function
 * bundler can build it.
 */

/** Every store that holds business data. rate-limits (hashed, same-day only) and backups itself are left out. */
export const BACKUP_STORES = ['bookings', 'enquiries', 'outbox', 'counters', 'meta', 'capacity', 'booking-refs'] as const;
export const BACKUP_STORE = 'backups';
export const BACKUPS_KEPT = 14;

const BACKUP_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The part of a Netlify Blobs store this module uses; tests pass an in-memory one. */
export type BackupStore = {
	list(): Promise<{ blobs: { key: string }[] }>;
	get(key: string, options: { type: 'json' }): Promise<unknown>;
	setJSON(key: string, value: unknown): Promise<unknown>;
	delete(key: string): Promise<void>;
};
export type OpenStore = (name: string) => BackupStore;

export const openBlobsStore: OpenStore = (name) => getStore({ name: scopedName(name), consistency: 'strong' });

export type Snapshot = {
	version: 1;
	createdAt: string;
	/** Records by store, then by key, exactly as stored. */
	stores: Record<string, Record<string, unknown>>;
};

async function readAll(store: BackupStore): Promise<Record<string, unknown>> {
	const { blobs } = await store.list();
	const entries = await Promise.all(blobs.map(async ({ key }) => [key, await store.get(key, { type: 'json' })] as const));
	return Object.fromEntries(entries.filter(([, value]) => value !== null));
}

export async function writeBackup(
	open: OpenStore = openBlobsStore,
	now: Date = new Date(),
): Promise<{ key: string; records: number; deleted: string[] }> {
	const stores: Snapshot['stores'] = {};
	let records = 0;
	for (const name of BACKUP_STORES) {
		stores[name] = await readAll(open(name));
		records += Object.keys(stores[name]).length;
	}
	const key = businessDate(now);
	const backups = open(BACKUP_STORE);
	await backups.setJSON(key, { version: 1, createdAt: now.toISOString(), stores } satisfies Snapshot);
	// Keys are dates, so they sort by age. Anything else in the store is left alone.
	const { blobs } = await backups.list();
	const old = blobs
		.map((blob) => blob.key)
		.filter((k) => BACKUP_KEY_RE.test(k))
		.sort()
		.reverse()
		.slice(BACKUPS_KEPT);
	await Promise.all(old.map((k) => backups.delete(k)));
	return { key, records, deleted: old };
}
