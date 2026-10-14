import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * The shared components on /dev/kit/ (spec §14.3, PR 2 acceptance): keyboard
 * behaviour, and no serious or critical axe issues in their open states.
 */

async function seriousAxe(page: Page): Promise<string[]> {
	const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
	return violations
		.filter((v) => v.impact === 'serious' || v.impact === 'critical')
		.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

test('gallery without JavaScript: the hero links to the full-size photo', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await page.goto('/dev/kit/');
	await expect(page.locator('a.gallery-ui__hero')).toHaveAttribute('href', /webp/);
	await context.close();
});

test('gallery lightbox: opens, steps with arrow keys, closes with Escape and returns focus', async ({ page }) => {
	await page.goto('/dev/kit/');
	// client:visible: a plain link to the photo until it scrolls into view and hydrates.
	await page.locator('.gallery-ui__hero').scrollIntoViewIfNeeded();
	const hero = page.getByRole('button', { name: /Open photo gallery, \d+ photos/ });
	await hero.focus();
	await page.keyboard.press('Enter');

	const dialog = page.getByRole('dialog', { name: 'Photo gallery' });
	await expect(dialog).toBeVisible();
	await expect(dialog.locator('.gallery-ui__position')).toHaveText(/^1 \/ \d+$/);
	expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);

	await page.keyboard.press('ArrowRight');
	await expect(dialog.locator('.gallery-ui__position')).toHaveText(/^2 \/ \d+$/);
	await page.keyboard.press('ArrowLeft');
	await page.keyboard.press('ArrowLeft');
	await expect(dialog.locator('.gallery-ui__position')).toHaveText(/^(\d+) \/ \1$/);

	expect(await seriousAxe(page)).toEqual([]);

	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await expect(hero).toBeFocused();
	expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
});

test('gallery thumbnail opens the lightbox on that photo; the close button works', async ({ page }) => {
	await page.goto('/dev/kit/');
	await page.locator('.gallery-ui__hero').scrollIntoViewIfNeeded();
	const thumb = page.getByRole('button', { name: /^Open photo 2 of/ });
	await thumb.click();
	const dialog = page.getByRole('dialog', { name: 'Photo gallery' });
	await expect(dialog.locator('.gallery-ui__position')).toHaveText(/^2 \/ /);
	await dialog.getByRole('button', { name: 'Close gallery' }).click();
	await expect(dialog).toBeHidden();
	await expect(thumb).toBeFocused();
});

test.describe('phone', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('menu: traps focus, closes with Escape, returns focus to the toggle', async ({ page, browserName }) => {
		await page.goto('/dev/kit/');
		const toggle = page.locator('#menu-toggle');
		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await expect(page.locator('.site-header__link').first()).toBeFocused();
		await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Contact' })).toBeVisible();

		// Tab never reaches the page behind the panel. Chromium and Firefox wrap
		// round inside it; Safari skips links on Tab by default, so there focus
		// can only leave to the browser's own toolbar.
		for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
		const inPanel = await page.evaluate(() => document.getElementById('primary-nav')?.contains(document.activeElement));
		if (browserName !== 'webkit') expect(inPanel).toBe(true);
		expect(await page.evaluate(() => document.querySelector('main')?.contains(document.activeElement))).toBe(false);
		expect(await page.locator('main').evaluate((m) => (m as HTMLElement).inert)).toBe(true);
		expect(await seriousAxe(page)).toEqual([]);

		await page.keyboard.press('Escape');
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');
		await expect(toggle).toBeFocused();
		expect(await page.locator('main').evaluate((m) => (m as HTMLElement).inert)).toBe(false);
	});

	test('mobile action bar hides while its target is on screen', async ({ page }) => {
		await page.goto('/dev/kit/');
		const bar = page.locator('.mobile-action-bar');
		await expect(bar).toBeVisible();
		await page.locator('#book').scrollIntoViewIfNeeded();
		await expect(bar).toHaveClass(/is-hidden/);
		await expect(bar).toBeHidden();
	});

	test('kit page has no serious axe issues on phones', async ({ page }) => {
		await page.goto('/dev/kit/');
		expect(await seriousAxe(page)).toEqual([]);
	});
});

test('marquee: pause button stops and restarts the strip', async ({ page }) => {
	await page.goto('/dev/kit/');
	const marquee = page.locator('[data-marquee]');
	const toggle = marquee.getByRole('button', { name: /Pause highlights/ });
	await expect(marquee).toHaveClass(/is-running/);
	await toggle.click();
	await expect(marquee).toHaveClass(/is-paused/);
	await expect(marquee.getByRole('button', { name: /Play highlights/ })).toHaveAttribute('aria-pressed', 'true');
	// Screen readers get the list once; the moving copy is hidden.
	await expect(marquee.getByRole('list', { name: 'Highlights' })).toHaveCount(1);
});

test('marquee stays still under reduced motion', async ({ browser }) => {
	const context = await browser.newContext({ reducedMotion: 'reduce' });
	const page = await context.newPage();
	await page.goto('/dev/kit/');
	await expect(page.locator('[data-marquee]')).not.toHaveClass(/is-running/);
	await expect(page.locator('.marquee__toggle')).toBeHidden();
	await context.close();
});

test('filter chips toggle aria-pressed', async ({ page }) => {
	await page.goto('/dev/kit/');
	const chip = page.getByRole('group', { name: 'Filter tours' }).getByRole('button', { name: 'Private only' });
	await expect(chip).toHaveAttribute('aria-pressed', 'false');
	await chip.click();
	await expect(chip).toHaveAttribute('aria-pressed', 'true');
});

test('overlay header turns solid after scrolling', async ({ page }) => {
	await page.goto('/dev/kit/');
	const header = page.locator('#site-header');
	await expect(header).toHaveClass(/on-photo/);
	await page.mouse.wheel(0, 600);
	await expect(header).toHaveClass(/nav-solid/);
	await expect(header).not.toHaveClass(/on-photo/);
});
