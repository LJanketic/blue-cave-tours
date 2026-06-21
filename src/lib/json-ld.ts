import type { TourDetail } from '../types/tour';
import { SITE_NAME } from '../config/site';
import { parseFromPrice } from './pricing';

/** TouristTrip + Offer JSON-LD for a tour detail page. */
export function tourJsonLd(tour: TourDetail, pageUrl: string): string {
	const price = parseFromPrice(tour.fromPrice);
	const offer =
		price != null
			? {
					'@type': 'Offer',
					price: String(price),
					priceCurrency: 'EUR',
					url: pageUrl,
					availability: 'https://schema.org/InStock',
				}
			: undefined;

	const data = {
		'@context': 'https://schema.org',
		'@type': 'TouristTrip',
		name: tour.title,
		description: tour.shortDescription,
		url: pageUrl,
		provider: {
			'@type': 'TouristInformationCenter',
			name: SITE_NAME,
		},
		...(offer ? { offers: offer } : {}),
	};

	return JSON.stringify(data);
}

export function jsonLdScriptTag(json: string): string {
	return `<script type="application/ld+json">${json}</script>`;
}
