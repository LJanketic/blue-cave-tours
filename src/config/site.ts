/** Site-wide constants — contact, locale defaults, and page titles. */

export const SITE_NAME = 'Blue Cave Tours';

export const SITE_EMAIL = 'info@bluecavetours.com';
export const SITE_PHONE = '+385 91 988 88 38';
export const SITE_PHONE_TEL = '+385919888838';
export const SITE_TIMEZONE = 'Europe/Zagreb';
export const SITE_CURRENCY = 'EUR';

export const SITE_MEETING_POINT = 'Riva promenade of Split, stand number 14';

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
