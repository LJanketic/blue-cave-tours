import type { TourDetail } from '../types/tour';

const QUOTE_ONLY_SLUGS = new Set(['create-perfect-day-private']);

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
	return Boolean(details.date && details.firstName && details.lastName && details.email);
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
	const date = dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : null;
	const slotRaw = clip(params.get('slot'), 8);
	const slot = slotRaw && /^\d{2}:\d{2}$/.test(slotRaw) ? slotRaw : null;
	const adults = parseCount(params.get('adults'), 12);
	const children = parseCount(params.get('children'), 12) ?? 0;

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

export function formatBookingDate(iso: string): string {
	const [year, month, day] = iso.split('-').map(Number);
	if (!year || !month || !day) return iso;
	return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
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
