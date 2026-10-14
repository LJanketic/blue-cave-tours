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

/**
 * Private tours may leave from Zenta instead of the Riva; the exact spot is
 * confirmed with the guest after booking. Same link format as MEETING_POINT_MAP_URL.
 */
export const ZENTA_MEETING_POINT_LABEL = 'Zenta, Split';
export const ZENTA_MEETING_POINT_MAP_URL = 'https://www.google.com/maps/search/?api=1&query=43.501086%2C16.462353';

/** Who signs the booking confirmation email. */
export const EMAIL_SIGN_OFF = 'The Hello Blue Cave team';

export const SITE_DEFAULT_DESCRIPTION =
	'Boat tours and private charters from Split — Blue Cave, islands, and the best of the Adriatic.';

/** Brand sea blue: the `theme-color` meta tag and the web app manifest. */
export const SITE_THEME_COLOR = '#1a6fc4';

/** Copy computes "years operating" from this (D-14; the design says 2015, the current site 2016). */
export const FOUNDING_YEAR = 2016;

/** Contact office hours, e.g. 'Daily 08:00–20:00'. Null until the owner confirms them (C-7); hidden until then. */
export const OFFICE_HOURS: string | null = null;

/**
 * "Licensed maritime operator · Croatia" in the footer and the checkout trust
 * strip. False until the owner confirms the licence (C-7): hidden until then.
 */
export const LICENCE_CONFIRMED = false;

/** The footer's one-line blurb (C-20). */
export const SITE_BLURB = 'Speedboat tours and private charters from Split.';

/** How fast messages get a reply, as shown on the contact page ("We reply {REPLY_TIME}"). */
export const REPLY_TIME = 'the same day';

/**
 * What backs a "Best seller" badge (e.g. 'Most booked tour in 2025, booking
 * records'). Null hides every best-seller badge: without evidence the claim is
 * a misleading commercial practice (C-24, UCPD).
 */
export const BESTSELLER_EVIDENCE: string | null = null;

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
