import type { SeasonAmount } from './season';
import { TIME_RE, toMinutes, toTime } from '../lib/time';

/*
 * Private experience, paid on the site (operator doc "Booking tipovi i
 * otvorene stavke", 22 Oct 2026): the whole boat at one price per tour and
 * price season, plus priced extras and a pick-up point. No catalog import,
 * so the booking island can use this.
 *
 * Being in PRIVATE_TOURS is what makes a tour "book private and pay now":
 * since 8 Nov 2026 that is every fixed-route tour (Mare's placeholder price
 * below). A tour taken out of this list falls back to the same private step
 * (/book/<slug>/private/, offersPrivateFlow in src/lib/booking.ts) as a quote
 * request; Create Your Perfect Day is always a request at /private-charter/.
 * Adding a tour, an extra or a pick-up point is a change to this file only.
 */

export type PrivateTour = {
	/** The whole boat, with skipper, in euros per price season (seasonFor). */
	boat: SeasonAmount;
	/**
	 * The latest the guest may move the departure to, "HH:MM", in 15-minute
	 * steps from the tour's own departure. Without it the boat leaves at the
	 * tour's usual time only.
	 */
	latestDeparture?: string;
};

/**
 * Mare, 8 Nov 2026: every private tour is €1,200 a boat for now, and the
 * latest departure is 11:00, until Vedro confirms the price list and the
 * times. This replaces the doc's Blue Cave €1,500 low / €2,000 peak.
 * The guest may shift the departure in 15-minute steps from the tour's own
 * time up to the latest. The Blue Lagoon afternoon leaves at 14:30, after
 * 11:00, so it keeps its usual time only.
 */
const PRIVATE_BOAT_PRICE = 1200;
const PRIVATE_LATEST_DEPARTURE = '11:00';
const boat = { low: PRIVATE_BOAT_PRICE, peak: PRIVATE_BOAT_PRICE };

export const PRIVATE_TOURS: Readonly<Record<string, PrivateTour>> = {
	'blue-cave-hvar-5-islands': { boat, latestDeparture: PRIVATE_LATEST_DEPARTURE },
	'golden-horn-brac-hvar': { boat, latestDeparture: PRIVATE_LATEST_DEPARTURE },
	'hvar-red-rocks-pakleni': { boat, latestDeparture: PRIVATE_LATEST_DEPARTURE },
	'blue-lagoon-morning': { boat, latestDeparture: PRIVATE_LATEST_DEPARTURE },
	'blue-lagoon-afternoon': { boat },
	'dubrovnik-one-way': { boat, latestDeparture: PRIVATE_LATEST_DEPARTURE },
};

export type PrivateExtra = { id: string; label: string; desc: string; price: number; icon?: string };

/**
 * Extras the guest can add and pay for, per booking (not per guest).
 * ClickUp "Extras for private" (6 Nov 2026): SUP and Seabob with their prices,
 * keep champagne, drop the rest. The champagne price and all three
 * descriptions are from Ivan's design ("05 Private experience"), which the
 * task follows. With an empty list the flow shows no extras and the server
 * refuses any.
 */
export const PRIVATE_EXTRAS: readonly PrivateExtra[] = [
	{ id: 'champagne', label: 'Champagne welcome', desc: 'Chilled on ice, ready when you board', price: 40, icon: 'glass-full' },
	{ id: 'sup', label: 'SUP', desc: 'Stand-up paddleboard, ready to use at any stop', price: 35, icon: 'swimming' },
	{ id: 'seabob', label: 'Seabob', desc: 'Underwater sea scooter for extra fun at sea', price: 150, icon: 'ripple' },
];

export type PrivatePickup = { id: string; label: string; price: number; desc?: string; icon?: string };

/** The meeting point, at no charge: chosen unless the guest picks another. */
export const DEFAULT_PICKUP_ID = 'riva';

/** Any other place: not priced, so the booking becomes a request (the quote flow). */
export const OTHER_PICKUP_ID = 'other';

/**
 * Pick-up points the guest can book and pay for straight away; anywhere else
 * is a request (OTHER_PICKUP_ID). A priced one becomes a line item.
 * ClickUp "Pick up point za private" (6 Nov 2026) lists these ten, in this
 * order; labels, prices and descriptions are from Ivan's design ("05 Private
 * experience", his task comment of 6 Nov). Ivan calls the fees placeholders
 * until the operator confirms them; Luka approved selling them as written.
 * The "Other pickup location" option lives in PrivateBookingFlow.vue.
 */
