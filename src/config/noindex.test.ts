import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NOINDEX_PATH_PREFIXES, ROBOTS_DISALLOW } from './noindex';

const PAGES_DIR = 'src/pages';

/** Route paths of pages that opt out of prerendering, e.g. `/book/[slug]/review`. */
function serverRenderedRoutes(dir = PAGES_DIR): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return serverRenderedRoutes(path);
		if (!/\.(astro|ts)$/.test(entry.name) || entry.name.includes('.test.')) return [];
		if (!/export const prerender = false/.test(readFileSync(path, 'utf8'))) return [];
		return ['/' + relative(PAGES_DIR, path).replace(/\.(astro|ts)$/, '').replace(/\/index$/, '')];
	});
}

/** robots.txt rule → regex: `*` matches one path segment, the rule matches as a prefix. */
function ruleMatches(rule: string, path: string): boolean {
	const pattern = rule.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]+');
	return new RegExp(`^${pattern}`).test(path);
}

describe('robots.txt and sitemap rules', () => {
	const routes = serverRenderedRoutes();

	it('finds the server-rendered routes', () => {
		expect(routes.length).toBeGreaterThan(0);
	});

	// Every crawl of a server-rendered route is a paid function invocation.
	it('disallows every server-rendered route in robots.txt', () => {
		for (const route of routes) {
			const path = route.replace(/\[[^\]]+\]/g, 'x');
			expect(
				ROBOTS_DISALLOW.some((rule) => ruleMatches(rule, path)),
				`${route} is server-rendered but not in ROBOTS_DISALLOW`,
			).toBe(true);
		}
	});

	it('keeps every disallowed path out of the sitemap too', () => {
		for (const rule of ROBOTS_DISALLOW) {
			const path = rule.replace(/\*/g, 'x');
			expect(
				NOINDEX_PATH_PREFIXES.some((prefix) => path.startsWith(prefix)),
				`${rule} is disallowed but not covered by NOINDEX_PATH_PREFIXES`,
			).toBe(true);
		}
	});
});
