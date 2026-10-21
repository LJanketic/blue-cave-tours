import { expect, test } from '@playwright/test';

/**
 * Every tour as a group and a private tour (handoff PR 5, user ruling 20 Oct
 * 2026), with Create Your Perfect Day as the "Build your own" card. Link names
 * are matched loosely ("group", "private") on the booking box's CTAs (the
 * private cancellation link also says "private"), so a label change doesn't
 * break them. The Red Rocks test needs handoff PR 1 item 7 (tourCtas).
 */

/** Islands react only once hydrated: Astro drops the `ssr` attribute then. */
async function hydrated(page: import('@playwright/test').Page) {
	await page.waitForFunction(() => document.querySelectorAll('astro-island[ssr]').length === 0);
}

const PERFECT_DAY = '/tours/create-perfect-day-private/';

test('Red Rocks offers a group option on request and a private option', async ({ page }) => {
	await page.goto('/tours/hvar-red-rocks-pakleni/');
	const ctas = page.locator('#book a.tour__cta');
	// No group price yet (D4b): the group option is an enquiry, not the booking flow.
	await expect(ctas.filter({ hasText: /group/i })).toHaveAttribute('href', '/contact/?tour=hvar-red-rocks-pakleni&topic=group');
	await expect(ctas.filter({ hasText: /private/i })).toBeVisible();
	await expect(page.locator('#book a[href*="/book/"]')).toHaveCount(0);
});

test('a group tour on request has no group booking page', async ({ page }) => {
	for (const slug of ['hvar-red-rocks-pakleni', 'dubrovnik-one-way']) {
		const res = await page.goto(`/book/${slug}/group/`);
		expect(res?.status(), slug).toBe(404);
	}
});

test('the Blue Lagoon morning tour books as a group and offers a private option', async ({ page }) => {
	await page.goto('/tours/blue-lagoon-morning/');
	const ctas = page.locator('#book a.tour__cta');
	await expect(ctas.filter({ hasText: 'Book group tour' })).toHaveAttribute('href', '/book/blue-lagoon-morning/group/');
	await expect(ctas.filter({ hasText: /private/i })).toBeVisible();
});

test('the "Build your own" card comes last on /tours/, whatever the sort', async ({ page }) => {
	await page.goto('/tours/');
	await hydrated(page);
	const last = page.locator('.tours-results__grid > li').last().locator('a.tour-card-ui');
	await expect(last).toHaveAttribute('href', PERFECT_DAY);
	await expect(last).toContainText('Build your own');
	for (const sort of ['duration', 'price-asc', 'price-desc', 'recommended']) {
		await page.getByLabel('Sort tours').selectOption(sort);
		await expect(last, sort).toHaveAttribute('href', PERFECT_DAY);
	}
});

test('without JavaScript the "Build your own" card is last too', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await page.goto('/tours/');
	await expect(page.locator('.tours-results__grid > li').last().locator('a.tour-card-ui')).toHaveAttribute('href', PERFECT_DAY);
	await context.close();
});
