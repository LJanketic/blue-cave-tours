import type { APIRoute } from 'astro';
import { NOINDEX_PATH_PREFIXES } from '../config/noindex';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
	const lines = [
		'User-agent: *',
		'Allow: /',
		'',
		...NOINDEX_PATH_PREFIXES.map((prefix) => `Disallow: ${prefix}`),
	];

	if (site) {
		lines.push('', `Sitemap: ${new URL('sitemap-index.xml', site).toString()}`);
	}

	return new Response(lines.join('\n') + '\n', {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
