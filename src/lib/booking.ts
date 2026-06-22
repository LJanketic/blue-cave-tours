import type { TourDetail } from '../types/tour';

const QUOTE_ONLY_SLUGS = new Set(['create-perfect-day-private']);

/** Tours with instant book (preview confirmation flow). Private charters use contact instead. */
export function supportsInstantBook(tour: Pick<TourDetail, 'slug'>): boolean {
	return !QUOTE_ONLY_SLUGS.has(tour.slug);
}

export function contactHrefForTour(tour: Pick<TourDetail, 'slug'>): string {
	return `/contact?tour=${encodeURIComponent(tour.slug)}`;
}
