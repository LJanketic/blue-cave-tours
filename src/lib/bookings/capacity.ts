import { seatCount } from '../booking';
import { PRIVATE_BOATS_PER_DAY, SEATS_PER_DEPARTURE } from '../../config/booking';
import {
	bookings,
	deleteLedger,
	deployContext,
	isCharterQuote,
	ledgerIds,
	meta,
	readLedger,
	readLedgerVersion,
	updateLedger,
	type Booking,
	type CapacityClaim,
	type CapacityLedger,
	type LedgerVersion,
} from './store';
import { businessDate } from './dates';

/**
 * Oversell protection (W0-B): how many seats a group departure has left, and
 * whether a private boat is still free on a day. The figures are in
 * src/config/booking.ts and wait for the operator (Q15).
 *
 * Every check reads one ledger per departure (seats:<tour>|<date>|<slot>) or
 * per day (boats:<date>), never the list of bookings: it holds a claim for
 * every paid booking that takes seats, plus the payments in flight.
 * - When the booking is made (createPendingBooking) and when the pay page
 *   opens: against the ledger. A full departure is refused with a message
 *   that sends the guest to contact us or a request.
 * - When it's paid (finalizePaidBooking): the payment writes an in-flight
 *   claim with compare-and-swap before the booking is marked paid, so two
 *   guests paying for the last seat at once can't both see it free, and
 *   marks it paid after (holdCapacity). The one that loses the race is still
 *   paid (the money is never dropped) but is flagged overbookedAtPayment, and
 *   the admin's "Needs attention" names it (manifest.ts).
 * - Staff cancelling or refunding a paid booking release its claim;
 *   reinstating it claims the seats again (applyAdminAction).
 *
 * Unpaid bookings hold nothing: a hold would let anyone block a day's only
 * private boat with bookings they never pay, and would count a guest's own
 * abandoned booking against their next try. Payment is the moment that counts.
 *
 * Demo data, demo payments on production and payments through outdated
 * deploys hold nothing either (heldOutOfCapacity). Staff can recompute every
 * ledger from the bookings in /admin/tools (rebuildLedgers), and the nightly
 * run deletes the ledgers of past departures (pruneLedgers).
 */

/** Stamped on every payment finalizePaidBooking records (Booking.paymentGate): this code checks the demo gate first. */
export const PAYMENT_GATE = 2;

/**
 * When the gated payment code (PAYMENT_GATE) went live: set it to the day
 * PR W0 is merged and deployed to production. Old deploys stay reachable at
 * <deploy-id>--hello-blue-cave.netlify.app and still run the ungated demo
 * checkout against production's bookings, so a card or PayPal payment
 * recorded after this moment without the stamp came through one of them.
 */
export const GATE_CUTOVER = '2026-11-24T00:00:00Z';

type PaymentFields = Pick<Booking, 'paymentStatus' | 'paymentProvider' | 'paymentRef' | 'paidAt' | 'paymentGate' | 'sample'>;

/**
 * A payment recorded by an outdated deploy (see GATE_CUTOVER). It never
 * claimed capacity through this code, so it takes no seats here (staff
 * decide), and the admin flags it: "Paid through an outdated deploy".
 * Only the card/PayPal path counts: the one an old deploy can write.
 */
export function paidThroughOutdatedDeploy(booking: PaymentFields): boolean {
	if (booking.paymentStatus !== 'paid' || booking.sample || booking.paymentGate || !booking.paidAt) return false;
	if (booking.paymentProvider !== 'teya' && booking.paymentProvider !== 'paypal') return false;
	return Date.parse(booking.paidAt) > Date.parse(GATE_CUTOVER);
}

/**
 * Paid bookings that never hold real seats or boats (B2, B3):
 * - Demo data (`sample`), everywhere: "Load demo data" puts paid charters
 *   and groups on the coming days, and with one private boat a day a single
 *   sample would block real guests.
 * - On production, demo payments (refs DEMO-…, src/pages/booking/pay.astro):
 *   while payments are a demo, only a browser staff switched on in
 *   /admin/tools can pay there, to show the flow. No money moved, so the
 *   seats are still for sale. On deploy previews, branch deploys and
 *   `astro dev` the same demo payments do count, so the capacity checks can
 *   be tried end to end. "Production" is the deploy context that picks the
 *   stores (deployContext), so it's exactly production's bookings.
 * - Payments through an outdated deploy (paidThroughOutdatedDeploy).
 *
 * Not one rule like "on production only stamped, non-DEMO payments count":
 * bookings staff confirm for payment on the day or offline are not recorded
 * by finalizePaidBooking and carry no stamp, and they must hold their seats.
 */
