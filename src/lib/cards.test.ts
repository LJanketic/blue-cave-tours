import { describe, expect, it } from 'vitest';
import { tours } from '../data/tour-catalog';
import { feeLabel, tourCardBadge, toTourCardDTO } from './cards';

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

describe('feeLabel', () => {
	const fee = (shortText: string, mandatory: boolean) => ({ text: 'x', shortText, mandatory });

	it('marks mandatory fees with a "+"', () => {
		expect(feeLabel({ additionalFees: [fee('Blue Cave ticket, paid on site', true)] })).toBe('+ Blue Cave ticket, paid on site');
	});

	it('shows optional fees as they are, without the "+"', () => {
		expect(feeLabel({ additionalFees: [fee('Blue Cave entry optional, ticket paid on site', false)] })).toBe(
			'Blue Cave entry optional, ticket paid on site',
		);
	});

	it('puts mandatory fees first, and is empty without fees', () => {
		expect(feeLabel({ additionalFees: [fee('Optional extra', false), fee('Park ticket', true)] })).toBe('+ Park ticket · Optional extra');
		expect(feeLabel({ additionalFees: [] })).toBeUndefined();
	});
});

describe('toTourCardDTO', () => {
	it('stays slim: every tour card fits well under 1 KB of island props', () => {
		for (const tour of tours) {
			const dto = toTourCardDTO(tour, ['hvar'], null);
			expect(JSON.stringify(dto).length, tour.slug).toBeLessThan(700);
		}
	});

	it('carries the fee line wherever a fee exists, mandatory or optional', () => {
		for (const tour of tours) {
			const dto = toTourCardDTO(tour, [], null);
			expect(Boolean(dto.feeLabel), tour.slug).toBe(tour.additionalFees.length > 0);
		}
	});
});

describe('toTourCardDTO fromPrice', () => {
	it('is the low-season adult price, and left out for quote-only tours', () => {
		for (const tour of tours) {
			const card = toTourCardDTO(tour, [], null);
			if (tour.prices) expect(card.fromPrice).toBe(tour.prices.low.adult);
			else expect(card).not.toHaveProperty('fromPrice');
		}
	});
});
