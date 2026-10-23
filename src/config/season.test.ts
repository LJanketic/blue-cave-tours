import { describe, expect, it } from 'vitest';
import { isInSeason, LOW_SEASON, PEAK_SEASON, priceSeasonDates, SEASON_END, SEASON_START, seasonFor } from './season';

describe('seasonFor', () => {
	it('low is 1 March to 31 May and 15 September to 31 October; peak is 1 June to 14 September', () => {
		expect(seasonFor('2027-03-01')).toBe('low');
		expect(seasonFor('2027-05-31')).toBe('low');
		expect(seasonFor('2027-06-01')).toBe('peak');
		expect(seasonFor('2027-07-10')).toBe('peak');
		expect(seasonFor('2027-09-14')).toBe('peak');
		expect(seasonFor('2027-09-15')).toBe('low');
		expect(seasonFor('2027-10-31')).toBe('low');
	});

	it('prices closed winter days as low, the season of the next open day (1 March)', () => {
		expect(seasonFor('2026-11-01')).toBe('low');
		expect(seasonFor('2027-01-15')).toBe('low');
		expect(seasonFor('2028-02-29')).toBe('low');
	});
});

describe('isInSeason', () => {
	it('is open 1 March to 31 October; the boats are out of the water 1 November to the end of February', () => {
		expect(isInSeason('2026-10-31')).toBe(true);
		expect(isInSeason('2026-11-01')).toBe(false);
		expect(isInSeason('2026-12-31')).toBe(false);
		expect(isInSeason('2027-01-01')).toBe(false);
		expect(isInSeason('2027-02-28')).toBe(false);
		expect(isInSeason('2028-02-29')).toBe(false);
		expect(isInSeason('2027-03-01')).toBe(true);
		expect(isInSeason('2027-10-31')).toBe(true);
	});

	it('low and peak together cover the season exactly, day by day, with no overlap', () => {
		const within = (md: string, ranges: [string, string][]) => ranges.filter(([from, to]) => md >= from && md <= to).length;
		// 2027 is not a leap year.
		for (let d = new Date(Date.UTC(2027, 0, 1)); d.getUTCFullYear() === 2027; d.setUTCDate(d.getUTCDate() + 1)) {
			const md = d.toISOString().slice(5, 10);
			const open = md >= SEASON_START && md <= SEASON_END;
			expect(within(md, LOW_SEASON) + within(md, PEAK_SEASON), md).toBe(open ? 1 : 0);
			expect(isInSeason(`2027-${md}`), md).toBe(open);
		}
	});
});

describe('priceSeasonDates', () => {
	it('names the dates, long and short', () => {
		expect(priceSeasonDates('low')).toBe('1 March to 31 May and 15 September to 31 October');
		expect(priceSeasonDates('low', true)).toBe('1 Mar–31 May, 15 Sep–31 Oct');
		expect(priceSeasonDates('peak')).toBe('1 June to 14 September');
		expect(priceSeasonDates('peak', true)).toBe('1 Jun–14 Sep');
	});
});
