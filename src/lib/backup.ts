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
 * record lingering here for up to a week should be stated there too.
 *
 * Size (W0 review S4): only what can't be rebuilt goes in. Outbox emails keep
 * their metadata (who, what, when, delivery) but not their HTML and text
 * bodies, which were most of each snapshot's bytes. The capacity ledgers and
 * the booking-ref index are left out: both are rebuilt from the bookings
 * (the ledgers by the capacity backfill, which a restore triggers because the
 * backfill marker is left out of `meta` too).
 *
 * Like store.ts, this module avoids Astro-only imports, so Netlify's function
 * bundler can build it.
 */

/**
 * Every store that holds business data that can't be rebuilt. Left out:
 * rate-limits (hashed, same-day only), backups itself, and what is rebuilt
 * from the bookings: 'capacity' (the seat ledgers) and 'booking-refs'.
 */
export const BACKUP_STORES = ['bookings', 'enquiries', 'outbox', 'counters', 'meta'] as const;
export const BACKUP_STORE = 'backups';
export const BACKUPS_KEPT = 7;
/** Reads in flight at once, so a large store doesn't open thousands of requests together. */
export const BACKUP_READ_CONCURRENCY = 24;

/** In `meta`: the capacity backfill's marker (capacity.ts). Left out so a restored site rebuilds its ledgers. */
const SKIPPED_KEYS: Partial<Record<(typeof BACKUP_STORES)[number], string[]>> = { meta: ['capacity-ledgers-backfilled'] };
/** Outbox fields left out of the snapshot: the rendered bodies. */
const OUTBOX_BODY_FIELDS = ['html', 'text'];

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

/** `run` over every item, at most `limit` at a time, results in input order. */
async function mapLimit<T, R>(items: T[], limit: number, run: (item: T) => Promise<R>): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			const index = next++;
			results[index] = await run(items[index]);
		}
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return results;
}

function slim(name: (typeof BACKUP_STORES)[number], value: unknown): unknown {
	if (name !== 'outbox' || !value || typeof value !== 'object') return value;
	const copy = { ...(value as Record<string, unknown>) };
	for (const field of OUTBOX_BODY_FIELDS) delete copy[field];
	return copy;
}

async function readAll(name: (typeof BACKUP_STORES)[number], store: BackupStore): Promise<Record<string, unknown>> {
	const skipped = SKIPPED_KEYS[name] ?? [];
	const { blobs } = await store.list();
	const keys = blobs.map(({ key }) => key).filter((key) => !skipped.includes(key));
	const entries = await mapLimit(keys, BACKUP_READ_CONCURRENCY, async (key) => [key, slim(name, await store.get(key, { type: 'json' }))] as const);
	return Object.fromEntries(entries.filter(([, value]) => value !== null));
}

export async function writeBackup(
	open: OpenStore = openBlobsStore,
	now: Date = new Date(),
): Promise<{ key: string; records: number; deleted: string[] }> {
	const stores: Snapshot['stores'] = {};
	let records = 0;
	for (const name of BACKUP_STORES) {
		stores[name] = await readAll(name, open(name));
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
