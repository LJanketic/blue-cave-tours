import type { SeasonalPrices } from '../types/tour';

/*
 * Per-person tour prices in euros (operator price table, ClickUp 31 Oct 2026); infants travel free. Which
 * season applies is decided by the tour date (src/config/season.ts). A light
 * module with no catalog import, so the FAQ island can list prices without
 * pulling the catalog into the browser.
 */

/** Child price up to this age, inclusive; adults are older (D-9: child 4–11, adult 12+, operator price table, ClickUp 31 Oct 2026). */
export const CHILD_MAX_AGE = 11;
/** Infants up to this age, inclusive, travel free but take a seat (D-9: infant 0–3, operator price table, ClickUp 31 Oct 2026). */
export const INFANT_MAX_AGE = 3;

export const PRICE_BLUE_CAVE: SeasonalPrices = { low: { adult: 149, child: 129 }, peak: { adult: 159, child: 139 } };
export const PRICE_GOLDEN_HORN: SeasonalPrices = { low: { adult: 129, child: 89 }, peak: { adult: 139, child: 99 } };
export const PRICE_BLUE_LAGOON: SeasonalPrices = { low: { adult: 70, child: 60 }, peak: { adult: 75, child: 65 } };

/**
 * Every bookable price, as the FAQ lists it. src/data/prices.test.ts checks
 * that it names exactly the prices the instant-book tours use.
 */
export const PRICE_LIST: { label: string; prices: SeasonalPrices }[] = [
	{ label: 'Blue Cave, Hvar & 5 islands', prices: PRICE_BLUE_CAVE },
	{ label: 'Golden Horn, Brač and Hvar', prices: PRICE_GOLDEN_HORN },
	{ label: 'Blue Lagoon (morning or afternoon)', prices: PRICE_BLUE_LAGOON },
];
