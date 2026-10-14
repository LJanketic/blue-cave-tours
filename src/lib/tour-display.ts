import { BESTSELLER_EVIDENCE } from '../config/site';
import type { TourDetail } from '../types/tour';

/*
 * Display rules for tours. No catalog import, so Vue islands can use these
 * without shipping the tour data to the browser.
 */

/** "Best seller" shows only with evidence behind it (C-24): the badge AND BESTSELLER_EVIDENCE. */
export function showsBestseller(tour: Pick<TourDetail, 'badge'>, evidence: string | null = BESTSELLER_EVIDENCE): boolean {
	return tour.badge === 'bestseller' && evidence !== null;
}

/** The "Cave entry" fact on a tour page: the cave fee if there is one, else that the route skips the cave. */
export function caveEntryNote(tour: Pick<TourDetail, 'additionalFees'>): string {
	return tour.additionalFees[0]?.text ?? 'This route does not visit the Blue Cave.';
}

export type Cta = { label: string; href: string };

/** The landing page for private charters (D-23): its primary action is the charter request. */
const CHARTER_LANDING = 'create-perfect-day-private';
/** One-way transfers aren't charters to plan: they're enquired about. */
const NO_CHARTER_CTA = new Set(['dubrovnik-one-way']);

/**
 * The tour page's booking actions (spec §6.3.4):
 * - instant-book tours: "Book group tour"
 * - the charter landing page: "Plan your charter"
 * - everything quoted on request: "Enquire about this tour"
 * plus "Book as private charter" wherever a private charter is offered and
 * isn't already the main action.
 */
export function tourCtas(
	tour: Pick<TourDetail, 'slug' | 'types' | 'adultPrice'>,
	links: { book: (slug: string) => string; contact: (slug: string) => string; charter: (slug: string) => string },
): { primary: Cta; secondary: Cta | null } {
	const instant = tour.types.includes('group') && tour.adultPrice !== null;
	const primary: Cta = instant
		? { label: 'Book group tour', href: links.book(tour.slug) }
		: tour.slug === CHARTER_LANDING
			? { label: 'Plan your charter', href: links.charter(tour.slug) }
			: { label: 'Enquire about this tour', href: links.contact(tour.slug) };
	const offersCharter = tour.types.includes('private') && !NO_CHARTER_CTA.has(tour.slug) && tour.slug !== CHARTER_LANDING;
	return { primary, secondary: offersCharter ? { label: 'Book as private charter', href: links.charter(tour.slug) } : null };
}
