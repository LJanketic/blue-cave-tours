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
		const list = filterCatalog(cards, parseCatalogQuery('?sort=price-asc'));
		const prices = list.map((t) => t.adultPrice);
		const firstNull = prices.indexOf(null);
		const priced = (firstNull === -1 ? prices : prices.slice(0, firstNull)) as number[];
		expect(priced).toEqual([...priced].sort((a, b) => a - b));
		if (firstNull !== -1) expect(prices.slice(firstNull).every((p) => p === null)).toBe(true);
	});

	it('round-trips the URL, and accepts the older parameter names', () => {
		const query = parseCatalogQuery('?type=group&type=half-day&destination=hvar&q=cave&sort=duration');
		expect(query).toEqual({ filters: ['group', 'short'], sort: 'duration', destination: 'hvar', q: 'cave' });
		expect(parseCatalogQuery(catalogQueryString(query))).toEqual(query);
		expect(parseCatalogQuery('?filter=private&search=lagoon')).toMatchObject({ filters: ['private'], q: 'lagoon' });
		expect(catalogQueryString(parseCatalogQuery(''))).toBe('');
	});
});
