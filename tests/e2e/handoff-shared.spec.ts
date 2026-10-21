import { expect, test, type Page } from '@playwright/test';

/** Shared card and component behaviour from the 20 Oct design handoff (PR 1: G4, G7, G8). */

/** The computed colour of a token, for comparing against an element's computed style. */
const tokenColor = (page: Page, token: string) =>
	page.evaluate((name) => {
		const probe = document.createElement('div');
		probe.style.backgroundColor = `var(${name})`;
		document.body.append(probe);
		const color = getComputedStyle(probe).backgroundColor;
		probe.remove();
		return color;
	}, token);

const ctaBackground = (page: Page) =>
	page.locator('.tours-results__grid .tour-card-ui__cta').first().evaluate((el) => getComputedStyle(el).backgroundColor);

test.describe('"View tour" on phones', () => {
	test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

	test('is always the active blue, without a hover', async ({ page }) => {
		await page.goto('/tours/');
		expect(await ctaBackground(page)).toBe(await tokenColor(page, '--color-background-highlight'));
	});
});

test('"View tour" on desktop stays grey until the card is hovered', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto('/tours/');
	const blue = await tokenColor(page, '--color-background-highlight');
	expect(await ctaBackground(page)).not.toBe(blue);
	await page.locator('.tours-results__grid a.tour-card-ui').first().hover();
	await expect.poll(() => ctaBackground(page)).toBe(blue);
});

test('a tour breadcrumb is Tours › the tour, in the page and in the JSON-LD', async ({ page }) => {
	await page.goto('/tours/golden-horn-brac-hvar/');
	const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('listitem');
	await expect(crumbs).toHaveCount(2);
	await expect(crumbs.first().getByRole('link', { name: 'Tours' })).toHaveAttribute('href', '/tours/');
	await expect(crumbs.last()).toHaveAttribute('aria-current', 'page');

	// The JSON-LD is only emitted when the site URL is set (PUBLIC_SITE_URL).
	const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
	const list = blocks
		.flatMap((text) => [JSON.parse(text)].flat())
		.find((item: { '@type'?: string }) => item['@type'] === 'BreadcrumbList');
	if (list) expect(list.itemListElement.map((item: { name: string }) => item.name).slice(0, 2)).toEqual(['Home', 'Tours']);
	if (list) expect(list.itemListElement).toHaveLength(3);
});

test('the private experience button carries the inline crown, and hover fills it without moving the label', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto('/tours/blue-cave-hvar-5-islands/');
	const button = page.getByRole('link', { name: 'Plan a private experience' });
	await expect(button).toBeVisible();
	const crown = button.locator('.crown-icon');
	await expect(crown.locator('svg')).toHaveCount(1);
	await expect(crown).toHaveAttribute('aria-hidden', 'true');
	// The crown's box, relative to its button: hover must not change it.
	const box = () => crown.evaluate((el) => {
		const own = el.getBoundingClientRect();
		const parent = el.parentElement!.getBoundingClientRect();
		return { x: own.x - parent.x, y: own.y - parent.y, width: own.width, height: own.height, buttonWidth: parent.width, buttonHeight: parent.height };
	});
	await button.scrollIntoViewIfNeeded();
	const before = await box();
	await button.hover();
	await expect.poll(() => crown.evaluate((el) => getComputedStyle(el).color)).toBe(await tokenColor(page, '--color-crown-hover'));
	expect(await box()).toEqual(before);
	expect(before.width).toBe(30);
});
