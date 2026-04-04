/**
 * Map tour IDs to Stripe Price IDs (create Prices in Stripe Dashboard → copy price_…).
 * Set matching env vars in `.env` for each tour you sell.
 */
export function getStripePriceIdForTour(tourId: string): string | undefined {
	const env = import.meta.env;
	const map: Record<string, string | undefined> = {
		'blue-cave-adventure': env.STRIPE_PRICE_BLUE_CAVE_ADVENTURE,
		'private-split-coast': env.STRIPE_PRICE_PRIVATE_SPLIT_COAST,
		'split-island-hopping': env.STRIPE_PRICE_SPLIT_ISLAND_HOPPING,
	};
	return map[tourId];
}
