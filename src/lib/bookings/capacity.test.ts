import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTourBySlug } from '../tours';
import type { TourDetail } from '../../types/tour';
import { PRIVATE_BOATS_PER_DAY, SEATS_PER_DEPARTURE } from '../../config/booking';
import { MAX_GUESTS } from '../booking';
import { bookableUntil, SEASON_OPENS_MONTHS_AHEAD, withinHorizon } from '../../config/season';
import { validateCharterRequest, type CharterRequestInput } from '../charter';
import { departuresOn, outdatedDeployPayments, overbookingsById } from '../admin/manifest';
import { clearAllData, demoDataAllowed, loadSampleData } from '../admin/sample-data';
import { LEDGER_KEEP_DAYS, runNightly } from '../nightly';
import { applyAdminAction, createPendingBooking, finalizePaidBooking, validateBookingInput, validatePrivateBookingInput, type NewBookingInput, type PrivateBookingInput } from './service';
import {
	capacityError,
	claimCapacity,
	demoPaymentHoldsNoSeats,
	GATE_CUTOVER,
	onBoard,
	paidThroughOutdatedDeploy,
	PAYMENT_GATE,
	pruneLedgers,
	rebuildLedgers,
	resetCapacityBackfill,
	takesSeats,
} from './capacity';
import { bookings, ledgerIds, readLedger, resetMemoryStore, updateLedger, type Booking } from './store';

/*
 * W0-B: oversell protection and the booking horizon. The capacity figures are
 * pending the operator (Q15); these tests pin the safe defaults.
 */

const NOW = new Date('2027-06-01T10:00:00Z');
const ORIGIN = 'https://example.test';
const tour = getTourBySlug('blue-cave-hvar-5-islands') as TourDetail;
const DATE = '2027-07-15';

const group = (overrides: Partial<NewBookingInput> = {}): NewBookingInput => ({
	date: DATE,
	slot: '07:20',
	adults: 2,
	children: 0,
	infants: 0,
	firstName: 'Jane',
	lastName: 'Smith',
	email: 'jane@example.com',
	phone: '',
	notes: null,
	...overrides,
});
const privately = (overrides: Partial<PrivateBookingInput> = {}): PrivateBookingInput => ({ ...group(), kind: 'private', extras: [], pickup: 'riva', ...overrides });

async function create(input: NewBookingInput): Promise<Booking> {
	const result = await createPendingBooking(tour, input, NOW);
	if (!result.ok) throw new Error(result.error);
	return result.booking;
}

async function paid(input: NewBookingInput): Promise<Booking> {
	const booking = await create(input);
	const done = await finalizePaidBooking(booking.id, 'teya', `T-${booking.id}`, ORIGIN, NOW);
	if (!done) throw new Error('not paid');
	return done;
}

beforeEach(() => resetMemoryStore());

describe('capacity defaults (pending the operator, Q15)', () => {
	it('sells one boat of MAX_GUESTS seats per group departure, and one private boat a day', () => {
		expect(SEATS_PER_DEPARTURE).toBe(MAX_GUESTS);
		expect(PRIVATE_BOATS_PER_DAY).toBe(1);
	});
});

