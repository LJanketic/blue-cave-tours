import { SITE_TIMEZONE } from '../config/site';

/** Today as YYYY-MM-DD in the site timezone (for date input min). */
export function minBookingDateIso(): string {
	return new Date().toLocaleDateString('en-CA', { timeZone: SITE_TIMEZONE });
}

/** True if isoDate (YYYY-MM-DD) is before today in site timezone. */
export function isPastBookingDate(isoDate: string): boolean {
	return isoDate < minBookingDateIso();
}
