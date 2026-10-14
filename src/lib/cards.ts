import type { CardPhoto } from '../data/tour-photos';
import type { Destination } from '../data/destinations';
import type { TourDetail } from '../types/tour';
import { tourFromPrice } from './price';
import { showsBestseller } from './tour-display';

/*
 * What a card island needs, and nothing more (spec §6.2.3): the props of a
 * hydrated island are serialised into the page, so they stay slim. No catalog
 * import here, so islands can import the types.
 */

export type CardBadge = { label: string; tone: 'brand' | 'private' | 'premium' | 'tip' | 'neutral' };

export type TourCardDTO = {
	slug: string;
	title: string;
	adultPrice: number | null;
	priceUnit: TourDetail['priceUnit'];
	/** "€169", or "Price on request" / "On request". */
	priceLabel: string;
	durationShort: string;
	durationHours: number;
	featured: boolean;
	/** At most one, already resolved (§6.2.2). */
	badge: CardBadge | null;
	types: TourDetail['types'];
	tags: TourDetail['tags'];
	destinationSlugs: string[];
	/** "+ Blue Cave ticket, paid on site": mandatory on-site fees must show next to the price. */
	mandatoryFeeLabel?: string;
	/** Title, tagline and short description, lower-cased, for the catalog search. */
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

export function toTourCardDTO(tour: TourDetail, destinationSlugs: string[], photo: CardPhoto | null): TourCardDTO {
	return {
		slug: tour.slug,
		title: tour.title,
		adultPrice: tour.adultPrice,
		priceUnit: tour.priceUnit,
		priceLabel: tourFromPrice(tour),
		durationShort: tour.durationShort,
		durationHours: tour.durationHours,
		featured: tour.featured ?? false,
		badge: tourCardBadge(tour),
		types: tour.types,
		tags: tour.tags,
		destinationSlugs,
		mandatoryFeeLabel: mandatoryFeeLabel(tour),
		searchText: `${tour.title} ${tour.tagline} ${tour.shortDescription}`.toLowerCase(),
		photo,
	};
}

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
