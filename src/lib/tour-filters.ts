import type { TourDetail } from '../types/tour';
import { isGroupTour } from './booking';

/** Multi-select filter ids used by the tours overview. OR logic across the set. */
export type TourFilter = 'group' | 'private' | 'short' | 'sunset';

export function isShortTour(tour: Pick<TourDetail, 'tags'>): boolean {
	return tour.tags.includes('half-day');
}

export function isSunsetTour(tour: Pick<TourDetail, 'tags'>): boolean {
	return tour.tags.includes('sunset');
}

export function matchesFilter(tour: TourDetail, filter: TourFilter): boolean {
	switch (filter) {
		case 'group':
			return isGroupTour(tour);
		case 'private':
			return tour.types.includes('private');
		case 'short':
			return isShortTour(tour);
		case 'sunset':
			return isSunsetTour(tour);
		default:
			return true;
	}
}

/** OR logic — a tour passes when no filters are active or it matches any active filter. */
export function matchesAnyFilter(tour: TourDetail, filters: Iterable<TourFilter>): boolean {
	const active = [...filters];
	if (active.length === 0) return true;
	return active.some((filter) => matchesFilter(tour, filter));
}

/** Quote-only tours ("On request", "Price on request") always sort after priced ones. */
function comparePrice(a: TourDetail, b: TourDetail, direction: 1 | -1): number {
	const priceA = a.adultPrice;
	const priceB = b.adultPrice;
	if (priceA === null && priceB === null) return 0;
	if (priceA === null) return 1;
	if (priceB === null) return -1;
	return (priceA - priceB) * direction;
}

export function sortTours(tours: TourDetail[], sort: string): TourDetail[] {
	const copy = [...tours];
	switch (sort) {
		case 'price-asc':
			return copy.sort((a, b) => comparePrice(a, b, 1));
		case 'price-desc':
			return copy.sort((a, b) => comparePrice(a, b, -1));
		case 'duration':
			return copy.sort((a, b) => a.durationHours - b.durationHours);
		default:
			return copy.sort((a, b) => Number(b.featured) - Number(a.featured));
	}
}

export function searchTours(tours: TourDetail[], query: string): TourDetail[] {
	const q = query.trim().toLowerCase();
	if (!q) return tours;
	return tours.filter(
		(t) =>
			t.title.toLowerCase().includes(q) ||
			t.shortDescription.toLowerCase().includes(q) ||
			t.tagline.toLowerCase().includes(q),
	);
}

