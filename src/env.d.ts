/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly PUBLIC_SITE_URL?: string;
	readonly STRIPE_SECRET_KEY?: string;
	/** `mock` — demo redirect. `stripe` — live checkout (requires keys). Omit — mock in dev, off in prod without Stripe. */
	readonly CHECKOUT_MODE?: 'mock' | 'stripe';
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