describe('private boat availability', () => {
	it('refuses a second private booking on a day whose boat is paid for, and routes the guest to a request', async () => {
		await paid(privately());
		expect(await createPendingBooking(tour, privately({ slot: '08:20', firstName: 'Other' }), NOW)).toEqual({ ok: false, error: 'boat' });
		// Another day is free.
		expect(await createPendingBooking(tour, privately({ date: '2027-07-16' }), NOW)).toMatchObject({ ok: true });
	});

	it('counts an unpaid private booking as no boat: payment is what takes it', async () => {
		await create(privately());
		expect(await createPendingBooking(tour, privately({ firstName: 'Other' }), NOW)).toMatchObject({ ok: true });
	});

	it('frees the boat again when the paid booking is cancelled', async () => {
		const first = await paid(privately());
		await applyAdminAction(first.id, { type: 'status', status: 'cancelled' }, 'Staff', NOW);
		expect(await createPendingBooking(tour, privately({ firstName: 'Other' }), NOW)).toMatchObject({ ok: true });
	});

	it('never lets a private booking take seats from the group departure, or the other way round', async () => {
		await paid(privately());
		expect(await createPendingBooking(tour, group({ adults: 14 }), NOW)).toMatchObject({ ok: true });
		resetMemoryStore();
		await paid(group({ adults: 14 }));
		expect(await createPendingBooking(tour, privately(), NOW)).toMatchObject({ ok: true });
	});

	it('two guests paying for the last boat at once: both are paid, exactly one is flagged, and the admin names it', async () => {
		const a = await create(privately({ firstName: 'Ana' }));
		const b = await create(privately({ firstName: 'Bo', slot: '08:20' }));
		const [paidA, paidB] = await Promise.all([
			finalizePaidBooking(a.id, 'teya', 'T-A', ORIGIN, NOW),
			finalizePaidBooking(b.id, 'paypal', 'P-B', ORIGIN, NOW),
		]);
		// The money is never dropped.
		expect(paidA?.paymentStatus).toBe('paid');
		expect(paidB?.paymentStatus).toBe('paid');
		const flagged = [paidA, paidB].filter((x) => x?.overbookedAtPayment);
		expect(flagged).toHaveLength(1);
		expect(flagged[0]?.staffNotes.at(-1)?.text).toMatch(/Over capacity at payment \(1 of 1 private boats already taken\)/);
		// Needs attention: the dashboard and the day's cards name a boatless private booking.
		const all = await bookings().list();
		const overbooked = [...overbookingsById(all).values()];
		expect(overbooked).toHaveLength(1);
		expect(overbooked[0].boats).toEqual({ takenBefore: 1, perDay: 1 });
		// The admin names the booking that lost the race, not the other one.
		expect(overbooked[0].booking.id).toBe(flagged[0]?.id);
		expect(departuresOn(DATE, all).filter((d) => d.overBy > 0)).toHaveLength(1);
	});

	it('a double click on one payment is not a second boat', async () => {
		const booking = await create(privately());
		const results = await Promise.all([1, 2, 3].map((n) => finalizePaidBooking(booking.id, 'teya', `T-${n}`, ORIGIN, NOW)));
		expect(results.every((r) => r?.paymentStatus === 'paid' && !r.overbookedAtPayment)).toBe(true);
		expect(overbookingsById(await bookings().list()).size).toBe(0);
	});

	it('takes back the claim of a payment that did not go through', async () => {
		const booking = await create(privately());
		await applyAdminAction(booking.id, { type: 'status', status: 'cancelled' }, 'Staff', NOW);
		expect((await finalizePaidBooking(booking.id, 'teya', 'T-1', ORIGIN, NOW))?.paymentStatus).toBe('unpaid');
		expect((await readLedger(`boats:${DATE}`))?.claims ?? {}).toEqual({});
		expect(await capacityError({ kind: 'private', tourSlug: tour.slug, date: DATE, slot: '07:20', adults: 2, children: 0, infants: 0 }, NOW)).toBeNull();
	});

	it('a paid charter quote takes the boat too, but is never itself flagged (staff chose to sell it)', async () => {
		const online = await paid(privately());
		const quote: Booking = { ...online, id: crypto.randomUUID(), ref: 'HBC-QUOTE1', enquiryId: 'e-1', quoteExpiresAt: '2027-06-05T00:00:00Z', paymentStatus: 'unpaid', status: 'pending_payment', paidAt: null, overbookedAtPayment: undefined, history: [], staffNotes: [] };
		await bookings().put(quote);
		const done = await finalizePaidBooking(quote.id, 'teya', 'T-Q', ORIGIN, new Date(NOW.getTime() + 60_000));
		expect(done?.paymentStatus).toBe('paid');
		expect(done?.overbookedAtPayment).toBeUndefined();
		expect(overbookingsById(await bookings().list()).size).toBe(0);
	});
});

