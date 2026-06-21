// @ts-check
import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
const site = process.env.PUBLIC_SITE_URL ?? 'https://bluecavetours.com';

// https://astro.build/config
export default defineConfig({
	output: 'server',
	adapter: netlify(),
	site,
	integrations: [
		sitemap({
			i18n: {
				defaultLocale: 'hr',
				locales: {
					hr: 'hr-HR',
					en: 'en-US',
					de: 'de-DE',
					es: 'es-ES',
					it: 'it-IT',
				},
			},
		}),
	],
	i18n: {
		locales: ['hr', 'en', 'de', 'es', 'it'],
		defaultLocale: 'hr',
		routing: {
			prefixDefaultLocale: false,
		},
	},
});
