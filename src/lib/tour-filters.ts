import type { TourDetail, ItineraryKind } from '../types/tour';
import { supportsInstantBook } from './booking';

/** Multi-select filter ids used by the tours overview. OR logic across the set. */
export type TourFilter = 'group' | 'private' | 'short' | 'sunset';

export function isPrivateTour(tour: Pick<TourDetail, 'slug'>): boolean {
	return !supportsInstantBook(tour);
}

/**
 * The booking modes a tour offers. Explicit `types` on the tour win; otherwise
 * quote-only tours are private and instant-book tours are group departures that
 * can also be booked as a private charter.
 */
export function tourTypes(tour: TourDetail): ('group' | 'private')[] {
	if (tour.types && tour.types.length) return tour.types;
	return isPrivateTour(tour) ? ['private'] : ['group', 'private'];
}

export function tourTags(tour: TourDetail): string[] {
	const tags: string[] = [];
	if (tour.itineraryKind === 'morning' || tour.itineraryKind === 'afternoon') tags.push('half-day');
	if (tour.slug.includes('lagoon') || tour.itinerary.some((s) => /swim/i.test(s))) tags.push('swim');
	return tags;
}

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
			return tourTypes(tour).includes('group');
		case 'private':
			return tourTypes(tour).includes('private');
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

export function parsePrice(price: string): number {
	const match = price.match(/€(\d+)/);
	return match ? Number(match[1]) : 0;
}

export function sortTours(tours: TourDetail[], sort: string): TourDetail[] {
	const copy = [...tours];
	switch (sort) {
		case 'price-asc':
			return copy.sort((a, b) => parsePrice(a.fromPrice) - parsePrice(b.fromPrice));
		case 'price-desc':
			return copy.sort((a, b) => parsePrice(b.fromPrice) - parsePrice(a.fromPrice));
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

export function durationLabel(kind: ItineraryKind): string {
	switch (kind) {
		case 'morning':
		case 'afternoon':
			return 'Half day';
		case 'full':
			return 'Full day';
		default:
			return 'Flexible';
	}
}
