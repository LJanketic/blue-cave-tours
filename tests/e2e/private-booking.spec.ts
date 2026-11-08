import { expect, test, type Page } from '@playwright/test';

/**
 * Private experience paid on the site (plan P): the whole boat at a set price
 * per season, through the group pipeline (sealed cookie → review →
 * /api/bookings → pay). Since Mare's answers of 8 Nov 2026 every fixed-route
 * private tour is sold this way at €1,200 a boat, from its usual departure up
 * to 11:00, with the extras and pick-up points of ClickUp 6 Nov 2026 (prices
 * from Ivan's design). A pick-up off the list becomes a charter request
 * instead. The server prices everything and checks the time, extras and
 * pick-up against its own lists. Email stays in the outbox (the dev server
 * runs with sending off).
 */

const TOUR = 'blue-cave-hvar-5-islands';
const ip = () => ({ 'x-nf-client-connection-ip': `198.18.1.${Math.floor(Math.random() * 250) + 1}` });
const hydrated = (page: Page) => page.waitForFunction(() => document.querySelectorAll('astro-island[ssr]').length === 0);

/** A day in the season (1 March to 31 October), a week or more ahead. */
function seasonDate(): string {
	const d = new Date(Date.now() + 7 * 86_400_000);
	const iso = d.toISOString().slice(0, 10);
	const md = iso.slice(5);
	if (md >= '03-01' && md <= '10-31') return iso;
	return `${md > '10-31' ? d.getUTCFullYear() + 1 : d.getUTCFullYear()}-03-15`;
}

const details = (overrides: Record<string, unknown> = {}) => ({
	kind: 'private',
	tourId: TOUR,
	date: seasonDate(),
	slot: '07:20',
	adults: 4,
	children: 0,
	infants: 0,
	extras: [],
	pickup: 'riva',
	firstName: 'Test',
	lastName: 'Guest',
	email: 'guest@example.com',
	...overrides,
});

test('tour page: "Private experience" leads to the private booking and shows the boat price', async ({ page }) => {
	await page.goto(`/tours/${TOUR}/`);
	const book = page.locator('#book').getByRole('link', { name: /^Private experience/ });
	await expect(book).toHaveAttribute('href', `/book/${TOUR}/private/`);
	// The boat's low-season price (Mare, 8 Nov 2026), a constant like the "From" price.
	await expect(book.locator('.tour__cta-price')).toHaveText('€1,200 / boat');
	// The card is the design's: one cancellation line, no fee line, no custom-request link (C4).
	await expect(page.locator('#book .tour__policy')).toHaveText('Free cancellation up to 48h before');
	await expect(page.locator('#book').getByRole('link', { name: /Something custom/ })).toHaveCount(0);
	await expect(page.locator('#book .tour__fee')).toHaveCount(0);
	const res = await page.goto(`/book/${TOUR}/private/`);
	expect(res?.status()).toBe(200);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(/ as a private experience$/);
});

test('an expired session on a private review goes back to the private step, not the group one', async ({ page }) => {
	const res = await page.request.get(`/book/${TOUR}/review/?flow=private`, { maxRedirects: 0 });
	expect(res.status()).toBe(303);
	expect(res.headers().location).toBe(`/book/${TOUR}/private/?error=session-expired`);
});

test('every fixed-route tour pays for its private boat now: the CTA shows €1,200 and the step ends in "Review booking"', async ({ page, request }) => {
	await page.goto('/tours/golden-horn-brac-hvar/');
	const cta = page.locator('#book').getByRole('link', { name: /^Private experience/ });
	await expect(cta).toHaveAttribute('href', '/book/golden-horn-brac-hvar/private/');
	await expect(cta.locator('.tour__cta-price')).toHaveText('€1,200 / boat');
	for (const slug of ['golden-horn-brac-hvar', 'blue-lagoon-morning', 'blue-lagoon-afternoon', 'hvar-red-rocks-pakleni', 'dubrovnik-one-way']) {
		const res = await request.get(`/book/${slug}/private/`, { maxRedirects: 0 });
		expect(res.status(), slug).toBe(200);
		const html = await res.text();
		expect(html, slug).toContain('Review booking');
		expect(html, slug).not.toContain('Send request');
	}
	// The private-only charter landing has no private step: planned through the charter page.
	const res = await request.get('/book/create-perfect-day-private/private/', { maxRedirects: 0 });
	// Netlify (and astro dev, from a built dist/_redirects) answers with the 301; without a build there's only the 404.
	expect([301, 404]).toContain(res.status());
	if (res.status() === 301) {
		const target = new URL(res.headers().location, 'http://localhost');
		expect(target.pathname + target.search).toBe('/private-charter/?tour=create-perfect-day-private');
	}
});

