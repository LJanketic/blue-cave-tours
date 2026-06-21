export const locales = ['hr', 'en', 'de', 'es', 'it'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'hr';

export const localeLabels: Record<Locale, string> = {
	hr: 'Hrvatski',
	en: 'English',
	de: 'Deutsch',
	es: 'Español',
	it: 'Italiano',
};

export function isLocale(value: string | undefined): value is Locale {
	return locales.includes(value as Locale);
}
