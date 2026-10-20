import { afterEach, describe, expect, it, vi } from 'vitest';
import { isInSeason, priceSeasonDates, seasonFor, seasonHeadScript } from './season';
import { BUSINESS_TIME_ZONE, businessDate } from '../lib/bookings/dates';

describe('seasonFor', () => {
	it('low is 1 April to 15 May and 1 October to 1 November inclusive; every other day is peak', () => {
		expect(seasonFor('2027-03-31')).toBe('peak');
		expect(seasonFor('2027-04-01')).toBe('low');
		expect(seasonFor('2027-05-15')).toBe('low');
		expect(seasonFor('2027-05-16')).toBe('peak');
		expect(seasonFor('2027-07-10')).toBe('peak');
		expect(seasonFor('2027-09-30')).toBe('peak');
		expect(seasonFor('2027-10-01')).toBe('low');
		expect(seasonFor('2027-11-01')).toBe('low');
		expect(seasonFor('2027-11-02')).toBe('peak');
		expect(seasonFor('2027-12-31')).toBe('peak');
		expect(seasonFor('2028-01-01')).toBe('peak');
		expect(seasonFor('2028-02-29')).toBe('peak');
	});

	it('every day of the year can be booked', () => {
		expect(isInSeason('2027-01-01')).toBe(true);
		expect(isInSeason('2027-12-31')).toBe(true);
		expect(isInSeason('2028-02-29')).toBe(true);
	});
});

describe('priceSeasonDates', () => {
	it('names the dates, long and short; peak runs over the new year', () => {
		expect(priceSeasonDates('low')).toBe('1 April to 15 May and 1 October to 1 November');
		expect(priceSeasonDates('low', true)).toBe('1 Apr–15 May, 1 Oct–1 Nov');
		expect(priceSeasonDates('peak')).toBe('16 May to 30 September and 2 November to 31 March');
		expect(priceSeasonDates('peak', true)).toBe('16 May–30 Sep, 2 Nov–31 Mar');
	});
});

describe('seasonHeadScript', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	function runAt(iso: string): string | undefined {
		vi.setSystemTime(new Date(iso));
		const attrs: Record<string, string> = {};
		const document = { documentElement: { setAttribute: (name: string, value: string) => (attrs[name] = value) } };
		new Function('document', seasonHeadScript(BUSINESS_TIME_ZONE))(document);
		return attrs['data-season'];
	}

	it('sets the season of the moment’s day in Split, the same rule as seasonFor', () => {
		vi.useFakeTimers();
		// Split is UTC+2 in summer, UTC+1 in winter: 22:00 or 23:00 UTC is already the next day there.
		const moments = ['2027-05-15T21:59:00Z', '2027-05-15T22:00:00Z', '2027-09-30T21:59:00Z', '2027-09-30T22:00:00Z', '2027-11-01T22:59:00Z', '2027-11-01T23:00:00Z', '2028-02-29T12:00:00Z'];
		const expected = ['low', 'peak', 'peak', 'low', 'low', 'peak', 'peak'];
		moments.forEach((iso, i) => {
			const season = seasonFor(businessDate(new Date(iso)));
			expect(season, iso).toBe(expected[i]);
			expect(runAt(iso), iso).toBe(season);
		});
	});
});
