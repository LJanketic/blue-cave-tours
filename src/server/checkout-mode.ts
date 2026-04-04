/**
 * Resolves how checkout behaves: mock redirect vs Stripe Checkout.
 * Mirrors logic previously inlined in the API route.
 */
export function getCheckoutMode(): 'mock' | 'stripe' {
	const mode = import.meta.env.CHECKOUT_MODE;
	const secret = import.meta.env.STRIPE_SECRET_KEY;
	if (mode === 'mock') return 'mock';
	if (mode === 'stripe') return 'stripe';
	return secret ? 'stripe' : 'mock';
}