export function heldOutOfCapacity(booking: PaymentFields): boolean {
	if (booking.sample) return true;
	if (deployContext() === 'production' && booking.paymentRef?.startsWith('DEMO-')) return true;
	return paidThroughOutdatedDeploy(booking);
}

/** On the boat, for the admin's manifest and lists: everything paid that hasn't been cancelled, demo data included. */
export function onBoard(booking: Pick<Booking, 'paymentStatus' | 'status'>): boolean {
	return (booking.paymentStatus === 'paid' || booking.paymentStatus === 'offline') && booking.status !== 'cancelled';
}

/**
 * A paid demo booking on production (a DEMO- payment, review B2): on the boat
 * list, but its seats stay for sale. The admin marks it "Demo payment — holds
 * no seats" so staff don't count it as a real guest's seats. Demo data has
 * its own "Demo data" badge and outdated deploys their own warning.
 */
export function demoPaymentHoldsNoSeats(booking: Booking): boolean {
	return onBoard(booking) && !booking.sample && heldOutOfCapacity(booking) && !paidThroughOutdatedDeploy(booking);
}

/** Seats counted against a departure in the ledger: on the boat, and not held out of capacity (demo data, demo payments on production, outdated deploys). */
export function takesSeats(booking: Booking): boolean {
	return onBoard(booking) && !heldOutOfCapacity(booking);
}

/**
 * The e2e run (astro dev, playwright.config.ts) books and pays the same
 * departures in every browser and every run, into a store that persists, so
 * it switches the refusals off with CAPACITY_CHECKS=off. Never in a built
 * site: import.meta.env.DEV is false there. The admin's counts still apply.
 */
function checksOff(): boolean {
	return import.meta.env.DEV && typeof process !== 'undefined' && process.env.CAPACITY_CHECKS === 'off';
}

/** What a booking takes: seats on a group departure, or one of the day's private boats. */
type Need = { kind: 'group'; tourSlug: string; date: string; slot: string; seats: number } | { kind: 'private'; date: string; seats: number };

function needOf(booking: Pick<Booking, 'kind' | 'tourSlug' | 'date' | 'slot' | 'adults' | 'children' | 'infants'>): Need {
	return booking.kind === 'private'
		? { kind: 'private', date: booking.date, seats: seatCount(booking) }
		: { kind: 'group', tourSlug: booking.tourSlug, date: booking.date, slot: booking.slot, seats: seatCount(booking) };
}

function ledgerId(need: Need): string {
	return need.kind === 'private' ? `boats:${need.date}` : `seats:${need.tourSlug}|${need.date}|${need.slot}`;
}

/** An in-flight claim this old was never marked paid: the payment didn't finish, so it stops counting (unless its booking is paid after all). */
const CLAIM_TTL_MS = 10 * 60_000;

function live(claim: CapacityClaim, now: Date): boolean {
	return Boolean(claim.paid) || now.getTime() - Date.parse(claim.at) <= CLAIM_TTL_MS;
}

/**
 * Seats (group) or boats (private) already taken, not counting `exceptId`:
 * the paid claims, fresh claims of payments in flight, and `paidAfterAll`
 * (expired claims whose booking turned out paid, see stalePaid).
 */
function taken(need: Need, ledger: CapacityLedger | null, now: Date, exceptId?: string, paidAfterAll: Set<string> = new Set()): number {
	let total = 0;
	for (const [id, claim] of Object.entries(ledger?.claims ?? {})) {
		if (id === exceptId || (!live(claim, now) && !paidAfterAll.has(id))) continue;
		total += need.kind === 'private' ? 1 : claim.seats;
	}
	return total;
}

/**
 * Expired in-flight claims whose booking is paid anyway: the payment went
 * through but marking its claim paid didn't (a crash or a storage error).
 * One read per such claim; claimCapacity prunes them, so there are few.
 */
