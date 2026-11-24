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
/**
 * 'offline': staff confirmed the booking without an online payment (the guest
 * couldn't pay online yet), and the payment is arranged with staff. Nothing
 * was charged and no invoice is issued; it takes its seats like a paid
 * booking (capacity.ts takesSeats) and the retention sweep keeps it.
 */
export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'refunded' | 'offline';
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
	/** Under-3s: free, but they take a seat (D-9). 0 on records from before PR 7a (normalizeBooking). */
	infants: number;
	/** Euros, recomputed on the server from the tour's price data. */
	total: number;
	/** What the total is made of, as charged (PR 7a; derived for older records). */
	lineItems?: LineItem[];
	/** The terms the customer accepted (TERMS_VERSION) and when, set by the server (S-4). */
	termsVersion?: string;
	termsAcceptedAt?: string;
	/** Set by the retention sweep (S-13) once notes and phone were removed. */
	personalDataRemovedAt?: string;
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
	/** 'group' for older records (normalizeBooking): a seat on a shared boat. 'private' is a quoted charter, the whole boat. */
	kind?: 'group' | 'private';
	/** Private charters: the request this quote answers. */
	enquiryId?: string;
	/** Private charters: the quote can be paid until this moment (ISO). */
	quoteExpiresAt?: string;
	/** Private charters: hours, as quoted (or the tour's, for a private experience paid on the site). */
	durationHours?: number;
	/** Private experience paid on the site: the pick-up point, when it isn't the meeting point. */
	pickup?: string;
	/**
	 * When the guest reached the pay page while online payment wasn't open to
	 * them (notifyPaymentNotOpen): set once. From then on the booking is "waiting
	 * for confirmation" in the admin until staff confirm or cancel it.
	 */
	paymentNotOpenNotifiedAt?: string;
	/**
	 * Set when the payment went through although its departure (or the day's
	 * private boats) had just been sold out by another payment (capacity.ts).
	 * The payment is kept; staff move the guest or refund them.
	 */
	overbookedAtPayment?: string;
	/**
	 * Which payment code recorded the payment (PAYMENT_GATE in capacity.ts).
	 * Every payment finalizePaidBooking records from W0 on carries it. A paid
	 * booking without it, paid after GATE_CUTOVER, came through an outdated
	 * deploy (old deploy URLs still run the ungated checkout): it takes no
	 * seats, and the admin flags it for staff to check.
	 */
	paymentGate?: number;
};

/**
 * A private charter quote: staff priced a request and sent a payment link.
 * A private experience booked and paid on the site is private but no quote:
 * it has no request behind it and no expiry.
 */
export function isCharterQuote(booking: Pick<Booking, 'enquiryId' | 'quoteExpiresAt'>): boolean {
	return Boolean(booking.enquiryId || booking.quoteExpiresAt);
}

export type LineItem = { label: string; unit: number; qty: number; amount: number };

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
	/** 'contact' for older records (normalizeEnquiry); 'charter' for the private charter form (§8.2). */
	kind?: 'contact' | 'charter';
	/** What the charter form asked for (kind 'charter' only). */
	charter?: CharterRequestDetails;
	/** The unpaid or paid booking created by the latest quote. */
	quoteBookingId?: string;
	/** Set by the retention sweep (S-13). */
	personalDataRemovedAt?: string;
	sample?: boolean;
};

export type CharterRequestDetails = {
	/** A route id from src/config/charter.ts. */
	route: string;
	date: string;
	/** Preferred departure, "HH:MM". */
	time: string;
	durationHours: number;
	adults: number;
	children: number;
	infants: number;
	firstName: string;
	lastName: string;
	/** Asked for from a private experience booking: a pick-up place off our list, as typed. */
	pickup?: string;
	/** The extras chosen on that booking (ids in src/config/private.ts). */
	extras?: string[];
};

