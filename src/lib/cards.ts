import type { Destination } from '../data/destinations';
import type { TourDetail } from '../types/tour';
import { showsBestseller } from './tour-display';

/*
 * What a card island needs, and nothing more (spec §6.2.3): the props of a
 * hydrated island are serialised into the page, so they stay slim. No catalog
 * import here, so islands can import the types.
 */

/**
 * A card photo for a Vue island (TourImage.astro can't render there). Island
 * props are serialised into the page, so it's only the srcset (its first
 * candidate is the fallback src) and the alt text: card boxes have a fixed
 * height, so width and height aren't needed against layout shift.
 */
export type CardPhoto = { srcset: string; alt: string };

/** The fallback `src` of a card photo: its srcset's first candidate. */
export function cardPhotoSrc(photo: CardPhoto): string {
	return photo.srcset.split(' ')[0];
}

export type CardBadge = { label: string; tone: 'brand' | 'private' | 'premium' | 'tip' | 'neutral' };

export type TourCardDTO = {
	slug: string;
	title: string;
	adultPrice: number | null;
	priceUnit: TourDetail['priceUnit'];
	durationShort: string;
	durationHours: number;
	/** Left out when false. */
	featured?: boolean;
	/** At most one, already resolved (§6.2.2); left out when there's none. */
	badge?: CardBadge;
	types: TourDetail['types'];
	/** Only the tags a filter uses (half-day, sunset). */
	tags: TourDetail['tags'];
	destinationSlugs: string[];
	/** "+ Blue Cave ticket, paid on site": mandatory on-site fees must show next to the price. */
	mandatoryFeeLabel?: string;
	/** The tagline, lower-cased, searched with the title for ?q= links. */
	searchText: string;
	photo: CardPhoto | null;
};

/** The card's one badge, by priority: Best seller (with evidence) · Our pick · New · Private (private-only tours). */
export function tourCardBadge(tour: Pick<TourDetail, 'badge' | 'types'>, evidence?: string | null): CardBadge | null {
	if (showsBestseller(tour, evidence)) return { label: 'Best seller', tone: 'brand' };
	if (tour.badge === 'pick') return { label: 'Our pick', tone: 'brand' };
	if (tour.badge === 'new') return { label: 'New', tone: 'neutral' };
	if (tour.types.length === 1 && tour.types[0] === 'private') return { label: 'Private', tone: 'private' };
	return null;
}

export function mandatoryFeeLabel(tour: Pick<TourDetail, 'additionalFees'>): string | undefined {
	const fees = tour.additionalFees.filter((fee) => fee.mandatory);
	return fees.length ? `+ ${fees.map((fee) => fee.shortText).join(', ')}` : undefined;
}

/**
 * The card's data for the islands. Island props are inlined in the page
 * (§6.2.3: ≤ 6 KB for the whole catalog), so empty fields are left out.
 */
export function toTourCardDTO(tour: TourDetail, destinationSlugs: string[], photo: CardPhoto | null): TourCardDTO {
	const badge = tourCardBadge(tour);
	const fee = mandatoryFeeLabel(tour);
	return {
		slug: tour.slug,
		title: tour.title,
		adultPrice: tour.adultPrice,
		priceUnit: tour.priceUnit,
		durationShort: tour.durationShort,
		durationHours: tour.durationHours,
		...(tour.featured ? { featured: true } : {}),
		...(badge ? { badge } : {}),
		types: tour.types,
		tags: tour.tags.filter((tag) => FILTER_TAGS.has(tag)),
		destinationSlugs,
		...(fee ? { mandatoryFeeLabel: fee } : {}),
		searchText: tour.tagline.toLowerCase(),
		photo,
	};
}

const FILTER_TAGS = new Set<TourDetail['tags'][number]>(['half-day', 'sunset']);

export type DestinationCardDTO = {
	slug: string;
	name: string;
	region: string;
	shortDescription: string;
	attrs: Destination['attrs'];
	categories: Destination['categories'];
	tourCount: number;
	photo: CardPhoto | null;
};

export function toDestinationCardDTO(destination: Destination, tourCount: number, photo: CardPhoto | null): DestinationCardDTO {
	return {
		slug: destination.slug,
		name: destination.name,
		region: destination.region,
		shortDescription: destination.shortDescription,
		attrs: destination.attrs,
		categories: destination.categories,
		tourCount,
		photo,
	};
}
