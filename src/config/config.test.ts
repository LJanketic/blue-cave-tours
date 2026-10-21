import { describe, expect, it } from 'vitest';
import { CANCELLATION_FULL, CANCELLATION_SHORT, CANCELLATION_WEATHER } from './cancellation';
import { charterUrl } from './routes';
import { isInSeason, seasonLabel } from './season';
import { caveEntryNote, showsBestseller } from '../lib/tour-display';

describe('season', () => {
	it('runs all year round', () => {
		expect(isInSeason('2027-01-01')).toBe(true);
		expect(isInSeason('2027-12-31')).toBe(true);
		expect(seasonLabel()).toBe('all year round');
	});
});

describe('cancellation copy', () => {
	it('is built from the configured hours', () => {
		expect(CANCELLATION_SHORT).toBe('Free cancellation up to 48h before departure');
		expect(CANCELLATION_FULL).toContain('Cancellations within 48 hours are non-refundable');
		expect(CANCELLATION_WEATHER).toContain('at least 4 hours before departure');
		expect(CANCELLATION_FULL).toContain('free rescheduling, an alternative tour, or a full refund (paid within 30 days)');
		expect(CANCELLATION_WEATHER).toContain('an alternative tour, or take a full refund, paid within 30 days.');
	});
});

describe('charterUrl', () => {
	it('goes to the charter request page with the route preselected (§8.2)', () => {
		expect(charterUrl()).toBe('/private-charter/?tour=create-perfect-day-private');
		expect(charterUrl('dubrovnik-one-way')).toBe('/private-charter/?tour=dubrovnik-one-way');
	});
});

describe('tour display rules', () => {
	it('shows "Best seller" only with evidence', () => {
		expect(showsBestseller({ badge: 'bestseller' }, null)).toBe(false);
		expect(showsBestseller({ badge: 'bestseller' }, 'Most booked tour in 2025')).toBe(true);
		expect(showsBestseller({ badge: null }, 'Most booked tour in 2025')).toBe(false);
	});

	it('states the cave fee, or that the route skips the cave', () => {
		expect(caveEntryNote({ additionalFees: [{ text: 'Ticket on-site', shortText: 'Ticket, paid on site', mandatory: true }] })).toBe('Ticket on-site');
		expect(caveEntryNote({ additionalFees: [] })).toBe('This route does not visit the Blue Cave.');
	});
});
