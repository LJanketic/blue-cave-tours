/**
 * Where "plan a private charter" goes (spec §9.3). Every charter CTA uses
 * this, so PR 8 switches them all at once: until the /private-charter/
 * request page exists, it's the contact form with the tour preselected.
 */
const DEFAULT_CHARTER_TOUR = 'create-perfect-day-private';

export function charterUrl(slug?: string): string {
	return `/contact/?tour=${encodeURIComponent(slug ?? DEFAULT_CHARTER_TOUR)}&topic=charter`;
}