describe('group departure seats', () => {
	it(`refuses a booking the departure has no seats left for (${MAX_GUESTS} per departure)`, async () => {
		await paid(group({ adults: 10 }));
		await paid(group({ adults: 2, firstName: 'Second' }));
		// 12 of 14 taken: 3 more don't fit, 2 do.
		expect(await createPendingBooking(tour, group({ adults: 2, children: 1 }), NOW)).toEqual({ ok: false, error: 'full' });
		expect(await createPendingBooking(tour, group({ adults: 1, infants: 1 }), NOW)).toMatchObject({ ok: true });
		// Infants take a seat (D-9), and unpaid bookings hold none.
		expect(await createPendingBooking(tour, group({ adults: 2, infants: 1 }), NOW)).toEqual({ ok: false, error: 'full' });
	});

	it('counts each departure on its own: another time, day or tour is unaffected', async () => {
		await paid(group({ adults: 14 }));
		expect(await createPendingBooking(tour, group({ adults: 1 }), NOW)).toEqual({ ok: false, error: 'full' });
		expect(await createPendingBooking(tour, group({ adults: 1, date: '2027-07-16' }), NOW)).toMatchObject({ ok: true });
		const lagoon = getTourBySlug('blue-lagoon-morning') as TourDetail;
		expect(await createPendingBooking(lagoon, group({ adults: 1, slot: lagoon.departures[0].time }), NOW)).toMatchObject({ ok: true });
	});

	it('two payments for the last seats at once: both are paid, one is flagged, and the admin shows the departure overbooked', async () => {
		await paid(group({ adults: 12 }));
		const a = await create(group({ adults: 2, firstName: 'Ana' }));
		const b = await create(group({ adults: 2, firstName: 'Bo' }));
		const results = await Promise.all([
			finalizePaidBooking(a.id, 'teya', 'T-A', ORIGIN, NOW),
			finalizePaidBooking(b.id, 'teya', 'T-B', ORIGIN, NOW),
		]);
		expect(results.map((r) => r?.paymentStatus)).toEqual(['paid', 'paid']);
		const flagged = results.filter((r) => r?.overbookedAtPayment);
		expect(flagged).toHaveLength(1);
		expect(flagged[0]?.history.map((h) => h.action).join('\n')).toMatch(/Paid when 14 of 14 seats were already taken/);
		const [departure] = departuresOn(DATE, await bookings().list());
		expect(departure).toMatchObject({ seatsTaken: 16, capacity: 14, overBy: 2 });
		expect(departure.overbookings.map((o) => o.booking.id)).toEqual([flagged[0]?.id]);
	});
});

