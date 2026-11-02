import { describe, expect, it } from 'vitest';
import { nextAvailableLabel } from './next-available';

/** A moment in Split: CEST (+02:00) in the sailing season. */
const split = (iso: string) => new Date(`${iso}+02:00`);

describe('nextAvailableLabel', () => {
	it('offers today until booking closes, 15 minutes before departure', () => {
		expect(nextAvailableLabel('07:20', split('2027-06-10T07:04:00'))).toBe('Today, 07:20');
	});

	it('moves to tomorrow once booking has closed', () => {
		expect(nextAvailableLabel('07:20', split('2027-06-10T07:05:00'))).toBe('Tomorrow, 07:20');
	});

	it('names the date when the next day is further away', () => {
		expect(nextAvailableLabel('07:20', new Date('2026-11-02T12:00:00+01:00'))).toBe('Mon, 1 Mar, 07:20');
	});

	it('skips the closed winter after the last day of the season', () => {
		expect(nextAvailableLabel('09:30', split('2027-10-31T12:00:00'))).toBe('Wed, 1 Mar, 09:30');
	});

	it('uses Tomorrow for the first day of the season', () => {
		expect(nextAvailableLabel('07:20', new Date('2027-02-28T12:00:00+01:00'))).toBe('Tomorrow, 07:20');
	});
});
