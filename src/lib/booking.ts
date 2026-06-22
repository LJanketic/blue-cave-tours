import type { TourDetail } from '../types/tour';
import { getCheckoutMode } from '../server/checkout-mode';

const QUOTE_ONLY_SLUGS = new Set(['create-perfect-day-private']);

/** Tours that must use contact / quote flow instead of Stripe. */
export function supportsOnlineCheckout(tour: Pick<TourDetail, 'slug'>): boolean {
	if (QUOTE_ONLY_SLUGS.has(tour.slug)) return false;
	return getCheckoutMode() !== 'off';
}

export function contactHrefForTour(tour: Pick<TourDetail, 'slug'>): string {
	return `/contact?tour=${encodeURIComponent(tour.slug)}`;
}
