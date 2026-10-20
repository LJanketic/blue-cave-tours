import { BOOKING_CUTOFF_MINUTES } from '../../config/booking';

/** The business runs on Split time; the server runs on UTC. */
export const BUSINESS_TIME_ZONE = 'Europe/Zagreb';

const DATE_PARTS = new Intl.DateTimeFormat('en-GB', { timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

/** Calendar date (YYYY-MM-DD) in Split for the given moment. */
export function businessDate(now: Date = new Date(), offsetDays = 0): string {
	// Built from the parts, not a locale's formatted string: browsers differ in how they format en-CA.
	const parts = DATE_PARTS.formatToParts(now);
	const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
	const today = `${part('year')}-${part('month')}-${part('day')}`;
	if (!offsetDays) return today;
	// Shift the calendar date itself: adding 24h to the moment would skip or
	// repeat a day around the daylight-saving changes.
	const [year, month, day] = today.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day + offsetDays)).toISOString().slice(0, 10);
}

/** A fixed departure time, "HH:MM" (24h). */
const SLOT_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Wall-clock time ("HH:MM", 24h) in Split for the given moment. */
export function businessTime(now: Date = new Date()): string {
	return new Intl.DateTimeFormat('en-GB', { timeZone: BUSINESS_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
}

/**
 * Has this departure left yet? Earlier days have; today's has once its time has
 * passed. A departure with no confirmed time ("TBC") counts only from the next day.
 */
export function departureHasLeft(date: string, slot: string, now: Date = new Date()): boolean {
	const today = businessDate(now);
	if (date !== today) return date < today;
	return SLOT_RE.test(slot) && slot <= businessTime(now);
}

/**
 * When booking closes for a departure, as a Split calendar date and wall-clock
 * time: BOOKING_CUTOFF_MINUTES before the slot (09:10 → 08:55; 00:10 → 23:55
 * the day before). Null for a departure with no fixed time ("TBC").
 */
export function bookingCutoff(date: string, slot: string): { date: string; time: string } | null {
	const match = SLOT_RE.exec(slot);
	if (!match) return null;
	let minutes = Number(match[1]) * 60 + Number(match[2]) - BOOKING_CUTOFF_MINUTES;
	let day = date;
	if (minutes < 0) {
		minutes += 24 * 60;
		const [y, m, d] = date.split('-').map(Number);
		day = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
	}
	const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
	const mm = String(minutes % 60).padStart(2, '0');
	return { date: day, time: `${hh}:${mm}` };
}

/**
 * Is booking closed for this departure? Earlier days always are. A timed
 * departure closes BOOKING_CUTOFF_MINUTES before it leaves (Split time): a 07:20
 * boat is bookable up to 07:04 and closed from 07:05. A departure with no
 * fixed time ("TBC") stays bookable until the end of its day, as before: the
 * operator confirms the time with the customer.
 */
export function bookingClosed(date: string, slot: string, now: Date = new Date()): boolean {
	const today = businessDate(now);
	const cutoff = bookingCutoff(date, slot);
	if (!cutoff) return date < today;
	if (cutoff.date !== today) return cutoff.date < today;
	return cutoff.time <= businessTime(now);
}

/**
 * Has booking closed for every departure on this date? A tour without fixed
 * times (no slots) closes only once the day is past, like a "TBC" departure.
 */
export function dayClosed(date: string, slots: string[], now: Date = new Date()): boolean {
	return (slots.length ? slots : ['']).every((slot) => bookingClosed(date, slot, now));
}

/** "11 Oct 2026, 14:05" in Split time. */
export function formatTimestamp(iso: string): string {
	return new Date(iso).toLocaleString('en-GB', {
		timeZone: BUSINESS_TIME_ZONE,
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

/** "Tue 13 Oct" (or "13 Oct" without the weekday) for a YYYY-MM-DD calendar date. */
export function formatShortDate(isoDate: string, withWeekday = true): string {
	// Noon UTC keeps the calendar date stable whatever the server's time zone.
	return new Date(`${isoDate}T12:00:00Z`)
		.toLocaleDateString('en-GB', {
			timeZone: 'UTC',
			weekday: withWeekday ? 'short' : undefined,
			day: 'numeric',
			month: 'short',
		})
		.replace(',', '');
}
