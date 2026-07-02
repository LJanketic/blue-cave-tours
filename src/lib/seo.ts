import type { TourDetail } from '../types/tour';
import type { FaqItem } from '../data/faq';
import { SITE_NAME, SITE_EMAIL, SITE_PHONE, SITE_DEFAULT_DESCRIPTION } from '../config/site';

export const DEFAULT_OG_IMAGE = '/og-default.svg';

export function absoluteUrl(path: string, site: URL | string | undefined): string {
	const base = site instanceof URL ? site : site ? new URL(site) : undefined;
	if (!base) return path;
	return new URL(path, base).href;
}

export function organizationJsonLd(siteUrl: string) {
	return {
		'@context': 'https://schema.org',
		'@type': 'TouristInformationCenter',
		name: SITE_NAME,
		url: siteUrl,
		email: SITE_EMAIL,
		telephone: SITE_PHONE,
		description: SITE_DEFAULT_DESCRIPTION,
		address: {
			'@type': 'PostalAddress',
			streetAddress: 'Riva promenade, stand 14',
			addressLocality: 'Split',
			addressCountry: 'HR',
		},
		areaServed: {
			'@type': 'AdministrativeArea',
			name: 'Central Dalmatia',
		},
	};
}

export function websiteJsonLd(siteUrl: string) {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: SITE_NAME,
		url: siteUrl,
		description: SITE_DEFAULT_DESCRIPTION,
		publisher: {
			'@type': 'Organization',
			name: SITE_NAME,
			url: siteUrl,
		},
	};
}

export function tourJsonLd(tour: TourDetail, siteUrl: string) {
	const tourUrl = `${siteUrl.replace(/\/$/, '')}/tours/${tour.slug}`;
	const priceMatch = tour.fromPrice.match(/€(\d+)/);

	return {
		'@context': 'https://schema.org',
		'@type': 'TouristTrip',
		name: tour.title,
		description: tour.shortDescription,
		url: tourUrl,
		touristType: tour.slug.includes('private') ? 'Private tour' : 'Group tour',
		...(priceMatch
			? {
					offers: {
						'@type': 'Offer',
						price: priceMatch[1],
						priceCurrency: 'EUR',
						url: tourUrl,
						availability: 'https://schema.org/InStock',
					},
				}
			: {}),
		provider: {
			'@type': 'TouristInformationCenter',
			name: SITE_NAME,
			url: siteUrl,
		},
	};
}

export function faqPageJsonLd(items: FaqItem[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: items.map((item) => ({
			'@type': 'Question',
			name: item.question,
			acceptedAnswer: {
				'@type': 'Answer',
				text: item.answer,
			},
		})),
	};
}

export function breadcrumbJsonLd(
	items: { name: string; url: string }[],
) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.name,
			item: item.url,
		})),
	};
}
