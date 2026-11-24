import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTourBySlug } from '../tours';
import type { TourDetail } from '../../types/tour';

/**
 * The capacity ledger's compare-and-swap against a stand-in for Netlify
 * Blobs (S6): the other capacity tests run on the in-memory fallback, which
 * never takes this path. Etags change on every write, and onlyIfMatch /
 * onlyIfNew behave as Blobs documents them. Two module instances (two
 * function instances, each with its own in-process lock) share the one store.
 */
const blobs = vi.hoisted(() => {
	type Entry = { data: unknown; etag: string };
	const stores = new Map<string, Map<string, Entry>>();
	const state = {
		stores,
		ops: [] as string[],
		etags: 0,
		/** Every write loses its compare-and-swap, as if someone always wrote first. */
		loseEveryWrite: false,
		/** Holds reads back until this many are waiting, so concurrent writers all read the same version. */
		barrier: null as null | { target: number; waiting: (() => void)[] },
		/** Ledger reads take a moment, and the most in flight at once is recorded. */
		slowReads: false,
		reading: 0,
		maxReading: 0,
		/** Runs once, on the next listing of the ledgers: something that happens in the middle of a rebuild. */
		onLedgerList: null as null | (() => void),
	};
	const bucket = (name: string) => {
		if (!stores.has(name)) stores.set(name, new Map());
		return stores.get(name) as Map<string, Entry>;
	};
	const arrive = async () => {
		const barrier = state.barrier;
		if (!barrier) return;
		await new Promise<void>((resolve) => {
			barrier.waiting.push(resolve);
			if (barrier.waiting.length >= barrier.target) {
				state.barrier = null;
				for (const go of barrier.waiting) go();
			}
		});
	};
	return { state, bucket, arrive };
});

vi.mock('@netlify/blobs', () => ({
	getStore: ({ name }: { name: string }) => {
		const entries = blobs.bucket(name);
		return {
			get: async (key: string) => {
				blobs.state.ops.push(`${name}.get`);
				const entry = entries.get(key);
				return entry ? structuredClone(entry.data) : null;
			},
			getWithMetadata: async (key: string) => {
				blobs.state.ops.push(`${name}.getWithMetadata`);
				if (blobs.state.slowReads && name === 'capacity') {
					blobs.state.maxReading = Math.max(blobs.state.maxReading, ++blobs.state.reading);
					await new Promise((resolve) => setTimeout(resolve, 2));
					blobs.state.reading--;
				}
				const entry = entries.get(key);
				const read = entry ? { data: structuredClone(entry.data), etag: entry.etag } : null;
				await blobs.arrive();
				return read;
			},
			setJSON: async (key: string, value: unknown, options: { onlyIfMatch?: string; onlyIfNew?: boolean } = {}) => {
				blobs.state.ops.push(`${name}.setJSON`);
				const entry = entries.get(key);
				if (blobs.state.loseEveryWrite) return { modified: false };
				if (options.onlyIfNew && entry) return { modified: false };
				if (options.onlyIfMatch && entry?.etag !== options.onlyIfMatch) return { modified: false };
				const etag = `"e${++blobs.state.etags}"`;
				entries.set(key, { data: structuredClone(value), etag });
				return { modified: true, etag };
			},
			list: async () => {
				blobs.state.ops.push(`${name}.list`);
				const hook = name === 'capacity' ? blobs.state.onLedgerList : null;
				if (hook) {
					blobs.state.onLedgerList = null;
					hook();
				}
				return { blobs: [...entries.keys()].map((key) => ({ key })) };
			},
			delete: async (key: string) => {
				blobs.state.ops.push(`${name}.delete`);
				entries.delete(key);
			},
		};
	},
}));

type Store = typeof import('./store');

/** A fresh copy of the store module: another function instance, with its own lock. */
async function instance(): Promise<Store> {
	vi.resetModules();
	return import('./store');
}

const LEDGER = 'seats:blue-cave-hvar-5-islands|2027-07-15|07:20';
const claim = (bookingId: string, seats: number) => (ledger: { id: string; claims: Record<string, { seats: number; at: string }> }) => ({
	...ledger,
	claims: { ...ledger.claims, [bookingId]: { seats, at: '2027-06-01T10:00:00.000Z' } },
});

beforeEach(() => {
	blobs.state.stores.clear();
	blobs.state.ops.length = 0;
	blobs.state.loseEveryWrite = false;
	blobs.state.barrier = null;
	blobs.state.slowReads = false;
	blobs.state.reading = 0;
	blobs.state.maxReading = 0;
	blobs.state.onLedgerList = null;
});

