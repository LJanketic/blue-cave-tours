import { expect, test } from '@playwright/test';

// ClickUp Team Board, 4–5 Nov 2026: contact numbers, Instagram, footer, tour sheet.

test('contact page: three numbers for phone and WhatsApp, the first marked fastest, and Instagram', async ({ page }) => {
	await page.goto('/contact/');
	const phone = page.locator('.contact__card--numbers').filter({ hasText: 'Phone' });
	await expect(phone.locator('.contact__number')).toHaveText(['+385 99 472 0697', '+385 98 702 250', '+385 99 389 9994']);
	await expect(phone.locator('.contact__number').first()).toHaveAttribute('href', 'tel:+385994720697');
	await expect(phone.locator('.contact__tag')).toHaveText('Fastest response');
	const whatsapp = page.locator('.contact__card--numbers').filter({ hasText: 'WhatsApp' });
	await expect(whatsapp.locator('.contact__number').nth(2)).toHaveAttribute('href', 'https://wa.me/385993899994');
	await expect(page.locator('a.contact__card[href="https://www.instagram.com/hellobluecave/"]')).toContainText('@hellobluecave');
});

test('footer: Instagram, WhatsApp and the mobile number the operator chose', async ({ page }) => {
	await page.goto('/');
	const contacts = page.locator('.site-footer__contacts a');
	await expect(contacts).toHaveCount(3);
	await expect(contacts.nth(0)).toHaveAttribute('href', 'https://www.instagram.com/hellobluecave/');
	await expect(contacts.nth(1)).toHaveAttribute('href', 'https://wa.me/38598702250');
	await expect(contacts.nth(2)).toHaveAttribute('href', 'tel:+38598702250');
	await expect(page.locator('.site-footer__bottom')).toContainText('OIB 14927048054');
});

test('tour page: the sheet FAQ, ticket price link and the itinerary time labels', async ({ page }) => {
	await page.goto('/tours/blue-cave-hvar-5-islands/');
	await expect(page.getByRole('heading', { level: 2, name: 'Questions about the Blue Cave tour' })).toBeVisible();
	const trigger = page.getByRole('button', { name: 'Is the Blue Cave ticket included?' });
	await expect(trigger).toHaveAttribute('aria-expanded', 'false');
	await trigger.click();
	await expect(trigger).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByText('The entrance ticket is paid on site, and the price changes with the season.')).toBeVisible();
	await expect(page.getByRole('link', { name: /Ticket prices/ })).toHaveAttribute('href', /bluecave-bisevo\.com/);
	await expect(page.locator('.timeline-ui__time')).toContainText(['07:20', '~1.5–2 h']);
	await expect(page.getByRole('link', { name: /More questions\? See all FAQs/ })).toHaveAttribute('href', '/faq/');
});

// ClickUp 6 Nov 2026: "Extras for private" and "Pick up point za private" (prices from Ivan's design).

const privateIp = () => ({ 'x-nf-client-connection-ip': `198.18.2.${Math.floor(Math.random() * 250) + 1}` });
const euros = (text: string) => Number((text.match(/€([\d,]+)/)?.[1] ?? '').replace(/,/g, ''));

test('private pay-now: extras and a listed pick-up are added to the boat price, and the server charges the same', async ({ page }) => {
	await page.setExtraHTTPHeaders(privateIp());
	await page.goto('/book/blue-cave-hvar-5-islands/private/');
	await page.waitForFunction(() => document.querySelectorAll('astro-island[ssr]').length === 0);
	await page.locator('.cal__day:not([aria-disabled])').last().click();
	const total = page.locator('.summary-card-ui__total');
	const boat = euros(await total.innerText());
	expect([1500, 2000]).toContain(boat);

	await expect(page.getByRole('checkbox', { name: /Champagne welcome/ })).toBeVisible();
	await expect(page.getByRole('checkbox', { name: /Seabob/ })).toBeVisible();
	await page.getByRole('checkbox', { name: /Champagne welcome/ }).check();
	await page.getByRole('checkbox', { name: /SUP/ }).check();
	await page.getByRole('radio', { name: /Old Town Waterfront, Trogir/ }).check();
	await expect(page.getByRole('radio', { name: /Hvar Town Waterfront/ })).toBeVisible();
	await expect(total).toContainText(`€${(boat + 40 + 35 + 80).toLocaleString('en-GB')}`);

	await page.locator('#private-first').fill('Test');
	await page.locator('#private-last').fill('Guest');
	await page.locator('#private-email').fill('guest@example.com');
	await page.getByRole('button', { name: /Review booking/ }).click();
	await expect(page).toHaveURL(/\/book\/blue-cave-hvar-5-islands\/review\/\?flow=private$/);
	const main = page.locator('main');
	await expect(main).toContainText('Champagne welcome');
	await expect(main).toContainText('SUP');
	await expect(main).toContainText('Old Town Waterfront, Trogir');
	await expect(page.locator('.review__total')).toContainText(`€${(boat + 155).toLocaleString('en-GB')}`);
});

test('private quote request: a listed pick-up and the extras reach the enquiry by name', async ({ page }) => {
	await page.setExtraHTTPHeaders(privateIp());
	await page.goto('/book/golden-horn-brac-hvar/private/');
	await page.waitForFunction(() => document.querySelectorAll('astro-island[ssr]').length === 0);
	await page.locator('.cal__day:not([aria-disabled])').last().click();
	await page.getByRole('checkbox', { name: /Seabob/ }).check();
	await page.getByRole('radio', { name: /Milna Marina, Brač/ }).check();
	const surname = `Milna${Date.now().toString(36)}`;
	await page.locator('#private-first').fill('Test');
	await page.locator('#private-last').fill(surname);
	await page.locator('#private-email').fill('guest@example.com');
	await page.locator('#private-phone').fill('+385 91 000 0000');
	await page.waitForTimeout(2100); // the request form refuses anything sent within 2 seconds of loading
	await page.getByRole('button', { name: /Send request/ }).click();
	await expect(page).toHaveURL(/\/private-charter\/sent\/$/);

	await page.goto('/admin/login/');
	await page.locator('#password').fill('demo');
	await page.getByRole('button', { name: 'Log in' }).click();
	await expect(page).toHaveURL(/\/admin\/$/);
	await page.goto('/admin/enquiries/');
	const card = page.locator('article.enquiry').filter({ hasText: surname });
	await expect(card).toContainText('Milna Marina, Brač Island');
	await expect(card).toContainText('Seabob');
});
