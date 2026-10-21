/**
 * Private charter request (spec §8.2, board 06 as changed by the 20 Oct
 * handoff). Routes follow the handoff's order, with "Your own route" last.
 * Each route is one of our tours, booked as a private boat.
 *
 * OWNER (D-8): durations are placeholders until the operator confirms which
 * lengths are offered. There is no price table, so the page shows "We'll send
 * you a quote", and no extras, so the extras card isn't shown.
 */

export type CharterRoute = {
	/** Stored on the request; also the `?tour=` value that preselects it. */
	id: string;
	label: string;
	/** The tour page and the tour the booking is filed under. */
	tourSlug: string;
	/** Other tour slugs that preselect this route (Blue Lagoon runs as two tours). */
	aliases?: string[];
	icon: string;
};

export const CUSTOM_ROUTE_ID = 'custom';

export const CHARTER_ROUTES: readonly CharterRoute[] = [
	{ id: 'blue-cave-hvar-5-islands', label: 'Blue Cave & Hvar 5 Islands', tourSlug: 'blue-cave-hvar-5-islands', icon: 'droplet' },
	{ id: 'golden-horn-brac-hvar', label: 'Golden Horn & Hvar', tourSlug: 'golden-horn-brac-hvar', icon: 'beach' },
	{ id: 'blue-lagoon', label: 'Blue Lagoon & Trogir', tourSlug: 'blue-lagoon-morning', aliases: ['blue-lagoon-morning', 'blue-lagoon-afternoon'], icon: 'swimming' },
	{ id: 'hvar-red-rocks-pakleni', label: 'Red Rocks & Pakleni', tourSlug: 'hvar-red-rocks-pakleni', icon: 'mountain' },
	{ id: 'dubrovnik-one-way', label: 'Split to Dubrovnik', tourSlug: 'dubrovnik-one-way', icon: 'building-fortress' },
	{ id: CUSTOM_ROUTE_ID, label: 'Your own route', tourSlug: 'create-perfect-day-private', icon: 'map' },
];

/** Hours offered (placeholder, D-8). */
export const CHARTER_DURATIONS = [1, 2, 3, 4, 6, 8, 10] as const;
export type CharterDuration = (typeof CHARTER_DURATIONS)[number];

/** Departure time and length shown before the guest picks them (as designed). */
export const CHARTER_DEFAULT_TIME = '10:00';
export const CHARTER_DEFAULT_HOURS = 4;
/** "HH:MM", 24h. */
export const CHARTER_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
/** Earliest and latest preferred departure we accept. */
export const CHARTER_EARLIEST_TIME = '06:00';
export const CHARTER_LATEST_TIME = '20:00';

/** Default length of a quote's validity, and the range staff can pick. */
export const QUOTE_VALID_DAYS = { default: 3, min: 1, max: 14 } as const;

/** Highest price staff can quote, as a typo guard (euros). */
export const QUOTE_MAX_EUR = 20_000;
/** Longest note staff can send with a quote. */
export const QUOTE_NOTE_MAX = 1000;

export function durationLabel(hours: number): string {
	if (hours >= 10) return `Long day (${hours} h)`;
	if (hours >= 8) return `Full day (${hours} h)`;
	return hours === 1 ? '1 hour' : `${hours} hours`;
}

export function routeById(id: string): CharterRoute | null {
	return CHARTER_ROUTES.find((r) => r.id === id) ?? null;
}

/** The offered duration closest to a tour's length (ties go to the longer one), for the default. */
export function closestDuration(hours: number): CharterDuration {
	return CHARTER_DURATIONS.reduce((best, d) => (Math.abs(d - hours) <= Math.abs(best - hours) ? d : best), CHARTER_DURATIONS[0]);
}