async function stalePaid(ledger: CapacityLedger | null, now: Date): Promise<Set<string>> {
	const stale = Object.entries(ledger?.claims ?? {})
		.filter(([, claim]) => !live(claim, now))
		.map(([id]) => id);
	if (!stale.length) return new Set();
	const found = await Promise.all(stale.map((id) => bookings().get(id)));
	return new Set(found.filter((booking): booking is Booking => booking !== null && takesSeats(booking)).map((booking) => booking.id));
}

const BACKFILL_MARKER = 'capacity-ledgers-backfilled';

/**
 * The ledgers started holding paid bookings in November 2026. Bookings paid
 * before that are added once per store (each deploy context has its own):
 * the first check that finds no marker lists the bookings, merges a paid
 * claim for each one that takes seats into its ledger (compare-and-swap, so
 * a payment racing it is kept), then leaves the marker. From then on nothing
 * lists the bookings.
 *
 * Once this instance has seen the marker it stops reading it (S10): the
 * marker is never taken away on a store that has bookings ("Delete
 * everything" removes it with them), so an instance that remembers it can't
 * miss a backfill another one needed.
 */
let backfillSeen = false;

async function backfillLedgers(now: Date): Promise<void> {
	if (backfillSeen) return;
	if (await meta().get(BACKFILL_MARKER)) {
		backfillSeen = true;
		return;
	}
	const byLedger = new Map<string, Booking[]>();
	for (const booking of await bookings().list()) {
		if (!takesSeats(booking)) continue;
		const id = ledgerId(needOf(booking));
		byLedger.set(id, [...(byLedger.get(id) ?? []), booking]);
	}
	for (const [id, held] of byLedger) {
		await updateLedger(id, (ledger) => {
			const missing = held.filter((booking) => !ledger.claims[booking.id]?.paid);
			if (!missing.length) return null;
			const claims = { ...ledger.claims };
			for (const booking of missing) {
				claims[booking.id] = { seats: needOf(booking).seats, at: booking.seatsSince ?? booking.paidAt ?? booking.createdAt, paid: true };
			}
			return { ...ledger, claims };
		});
	}
	await meta().put({ id: BACKFILL_MARKER, value: now.toISOString() });
	backfillSeen = true;
}

/** Makes the next check run the backfill again ("Delete everything", and tests of a store from before the ledgers). */
export async function resetCapacityBackfill(): Promise<void> {
	backfillSeen = false;
	await meta().delete(BACKFILL_MARKER);
}

function limit(need: Need): number {
	return need.kind === 'private' ? PRIVATE_BOATS_PER_DAY : SEATS_PER_DEPARTURE;
}

function fits(need: Need, alreadyTaken: number): boolean {
	return alreadyTaken + (need.kind === 'private' ? 1 : need.seats) <= limit(need);
}

export type CapacityError = 'full' | 'boat';

/**
 * Whether a booking still fits: 'full' when its group departure hasn't the
 * seats left, 'boat' when the day's private boats are taken. `exceptId`
 * leaves out a booking's own claim (the pay page of an existing booking).
 */
export async function capacityError(
	booking: Pick<Booking, 'kind' | 'tourSlug' | 'date' | 'slot' | 'adults' | 'children' | 'infants'>,
	now: Date = new Date(),
	exceptId?: string,
): Promise<CapacityError | null> {
	if (checksOff()) return null;
	const need = needOf(booking);
	await backfillLedgers(now);
	const ledger = await readLedger(ledgerId(need));
	if (fits(need, taken(need, ledger, now, exceptId, await stalePaid(ledger, now)))) return null;
	return need.kind === 'private' ? 'boat' : 'full';
}

export type CapacityClaimResult = {
	/** True when the payment took more than was left: kept, but flagged for staff. */
	over: boolean;
	/** Seats (group) or boats (private) taken before this payment, and the limit. */
	takenBefore: number;
	capacity: number;
	unit: 'seats' | 'boats';
	/** The ledger as this claim wrote it: holdCapacity starts from it instead of reading it again (S10). */
	ledger: LedgerVersion;
};