describe('the capacity ledger', () => {
	const groupNeed = (seats: number) => ({ kind: 'group' as const, tourSlug: tour.slug, date: DATE, slot: '07:20', adults: seats, children: 0, infants: 0 });
	const LEDGER = `seats:${tour.slug}|${DATE}|07:20`;

	it('counts from the ledger, not by listing bookings: a paid booking written behind its back is not seen', async () => {
		await paid(group({ adults: 10 }));
		expect(Object.values((await readLedger(LEDGER))?.claims ?? {})).toEqual([expect.objectContaining({ seats: 10, paid: true })]);
		// Written straight to the store, as if paid elsewhere: the ledger (the only thing read) doesn't know it.
		const other = await create(group({ adults: 4, firstName: 'Ghost' }));
		await bookings().put({ ...other, paymentStatus: 'paid', status: 'confirmed', paidAt: NOW.toISOString() });
		expect(await capacityError(groupNeed(4), NOW)).toBeNull();
	});

	it('takes in bookings paid before the ledger existed, once, from one listing', async () => {
		const first = await create(group({ adults: 12 }));
		await bookings().put({ ...first, paymentStatus: 'paid', status: 'confirmed', paidAt: NOW.toISOString() });
		// The marker from creating it says the backfill ran; clear it as a store from before the ledgers would be.
		await resetCapacityBackfill();
		expect(await capacityError(groupNeed(3), NOW)).toBe('full');
		expect((await readLedger(LEDGER))?.claims[first.id]).toMatchObject({ seats: 12, paid: true });
		expect(await capacityError(groupNeed(2), NOW)).toBeNull();
	});

	it('frees the seats when staff refund a paid booking, and takes them again when staff reinstate a cancelled one', async () => {
		const a = await paid(group({ adults: 14 }));
		expect(await capacityError(groupNeed(1), NOW)).toBe('full');
		await applyAdminAction(a.id, { type: 'refund' }, 'Staff', NOW);
		expect(await capacityError(groupNeed(14), NOW)).toBeNull();
		expect((await readLedger(LEDGER))?.claims[a.id]).toBeUndefined();

		const b = await paid(group({ adults: 14, firstName: 'Bo' }));
		await applyAdminAction(b.id, { type: 'status', status: 'cancelled' }, 'Staff', NOW);
		expect(await capacityError(groupNeed(14), NOW)).toBeNull();
		await applyAdminAction(b.id, { type: 'status', status: 'confirmed' }, 'Staff', NOW);
		expect(await capacityError(groupNeed(1), NOW)).toBe('full');
		expect((await readLedger(LEDGER))?.claims[b.id]).toMatchObject({ seats: 14, paid: true });
	});

	it('leaves a booking its own seats when it checks again on the pay page', async () => {
		const booking = await create(group({ adults: 2 }));
		await claimCapacity(booking, NOW);
		await paid(group({ adults: 12, firstName: 'Other' }));
		// 12 paid plus this booking's own 2 in flight: full for anyone else, still fits for itself.
		expect(await capacityError(groupNeed(1), NOW)).toBe('full');
		expect(await capacityError(booking, NOW, booking.id)).toBeNull();
	});

	it('an in-flight claim expires if its payment never finished, but counts if the booking was paid after all', async () => {
		const abandoned = await create(group({ adults: 7 }));
		const crashed = await create(group({ adults: 7, firstName: 'Crash' }));
		const next = await create(group({ adults: 1, firstName: 'Next' }));
		await claimCapacity(abandoned, NOW);
		await claimCapacity(crashed, NOW);
		expect(await capacityError(groupNeed(1), NOW)).toBe('full');
		// The crashed one was marked paid, but its claim never was (the process died in between).
		await bookings().update(crashed.id, (b) => ({ ...b, paymentStatus: 'paid', status: 'confirmed', paidAt: NOW.toISOString() }));
		const later = new Date(NOW.getTime() + 20 * 60_000);
		expect(await capacityError(groupNeed(7), later)).toBeNull();
		expect(await capacityError(groupNeed(8), later)).toBe('full');
		// The next payment prunes the abandoned claim and marks the crashed one paid.
		await claimCapacity(next, later);
		const claims = (await readLedger(LEDGER))?.claims ?? {};
		expect(claims[abandoned.id]).toBeUndefined();
		expect(claims[crashed.id]).toMatchObject({ paid: true });
	});

	it('takes back the claim when recording the payment fails', async () => {
		const booking = await create(group({ adults: 2 }));
		// A record the payment can't be written to (no history): the update throws after the claim was made.
		await bookings().put({ ...booking, history: undefined as unknown as Booking['history'] });
		await expect(finalizePaidBooking(booking.id, 'teya', 'T-1', ORIGIN, NOW)).rejects.toThrow();
		expect((await readLedger(LEDGER))?.claims[booking.id]).toBeUndefined();
	});

	it('a failed double-click twin never takes back the paid claim', async () => {
		const booking = await paid(group({ adults: 2 }));
		// A late twin whose own update fails: the claim stays, because it's paid.
		await bookings().put({ ...booking, paymentStatus: 'unpaid', status: 'pending_payment', paidAt: null, history: undefined as unknown as Booking['history'] });
		await expect(finalizePaidBooking(booking.id, 'teya', 'T-2', ORIGIN, NOW)).rejects.toThrow();
		expect((await readLedger(LEDGER))?.claims[booking.id]).toMatchObject({ paid: true });
	});
});

