import { describe, expect, it } from 'vitest';
import { tours } from '../data/tour-catalog';
import { toTourCardDTO } from './cards';
import { catalogQueryString, filterCatalog, parseCatalogQuery, TOUR_DESTINATION_OPTIONS } from './tour-filters';
import { getDestinationBySlug, getDestinationsForTour } from './destinations';

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

	it('combines chips and destinations with AND', () => {
		const group = filterCatalog(cards, parseCatalogQuery('?type=group'));
		const both = filterCatalog(cards, parseCatalogQuery('?type=group&type=private'));
		expect(both.length).toBeLessThanOrEqual(group.length);
		expect(both.every((t) => t.types.includes('group') && t.types.includes('private'))).toBe(true);
		const count = (search: string) => filterCatalog(cards, parseCatalogQuery(search)).length;
		expect(count('?type=short')).toBe(3);
		expect(count('?type=short&type=private')).toBe(3);
		expect(count('?type=group&type=short')).toBe(2);
		const hvarGroup = filterCatalog(cards, parseCatalogQuery('?type=group&destination=hvar'));
		expect(hvarGroup.every((t) => t.types.includes('group') && t.destinationSlugs.includes('hvar'))).toBe(true);
	});

	it('sorts by price with quote-only tours last', () => {
		const list = filterCatalog(cards, parseCatalogQuery('?sort=price-asc'));
		const prices = list.map((t) => t.fromPrice ?? null);
		const firstNull = prices.indexOf(null);
		const priced = (firstNull === -1 ? prices : prices.slice(0, firstNull)) as number[];
		expect(priced).toEqual([...priced].sort((a, b) => a - b));
		if (firstNull !== -1) expect(prices.slice(firstNull).every((p) => p === null)).toBe(true);
	});

	it('sorts by the constant From price, both directions', () => {
		const a = { ...cards[0], slug: 'a', fromPrice: 100 };
		const b = { ...cards[0], slug: 'b', fromPrice: 200 };
		const slugs = (sort: string) => filterCatalog([b, a], parseCatalogQuery(`?sort=${sort}`)).map((t) => t.slug);
		expect(slugs('price-asc')).toEqual(['a', 'b']);
		expect(slugs('price-desc')).toEqual(['b', 'a']);
	});

	it('round-trips the URL, and accepts the older parameter names', () => {
		const query = parseCatalogQuery('?type=group&type=half-day&destination=hvar&q=cave&sort=duration');
		expect(query).toEqual({ filters: ['group', 'short'], sort: 'duration', destination: 'hvar', q: 'cave' });
		expect(parseCatalogQuery(catalogQueryString(query))).toEqual(query);
		expect(parseCatalogQuery('?filter=private&search=lagoon')).toMatchObject({ filters: ['private'], q: 'lagoon' });
		expect(catalogQueryString(parseCatalogQuery(''))).toBe('');
	});

	it('groups Blue Cave & Vis in one destination option', () => {
		const slugs = (search: string) => filterCatalog(cards, parseCatalogQuery(search)).map((t) => t.slug);
		const grouped = slugs('?destination=blue-cave');
		expect(grouped.length).toBeGreaterThan(0);
		const visitsEither = cards.filter((t) => t.destinationSlugs.includes('blue-cave') || t.destinationSlugs.includes('vis'));
		expect(new Set(grouped)).toEqual(new Set(visitsEither.map((t) => t.slug)));
	});

	it('maps a legacy ?destination=<slug> link to the option that contains it', () => {
		expect(parseCatalogQuery('?destination=vis').destination).toBe('blue-cave');
		expect(parseCatalogQuery('?destination=zlatni-rat').destination).toBe('zlatni-rat');
		expect(catalogQueryString(parseCatalogQuery('?destination=vis'))).toBe('?destination=blue-cave');
		// Split is the departure hub, not an option: the whole list shows.
		expect(parseCatalogQuery('?destination=split').destination).toBe('');
		expect(parseCatalogQuery('?destination=nowhere').destination).toBe('');
	});

	it('offers only real destinations, and each one has a tour', () => {
		for (const option of TOUR_DESTINATION_OPTIONS) {
			for (const slug of option.slugs) expect(getDestinationBySlug(slug), slug).toBeDefined();
			expect(filterCatalog(cards, parseCatalogQuery(`?destination=${option.id}`)).length, option.label).toBeGreaterThan(0);
		}
	});
});
