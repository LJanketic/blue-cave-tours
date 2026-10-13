import { test } from '@playwright/test';
import { publicRoutes } from '../a11y/routes';

/**
 * Full-page screenshots of every public page, for before/after comparison
 * in a PR description. Not assertions; the files aren't committed.
 *
 *   CAPTURE=before pnpm test:visual capture --project=chromium
 *
 * writes screenshots/before/<route>-<width>.png
 */
const LABEL = process.env.CAPTURE;
const WIDTHS = [390, 768, 1280, 1920];

test('capture public pages', async ({ page }) => {
	test.skip(!LABEL, 'set CAPTURE=<label> to take screenshots');
	test.setTimeout(600_000);
	for (const route of await publicRoutes(page)) {
		const name = route === '/' ? 'home' : route.replace(/^\/|\/$/g, '').replaceAll('/', '_');
		for (const width of WIDTHS) {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(route);
			await page.evaluate(() => document.fonts.ready);
			await page.screenshot({ path: `screenshots/${LABEL}/${name}-${width}.png`, fullPage: true, animations: 'disabled' });
		}
	}
});
