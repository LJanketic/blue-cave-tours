/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly PUBLIC_SITE_URL?: string;
	readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
	/** Netlify deploy context (production, deploy-preview, branch-deploy), inlined at build time. */
	readonly CONTEXT?: string;
	/** `live` switches real payments on; anything else is the demo (src/config/payments.ts). Inlined at build time. */
	readonly PAYMENTS_MODE?: string;
	/** `open` lets everyone use the demo checkout on this build, never on production (src/config/payments.ts). Inlined at build time. */
	readonly DEMO_CHECKOUT?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
