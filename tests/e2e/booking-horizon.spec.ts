import { expect, test } from '@playwright/test';

/**
 * Booking horizon (W0-B, src/config/season.ts bookableUntil): a season opens
 * for online booking 12 months before it starts. On 23 Nov 2026 the calendar
 * offers up to 31 October 2027 and won't page past October 2027. The server
 * refuses later dates too ('horizon'), whatever the browser sends.
 */

test('the calendar stops at the end of the latest open season', async ({ page }) => {
	await page.clock.setFixedTime(new Date('2026-11-23T10:00:00Z'));
	await page.goto('/book/blue-lagoon-morning/group/');
	await page.waitForFunction(() => document.querySelectorAll('astro-island[ssr]').length === 0);
	const next = page.getByRole('button', { name: 'Next month' });
	// Page forward to the last month the calendar allows.
	for (let i = 0; i < 24 && (await next.getAttribute('aria-disabled')) !== 'true'; i++) await next.click();
	await expect(page.getByRole('paragraph').filter({ hasText: 'October 2027' })).toBeVisible();
	await expect(next).toHaveAttribute('aria-disabled', 'true');
	await expect(page.locator('.cal__day[aria-label^="Sunday, 31 October 2027"]')).not.toHaveAttribute('aria-disabled', 'true');
	// A click on the disabled button (forced: Playwright won't click a disabled control) leaves the month alone.
	await next.click({ force: true });
	await expect(page.getByRole('paragraph').filter({ hasText: 'October 2027' })).toBeVisible();
	await expect(page.getByRole('paragraph').filter({ hasText: 'November 2027' })).toHaveCount(0);
});

test('the server refuses a date past the horizon', async ({ request }) => {
	const res = await request.post('/api/bookings/draft', {
		data: { tourId: 'blue-lagoon-morning', date: '2029-07-15', slot: '09:30', adults: 2, firstName: 'Test', lastName: 'Guest', email: 'guest@example.com' },
		headers: { Accept: 'application/json', 'x-nf-client-connection-ip': `198.18.1.${Math.floor(Math.random() * 250) + 1}` },
	});
	expect(res.status()).toBe(400);
	expect((await res.json()).code).toBe('horizon');
});
