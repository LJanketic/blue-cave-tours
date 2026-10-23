import type { SeasonAmount } from './season';

/*
 * Private experience, paid on the site (operator doc "Booking tipovi i
 * otvorene stavke", 22 Oct 2026): the whole boat at one price per tour and
 * price season, plus priced extras and a pick-up point. No catalog import,
 * so the booking island can use this.
 *
 * Being in PRIVATE_TOURS is what makes a tour "book private and pay now".
 * Only what the operator's doc states is here; every other private tour stays
 * on request (/private-charter/) until the operator gives its boat price.
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
 * Boat prices from the operator's doc: Blue Cave €1,500 low / €2,000 peak.
 * The doc says the departure may shift in 15-minute steps up to each tour's
 * latest departure, but gives no latest departures yet: pending from the
 * operator (Vedro). Until then Blue Cave leaves at its usual time.
 */
export const PRIVATE_TOURS: Readonly<Record<string, PrivateTour>> = {
	'blue-cave-hvar-5-islands': { boat: { low: 1500, peak: 2000 } },
};

export type PrivateExtra = { id: string; label: string; desc: string; price: number };

/**
 * Extras the guest can add and pay for. None yet: the doc names champagne,
 * which is added here once the operator gives its price. With an empty list
 * the booking flow shows no extras and the server refuses any.
 */
export const PRIVATE_EXTRAS: readonly PrivateExtra[] = [];

export type PrivatePickup = { id: string; label: string; price: number };

/** The meeting point, at no charge: chosen unless the guest picks another. */
export const DEFAULT_PICKUP_ID = 'riva';

/** Any other place: not priced, so the booking becomes a request (the quote flow). */
export const OTHER_PICKUP_ID = 'other';

/**
 * Pick-up points the guest can book and pay for straight away. Only the Riva
 * for now: anywhere else is a request (OTHER_PICKUP_ID). When the operator
 * gives priced spots, list them here; a priced one becomes a line item.
 */
export const PRIVATE_PICKUPS: readonly PrivatePickup[] = [{ id: DEFAULT_PICKUP_ID, label: 'Riva stand 14 (meeting point)', price: 0 }];

/** Longest pick-up location a guest can type for "Other location". */
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

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const hhmm = (total: number) => `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

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
	const end = minutes(latest);
	const times: string[] = [];
	for (let t = minutes(defaultSlot); t <= end; t += PRIVATE_TIME_STEP_MINUTES) times.push(hhmm(t));
	if (times.length && times[times.length - 1] !== latest) times.push(latest);
	return times;
}
