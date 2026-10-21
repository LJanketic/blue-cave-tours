import { describe, expect, it } from 'vitest';
import { tours } from '../data/tour-catalog';
import { toTourCardDTO } from './cards';
import { getDestinationsForTour } from './destinations';
import { filterCatalog, parseCatalogQuery } from './tour-filters';
import { getSliderTours } from './tours';

describe('getSliderTours (homepage slider)', () => {
	const slugs = getSliderTours().map((t) => t.slug);

	it('shows every tour except the "Build your own" day', () => {
		expect(slugs).not.toContain('create-perfect-day-private');
		expect(slugs).toHaveLength(tours.length - 1);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it('follows the Tours page\'s "recommended" order', () => {
		const cards = tours.map((t) => toTourCardDTO(t, getDestinationsForTour(t.slug).map((d) => d.slug), null));
		const recommended = filterCatalog(cards, parseCatalogQuery(''))
			.map((t) => t.slug)
			.filter((slug) => slug !== 'create-perfect-day-private');
		expect(slugs).toEqual(recommended);
	});

	it('does not reorder the catalog itself', () => {
		const before = tours.map((t) => t.slug);
		getSliderTours();
		expect(tours.map((t) => t.slug)).toEqual(before);
	});
});
