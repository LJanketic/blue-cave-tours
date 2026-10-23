import { describe, expect, it } from 'vitest';
import { tours } from '../data/tour-catalog';
import { toTourCardDTO } from './cards';
import { filterCatalog, parseCatalogQuery } from './tour-filters';
import { getDestinationsForTour } from './destinations';
import { BUILD_YOUR_OWN_SLUG, buildYourOwnLast, withBuildYourOwnBadge } from './build-your-own';

const cards = tours.map((t) => toTourCardDTO(t, getDestinationsForTour(t.slug).map((d) => d.slug), null));

describe('"Build your own" card', () => {
	it('is a live, private-only tour', () => {
		expect(tours.find((t) => t.slug === BUILD_YOUR_OWN_SLUG)?.types).toEqual(['private']);
	});

	it('comes last whatever the sort, and the rest keep their order', () => {
		for (const sort of ['recommended', 'price-asc', 'price-desc', 'duration']) {
			const sorted = filterCatalog(cards, parseCatalogQuery(`?sort=${sort}`));
			const list = buildYourOwnLast(sorted);
			expect(list.at(-1)?.slug, sort).toBe(BUILD_YOUR_OWN_SLUG);
			expect(list.slice(0, -1)).toEqual(sorted.filter((t) => t.slug !== BUILD_YOUR_OWN_SLUG));
		}
	});

	it('leaves a list without it unchanged', () => {
		const others = cards.filter((t) => t.slug !== BUILD_YOUR_OWN_SLUG);
		expect(buildYourOwnLast(others)).toEqual(others);
	});

	it('replaces only the generic "Private" badge', () => {
		const card = cards.find((t) => t.slug === BUILD_YOUR_OWN_SLUG)!;
		expect(withBuildYourOwnBadge({ ...card, badge: { label: 'Private', tone: 'private' } }).badge).toEqual({ label: 'Build your own', tone: 'premium' });
		expect(withBuildYourOwnBadge({ ...card, badge: undefined }).badge).toEqual({ label: 'Build your own', tone: 'premium' });
		expect(withBuildYourOwnBadge({ ...card, badge: { label: 'Best seller', tone: 'brand' } }).badge).toEqual({ label: 'Best seller', tone: 'brand' });
		const other = cards.find((t) => t.slug !== BUILD_YOUR_OWN_SLUG)!;
		expect(withBuildYourOwnBadge(other)).toBe(other);
	});
});
