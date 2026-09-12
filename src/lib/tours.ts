import { tours } from '../data/tour-catalog';
import type { PhotoRef } from '../data/tour-photos';
import type { TourDetail } from '../types/tour';

const FEATURED_HOME_COUNT = 5;

export function getAllTours(): TourDetail[] {
	return tours;
}

export function getTourBySlug(slug: string): TourDetail | undefined {
	return tours.find((t) => t.slug === slug);
}

/** Card/thumb image — first destination-owned gallery photo, else the hero placeholder. */
export function getTourCardPhoto(tour: TourDetail): PhotoRef {
	return tour.gallery.find((photo) => photo.src) ?? tour.image;
}

/** Homepage: up to five tours — starred first, then remaining catalog order. */
export function getFeaturedTours(): TourDetail[] {
	const starred = tours.filter((t) => t.featured);
	const seen = new Set<string>();
	const out: TourDetail[] = [];

	for (const t of starred) {
		if (out.length >= FEATURED_HOME_COUNT) break;
		out.push(t);
		seen.add(t.slug);
	}
	for (const t of tours) {
		if (out.length >= FEATURED_HOME_COUNT) break;
		if (!seen.has(t.slug)) {
			out.push(t);
			seen.add(t.slug);
		}
	}
	return out.slice(0, FEATURED_HOME_COUNT);
}