describe('booking horizon', () => {
	it(`opens each season ${SEASON_OPENS_MONTHS_AHEAD} months before it starts`, () => {
		// Today (23 Nov 2026): the whole 2027 season, nothing in 2028.
		expect(bookableUntil('2026-11-23')).toBe('2027-10-31');
		// Late in a season, the next one is already open.
		expect(bookableUntil('2026-10-22')).toBe('2027-10-31');
		// The 2028 season opens on 1 March 2027.
		expect(bookableUntil('2027-02-28')).toBe('2027-10-31');
		expect(bookableUntil('2027-03-01')).toBe('2028-10-31');
		expect(bookableUntil('2027-12-31')).toBe('2028-10-31');
		expect(withinHorizon('2027-10-31', '2026-11-23')).toBe(true);
		expect(withinHorizon('2027-11-01', '2026-11-23')).toBe(false);
	});

	const today = new Date('2026-11-23T10:00:00Z');

	it('accepts 31 October 2027 and refuses 2028 for group and private bookings', () => {
		expect(validateBookingInput(tour, group({ date: '2027-03-01' }), today)).toBeNull();
		expect(validateBookingInput(tour, group({ date: '2027-10-31' }), today)).toBeNull();
		expect(validateBookingInput(tour, group({ date: '2028-03-01' }), today)).toBe('horizon');
		expect(validateBookingInput(tour, group({ date: '2028-07-15' }), today)).toBe('horizon');
		// Winter stays a season error, whatever the year.
		expect(validateBookingInput(tour, group({ date: '2028-01-15' }), today)).toBe('season');
		expect(validatePrivateBookingInput(tour, privately({ date: '2027-10-31' }), today)).toBeNull();
		expect(validatePrivateBookingInput(tour, privately({ date: '2028-03-01' }), today)).toBe('horizon');
	});

	it('refuses 2028 for a charter request too', () => {
		const request = (date: string): CharterRequestInput => ({
			route: 'blue-cave-hvar-5-islands',
			date,
			time: '09:00',
			durationHours: 8,
			adults: 2,
			children: 0,
			infants: 0,
			firstName: 'Jane',
			lastName: 'Smith',
			email: 'jane@example.com',
			phone: '+44 7700 900123',
			notes: '',
			honeypot: '',
			startedAt: today.getTime() - 60_000,
		});
		expect(validateCharterRequest(request('2027-10-31'), today)).toBeNull();
		expect(validateCharterRequest(request('2028-03-01'), today)).toBe('horizon');
	});

	it('refuses it when the booking is stored, not only at the draft', async () => {
		expect(await createPendingBooking(tour, group({ date: '2028-07-15' }), today)).toEqual({ ok: false, error: 'horizon' });
	});
});

