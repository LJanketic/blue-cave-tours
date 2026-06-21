import { describe, expect, it } from 'vitest';
import { isPastBookingDate, minBookingDateIso } from './dates';

describe('dates', () => {
	it('minBookingDateIso returns YYYY-MM-DD', () => {
		expect(minBookingDateIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it('isPastBookingDate rejects yesterday', () => {
		const d = new Date();
		d.setDate(d.getDate() - 2);
		const iso = d.toISOString().slice(0, 10);
		expect(isPastBookingDate(iso)).toBe(true);
	});

	it('isPastBookingDate accepts far future', () => {
		expect(isPastBookingDate('2099-12-31')).toBe(false);
	});
});
