import { describe, expect, it } from 'vitest';
import { tours } from './tour-catalog';
import { PRICE_LIST } from './prices';
import { FAQ_ITEMS, pricingAnswer, privateBoatSentence } from './faq';
import { supportsInstantBook } from '../lib/booking';

describe('price list (FAQ)', () => {
	it('names exactly the prices the instant-book tours use', () => {
		const used = new Set(tours.filter(supportsInstantBook).map((t) => t.prices));
		expect(new Set(PRICE_LIST.map((p) => p.prices))).toEqual(used);
	});

	it('ties each label to the tours it prices, and together they are the instant-book tours', () => {
		const slugsByLabel: Record<string, string[]> = {
			'Blue Cave, Vis & Hvar — Five Islands': ['blue-cave-hvar-5-islands'],
			'Golden Horn, Brač & Hvar': ['golden-horn-brac-hvar'],
			'Blue Lagoon, Drvenik (morning or afternoon)': ['blue-lagoon-morning', 'blue-lagoon-afternoon'],
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
		expect(answer).toContain('1 March to 31 May and 15 September to 31 October');
		expect(answer).toContain('1 June to 14 September');
		for (const { prices } of PRICE_LIST) {
			for (const amount of [prices.low.adult, prices.low.child, prices.peak.adult, prices.peak.child]) expect(answer).toContain(`€${amount}`);
		}
		expect(answer).toContain('€149 per adult and €129 per child in low season, €159 and €139 in peak season');
		expect(answer).toContain(privateBoatSentence());
	});
});

describe('FAQ private boat sentence', () => {
	it('gives the one flat price when every private tour shares it (Mare, 8 Nov 2026: €1,200)', () => {
		expect(privateBoatSentence()).toBe(
			'A private boat is €1,200 on every fixed-route tour, in any season; Create Your Perfect Day is quoted on request.',
		);
	});

	it('names each tour when the prices differ', () => {
		const sentence = privateBoatSentence({
			'blue-cave-hvar-5-islands': { boat: { low: 1500, peak: 2000 } },
			'golden-horn-brac-hvar': { boat: { low: 1200, peak: 1200 } },
		});
		expect(sentence).toBe(
			'A private Blue Cave boat is €1,500 (low season) or €2,000 (peak); a private Golden Horn boat is €1,200; other private experiences are quoted on request.',
		);
	});

	it('falls back to "on request" with no pay-now tour, and refuses a tour it has no name for', () => {
		expect(privateBoatSentence({})).toBe('Private experiences are quoted on request.');
		expect(() => privateBoatSentence({ 'no-such-tour': { boat: { low: 1, peak: 2 } } })).toThrow(/no-such-tour/);
	});
});

describe('LOWEST_GROUP_PRICE', () => {
	it('is the cheapest group tour’s low-season adult price', async () => {
		const { LOWEST_GROUP_PRICE } = await import('./marketing');
		const { tours } = await import('./tour-catalog');
		const { supportsInstantBook } = await import('../lib/booking');
		const lows = tours.filter(supportsInstantBook).flatMap((t) => (t.prices ? [t.prices.low.adult] : []));
		expect(LOWEST_GROUP_PRICE).toBe(Math.min(...lows));
	});
});

describe('LOWEST_PRIVATE_PRICE', () => {
	it('is the lowest low-season boat price of the tours booked privately on the site', async () => {
		const { LOWEST_PRIVATE_PRICE } = await import('./marketing');
		const { PRIVATE_TOURS } = await import('../config/private');
		expect(LOWEST_PRIVATE_PRICE).toBe(Math.min(...Object.values(PRIVATE_TOURS).map((t) => t.boat.low)));
	});
});
