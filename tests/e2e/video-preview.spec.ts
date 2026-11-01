import { expect, test, type Page } from '@playwright/test';

/**
 * Homepage video preview (spec §6.1.4, §3.4, §11.11; ClickUp C6).
 * HOME_VIDEO in src/config/video.ts stays null until the operator supplies the
 * footage and rights (D-6, C-17); the section doesn't render then, so these
 * tests skip. (The config imports a poster image, so it can't be read here.)
 */
const OFF = 'HOME_VIDEO is null in src/config/video.ts: no footage yet (D-6, C-17)';

async function hasSection(page: Page): Promise<boolean> {
	return (await page.locator('section.vp').count()) > 0;
}

test('a click swaps the poster for the video, which plays and takes focus', async ({ page }) => {
	await page.goto('/');
	test.skip(!(await hasSection(page)), OFF);

	const section = page.locator('section.vp');
	await expect(section).toHaveAttribute('aria-labelledby', 'vp-title');
	await expect(section.getByRole('heading', { level: 2, name: 'Preview from our tours' })).toBeVisible();
	// Nothing is fetched before the click.
	await expect(section.locator('video')).toHaveCount(0);

	const play = section.getByRole('button', { name: /^Play the tour preview video, .+, no sound$/ });
	await expect(play).toBeVisible();
	await play.click();

	const video = section.locator('video');
	await expect(video).toHaveCount(1);
	await expect(play).toHaveCount(0);
	await expect(video).toBeFocused();
	await expect(video).toHaveAttribute('preload', 'none');
	await expect(video).toHaveAttribute('aria-describedby', 'vp-desc');
	await expect(video).toHaveAttribute('src', /^\/media\/.+\.mp4$/);
	await expect(page.locator('#vp-desc')).not.toBeEmpty();
});

test('without JavaScript the poster links to the MP4', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await page.goto('/');
	const on = await hasSection(page);
	if (on) {
		const link = page.locator('section.vp').getByRole('link', { name: /^Play the tour preview video/ });
		await expect(link).toHaveAttribute('href', /^\/media\/.+\.mp4$/);
	}
	await context.close();
	test.skip(!on, OFF);
});