describe('capacity ledger compare-and-swap on Blobs (S6)', () => {
	it('two instances writing the same ledger at once: both claims land, none is lost', async () => {
		const a = await instance();
		const b = await instance();
		await a.updateLedger(LEDGER, claim('first', 1));
		// Both read the ledger holding "first" before either writes.
		blobs.state.barrier = { target: 2, waiting: [] };
		await Promise.all([a.updateLedger(LEDGER, claim('ana', 2)), b.updateLedger(LEDGER, claim('bo', 3))]);
		const stored = await a.readLedger(LEDGER);
		expect(Object.keys(stored?.claims ?? {}).sort()).toEqual(['ana', 'bo', 'first']);
		// The loser's first write was refused, then it read again and wrote: three writes for two claims.
		expect(blobs.state.ops.filter((op) => op === 'capacity.setJSON')).toHaveLength(1 + 3);
	});

	it('two instances creating the same ledger at once (onlyIfNew): the second retries on the first one`s ledger', async () => {
		const a = await instance();
		const b = await instance();
		blobs.state.barrier = { target: 2, waiting: [] };
		const [ra, rb] = await Promise.all([a.updateLedger(LEDGER, claim('ana', 2)), b.updateLedger(LEDGER, claim('bo', 3))]);
		expect(Object.keys((await a.readLedger(LEDGER))?.claims ?? {}).sort()).toEqual(['ana', 'bo']);
		// Each call returns what it wrote: the one that retried holds both claims.
		expect([Object.keys(ra.ledger.claims).length, Object.keys(rb.ledger.claims).length].sort()).toEqual([1, 2]);
	});

	it('gives up with an error when every compare-and-swap is lost', async () => {
		const a = await instance();
		blobs.state.loseEveryWrite = true;
		await expect(a.updateLedger(LEDGER, claim('ana', 2))).rejects.toThrow(/capacity .*too many concurrent writes/);
		expect(blobs.state.ops.filter((op) => op === 'capacity.setJSON')).toHaveLength(8);
	});

	it('a seed that is out of date costs one refused write, then the ledger is read and the claim lands', async () => {
		const a = await instance();
		await a.updateLedger(LEDGER, claim('first', 1));
		const seed = await a.readLedgerVersion(LEDGER);
		await a.updateLedger(LEDGER, claim('meanwhile', 1));
		blobs.state.ops.length = 0;
		await a.updateLedger(LEDGER, claim('late', 2), seed);
		expect(Object.keys((await a.readLedger(LEDGER))?.claims ?? {}).sort()).toEqual(['first', 'late', 'meanwhile']);
		expect(blobs.state.ops).toEqual(['capacity.setJSON', 'capacity.getWithMetadata', 'capacity.setJSON', 'capacity.get']);
	});

	it('never trusts a seed without an etag, even one that found no ledger: it reads first (round 2, nit c)', async () => {
		const a = await instance();
		await a.updateLedger(LEDGER, claim('first', 1));
		blobs.state.ops.length = 0;
		// "Nothing there", read before the ledger was written. Trusted, releasing "first" would find no claim,
		// change nothing and never write: the release would be lost.
		const release = (ledger: { id: string; claims: Record<string, { seats: number; at: string }> }) => {
			if (!ledger.claims.first) return null;
			const { first: _released, ...claims } = ledger.claims;
			return { ...ledger, claims };
		};
		const result = await a.updateLedger(LEDGER, release, { ledger: null });
		expect(result.ledger.claims).toEqual({});
		expect(blobs.state.ops).toEqual(['capacity.getWithMetadata', 'capacity.setJSON']);
		expect((await a.readLedger(LEDGER))?.claims).toEqual({});
		// A stale ledger without an etag: read, not written blind.
		blobs.state.ops.length = 0;
		await a.updateLedger(LEDGER, claim('second', 1), { ledger: { id: LEDGER, claims: {} } });
		expect(blobs.state.ops).toEqual(['capacity.getWithMetadata', 'capacity.setJSON']);
		expect(Object.keys((await a.readLedger(LEDGER))?.claims ?? {})).toEqual(['second']);
	});
});

