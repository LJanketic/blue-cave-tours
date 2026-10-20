/**
 * The sailing season (D-15): tours run daily between these dates, inclusive.
 * MM-DD, so the same rule holds every year. Calendar days outside it are disabled.
 */
export const SEASON_START = '04-01';
export const SEASON_END = '11-30';

/**
 * Peak season (operator, Oct 2026): peak prices apply to tour dates from
 * PEAK_START to PEAK_END, inclusive. Every other sailing day is low season.
 * The single source of truth for seasonal pricing; the price is chosen by the
 * tour date, not the day of purchase.
 */
export const PEAK_START = '06-15';
export const PEAK_END = '09-30';

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
 * The price season of an ISO date (YYYY-MM-DD). Dates outside the sailing
 * season (December to March) count as low: nothing sails then, and the next
 * bookable days (April) are low season, so that's the price to show.
 * Whether a date can be booked at all is isInSeason's job.
 */
export function seasonFor(isoDate: string): Season {
	const monthDay = isoDate.slice(5, 10);
	return monthDay >= PEAK_START && monthDay <= PEAK_END ? 'peak' : 'low';
}

/** MM-DD moved by whole days (in a non-leap year; the season rules never touch 29 Feb). */
function shiftMonthDay(monthDay: string, days: number): string {
	const [month, day] = monthDay.split('-').map(Number);
	return new Date(Date.UTC(2001, month - 1, day + days)).toISOString().slice(5, 10);
}

function dayMonth(monthDay: string, short = false): string {
	const [month, day] = monthDay.split('-').map(Number);
	const name = MONTHS[month - 1];
	return `${day} ${short ? name.slice(0, 3) : name}`;
}

/** "1 April to 30 November" */
export function seasonLabel(): string {
	return `${dayMonth(SEASON_START)} to ${dayMonth(SEASON_END)}`;
}

/** The date ranges of a price season: peak is one, low the two either side of it. */
function seasonRanges(season: Season): [string, string][] {
	if (season === 'peak') return [[PEAK_START, PEAK_END]];
	return [
		[SEASON_START, shiftMonthDay(PEAK_START, -1)],
		[shiftMonthDay(PEAK_END, 1), SEASON_END],
	];
}

/**
 * The price season's dates: "15 June to 30 September", "1 April to 14 June
 * and 1 October to 30 November"; with `short`, "1 Apr–14 Jun, 1 Oct–30 Nov".
 */
export function priceSeasonDates(season: Season, short = false): string {
	const ranges = seasonRanges(season).map(([from, to]) =>
		short ? `${dayMonth(from, true)}–${dayMonth(to, true)}` : `${dayMonth(from)} to ${dayMonth(to)}`,
	);
	return ranges.join(short ? ', ' : ' and ');
}

/**
 * The inline <head> script (BaseLayout) that sets <html data-season> to the
 * season of the visitor's day in `timeZone`, before the first paint, so
 * prerendered SeasonPrice amounts follow the season without a rebuild. Same
 * rule as seasonFor. If Intl fails, the build season set in the HTML stays.
 */
export function seasonHeadScript(timeZone: string): string {
	return `try{var p={};new Intl.DateTimeFormat('en-US',{timeZone:${JSON.stringify(timeZone)},year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).forEach(function(x){p[x.type]=x.value});var d=p.month+'-'+p.day;if(/^\\d{4}$/.test(p.year)&&/^\\d\\d-\\d\\d$/.test(d))document.documentElement.setAttribute('data-season',d>='${PEAK_START}'&&d<='${PEAK_END}'?'peak':'low')}catch(e){}`;
}
