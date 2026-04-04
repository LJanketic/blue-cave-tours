import { tours } from '../data/tour-catalog';
import type { TourDetail } from '../types/tour';

const FEATURED_HOME_COUNT = 5;

export function getAllTours(): TourDetail[] {
	return tours;
}

export function getTourBySlug(slug: string): TourDetail | undefined {
	return tours.find((t) => t.slug === slug);
}

/** Homepage: up to five tours — starred first, then remaining catalog order. */
export function getFeaturedTours(): TourDetail[] {
	const starred = tours.filter((t) => t.featured);
	const seen = new Set<string>();
	const out: TourDetail[] = [];

	for (const t of starred) {
		if (out.length >= FEATURED_HOME_COUNT) break;
		out.push(t);
		seen.add(t.slug);
	}
	for (const t of tours) {
		if (out.length >= FEATURED_HOME_COUNT) break;
		if (!seen.has(t.slug)) {
			out.push(t);
			seen.add(t.slug);
		}
	}
	return out.slice(0, FEATURED_HOME_COUNT);
}
