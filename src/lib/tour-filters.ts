import type { TourCardDTO } from './cards';

/*
 * Tours overview filtering and sorting (spec §6.2.1), on the slim card DTO
 * the catalog island receives. No catalog import: this runs in the browser.
 */

/** Multi-select chips, AND logic across the set (a tour must match every chip). */
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

/** A tour passes when no chip is on, or it matches every chip that is. */
export function matchesAllFilters(tour: Filterable, filters: Iterable<TourFilter>): boolean {
	const active = [...filters];
	return active.length === 0 || active.every((filter) => matchesFilter(tour, filter));
}

/** By the "From" price (low-season adult); quote-only tours ("On request") sort after priced ones either way. */
function comparePrice(a: TourCardDTO, b: TourCardDTO, direction: 1 | -1): number {
	const pa = a.fromPrice;
	const pb = b.fromPrice;
	if (pa === undefined && pb === undefined) return 0;
	if (pa === undefined) return 1;
	if (pb === undefined) return -1;
	return (pa - pb) * direction;
}

/**
 * Recommended = featured first, then catalog order ([CHANGE, UCPD] not "Most
 * popular": that would claim sales data). Array.sort is stable.
 */
export function sortTours(tours: TourCardDTO[], sort: TourSort): TourCardDTO[] {
	const copy = [...tours];
	switch (sort) {
		case 'price-asc':
			return copy.sort((a, b) => comparePrice(a, b, 1));
		case 'price-desc':
			return copy.sort((a, b) => comparePrice(a, b, -1));
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

/**
 * The destination dropdown (handoff T3), in display order. `id` is the value
 * kept in the state and the URL; a tour matches when it visits any of
 * `slugs` (src/data/destinations.ts). Ids are destination slugs, so the
 * links destination pages already make (?destination=<slug>) keep working.
 */
export type TourDestinationOption = { id: string; label: string; slugs: string[] };

export const TOUR_DESTINATION_OPTIONS: TourDestinationOption[] = [
	{ id: 'hvar', label: 'Hvar', slugs: ['hvar'] },
	{ id: 'pakleni', label: 'Pakleni islands', slugs: ['pakleni'] },
	{ id: 'blue-cave', label: 'Blue Cave & Vis', slugs: ['blue-cave', 'vis'] },
	{ id: 'zlatni-rat', label: 'Brač', slugs: ['zlatni-rat'] },
	{ id: 'blue-lagoon', label: 'Blue Lagoon (Drvenik)', slugs: ['blue-lagoon'] },
	{ id: 'trogir', label: 'Trogir', slugs: ['trogir'] },
	{ id: 'korcula', label: 'Korčula', slugs: ['korcula'] },
	{ id: 'dubrovnik', label: 'Dubrovnik', slugs: ['dubrovnik'] },
];

/** The option for an id or any slug it groups (?destination=vis → Blue Cave & Vis); '' when none. */
export function destinationOptionId(value: string): string {
	const option =
		TOUR_DESTINATION_OPTIONS.find((o) => o.id === value) ?? TOUR_DESTINATION_OPTIONS.find((o) => o.slugs.includes(value));
	return option?.id ?? '';
}

function matchesDestination(tour: Pick<TourCardDTO, 'destinationSlugs'>, id: string): boolean {
	const slugs = TOUR_DESTINATION_OPTIONS.find((o) => o.id === id)?.slugs ?? [id];
	return tour.destinationSlugs.some((slug) => slugs.includes(slug));
}

export type CatalogQuery = { filters: TourFilter[]; sort: TourSort; destination: string; q: string };

const FILTER_ALIASES: Record<string, TourFilter> = { group: 'group', private: 'private', short: 'short', 'half-day': 'short', sunset: 'sunset' };
const SORTS: TourSort[] = ['recommended', 'price-asc', 'price-desc', 'duration'];

/**
 * Reads ?type=, ?destination=, ?q= (and the older ?filter=, ?search=, ?sort=).
 * A destination becomes its dropdown option; an unknown one is dropped, so
 * the select never shows a value it has no option for.
 */
export function parseCatalogQuery(search: string): CatalogQuery {
	const params = new URLSearchParams(search);
	const types = params.getAll('type').concat(params.getAll('filter'));
	const filters = [...new Set(types.map((t) => FILTER_ALIASES[t]).filter((f): f is TourFilter => Boolean(f)))];
	const sort = SORTS.find((s) => s === params.get('sort')) ?? 'recommended';
	return { filters, sort, destination: destinationOptionId(params.get('destination') ?? ''), q: params.get('q') ?? params.get('search') ?? '' };
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

export function filterCatalog(tours: TourCardDTO[], query: CatalogQuery): TourCardDTO[] {
	let list = tours.filter((tour) => matchesAllFilters(tour, query.filters));
	if (query.destination) list = list.filter((tour) => matchesDestination(tour, query.destination));
	return sortTours(searchTours(list, query.q), query.sort);
}
