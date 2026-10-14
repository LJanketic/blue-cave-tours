import { expect, test } from '@playwright/test';
import { photoTextContrast } from './contrast';

/*
 * Photo heroes (spec §6.2.1, §11.9): eyebrow and lead ≥ 4.5:1, the display
 * title ≥ 3:1, and the glass chips' labels ≥ 4.5:1, against the lightest
 * pixel behind them, at 390, 768, 1280 and 1920px.
 *   pnpm test:visual photo-hero-contrast --project=chromium
 */
const PAGES = ['/tours/'];

for (const path of PAGES) {
	for (const width of [390, 768, 1280, 1920]) {
		test(`${path} hero text is readable at ${width}px`, async ({ page }) => {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(path);
			const hero = page.locator('.photo-hero');
			await page.waitForFunction(() => (document.querySelector('.photo-hero__img') as HTMLImageElement | null)?.complete === true);
			expect.soft(await photoTextContrast(hero.locator('.photo-hero__eyebrow'), 0.85), 'eyebrow').toBeGreaterThanOrEqual(4.5);
			expect.soft(await photoTextContrast(hero.locator('.photo-hero__title')), 'title').toBeGreaterThanOrEqual(3);
			expect.soft(await photoTextContrast(hero.locator('.photo-hero__lead'), 0.88), 'lead').toBeGreaterThanOrEqual(4.5);

			// Unpressed glass chips (white text on dark glass); pressed ones are white with dark text.
			const chips = hero.locator('button.chip[aria-pressed="false"]:visible');
			for (let i = 0; i < (await chips.count()); i++) {
				const chip = chips.nth(i);
				const box = await chip.boundingBox();
				if (!box || box.x + box.width > width) continue; // scrolled out of the row on phones
				expect.soft(await photoTextContrast(chip, 1, 'transparent', 'pill'), `chip ${await chip.innerText()}`).toBeGreaterThanOrEqual(4.5);
			}
		});
	}
}
