import fs from 'node:fs';
import { test } from '@playwright/test';
import { publicRoutes } from '../a11y/routes';
import { computedStyles } from './computed-styles';

/**
 * Dumps the computed style of every element on every public page, at 390
 * and 1280px, for refactors that must not change the look (e.g. moving CSS
 * into cascade layers). Dump the commit before and after, then compare:
 *
 *   STYLES=before pnpm test:visual public-styles --project=chromium
 *   STYLES=after  pnpm test:visual public-styles --project=chromium
 *   node tests/visual/compare-styles.mjs before after
 *
 * Dumps go to screenshots/styles/<label>/ (not committed).
 */
const LABEL = process.env.STYLES;

test('dump public pages\' computed styles', async ({ page }) => {
	test.skip(!LABEL, 'set STYLES=<label>');
	fs.mkdirSync(`screenshots/styles/${LABEL}`, { recursive: true });
	test.setTimeout(900_000);
	await page.emulateMedia({ reducedMotion: 'reduce' });
	for (const route of await publicRoutes(page)) {
		const name = route === '/' ? 'home' : route.replace(/^\/|\/$/g, '').replaceAll('/', '_');
		for (const width of [390, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(route);
			// Dev serves component CSS from scripts, and client:visible islands hydrate only
			// once scrolled to: bring each into view, then wait until all have hydrated.
			await page.evaluate(async () => {
				for (let y = 0; y < document.documentElement.scrollHeight; y += 400) {
					window.scrollTo(0, y);
					await new Promise((resolve) => setTimeout(resolve, 30));
				}
				window.scrollTo(0, 0);
			});
			await page
				.waitForFunction(() => !document.querySelector('astro-island[ssr]'), undefined, { timeout: 10_000 })
				.catch(async () => {
					const stuck = await page.locator('astro-island[ssr]').evaluateAll((els) => els.map((el) => el.getAttribute('component-url')));
					throw new Error(`${route} at ${width}px: islands never hydrated: ${stuck.join(', ')}`);
				});
			await page.evaluate(() => document.fonts.ready);
			await page.waitForTimeout(300);
			fs.writeFileSync(`screenshots/styles/${LABEL}/${name}-${width}.txt`, await page.evaluate(computedStyles));
		}
	}
});
