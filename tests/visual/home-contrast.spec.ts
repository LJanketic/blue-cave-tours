import { expect, test } from '@playwright/test';
import { photoTextContrast } from './contrast';

/*
 * Homepage text on photos (spec §6.1.2): display titles ≥ 3:1, other text
 * (subtitles, the h1 overline) ≥ 4.5:1, against the lightest pixel behind
 * them, for every hero slide (the Blue Cave first, handoff H2) and the CTA
 * band, at 390, 768, 1280 and 1920px, and on short phones (375×667, 360×640:
 * the 580px minimum hero height, where the text block fills most of it).
 *   pnpm test:visual home-contrast --project=chromium
 */
test.describe.configure({ mode: 'serial' });

const viewports = [
	{ width: 360, height: 640 },
	{ width: 375, height: 667 },
	{ width: 390, height: 844 },
	{ width: 768, height: 844 },
	{ width: 1280, height: 900 },
	{ width: 1920, height: 900 },
];

for (const { width, height } of viewports) {
	test(`home text on photos is readable at ${width}×${height}`, async ({ page }) => {
		await page.setViewportSize({ width, height });
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
			// The h1 overline stays put while the photos change: small text, so 4.5:1 on every one.
			const overline = await photoTextContrast(page.locator('.home-hero__overline'));
			expect.soft(title, `slide ${slide + 1} title`).toBeGreaterThanOrEqual(3);
			expect.soft(sub, `slide ${slide + 1} sub`).toBeGreaterThanOrEqual(4.5);
			expect.soft(overline, `slide ${slide + 1} overline`).toBeGreaterThanOrEqual(4.5);
		}

		const band = page.locator('.cta-band--photo');
		await band.scrollIntoViewIfNeeded();
		await page.waitForFunction(() => (document.querySelector('.cta-band__img') as HTMLImageElement | null)?.complete === true);
		expect.soft(await photoTextContrast(band.locator('h2')), 'CTA band heading').toBeGreaterThanOrEqual(3);
		expect.soft(await photoTextContrast(band.locator('.cta-band__text'), 0.88), 'CTA band text').toBeGreaterThanOrEqual(4.5);
	});
}
