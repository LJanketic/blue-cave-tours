import type { APIRoute } from 'astro';
import { SITE_NAME, SITE_THEME_COLOR } from '../config/site';

export const prerender = true;

export const GET: APIRoute = () => {
	const manifest = {
		name: SITE_NAME,
		short_name: SITE_NAME,
		start_url: '/',
		display: 'standalone',
		background_color: '#ffffff',
		theme_color: SITE_THEME_COLOR,
		icons: [
			{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
			{ src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
		],
	};

	return new Response(JSON.stringify(manifest), {
		headers: { 'Content-Type': 'application/manifest+json' },
	});
};
