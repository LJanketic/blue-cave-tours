import { describe, expect, it } from 'vitest';
import { tours } from '../data/tour-catalog';
import { PRICE_BLUE_CAVE } from '../data/prices';
import { computeBookingTotal, formatFromPrice, lineItemsFor, seasonalPriceSummary, seasonalPrices } from './price';
import { supportsInstantBook } from './booking';

const blueCave = { prices: PRICE_BLUE_CAVE };
const quote = { prices: null };

describe('formatFromPrice', () => {
	it('shows euros, or the on-request label for the price unit', () => {
		expect(formatFromPrice(169, 'person')).toBe('€169');
		expect(formatFromPrice(null, 'person')).toBe('Price on request');
		expect(formatFromPrice(null, 'boat')).toBe('On request');
	});
});

describe('seasonalPrices', () => {
	it('picks the tour date’s season', () => {
		expect(seasonalPrices(blueCave, '2027-06-14')).toEqual({ adult: 149, child: 129 });
		expect(seasonalPrices(blueCave, '2027-06-15')).toEqual({ adult: 169, child: 139 });
		expect(seasonalPrices(blueCave, '2027-09-30')).toEqual({ adult: 169, child: 139 });
		expect(seasonalPrices(blueCave, '2027-10-01')).toEqual({ adult: 149, child: 129 });
		expect(seasonalPrices(quote, '2027-07-10')).toBeNull();
	});
});

describe('computeBookingTotal', () => {
	it('prices by the tour date, not the day of purchase', () => {
		// Bought on 1 April (low season) for 10 July (peak): the peak price.
		expect(computeBookingTotal(blueCave, '2027-07-10', 2, 1)).toBe(169 * 2 + 139);
		expect(computeBookingTotal(blueCave, '2027-05-10', 2, 1)).toBe(149 * 2 + 129);
		expect(computeBookingTotal(quote, '2027-07-10', 2, 0)).toBeNull();
	});

	it('line items use the same season', () => {
		expect(lineItemsFor(blueCave, '2027-07-10', 2, 1, 1)).toEqual([
			{ label: 'Adults', unit: 169, qty: 2, amount: 338 },
			{ label: 'Children', unit: 139, qty: 1, amount: 139 },
			{ label: 'Infants (free)', unit: 0, qty: 1, amount: 0 },
		]);
		expect(lineItemsFor(blueCave, '2027-10-01', 1, 0, 0)).toEqual([{ label: 'Adults', unit: 149, qty: 1, amount: 149 }]);
	});
});

describe('seasonalPriceSummary', () => {
	it('lists both seasons with their dates', () => {
		expect(seasonalPriceSummary(PRICE_BLUE_CAVE)).toBe(
			'Low season (1 Apr–14 Jun, 1 Oct–30 Nov): €149 per adult, €129 per child. Peak season (15 Jun–30 Sep): €169 per adult, €139 per child.',
		);
	});
});

// Every tour that can be booked instantly needs both seasons' prices: the booking total depends on them.
describe('catalog prices', () => {
	for (const tour of tours.filter((t) => supportsInstantBook(t))) {
		it(`${tour.slug} has adult and child prices in both seasons`, () => {
			for (const season of ['low', 'peak'] as const) {
				expect(tour.prices?.[season].adult).toBeGreaterThan(0);
				expect(tour.prices?.[season].child).toBeGreaterThan(0);
			}
		});
	}
});
