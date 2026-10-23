/**
 * The sailing season (D-15): tours run daily between these dates, inclusive.
 * MM-DD, so the same rule holds every year. Calendar days outside it are disabled.
 * Operator, Oct 2026: the boats are out of the water from 1 November to the end
 * of February, so group bookings and private requests are closed then.
 */
export const SEASON_START = '03-01';
export const SEASON_END = '10-31';

/**
 * Low season (operator, Oct 2026): low prices apply to tour dates inside these
 * MM-DD ranges, inclusive. Together with PEAK_SEASON they cover the sailing
 * season exactly, day by day. The single source of truth for seasonal pricing;
 * the price is chosen by the tour date, not the day of purchase.
 */
export const LOW_SEASON: [string, string][] = [
	['03-01', '05-31'],
	['09-15', '10-31'],
];

/** Peak season (operator, Oct 2026): peak prices apply to tour dates inside these MM-DD ranges, inclusive. */
export const PEAK_SEASON: [string, string][] = [['06-01', '09-14']];

export type Season = 'low' | 'peak';

/** An amount (e.g. an adult price) in each price season. Record<Season, number>, spelt as a mapped type because Vue can't resolve Record in defineProps. */
export type SeasonAmount = { [S in Season]: number };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** True when an ISO date (YYYY-MM-DD) falls inside the season. */
export function isInSeason(isoDate: string): boolean {
	const monthDay = isoDate.slice(5, 10);
	return monthDay >= SEASON_START && monthDay <= SEASON_END;
}

/**
 * The price season of an ISO date (YYYY-MM-DD): peak inside a PEAK_SEASON range,
 * low otherwise. Closed winter days count as low, the season of the next open
 * day (1 March), so the "from" price on prerendered pages stays honest in winter.
 */
export function seasonFor(isoDate: string): Season {
	const monthDay = isoDate.slice(5, 10);
	return PEAK_SEASON.some(([from, to]) => monthDay >= from && monthDay <= to) ? 'peak' : 'low';
}

function dayMonth(monthDay: string, short = false): string {
	const [month, day] = monthDay.split('-').map(Number);
	const name = MONTHS[month - 1];
	return `${day} ${short ? name.slice(0, 3) : name}`;
}

/** "1 March to 31 October". */
export function seasonLabel(): string {
	return `${dayMonth(SEASON_START)} to ${dayMonth(SEASON_END)}`;
}

/** "March to October": the season by month, for short copy such as tour availability. */
export function seasonMonths(): string {
	const month = (monthDay: string) => MONTHS[Number(monthDay.slice(0, 2)) - 1];
	return `${month(SEASON_START)} to ${month(SEASON_END)}`;
}

/**
 * The price season's dates: "1 March to 31 May and 15 September to 31 October";
 * with `short`, "1 Mar–31 May, 15 Sep–31 Oct".
 */
export function priceSeasonDates(season: Season, short = false): string {
	const ranges = (season === 'low' ? LOW_SEASON : PEAK_SEASON).map(([from, to]) =>
		short ? `${dayMonth(from, true)}–${dayMonth(to, true)}` : `${dayMonth(from)} to ${dayMonth(to)}`,
	);
	return ranges.join(short ? ', ' : ' and ');
}
