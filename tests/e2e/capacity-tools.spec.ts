import { expect, test, type Page } from '@playwright/test';

/**
 * Admin tools for capacity (PR W0 review, B2 and S5). The Playwright server
 * isn't production (CONTEXT=playwright), so demo data can still be loaded
 * and deleted there; the refusal on production is unit-tested
 * (src/lib/bookings/capacity.test.ts). "Rebuild capacity from bookings" sits
 * behind a confirm step, like the other destructive actions, and works in
 * every context.
 */

async function adminLogin(page: Page) {
	await page.goto('/admin/login/');
	await page.locator('#password').fill('demo');
	await page.getByRole('button', { name: 'Log in' }).click();
	await expect(page).toHaveURL(/\/admin\/$/);
}

test('demo data stays available off production, and capacity can be rebuilt after a confirm step', async ({ page }) => {
	await page.setExtraHTTPHeaders({ 'x-nf-client-connection-ip': `198.18.2.${Math.floor(Math.random() * 250) + 1}` });
	await adminLogin(page);
	await page.goto('/admin/tools/');

	await expect(page.getByRole('button', { name: 'Load demo data' })).toBeVisible();
	await expect(page.getByText('Delete everything…')).toBeVisible();
	await expect(page.getByText('off on the live site')).toHaveCount(0);

	const rebuild = page.getByRole('button', { name: 'Yes, rebuild capacity' });
	await expect(rebuild).toBeHidden();
	await page.getByText('Rebuild capacity from bookings…').click();
	await rebuild.click();
	await expect(page).toHaveURL(/\/admin\/tools\/\?flash=rebuilt/);
	await expect(page.getByRole('status')).toContainText('Capacity rebuilt from the bookings:');
});
