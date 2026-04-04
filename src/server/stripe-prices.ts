/**
 * Stripe Price IDs: set `STRIPE_PRICE_<SLUG_UPPER_SNAKE>` in `.env`
 * e.g. tour slug `blue-cave-hvar-5-islands` → `STRIPE_PRICE_BLUE_CAVE_HVAR_5_ISLANDS`
 */
export function priceEnvKeyForSlug(slug: string): string {
	return `STRIPE_PRICE_${slug.replace(/-/g, '_').toUpperCase()}`;
}

export function getStripePriceIdForTour(tourId: string): string | undefined {
	const key = priceEnvKeyForSlug(tourId);
	const env = import.meta.env as Record<string, string | undefined>;
	return env[key];
}