describe('demo data and demo payments hold no seats (B2)', () => {
	afterEach(() => vi.unstubAllEnvs());

	it('demo data claims nothing: the ledgers stay empty and a real private booking on a demo charter`s day is accepted', async () => {
		const now = new Date('2027-07-01T08:00:00Z');
		await loadSampleData(now);
		const all = await bookings().list();
		const charter = all.find((b) => b.kind === 'private' && b.paymentStatus === 'paid');
		expect(charter?.sample).toBe(true);
		for (const id of await ledgerIds()) expect((await readLedger(id))?.claims, id).toEqual({});
		expect(await createPendingBooking(tour, privately({ date: charter?.date }), now)).toMatchObject({ ok: true });
		// The manifest still shows the demo passengers: they're on the boat for the showcase, just not for sale.
		expect(all.filter((b) => b.sample && onBoard(b)).length).toBeGreaterThan(0);
		expect(all.some(takesSeats)).toBe(false);
	});

	it('staff reinstating a demo booking claims nothing either', async () => {
		const booking = await create(privately());
		await bookings().put({ ...booking, sample: true, paymentStatus: 'paid', status: 'confirmed', paidAt: NOW.toISOString() });
		await applyAdminAction(booking.id, { type: 'status', status: 'cancelled' }, 'Staff', NOW);
		await applyAdminAction(booking.id, { type: 'status', status: 'confirmed' }, 'Staff', NOW);
		expect((await readLedger(`boats:${DATE}`))?.claims ?? {}).toEqual({});
	});

	it('on production a DEMO- payment is recorded and stamped but takes no boat; a real payment does', async () => {
		vi.stubEnv('CONTEXT', 'production');
		const demo = await create(privately());
		const done = await finalizePaidBooking(demo.id, 'teya', 'DEMO-TEYA-1A2B3C4D', ORIGIN, NOW);
		expect(done).toMatchObject({ paymentStatus: 'paid', status: 'confirmed', paymentGate: PAYMENT_GATE });
		expect(takesSeats(done as Booking)).toBe(false);
		expect((await readLedger(`boats:${DATE}`))?.claims ?? {}).toEqual({});
		// The day's boat is still for sale, and a real payment takes it.
		const real = await paid(privately({ firstName: 'Real', slot: '08:20' }));
		expect(real.overbookedAtPayment).toBeUndefined();
		expect(takesSeats(real)).toBe(true);
		expect(await createPendingBooking(tour, privately({ firstName: 'Third' }), NOW)).toEqual({ ok: false, error: 'boat' });
	});

	it('the admin replays only seats the ledger holds: a 12-seat DEMO- payment and a real 4-seat offline booking are not an overbooking (round 2, N2)', async () => {
		vi.stubEnv('CONTEXT', 'production');
		const demo = await create(group({ adults: 12, firstName: 'Demo' }));
		await finalizePaidBooking(demo.id, 'teya', 'DEMO-TEYA-12SEATS0', ORIGIN, NOW);
		const real = await create(group({ adults: 4, firstName: 'Real', lastName: 'Guest' }));
		const confirmed = await applyAdminAction(real.id, { type: 'confirm_offline', siteOrigin: ORIGIN }, 'Staff', NOW);
		expect(confirmed.record?.paymentStatus).toBe('offline');
		// The ledger holds the real 4 seats only, so confirming wasn't over capacity either.
		expect(confirmed.record?.staffNotes ?? []).toEqual([]);

		const all = await bookings().list();
		const [departure] = departuresOn(DATE, all);
		// Both sail on the list (head count 16), but only 4 seats are held: 10 are still for sale.
		expect(departure.passengers.map((b) => b.id).sort()).toEqual([demo.id, real.id].sort());
		expect(departure.seatsTaken).toBe(16);
		expect(departure.seatsHeld).toBe(4);
		expect(departure.overBy).toBe(0);
		expect(departure.overbookings).toEqual([]);
		expect(overbookingsById(all).size).toBe(0);
		// The admin marks the demo payment so staff don't count its seats.
		expect(demoPaymentHoldsNoSeats((await bookings().get(demo.id)) as Booking)).toBe(true);
		expect(demoPaymentHoldsNoSeats((await bookings().get(real.id)) as Booking)).toBe(false);
	});

	it('a DEMO- private payment on production takes no boat on the admin either: the real private booking that day is not flagged boatless (round 2, N2)', async () => {
		vi.stubEnv('CONTEXT', 'production');
		const demo = await create(privately({ firstName: 'Demo' }));
		await finalizePaidBooking(demo.id, 'paypal', 'DEMO-PP-BOAT0001', ORIGIN, NOW);
		const real = await paid(privately({ firstName: 'Real', slot: '08:20' }));
		expect(real.overbookedAtPayment).toBeUndefined();
		const all = await bookings().list();
		expect(overbookingsById(all).size).toBe(0);
		expect(departuresOn(DATE, all).every((d) => d.overBy === 0)).toBe(true);
		// Elsewhere (a deploy preview) the same demo payment does take the boat, so one of the two is named.
		vi.stubEnv('CONTEXT', 'deploy-preview');
		expect([...overbookingsById(all).values()].map((o) => o.boats)).toEqual([{ takenBefore: 1, perDay: PRIVATE_BOATS_PER_DAY }]);
		expect(demoPaymentHoldsNoSeats((await bookings().get(demo.id)) as Booking)).toBe(false);
	});

	it.each([['deploy-preview'], ['branch-deploy'], ['']])('on "%s" (empty: astro dev) a DEMO- payment takes the boat, so the checks can be tried end to end', async (context) => {
		vi.stubEnv('CONTEXT', context);
		const demo = await create(privately());
		await finalizePaidBooking(demo.id, 'paypal', 'DEMO-PP-1A2B3C4D', ORIGIN, NOW);
		expect((await readLedger(`boats:${DATE}`))?.claims[demo.id]).toMatchObject({ paid: true });
		expect(await createPendingBooking(tour, privately({ firstName: 'Other' }), NOW)).toEqual({ ok: false, error: 'boat' });
	});

	it('refuses Load demo data and Delete everything on production, and keeps them on previews and astro dev', async () => {
		vi.stubEnv('CONTEXT', 'production');
		expect(demoDataAllowed()).toBe(false);
		const real = await create(group());
		await expect(loadSampleData(NOW)).rejects.toThrow(/refused on production/);
		await expect(clearAllData()).rejects.toThrow(/refused on production/);
		expect(await bookings().get(real.id)).not.toBeNull();
		for (const context of ['deploy-preview', 'branch-deploy', 'playwright', '']) {
			vi.stubEnv('CONTEXT', context);
			expect(demoDataAllowed(), context).toBe(true);
		}
	});
});

