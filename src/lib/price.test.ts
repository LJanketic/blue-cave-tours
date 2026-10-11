import { describe, expect, it } from 'vitest';
import { tours } from '../data/tour-catalog';
import { computeBookingTotal, parseAdultPrice, parseChildPrice } from './price';
import { supportsInstantBook } from './booking';

describe('price parsing', () => {
	it('reads the adult price and treats "on request" as no price', () => {
		expect(parseAdultPrice('€169')).toBe(169);
		expect(parseAdultPrice('From €75')).toBe(75);
		expect(parseAdultPrice('Price on request')).toBeNull();
	});

	it('takes the peak-season child price (the last one in the notes)', () => {
		const notes =
			'Low season (1 Apr–15 Jun): €149 per adult, €129 per child (0–17). Peak season (15 Jun–30 Sep): €169 per adult, €139 per child (0–17).';
		expect(parseChildPrice(notes)).toBe(139);
		expect(parseChildPrice('No child pricing listed.')).toBeNull();
	});

	it('computes totals, ignoring children when there is no child price', () => {
		expect(computeBookingTotal('€169', '€139 per child', 2, 1)).toBe(477);
		expect(computeBookingTotal('€75', 'Adults only.', 2, 1)).toBe(150);
		expect(computeBookingTotal('On request', '', 2, 0)).toBeNull();
	});
});

// Prices are parsed out of display copy, so guard the copy itself: every tour
// that can be booked instantly must still yield a usable adult and child price.
describe('catalog prices', () => {
	for (const tour of tours.filter((t) => supportsInstantBook(t))) {
		it(`${tour.slug} has parseable prices`, () => {
			expect(parseAdultPrice(tour.fromPrice)).toBeGreaterThan(0);
			expect(parseChildPrice(tour.priceNotes)).toBeGreaterThan(0);
		});
	}
});
