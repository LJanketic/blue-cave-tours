import { MAX_GUESTS } from '../lib/booking';

/**
 * The private charter request page (PR 8, §8.2). The owner supplies the
 * routes and durations (D-8, blocking for PR 8); until then they're empty
 * and the page isn't built. Without a price table no estimate is shown
 * ("We'll send a quote"); without extras the extras card is hidden.
 */
export type CharterRoute = { id: string; name: string; description: string; icon: string; destinationSlugs: string[] };
export type CharterDuration = { id: string; label: string; hours: number };

export const CHARTER = {
	routes: [] as CharterRoute[],
	durations: [] as CharterDuration[],
	/** Euros per boat, by duration id; omitted = quote only. */
	priceTable: undefined as Record<string, number> | undefined,
	extras: undefined as { id: string; label: string; priceLabel?: string }[] | undefined,
	maxGuests: MAX_GUESTS,
};
