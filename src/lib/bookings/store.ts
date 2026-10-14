import { getStore } from '@netlify/blobs';

/**
 * Storage for bookings, contact enquiries and the email outbox, one Netlify
 * Blobs store each, keyed by record id.
 *
 * Showcase scope: records are listed and filtered in memory, and writes are
 * last-write-wins. That's fine for a demo and for a few thousand records, but
 * seat counts aren't transactional, so this module is the seam to swap for a
 * real database (see docs/bookings-payments-email-backoffice-plan.md, Phase 1).
 *
 * Where Blobs isn't available (Vitest, or a server started without the Netlify
 * runtime) records live in process memory instead and vanish on restart.
 */

export type BookingStatus = 'pending_payment' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'refunded';
export type PaymentProvider = 'teya' | 'paypal';

export type HistoryEntry = { at: string; by: string; action: string };

export type DemoInvoice = {
	number: string;
	jir: string;
	zki: string;
	issuedAt: string;
};

export type Booking = {
	id: string;
	ref: string;
	createdAt: string;
	updatedAt: string;
	status: BookingStatus;
	paymentStatus: PaymentStatus;
	paymentProvider: PaymentProvider | null;
	paymentRef: string | null;
	paidAt: string | null;
	/** Set when staff put a cancelled, paid booking back: from then on it takes seats again. */
	seatsSince?: string;
	/**
	 * The latest customer confirmation email: when it was created and whether it
	 * went out. Kept on the booking (like an order timeline) so the success page
	 * reads one record instead of searching every email.
	 */
	confirmationEmail?: { delivery: 'outbox' | 'sent' | 'failed'; at: string };
	/** Ids of this booking's emails in the outbox, so its admin page loads just those. */
	emailIds?: string[];
	tourSlug: string;
	tourTitle: string;
	date: string;
	slot: string;
	adults: number;
	children: number;
	/** Euros, recomputed on the server from the tour's price data. */
	total: number;
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	customerNotes: string;
	invoice: DemoInvoice | null;
	staffNotes: { at: string; by: string; text: string }[];
	history: HistoryEntry[];
	/** Created by the admin's "Load demo data" button. */
	sample?: boolean;
};

export type EnquiryStatus = 'new' | 'replied' | 'closed';

export type Enquiry = {
	id: string;
	createdAt: string;
	status: EnquiryStatus;
	name: string;
	email: string;
	phone: string;
	tourSlug: string;
	message: string;
	/** The Subject the sender picked (PR 6); older records have none. */
	topic?: import('../contact-validation').ContactTopic;
	/** For cancellations and changes; confirmed only by email to the booking's address. */
	bookingRef?: string;
	/** False when the daily cap on admin notification emails was reached (S-6): stored, not emailed. */
	notified?: boolean;
	sample?: boolean;
};

export type OutboxEmail = {
	id: string;
	createdAt: string;
	kind: 'booking_confirmation' | 'admin_booking' | 'admin_enquiry';
	to: string;
	replyTo: string | null;
	subject: string;
	html: string;
	text: string;
	relatedId: string | null;
	/** 'outbox' = recorded only; 'sent'/'failed' = a real provider was configured and tried. */
	delivery: 'outbox' | 'sent' | 'failed';
	deliveryError?: string;
};

/** What `mutate` returns: the new record to save, or null to leave it unchanged. */
export type Mutation<T> = (current: T) => T | null;
export type UpdateResult<T> = { record: T | null; written: boolean };

type Collection<T extends { id: string }> = {
	get(id: string): Promise<T | null>;
	put(record: T): Promise<void>;
	/**
	 * Read-modify-write that can't lose a concurrent change: the write only
	 * lands if nobody else wrote since the read (compare-and-swap on the blob's
	 * etag), otherwise it re-reads and runs `mutate` again. `written` tells the
	 * caller whether *this* call made the change, so side effects such as
	 * emails run exactly once even when two requests race.
	 */
	update(id: string, mutate: Mutation<T>): Promise<UpdateResult<T>>;
	list(): Promise<T[]>;
	delete(id: string): Promise<void>;
};

const MAX_CAS_ATTEMPTS = 8;
const memory = new Map<string, Map<string, unknown>>();

/**
 * Serializes read-modify-writes of the same record within this server
 * process. Production relies on the etag compare-and-swap (atomic in Netlify
 * Blobs, and the only thing that works across function instances); this lock
 * additionally covers `astro dev`, whose local Blobs emulator doesn't apply
 * `onlyIfMatch` atomically, and costs nothing when there's no contention.
 */
const locks = new Map<string, Promise<unknown>>();
async function withLock<R>(key: string, task: () => Promise<R>): Promise<R> {
	const previous = locks.get(key) ?? Promise.resolve();
	const run = previous.then(task, task);
	const settled = run.catch(() => undefined);
	locks.set(key, settled);
	try {
		return await run;
	} finally {
		if (locks.get(key) === settled) locks.delete(key);
	}
}

