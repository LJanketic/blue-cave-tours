import { getImage } from 'astro:assets';
import type { TourDetail } from '../types/tour';
import type { Destination } from '../data/destinations';
import type { FaqItem } from '../data/faq';
import type { PhotoRef } from '../data/tour-photos';
import { APPLE_TOUCH_ICON_PATH, SITE_NAME, SITE_EMAIL, SITE_PHONE, SITE_DEFAULT_DESCRIPTION } from '../config/site';
import { isGroupTour } from './booking';

/** Riva stand 14, the group tours' meeting point (MEETING_POINT_MAP_URL). */
const MEETING_POINT_GEO = { latitude: 43.5072282, longitude: 16.4391746 };

/** 1200×630 JPG: social platforms don't render SVG previews. */
export const DEFAULT_OG_IMAGE = '/og-default.jpg';

/**
 * A 1200×630 JPG share image cropped from a page's own photo, built once at
 * build time. Placeholder photos fall back to the site default image and its
 * default alt (`alt` undefined), so the alt always describes the image shown.
 */
export async function socialImageFor(photo: PhotoRef): Promise<{ src: string; alt?: string }> {
	if (!photo.src) return { src: DEFAULT_OG_IMAGE };
	// layout 'none': skip the responsive srcset the global image.layout would
	// otherwise generate; only the single 1200×630 file is referenced.
	const image = await getImage({
		src: photo.src,
		width: 1200,
		height: 630,
		fit: 'cover',
		format: 'jpg',
		quality: 70,
		layout: 'none',
	});
	return { src: image.src, alt: photo.alt };
}

export function absoluteUrl(path: string, site: URL | string | undefined): string {
	const base = site instanceof URL ? site : site ? new URL(site) : undefined;
	if (!base) return path;
	return new URL(path, base).href;
}

/** Stable node id so tour pages can point their provider at the one business entity. */
function businessId(siteUrl: string): string {
	return absoluteUrl('/#business', siteUrl);
}

export function organizationJsonLd(siteUrl: string) {
	return {
		'@context': 'https://schema.org',
		// TravelAgency (a LocalBusiness) fits a tour operator; TouristInformationCenter
		// describes a public tourist office.
		'@type': 'TravelAgency',
		'@id': businessId(siteUrl),
		name: SITE_NAME,
		url: siteUrl,
		logo: absoluteUrl(APPLE_TOUCH_ICON_PATH, siteUrl),
		image: absoluteUrl(DEFAULT_OG_IMAGE, siteUrl),
		email: SITE_EMAIL,
		telephone: SITE_PHONE,
		description: SITE_DEFAULT_DESCRIPTION,
		address: {
			'@type': 'PostalAddress',
			streetAddress: 'Riva promenade, stand 14',
			addressLocality: 'Split',
			postalCode: '21000',
			addressCountry: 'HR',
		},
		geo: { '@type': 'GeoCoordinates', ...MEETING_POINT_GEO },
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
		// The TravelAgency node on the same page, not a second organisation.
		publisher: { '@id': businessId(siteUrl) },
	};
}

export function tourJsonLd(tour: TourDetail, siteUrl: string) {
	const tourUrl = absoluteUrl(`/tours/${tour.slug}/`, siteUrl);
	const adultPrice = tour.adultPrice;

	return {
		'@context': 'https://schema.org',
		'@type': 'TouristTrip',
		name: tour.title,
		description: tour.shortDescription,
		url: tourUrl,
		touristType: isGroupTour(tour) ? 'Group tour' : 'Private tour',
		...(adultPrice !== null
			? {
					offers: {
						'@type': 'Offer',
						price: adultPrice,
						priceCurrency: 'EUR',
						url: tourUrl,
						availability: 'https://schema.org/InStock',
					},
				}
			: {}),
		provider: {
			'@type': 'TravelAgency',
			'@id': businessId(siteUrl),
			name: SITE_NAME,
			url: siteUrl,
		},
	};
}

export function destinationJsonLd(destination: Destination, siteUrl: string) {
	return {
		'@context': 'https://schema.org',
		'@type': 'TouristDestination',
		name: destination.name,
		description: destination.shortDescription,
		url: absoluteUrl(`/destinations/${destination.slug}/`, siteUrl),
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
