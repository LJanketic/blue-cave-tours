import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Booking } from '../bookings/store';
import { checkAdminPassword, createSessionToken, verifySessionToken } from './auth';
import { bookingsCsv, csvCell } from './csv';
import { departuresOn, whatsappNumber } from './manifest';
import { sendEmail } from '../email/send';
import { bookings, resetMemoryStore } from '../bookings/store';
import { departureHasLeft, formatShortDate } from '../bookings/dates';
import { addDays, isIsoDate, weekFrom } from './schedule';
import { MAX_GUESTS } from '../booking';
import { loadSampleData } from './sample-data';

describe('admin session', () => {
	afterEach(() => {
		delete process.env.ADMIN_PASSWORD;
	});

	it('accepts only the configured password', () => {
		process.env.ADMIN_PASSWORD = 'sea-breeze';
		expect(checkAdminPassword('sea-breeze')).toBe(true);
		expect(checkAdminPassword('sea-breez')).toBe(false);
		expect(checkAdminPassword('')).toBe(false);
	});

	it('issues tokens that expire and break when tampered with or the password changes', () => {
		process.env.ADMIN_PASSWORD = 'sea-breeze';
		const now = 1_800_000_000_000;
		const token = createSessionToken(now) as string;
		expect(verifySessionToken(token, now + 60_000)).toBe(true);
		expect(verifySessionToken(token, now + 13 * 3_600_000)).toBe(false);
		expect(verifySessionToken(`9${token}`, now)).toBe(false);
		expect(verifySessionToken(undefined, now)).toBe(false);
		process.env.ADMIN_PASSWORD = 'new-password';
		expect(verifySessionToken(token, now + 60_000)).toBe(false);
	});
});

function booking(overrides: Partial<Booking>): Booking {
	return {
		id: 'id',
		ref: 'HBC-AAAAAA',
		createdAt: '2027-07-01T10:00:00Z',
		updatedAt: '2027-07-01T10:00:00Z',
		status: 'confirmed',
		paymentStatus: 'paid',
		paymentProvider: 'teya',
		paymentRef: 'T',
		paidAt: '2027-07-01T10:00:00Z',
		tourSlug: 'blue-lagoon-morning',
		tourTitle: 'Blue Lagoon',
		date: '2027-07-15',
		slot: '09:30',
		adults: 2,
		children: 0,
		total: 150,
		firstName: 'A',
		lastName: 'B',
		email: 'a@b.co',
		phone: '',
		customerNotes: '',
		invoice: null,
		staffNotes: [],
		history: [],
		...overrides,
	};
}

describe('departuresOn', () => {
	it('groups by tour and time and counts only paid, active seats', () => {
		const departures = departuresOn('2027-07-15', [
			booking({ id: '1', lastName: 'Zed', adults: 2, children: 1 }),
			booking({ id: '2', lastName: 'Adams', adults: 4 }),
			booking({ id: '3', status: 'cancelled', paymentStatus: 'refunded', adults: 5 }),
			booking({ id: '4', status: 'pending_payment', paymentStatus: 'unpaid', adults: 2 }),
			booking({ id: '5', slot: '07:20', tourSlug: 'x', tourTitle: 'X', adults: 1 }),
			booking({ id: '6', date: '2027-07-16' }),
		]);
		expect(departures.map((d) => d.slot)).toEqual(['07:20', '09:30']);
		const lagoon = departures[1];
		expect(lagoon.seatsTaken).toBe(7);
		expect(lagoon.passengers.map((b) => b.lastName)).toEqual(['Adams', 'Zed']);
		expect(lagoon.unpaid.map((b) => b.id)).toEqual(['4']);
	});
});