describe('Blobs operations of a payment (S10)', () => {
	it('a warm instance reads the ledger once on the pay page and once to pay, and the backfill marker not at all', async () => {
		vi.resetModules();
		const service = await import('./service');
		const capacity = await import('./capacity');
		const tour = getTourBySlug('blue-cave-hvar-5-islands') as TourDetail;
		const NOW = new Date('2027-06-01T10:00:00Z');
		const input = { date: '2027-07-15', slot: '07:20', adults: 2, children: 0, infants: 0, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', phone: '', notes: null };
		// Warm: an earlier booking and payment, so this instance has seen the marker and the ledger exists.
		const warm = await service.createPendingBooking(tour, input, NOW);
		if (!warm.ok) throw new Error(warm.error);
		await service.finalizePaidBooking(warm.booking.id, 'teya', 'T-0', 'https://example.test', NOW);
		const made = await service.createPendingBooking(tour, { ...input, firstName: 'Kim' }, NOW);
		if (!made.ok) throw new Error(made.error);

		blobs.state.ops.length = 0;
		// The pay page's check, then the payment (src/pages/booking/pay.astro).
		await capacity.capacityError(made.booking, NOW, made.booking.id);
		const paid = await service.finalizePaidBooking(made.booking.id, 'teya', 'T-1', 'https://example.test', NOW);
		expect(paid?.paymentStatus).toBe('paid');
		const ledgerOps = blobs.state.ops.filter((op) => op.startsWith('capacity.') || op.startsWith('meta.'));
		// Before S10: meta.get ×2, capacity.get ×2, capacity.getWithMetadata ×2, capacity.setJSON ×2 (8).
		expect(ledgerOps.sort()).toEqual(['capacity.get', 'capacity.getWithMetadata', 'capacity.setJSON', 'capacity.setJSON']);
		// Both payments hold their seats: 4 of 14 taken, so 11 more don't fit.
		expect(await capacity.capacityError({ ...made.booking, adults: 11 }, NOW)).toBe('full');
		expect(await capacity.capacityError({ ...made.booking, adults: 10 }, NOW)).toBeNull();
	});
});

describe('rebuild capacity from bookings on Blobs (round 2, N5 and nit c)', () => {
	const NOW = new Date('2027-06-01T10:00:00Z');
	const at = NOW.toISOString();

	it('rebuilds a bounded number of ledgers at a time', async () => {
		vi.resetModules();
		const store = await import('./store');
		const capacity = await import('./capacity');
		for (let n = 1; n <= 40; n++) {
			await store.updateLedger(`seats:tour-${n}|2027-07-15|07:20`, (ledger) => ({ ...ledger, claims: { gone: { seats: 1, at, paid: true } } }));
		}
		blobs.state.slowReads = true;
		const result = await capacity.rebuildLedgers(NOW);
		expect(result).toEqual({ ledgers: 40, claims: 0, removed: 40 });
		expect(blobs.state.maxReading).toBeGreaterThan(1);
		expect(blobs.state.maxReading).toBeLessThanOrEqual(capacity.REBUILD_CONCURRENCY);
		expect(capacity.REBUILD_CONCURRENCY).toBeGreaterThanOrEqual(8);
		expect(capacity.REBUILD_CONCURRENCY).toBeLessThanOrEqual(16);
	});

	it('keeps the claim of a booking paid after the bookings were listed: it checks the booking again', async () => {
		vi.resetModules();
		const store = await import('./store');
		const service = await import('./service');
		const capacity = await import('./capacity');
		const tour = getTourBySlug('blue-cave-hvar-5-islands') as TourDetail;
		const input = { date: '2027-07-15', slot: '07:20', adults: 2, children: 0, infants: 0, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', phone: '', notes: null };
		const late = await service.createPendingBooking(tour, input, NOW);
		const never = await service.createPendingBooking(tour, { ...input, firstName: 'Never' }, NOW);
		if (!late.ok || !never.ok) throw new Error('not created');
		// Both hold a paid claim the listing can't explain: the listing sees both unpaid.
		await store.updateLedger(LEDGER, (ledger) => ({
			...ledger,
			claims: { [late.booking.id]: { seats: 2, at, paid: true }, [never.booking.id]: { seats: 2, at, paid: true } },
		}));
		// Between the listing of the bookings and the ledger reads, one of them is paid.
		blobs.state.onLedgerList = () => {
			const entries = blobs.bucket('bookings');
			const entry = entries.get(late.booking.id) as { data: Record<string, unknown>; etag: string };
			entries.set(late.booking.id, { ...entry, data: { ...entry.data, paymentStatus: 'paid', status: 'confirmed', paidAt: at, paymentGate: capacity.PAYMENT_GATE } });
		};
		const result = await capacity.rebuildLedgers(NOW);
		const claims = (await store.readLedger(LEDGER))?.claims ?? {};
		expect(Object.keys(claims)).toEqual([late.booking.id]);
		expect(claims[late.booking.id]).toEqual({ seats: 2, at, paid: true });
		expect(result.removed).toBe(1);
	});
});
