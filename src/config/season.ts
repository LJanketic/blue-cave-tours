/**
 * The sailing season (D-15): tours run daily between these dates, inclusive.
 * MM-DD, so the same rule holds every year. Calendar days outside it are disabled.
 * Since Oct 2026 the operator runs all year round.
 */
export const SEASON_START = '01-01';
export const SEASON_END = '12-31';

/**
 * Low season (operator, Oct 2026): low prices apply to tour dates inside these
 * MM-DD ranges, inclusive. Every other day of the year is peak season. The
 * single source of truth for seasonal pricing; the price is chosen by the tour
 * date, not the day of purchase.
 */
export const LOW_SEASON: [string, string][] = [
	['04-01', '05-15'],
	['10-01', '11-01'],
];

export type Season = 'low' | 'peak';

/** An amount (e.g. an adult price) in each price season. Record<Season, number>, spelt as a mapped type because Vue can't resolve Record in defineProps. */
export type SeasonAmount = { [S in Season]: number };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const ALL_YEAR = SEASON_START === '01-01' && SEASON_END === '12-31';

/** True when an ISO date (YYYY-MM-DD) falls inside the season. */
export function isInSeason(isoDate: string): boolean {
	const monthDay = isoDate.slice(5, 10);
	return monthDay >= SEASON_START && monthDay <= SEASON_END;
}

/** The price season of an ISO date (YYYY-MM-DD): low inside a LOW_SEASON range, peak otherwise. */
export function seasonFor(isoDate: string): Season {
	const monthDay = isoDate.slice(5, 10);
	return LOW_SEASON.some(([from, to]) => monthDay >= from && monthDay <= to) ? 'low' : 'peak';
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

/** "1 April to 30 November", or "all year round". */
export function seasonLabel(): string {
	return ALL_YEAR ? 'all year round' : `${dayMonth(SEASON_START)} to ${dayMonth(SEASON_END)}`;
}

/**
 * The date ranges of a price season. Peak is the gaps between the low ranges,
 * one of them running over the new year (2 November to 31 March).
 */
function seasonRanges(season: Season): [string, string][] {
	const low = [...LOW_SEASON].sort(([a], [b]) => a.localeCompare(b));
	if (season === 'low') return low;
	const peak: [string, string][] = [];
	for (let i = 0; i < low.length; i++) {
		const from = shiftMonthDay(low[i][1], 1);
		const to = shiftMonthDay(low[(i + 1) % low.length][0], -1);
		peak.push([from, to]);
	}
	// Start with the range that begins earliest in the calendar year.
	return peak.sort(([a], [b]) => a.localeCompare(b));
}

/**
 * The price season's dates: "1 April to 15 May and 1 October to 1 November";
 * with `short`, "1 Apr–15 May, 1 Oct–1 Nov".
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
	return `try{var p={};new Intl.DateTimeFormat('en-US',{timeZone:${JSON.stringify(timeZone)},year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).forEach(function(x){p[x.type]=x.value});var d=p.month+'-'+p.day;if(/^\\d{4}$/.test(p.year)&&/^\\d\\d-\\d\\d$/.test(d))document.documentElement.setAttribute('data-season',${JSON.stringify(LOW_SEASON)}.some(function(r){return d>=r[0]&&d<=r[1]})?'low':'peak')}catch(e){}`;
}