describe('week schedule', () => {
	it('summarises seven days, counting capacity only for departures with guests', () => {
		const week = weekFrom('2027-07-15', [
			booking({ id: '1', adults: 3 }),
			booking({ id: '2', status: 'pending_payment', paymentStatus: 'unpaid', slot: '07:20' }),
			booking({ id: '3', date: '2027-07-21', adults: 2, children: 2 }),
			booking({ id: '4', date: '2027-07-22' }),
		]);
		expect(week.map((d) => d.date)).toEqual([
			'2027-07-15',
			'2027-07-16',
			'2027-07-17',
			'2027-07-18',
			'2027-07-19',
			'2027-07-20',
			'2027-07-21',
		]);
		expect(week[0]).toMatchObject({ guests: 3, capacity: MAX_GUESTS, unpaid: 1 });
		expect(week[0].departures).toHaveLength(2);
		expect(week[6]).toMatchObject({ guests: 4, capacity: MAX_GUESTS, unpaid: 0 });
		expect(week[1]).toMatchObject({ guests: 0, capacity: 0, unpaid: 0 });
	});

	it('shifts calendar dates across month ends and validates them', () => {
		expect(addDays('2026-10-29', 7)).toBe('2026-11-05');
		expect(addDays('2026-03-02', -7)).toBe('2026-02-23');
		expect(isIsoDate('2026-10-12')).toBe(true);
		expect(isIsoDate('2026-1-12')).toBe(false);
		expect(isIsoDate('nope')).toBe(false);
		expect(isIsoDate(null)).toBe(false);
	});
});

describe('departureHasLeft', () => {
	// 12 Oct 2026, 10:00 in Split (UTC+2).
	const now = new Date('2026-10-12T08:00:00Z');

	it('is true for earlier days and false for later ones', () => {
		expect(departureHasLeft('2026-10-11', '18:00', now)).toBe(true);
		expect(departureHasLeft('2026-10-13', '07:20', now)).toBe(false);
	});

	it('uses the departure time in Split for today', () => {
		expect(departureHasLeft('2026-10-12', '09:30', now)).toBe(true);
		expect(departureHasLeft('2026-10-12', '14:00', now)).toBe(false);
		expect(departureHasLeft('2026-10-12', '', now)).toBe(false);
	});
});

describe('csv', () => {
	it('quotes cells and defuses spreadsheet formulas', () => {
		expect(csvCell('say "hi"')).toBe('"say ""hi"""');
		expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
		expect(csvCell(42)).toBe('"42"');
	});

	it('writes a header and one line per booking, with a BOM for Excel', () => {
		const csv = bookingsCsv([booking({ firstName: 'Ana', lastName: 'Kovačević' })]);
		expect(csv.startsWith('﻿"Ref"')).toBe(true);
		expect(csv.trim().split('\r\n')).toHaveLength(2);
		expect(csv).toContain('"Kovačević"');
	});
});

describe('whatsappNumber', () => {
	it('keeps digits only', () => {
		expect(whatsappNumber('+385 91 234 5678')).toBe('385912345678');
		expect(whatsappNumber('n/a')).toBeNull();
	});
});

describe('demo email delivery', () => {
	afterEach(() => {
		delete process.env.BREVO_API_KEY;
		delete process.env.EMAIL_FROM;
		delete process.env.EMAIL_DEMO_ALLOWLIST;
		vi.unstubAllGlobals();
		resetMemoryStore();
	});

	it('only delivers to the admin and allowlisted addresses while payments are a demo', async () => {
		process.env.BREVO_API_KEY = 'key';
		process.env.EMAIL_FROM = 'bookings@example.test';
		process.env.EMAIL_DEMO_ALLOWLIST = 'boss@example.test';
		const fetchMock = vi.fn(async () => new Response('{}', { status: 201 }));
		vi.stubGlobal('fetch', fetchMock);
		const message = { kind: 'booking_confirmation' as const, replyTo: null, subject: 's', html: 'h', text: 't', relatedId: null };

		expect((await sendEmail({ ...message, to: 'stranger@example.com' })).delivery).toBe('outbox');
		expect((await sendEmail({ ...message, to: 'Boss@example.test' })).delivery).toBe('sent');
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe('formatShortDate', () => {
	it('writes a compact day label that ignores the server time zone', () => {
		expect(formatShortDate('2026-10-13')).toBe('Tue 13 Oct');
		expect(formatShortDate('2026-10-13', false)).toBe('13 Oct');
	});
});

describe('demo data', () => {
	afterEach(() => resetMemoryStore());

	it('covers about three weeks ahead without overbooking any departure', async () => {
		const now = new Date('2027-07-01T08:00:00Z');
		await loadSampleData(now);
		const all = await bookings().list();
		const dates = new Set(all.map((b) => b.date));
		expect(dates.has('2027-07-21')).toBe(true);
		for (const date of dates) {
			for (const departure of departuresOn(date, all)) {
				expect(departure.seatsTaken).toBeLessThanOrEqual(MAX_GUESTS);
			}
		}
		// Bookings are never created after "now".
		expect(all.every((b) => b.createdAt <= now.toISOString())).toBe(true);
	});
});
