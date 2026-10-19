import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/** Homepage behaviour (spec §6.1, §11.3, §11.13). */

test('the carousel can be paused from the keyboard, and Pause comes first', async ({ page }) => {
	await page.goto('/');
	const carousel = page.locator('[aria-roledescription="carousel"]');
	const firstControl = carousel.locator('button, a').first();
	await expect(firstControl).toHaveAccessibleName('Pause slideshow');

	await firstControl.focus();
	await page.keyboard.press('Enter');
	await expect(carousel.getByRole('button', { name: 'Play slideshow' })).toHaveAttribute('aria-pressed', 'true');
	await expect(carousel.locator('.home-hero__slides')).toHaveAttribute('aria-live', 'polite');

	// Paused: the slide doesn't change.
	const current = await carousel.locator('.home-hero__dot[aria-current="true"]').getAttribute('aria-label');
	await page.waitForTimeout(6500);
	await expect(carousel.locator('.home-hero__dot[aria-current="true"]')).toHaveAttribute('aria-label', current ?? '');
});

test('dots and arrows change the slide; hidden slides are inert', async ({ page }) => {
	await page.goto('/');
	const carousel = page.locator('[aria-roledescription="carousel"]');
	await carousel.getByRole('button', { name: 'Show slide 3 of 3' }).click();
	await expect(carousel.getByRole('group', { name: '3 of 3' })).toBeVisible();
	await expect(carousel.getByRole('group', { name: '1 of 3' })).toBeHidden();
	await carousel.getByRole('button', { name: 'Next slide' }).click();
	await expect(carousel.getByRole('group', { name: '1 of 3' })).toBeVisible();
});

test('no auto-rotation under reduced motion', async ({ browser }) => {
	const context = await browser.newContext({ reducedMotion: 'reduce' });
	const page = await context.newPage();
	await page.goto('/');
	await page.waitForTimeout(6800);
	await expect(page.locator('.home-hero__dot').first()).toHaveAttribute('aria-current', 'true');
	await expect(page.getByRole('button', { name: 'Pause slideshow' })).toHaveCount(0);
	await context.close();
});

test('without JavaScript: slide 1 shows, FAQ answers are readable, tours scroll', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await page.goto('/');
	await expect(page.locator('.home-hero__panel').first()).toBeVisible();
	await expect(page.locator('.home-hero__photo').first()).toHaveAttribute('src', /.+/);
	await expect(page.locator('.faq-acc__answer').first()).toBeVisible();
	await expect(page.locator('.popular__track')).toHaveCSS('overflow-x', 'auto');
	await context.close();
});

test('the homepage FAQ opens and closes', async ({ page }) => {
	await page.goto('/');
	const trigger = page.getByRole('button', { name: 'What’s included in the price?' });
	await trigger.scrollIntoViewIfNeeded();
	await expect(trigger).toHaveAttribute('aria-expanded', 'false');
	await trigger.click();
	await expect(trigger).toHaveAttribute('aria-expanded', 'true');
	await expect(page.locator(`#${await trigger.getAttribute('aria-controls')}`)).toBeVisible();
});

test('popular tours: arrows scroll the row and are gated at the start', async ({ page }) => {
	await page.goto('/');
	const prev = page.getByRole('button', { name: 'Previous tours' });
	const next = page.getByRole('button', { name: 'Next tours' });
	await next.scrollIntoViewIfNeeded();
	await expect(prev).toHaveAttribute('aria-disabled', 'true');
	await next.click();
	await expect.poll(() => page.locator('.popular__track').evaluate((t) => t.scrollLeft)).toBeGreaterThan(100);
	await expect(prev).toHaveAttribute('aria-disabled', 'false');
});

for (const width of [320, 390, 768, 1280, 1920]) {
	test(`no sideways page scroll at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/');
		// Scroll through, so every island and lazy image has loaded.
		const height = await page.evaluate(() => document.documentElement.scrollHeight);
		for (let y = 0; y < height; y += 700) await page.evaluate((top) => window.scrollTo(0, top), y);
		await page.waitForTimeout(300);
		expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
	});
}

test('home has no serious axe issues on phones', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
	expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});
