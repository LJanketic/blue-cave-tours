// @ts-check
import netlify from '@astrojs/netlify';
import { defineConfig } from 'astro/config';

const site = process.env.PUBLIC_SITE_URL;

// https://astro.build/config — Netlify adapter for SSR + API routes.
export default defineConfig({
	output: 'server',
	adapter: netlify(),
	...(site ? { site } : {}),
});
