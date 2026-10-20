import { describe, expect, it } from 'vitest';
import { BOOKING_CUTOFF_MINUTES } from '../../config/booking';
import { bookingClosed, bookingCutoff, businessDate, businessTime, dayClosed } from './dates';

describe('bookingCutoff', () => {
	it('is 15 minutes before the departure', () => {
		expect(BOOKING_CUTOFF_MINUTES).toBe(15);
		expect(bookingCutoff('2027-07-15', '07:20')).toEqual({ date: '2027-07-15', time: '07:05' });
	});

	it('borrows across the hour', () => {
		expect(bookingCutoff('2027-07-15', '09:10')).toEqual({ date: '2027-07-15', time: '08:55' });
		expect(bookingCutoff('2027-07-15', '10:00')).toEqual({ date: '2027-07-15', time: '09:45' });
	});

	it('moves to the day before for slots before 00:15', () => {
		expect(bookingCutoff('2027-07-15', '00:10')).toEqual({ date: '2027-07-14', time: '23:55' });
		expect(bookingCutoff('2027-07-15', '00:15')).toEqual({ date: '2027-07-15', time: '00:00' });
		expect(bookingCutoff('2027-03-01', '00:00')).toEqual({ date: '2027-02-28', time: '23:45' });
		expect(bookingCutoff('2027-01-01', '00:05')).toEqual({ date: '2026-12-31', time: '23:50' });
	});

	it('is null without a fixed time', () => {
		expect(bookingCutoff('2027-07-15', '')).toBeNull();
		expect(bookingCutoff('2027-07-15', 'TBC')).toBeNull();
		expect(bookingCutoff('2027-07-15', '24:00')).toBeNull();
	});
});

describe('bookingClosed', () => {
	// Summer: Split is UTC+2, so 07:05 in Split is 05:05Z.
	const at = (iso: string) => new Date(iso);

	it('closes exactly 15 minutes before departure, and is open a minute earlier', () => {
		expect(bookingClosed('2027-07-15', '07:20', at('2027-07-15T05:04:00Z'))).toBe(false); // 07:04, 16 min before
		expect(bookingClosed('2027-07-15', '07:20', at('2027-07-15T05:04:59Z'))).toBe(false);
		expect(bookingClosed('2027-07-15', '07:20', at('2027-07-15T05:05:00Z'))).toBe(true); // 07:05, 15 min before
		expect(bookingClosed('2027-07-15', '07:20', at('2027-07-15T05:20:00Z'))).toBe(true); // departure time
		expect(bookingClosed('2027-07-15', '07:20', at('2027-07-15T10:00:00Z'))).toBe(true);
	});

	it('is closed for yesterday and open for tomorrow, whatever the time', () => {
		const now = at('2027-07-15T05:00:00Z');
		expect(bookingClosed('2027-07-14', '23:00', now)).toBe(true);
		expect(bookingClosed('2027-07-14', '', now)).toBe(true);
		expect(bookingClosed('2027-07-16', '07:20', now)).toBe(false);
		expect(bookingClosed('2027-07-16', '', now)).toBe(false);
	});

	it('closes a just-after-midnight departure the evening before', () => {
		// 23:54 and 23:55 on 14 July in Split.
		expect(bookingClosed('2027-07-15', '00:10', at('2027-07-14T21:54:00Z'))).toBe(false);
		expect(bookingClosed('2027-07-15', '00:10', at('2027-07-14T21:55:00Z'))).toBe(true);
	});

	it('keeps a departure without a fixed time open until its day ends', () => {
		expect(bookingClosed('2027-07-15', '', at('2027-07-15T21:59:00Z'))).toBe(false); // 23:59 in Split
		expect(bookingClosed('2027-07-15', '', at('2027-07-15T22:00:00Z'))).toBe(true); // 00:00 next day
	});

	it('uses Split time, not UTC: late evening UTC is already tomorrow in Split', () => {
		// 22:30Z on 14 July is 00:30 on 15 July in Split.
		const now = at('2027-07-14T22:30:00Z');
		expect(businessDate(now)).toBe('2027-07-15');
		// h23, not h24: just after midnight is 00:30, never 24:30.
		expect(businessTime(now)).toBe('00:30');
		expect(bookingClosed('2027-07-14', '23:00', now)).toBe(true);
		expect(bookingClosed('2027-07-15', '07:20', now)).toBe(false);
		// Winter: UTC+1, so 07:05 in Split is 06:05Z (05:05Z would be 06:05, still open).
		expect(bookingClosed('2027-01-15', '07:20', at('2027-01-15T05:05:00Z'))).toBe(false);
		expect(bookingClosed('2027-01-15', '07:20', at('2027-01-15T06:04:00Z'))).toBe(false);
		expect(bookingClosed('2027-01-15', '07:20', at('2027-01-15T06:05:00Z'))).toBe(true);
	});

	it('handles the daylight-saving change days', () => {
		// 28 Mar 2027: clocks go 02:00 → 03:00. Before the change Split is UTC+1, after it UTC+2.
		expect(businessTime(at('2027-03-28T00:59:00Z'))).toBe('01:59');
		expect(businessTime(at('2027-03-28T01:00:00Z'))).toBe('03:00');
		expect(bookingClosed('2027-03-28', '07:20', at('2027-03-28T05:04:00Z'))).toBe(false); // 07:04
		expect(bookingClosed('2027-03-28', '07:20', at('2027-03-28T05:05:00Z'))).toBe(true); // 07:05
		// 31 Oct 2027: clocks go 03:00 → 02:00; after the change Split is UTC+1.
		expect(bookingClosed('2027-10-31', '07:20', at('2027-10-31T06:04:00Z'))).toBe(false); // 07:04
		expect(bookingClosed('2027-10-31', '07:20', at('2027-10-31T06:05:00Z'))).toBe(true); // 07:05
		// The day before each change still uses that day's offset.
		expect(bookingClosed('2027-10-30', '07:20', at('2027-10-30T05:04:00Z'))).toBe(false); // 07:04, UTC+2
		expect(bookingClosed('2027-10-30', '07:20', at('2027-10-30T05:05:00Z'))).toBe(true);
	});
});

