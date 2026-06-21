import { t } from '../i18n';
import { tours } from '../data/tour-catalog';
import { SITE_CURRENCY } from '../config/site';

export const PRIVATE_TOUR_SLUG = 'create-perfect-day-private';

/** Child fare as a fraction of adult until G2 rules land. */
export const CHILD_RATE = 0.875;

export type PartyCounts = {
	adults: number;
	children: number;
	infants: number;
};

export type QuoteLineItem = {
	kind: 'adult' | 'child' | 'infant';
	label: string;
	quantity: number;
	unitPrice: number;
	lineTotal: number;
};

export type QuoteResult = {
	tourSlug: string;
	currency: string;
	requiresContact: boolean;
	adultUnitPrice: number;
	childUnitPrice: number;
	infantUnitPrice: number;
	lineItems: QuoteLineItem[];
	subtotal: number;
	total: number;
	placeholder: boolean;
};

export type QuoteError = { error: string };

/** Shared party validation for quotes and checkout APIs. */
export function validatePartyCounts(party: PartyCounts, locale?: string): QuoteError | null {
	const loc = locale ?? 'hr';
	const adults = Math.max(0, Math.floor(party.adults));
	const children = Math.max(0, Math.floor(party.children));
	const infants = Math.max(0, Math.floor(party.infants));

	if (adults + children + infants < 1) {
		return { error: t('pricing.errorMinGuest', loc) };
	}
	if (adults + children < 1) {
		return { error: t('pricing.errorPayingGuest', loc) };
	}
	if (infants > 0 && adults < 1) {
		return { error: t('pricing.errorInfantAdult', loc) };
	}
	return null;
}

/** Parse "€159" or "From €89" style catalog strings. */
export function parseFromPrice(fromPrice: string): number | null {
	const match = fromPrice.match(/€\s*(\d+)/);
	return match ? Number.parseInt(match[1], 10) : null;
}

/**
 * Placeholder pricing until G2 rules land.
 * Uses catalog fromPrice as per-adult; children ~87.5% of adult; infants free.
 */
export function computeQuote(
	tourSlug: string,
	party: PartyCounts,
	locale?: string,
): QuoteResult | QuoteError {
	const loc = locale ?? 'hr';
	const partyError = validatePartyCounts(party, loc);
	if (partyError) return partyError;

	const adults = Math.max(0, Math.floor(party.adults));
	const children = Math.max(0, Math.floor(party.children));
	const infants = Math.max(0, Math.floor(party.infants));

	if (tourSlug === PRIVATE_TOUR_SLUG) {
		return {
			tourSlug,
			currency: SITE_CURRENCY,
			requiresContact: true,
			adultUnitPrice: 0,
			childUnitPrice: 0,
			infantUnitPrice: 0,
			lineItems: [],
			subtotal: 0,
			total: 0,
			placeholder: true,
		};
	}

	const tour = tours.find((t) => t.slug === tourSlug);
	if (!tour) {
		return { error: t('pricing.errorUnknownTour', loc) };
	}

	const adultUnit = parseFromPrice(tour.fromPrice);
	if (adultUnit == null) {
		return { error: t('pricing.errorNotAvailable', loc) };
	}

	const childUnit = Math.round(adultUnit * CHILD_RATE);
	const infantUnit = 0;

	const lineItems: QuoteLineItem[] = [];
	if (adults > 0) {
		lineItems.push({
			kind: 'adult',
			label: t('booking.adults', loc),
			quantity: adults,
			unitPrice: adultUnit,
			lineTotal: adults * adultUnit,
		});
	}
	if (children > 0) {
		lineItems.push({
			kind: 'child',
			label: t('booking.children', loc),
			quantity: children,
			unitPrice: childUnit,
			lineTotal: children * childUnit,
		});
	}
	if (infants > 0) {
		lineItems.push({
			kind: 'infant',
			label: t('booking.infants', loc),
			quantity: infants,
			unitPrice: infantUnit,
			lineTotal: 0,
		});
	}

	const subtotal = lineItems.reduce((sum, li) => sum + li.lineTotal, 0);

	return {
		tourSlug,
		currency: SITE_CURRENCY,
		requiresContact: false,
		adultUnitPrice: adultUnit,
		childUnitPrice: childUnit,
		infantUnitPrice: infantUnit,
		lineItems,
		subtotal,
		total: subtotal,
		placeholder: true,
	};
}

export function formatMoney(amount: number, currency = SITE_CURRENCY): string {
	return new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format(amount);
}
