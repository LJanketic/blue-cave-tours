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