describe('businessDate', () => {
	it('is YYYY-MM-DD with zero-padded month and day', () => {
		expect(businessDate(new Date('2027-01-05T10:00:00Z'))).toBe('2027-01-05');
	});

	it('moves by calendar days across the daylight-saving change', () => {
		expect(businessDate(new Date('2027-03-27T12:00:00Z'), 1)).toBe('2027-03-28');
		expect(businessDate(new Date('2027-03-01T12:00:00Z'), -1)).toBe('2027-02-28');
	});
});

describe('dayClosed', () => {
	const at = (iso: string) => new Date(iso);

	it('is closed only once every departure that day has closed', () => {
		// 09:20 and 14:00 departures; 09:05 in Split is 07:05Z in summer.
		const slots = ['09:20', '14:00'];
		expect(dayClosed('2027-07-15', slots, at('2027-07-15T07:04:00Z'))).toBe(false);
		expect(dayClosed('2027-07-15', slots, at('2027-07-15T07:05:00Z'))).toBe(false); // 09:20 closed, 14:00 open
		expect(dayClosed('2027-07-15', slots, at('2027-07-15T11:45:00Z'))).toBe(true); // 13:45
	});

	it('treats a tour without fixed times as open until the day is past', () => {
		expect(dayClosed('2027-07-15', [], at('2027-07-15T21:59:00Z'))).toBe(false);
		expect(dayClosed('2027-07-15', [], at('2027-07-15T22:00:00Z'))).toBe(true);
	});

	it('is closed for earlier days and open for later ones', () => {
		const now = at('2027-07-15T05:00:00Z');
		expect(dayClosed('2027-07-14', ['23:00'], now)).toBe(true);
		expect(dayClosed('2027-07-16', ['07:20'], now)).toBe(false);
	});
});
