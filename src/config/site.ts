/** Site-wide copy — single source for layout titles and brand name in UI. */

export const SITE_NAME = 'Blue Cave Tours';

export const SITE_DEFAULT_DESCRIPTION =
	'Boat tours and private charters from Split — Blue Cave, islands, and the best of the Adriatic.';

/** Default HTML `<title>` for the home page */
export const HOME_PAGE_TITLE = `${SITE_NAME} — Split boat tours & private charters`;

/**
 * Page titles: `"Segment — Blue Cave Tours"` (use for inner pages).
 * Home uses {@link HOME_PAGE_TITLE} instead.
 */
export function pageTitle(segment: string): string {
	return `${segment} — ${SITE_NAME}`;
}
