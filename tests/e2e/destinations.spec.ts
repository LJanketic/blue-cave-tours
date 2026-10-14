import { expect, test } from '@playwright/test';

/** Destinations overview and detail (spec §6.4, §6.5). */

test('category chips filter the cards and the label counts what is shown', async ({ page }) => {
	await page.goto('/destinations/');
	const label = page.locator('.dest-results__label');
	await expect(label).toHaveText(/^All destinations \((\d+)\)$/);
	const all = await page.locator('.dest-results__grid > li').count();

	await page.getByRole('group', { name: 'Filter destinations' }).getByRole('button', { name: 'Islands' }).click();
	const islands = await page.locator('.dest-results__grid > li').count();
	expect(islands).toBeLessThan(all);
	await expect(label).toHaveText(`Islands (${islands})`);
	await expect(page.getByRole('button', { name: 'Islands' })).toHaveAttribute('aria-pressed', 'true');
	await expect(page.getByRole('button', { name: 'All destinations' })).toHaveAttribute('aria-pressed', 'false');
});

test('every destination page: the tour count matches the cards, the map links to the place', async ({ page }) => {
	await page.goto('/destinations/');
	const links = await page.locator('a.dest-card-ui__link').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
	expect(links).toHaveLength(10);
	for (const href of links) {
		await page.goto(href);
		const heading = await page.locator('#tours-heading').innerText();
		const n = Number(heading.match(/\((\d+)\)$/)?.[1]);
		await expect(page.locator('#tours .tour-card-ui'), href).toHaveCount(n);
		await expect(page.locator('.dest__map'), href).toHaveAttribute('href', /google\.com\/maps\/search/);
		await expect(page.locator('.dest__map'), href).not.toHaveAttribute('href', /43\.5072282/); // not the meeting point
	}
});

test('the destination grid stays a single column on small phones and has no sideways scroll', async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 800 });
	await page.goto('/destinations/');
	const [a, b] = await page.locator('.dest-results__grid > li').evaluateAll((lis) => lis.slice(0, 2).map((li) => li.getBoundingClientRect().left));
	expect(a).toBe(b);
	expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});

test.describe('phone', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('the mobile bar leads to the tours and hides there', async ({ page }) => {
		await page.goto('/destinations/hvar/');
		const bar = page.locator('.mobile-action-bar');
		await expect(bar).toBeVisible();
		await bar.getByRole('link', { name: 'See tours' }).click();
		await expect(bar).toBeHidden();
	});

	test('the at-a-glance box follows the main column (D-24)', async ({ page }) => {
		await page.goto('/destinations/hvar/');
		const mainBottom = await page.locator('.dest__main').evaluate((el) => el.getBoundingClientRect().bottom);
		const asideTop = await page.locator('.glance').evaluate((el) => el.getBoundingClientRect().top);
		expect(asideTop).toBeGreaterThan(mainBottom);
	});
});