/**
 * Records that `booking` is being paid now, atomically against every other
 * payment for the same departure (or day, for private boats), and says
 * whether it still fitted. Run it before marking the booking paid, then
 * holdCapacity once it's paid, or releaseCapacity if it wasn't.
 */
export async function claimCapacity(booking: Booking, now: Date = new Date()): Promise<CapacityClaimResult> {
	const need = needOf(booking);
	const id = ledgerId(need);
	await backfillLedgers(now);
	// One read serves both the stale-claim check and the first compare-and-swap.
	const first = await readLedgerVersion(id);
	const paidAfterAll = await stalePaid(first.ledger, now);
	let takenBefore = 0;
	const written = await updateLedger(id, (ledger) => {
		// Runs again on each compare-and-swap retry, so it always counts the latest claims.
		takenBefore = taken(need, ledger, now, booking.id, paidAfterAll);
		// Expired in-flight claims go, unless their booking was paid after all: those are marked paid.
		const claims: CapacityLedger['claims'] = {};
		for (const [other, claim] of Object.entries(ledger.claims)) {
			if (other === booking.id) continue;
			if (live(claim, now)) claims[other] = claim;
			else if (paidAfterAll.has(other)) claims[other] = { ...claim, paid: true };
		}
		// A double click whose twin already finished keeps the paid claim.
		const own = ledger.claims[booking.id];
		claims[booking.id] = own?.paid ? own : { seats: need.seats, at: now.toISOString() };
		return { ...ledger, claims };
	}, first);
	return {
		over: !checksOff() && !fits(need, takenBefore),
		takenBefore,
		capacity: limit(need),
		unit: need.kind === 'private' ? 'boats' : 'seats',
		ledger: written,
	};
}

/**
 * Marks `booking`'s seats (or boat) taken for good: once its payment is
 * recorded, or when staff reinstate it. Adds the claim if there's none.
 * Never for a booking held out of capacity (heldOutOfCapacity). `seed` is
 * the ledger as claimCapacity left it, which saves a read.
 */
export async function holdCapacity(booking: Booking, now: Date = new Date(), seed?: LedgerVersion): Promise<void> {
	if (heldOutOfCapacity(booking)) return;
	const need = needOf(booking);
	await updateLedger(
		ledgerId(need),
		(ledger) => {
			const own = ledger.claims[booking.id];
			if (own?.paid) return null;
			return { ...ledger, claims: { ...ledger.claims, [booking.id]: { seats: need.seats, at: own?.at ?? now.toISOString(), paid: true } } };
		},
		seed,
	);
}

/**
 * Takes back a booking's claim: a payment that didn't go through, or a paid
 * booking staff cancelled or refunded. `inFlightOnly` leaves a paid claim
 * alone: a failed payment attempt whose double-click twin already went through.
 */
export async function releaseCapacity(booking: Booking, { inFlightOnly = false }: { inFlightOnly?: boolean } = {}): Promise<void> {
	await updateLedger(ledgerId(needOf(booking)), (ledger) => {
		const own = ledger.claims[booking.id];
		if (!own || (inFlightOnly && own.paid)) return null;
		const { [booking.id]: _released, ...claims } = ledger.claims;
		return { ...ledger, claims };
	});
}

/** The paid claim a booking that takes seats holds. */
function paidClaim(booking: Booking): CapacityClaim {
	return { seats: needOf(booking).seats, at: booking.seatsSince ?? booking.paidAt ?? booking.createdAt, paid: true };
}

export type RebuildResult = { ledgers: number; claims: number; removed: number };

/** Ledgers rebuilt at once: enough to finish a season's departures quickly, few enough not to flood Blobs. */
export const REBUILD_CONCURRENCY = 12;

