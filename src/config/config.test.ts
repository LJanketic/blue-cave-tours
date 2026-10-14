import { describe, expect, it } from 'vitest';
import { CANCELLATION_FULL, CANCELLATION_SHORT, CANCELLATION_WEATHER } from './cancellation';
import { charterUrl } from './routes';
import { isInSeason, seasonLabel } from './season';
import { caveEntryNote, showsBestseller } from '../lib/tour-display';

describe('season', () => {
	it('includes the first and last day and nothing outside', () => {
		expect(isInSeason('2027-04-01')).toBe(true);
		expect(isInSeason('2027-11-30')).toBe(true);
		expect(isInSeason('2027-03-31')).toBe(false);
		expect(isInSeason('2027-12-01')).toBe(false);
		expect(seasonLabel()).toBe('1 April to 30 November');
	});
});

describe('cancellation copy', () => {
	it('is built from the configured hours', () => {
		expect(CANCELLATION_SHORT).toBe('Free cancellation up to 48h before departure');
		expect(CANCELLATION_FULL).toContain('Cancellations within 48 hours are non-refundable');
		expect(CANCELLATION_WEATHER).toContain('at least 4 hours before departure');
	});
});

describe('charterUrl', () => {
	it('goes to the contact form until the charter page exists (PR 8)', () => {
		expect(charterUrl()).toBe('/contact/?tour=create-perfect-day-private');
		expect(charterUrl('dubrovnik-one-way')).toBe('/contact/?tour=dubrovnik-one-way');
	});
});

describe('tour display rules', () => {
	it('shows "Best seller" only with evidence', () => {
		expect(showsBestseller({ badge: 'bestseller' }, null)).toBe(false);
		expect(showsBestseller({ badge: 'bestseller' }, 'Most booked tour in 2025')).toBe(true);
		expect(showsBestseller({ badge: null }, 'Most booked tour in 2025')).toBe(false);
	});

	it('states the cave fee, or that the route skips the cave', () => {
		expect(caveEntryNote({ additionalFees: [{ text: 'Ticket on-site', mandatory: true }] })).toBe('Ticket on-site');
		expect(caveEntryNote({ additionalFees: [] })).toBe('This route does not visit the Blue Cave.');
	});
});
