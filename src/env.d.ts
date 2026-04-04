/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly STRIPE_SECRET_KEY?: string;
	/** `mock` — always redirect without Stripe. `stripe` — require keys & Price IDs. Omit — mock if no secret, else stripe. */
	readonly CHECKOUT_MODE?: 'mock' | 'stripe';
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
