export type CheckoutMode = 'mock' | 'stripe' | 'off';

/**
 * Resolves checkout behavior:
 * - `mock` — demo redirect (dev default, or CHECKOUT_MODE=mock)
 * - `stripe` — Stripe Checkout (requires STRIPE_SECRET_KEY + price IDs)
 * - `off` — no online checkout (production default without Stripe)
 */
export function getCheckoutMode(): CheckoutMode {
	const mode = import.meta.env.CHECKOUT_MODE;
	const secret = import.meta.env.STRIPE_SECRET_KEY;

	if (mode === 'mock') return 'mock';
	if (mode === 'stripe') return secret ? 'stripe' : 'off';
	if (secret) return 'stripe';
	if (import.meta.env.PROD) return 'off';
	return 'mock';
}

export function isCheckoutLive(): boolean {
	return getCheckoutMode() === 'stripe';
}
