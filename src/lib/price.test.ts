import { describe, expect, it } from 'vitest';
import { tours } from '../data/tour-catalog';
import { PRICE_BLUE_CAVE } from '../data/prices';
import { computeBookingTotal, formatFromPrice, lineItemsFor, lineItemsTotal, privateLineItems, seasonalPriceSummary, seasonalPrices } from './price';
import { PRIVATE_TOURS, type PrivateLists } from '../config/private';
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
		expect(seasonalPrices(blueCave, '2027-05-31')).toEqual({ adult: 149, child: 129 });
		expect(seasonalPrices(blueCave, '2027-06-01')).toEqual({ adult: 169, child: 139 });
		expect(seasonalPrices(blueCave, '2027-09-14')).toEqual({ adult: 169, child: 139 });
		expect(seasonalPrices(blueCave, '2027-09-15')).toEqual({ adult: 149, child: 129 });
		// Closed in winter, but priced as low: the next open day (1 March) is low season.
		expect(seasonalPrices(blueCave, '2027-11-02')).toEqual({ adult: 149, child: 129 });
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
			'Low season (1 Mar–31 May, 15 Sep–31 Oct): €149 per adult, €129 per child. Peak season (1 Jun–14 Sep): €169 per adult, €139 per child.',
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

describe('privateLineItems', () => {
	const boat = PRIVATE_TOURS['blue-cave-hvar-5-islands'].boat;
	// A made-up list, for tests only: the site has no extras or priced pick-ups yet (src/config/private.ts).
	const lists: PrivateLists = {
		tours: { 'test-tour': { boat: { low: 100, peak: 200 } } },
		extras: [{ id: 'test-extra', label: 'Test extra', desc: '', price: 10 }],
		pickups: [{ id: 'riva', label: 'Riva', price: 0 }, { id: 'test-pickup', label: 'Test pick-up', price: 25 }],
	};

	it('prices the Blue Cave boat by the tour date\'s season, at the operator\'s prices', () => {
		expect(boat).toEqual({ low: 1500, peak: 2000 });
		expect(privateLineItems('blue-cave-hvar-5-islands', '2027-05-15', [], 'riva')).toEqual([{ label: 'Private boat with skipper', unit: 1500, qty: 1, amount: 1500 }]);
		expect(privateLineItems('blue-cave-hvar-5-islands', '2027-07-15', [], 'riva')?.[0].amount).toBe(2000);
	});

	it('adds each extra once and a priced pick-up; the free meeting point is not a line', () => {
		const items = privateLineItems('test-tour', '2027-07-15', ['test-extra', 'test-extra'], 'test-pickup', lists) ?? [];
		expect(items.map((i) => i.label)).toEqual(['Private boat with skipper', 'Test extra', 'Pick-up: Test pick-up']);
		expect(lineItemsTotal(items)).toBe(200 + 10 + 25);
		expect(privateLineItems('test-tour', '2027-07-15', [], 'riva', lists)).toHaveLength(1);
	});

	it('refuses tours not sold privately, any extra off the list (all of them, today), and pick-ups off the list', () => {
		expect(privateLineItems('dubrovnik-one-way', '2027-07-15', [], 'riva')).toBeNull();
		expect(privateLineItems('golden-horn-brac-hvar', '2027-07-15', [], 'riva')).toBeNull();
		expect(privateLineItems('blue-cave-hvar-5-islands', '2027-07-15', ['champagne'], 'riva')).toBeNull();
		expect(privateLineItems('blue-cave-hvar-5-islands', '2027-07-15', [], 'other')).toBeNull();
		expect(privateLineItems('blue-cave-hvar-5-islands', '2027-07-15', [], '')).toBeNull();
	});
});
