import { describe, expect, it } from 'vitest';
import { destinations } from '../data/destinations';
import { bestSeasonLabel, getAllDestinations, getDestinationBySlug, getToursForDestination } from './destinations';

describe('bestSeasonLabel', () => {
	it('names the run of peak months', () => {
		expect(bestSeasonLabel([0, 0, 1, 2, 3, 3, 3, 3, 3, 2, 1, 0])).toBe('May – Sep');
		expect(bestSeasonLabel([0, 0, 0, 0, 2, 2, 2, 1, 0, 0, 0, 0])).toBe('May – Jul');
		expect(bestSeasonLabel([0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0])).toBe('Jun');
		expect(bestSeasonLabel(Array(12).fill(1))).toBeNull();
	});

	it('gives every destination a best season', () => {
		for (const d of destinations) expect(bestSeasonLabel(d.bestTimeMonths), d.slug).not.toBeNull();
	});
});

describe('destination set (20 Oct handoff)', () => {
	it('lists the nine destinations, without Split', () => {
		expect(getAllDestinations().map((d) => d.slug)).toEqual([
			'blue-cave',
			'vis',
			'hvar',
			'pakleni',
			'blue-lagoon',
			'zlatni-rat',
			'trogir',
			'korcula',
			'dubrovnik',
		]);
		expect(getDestinationBySlug('split')).toBeUndefined();
	});

	it('keeps the zlatni-rat slug under the name "Brač & Zlatni Rat"', () => {
		expect(getDestinationBySlug('zlatni-rat')?.name).toBe('Brač & Zlatni Rat');
	});

	it('"Caves & nature" is the Blue Cave and Brač & Zlatni Rat only', () => {
		expect(destinations.filter((d) => d.categories.includes('cave-nature')).map((d) => d.slug)).toEqual(['blue-cave', 'zlatni-rat']);
	});

	// Computed from tourSlugs, not typed into copy. The handoff expected Hvar 4,
	// Pakleni 3, Brač 2, others 1; the data differs (Perfect Day is listed under
	// four places, Blue Lagoon is two tours), and the data wins. A change here
	// means a destination's tour list changed: check it was meant.
	it('counts the tours that visit each destination', () => {
		const counts = Object.fromEntries(getAllDestinations().map((d) => [d.slug, getToursForDestination(d.slug).length]));
		expect(counts).toEqual({
			'blue-cave': 2,
			vis: 2,
			hvar: 5,
			pakleni: 4,
			'blue-lagoon': 2,
			'zlatni-rat': 1,
			trogir: 2,
			korcula: 1,
			dubrovnik: 1,
		});
	});
});
