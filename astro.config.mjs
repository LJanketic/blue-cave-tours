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
	adapter: netlify(),
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
