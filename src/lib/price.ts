import type { PriceTier, SeasonalPrices, TourDetail } from '../types/tour';
import { priceSeasonDates, seasonFor, type Season } from '../config/season';

/*
 * Seasonal pricing: the tour date's season (seasonFor) picks the price, not the
 * day of purchase. Pages show today's season's price with SeasonPrice (see
 * BaseLayout). No catalog import: islands use this.
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

/** "Peak season price" / "Low season price". */
export function seasonPriceLabel(season: Season): string {
	return season === 'peak' ? 'Peak season price' : 'Low season price';
}

/**
 * The seasonal breakdown shown in the booking flow, from the season config:
 * "Low season (1 Apr–14 Jun, 1 Oct–30 Nov): €149 per adult, €129 per child.
 * Peak season (15 Jun–30 Sep): €169 per adult, €139 per child."
 */
export function seasonalPriceSummary(prices: SeasonalPrices): string {
	const part = (season: Season, name: string) =>
		`${name} (${priceSeasonDates(season, true)}): €${prices[season].adult} per adult, €${prices[season].child} per child.`;
	return `${part('low', 'Low season')} ${part('peak', 'Peak season')}`;
}
