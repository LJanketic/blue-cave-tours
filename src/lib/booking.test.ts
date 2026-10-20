import { describe, expect, it } from 'vitest';
import {
	contactHrefForTour,
	groupBookHref,
	hasRequiredBookingDetails,
	meetingPointShort,
	parseGroupBookingParams,
	parseIsoDate,
	startOfDay,
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

	it('startOfDay drops the time of day', () => {
		expect(startOfDay(new Date(2026, 4, 1, 17, 30)).getTime()).toBe(new Date(2026, 4, 1).getTime());
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
		expect(hasRequiredBookingDetails(parseGroupBookingParams(new URLSearchParams('date=2027-07-15&adults=99&firstName=J&lastName=S&email=j@example.com')))).toBe(false);
	});
});

describe('hasRequiredBookingDetails', () => {
	const base = parseGroupBookingParams(
		new URLSearchParams('date=2027-07-15&adults=2&firstName=Jane&lastName=Smith&email=jane@example.com'),
	);

	it('accepts a complete booking', () => {
		expect(hasRequiredBookingDetails(base)).toBe(true);
	});

	it('rejects a booking over the combined guest cap', () => {
		expect(hasRequiredBookingDetails({ ...base, adults: 8, children: 8 })).toBe(false);
	});

	it('rejects a booking without a date', () => {
		expect(hasRequiredBookingDetails({ ...base, date: null })).toBe(false);
	});
});

describe('booking paths', () => {
	it('uses trailing-slash URLs so links skip the 301', () => {
		expect(groupBookHref({ slug: 'blue-lagoon-morning' })).toBe('/book/blue-lagoon-morning/group/');
		expect(contactHrefForTour({ slug: 'a b' })).toBe('/contact/?tour=a%20b');
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
