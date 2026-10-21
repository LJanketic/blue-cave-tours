/**
 * Where "plan a private charter" goes (spec §9.3): the charter request page
 * (§8.2), with the tour's route preselected. Every charter CTA uses this.
 */
const DEFAULT_CHARTER_TOUR = 'create-perfect-day-private';

export function charterUrl(slug?: string): string {
	return `/private-charter/?tour=${encodeURIComponent(slug ?? DEFAULT_CHARTER_TOUR)}`;
}
