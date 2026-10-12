/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly PUBLIC_SITE_URL?: string;
	readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
	/** Netlify deploy context (production, deploy-preview, branch-deploy), inlined at build time. */
	readonly CONTEXT?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
