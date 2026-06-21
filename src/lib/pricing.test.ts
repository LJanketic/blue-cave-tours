import { describe, expect, it } from 'vitest';
import { CHILD_RATE, computeQuote, parseFromPrice, PRIVATE_TOUR_SLUG, validatePartyCounts } from './pricing';

describe('parseFromPrice', () => {
	it('parses euro amounts', () => {
		expect(parseFromPrice('€159')).toBe(159);
		expect(parseFromPrice('From €89')).toBe(89);
		expect(parseFromPrice('n/a')).toBeNull();
	});
});

describe('validatePartyCounts', () => {
	it('rejects empty party', () => {
		expect(validatePartyCounts({ adults: 0, children: 0, infants: 0 }, 'en')?.error).toBeTruthy();
	});

	it('rejects infants-only bookings', () => {
		expect(validatePartyCounts({ adults: 0, children: 0, infants: 2 }, 'en')?.error).toMatch(/paying/i);
	});

	it('requires an adult when infants are present', () => {
		expect(validatePartyCounts({ adults: 0, children: 1, infants: 1 }, 'en')?.error).toMatch(/adult/i);
	});

	it('accepts adults with infants', () => {
		expect(validatePartyCounts({ adults: 1, children: 0, infants: 2 }, 'en')).toBeNull();
	});
});

describe('computeQuote', () => {
	it('requires at least one guest', () => {
		const result = computeQuote('blue-cave-hvar-5-islands', { adults: 0, children: 0, infants: 0 }, 'en');
		expect(result).toHaveProperty('error');
	});

	it('rejects infants-only party at checkout quote', () => {
		const result = computeQuote('blue-cave-hvar-5-islands', { adults: 0, children: 0, infants: 1 }, 'en');
		expect(result).toHaveProperty('error');
	});

	it('calculates adult and child lines', () => {
		const result = computeQuote('blue-cave-hvar-5-islands', { adults: 2, children: 1, infants: 0 });
		expect(result).not.toHaveProperty('error');
		if (!result || 'error' in result) return;
		expect(result.total).toBe(159 * 2 + Math.round(159 * CHILD_RATE));
		expect(result.lineItems).toHaveLength(2);
	});

	it('uses three-islands adult from-price', () => {
		const result = computeQuote('three-islands', { adults: 1, children: 0, infants: 0 });
		expect(result).not.toHaveProperty('error');
		if (!result || 'error' in result) return;
		expect(result.total).toBe(139);
		expect(result.adultUnitPrice).toBe(139);
	});

	it('marks private tour as contact-only', () => {
		const result = computeQuote(PRIVATE_TOUR_SLUG, { adults: 2, children: 0, infants: 0 });
		expect(result).not.toHaveProperty('error');
		if (!result || 'error' in result) return;
		expect(result.requiresContact).toBe(true);
	});
});
