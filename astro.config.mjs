// @ts-check
import netlify from '@astrojs/netlify';
import { defineConfig } from 'astro/config';

// https://astro.build/config — Netlify adapter for SSR + API routes on Netlify (not @astrojs/node).
export default defineConfig({
	output: 'server',
	adapter: netlify(),
});
