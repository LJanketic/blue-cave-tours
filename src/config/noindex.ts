/**
 * Path prefixes kept out of the sitemap. These pages carry a `noindex` robots
 * meta tag. Shared by astro.config.mjs (sitemap filter).
 */
export const NOINDEX_PATH_PREFIXES = ['/book/', '/booking/', '/api/'];

/**
 * robots.txt Disallow rules. Only server-rendered routes: every crawl of them
 * is a paid function invocation. Prerendered noindex pages (e.g. the group
 * booking pages) stay crawlable, because a crawler that can't fetch a page
 * never sees its noindex tag. `*` is supported by Google and Bing.
 * noindex.test.ts fails if a server-rendered route is missing here.
 */
export const ROBOTS_DISALLOW = ['/api/', '/book/*/review', '/booking/success', '/booking/error'];
