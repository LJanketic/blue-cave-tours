import { defaultLocale, isLocale, type Locale } from './locales';
import { ui, type UiKey } from './ui';

export { locales, defaultLocale, localeLabels, isLocale, type Locale } from './locales';
export { ui, type UiKey } from './ui';

export function getLocale(locale: string | undefined): Locale {
	return isLocale(locale) ? locale : defaultLocale;
}

export function t(key: UiKey, locale: string | undefined): string {
	const loc = getLocale(locale);
	return ui[loc][key] ?? ui.en[key] ?? key;
}

export function tf(
	key: UiKey,
	locale: string | undefined,
	vars: Record<string, string | number>,
): string {
	let str = t(key, locale);
	for (const [name, value] of Object.entries(vars)) {
		str = str.replaceAll(`{${name}}`, String(value));
	}
	return str;
}
