import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * The demo checkout gate (plan W0-A). The Playwright server opens the demo
 * checkout to everyone (DEMO_CHECKOUT=open, playwright.config.ts) so the
 * booking flows can pay. Here each request carries the dev-only header that
 * closes it again, so these tests see what a guest on production sees: no Pay
 * buttons, a refused POST, a booking left awaiting payment, and the admin
 * told once. An admin can switch the demo checkout on for one browser in
 * /admin/tools, and off again.
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

const headers = () => ({ 'x-nf-client-connection-ip': `198.18.1.${Math.floor(Math.random() * 250) + 1}`, ...CLOSED });

/** Starts a draft and books it, as the review page's button does; returns the pay page path. */
async function book(request: APIRequestContext, extra: Record<string, string>): Promise<string> {
	const draft = await request.post('/api/bookings/draft', {
		data: { tourId: TOUR, date: seasonDate(), slot: SLOT, adults: 2, children: 0, infants: 0, firstName: 'Gate', lastName: `Test${Date.now().toString(36)}`, email: 'guest@example.com', phone: '' },
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

test('without demo access a guest cannot pay: no buttons, the POST is refused, the booking waits and the admin is told', async ({ page }) => {
	const extra = headers();
	await page.setExtraHTTPHeaders(extra);
	const payPath = await book(page.request, extra);
	const id = new URL(payPath, ORIGIN).searchParams.get('id') as string;

	await page.goto(payPath);
	await expect(page.locator('#pay-not-open')).toContainText("Online payment isn't open yet.");
	await expect(page.locator('#pay-not-open')).toContainText("We've received your booking and will confirm it by email.");
	await expect(page.getByRole('button', { name: /^Pay €/ })).toHaveCount(0);
	await expect(page.getByText('Demo checkout.')).toHaveCount(0);

	// A hand-made POST (what anyone could send on production) is refused and books nothing.
	for (const outcome of ['success', 'decline']) {
		const res = await page.request.post(payPath, { form: { provider: 'teya', outcome }, maxRedirects: 0, headers: { Origin: ORIGIN, ...extra } });
		expect(res.status(), outcome).toBe(403);
	}
	const success = await page.request.get(`/booking/success/?id=${id}`, { maxRedirects: 0, headers: extra });
	expect(success.status()).toBe(303);
	expect(success.headers().location).toBe(`/booking/pay/?id=${id}`);
	await page.reload();
	await expect(page.locator('#pay-not-open')).toBeVisible();

	// The admin sees it awaiting payment, told once however often the page was opened.
	await adminLogin(page);
	await page.goto(`/admin/bookings/${id}/`);
	await expect(page.locator('main')).toContainText('Awaiting payment');
	const history = page.locator('section[aria-labelledby="history-title"]');
	await expect(history.getByText('Online payment not open yet: confirm with the guest by email')).toHaveCount(1);
	await expect(history).not.toContainText('Invoice');
});

test('an admin can switch the demo checkout on for this browser, pay with it, and switch it off', async ({ page, context }) => {
	const extra = headers();
	await page.setExtraHTTPHeaders(extra);
	await adminLogin(page);

	await page.goto('/admin/tools/');
	await expect(page.locator('#demo-checkout-state')).toHaveText('Off in this browser.');
	await page.getByRole('button', { name: 'Enable demo checkout in this browser' }).click();
	await expect(page.locator('#demo-checkout-state')).toContainText('On in this browser until');
	const cookie = (await context.cookies()).find((c) => c.name === 'hbc_demo');
	expect(cookie?.httpOnly).toBe(true);
	expect(cookie?.sameSite).toBe('Lax');
	expect(cookie?.value).toMatch(/^v1\.\d+\./);

	// With the cookie, the demo checkout works even though the gate is closed for everyone else.
	const payPath = await book(page.request, extra);
	await page.goto(payPath);
	await expect(page.getByText('Demo checkout.')).toBeVisible();
	await page.getByRole('button', { name: /^Pay €/ }).click();
	await expect(page).toHaveURL(/\/booking\/success\/\?id=[0-9a-f-]{36}$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText("You're booked!");

	// Switched off again: back to what guests see.
	await page.goto('/admin/tools/');
	await page.getByRole('button', { name: 'Disable demo checkout in this browser' }).click();
	await expect(page.locator('#demo-checkout-state')).toHaveText('Off in this browser.');
	expect((await context.cookies()).find((c) => c.name === 'hbc_demo')).toBeUndefined();
	const after = await book(page.request, extra);
	await page.goto(after);
	await expect(page.locator('#pay-not-open')).toBeVisible();

	// A forged cookie is worth nothing.
	await context.addCookies([{ name: 'hbc_demo', value: `v1.${Date.now() + 86_400_000}.forged`, url: ORIGIN }]);
	const forged = await book(page.request, extra);
	const refused = await page.request.post(forged, { form: { provider: 'teya', outcome: 'success' }, maxRedirects: 0, headers: { Origin: ORIGIN, ...extra } });
	expect(refused.status()).toBe(403);
});
