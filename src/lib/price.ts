/**
 * Shared price parsing for tour `fromPrice`/`priceNotes` display strings.
 * Previously duplicated (with drift risk) across GroupBookingFlow.vue,
 * book/[slug]/review.astro, lib/seo.ts, and lib/tour-filters.ts.
 */

/** Parses the peak-season adult price from a `fromPrice` string (e.g. '€169' -> 169). Null for quote-only tours ('On request', 'Price on request'). */
export function parseAdultPrice(fromPrice: string): number | null {
	const match = fromPrice.match(/€(\d+)/);
	return match ? Number.parseInt(match[1], 10) : null;
}

/**
 * Parses the peak-season child price from a tour's `priceNotes` copy, which reads
 * "€X per adult, €Y per child" for low season, then peak season — the price
 * precedes the word "child", and the LAST match is taken so this stays
 * consistent with `parseAdultPrice`, which is always the peak-season figure.
 */
export function parseChildPrice(priceNotes: string): number | null {
	const matches = [...priceNotes.matchAll(/€(\d+)[^€]*?child/gi)];
	return matches.length ? Number.parseInt(matches[matches.length - 1][1], 10) : null;
}

/** Total for a booking, computed from a tour's own price fields. Null when the tour has no numeric adult price (quote-only). */
export function computeBookingTotal(
	fromPrice: string,
	priceNotes: string,
	adults: number,
	children: number,
): number | null {
	const adultPrice = parseAdultPrice(fromPrice);
	if (adultPrice === null) return null;
	const childPrice = parseChildPrice(priceNotes);
	return adultPrice * adults + (childPrice !== null ? childPrice * children : 0);
}
