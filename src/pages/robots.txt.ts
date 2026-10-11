import type { APIRoute } from 'astro';
import { ROBOTS_DISALLOW } from '../config/noindex';
import { absoluteUrl } from '../lib/seo';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
	const lines = [
		'User-agent: *',
		'Allow: /',
		'',
		...ROBOTS_DISALLOW.map((rule) => `Disallow: ${rule}`),
	];

	if (site) {
		lines.push('', `Sitemap: ${absoluteUrl('sitemap-index.xml', site)}`);
	}

	return new Response(lines.join('\n') + '\n', {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
