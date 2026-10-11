import type { TourDetail } from '../types/tour';
import { isGroupTour } from './booking';
import { parseAdultPrice } from './price';

/** Multi-select filter ids used by the tours overview. OR logic across the set. */
export type TourFilter = 'group' | 'private' | 'short' | 'sunset';

/** Parse the leading hour count from a duration string ("Approx. 8–10 hours" → 8). */
export function parseDurationHours(duration: string): number | null {
	const match = duration.match(/(\d+(?:\.\d+)?)/);
	return match ? Number(match[1]) : null;
}

export function isShortTour(tour: TourDetail): boolean {
	// Real catalog half-days are ~5h; also accept literal <4h if shorter products are added later.
	if (tour.itineraryKind === 'morning' || tour.itineraryKind === 'afternoon') return true;
	if (/half[- ]?day/i.test(`${tour.slug} ${tour.title} ${tour.tagline}`)) return true;
	const hours = parseDurationHours(tour.duration);
	return hours !== null && hours < 4;
}

export function isSunsetTour(tour: TourDetail): boolean {
	const haystack = `${tour.title} ${tour.tagline} ${tour.slug} ${tour.shortDescription}`.toLowerCase();
	return haystack.includes('sunset');
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
	const priceA = parseAdultPrice(a.fromPrice);
	const priceB = parseAdultPrice(b.fromPrice);
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
			return copy.sort(
				(a, b) => (parseDurationHours(a.duration) ?? 0) - (parseDurationHours(b.duration) ?? 0),
			);
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

