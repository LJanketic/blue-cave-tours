import type { PriceTier, SeasonalPrices, TourDetail } from '../types/tour';
import { priceSeasonDates, seasonFor, type Season } from '../config/season';
import { PRIVATE_LISTS, privateExtra, privatePickup, privateTour, type PrivateLists } from '../config/private';

/*
 * Seasonal pricing: the tour date's season (seasonFor) picks the price, not the
 * day of purchase. "From" prices are always the low season's (cards.ts). No
 * catalog import: islands use this.
 */

type Priced = { prices: SeasonalPrices | null };

/** The per-person prices for a tour on a date (YYYY-MM-DD). Null when quoted on request. */
export function seasonalPrices(tour: Priced, isoDate: string): PriceTier | null {
	return tour.prices ? tour.prices[seasonFor(isoDate)] : null;
}

/** "€169", or the on-request label: "Price on request" for group tours, "On request" for private charters. */
export function formatFromPrice(adultPrice: number | null, priceUnit: TourDetail['priceUnit']): string {
	if (adultPrice !== null) return `€${adultPrice}`;
	return priceUnit === 'person' ? 'Price on request' : 'On request';
}

/**
 * Total for a booking on `isoDate` from the tour's own prices for that date's
 * season. Null when the tour is quoted on request.
 */
export function computeBookingTotal(tour: Priced, isoDate: string, adults: number, children: number): number | null {
	const price = seasonalPrices(tour, isoDate);
	if (!price) return null;
	return price.adult * adults + price.child * children;
}

/** The booking total's parts, as charged (§9.4): adults, children, and free infants, at the date's season. */
export function lineItemsFor(
	tour: Priced,
	isoDate: string,
	adults: number,
	children: number,
	infants: number,
): { label: string; unit: number; qty: number; amount: number }[] | null {
	const price = seasonalPrices(tour, isoDate);
	if (!price) return null;
	const items = [{ label: 'Adults', unit: price.adult, qty: adults, amount: price.adult * adults }];
	if (children > 0) items.push({ label: 'Children', unit: price.child, qty: children, amount: price.child * children });
	if (infants > 0) items.push({ label: 'Infants (free)', unit: 0, qty: infants, amount: 0 });
	return items;
}

type LineItem = { label: string; unit: number; qty: number; amount: number };

/**
 * A private experience's charges (src/config/private.ts): the boat at the tour
 * date's season, each extra, and the pick-up when it costs anything. Null when
 * the tour isn't sold privately, or an extra or the pick-up isn't on the list
 * ('other' included: that's a request, not a sale). Duplicate extras count once.
 * `lists` is for tests only (fixtures); the site always prices from the config.
 */
export function privateLineItems(
	slug: string,
	isoDate: string,
	extras: readonly string[],
	pickup: string,
	lists: PrivateLists = PRIVATE_LISTS,
): LineItem[] | null {
	const tour = privateTour(slug, lists);
	const point = privatePickup(pickup, lists);
	if (!tour || !point) return null;
	const boat = tour.boat[seasonFor(isoDate)];
	const items: LineItem[] = [{ label: 'Private boat with skipper', unit: boat, qty: 1, amount: boat }];
	for (const id of new Set(extras)) {
		const extra = privateExtra(id, lists);
		if (!extra) return null;
		items.push({ label: extra.label, unit: extra.price, qty: 1, amount: extra.price });
	}
	if (point.price > 0) items.push({ label: `Pick-up: ${point.label}`, unit: point.price, qty: 1, amount: point.price });
	return items;
}

/** The sum of the line items. */
export function lineItemsTotal(items: readonly LineItem[]): number {
	return items.reduce((sum, item) => sum + item.amount, 0);
}

/** "Peak season price" / "Low season price". */
export function seasonPriceLabel(season: Season): string {
	return season === 'peak' ? 'Peak season price' : 'Low season price';
}

/**
 * The seasonal breakdown shown in the booking flow, from the season config:
 * "Low season (1 Mar–31 May, 15 Sep–31 Oct): €149 per adult, €129 per child.
 * Peak season (1 Jun–14 Sep): €169 per adult, €139 per child."
 */
export function seasonalPriceSummary(prices: SeasonalPrices): string {
	const part = (season: Season, name: string) =>
		`${name} (${priceSeasonDates(season, true)}): €${prices[season].adult} per adult, €${prices[season].child} per child.`;
	return `${part('low', 'Low season')} ${part('peak', 'Peak season')}`;
}
