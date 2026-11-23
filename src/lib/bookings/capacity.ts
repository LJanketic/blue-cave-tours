import { seatCount } from '../booking';
import { PRIVATE_BOATS_PER_DAY, SEATS_PER_DEPARTURE } from '../../config/booking';
import { bookings, isCharterQuote, meta, readLedger, updateLedger, type Booking, type CapacityClaim, type CapacityLedger } from './store';

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
 */

/** Seats counted against a departure: everything paid that hasn't been cancelled. */
export function takesSeats(booking: Booking): boolean {
	return booking.paymentStatus === 'paid' && booking.status !== 'cancelled';
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
 */
async function backfillLedgers(now: Date): Promise<void> {
	if (await meta().get(BACKFILL_MARKER)) return;
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
}

/** Makes the next check run the backfill again: after bookings were written straight to the store (the showcase's sample data). */
export async function resetCapacityBackfill(): Promise<void> {
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
	const paidAfterAll = await stalePaid(await readLedger(id), now);
	let takenBefore = 0;
	await updateLedger(id, (ledger) => {
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
	});
	return { over: !checksOff() && !fits(need, takenBefore), takenBefore, capacity: limit(need), unit: need.kind === 'private' ? 'boats' : 'seats' };
}

/**
 * Marks `booking`'s seats (or boat) taken for good: once its payment is
 * recorded, or when staff reinstate it. Adds the claim if there's none.
 */
export async function holdCapacity(booking: Booking, now: Date = new Date()): Promise<void> {
	const need = needOf(booking);
	await updateLedger(ledgerId(need), (ledger) => {
		const own = ledger.claims[booking.id];
		if (own?.paid) return null;
		return { ...ledger, claims: { ...ledger.claims, [booking.id]: { seats: need.seats, at: own?.at ?? now.toISOString(), paid: true } } };
	});
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

/** Whether a payment for this booking is checked against capacity: staff-made charter quotes are not (staff chose the boat). */
export function capacityChecked(booking: Pick<Booking, 'kind' | 'enquiryId' | 'quoteExpiresAt'>): boolean {
	return !(booking.kind === 'private' && isCharterQuote(booking));
}
