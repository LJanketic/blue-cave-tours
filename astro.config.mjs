// @ts-check
import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';
import vue from '@astrojs/vue';
import { defineConfig } from 'astro/config';

const site = process.env.PUBLIC_SITE_URL;

const NOINDEX_PATH_PREFIXES = ['/book/', '/booking/success', '/booking/error', '/api/'];

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
