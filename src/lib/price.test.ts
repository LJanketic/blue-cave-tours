import { describe, expect, it } from 'vitest';
import { tours } from '../data/tour-catalog';
import { computeBookingTotal, formatFromPrice } from './price';
import { supportsInstantBook } from './booking';

describe('formatFromPrice', () => {
	it('shows euros, or the on-request label for the price unit', () => {
		expect(formatFromPrice(169, 'person')).toBe('€169');
		expect(formatFromPrice(null, 'person')).toBe('Price on request');
		expect(formatFromPrice(null, 'boat')).toBe('On request');
	});
});

describe('computeBookingTotal', () => {
	it('adds adults and children, ignoring children when there is no child price', () => {
		expect(computeBookingTotal({ adultPrice: 169, childPrice: 139 }, 2, 1)).toBe(477);
		expect(computeBookingTotal({ adultPrice: 75, childPrice: null }, 2, 1)).toBe(150);
		expect(computeBookingTotal({ adultPrice: null, childPrice: null }, 2, 0)).toBeNull();
	});
});

// Every tour that can be booked instantly needs both prices: the booking total depends on them.
describe('catalog prices', () => {
	for (const tour of tours.filter((t) => supportsInstantBook(t))) {
		it(`${tour.slug} has adult and child prices`, () => {
			expect(tour.adultPrice).toBeGreaterThan(0);
			expect(tour.childPrice).toBeGreaterThan(0);
		});
	}
});
