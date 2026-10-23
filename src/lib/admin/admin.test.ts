import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Booking } from '../bookings/store';
import { checkAdminPassword, createSessionToken, verifySessionToken } from './auth';
import { bookingsCsv, csvCell } from './csv';
import { departuresOn, overbookedDepartures, overbookingsById, whatsappNumber } from './manifest';
import { sendEmail } from '../email/send';
import { bookings, resetMemoryStore } from '../bookings/store';
import { departureHasLeft, formatShortDate } from '../bookings/dates';
import { addDays, isIsoDate, summarizeDay, weekFrom } from './schedule';
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

	it('issues tokens that expire and break when tampered with or the session secret changes', () => {
		process.env.ADMIN_PASSWORD = 'sea-breeze';
		process.env.ADMIN_SESSION_SECRET = 'a'.repeat(44);
		const now = 1_800_000_000_000;
		const token = createSessionToken(now) as string;
		expect(verifySessionToken(token, now + 60_000)).toBe(true);
		expect(verifySessionToken(token, now + 13 * 3_600_000)).toBe(false);
		expect(verifySessionToken(`9${token}`, now)).toBe(false);
		expect(verifySessionToken(undefined, now)).toBe(false);
		// The password never signs: changing it alone keeps sessions; rotating the secret ends them.
		process.env.ADMIN_PASSWORD = 'new-password';
		expect(verifySessionToken(token, now + 60_000)).toBe(true);
		process.env.ADMIN_SESSION_SECRET = 'b'.repeat(44);
		expect(verifySessionToken(token, now + 60_000)).toBe(false);
		delete process.env.ADMIN_SESSION_SECRET;
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
		infants: 0,
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

describe('overbooking', () => {
	const paid = (id: string, paidAt: string, adults: number, extra: Partial<Booking> = {}) =>
		booking({ id, paidAt, createdAt: paidAt, adults, lastName: `P${id}`, ...extra });

	it('names the booking that crossed capacity, not the earlier ones', () => {
		const [d] = departuresOn('2027-07-15', [
			paid('a', '2027-07-01T10:00:00Z', 6),
			paid('b', '2027-07-02T10:00:00Z', 7),
			paid('late', '2027-07-03T10:00:00Z', 4),
		]);
		expect(d.seatsTaken).toBe(17);
		expect(d.overBy).toBe(3);
		expect(d.overbookings).toHaveLength(1);
		expect(d.overbookings[0]).toMatchObject({ seatsOver: 3, seatsBefore: 13, seatsAfter: 17, capacity: MAX_GUESTS });
		expect(d.overbookings[0].booking.id).toBe('late');
	});

	it('uses payment order, not the order records are listed in', () => {
		const [d] = departuresOn('2027-07-15', [
			paid('late', '2027-07-03T10:00:00Z', 4),
			paid('a', '2027-07-01T10:00:00Z', 6),
			paid('b', '2027-07-02T10:00:00Z', 7),
		]);
		expect(d.overbookings.map((o) => o.booking.id)).toEqual(['late']);
	});

	it('counts every later booking as fully over once the boat is already past capacity', () => {
		const [d] = departuresOn('2027-07-15', [
			paid('a', '2027-07-01T10:00:00Z', 14),
			paid('b', '2027-07-02T10:00:00Z', 2),
			paid('c', '2027-07-03T10:00:00Z', 3),
		]);
		expect(d.overbookings.map((o) => [o.booking.id, o.seatsOver])).toEqual([
			['b', 2],
			['c', 3],
		]);
	});

	it('is not flagged at exactly full, and ignores unpaid and cancelled bookings', () => {
		const [d] = departuresOn('2027-07-15', [
			paid('a', '2027-07-01T10:00:00Z', 14),
			booking({ id: 'u', status: 'pending_payment', paymentStatus: 'unpaid', adults: 4 }),
			paid('x', '2027-07-02T10:00:00Z', 4, { status: 'cancelled', paymentStatus: 'refunded' }),
		]);
		expect(d.overBy).toBe(0);
		expect(d.overbookings).toEqual([]);
	});

	it('treats a reinstated booking as taking its seats when it was put back', () => {
		const [d] = departuresOn('2027-07-15', [
			paid('back', '2027-07-01T10:00:00Z', 4, { seatsSince: '2027-07-05T10:00:00Z' }),
			paid('a', '2027-07-02T10:00:00Z', 6),
			paid('b', '2027-07-03T10:00:00Z', 7),
		]);
		expect(d.overbookings.map((o) => o.booking.id)).toEqual(['back']);
	});

	it('finds overbookings across dates by id, and lists overbooked departures from a date on', () => {
		const all = [
			paid('a', '2027-07-01T10:00:00Z', 11),
			paid('b', '2027-07-02T10:00:00Z', 4),
			paid('old1', '2027-06-01T10:00:00Z', 11, { date: '2027-07-10' }),
			paid('old2', '2027-06-02T10:00:00Z', 4, { date: '2027-07-10' }),
		];
		expect([...overbookingsById(all).keys()].sort()).toEqual(['b', 'old2']);
		expect(overbookedDepartures(all, '2027-07-12').map((x) => x.date)).toEqual(['2027-07-15']);
	});

	it('counts free seats per boat, so an overbooked boat does not hide seats on another', () => {
		const day = summarizeDay('2027-07-15', [
			paid('a', '2027-07-01T10:00:00Z', 10),
			paid('b', '2027-07-02T10:00:00Z', 5),
			paid('c', '2027-07-01T10:00:00Z', 2, { slot: '07:20', tourSlug: 'x', tourTitle: 'X' }),
		]);
		expect(day).toMatchObject({ guests: 17, free: 12, overbooked: 1 });
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
		expect(csv.split('\r\n')[0].endsWith('"Type","Pick-up"')).toBe(true);
		expect(bookingsCsv([booking({ kind: 'private', pickup: 'Villa Sunce, Podstrana' })])).toContain('"Private experience","Villa Sunce, Podstrana"');
	});
});

describe('whatsappNumber', () => {
	it('keeps digits only', () => {
		expect(whatsappNumber('+385 91 234 5678')).toBe('385912345678');
		expect(whatsappNumber('n/a')).toBeNull();
	});
});

describe('demo email delivery', () => {
	it('runs tests with no real keys or addresses, and no network', async () => {
		expect(process.env.RESEND_API_KEY).toBeUndefined();
		expect(process.env.ADMIN_EMAIL).toBeUndefined();
		await expect(fetch('https://api.resend.com/emails')).rejects.toThrow(/disabled in tests/);
	});

	afterEach(() => {
		delete process.env.RESEND_API_KEY;
		delete process.env.EMAIL_SENDING;
		delete process.env.EMAIL_FROM;
		delete process.env.EMAIL_DEMO_ALLOWLIST;
		vi.unstubAllGlobals();
		resetMemoryStore();
	});

	const message = { kind: 'booking_confirmation' as const, replyTo: null, subject: 's', html: 'h', text: 't', relatedId: null };

	it('only delivers to the admin and allowlisted addresses while payments are a demo', async () => {
		process.env.EMAIL_SENDING = 'on';
		process.env.RESEND_API_KEY = 're_test';
		process.env.EMAIL_DEMO_ALLOWLIST = 'boss@example.test';
		const fetchMock = vi.fn(async () => new Response('{"id":"x"}', { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);

		expect((await sendEmail({ ...message, to: 'stranger@example.com' })).delivery).toBe('outbox');
		expect((await sendEmail({ ...message, to: 'Boss@example.test' })).delivery).toBe('sent');
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('sends through Resend from the test sender until EMAIL_FROM is set', async () => {
		process.env.EMAIL_SENDING = 'on';
		process.env.RESEND_API_KEY = 're_test';
		process.env.EMAIL_DEMO_ALLOWLIST = 'boss@example.test';
		const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => new Response('{"id":"x"}', { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);

		const sent = await sendEmail({ ...message, to: 'boss@example.test', replyTo: 'guest@example.com' });
		const [url, init] = fetchMock.mock.calls[0];
		const headers = init.headers as Record<string, string>;
		expect(url).toBe('https://api.resend.com/emails');
		expect(headers.Authorization).toBe('Bearer re_test');
		expect(headers['Idempotency-Key']).toBe(sent.id);
		expect(JSON.parse(String(init.body))).toMatchObject({
			from: 'Hello Blue Cave <onboarding@resend.dev>',
			to: ['boss@example.test'],
			reply_to: 'guest@example.com',
			subject: 's',
		});

		process.env.EMAIL_FROM = 'bookings@example.test';
		await sendEmail({ ...message, to: 'boss@example.test' });
		expect(JSON.parse(String(fetchMock.mock.calls[1][1].body)).from).toBe('Hello Blue Cave <bookings@example.test>');
	});

	it('records Resend\'s reason when it refuses, and a timeout as a failure', async () => {
		process.env.EMAIL_SENDING = 'on';
		process.env.RESEND_API_KEY = 're_test';
		process.env.EMAIL_DEMO_ALLOWLIST = 'boss@example.test';
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('{"name":"validation_error","message":"You can only send testing emails to your own email address"}', { status: 403 })),
		);
		const refused = await sendEmail({ ...message, to: 'boss@example.test' });
		expect(refused.delivery).toBe('failed');
		expect(refused.deliveryError).toBe('Resend responded 403: You can only send testing emails to your own email address');
		expect(refused.deliveryError).not.toContain('re_test');

		vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('The operation was aborted due to timeout'))));
		const timedOut = await sendEmail({ ...message, to: 'boss@example.test' });
		expect(timedOut.delivery).toBe('failed');
		expect(timedOut.deliveryError).toContain('timeout');
	});

	it('sends nothing unless EMAIL_SENDING=on is set, and says nothing about it', async () => {
		process.env.RESEND_API_KEY = 're_test';
		process.env.EMAIL_DEMO_ALLOWLIST = 'admin@example.test';
		const fetchMock = vi.fn(async () => new Response('{"id":"x"}', { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);

		for (const value of [undefined, '', 'off', 'yes']) {
			if (value === undefined) delete process.env.EMAIL_SENDING;
			else process.env.EMAIL_SENDING = value;
			const email = await sendEmail({ ...message, to: 'admin@example.test' });
			expect(email.delivery).toBe('outbox');
			expect(email.deliveryError).toBeUndefined();
		}
		expect(fetchMock).not.toHaveBeenCalled();

		process.env.EMAIL_SENDING = ' On ';
		expect((await sendEmail({ ...message, to: 'admin@example.test' })).delivery).toBe('sent');
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('sends nothing without RESEND_API_KEY, even with EMAIL_SENDING=on', async () => {
		process.env.EMAIL_SENDING = 'on';
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		const email = await sendEmail({ ...message, to: 'admin@example.test' });
		expect(email.delivery).toBe('outbox');
		expect(fetchMock).not.toHaveBeenCalled();
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

	it('covers about three weeks ahead with exactly one overbooked departure, tomorrow', async () => {
		const now = new Date('2027-07-01T08:00:00Z');
		await loadSampleData(now);
		const all = await bookings().list();
		const dates = new Set(all.map((b) => b.date));
		expect(dates.has('2027-07-21')).toBe(true);
		const over = [...dates].flatMap((date) => departuresOn(date, all).filter((d) => d.seatsTaken > MAX_GUESTS).map((d) => ({ date, d })));
		expect(over).toHaveLength(1);
		expect(over[0].date).toBe('2027-07-02');
		// 13 seats, then Smith: 4 adults and an infant. Infants take seats (D-9).
		expect(over[0].d.seatsTaken).toBe(18);
		expect(over[0].d.infants).toBe(1);
		expect(over[0].d.overbookings.map((o) => [o.booking.lastName, o.seatsOver])).toEqual([['Smith', 4]]);
		// Bookings are never created after "now".
		expect(all.every((b) => b.createdAt <= now.toISOString())).toBe(true);
	});
});
