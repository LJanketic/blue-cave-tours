/**
 * The sailing season (D-15): tours run daily between these dates, inclusive.
 * MM-DD, so the same rule holds every year. Calendar days outside it are disabled.
 */
export const SEASON_START = '04-01';
export const SEASON_END = '11-30';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** True when an ISO date (YYYY-MM-DD) falls inside the season. */
export function isInSeason(isoDate: string): boolean {
	const monthDay = isoDate.slice(5, 10);
	return monthDay >= SEASON_START && monthDay <= SEASON_END;
}

function dayMonth(monthDay: string): string {
	const [month, day] = monthDay.split('-').map(Number);
	return `${day} ${MONTHS[month - 1]}`;
}

/** "1 April to 30 November" */
export function seasonLabel(): string {
	return `${dayMonth(SEASON_START)} to ${dayMonth(SEASON_END)}`;
}
