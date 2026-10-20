import type { TourDetail } from '../types/tour';

/** Guests per departure, enforced both client-side (GroupBookingFlow) and here. */
export const MAX_GUESTS = 14;

/** Group departure (shared boat, per-person price) vs private-only charter. */
export function isGroupTour(tour: Pick<TourDetail, 'types'>): boolean {
	return tour.types.includes('group');
}

/**
 * Instant book (the group booking flow) needs a group departure with a real
 * per-person price. Private-only charters and tours priced "on request" (e.g.
 * hvar-red-rocks-pakleni until its price is confirmed) go to the contact form.
 */
export function supportsInstantBook(tour: Pick<TourDetail, 'types' | 'prices'>): boolean {
	return isGroupTour(tour) && tour.prices !== null;
}

/** Price unit next to "From …", and none when the tour is priced on request. */
export function tourPriceUnit(tour: Pick<TourDetail, 'prices' | 'priceUnit'>): string {
	if (tour.prices === null) return '';
	return tour.priceUnit === 'person' ? '/ person' : '/ boat';
}

export function contactHrefForTour(tour: Pick<TourDetail, 'slug'>): string {
	return `/contact/?tour=${encodeURIComponent(tour.slug)}`;
}

export function groupBookHref(tour: Pick<TourDetail, 'slug'>): string {
	return `/book/${encodeURIComponent(tour.slug)}/group/`;
}

export type GroupBookingDetails = {
	date: string | null;
	slot: string | null;
	adults: number | null;
	children: number;
	infants: number;
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	phone: string | null;
	notes: string | null;
};

export function hasRequiredBookingDetails(details: GroupBookingDetails): boolean {
	const adults = details.adults ?? 0;
	return Boolean(
		details.date &&
			details.firstName &&
			details.lastName &&
			details.email &&
			adults >= 1 &&
			seatCount({ adults, children: details.children, infants: details.infants }) <= MAX_GUESTS,
	);
}

function clip(value: string | null, max = 200): string | null {
	if (!value) return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	return trimmed.slice(0, max);
}

/**
 * A count above MAX_GUESTS is kept (capped at COUNT_MAX), not dropped, so
 * validation refuses it with the guest limit ('guests') instead of reading it
 * as a missing value.
 */
const COUNT_MAX = 999;

function parseCount(value: string | null): number | null {
	if (!value || !/^\d+$/.test(value)) return null;
	return Math.min(Number.parseInt(value, 10), COUNT_MAX);
}

export function parseGroupBookingParams(params: URLSearchParams): GroupBookingDetails {
	const dateRaw = clip(params.get('date'), 10);
	const date = dateRaw && parseIsoDate(dateRaw) ? dateRaw : null;
	const slotRaw = clip(params.get('slot'), 8);
	const slot = slotRaw && /^\d{2}:\d{2}$/.test(slotRaw) ? slotRaw : null;
	const adults = parseCount(params.get('adults'));
	const children = parseCount(params.get('children')) ?? 0;
	const infants = parseCount(params.get('infants')) ?? 0;

	return {
		date,
		slot,
		adults,
		children,
		infants,
		firstName: clip(params.get('firstName'), 80),
		lastName: clip(params.get('lastName'), 80),
		email: clip(params.get('email'), 120),
		phone: clip(params.get('phone'), 40),
		notes: clip(params.get('notes'), 500),
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

/** Short meeting-point label for the booking pages ("Riva stand 14"). */
export function meetingPointShort(meetingPoint: string): string {
	const stand = meetingPoint.match(/stand number (\d+)/i);
	if (stand) return `Riva stand ${stand[1]}`;
	return meetingPoint.replace(/^Meet at /i, '').split('.')[0]?.trim() || meetingPoint;
}

/** "2 adults, 1 child, 1 infant" */
export function guestSummaryFromCounts(adults: number, children: number, infants = 0): string {
	const parts = [`${adults} adult${adults !== 1 ? 's' : ''}`];
	if (children > 0) parts.push(`${children} child${children !== 1 ? 'ren' : ''}`);
	if (infants > 0) parts.push(`${infants} infant${infants !== 1 ? 's' : ''}`);
	return parts.join(', ');
}

/** Seats a booking takes: infants are free but sit on the boat too (D-9). */
export function seatCount(guests: { adults: number; children: number; infants?: number }): number {
	return guests.adults + guests.children + (guests.infants ?? 0);
}