describe('payments through an outdated deploy (B3)', () => {
	const groupNeed = (seats: number) => ({ kind: 'group' as const, tourSlug: tour.slug, date: DATE, slot: '07:20', adults: seats, children: 0, infants: 0 });

	it('stamps every payment this code records', async () => {
		expect((await paid(group())).paymentGate).toBe(PAYMENT_GATE);
		expect(GATE_CUTOVER).toBe('2026-11-24T00:00:00Z');
	});

	it('flags an unstamped card payment made after the cut-over: no seats (not even through the backfill), on the manifest, in Needs attention', async () => {
		const outdated = await create(group({ adults: 14 }));
		await bookings().put({ ...outdated, paymentStatus: 'paid', status: 'confirmed', paymentProvider: 'teya', paymentRef: 'DEMO-TEYA-OLD00001', paidAt: '2026-11-25T09:00:00.000Z' });
		// Unstamped but paid before the cut-over: an ordinary old payment, which the backfill takes in.
		const older = await create(group({ adults: 2, firstName: 'Older', date: '2027-07-16' }));
		await bookings().put({ ...older, paymentStatus: 'paid', status: 'confirmed', paymentProvider: 'paypal', paymentRef: 'DEMO-PP-OLD00002', paidAt: '2026-11-20T09:00:00.000Z' });
		await resetCapacityBackfill();

		expect(await capacityError(groupNeed(14), NOW)).toBeNull();
		expect((await readLedger(`seats:${tour.slug}|${DATE}|07:20`))?.claims ?? {}).toEqual({});
		expect((await readLedger(`seats:${tour.slug}|2027-07-16|07:20`))?.claims[older.id]).toMatchObject({ seats: 2, paid: true });

		const all = await bookings().list();
		expect(all.map((b) => [b.id, paidThroughOutdatedDeploy(b)])).toEqual(expect.arrayContaining([[outdated.id, true], [older.id, false]]));
		expect(outdatedDeployPayments(all).map((b) => b.id)).toEqual([outdated.id]);
		expect(departuresOn(DATE, all)[0].passengers.map((b) => b.id)).toEqual([outdated.id]);
		// Staff cancelling it takes it off the list.
		await applyAdminAction(outdated.id, { type: 'status', status: 'cancelled' }, 'Staff', NOW);
		expect(outdatedDeployPayments(await bookings().list())).toEqual([]);
	});

	it('leaves stamped payments, demo data, unpaid bookings and other providers alone', () => {
		const base = { paymentStatus: 'paid' as const, paymentProvider: 'teya' as const, paymentRef: 'X', paidAt: '2026-12-01T00:00:00.000Z' };
		expect(paidThroughOutdatedDeploy(base)).toBe(true);
		expect(paidThroughOutdatedDeploy({ ...base, paymentGate: PAYMENT_GATE })).toBe(false);
		expect(paidThroughOutdatedDeploy({ ...base, sample: true })).toBe(false);
		expect(paidThroughOutdatedDeploy({ ...base, paymentStatus: 'unpaid', paidAt: null })).toBe(false);
		expect(paidThroughOutdatedDeploy({ ...base, paymentProvider: null })).toBe(false);
		expect(paidThroughOutdatedDeploy({ ...base, paidAt: GATE_CUTOVER })).toBe(false);
	});
});

