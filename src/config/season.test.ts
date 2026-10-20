import { afterEach, describe, expect, it, vi } from 'vitest';
import { isInSeason, priceSeasonDates, seasonFor, seasonHeadScript } from './season';
import { BUSINESS_TIME_ZONE, businessDate } from '../lib/bookings/dates';

describe('seasonFor', () => {
	it('peak is 15 June to 30 September inclusive; the rest of the season is low', () => {
		expect(seasonFor('2027-04-01')).toBe('low');
		expect(seasonFor('2027-06-14')).toBe('low');
		expect(seasonFor('2027-06-15')).toBe('peak');
		expect(seasonFor('2027-07-10')).toBe('peak');
		expect(seasonFor('2027-09-30')).toBe('peak');
		expect(seasonFor('2027-10-01')).toBe('low');
		expect(seasonFor('2027-11-30')).toBe('low');
	});

	it('off-season days (no sailing) count as low, the price of the next bookable days', () => {
		expect(isInSeason('2027-03-31')).toBe(false);
		expect(seasonFor('2027-03-31')).toBe('low');
		expect(isInSeason('2027-12-01')).toBe(false);
		expect(seasonFor('2027-12-01')).toBe('low');
	});
});

describe('priceSeasonDates', () => {
	it('names the dates, long and short', () => {
		expect(priceSeasonDates('peak')).toBe('15 June to 30 September');
		expect(priceSeasonDates('low')).toBe('1 April to 14 June and 1 October to 30 November');
		expect(priceSeasonDates('low', true)).toBe('1 Apr–14 Jun, 1 Oct–30 Nov');
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
		// Split is UTC+2 in summer: 22:00 UTC is already the next day there.
		const moments = ['2027-06-14T21:59:00Z', '2027-06-14T22:00:00Z', '2027-09-30T21:59:00Z', '2027-09-30T22:00:00Z', '2028-02-29T12:00:00Z'];
		const expected = ['low', 'peak', 'peak', 'low', 'low'];
		moments.forEach((iso, i) => {
			const season = seasonFor(businessDate(new Date(iso)));
			expect(season, iso).toBe(expected[i]);
			expect(runAt(iso), iso).toBe(season);
		});
	});
});
