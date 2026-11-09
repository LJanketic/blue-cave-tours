import { describe, expect, it } from 'vitest';
import {
	contactHrefForTour,
	departureLabel,
	groupBookHref,
	meetingPointShort,
	parseGroupBookingParams,
	parseIsoDate,
	supportsInstantBook,
	toIsoDate,
	tourPriceUnit,
} from './booking';

/** Any seasonal prices: only whether a tour has them matters here. */
const P = { low: { adult: 65, child: 59 }, peak: { adult: 75, child: 69 } };

describe('ISO dates', () => {
	it('formats a local date without shifting the day', () => {
		expect(toIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
	});

	it('round-trips real dates and rejects impossible or malformed ones', () => {
		expect(parseIsoDate('2026-02-28')?.getDate()).toBe(28);
		expect(parseIsoDate('2026-02-31')).toBeNull();
		expect(parseIsoDate('2026-2-3')).toBeNull();
		expect(parseIsoDate('not a date')).toBeNull();
	});
});

describe('parseGroupBookingParams', () => {
	it('keeps valid values and drops invalid ones', () => {
		const details = parseGroupBookingParams(
			new URLSearchParams('date=2026-02-31&slot=9am&adults=2&children=x&firstName=%20Jane%20'),
		);
		expect(details.date).toBeNull();
		expect(details.slot).toBeNull();
		expect(details.adults).toBe(2);
		expect(details.children).toBe(0);
		expect(details.firstName).toBe('Jane');
	});

	it('keeps guest counts above the per-departure cap, so validation can refuse them', () => {
		expect(parseGroupBookingParams(new URLSearchParams('adults=99')).adults).toBe(99);
		expect(parseGroupBookingParams(new URLSearchParams('children=99999999999999999999')).children).toBe(999);
	});
});

describe('booking paths', () => {
	it('uses trailing-slash URLs so links skip the 301', () => {
		expect(groupBookHref({ slug: 'blue-lagoon-morning' })).toBe('/book/blue-lagoon-morning/group/');
		expect(contactHrefForTour({ slug: 'a b' })).toBe('/contact/?tour=a%20b');
		expect(contactHrefForTour({ slug: 'x' }, 'group')).toBe('/contact/?tour=x&topic=group');
	});

	it('shows the departure with its check-in time', () => {
		const departures = [{ time: '07:20', checkIn: '07:05' }, { time: '14:30' }];
		expect(departureLabel(departures, '07:20')).toBe('07:20 (check-in 07:05)');
		expect(departureLabel(departures, '14:30')).toBe('14:30');
		expect(departureLabel([], '')).toBe('Confirmed at booking');
	});
});

describe('instant book and price unit', () => {
	it('only group tours with a real price book instantly', () => {
		expect(supportsInstantBook({ types: ['group'], prices: P })).toBe(true);
		expect(supportsInstantBook({ types: ['group'], prices: null })).toBe(false);
		expect(supportsInstantBook({ types: ['private'], prices: null })).toBe(false);
		expect(supportsInstantBook({ types: ['private'], prices: P })).toBe(false);
	});

	it('labels the unit from the price unit, and none on request', () => {
		expect(tourPriceUnit({ prices: P, priceUnit: 'person' })).toBe('/ person');
		expect(tourPriceUnit({ prices: null, priceUnit: 'person' })).toBe('');
		expect(tourPriceUnit({ prices: P, priceUnit: 'boat' })).toBe('/ boat');
		expect(tourPriceUnit({ prices: null, priceUnit: 'boat' })).toBe('');
	});
});

describe('meetingPointShort', () => {
	it('shortens stand-number copy and falls back to the first sentence', () => {
		expect(meetingPointShort('Meet at Split Riva, stand number 14. Arrive early.')).toBe('Riva stand 14');
		expect(meetingPointShort('Meet at Trogir marina. Look for our flag.')).toBe('Trogir marina');
	});
});
