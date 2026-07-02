import type { TourDetail, ItineraryKind } from '../types/tour';
import { supportsInstantBook } from './booking';

export type TourFilter = 'all' | 'group' | 'private' | 'half-day' | 'swim';

export function isPrivateTour(tour: Pick<TourDetail, 'slug'>): boolean {
	return !supportsInstantBook(tour);
}

export function tourTags(tour: TourDetail): string[] {
	const tags: string[] = [];
	if (tour.itineraryKind === 'morning' || tour.itineraryKind === 'afternoon') tags.push('half-day');
	if (tour.slug.includes('lagoon') || tour.itinerary.some((s) => /swim/i.test(s))) tags.push('swim');
	return tags;
}

export function matchesFilter(tour: TourDetail, filter: TourFilter): boolean {
	if (filter === 'all') return true;
	if (filter === 'group') return supportsInstantBook(tour);
	if (filter === 'private') return isPrivateTour(tour);
	if (filter === 'half-day') return tour.itineraryKind === 'morning' || tour.itineraryKind === 'afternoon';
	if (filter === 'swim') return tourTags(tour).includes('swim');
	return true;
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
			return copy.sort((a, b) => a.duration.localeCompare(b.duration));
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
