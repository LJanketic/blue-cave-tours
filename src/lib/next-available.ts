import { isInSeason } from '../config/season';
import { bookingClosed, businessDate } from './bookings/dates';

const WEEKDAY_DAY_MONTH = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/**
 * The tour card's "Next available" value for a tour with one fixed departure:
 * "Today, 07:20", "Tomorrow, 07:20" or "Mon, 1 Mar, 07:20". It uses the same
 * rules as the booking calendar: in season, and before booking closes for that
 * departure. Null when no day in the coming year qualifies.
 */
export function nextAvailableLabel(time: string, now: Date = new Date()): string | null {
	for (let offset = 0; offset <= 366; offset++) {
		const date = businessDate(now, offset);
		if (!isInSeason(date) || bookingClosed(date, time, now)) continue;
		if (offset === 0) return `Today, ${time}`;
		if (offset === 1) return `Tomorrow, ${time}`;
		const [year, month, day] = date.split('-').map(Number);
		const label = WEEKDAY_DAY_MONTH.format(new Date(Date.UTC(year, month - 1, day))).replace(/^(\w+) /, '$1, ');
		return `${label}, ${time}`;
	}
	return null;
}
