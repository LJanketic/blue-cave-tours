import type { TourCardDTO } from './cards';
import type { Season } from '../config/season';

/*
 * Tours overview filtering and sorting (spec §6.2.1), on the slim card DTO
 * the catalog island receives. No catalog import: this runs in the browser.
 */

/** Multi-select chips, OR logic across the set. */
export type TourFilter = 'group' | 'private' | 'short' | 'sunset';
export type TourSort = 'recommended' | 'price-asc' | 'price-desc' | 'duration';

type Filterable = Pick<TourCardDTO, 'types' | 'tags' | 'durationHours'>;

/** Half day: tagged so, or 6 hours or less (the board's "Under 4h" matched no tour). */
export function isShortTour(tour: Filterable): boolean {
	return tour.tags.includes('half-day') || tour.durationHours <= 6;
}

export function matchesFilter(tour: Filterable, filter: TourFilter): boolean {
	switch (filter) {
		case 'group':
			return tour.types.includes('group');
		case 'private':
			return tour.types.includes('private');
		case 'short':
			return isShortTour(tour);
		case 'sunset':
			return tour.tags.includes('sunset');
	}
}

/** A tour passes when no chip is on, or it matches any chip that is. */
export function matchesAnyFilter(tour: Filterable, filters: Iterable<TourFilter>): boolean {
	const active = [...filters];
	return active.length === 0 || active.some((filter) => matchesFilter(tour, filter));
}

/** By the price shown for `season`; quote-only tours ("On request") sort after priced ones either way. */
function comparePrice(a: TourCardDTO, b: TourCardDTO, direction: 1 | -1, season: Season): number {
	const pa = a.fromPrice?.[season];
	const pb = b.fromPrice?.[season];
	if (pa === undefined && pb === undefined) return 0;
	if (pa === undefined) return 1;
	if (pb === undefined) return -1;
	return (pa - pb) * direction;
}

/**
 * Recommended = featured first, then catalog order ([CHANGE, UCPD] not "Most
 * popular": that would claim sales data). Array.sort is stable.
 */
export function sortTours(tours: TourCardDTO[], sort: TourSort, season: Season = 'low'): TourCardDTO[] {
	const copy = [...tours];
	switch (sort) {
		case 'price-asc':
			return copy.sort((a, b) => comparePrice(a, b, 1, season));
		case 'price-desc':
			return copy.sort((a, b) => comparePrice(a, b, -1, season));
		case 'duration':
			return copy.sort((a, b) => a.durationHours - b.durationHours);
		default:
			return copy.sort((a, b) => Number(b.featured === true) - Number(a.featured === true));
	}
}

export function searchTours(tours: TourCardDTO[], query: string): TourCardDTO[] {
	const q = query.trim().toLowerCase();
	return q ? tours.filter((tour) => tour.title.toLowerCase().includes(q) || tour.searchText.includes(q)) : tours;
}

export type CatalogQuery = { filters: TourFilter[]; sort: TourSort; destination: string; q: string };

const FILTER_ALIASES: Record<string, TourFilter> = { group: 'group', private: 'private', short: 'short', 'half-day': 'short', sunset: 'sunset' };
const SORTS: TourSort[] = ['recommended', 'price-asc', 'price-desc', 'duration'];

/** Reads ?type=, ?destination=, ?q= (and the older ?filter=, ?search=, ?sort=). */
export function parseCatalogQuery(search: string): CatalogQuery {
	const params = new URLSearchParams(search);
	const types = params.getAll('type').concat(params.getAll('filter'));
	const filters = [...new Set(types.map((t) => FILTER_ALIASES[t]).filter((f): f is TourFilter => Boolean(f)))];
	const sort = SORTS.find((s) => s === params.get('sort')) ?? 'recommended';
	return { filters, sort, destination: params.get('destination') ?? '', q: params.get('q') ?? params.get('search') ?? '' };
}

/** Writes the query back so the URL can be shared; empty parts are left out. */
export function catalogQueryString(query: CatalogQuery): string {
	const params = new URLSearchParams();
	for (const filter of query.filters) params.append('type', filter);
	if (query.destination) params.set('destination', query.destination);
	if (query.q.trim()) params.set('q', query.q.trim());
	if (query.sort !== 'recommended') params.set('sort', query.sort);
	const text = params.toString();
	return text ? `?${text}` : '';
}

/** `season`: the price season the cards show today, for the price sorts. */
export function filterCatalog(tours: TourCardDTO[], query: CatalogQuery, season: Season = 'low'): TourCardDTO[] {
	let list = tours.filter((tour) => matchesAnyFilter(tour, query.filters));
	if (query.destination) list = list.filter((tour) => tour.destinationSlugs.includes(query.destination));
	return sortTours(searchTours(list, query.q), query.sort, season);
}
