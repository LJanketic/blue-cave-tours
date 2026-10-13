// @ts-check
import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';
import vue from '@astrojs/vue';
import { defineConfig } from 'astro/config';
import { NOINDEX_PATH_PREFIXES } from './src/config/noindex.ts';

const site = process.env.PUBLIC_SITE_URL;

// Canonical URLs, the sitemap integration, and OG tags all depend on `site`.
// Fail loudly on a real production build rather than silently shipping a
// site with none of those — but Netlify also runs `pnpm run build` for
// every deploy preview and branch deploy, and PUBLIC_SITE_URL is normally
// scoped to the production context only in Netlify's env var settings,
// so this must NOT fire there (it did, once — see CONTEXT check below).
// The check runs in an integration hook, which Astro calls with its own
// `command`, so `astro dev`/`astro check` and Vitest (which loads this config
// through getViteConfig) never trip it, however the CLI was launched.
const netlifyContext = process.env.CONTEXT; // 'production' | 'deploy-preview' | 'branch-deploy' | 'dev' | undefined
const isNetlifyNonProductionBuild = Boolean(netlifyContext) && netlifyContext !== 'production';

/** @type {import('astro').AstroIntegration} */
const requireSiteUrlOnBuild = {
	name: 'require-site-url-on-build',
	hooks: {
		'astro:config:setup': ({ command }) => {
			if (command !== 'build' || site || isNetlifyNonProductionBuild) return;
			throw new Error(
				'PUBLIC_SITE_URL is not set. Set it before building for production, ' +
					'e.g. `PUBLIC_SITE_URL=https://hello-blue-cave.netlify.app pnpm run build` ' +
					'(or as a Netlify build environment variable, scoped to at least the ' +
					'Production context) — it drives canonical URLs, the sitemap, and ' +
					'Open Graph tags.',
			);
		},
	},
};

/**
 * Server code reads its settings from `process.env` (that's where Netlify puts
 * them), but `astro dev` only exposes `.env` through `import.meta.env`. In dev
 * only, copy `.env` values into `process.env` so ADMIN_PASSWORD, ADMIN_EMAIL,
 * RESEND_API_KEY etc. work locally. Values already set in the shell win.
 * Builds are untouched: no secrets from a local `.env` reach a deploy.
 * Vitest also loads this config (as "dev"), so tests are skipped explicitly:
 * a test run must never see real keys or addresses.
 *
 * Node never overwrites a variable that's already set, so after editing
 * `.env`, stop the dev server and start it again (Astro's own automatic
 * restart keeps the old values).
 */
/** @type {import('astro').AstroIntegration} */
const loadDotenvInDev = {
	name: 'load-dotenv-in-dev',
	hooks: {
		'astro:config:setup': ({ command }) => {
			if (command !== 'dev' || process.env.VITEST) return;
			try {
				// Node's own .env parser; it never overwrites a variable that's already set.
				process.loadEnvFile('.env');
			} catch {
				// No .env file: nothing to load.
			}
		},
	},
};

// https://astro.build/config — Netlify adapter for SSR + API routes.
export default defineConfig({
	output: 'server',
	// Astro's default, set explicitly: server endpoints and form posts reject
	// requests whose Origin isn't this site (CSRF protection).
	security: { checkOrigin: true },
	// imageCDN defaults to true, which silently routes every astro:assets image
	// through Netlify's metered on-demand Image CDN — even on fully prerendered
	// pages. Disabling it restores Astro's own Sharp-based image service, which
	// optimizes images once at build time (free, uses the direct `sharp`
	// dependency, pinned to the major Astro 6 supports) instead of paying per
	// transformed image forever.
	adapter: netlify({ imageCDN: false }),
	// Every image-bearing page is prerendered, so `sharp` only ever runs during
	// `astro build` — the deployed function never touches it at request time.
	// Left un-externalized, the adapter's dependency tracer walks into sharp's
	// own conditional requires for every platform's native binary and throws
	// on whichever ones aren't installed locally (only one ever is). Marking
	// it external stops the tracer from resolving those files at all; Node
	// resolves the plain `require('sharp')` from node_modules at runtime,
	// which never actually happens since no route renders an image.
	vite: {
		ssr: {
			external: ['sharp'],
		},
	},
	integrations: [
		requireSiteUrlOnBuild,
		loadDotenvInDev,
		vue(),
		...(site
			? [
					sitemap({
						filter: (page) => {
							const pathname = new URL(page).pathname;
							return !NOINDEX_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
						},
					}),
				]
			: []),
	],
	image: {
		layout: 'constrained',
	},
	...(site ? { site } : {}),
});