export const PRIVATE_PICKUPS: readonly PrivatePickup[] = [
	{ id: DEFAULT_PICKUP_ID, label: 'Riva Waterfront (Stand 14), Split', price: 0, desc: 'Our main meeting point, in front of Diocletian’s Palace', icon: 'anchor' },
	{ id: 'zenta', label: 'Zenta Marina, Split', price: 30, desc: 'Marina east of the city centre', icon: 'sailboat' },
	{ id: 'radisson', label: 'Radisson Blu Hotel, Split', price: 40, desc: 'Hotel waterfront, east Split', icon: 'building' },
	{ id: 'le-meridien', label: 'Le Méridien Lav Hotel, Podstrana', price: 60, desc: 'Hotel waterfront, just south of Split', icon: 'building' },
	{ id: 'san-antonio', label: 'Hotel San Antonio, Podstrana', price: 60, desc: 'Hotel waterfront, just south of Split', icon: 'building' },
	{ id: 'trogir', label: 'Old Town Waterfront, Trogir', price: 80, desc: 'Riva promenade, opposite the old town bridge', icon: 'building-castle' },
	{ id: 'stomorska', label: 'Stomorska Waterfront, Šolta Island', price: 100, desc: 'Village harbour on Šolta', icon: 'sailboat' },
	{ id: 'sutivan', label: 'Sutivan Waterfront, Brač Island', price: 100, desc: 'Village waterfront on Brač’s north coast', icon: 'sailboat' },
	{ id: 'milna', label: 'Milna Marina, Brač Island', price: 120, desc: 'Marina on Brač’s west coast', icon: 'sailboat' },
	{ id: 'hvar', label: 'Hvar Town Waterfront, Hvar Island', price: 150, desc: 'Main harbour in Hvar Town', icon: 'anchor' },
];

/** Longest pick-up location a guest can type for "Other pickup location". */
export const OTHER_PICKUP_MAX = 120;

/** Step between the departure times a guest can choose. */
export const PRIVATE_TIME_STEP_MINUTES = 15;

/**
 * The lists the site sells from. The lookups below take them as an optional
 * last argument, defaulting to these; only tests pass others (fixtures), so
 * no made-up tour, extra or price lives in this file.
 */
export type PrivateLists = {
	tours: Readonly<Record<string, PrivateTour>>;
	extras: readonly PrivateExtra[];
	pickups: readonly PrivatePickup[];
};
export const PRIVATE_LISTS: PrivateLists = { tours: PRIVATE_TOURS, extras: PRIVATE_EXTRAS, pickups: PRIVATE_PICKUPS };

export function privateTour(slug: string, lists: PrivateLists = PRIVATE_LISTS): PrivateTour | null {
	return Object.hasOwn(lists.tours, slug) ? lists.tours[slug] : null;
}

export function privateExtra(id: string, lists: PrivateLists = PRIVATE_LISTS): PrivateExtra | null {
	return lists.extras.find((extra) => extra.id === id) ?? null;
}

/** A listed pick-up point; null for the 'other' sentinel and anything unknown. */
export function privatePickup(id: string, lists: PrivateLists = PRIVATE_LISTS): PrivatePickup | null {
	return lists.pickups.find((pickup) => pickup.id === id) ?? null;
}


/**
 * The departure times a private boat can leave at: the tour's own departure,
 * then, when a latest departure is set, every 15 minutes up to it; the latest
 * is always offered even when it's off the 15-minute grid (07:20 … 08:20,
 * 08:30). With no latest, just the tour's own departure. Empty when a time is
 * malformed or the latest is before the first.
 */
export function privateDepartureTimes(defaultSlot: string, latest?: string): string[] {
	if (!TIME_RE.test(defaultSlot)) return [];
	if (latest === undefined) return [defaultSlot];
	if (!TIME_RE.test(latest)) return [];
	const end = toMinutes(latest);
	const times: string[] = [];
	for (let t = toMinutes(defaultSlot); t <= end; t += PRIVATE_TIME_STEP_MINUTES) times.push(toTime(t));
	if (times.length && times[times.length - 1] !== latest) times.push(latest);
	return times;
}
