// @ts-check
import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';
import vue from '@astrojs/vue';
import { defineConfig } from 'astro/config';
import { NOINDEX_PATH_PREFIXES } from './src/config/noindex.ts';

const site = process.env.PUBLIC_SITE_URL;

// Canonical URLs, the sitemap integration, and OG tags all depend on `site`.
// Fail loudly on a production build rather than silently shipping a site
// with none of those — `astro dev`/`astro check` are left alone so local
// work doesn't need the env var set. Checking argv (Astro's own CLI
// subcommand) rather than npm_lifecycle_event, which only gets set when a
// package.json script is invoked by that exact name — argv still says
// "build" under `npx astro build`, `pnpm exec astro build`, etc.
if (process.argv.includes('build') && !site) {
	throw new Error(
		'PUBLIC_SITE_URL is not set. Set it before building for production, ' +
			'e.g. `PUBLIC_SITE_URL=https://hellobluecave.com pnpm run build` ' +
			'(or as a Netlify build environment variable) — it drives canonical ' +
			'URLs, the sitemap, and Open Graph tags.',
	);
}

// https://astro.build/config — Netlify adapter for SSR + API routes.
export default defineConfig({
	output: 'server',
	// imageCDN defaults to true, which silently routes every astro:assets image
	// through Netlify's metered on-demand Image CDN — even on fully prerendered
	// pages. Disabling it restores Astro's own Sharp-based image service, which
	// optimizes images once at build time (free, uses the sharp dependency
	// already installed) instead of paying per transformed image forever.
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
