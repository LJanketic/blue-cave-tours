/** Site-wide copy — single source for layout titles and brand name in UI. */

export const SITE_NAME = 'Hello Blue Cave';

export const SITE_EMAIL = 'info@hellobluecave.com';

export const SITE_PHONE = '+385919888838';
export const SITE_PHONE_DISPLAY = '+385 91 988 88 38';

/** Where every tour starts. One place for the website and the emails. */
export const MEETING_POINT_LABEL = 'Riva promenade, stand 14, Split';
/**
 * Pin on stand 14 (from the owner's map link, maps.app.goo.gl/ERYyiPtg45ux4DWL7).
 * A plain coordinates link rather than the short link, so it doesn't depend on
 * Google's link shortener; it opens the Maps app on phones.
 */
export const MEETING_POINT_MAP_URL = 'https://www.google.com/maps/search/?api=1&query=43.5072282%2C16.4391746';

/** Who signs the booking confirmation email. */
export const EMAIL_SIGN_OFF = 'The Hello Blue Cave team';

export const SITE_DEFAULT_DESCRIPTION =
	'Boat tours and private charters from Split — Blue Cave, islands, and the best of the Adriatic.';

/** Brand teal — used for the `theme-color` meta tag and the web app manifest. */
export const SITE_THEME_COLOR = '#1d9e75';

/** Icon paths — shared by BaseLayout's <link> tags and the web app manifest. */
export const FAVICON_PATH = '/favicon.svg';
export const APPLE_TOUCH_ICON_PATH = '/apple-touch-icon.png';

/** Default HTML `<title>` for the home page */
export const HOME_PAGE_TITLE = `${SITE_NAME} — Split boat tours & private charters`;

/**
 * Page titles: `"Segment — Hello Blue Cave"` (use for inner pages).
 * Home uses {@link HOME_PAGE_TITLE} instead.
 */
export function pageTitle(segment: string): string {
	return `${segment} — ${SITE_NAME}`;
}
