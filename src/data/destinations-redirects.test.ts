import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { destinations, REMOVED_DESTINATION_SLUGS } from './destinations';

const liveSlugs = new Set(destinations.map((d) => d.slug));

// Mirrors the tour checks in catalog.test.ts: a rule for a live page never
// fires (Netlify serves the page), and a retired page without one is a 404.
describe('public/_redirects: destinations', () => {
	const rules = readFileSync(new URL('../../public/_redirects', import.meta.url), 'utf8')
		.split('\n')
		.filter((line) => line.trim() && !line.trim().startsWith('#'))
		.map((line) => line.trim().split(/\s+/))
		.filter(([from]) => from.startsWith('/destinations/'));

	it('never redirects a live destination', () => {
		for (const [from] of rules) {
			const slug = from.match(/^\/destinations\/([^/]+)\/?$/)?.[1];
			if (slug) expect(liveSlugs.has(slug), from).toBe(false);
		}
	});

	it('redirects every retired destination slug to the overview', () => {
		const targets = new Map(rules.map(([from, to]) => [from.replace(/^\/destinations\/|\/$/g, ''), to]));
		for (const slug of REMOVED_DESTINATION_SLUGS) {
			expect(liveSlugs.has(slug), `${slug} is live again`).toBe(false);
			expect(targets.get(slug), slug).toBe('/destinations/');
		}
	});
});
