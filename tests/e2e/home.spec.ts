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
	// The name says what the button does next, so there's no aria-pressed to contradict it.
	await expect(firstControl).toHaveAccessibleName('Play slideshow');
	await expect(firstControl).not.toHaveAttribute('aria-pressed');
	await expect(carousel.locator('.home-hero__slides')).toHaveAttribute('aria-live', 'polite');

	// Paused: the slide doesn't change.
	const current = await carousel.locator('.home-hero__dot[aria-current="true"]').getAttribute('aria-label');
	await page.waitForTimeout(6500);
	await expect(carousel.locator('.home-hero__dot[aria-current="true"]')).toHaveAttribute('aria-label', current ?? '');
});

test('on a touch phone the dots show alone after the CTAs, and a tap on the active dot pauses', async ({ browser }) => {
	const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
	const page = await context.newPage();
	await page.goto('/');
	await page.waitForFunction(() => document.querySelectorAll('astro-island[ssr]').length === 0);
	const carousel = page.locator('[aria-roledescription="carousel"]');
	// The design has no visible Pause: it shows only on keyboard focus.
	await expect(carousel.getByRole('button', { name: 'Pause slideshow' })).toHaveCSS('opacity', '0');
	const [dots, ctas] = await Promise.all([carousel.locator('.home-hero__dots').boundingBox(), carousel.locator('.home-hero__ctas').boundingBox()]);
	if (!dots || !ctas) throw new Error('hero controls not laid out');
	expect(dots.y).toBeGreaterThan(ctas.y + ctas.height);

	// DOM order matches the look for everything but Pause: CTAs, then the dots.
	const order = await carousel.locator('.home-hero__content').locator('button, a').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? el.textContent?.trim()));
	expect(order).toEqual(['Pause slideshow', 'Browse group tours', 'Plan a private experience', 'Show slide 1 of 3', 'Show slide 2 of 3', 'Show slide 3 of 3']);

	const active = carousel.locator('.home-hero__dot[aria-current="true"]');
	await active.tap();
	await expect(carousel.locator('.home-hero__slides')).toHaveAttribute('aria-live', 'polite');
	await expect(carousel.locator('.home-hero__pause')).toHaveAccessibleName('Play slideshow');
	await active.tap();
	await expect(carousel.locator('.home-hero__pause')).toHaveAccessibleName('Pause slideshow');
	await context.close();
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
	// Nothing rotates without JavaScript, so there's no Pause to offer.
	await expect(page.locator('.home-hero__pause')).toHaveCount(0);
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

test('one visible h1, the fixed overline; slide titles are not headings', async ({ page }) => {
	await page.goto('/');
	// The document's own h1s (a locator would also pierce the dev toolbar's shadow DOM).
	expect(await page.evaluate(() => document.querySelectorAll('h1').length)).toBe(1);
	const h1 = page.getByRole('heading', { level: 1 });
	await expect(h1).toHaveCount(1);
	await expect(h1).toBeVisible();
	await expect(h1).toHaveText('Blue Cave & island hopping · Split, Croatia');
	await page.locator('[aria-roledescription="carousel"]').getByRole('button', { name: 'Show slide 2 of 3' }).click();
	await expect(h1).toHaveText('Blue Cave & island hopping · Split, Croatia');
	await expect(page.locator('.home-hero__title').first()).toHaveJSProperty('tagName', 'P');
});

test('the hero has its two CTAs once, the same on every slide', async ({ page }) => {
	await page.goto('/');
	const carousel = page.locator('[aria-roledescription="carousel"]');
	const links = carousel.getByRole('link');
	for (const slide of [1, 2, 3]) {
		await carousel.getByRole('button', { name: `Show slide ${slide} of 3` }).click();
		await expect(carousel.getByRole('group', { name: `${slide} of 3` })).toBeVisible();
		await expect(links).toHaveCount(2);
		await expect(links.nth(0)).toHaveAccessibleName('Browse group tours');
		await expect(links.nth(0)).toHaveAttribute('href', '/tours/?type=group');
		await expect(links.nth(1)).toHaveAccessibleName('Plan a private experience');
		await expect(links.nth(1)).toHaveAttribute('href', /^\/private-charter\/\?tour=/);
	}
});

test('popular tours: arrows scroll the row, disable at the ends and leave the tab order', async ({ page, browserName }) => {
	// Safari only tabs to form fields by default, so the Tab steps run in Chromium and Firefox;
	// WebKit still checks the disabled states and the focus hand-off.
	const tabs = browserName !== 'webkit';
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');
	const frame = page.locator('.popular__frame');
	const prev = page.getByRole('button', { name: 'Previous tours' });
	const next = page.getByRole('button', { name: 'Next tours' });
	await frame.scrollIntoViewIfNeeded();
	await expect(prev).toBeDisabled();
	await expect(prev).toHaveCSS('opacity', '0');

	// Tab from "See all tours" skips the disabled Previous.
	if (tabs) {
		await page.locator('.popular__head a').focus();
		await page.keyboard.press('Tab');
	} else {
		await next.focus();
	}
	await expect(next).toBeFocused();

	await page.keyboard.press('Enter');
	await expect.poll(() => page.locator('.popular__track').evaluate((t) => t.scrollLeft)).toBeGreaterThan(100);
	await expect(prev).toBeEnabled();

	// Keep going to the end: Next disables itself and hands focus to Previous, not <body>.
	for (let i = 0; i < 12 && (await next.isEnabled()); i++) {
		await page.keyboard.press('Enter');
		await page.waitForTimeout(150);
	}
	await expect(next).toBeDisabled();
	await expect(prev).toBeFocused();
	if (tabs) {
		await page.keyboard.press('Tab');
		await expect(next).not.toBeFocused();
		expect(await page.evaluate(() => document.activeElement?.closest('.popular__frame') !== null)).toBe(true);
	}
});

test('popular tours: no mouse drag-to-scroll', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto('/');
	const track = page.locator('.popular__track');
	await track.scrollIntoViewIfNeeded();
	const box = await track.boundingBox();
	if (!box) throw new Error('no slider');
	const y = box.y + box.height / 2;
	await page.mouse.move(box.x + box.width / 2, y);
	await page.mouse.down();
	await page.mouse.move(box.x + box.width / 2 - 300, y, { steps: 10 });
	await page.mouse.up();
	expect(await track.evaluate((t) => t.scrollLeft)).toBe(0);
	await expect(page).toHaveURL(/\/$/);
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
