/**
 * Path prefixes excluded from search-engine crawling and from the sitemap.
 * Shared by astro.config.mjs (sitemap filter) and src/pages/robots.txt.ts
 * (Disallow rules) so the two never drift apart.
 */
export const NOINDEX_PATH_PREFIXES = ['/book/', '/booking/success', '/booking/error', '/api/'];