export type OutboxEmail = {
	id: string;
	createdAt: string;
	kind: 'booking_confirmation' | 'admin_booking' | 'admin_enquiry' | 'charter_quote';
	to: string;
	replyTo: string | null;
	subject: string;
	html: string;
	text: string;
	relatedId: string | null;
	/**
	 * Every booking whose personal details the email sets out, when that's more
	 * than one (the waiting-for-confirmation digest): the retention sweep
	 * deletes the email with any of them, as it does with `relatedId`.
	 */
	relatedIds?: string[];
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
		// import.meta.env is undefined in the nightly function's bundle (built without Vite).
		if (import.meta.env?.PROD && !process.env.VITEST) throw error;
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
export function scopedName(name: string): string {
	const context = deployContext();
	return context && context !== 'production' ? `${name}--${context}` : name;
}

/**
 * Netlify's deploy context ('production', 'deploy-preview', ...), or nothing
 * for `astro dev` and a local build. The same value picks the stores
 * (scopedName), so 'production' here means exactly "these are production's
 * bookings". The one place the deploy context is read: demo-access.ts,
 * email/send.ts and admin/auth-limits.ts use it too. The runtime value comes
 * first (tests stub it; the scheduled functions set it from their context),
 * then the value inlined at build time, which is what the site's function
 * has (Netlify doesn't give functions CONTEXT at runtime). import.meta.env is
 * undefined in the scheduled functions' bundles, hence the `?.`.
 */
export function deployContext(): string | undefined {
	return process.env.CONTEXT || import.meta.env?.CONTEXT || undefined;
}

function collection<T extends { id: string }>(name: string): Collection<T> {
	return blobsCollection<T>(name) ?? memoryCollection<T>(name);
}

/**
 * Records written before a field existed read as if it had its default, so
 * every new field is optional and additive: rolling back a deploy can still
 * read new records, and new code can read old ones (§9.4, §15.3).
 */
export function normalizeBooking(booking: Booking): Booking {
	const infants = booking.infants ?? 0;
	return { ...booking, infants, kind: booking.kind ?? 'group' };
}

export function normalizeEnquiry(enquiry: Enquiry): Enquiry {
	return { ...enquiry, kind: enquiry.kind ?? 'contact' };
}

function normalized<T extends { id: string }>(inner: Collection<T>, normalize: (record: T) => T): Collection<T> {
	return {
		async get(id) {
			const record = await inner.get(id);
			return record ? normalize(record) : null;
		},
		put: (record) => inner.put(record),
		async update(id, mutate) {
			const result = await inner.update(id, (record) => mutate(normalize(record)));
			return { ...result, record: result.record ? normalize(result.record) : null };
		},
		async list() {
			return (await inner.list()).map(normalize);
		},
		delete: (id) => inner.delete(id),
	};
}

export const bookings = () => normalized(collection<Booking>('bookings'), normalizeBooking);
export const enquiries = () => normalized(collection<Enquiry>('enquiries'), normalizeEnquiry);
export const outbox = () => collection<OutboxEmail>('outbox');
/** Small bookkeeping values, e.g. the day the retention sweep last ran. */
export type MetaRecord = { id: string; value: string };
export const meta = () => collection<MetaRecord>('meta');
/**
 * Booking ref (HBC-7K3QXM) → booking id, written with each booking, so a
 * contact message quoting a ref is checked with one read instead of a list.
 * Holds nothing personal. Bookings made before it existed have no entry.
 */
export type BookingRefRecord = { id: string; bookingId: string };
export const bookingRefs = () => collection<BookingRefRecord>('booking-refs');

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

/**
 * The seats and boats taken, per departure or per day
 * (src/lib/bookings/capacity.ts), keyed by booking id: the paid bookings that
 * hold them (`paid`, kept until staff cancel or refund), plus payments in
 * flight, which a payment writes before it marks its booking paid, so two
 * payments for the last seat can't both see it free. In-flight claims expire;
 * the writer prunes them.
 */
export type CapacityClaim = { seats: number; at: string; paid?: true };
export type CapacityLedger = { id: string; claims: Record<string, CapacityClaim> };
const ledgers = () => collection<CapacityLedger>('capacity');

export function readLedger(id: string): Promise<CapacityLedger | null> {
	return ledgers().get(id);
}

/** A ledger as read or written, with its etag on Blobs, so the next write to it can skip its read. */
export type LedgerVersion = { ledger: CapacityLedger | null; etag?: string };

function ledgerBlobs(): ReturnType<typeof getStore> | null {
	try {
		return getStore({ name: scopedName('capacity'), consistency: 'strong' });
	} catch {
		return null;
	}
}

/** One read of a ledger and its etag: pass it to updateLedger as `seed`, and that write needs no read of its own. */
export async function readLedgerVersion(id: string): Promise<LedgerVersion> {
	const blobs = ledgerBlobs();
	if (!blobs) return { ledger: await ledgers().get(id) };
	const existing = await blobs.getWithMetadata(id, { type: 'json' });
	return existing ? { ledger: existing.data as CapacityLedger, etag: existing.etag } : { ledger: null };
}

/**
 * Read-modify-write of one ledger, created on first use: compare-and-swap on
 * the blob's etag (onlyIfMatch, or onlyIfNew for the first write), so of two
 * concurrent writers the second re-reads and sees the first's claim. `mutate`
 * runs again on every retry. Returns the ledger as written (or as read, when
 * `mutate` returns null) and, on Blobs, its etag.
 *
 * `seed` is a version the caller has just read (readLedgerVersion) or
 * written: the first attempt uses it instead of reading again, if it carries
 * an etag. If anyone wrote since, its compare-and-swap fails and the next
 * attempt reads.
 */
export function updateLedger(id: string, mutate: Mutation<CapacityLedger>, seed?: LedgerVersion): Promise<{ ledger: CapacityLedger; etag?: string }> {
	return withLock(`capacity:${id}`, async () => {
		const blobs = ledgerBlobs();
		const empty = (): CapacityLedger => ({ id, claims: {} });
		if (!blobs) {
			const store = ledgers();
			const current = (await store.get(id)) ?? empty();
			const next = mutate(structuredClone(current));
			if (next) await store.put(next);
			return { ledger: next ?? current };
		}
		// A seed without an etag isn't trusted, even one that found no ledger: it can't be compared, and a ledger
		// created since would be missed by a mutation that changes nothing. Read instead.
		let known = seed?.etag ? seed : undefined;
		for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
			const version = known ?? (await readLedgerVersion(id));
			known = undefined;
			const current = version.ledger ?? empty();
			const next = mutate(structuredClone(current));
			if (!next) return { ledger: current, etag: version.etag };
			const { modified, etag } = version.ledger
				? await blobs.setJSON(id, next, { onlyIfMatch: version.etag as string })
				: await blobs.setJSON(id, next, { onlyIfNew: true });
			if (modified) return { ledger: next, etag };
		}
		throw new Error(`[store] capacity ${id}: too many concurrent writes`);
	});
}

/** The id of every ledger, without reading them: one list call on Blobs. */
export async function ledgerIds(): Promise<string[]> {
	const blobs = ledgerBlobs();
	if (!blobs) return (await ledgers().list()).map((ledger) => ledger.id);
	const { blobs: entries } = await blobs.list();
	return entries.map(({ key }) => key);
}

export function deleteLedger(id: string): Promise<void> {
	return ledgers().delete(id);
}

/** Deletes every ledger: with the bookings, for the showcase's "Delete everything". */
export async function clearLedgers(): Promise<void> {
	await Promise.all((await ledgerIds()).map(deleteLedger));
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
