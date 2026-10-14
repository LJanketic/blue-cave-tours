import { expect, test } from '@playwright/test';
import { photoTextContrast } from './contrast';

/*
 * Homepage text on photos (spec §6.1.2): display titles ≥ 3:1, other text
 * ≥ 4.5:1, against the lightest pixel behind them, for every hero slide and
 * the CTA band, at 390, 768, 1280 and 1920px.
 *   pnpm test:visual home-contrast --project=chromium
 */
test.describe.configure({ mode: 'serial' });

for (const width of [390, 768, 1280, 1920]) {
	test(`home text on photos is readable at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: width < 800 ? 844 : 900 });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');

		const dots = page.locator('.home-hero__dot');
		for (let slide = 0; slide < (await dots.count()); slide++) {
			await dots.nth(slide).click();
			// The text swaps in after the old text fades: wait for this slide's own panel.
			const panel = page.getByRole('group', { name: `${slide + 1} of ${await dots.count()}`, exact: true });
			await panel.waitFor({ state: 'visible' });
			// Each slide's photo loads when it's first shown; then the crossfade.
			await page.waitForFunction(() => {
				const img = document.querySelector<HTMLImageElement>('.home-hero__photo.is-on');
				return Boolean(img?.complete && img.naturalWidth > 0);
			});
			await page.waitForTimeout(1300);
			const title = await photoTextContrast(panel.locator('.home-hero__title'));
			const sub = await photoTextContrast(panel.locator('.home-hero__sub'), 0.88);
			expect.soft(title, `slide ${slide + 1} title`).toBeGreaterThanOrEqual(3);
			expect.soft(sub, `slide ${slide + 1} sub`).toBeGreaterThanOrEqual(4.5);
		}

		const band = page.locator('.cta-band--photo');
		await band.scrollIntoViewIfNeeded();
		await page.waitForFunction(() => (document.querySelector('.cta-band__img') as HTMLImageElement | null)?.complete === true);
		expect.soft(await photoTextContrast(band.locator('h2')), 'CTA band heading').toBeGreaterThanOrEqual(3);
		expect.soft(await photoTextContrast(band.locator('.cta-band__text'), 0.88), 'CTA band text').toBeGreaterThanOrEqual(4.5);
	});
}