function memoryCollection<T extends { id: string }>(name: string): Collection<T> {
	const records = memory.get(name) ?? new Map<string, unknown>();
	memory.set(name, records);
	return {
		async get(id) {
			const record = records.get(id);
			return record ? (structuredClone(record) as T) : null;
		},
		async put(record) {
			records.set(record.id, structuredClone(record));
		},
		async update(id, mutate) {
			const current = records.get(id);
			if (!current) return { record: null, written: false };
			const next = mutate(structuredClone(current) as T);
			if (!next) return { record: structuredClone(current) as T, written: false };
			records.set(id, structuredClone(next));
			return { record: next, written: true };
		},
		async list() {
			return [...records.values()].map((record) => structuredClone(record) as T);
		},
		async delete(id) {
			records.delete(id);
		},
	};
}

function blobsCollection<T extends { id: string }>(name: string): Collection<T> | null {
	let store: ReturnType<typeof getStore>;
	try {
		store = getStore({ name: scopedName(name), consistency: 'strong' });
	} catch (error) {
		// Outside Netlify (Vitest, a plain Node server) there is no Blobs context.
		// In a production build that means bookings would silently vanish, so fail loudly.
		if (import.meta.env.PROD && !process.env.VITEST) throw error;
		return null;
	}
	return {
		async get(id) {
			return ((await store.get(id, { type: 'json' })) as T | null) ?? null;
		},
		async put(record) {
			await store.setJSON(record.id, record);
		},
		update(id, mutate) {
			return withLock(`${name}/${id}`, async () => {
				for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
					const current = await store.getWithMetadata(id, { type: 'json' });
					if (!current) return { record: null, written: false };
					const next = mutate(structuredClone(current.data) as T);
					if (!next) return { record: current.data as T, written: false };
					const { modified } = await store.setJSON(id, next, { onlyIfMatch: current.etag });
					if (modified) return { record: next, written: true };
				}
				throw new Error(`[store] ${name}/${id}: too many concurrent writes`);
			});
		},
		async list() {
			const { blobs } = await store.list();
			const records = await Promise.all(blobs.map(({ key }) => store.get(key, { type: 'json' })));
			return records.filter((record): record is T => record !== null);
		},
		async delete(id) {
			await store.delete(id);
		},
	};
}

/**
 * Blobs stores are site-wide: without this, deploy previews and branch
 * deploys would read and write production's bookings (and "Delete
 * everything" on a preview would wipe them). CONTEXT is Netlify's deploy
 * context, inlined at build time.
 */
function scopedName(name: string): string {
	const context = process.env.CONTEXT || import.meta.env.CONTEXT;
	return context && context !== 'production' ? `${name}--${context}` : name;
}

function collection<T extends { id: string }>(name: string): Collection<T> {
	return blobsCollection<T>(name) ?? memoryCollection<T>(name);
}

export const bookings = () => collection<Booking>('bookings');
export const enquiries = () => collection<Enquiry>('enquiries');
export const outbox = () => collection<OutboxEmail>('outbox');

type Counter = { id: string; value: number };
const counters = () => collection<Counter>('counters');

/**
 * Next value of a named counter, starting at 1. Each call gets a distinct
 * number even under concurrent requests, with no gaps from lost races, which
 * is what invoice numbering needs.
 */
export function nextCounterValue(name: string): Promise<number> {
	return withLock(`counter:${name}`, () => incrementCounter(name));
}

async function incrementCounter(name: string): Promise<number> {
	const store = counters();
	for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
		const { record, written } = await store.update(name, (c) => ({ ...c, value: c.value + 1 }));
		if (written && record) return record.value;
		if (!record) {
			// First use. Two first callers can race here: only one create wins, the other retries the update.
			if (await createIfMissing(name)) return 1;
		}
	}
	throw new Error(`[store] counter ${name}: too many concurrent writes`);
}

async function createIfMissing(name: string): Promise<boolean> {
	const blobs = (() => {
		try {
			return getStore({ name: scopedName('counters'), consistency: 'strong' });
		} catch {
			return null;
		}
	})();
	const initial: Counter = { id: name, value: 1 };
	if (!blobs) {
		const store = counters();
		if (await store.get(name)) return false;
		await store.put(initial);
		return true;
	}
	const { modified } = await blobs.setJSON(name, initial, { onlyIfNew: true });
	return modified;
}

export async function resetCounter(name: string): Promise<void> {
	await counters().delete(name);
}

/** Newest first. */
export function byCreatedDesc<T extends { createdAt: string }>(a: T, b: T): number {
	return b.createdAt.localeCompare(a.createdAt);
}

/** Test helper: empties the in-memory fallback. */
export function resetMemoryStore(): void {
	memory.clear();
}
