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
