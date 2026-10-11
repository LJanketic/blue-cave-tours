import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Netlify serves pages at directory URLs (/tours/), so a link to /tours costs a
// 301 on every click. This keeps hand-written internal links on the slashed form.
const SRC = new URL('..', import.meta.url).pathname;
const ROUTES = '(?:tours|destinations|about|faq|contact|legal|book|booking)';
// A quoted or template string starting with a page route, e.g. "/tours", `/tours/${slug}`.
const LINK = new RegExp(`(['"\`])(/${ROUTES}(?:[/?#$][^'"\`\\s]*)?)\\1`, 'g');
// Path prefixes for robots.txt / the sitemap filter, not links.
const IGNORED_FILES = new Set(['config/noindex.ts']);

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return sourceFiles(path);
		return /\.(astro|vue|ts)$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [path] : [];
	});
}

describe('internal links', () => {
	it('end in a trailing slash (before any ?query or #hash)', () => {
		const offenders: string[] = [];
		for (const file of sourceFiles(SRC)) {
			const rel = file.slice(SRC.length);
			if (IGNORED_FILES.has(rel)) continue;
			for (const [, , link] of readFileSync(file, 'utf8').matchAll(LINK)) {
				const path = link.split(/[?#]|\$\{query\}/)[0];
				if (!path.endsWith('/')) offenders.push(`${rel}: ${link}`);
			}
		}
		expect(offenders).toEqual([]);
	});
});
