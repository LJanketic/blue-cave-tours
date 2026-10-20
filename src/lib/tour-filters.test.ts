import { describe, expect, it } from 'vitest';
import { tours } from '../data/tour-catalog';
import { toTourCardDTO } from './cards';
import { catalogQueryString, filterCatalog, parseCatalogQuery } from './tour-filters';
import { getDestinationsForTour } from './destinations';

const cards = tours.map((t) => toTourCardDTO(t, getDestinationsForTour(t.slug).map((d) => d.slug), null));

describe('tours catalog filtering', () => {
	it('shows every tour with no filters, featured first', () => {
		const list = filterCatalog(cards, parseCatalogQuery(''));
		expect(list).toHaveLength(tours.length);
		const firstPlain = list.findIndex((t) => !t.featured);
		expect(list.slice(firstPlain).some((t) => t.featured)).toBe(false);
	});

	it('Half day matches at least one tour (the board\'s "Under 4h" matched none)', () => {
		expect(filterCatalog(cards, parseCatalogQuery('?type=short')).length).toBeGreaterThan(0);
	});

	it('combines chips with OR and destinations with AND', () => {
		const group = filterCatalog(cards, parseCatalogQuery('?type=group'));
		const both = filterCatalog(cards, parseCatalogQuery('?type=group&type=private'));
		expect(both.length).toBeGreaterThanOrEqual(group.length);
		const hvarGroup = filterCatalog(cards, parseCatalogQuery('?type=group&destination=hvar'));
		expect(hvarGroup.every((t) => t.types.includes('group') && t.destinationSlugs.includes('hvar'))).toBe(true);
	});

	it('sorts by price with quote-only tours last', () => {
		for (const season of ['low', 'peak'] as const) {
			const list = filterCatalog(cards, parseCatalogQuery('?sort=price-asc'), season);
			const prices = list.map((t) => t.fromPrice?.[season] ?? null);
			const firstNull = prices.indexOf(null);
			const priced = (firstNull === -1 ? prices : prices.slice(0, firstNull)) as number[];
			expect(priced).toEqual([...priced].sort((a, b) => a - b));
			if (firstNull !== -1) expect(prices.slice(firstNull).every((p) => p === null)).toBe(true);
		}
	});

	it('sorts by the given season’s price', () => {
		// Synthetic cards whose order flips between the seasons, so only the season argument decides.
		const a = { ...cards[0], slug: 'a', fromPrice: { low: 100, peak: 300 } };
		const b = { ...cards[0], slug: 'b', fromPrice: { low: 200, peak: 250 } };
		const slugs = (season: 'low' | 'peak', sort: string) =>
			filterCatalog([a, b], parseCatalogQuery(`?sort=${sort}`), season).map((t) => t.slug);
		expect(slugs('low', 'price-asc')).toEqual(['a', 'b']);
		expect(slugs('peak', 'price-asc')).toEqual(['b', 'a']);
		expect(slugs('low', 'price-desc')).toEqual(['b', 'a']);
		expect(slugs('peak', 'price-desc')).toEqual(['a', 'b']);
	});

	it('round-trips the URL, and accepts the older parameter names', () => {
		const query = parseCatalogQuery('?type=group&type=half-day&destination=hvar&q=cave&sort=duration');
		expect(query).toEqual({ filters: ['group', 'short'], sort: 'duration', destination: 'hvar', q: 'cave' });
		expect(parseCatalogQuery(catalogQueryString(query))).toEqual(query);
		expect(parseCatalogQuery('?filter=private&search=lagoon')).toMatchObject({ filters: ['private'], q: 'lagoon' });
		expect(catalogQueryString(parseCatalogQuery(''))).toBe('');
	});
});
