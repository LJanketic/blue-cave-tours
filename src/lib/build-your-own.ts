import type { CardBadge, TourCardDTO } from './cards';

/*
 * The Tours overview's "Build your own" card (handoff 02, D4c): Create Your
 * Perfect Day is the custom private day, not a tour with a group departure,
 * so it closes the list whatever the sort. No catalog import: this runs in
 * the browser.
 */

export const BUILD_YOUR_OWN_SLUG = 'create-perfect-day-private';

const BUILD_YOUR_OWN_BADGE: CardBadge = { label: 'Build your own', tone: 'premium' };

export function isBuildYourOwn(tour: Pick<TourCardDTO, 'slug'>): boolean {
	return tour.slug === BUILD_YOUR_OWN_SLUG;
}

/** The list with the custom day moved to the end; everything else keeps its order. */
export function buildYourOwnLast<T extends Pick<TourCardDTO, 'slug'>>(tours: T[]): T[] {
	return [...tours.filter((tour) => !isBuildYourOwn(tour)), ...tours.filter(isBuildYourOwn)];
}

/** Its card says "Build your own" in place of the generic "Private" badge; an earned badge (Best seller…) stays. */
export function withBuildYourOwnBadge(tour: TourCardDTO): TourCardDTO {
	if (!isBuildYourOwn(tour) || (tour.badge && tour.badge.tone !== 'private')) return tour;
	return { ...tour, badge: BUILD_YOUR_OWN_BADGE };
}
