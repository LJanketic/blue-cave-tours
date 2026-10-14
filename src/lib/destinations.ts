import { destinations } from '../data/destinations';
import type { Destination } from '../data/destinations';
import { galleryForDestination } from '../data/destination-photos';
import { PHOTO, type PhotoRef } from '../data/tour-photos';
import { getAllTours } from './tours';
import type { TourDetail } from '../types/tour';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function getDestinationPhoto(destination: Destination): PhotoRef {
	const realPhoto = galleryForDestination(destination.slug).find((photo) => photo.src);
	if (realPhoto) return realPhoto;
	return PHOTO[destination.imagePhotoId];
}

export function getDestinationGallery(destination: Destination): PhotoRef[] {
	return galleryForDestination(destination.slug);
}

/**
 * "Jun – Sep": the run of peak months (score 3), or of very good ones (2) when
 * there's no peak. Null when neither exists.
 */
export function bestSeasonLabel(months: readonly number[]): string | null {
	for (const level of [3, 2]) {
		const first = months.findIndex((score) => score >= level);
		if (first === -1) continue;
		let last = first;
		while (last + 1 < months.length && months[last + 1] >= level) last++;
		return first === last ? MONTH_LABELS[first] : `${MONTH_LABELS[first]} – ${MONTH_LABELS[last]}`;
	}
	return null;
}

export function getAllDestinations(): Destination[] {
	return destinations;
}

export function getDestinationBySlug(slug: string): Destination | undefined {
	return destinations.find((d) => d.slug === slug);
}

/** Touristic destinations a tour visits — excludes the Split departure hub. */
export function getDestinationsForTour(tourSlug: string): Destination[] {
	return destinations.filter((d) => !d.isDepartureHub && d.tourSlugs.includes(tourSlug));
}

/**
 * A tour's headline destination, from its explicit `primaryDestinationSlug`
 * — not guessed from getDestinationsForTour's order, which reflects
 * declaration order in destinations.ts rather than relevance to this tour.
 * Undefined for tours with no single namesake destination.
 */
export function getPrimaryDestinationForTour(tour: TourDetail): Destination | undefined {
	if (!tour.primaryDestinationSlug) return undefined;
	return getDestinationBySlug(tour.primaryDestinationSlug);
}

export function getToursForDestination(destSlug: string): TourDetail[] {
	const destination = getDestinationBySlug(destSlug);
	if (!destination) return [];

	const slugSet = new Set(destination.tourSlugs);
	return getAllTours().filter((t) => slugSet.has(t.slug));
}
