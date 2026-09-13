import { destinations } from '../data/destinations';
import type { Destination } from '../data/destinations';
import { galleryForDestination } from '../data/destination-photos';
import { PHOTO, type PhotoRef } from '../data/tour-photos';
import { getAllTours } from './tours';
import type { TourDetail } from '../types/tour';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export { MONTH_LABELS };

export function getDestinationPhoto(destination: Destination): PhotoRef {
	const realPhoto = galleryForDestination(destination.slug).find((photo) => photo.src);
	if (realPhoto) return realPhoto;
	return PHOTO[destination.imagePhotoId];
}

export function getDestinationGallery(destination: Destination): PhotoRef[] {
	return galleryForDestination(destination.slug);
}

export function bestTimeBarStyle(score: number): { height: string; background: string } {
	if (score >= 3) return { height: '44px', background: 'var(--color-accent-teal)' };
	if (score === 2) return { height: '30px', background: '#5DCAA5' };
	if (score === 1) return { height: '16px', background: '#9FE1CB' };
	return { height: '8px', background: 'var(--color-border-tertiary)' };
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
