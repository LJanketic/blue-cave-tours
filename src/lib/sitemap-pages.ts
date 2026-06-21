import { tours } from '../data/tour-catalog';
import { defaultLocale, locales } from '../i18n/locales';

const STATIC_PATHS = ['/', '/tours', '/contact', '/faq', '/legal/privacy', '/legal/terms'] as const;

/** Path for a locale (default `hr` has no prefix). */
export function localizedPath(locale: string, pathname: string): string {
	const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
	if (locale === defaultLocale) return path || '/';
	return `/${locale}${path}`;
}

/** All public URLs for sitemap generation at build time. */
export function buildSitemapUrls(siteOrigin: string): string[] {
	const origin = siteOrigin.replace(/\/$/, '');
	const urls: string[] = [];

	for (const locale of locales) {
		for (const path of STATIC_PATHS) {
			urls.push(`${origin}${localizedPath(locale, path)}`);
		}
		for (const tour of tours) {
			urls.push(`${origin}${localizedPath(locale, `/tours/${tour.slug}`)}`);
		}
	}

	return urls;
}
