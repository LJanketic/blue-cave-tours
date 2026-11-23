import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Checks the built CSS (run `pnpm build` first; skipped without it). Vite 8's
 * default CSS minifier, lightningcss, drops the unprefixed `backdrop-filter`
 * wherever a -webkit- one sits next to it (every blur gone in Firefox), and
 * its default targets rewrite `(max-width:768px)` as `(width<=768px)`, which
 * Safari before 16.4 ignores. astro.config.mjs sets `cssMinify: 'esbuild'`
 * and `cssTarget`; these catch a regression.
 */
const dir = path.resolve(__dirname, '../../dist/_astro');
const css = existsSync(dir)
	? readdirSync(dir)
			.filter((name) => name.endsWith('.css'))
			.map((name) => readFileSync(`${dir}/${name}`, 'utf8'))
			.join('\n')
	: '';

describe('built CSS', () => {
	it.skipIf(!css)('keeps the standard backdrop-filter next to every -webkit- one', () => {
		const prefixed = css.match(/-webkit-backdrop-filter:/g)?.length ?? 0;
		const standard = css.match(/(?<!-webkit-)backdrop-filter:/g)?.length ?? 0;
		expect(prefixed).toBeGreaterThan(0);
		expect(standard).toBeGreaterThanOrEqual(prefixed);
	});

	it.skipIf(!css)('writes media queries as min-/max-width, not range syntax', () => {
		expect(css).toMatch(/\(max-width:/);
		expect(css).not.toMatch(/\((?:width|height)\s*[<>]=?/);
	});
});
