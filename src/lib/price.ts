import type { TourDetail } from '../types/tour';

type Priced = Pick<TourDetail, 'adultPrice' | 'childPrice'>;

/** "€169", or the on-request label: "Price on request" for group tours, "On request" for private charters. */
export function formatFromPrice(adultPrice: number | null, priceUnit: TourDetail['priceUnit']): string {
	if (adultPrice !== null) return `€${adultPrice}`;
	return priceUnit === 'person' ? 'Price on request' : 'On request';
}

/** The tour's "From" price label. */
export function tourFromPrice(tour: Pick<TourDetail, 'adultPrice' | 'priceUnit'>): string {
	return formatFromPrice(tour.adultPrice, tour.priceUnit);
}

/**
 * Total for a booking from the tour's own prices. Null when the tour has no
 * adult price (quoted on request). Children without a child price cost nothing
 * extra, as before the numeric migration.
 */
export function computeBookingTotal(tour: Priced, adults: number, children: number): number | null {
	if (tour.adultPrice === null) return null;
	return tour.adultPrice * adults + (tour.childPrice !== null ? tour.childPrice * children : 0);
}