describe('rebuild capacity from bookings (S5)', () => {
	const LEDGER = `seats:${tour.slug}|${DATE}|07:20`;
	const at = NOW.toISOString();
	const groupNeed = (seats: number) => ({ kind: 'group' as const, tourSlug: tour.slug, date: DATE, slot: '07:20', adults: seats, children: 0, infants: 0 });

	it('replaces drifted ledgers: adds missing paid claims, drops demo, cancelled and unknown ones, keeps payments in flight', async () => {
		const kept = await paid(group({ adults: 4 }));
		// Paid, but its claim is missing (written straight to the store, as after a rollback).
		const missing = await create(group({ adults: 3, firstName: 'Missing' }));
		await bookings().put({ ...missing, paymentStatus: 'paid', status: 'confirmed', paidAt: at });
		// Claims that shouldn't be there: demo data, a cancelled booking and a booking that no longer exists.
		const sample = await create(group({ adults: 5, firstName: 'Sample' }));
		await bookings().put({ ...sample, sample: true, paymentStatus: 'paid', status: 'confirmed', paidAt: at });
		const cancelled = await paid(group({ adults: 1, firstName: 'Cancelled' }));
		await bookings().put({ ...cancelled, status: 'cancelled' });
		await updateLedger(LEDGER, (ledger) => ({ ...ledger, claims: { ...ledger.claims, [sample.id]: { seats: 5, at, paid: true }, gone: { seats: 2, at, paid: true } } }));
		await updateLedger('boats:2027-07-20', (ledger) => ({ ...ledger, claims: { old: { seats: 2, at, paid: true } } }));
		// A payment in progress right now.
		const flying = await create(group({ adults: 1, firstName: 'Flying' }));
		await claimCapacity(flying, NOW);

		const result = await rebuildLedgers(NOW);
		const claims = (await readLedger(LEDGER))?.claims ?? {};
		expect(Object.keys(claims).sort()).toEqual([kept.id, missing.id, flying.id].sort());
		expect(claims[missing.id]).toEqual({ seats: 3, at, paid: true });
		expect(claims[flying.id].paid).toBeUndefined();
		expect((await readLedger('boats:2027-07-20'))?.claims).toEqual({});
		expect(result).toEqual({ ledgers: 2, claims: 3, removed: 4 });
		// 4 + 3 paid and 1 in flight, of 14: 6 more fit, 7 don't.
		expect(await capacityError(groupNeed(6), NOW)).toBeNull();
		expect(await capacityError(groupNeed(7), NOW)).toBe('full');
		// Nothing left to fix: a second run removes nothing.
		expect((await rebuildLedgers(NOW)).removed).toBe(0);
	});

	it('drops an in-flight claim whose payment never finished, once it has expired', async () => {
		const abandoned = await create(group({ adults: 7 }));
		await claimCapacity(abandoned, NOW);
		expect(Object.keys((await readLedger(LEDGER))?.claims ?? {})).toEqual([abandoned.id]);
		await rebuildLedgers(new Date(NOW.getTime() + 20 * 60_000));
		expect((await readLedger(LEDGER))?.claims).toEqual({});
	});

	it('leaves the ledgers of departures before today (Split) alone (round 2, N5)', async () => {
		// NOW is 1 June 2027, 12:00 in Split: 31 May has sailed, 1 June hasn't.
		const pastId = `seats:${tour.slug}|2027-05-31|07:20`;
		const todayId = `seats:${tour.slug}|2027-06-01|07:20`;
		for (const id of [pastId, todayId]) await updateLedger(id, (ledger) => ({ ...ledger, claims: { gone: { seats: 2, at, paid: true } } }));
		// A paid booking on the past date whose claim is missing: not added back either.
		const past = await create(group({ firstName: 'Past' }));
		await bookings().put({ ...past, date: '2027-05-31', paymentStatus: 'paid', status: 'confirmed', paidAt: at, paymentGate: PAYMENT_GATE });

		const result = await rebuildLedgers(NOW);
		expect((await readLedger(pastId))?.claims).toEqual({ gone: { seats: 2, at, paid: true } });
		expect((await readLedger(todayId))?.claims).toEqual({});
		expect(result).toEqual({ ledgers: 1, claims: 0, removed: 1 });
	});
});

describe('ledger pruning (nightly)', () => {
	const claim = { seats: 1, at: NOW.toISOString(), paid: true as const };
	const ids = ['boats:2027-06-30', `seats:${tour.slug}|2027-06-30|07:20`, 'boats:2027-07-01', `seats:${tour.slug}|2027-07-08|07:20`];

	it('deletes the ledgers of departures before the given date, and nothing else', async () => {
		for (const id of ids) await updateLedger(id, (ledger) => ({ ...ledger, claims: { a: claim } }));
		expect(await pruneLedgers('2027-07-01')).toBe(2);
		expect((await ledgerIds()).sort()).toEqual([ids[2], ids[3]].sort());
	});

	it(`runs nightly, keeping the last ${LEDGER_KEEP_DAYS} days`, async () => {
		for (const id of ids) await updateLedger(id, (ledger) => ({ ...ledger, claims: { a: claim } }));
		const backups = new Map<string, unknown>();
		const open = () => ({
			list: async () => ({ blobs: [...backups.keys()].map((key) => ({ key })) }),
			get: async (key: string) => backups.get(key) ?? null,
			setJSON: async (key: string, value: unknown) => backups.set(key, value),
			delete: async (key: string) => void backups.delete(key),
		});
		// 8 July in Split: the ledgers of 30 June and before go.
		const result = await runNightly(new Date('2027-07-08T10:00:00Z'), open);
		expect(result.ledgersPruned).toBe(2);
		expect((await ledgerIds()).sort()).toEqual([ids[2], ids[3]].sort());
	});
});
