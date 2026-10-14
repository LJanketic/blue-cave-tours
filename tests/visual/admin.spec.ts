import { expect, test, type Page } from '@playwright/test';
import { computedStyles } from './computed-styles';

/**
 * Admin look freeze (spec §12). The admin must look exactly the same from
 * PR 0b until its own re-skin (PR 10).
 *
 * The check compares the computed style of every element (and its ::before
 * and ::after) at 390px and 1280px. Pixels can't be compared exactly: sample
 * bookings get random refs. Same styles on the same markup means the same
 * rendering; screenshots are still saved next to the results for a look.
 *
 * Sample data is placed around today's date, so the baselines change from
 * day to day and aren't committed. To check a branch, take baselines from
 * the commit before it, then compare, on the same day:
 *
 *   git switch --detach <base> && pnpm test:visual admin --update-snapshots
 *   git switch <branch>        && pnpm test:visual admin
 */

const WIDTHS = [390, 1280];

async function signIn(page: Page) {
	await page.goto('/admin/login/');
	await page.getByLabel('Password').fill('demo');
	await page.getByRole('button', { name: /sign in|log in/i }).click();
	await page.waitForURL(/\/admin\/$/);
}

/** Starts from exactly the sample data, in the test server's own stores. */
async function loadSampleData(page: Page) {
	await page.goto('/admin/tools/');
	await page.locator('details.a-confirm summary').click();
	await page.locator('form:has(input[value="clear-all"]) button').click();
	await page.waitForLoadState('networkidle');
	await page.locator('form:has(input[value="load-sample"]) button').click();
	await page.waitForLoadState('networkidle');
}

async function shoot(page: Page, name: string, info = test.info()) {
	for (const width of WIDTHS) {
		await page.setViewportSize({ width, height: 900 });
		await page.evaluate(() => document.fonts.ready);
		await page.screenshot({ path: info.outputPath(`${name}-${width}.png`), fullPage: true });
		expect(await page.evaluate(computedStyles)).toMatchSnapshot(`${name}-${width}.css.txt`);
		await page.reload();
	}
}

test.describe('admin look', () => {
	test('login', async ({ page }) => {
		await page.goto('/admin/login/');
		await shoot(page, 'login');
	});

	test('signed-in pages', async ({ page }) => {
		await signIn(page);
		await loadSampleData(page);
		for (const [name, path] of [
			['dashboard', '/admin/'],
			['bookings', '/admin/bookings/'],
			['enquiries', '/admin/enquiries/'],
			['emails', '/admin/emails/'],
			['tools', '/admin/tools/'],
		] as const) {
			await page.goto(path);
			await shoot(page, name);
		}

		await page.goto('/admin/bookings/');
		// The overbooked boat's last booking: one fixed record, whatever order the list comes back in.
		await expect(page.locator('a.a-item[href^="/admin/bookings/"]', { hasText: 'Daniel Smith' })).toHaveCount(1);
		await page.locator('a.a-item[href^="/admin/bookings/"]', { hasText: 'Daniel Smith' }).click();
		await page.waitForURL(/\/admin\/bookings\/[^/]+\/?$/);
		await shoot(page, 'booking-detail');
	});
});
