import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * Review B1 and S1 (PR W0): a guest who books while online payment isn't open
 * to them waits for staff. The dashboard says how many bookings are waiting
 * and links to them; staff confirm one with "Confirm, pay offline". It is then
 * confirmed without a payment, takes its seats, and the guest's pay link says
 * it's confirmed. Each request carries the dev-only header that closes the
 * demo checkout, as in demo-checkout-gate.spec.ts.
 */

const TOUR = 'blue-lagoon-morning';
const SLOT = '09:30';
const ORIGIN = 'http://localhost:4329';
const CLOSED = { 'x-hbc-demo-checkout': 'closed' };

/** A day in the season (1 March to 31 October), a week or more ahead. */
function seasonDate(): string {
	const d = new Date(Date.now() + 7 * 86_400_000);
	const iso = d.toISOString().slice(0, 10);
	const md = iso.slice(5);
	if (md >= '03-01' && md <= '10-31') return iso;
	return `${md > '10-31' ? d.getUTCFullYear() + 1 : d.getUTCFullYear()}-03-15`;
}

const headers = () => ({ 'x-nf-client-connection-ip': `198.18.2.${Math.floor(Math.random() * 250) + 1}`, ...CLOSED });

/** Starts a draft and books it, as the review page's button does; returns the pay page path. */
async function book(request: APIRequestContext, extra: Record<string, string>, lastName: string): Promise<string> {
	const draft = await request.post('/api/bookings/draft', {
		data: { tourId: TOUR, date: seasonDate(), slot: SLOT, adults: 2, children: 0, infants: 0, firstName: 'Offline', lastName, email: 'guest@example.com', phone: '' },
		headers: { Accept: 'application/json', ...extra },
	});
	expect(draft.status()).toBe(200);
	const html = await (await request.get(`/book/${TOUR}/review/`, { headers: extra })).text();
	const form = {
		termsVersion: html.match(/name="termsVersion" value="([^"]+)"/)?.[1] ?? '',
		draftAt: html.match(/name="draftAt" value="([^"]+)"/)?.[1] ?? '',
	};
	const res = await request.post('/api/bookings', { form, maxRedirects: 0, headers: { Origin: ORIGIN, ...extra } });
	expect(res.status()).toBe(303);
	const location = res.headers().location ?? '';
	expect(location).toMatch(/^\/booking\/pay\/\?id=[0-9a-f-]{36}$/);
	return location;
}

async function adminLogin(page: Page) {
	await page.goto('/admin/login/');
	await page.locator('#password').fill('demo');
	await page.getByRole('button', { name: 'Log in' }).click();
	await expect(page).toHaveURL(/\/admin\/$/);
}

test('staff confirm a booking the guest could not pay online: confirmed, pay offline, seats counted', async ({ page }) => {
	const extra = headers();
	await page.setExtraHTTPHeaders(extra);
	const lastName = `Wait${Date.now().toString(36)}`;
	const payPath = await book(page.request, extra, lastName);
	const id = new URL(payPath, ORIGIN).searchParams.get('id') as string;

	// The guest reaches the pay page: online payment isn't open, so the booking waits for staff.
	await page.goto(payPath);
	await expect(page.locator('#pay-not-open')).toContainText("We've received your booking and will confirm it by email.");

	// The dashboard says bookings are waiting, and links to them (whether or not the hourly email went out).
	await adminLogin(page);
	await expect(page.locator('#waiting-banner')).toContainText('waiting for confirmation');
	await page.locator('#waiting-banner').click();
	await expect(page).toHaveURL(/\/admin\/bookings\/\?show=waiting$/);
	const row = page.locator('a.a-item', { hasText: lastName });
	await expect(row).toContainText('Waiting for confirmation');
	await row.click();
	await expect(page).toHaveURL(new RegExp(`/admin/bookings/${id}/$`));
	await expect(page.locator('#waiting-confirmation')).toBeVisible();

	// Confirm, pay offline: asked first, then done.
	await page.getByText('Confirm, pay offline…').click();
	await expect(page.getByText('Confirm without online payment?')).toBeVisible();
	await page.getByRole('button', { name: 'Yes, confirm booking' }).click();
	await expect(page).toHaveURL(new RegExp(`/admin/bookings/${id}/\\?done=confirm_offline$`));
	await expect(page.getByText('Confirmed. The guest was sent the booking confirmation')).toBeVisible();
	await expect(page.locator('#confirmed-offline')).toContainText('Nothing was charged and no invoice was issued.');
	await expect(page.locator('#waiting-confirmation')).toHaveCount(0);
	const badges = page.locator('.badge-row');
	await expect(badges).toContainText('Confirmed');
	await expect(badges).toContainText('Pay offline');
	const history = page.locator('section[aria-labelledby="history-title"]');
	await expect(history).toContainText('Confirmed without online payment: payment arranged with staff, nothing charged');
	await expect(history).not.toContainText('Invoice');
	await expect(page.locator('section[aria-labelledby="emails-title"]')).toContainText('Your Hello Blue Cave booking confirmation');
	// It can still be cancelled, but never marked refunded: no money moved.
	await expect(page.getByText('Cancel booking…')).toBeVisible();
	await expect(page.getByText('Mark refunded…')).toHaveCount(0);
	await expect(page.getByText('Confirm, pay offline…')).toHaveCount(0);

	// No longer waiting; in the bookings list it is confirmed, pay offline, and its 2 guests count against the departure.
	await page.goto('/admin/bookings/?show=waiting');
	await expect(page.locator('a.a-item', { hasText: lastName })).toHaveCount(0);
	await page.goto(`/admin/bookings/?q=${lastName}`);
	const confirmed = page.locator('a.a-item', { hasText: lastName });
	await expect(confirmed).toContainText('Confirmed');
	await expect(confirmed).toContainText('Pay offline');
	await expect(page.locator('.day-head').first()).toContainText('1 booking · 2 guests');

	// The guest's pay link now says it's confirmed, with nothing to pay.
	await page.goto(payPath);
	await expect(page.locator('#pay-confirmed-offline')).toContainText('Your booking is confirmed.');
	await expect(page.locator('#pay-confirmed-offline')).toContainText('Our team will contact you about payment.');
	await expect(page.getByRole('button', { name: /^Pay €/ })).toHaveCount(0);
});
