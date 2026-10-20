import { describe, expect, it } from 'vitest';
import { tours } from './tour-catalog';
import { PRICE_LIST } from './prices';
import { FAQ_ITEMS, pricingAnswer } from './faq';
import { supportsInstantBook } from '../lib/booking';

describe('price list (FAQ)', () => {
	it('names exactly the prices the instant-book tours use', () => {
		const used = new Set(tours.filter(supportsInstantBook).map((t) => t.prices));
		expect(new Set(PRICE_LIST.map((p) => p.prices))).toEqual(used);
	});

	it('ties each label to the tours it prices, and together they are the instant-book tours', () => {
		const slugsByLabel: Record<string, string[]> = {
			'Blue Cave, Hvar & 5 islands': ['blue-cave-hvar-5-islands'],
			'Golden Horn, Brač and Hvar': ['golden-horn-brac-hvar'],
			'Blue Lagoon (morning or afternoon)': ['blue-lagoon-morning', 'blue-lagoon-afternoon'],
		};
		expect(PRICE_LIST.map((p) => p.label).sort()).toEqual(Object.keys(slugsByLabel).sort());
		for (const { label, prices } of PRICE_LIST) {
			for (const slug of slugsByLabel[label]) expect(tours.find((t) => t.slug === slug)?.prices, `${label}: ${slug}`).toBe(prices);
		}
		const instantBook = tours.filter(supportsInstantBook).map((t) => t.slug);
		expect(new Set(Object.values(slugsByLabel).flat())).toEqual(new Set(instantBook));
	});

	it('quote-only tours have no prices', () => {
		for (const tour of tours.filter((t) => !supportsInstantBook(t))) expect(tour.prices, tour.slug).toBeNull();
	});
});

describe('FAQ pricing answer', () => {
	it('is in the FAQ, generated from the price data and the season dates', () => {
		const item = FAQ_ITEMS.find((i) => i.question.startsWith('How much do the tours cost?'));
		expect(item?.category).toBe('booking');
		expect(item?.answer).toBe(pricingAnswer());
		const answer = pricingAnswer();
		expect(answer).toContain('1 April to 15 May and 1 October to 1 November');
		expect(answer).toContain('16 May to 30 September and 2 November to 31 March');
		for (const { prices } of PRICE_LIST) {
			for (const amount of [prices.low.adult, prices.low.child, prices.peak.adult, prices.peak.child]) expect(answer).toContain(`€${amount}`);
		}
		expect(answer).toContain('€149 per adult and €129 per child in low season, €169 and €139 in peak season');
		expect(answer).toContain('Private charters are quoted on request');
	});
});
