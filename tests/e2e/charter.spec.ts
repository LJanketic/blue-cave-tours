import { expect, test, type Page } from '@playwright/test';

/**
 * Private charter (spec §8.2): the customer sends a request, the boss sends a
 * quote from the admin, the customer pays it on the demo checkout, and the
 * admin shows a paid private charter. Email stays in the outbox (the dev
 * server runs with sending off).
 */

const ip = () => ({ 'x-nf-client-connection-ip': `198.19.0.${Math.floor(Math.random() * 250) + 1}` });
const hydrated = (page: Page) => page.waitForFunction(() => document.querySelectorAll('astro-island[ssr]').length === 0);

async function adminLogin(page: Page) {
	await page.goto('/admin/login/');
	await page.locator('#password').fill('demo');
	await page.getByRole('button', { name: 'Log in' }).click();
	await expect(page).toHaveURL(/\/admin\/$/);
}

test('request, quote, pay: a private charter from start to finish', async ({ page }) => {
	await page.setExtraHTTPHeaders(ip());
	const surname = `Charter${Date.now().toString(36)}`;

	// Customer: the Blue Lagoon afternoon tour preselects the Blue Lagoon route and its usual departure.
	await page.goto('/private-charter/?tour=blue-lagoon-afternoon');
	await hydrated(page);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Plan your private charter');
	await expect(page.getByRole('radio', { name: /Blue Lagoon & Trogir/ })).toBeChecked();
	// The afternoon tour's own departure, not the morning's (the route's usual one).
	await expect(page.locator('#charter-time')).toHaveValue('14:30');
	await expect(page.locator('#charter-duration')).toHaveValue('4');
	// A charter needs a day's notice: today is greyed out.
	await expect(page.locator('.cal__day[aria-current="date"]')).toHaveAttribute('aria-disabled', 'true');
	await page.locator('.cal__day:not([aria-disabled])').nth(3).click();
	await page.locator('#charter-time').fill('11:30');
	await page.getByRole('button', { name: 'More adults' }).click();
	await page.locator('#charter-notes').fill('A birthday on board');
	await page.locator('#charter-first').fill('Test');
	await page.locator('#charter-last').fill(surname);
	await page.locator('#charter-email').fill('guest@example.com');
	await page.locator('#charter-phone').fill('+385 91 000 0000');
	await expect(page.locator('.summary-card-ui')).toContainText('11:30');
	await expect(page.locator('.summary-card-ui')).toContainText("We'll send you a quote");
	await page.waitForTimeout(2100); // the form refuses anything sent within 2 seconds of loading
	await page.getByRole('button', { name: /Send request/ }).click();
	await expect(page.getByRole('heading', { name: 'Request received' })).toBeFocused();
	await expect(page.locator('main')).toContainText('guest@example.com');

	// Boss: the request is in Enquiries with its details, quoted from there.
	await adminLogin(page);
	await page.goto('/admin/enquiries/');
	const card = page.locator('article.enquiry').filter({ hasText: surname });
	await expect(card).toContainText('Blue Lagoon & Trogir');
	await expect(card).toContainText('3 adults');
	await expect(card).toContainText('11:30');
	await expect(card).toContainText('A birthday on board');
	await card.locator('input[name="price"]').fill('750');
	await card.getByRole('button', { name: /Email the quote/ }).click();
	await expect(page.getByRole('status')).toContainText('Quote sent');
	const quoted = page.locator('article.enquiry').filter({ hasText: surname });
	await expect(quoted).toContainText('Quote €750 sent, awaiting payment');
	const bookingHref = await quoted.locator('.quote-state a').getAttribute('href');
	const id = bookingHref?.match(/[0-9a-f-]{36}/)?.[0];
	expect(id).toBeTruthy();

	// The quote email is in the outbox with the pay link.
	await page.goto('/admin/emails/');
	await expect(page.locator('main')).toContainText('Your private charter quote');

	// Customer: pays from the link. Terms must be accepted here (no review step).
	await page.goto(`/booking/pay/?id=${id}`);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your private charter quote');
	await expect(page.locator('.step-bar-ui')).toHaveCount(0);
	await expect(page.locator('main')).toContainText('Quote valid until');
	await page.getByRole('checkbox', { name: /I accept the terms/ }).check();
	await page.getByRole('button', { name: 'Pay €750' }).click();
	await expect(page).toHaveURL(/\/booking\/success\/\?id=/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText("You're booked!");
	await expect(page.locator('main')).toContainText('Your charter');

	// Boss: a paid private charter, and the request shows it.
	await page.goto(`/admin/bookings/${id}/`);
	await expect(page.locator('main')).toContainText('Private charter');
	await expect(page.locator('main')).toContainText('Paid');
	await page.goto('/admin/enquiries/?show=all');
	await expect(page.locator('article.enquiry').filter({ hasText: surname })).toContainText('Paid €750');
});

test('the morning Blue Lagoon tour suggests its own departure', async ({ page }) => {
	await page.goto('/private-charter/?tour=blue-lagoon-morning');
	await hydrated(page);
	await expect(page.getByRole('radio', { name: /Blue Lagoon & Trogir/ })).toBeChecked();
	await expect(page.locator('#charter-time')).toHaveValue('09:30');
});

test('every "Plan a private experience" button leads to the charter page', async ({ page }) => {
	await page.goto('/tours/golden-horn-brac-hvar/');
	const link = page.getByRole('link', { name: /Plan a private experience/ }).first();
	await expect(link).toHaveAttribute('href', '/private-charter/?tour=golden-horn-brac-hvar');
	await link.click();
	await hydrated(page);
	await expect(page.getByRole('radio', { name: /Golden Horn & Hvar/ })).toBeChecked();
});

test('the old private booking step redirects to the charter page', async ({ request }) => {
	const res = await request.get('/book/blue-cave-hvar-5-islands/private/', { maxRedirects: 0 });
	// The dev server doesn't read Netlify's _redirects; the rule's target is checked instead.
	test.skip(res.status() === 404, 'redirects are applied by Netlify, not astro dev');
	const target = new URL(res.headers().location, 'http://localhost');
	expect(target.pathname + target.search).toBe('/private-charter/?tour=blue-cave-hvar-5-islands');
});

test('the button says what is missing and sends nothing until then', async ({ page }) => {
	await page.goto('/private-charter/');
	await hydrated(page);
	await expect(page.getByRole('radio', { name: /Your own route/ })).toBeChecked();
	// aria-disabled, not disabled: it stays focusable and says why (Playwright needs force to click it).
	await page.getByRole('button', { name: /Send request/ }).click({ force: true });
	await expect(page.locator('#charter-hint')).toContainText('a date');
	await expect(page.locator('#charter-hint')).toContainText('your phone number');
	await expect(page.getByRole('heading', { name: 'Request received' })).toHaveCount(0);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('the plain form sends a request and lands on the sent page', async ({ page }) => {
		await page.setExtraHTTPHeaders(ip());
		await page.goto('/private-charter/');
		const form = page.locator('form.no-js');
		await expect(form).toBeVisible();
		// Ten days ahead in Split, where the server checks "from tomorrow on".
		const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zagreb' }).format(new Date(Date.now() + 10 * 86_400_000));
		await form.locator('select[name="route"]').selectOption('hvar-red-rocks-pakleni');
		await form.locator('input[name="date"]').fill(date);
		await form.locator('input[name="firstName"]').fill('Plain');
		await form.locator('input[name="lastName"]').fill('Form');
		await form.locator('input[name="email"]').fill('plain@example.com');
		await form.locator('input[name="phone"]').fill('+385 91 000 0001');
		await form.getByRole('button', { name: 'Send request' }).click();
		await expect(page).toHaveURL(/\/private-charter\/sent\/$/);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Request received');
	});
});
