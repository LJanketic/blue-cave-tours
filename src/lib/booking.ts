import type { TourDetail } from '../types/tour';

// hvar-red-rocks-pakleni has no confirmed price tier yet ('Price on request'),
// so it's quote-only like the two private charters, not an instant-book tour.
const QUOTE_ONLY_SLUGS = new Set([
	'create-perfect-day-private',
	'dubrovnik-one-way',
	'hvar-red-rocks-pakleni',
]);

/** Guests per departure, enforced both client-side (GroupBookingFlow) and here. */
export const MAX_GUESTS = 12;

/** Tours with instant book (preview confirmation flow). Private charters use contact instead. */
export function supportsInstantBook(tour: Pick<TourDetail, 'slug'>): boolean {
	return !QUOTE_ONLY_SLUGS.has(tour.slug);
}

export function contactHrefForTour(tour: Pick<TourDetail, 'slug'>): string {
	return `/contact?tour=${encodeURIComponent(tour.slug)}`;
}

export function groupBookHref(tour: Pick<TourDetail, 'slug'>): string {
	return `/book/${encodeURIComponent(tour.slug)}/group`;
}

export type GroupBookingDetails = {
	date: string | null;
	slot: string | null;
	adults: number | null;
	children: number;
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	phone: string | null;
	notes: string | null;
	total: string | null;
	guests: string | null;
};

export function bookingSuccessPath(params: Record<string, string>): string {
	const query = bookingQuery(params);
	return query ? `/booking/success?${query}` : '/booking/success';
}

export function bookingReviewPath(slug: string, params: Record<string, string>): string {
	const query = bookingQuery(params);
	const path = `/book/${encodeURIComponent(slug)}/review`;
	return query ? `${path}?${query}` : path;
}

function bookingQuery(params: Record<string, string>): string {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		const trimmed = value.trim();
		if (trimmed) search.set(key, trimmed);
	}
	return search.toString();
}

export function hasRequiredBookingDetails(details: GroupBookingDetails): boolean {
	const adults = details.adults ?? 0;
	return Boolean(
		details.date &&
			details.firstName &&
			details.lastName &&
			details.email &&
			adults >= 1 &&
			adults + details.children <= MAX_GUESTS,
	);
}

function clip(value: string | null, max = 200): string | null {
	if (!value) return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	return trimmed.slice(0, max);
}

function parseCount(value: string | null, max: number): number | null {
	if (!value || !/^\d+$/.test(value)) return null;
	const n = Number.parseInt(value, 10);
	if (n < 0 || n > max) return null;
	return n;
}

export function parseGroupBookingParams(params: URLSearchParams): GroupBookingDetails {
	const dateRaw = clip(params.get('date'), 10);
	const date = dateRaw && parseIsoDate(dateRaw) ? dateRaw : null;
	const slotRaw = clip(params.get('slot'), 8);
	const slot = slotRaw && /^\d{2}:\d{2}$/.test(slotRaw) ? slotRaw : null;
	const adults = parseCount(params.get('adults'), MAX_GUESTS);
	const children = parseCount(params.get('children'), MAX_GUESTS) ?? 0;

	return {
		date,
		slot,
		adults,
		children,
		firstName: clip(params.get('firstName'), 80),
		lastName: clip(params.get('lastName'), 80),
		email: clip(params.get('email'), 120),
		phone: clip(params.get('phone'), 40),
		notes: clip(params.get('notes'), 500),
		total: clip(params.get('total'), 40),
		guests: clip(params.get('guests'), 80),
	};
}

/** Local calendar date as YYYY-MM-DD (toISOString would use UTC and can shift the day). */
export function toIsoDate(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

/** YYYY-MM-DD → local midnight, or null when malformed or not a real day (e.g. 2026-02-31). */
export function parseIsoDate(iso: string): Date | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
	if (!match) return null;
	const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
	return toIsoDate(date) === iso ? date : null;
}

/** Local midnight of the given moment, for day-level comparisons. */
export function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatBookingDate(iso: string): string {
	const date = parseIsoDate(iso);
	if (!date) return iso;
	return date.toLocaleDateString('en-GB', {
		weekday: 'long',
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
}

export function guestSummaryFromCounts(adults: number, children: number): string {
	const parts = [`${adults} adult${adults !== 1 ? 's' : ''}`];
	if (children > 0) {
		parts.push(`${children} child${children !== 1 ? 'ren' : ''}`);
	}
	return parts.join(', ');
}

export function bookingRefFromDetails(tourId: string, details: GroupBookingDetails): string | null {
	const seed = [tourId, details.date, details.email, details.slot].filter(Boolean).join('|');
	if (!seed) return null;
	let hash = 0;
	for (const char of seed) {
		hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	}
	return `HBC-${(hash % 100000).toString().padStart(5, '0')}`;
}
