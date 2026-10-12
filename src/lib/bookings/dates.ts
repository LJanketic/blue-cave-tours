/** The business runs on Split time; the server runs on UTC. */
export const BUSINESS_TIME_ZONE = 'Europe/Zagreb';

/** Calendar date (YYYY-MM-DD) in Split for the given moment. */
export function businessDate(now: Date = new Date(), offsetDays = 0): string {
	// en-CA formats as YYYY-MM-DD.
	const today = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE }).format(now);
	if (!offsetDays) return today;
	// Shift the calendar date itself: adding 24h to the moment would skip or
	// repeat a day around the daylight-saving changes.
	const [year, month, day] = today.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day + offsetDays)).toISOString().slice(0, 10);
}

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
	return /^\d{2}:\d{2}$/.test(slot) && slot <= businessTime(now);
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