test('Golden Horn private: departures from 09:00 up to 11:00, €1,200 for the boat, on to the review', async ({ page }) => {
	await page.setExtraHTTPHeaders(ip());
	await page.goto('/book/golden-horn-brac-hvar/private/');
	await hydrated(page);
	await expect(page.getByRole('button', { name: /Send request/ })).toHaveCount(0);
	await page.locator('.cal__day:not([aria-disabled])').last().click();
	const time = page.locator('#private-time');
	await expect(time.locator('option')).toHaveText(['09:00 (usual departure)', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00']);
	await time.selectOption('10:30');
	const summary = page.locator('.summary-card-ui');
	await expect(summary).toContainText('10:30');
	await expect(summary.locator('.summary-card-ui__total')).toContainText('€1,200');
	await page.locator('#private-first').fill('Test');
	await page.locator('#private-last').fill('Guest');
	await page.locator('#private-email').fill('guest@example.com');
	await page.getByRole('button', { name: /Review booking/ }).click();
	await expect(page).toHaveURL(/\/book\/golden-horn-brac-hvar\/review\/\?flow=private$/);
	await expect(page.locator('main')).toContainText('10:30');
	await expect(page.locator('.review__total')).toContainText('€1,200');
});

test('Red Rocks (private only) offers 09:00 up to 11:00 instead of a free time, and pays now', async ({ page }) => {
	await page.goto('/book/hvar-red-rocks-pakleni/private/');
	await hydrated(page);
	await page.locator('.cal__day:not([aria-disabled])').last().click();
	const time = page.locator('#private-time');
	await expect(time.locator('option').first()).toHaveText('09:00 (usual departure)');
	await expect(time.locator('option').last()).toHaveText('11:00');
	await expect(page.locator('.summary-card-ui__total')).toContainText('€1,200');
	await expect(page.getByRole('button', { name: /Review booking/ })).toBeVisible();
});

test('book the boat at its usual departure, review, pay: the server prices it', async ({ page }) => {
	await page.setExtraHTTPHeaders(ip());
	await page.goto(`/book/${TOUR}/private/`);
	await hydrated(page);
	// A future day (the 07:20 boat closes at 07:05 today).
	await page.locator('.cal__day:not([aria-disabled])').last().click();
	// The usual time is chosen, and the guest may leave later, up to 11:00 (Mare, 8 Nov 2026). Extras are optional.
	await expect(page.locator('#private-time')).toHaveValue('07:20');
	await expect(page.getByText('Leave later if you like, up to 11:00')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Extras' })).toBeVisible();
	// Board 05: the pick-up is a dropdown, the Riva chosen and included.
	await expect(page.locator('#private-pickup')).toHaveValue('riva');
	await expect(page.locator('#private-pickup-hint')).toHaveText('Meeting point included in the price.');
	await page.locator('#private-first').fill('Test');
	await page.locator('#private-last').fill('Guest');
	await page.locator('#private-email').fill('guest@example.com');
	const summary = page.locator('.summary-card-ui');
	await expect(summary).toContainText('07:20');
	await expect(summary).toContainText('Riva Waterfront (Stand 14), Split');
	// Amounts are grouped en-GB, as on the tour card: "€1,200".
	const shown = (await summary.locator('.summary-card-ui__total').innerText()).match(/€([\d,]+)/)?.[1] ?? '';
	expect(shown).toBe('1,200');
	await page.getByRole('button', { name: /Review booking/ }).click();

	await expect(page).toHaveURL(new RegExp(`/book/${TOUR}/review/\\?flow=private$`));
	await expect(page.getByText('Private experience', { exact: true })).toBeVisible();
	const main = page.locator('main');
	await expect(main).toContainText('07:20');
	await expect(main).toContainText('Private boat with skipper');
	await expect(main).toContainText('Private experiences have their own cancellation terms');
	await expect(page.locator('.review__total')).toContainText(`€${shown}`);
	await page.getByRole('button', { name: /Continue to payment/ }).click();

	// Pay: a booking, not a quote. The terms were accepted on the review page.
	await expect(page).toHaveURL(/\/booking\/pay\/\?id=[0-9a-f-]{36}$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Payment');
	await expect(page.locator('.step-bar-ui')).toHaveCount(1);
	await expect(page.getByRole('checkbox', { name: /I accept the terms/ })).toHaveCount(0);
	await expect(main).not.toContainText('Quote valid until');
	await page.getByRole('button', { name: `Pay €${shown}` }).click();
	await expect(page).toHaveURL(/\/booking\/success\/\?id=/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText("You're booked!");
	await expect(main).toContainText('Your private experience');
	await expect(main).toContainText('Riva promenade, stand 14');
});

test('"Other location" turns the booking into a request for a quote', async ({ page }) => {
	await page.setExtraHTTPHeaders(ip());
	await page.goto(`/book/${TOUR}/private/`);
	await hydrated(page);
	await page.locator('#private-pickup').selectOption('other');
	await expect(page.getByRole('button', { name: /Send request/ })).toBeVisible();
	await expect(page.locator('.summary-card-ui__total')).toContainText("We'll send you a quote");
	// A request is priced in the quote: no cut-off note under the calendar, no season price line.
	await expect(page.locator('.flow__cutoff')).toHaveCount(0);
	await expect(page.locator('.summary-card-ui')).not.toContainText('season price');
	// A request needs a day's notice: today is greyed out.
	const today = page.locator('.cal__day[aria-current="date"]');
	if (await today.count()) await expect(today).toHaveAttribute('aria-disabled', 'true');
	await page.locator('.cal__day:not([aria-disabled])').last().click();
	await page.locator('#private-pickup-place').fill('Villa Test, Podstrana');
	const surname = `Pickup${Date.now().toString(36)}`;
	await page.locator('#private-first').fill('Test');
	await page.locator('#private-last').fill(surname);
	await page.locator('#private-email').fill('guest@example.com');
	// The request needs a phone: the button says so until it's there.
	await page.getByRole('button', { name: /Send request/ }).click({ force: true });
	await expect(page.locator('#private-hint')).toContainText('your phone number');
	await page.locator('#private-phone').fill('+385 91 000 0000');
	await page.waitForTimeout(2100); // the request form refuses anything sent within 2 seconds of loading
	await page.getByRole('button', { name: /Send request/ }).click();
	await expect(page).toHaveURL(/\/private-charter\/sent\/$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Request received');

	// Boss: the request is in Enquiries with the route and the pick-up place.
	await page.goto('/admin/login/');
	await page.locator('#password').fill('demo');
	await page.getByRole('button', { name: 'Log in' }).click();
	await expect(page).toHaveURL(/\/admin\/$/);
	await page.goto('/admin/enquiries/');
	const card = page.locator('article.enquiry').filter({ hasText: surname });
	await expect(card).toContainText('Blue Cave & Hvar 5 Islands');
	await expect(card).toContainText('Villa Test, Podstrana');
	await expect(card).toContainText('07:20');
});

test('the server refuses a tampered time, an unknown extra, a pick-up off the list or an ineligible tour, and prices nothing from the client', async ({ request }) => {
	const post = (overrides: Record<string, unknown>) => request.post('/api/bookings/draft', { data: details(overrides), headers: { Accept: 'application/json', ...ip() } });
	for (const [overrides, field] of [
		[{ slot: '07:30' }, 'slot'],
		[{ slot: '11:15' }, 'slot'],
		[{ extras: ['helicopter'] }, 'extras'],
		[{ extras: ['champagne', 'champagne'] }, 'extras'],
		[{ pickup: 'other' }, 'pickup'],
		[{ pickup: 'helipad' }, 'pickup'],
	] as const) {
		const res = await post(overrides);
		expect(res.status(), JSON.stringify(overrides)).toBe(400);
		expect((await res.json()).errors, JSON.stringify(overrides)).toHaveProperty(field);
	}
	const ineligible = await post({ tourId: 'create-perfect-day-private', slot: '09:30' });
	expect(ineligible.status()).toBe(400);
	expect((await ineligible.json()).code).toBe('private');
	const ok = await post({ total: 1 });
	expect(ok.status()).toBe(200);
	expect(await ok.json()).toEqual({ redirect: `/book/${TOUR}/review/?flow=private` });
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('the plain form books the boat at its usual time and lands on the review page', async ({ page }) => {
		await page.setExtraHTTPHeaders(ip());
		await page.goto(`/book/${TOUR}/private/`);
		const form = page.locator('form.no-js');
		await expect(form).toBeVisible();
		await form.locator('input[name="date"]').fill(seasonDate());
		// The usual time is first; later ones up to 11:00 are offered too (Mare, 8 Nov 2026).
		await expect(form.locator('select[name="slot"]')).toHaveValue('07:20');
		await expect(form.locator('select[name="slot"] option').last()).toHaveText('11:00');
		// The extras are offered, unticked: the boat alone is booked.
		await expect(form.getByRole('checkbox')).toHaveCount(3);
		await form.locator('input[name="firstName"]').fill('Plain');
		await form.locator('input[name="lastName"]').fill('Form');
		await form.locator('input[name="email"]').fill('plain@example.com');
		await form.getByRole('button', { name: 'Review booking' }).click();
		await expect(page).toHaveURL(new RegExp(`/book/${TOUR}/review/\\?flow=private$`));
		await expect(page.locator('main')).toContainText('07:20');
		await expect(page.locator('main')).toContainText('Private boat with skipper');
	});
});
