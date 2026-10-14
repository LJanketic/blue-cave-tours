import { describe, expect, it } from 'vitest';
import { destinations } from '../data/destinations';
import { bestSeasonLabel } from './destinations';

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
