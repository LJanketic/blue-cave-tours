import { BESTSELLER_EVIDENCE, MEETING_POINT_LABEL, MEETING_POINT_MAP_URL, ZENTA_MEETING_POINT_MAP_URL } from '../config/site';
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

/**
 * The tour page's booking actions (spec §6.3.4):
 * - instant-book tours: "Book group tour"
 * - the charter landing page: "Plan your charter"
 * - everything quoted on request: "Enquire about this tour"
 * plus "Book as private charter" on group tours that also run privately. A
 * private-only tour's enquiry already is the charter request, so it gets no
 * second button to the same form.
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
	const offersCharter = instant && tour.types.includes('private');
	return { primary, secondary: offersCharter ? { label: 'Book as private charter', href: links.charter(tour.slug) } : null };
}

/** A run of text in a fact tile; with `href` it's an external map link. */
export type TextPart = { text: string; href?: string };

/**
 * The "Meeting point" tile. Group tours leave from the Riva; private tours
 * may leave from the Riva or Zenta, and the exact spot is confirmed with the
 * guest after booking.
 * - flexible itinerary (Create Your Perfect Day), whatever the types: agreed
 *   when booking, with the Riva and Zenta as examples
 * - group only: the Riva link
 * - private only: "Riva stand 14 or Zenta", both linked, plus a note
 * - both: the Riva link, then "Private tours: Riva stand 14 or Zenta"
 */
export function meetingPointLines(
	tour: Pick<TourDetail, 'types'> & Partial<Pick<TourDetail, 'itineraryKind'>>,
): { lines: TextPart[][]; note: string | null } {
	const riva: TextPart = { text: MEETING_POINT_LABEL, href: MEETING_POINT_MAP_URL };
	const riva14: TextPart = { text: 'Riva stand 14', href: MEETING_POINT_MAP_URL };
	const zenta: TextPart = { text: 'Zenta', href: ZENTA_MEETING_POINT_MAP_URL };
	if (tour.itineraryKind === 'flexible') {
		return { lines: [[{ text: 'Flexible, agreed when you book' }], [{ text: 'For example ' }, riva14, { text: ' or ' }, zenta]], note: null };
	}
	if (!tour.types.includes('private')) return { lines: [[riva]], note: null };
	if (!tour.types.includes('group')) {
		return { lines: [[riva14, { text: ' or ' }, zenta]], note: 'Exact spot confirmed after booking' };
	}
	return { lines: [[riva], [{ text: 'Private tours: Riva stand 14 or ' }, zenta]], note: null };
}
