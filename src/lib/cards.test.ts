import { describe, expect, it } from 'vitest';
import { tours } from '../data/tour-catalog';
import { mandatoryFeeLabel, tourCardBadge, toTourCardDTO } from './cards';

describe('tourCardBadge', () => {
	it('shows at most one badge, by priority', () => {
		expect(tourCardBadge({ badge: 'bestseller', types: ['group'] }, 'Most booked, 2025 records')).toEqual({ label: 'Best seller', tone: 'brand' });
		expect(tourCardBadge({ badge: 'pick', types: ['private'] })).toEqual({ label: 'Our pick', tone: 'brand' });
		expect(tourCardBadge({ badge: 'new', types: ['private'] })).toEqual({ label: 'New', tone: 'neutral' });
		expect(tourCardBadge({ badge: null, types: ['private'] })).toEqual({ label: 'Private', tone: 'private' });
		expect(tourCardBadge({ badge: null, types: ['group', 'private'] })).toBeNull();
	});

	it('never shows "Best seller" without evidence (C-24)', () => {
		expect(tourCardBadge({ badge: 'bestseller', types: ['group'] }, null)).toBeNull();
	});
});

describe('mandatoryFeeLabel', () => {
	it('lists only the fees paid on top of the price', () => {
		expect(mandatoryFeeLabel({ additionalFees: [{ text: 'x', shortText: 'Blue Cave ticket, paid on site', mandatory: true }] })).toBe(
			'+ Blue Cave ticket, paid on site',
		);
		expect(mandatoryFeeLabel({ additionalFees: [{ text: 'x', shortText: 'optional', mandatory: false }] })).toBeUndefined();
	});
});

describe('toTourCardDTO', () => {
	it('stays slim: every tour card fits well under 1 KB of island props', () => {
		for (const tour of tours) {
			const dto = toTourCardDTO(tour, ['hvar'], null);
			expect(JSON.stringify(dto).length, tour.slug).toBeLessThan(1000);
		}
	});

	it('carries the fee line wherever a mandatory fee exists', () => {
		for (const tour of tours) {
			const dto = toTourCardDTO(tour, [], null);
			expect(Boolean(dto.mandatoryFeeLabel), tour.slug).toBe(tour.additionalFees.some((fee) => fee.mandatory));
		}
	});
});
