import { tours } from '../data/tour-catalog';
import type { PhotoRef } from '../data/tour-photos';
import type { TourDetail } from '../types/tour';

/** Perfect Day, the private "Build your own" day (D4c): a custom charter, so not in the homepage slider. */
const BUILD_YOUR_OWN_SLUG = 'create-perfect-day-private';

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

/**
 * Homepage slider (handoff H10): every tour but the "Build your own" day, in
 * the Tours page's "recommended" order: featured first, then catalog order
 * (as `sortTours` in tour-filters.ts; Array.sort is stable).
 */
export function getSliderTours(): TourDetail[] {
	return tours
		.filter((t) => t.slug !== BUILD_YOUR_OWN_SLUG)
		.sort((a, b) => Number(b.featured === true) - Number(a.featured === true));
}