/** Runs `task` on every item, at most `limit` at a time. */
async function eachLimited<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
	let next = 0;
	const worker = async () => {
		while (next < items.length) await task(items[next++]);
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

/**
 * "Rebuild capacity from bookings" (admin tools, S5): after a rollback or
 * overlapping deploys the ledgers can drift from the bookings, and the
 * backfill only ever adds. This recomputes every ledger from one listing of
 * the bookings and replaces its paid claims, under the same rules as a
 * payment (takesSeats: no demo data, no demo payments on production, no
 * outdated deploys). Writes go through compare-and-swap, so it can run while
 * guests pay:
 * - a payment in flight (a fresh claim not yet marked paid) is kept;
 * - a claim the listing doesn't explain (a booking paid since, or one it
 *   saw unpaid) is checked against its booking once more and kept if that
 *   booking takes seats now.
 * A staff cancel in the same second may be re-added; rebuild again after.
 * Only departures from today (Split) on are rebuilt, REBUILD_CONCURRENCY
 * ledgers at a time.
 */
export async function rebuildLedgers(now: Date = new Date()): Promise<RebuildResult> {
	const listed = new Map((await bookings().list()).map((booking) => [booking.id, booking]));
	const wanted = new Map<string, Record<string, CapacityClaim>>();
	for (const booking of listed.values()) {
		if (!takesSeats(booking)) continue;
		const id = ledgerId(needOf(booking));
		wanted.set(id, { ...wanted.get(id), [booking.id]: paidClaim(booking) });
	}
	const inFlight = (claim: CapacityClaim) => !claim.paid && live(claim, now);
	const result: RebuildResult = { ledgers: 0, claims: 0, removed: 0 };
	// Departures before today (Split) are left alone: nobody books or pays for them any more, and the nightly run prunes them.
	const today = businessDate(now);
	const ids = [...new Set([...(await ledgerIds()), ...wanted.keys()])].filter((id) => (ledgerDate(id) ?? today) >= today);
	await eachLimited(ids, REBUILD_CONCURRENCY, async (id) => {
		const want = wanted.get(id) ?? {};
		const first = await readLedgerVersion(id);
		const unexplained = Object.entries(first.ledger?.claims ?? {})
			.filter(([bookingId, claim]) => !want[bookingId] && !inFlight(claim))
			.map(([bookingId]) => bookingId);
		const recheck = await Promise.all(unexplained.map((bookingId) => bookings().get(bookingId)));
		const stillHeld = new Map(recheck.filter((booking): booking is Booking => booking !== null && takesSeats(booking)).map((booking) => [booking.id, booking]));
		const checked = new Set(unexplained);
		let removed = 0;
		const { ledger } = await updateLedger(
			id,
			(current) => {
				const claims: CapacityLedger['claims'] = { ...want };
				removed = 0;
				for (const [bookingId, claim] of Object.entries(current.claims)) {
					if (claims[bookingId]) continue;
					const held = stillHeld.get(bookingId);
					// Not checked: a claim written after the read above, by a payment or staff. Kept.
					if (held) claims[bookingId] = paidClaim(held);
					else if (inFlight(claim) || !checked.has(bookingId)) claims[bookingId] = claim;
					else removed++;
				}
				if (JSON.stringify(claims) === JSON.stringify(current.claims)) return null;
				return { ...current, claims };
			},
			first,
		);
		result.ledgers++;
		result.claims += Object.keys(ledger.claims).length;
		result.removed += removed;
	});
	// Every ledger is as the backfill would have left it, and more.
	await meta().put({ id: BACKFILL_MARKER, value: now.toISOString() });
	backfillSeen = true;
	return result;
}

/** The departure date in a ledger id (seats:<tour>|<date>|<slot>, boats:<date>). */
function ledgerDate(id: string): string | null {
	const date = id.startsWith('boats:') ? id.slice('boats:'.length) : id.startsWith('seats:') ? id.split('|')[1] : null;
	return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

/**
 * Deletes the ledgers of departures before `beforeDate` (YYYY-MM-DD): nobody
 * books or pays for them any more. Run nightly with a week's margin
 * (src/lib/nightly.ts). Returns how many went.
 */
export async function pruneLedgers(beforeDate: string): Promise<number> {
	const past = (await ledgerIds()).filter((id) => {
		const date = ledgerDate(id);
		return date !== null && date < beforeDate;
	});
	for (const id of past) await deleteLedger(id);
	return past.length;
}

/** Whether a payment for this booking is checked against capacity: staff-made charter quotes are not (staff chose the boat). */
export function capacityChecked(booking: Pick<Booking, 'kind' | 'enquiryId' | 'quoteExpiresAt'>): boolean {
	return !(booking.kind === 'private' && isCharterQuote(booking));
}
