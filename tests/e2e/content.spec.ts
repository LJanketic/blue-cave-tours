import { expect, test } from '@playwright/test';

/** Content pages (spec §7): contact (with and without JavaScript), FAQ, legal, 404. */

/** Islands react only once hydrated: Astro drops the `ssr` attribute then. */
async function hydrated(page: import('@playwright/test').Page) {
	await page.waitForFunction(() => document.querySelectorAll('astro-island[ssr]').length === 0);
}

/**
 * The contact API allows 5 posts per 10 minutes per IP, and a test run poses as
 * one IP: each test that sends gets its own, so reruns never hit the limit.
 */
function ownIp() {
	return { 'x-nf-client-connection-ip': `203.0.113.${Math.floor(Math.random() * 250) + 1}` };
}

async function fillContact(page: import('@playwright/test').Page, overrides: Record<string, string> = {}) {
	// By id: Playwright treats the off-screen honeypot as a visible field.
	const values = { firstName: 'Test', lastName: 'Guest', email: 'guest@example.com', message: 'Two adults on 15 July, please.', ...overrides };
	for (const [id, value] of Object.entries(values)) await page.locator(`#${id}`).fill(value);
	// The server refuses forms sent faster than a person could fill them.
	await page.waitForTimeout(2100);
}

test('contact form sends with JavaScript and says so', async ({ page }) => {
	await page.setExtraHTTPHeaders(ownIp());
	await page.goto('/contact/');
	await fillContact(page);
	await page.getByRole('button', { name: /Send message/ }).click();
	await expect(page.locator('#contact-status')).toContainText('we received your message');
});

test('contact form explains a bad email and points at the field', async ({ page }) => {
	await page.goto('/contact/');
	await fillContact(page, { email: 'not-an-email' });
	await page.getByRole('button', { name: /Send message/ }).click();
	await expect(page.locator('#contact-status')).toContainText('valid email');
	await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
	await expect(page.locator('#email')).toBeFocused();
});

test('the tour and booking-reference fields follow the subject', async ({ page }) => {
	await page.goto('/contact/');
	await expect(page.locator('#tourSlug')).toBeHidden();
	await page.locator('#topic').selectOption('change');
	await expect(page.locator('#tourSlug')).toBeVisible();
	await expect(page.locator('#bookingRef')).toBeVisible();
	await page.locator('#topic').selectOption('press');
	await expect(page.locator('#bookingRef')).toBeHidden();

	await page.goto('/contact/?tour=blue-lagoon-morning');
	await expect(page.locator('#tourSlug')).toHaveValue('blue-lagoon-morning');
});

test('contact form works without JavaScript', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false, extraHTTPHeaders: ownIp() });
	const page = await context.newPage();
	await page.goto('/contact/');
	await expect(page.locator('#bookingRef')).toBeVisible();
	await fillContact(page);
	await page.getByRole('button', { name: /Send message/ }).click();
	await expect(page).toHaveURL(/\/contact\/sent\/$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(/message is on its way/);

	// A mistake only the server catches lands on the problem page, with only a
	// code in the URL. (A malformed email never leaves: the browser checks it.)
	await page.goto('/contact/');
	await fillContact(page, { message: 'Hi' });
	await page.getByRole('button', { name: /Send message/ }).click();
	await expect(page).toHaveURL(/\/contact\/problem\/\?error=message$/);
	await context.close();
});

test('FAQ: counts follow the search, and "Show all questions" resets', async ({ page }) => {
	await page.goto('/faq/');
	await hydrated(page);
	const all = page.getByRole('group', { name: 'FAQ categories' }).getByRole('button', { name: /^All/ });
	const total = Number(await all.locator('.faq__count').innerText());
	await page.getByRole('button', { name: /^Booking/ }).click();
	// The bug this fixes: "All" used to show the selected category's count.
	expect(Number(await all.locator('.faq__count').innerText())).toBe(total);

	await page.getByLabel('Search the FAQ').fill('weather');
	const matches = Number(await all.locator('.faq__count').innerText());
	expect(matches).toBeGreaterThan(0);
	expect(matches).toBeLessThan(total);

	await page.getByLabel('Search the FAQ').fill('zzzz');
	await page.getByRole('button', { name: 'Show all questions' }).click();
	await expect(all).toHaveAttribute('aria-pressed', 'true');
	expect(Number(await all.locator('.faq__count').innerText())).toBe(total);
});

test('FAQ: one answer open per group; no JavaScript shows every answer', async ({ page, browser }) => {
	await page.goto('/faq/');
	await hydrated(page);
	const first = page.getByRole('button', { name: 'What’s included in the price?' });
	const second = page.getByRole('button', { name: 'Do I need to book in advance?' });
	await first.click();
	await second.click();
	await expect(first).toHaveAttribute('aria-expanded', 'false');
	await expect(second).toHaveAttribute('aria-expanded', 'true');

	const context = await browser.newContext({ javaScriptEnabled: false });
	const noJs = await context.newPage();
	await noJs.goto('/faq/');
	await expect(noJs.locator('[data-faq-answer]').first()).toBeVisible();
	await context.close();
});

test('legal pages: the switcher marks the page, the figures match the config', async ({ page }) => {
	await page.goto('/legal/cancellation/');
	await expect(page.getByRole('navigation', { name: 'Legal documents' }).getByRole('link', { name: 'Cancellation policy' })).toHaveAttribute('aria-current', 'page');
	await expect(page.getByRole('navigation', { name: 'On this page' }).getByRole('link').first()).toHaveAttribute('aria-current', 'true');
	await expect(page.locator('main')).toContainText('More than 48 hours before departure');
	await page.goto('/legal/privacy/');
	await expect(page.locator('main')).not.toContainText('Google Analytics');
	await expect(page.locator('main')).toContainText('Resend');
});

test('404 offers a way on', async ({ page }) => {
	const response = await page.goto('/no-such-page/');
	expect(response?.status()).toBe(404);
	await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Browse all tours' })).toBeVisible();
});
