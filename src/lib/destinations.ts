import { destinations } from '../data/destinations';
import type { Destination } from '../data/destinations';
import { PHOTO, type PhotoRef } from '../data/tour-photos';
import { getAllTours } from './tours';
import type { TourDetail } from '../types/tour';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export { MONTH_LABELS };

export function getDestinationPhoto(destination: Destination): PhotoRef {
	const photo = PHOTO[destination.imagePhotoId as keyof typeof PHOTO];
	return photo ?? PHOTO.boatSpeed;
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

export function getDestinationsForTour(tourSlug: string): Destination[] {
	return destinations.filter((d) => d.tourSlugs.includes(tourSlug));
}

export function getToursForDestination(destSlug: string): TourDetail[] {
	const destination = getDestinationBySlug(destSlug);
	if (!destination) return [];

	const slugSet = new Set(destination.tourSlugs);
	return getAllTours().filter((t) => slugSet.has(t.slug));
}
