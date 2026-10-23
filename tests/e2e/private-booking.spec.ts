import { expect, test, type Page } from '@playwright/test';

/**
 * Private experience paid on the site (plan P): the whole boat at a set price
 * per season, through the group pipeline (sealed cookie → review →
 * /api/bookings → pay). Only Blue Cave is sold this way so far, at its usual
 * departure, with no extras and the Riva as the only listed pick-up (only what
 * the operator's doc states). A pick-up off the list becomes a charter request
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

test('tour page: "Book private experience" leads to the private booking, and a quiet link plans something custom', async ({ page }) => {
	await page.goto(`/tours/${TOUR}/`);
	const book = page.locator('#book').getByRole('link', { name: 'Book private experience' });
	await expect(book).toHaveAttribute('href', `/book/${TOUR}/private/`);
	await expect(page.locator('#book').getByRole('link', { name: 'Something custom? Plan your own' })).toHaveAttribute('href', `/private-charter/?tour=${TOUR}`);
	// The boat's low-season price (operator doc), a constant like the "From" price.
	await expect(page.locator('#book .tour__boat')).toHaveText('Private boat from €1,500');
	const res = await page.goto(`/book/${TOUR}/private/`);
	expect(res?.status()).toBe(200);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(/ as a private experience$/);
});

test('an expired session on a private review goes back to the private step, not the group one', async ({ page }) => {
	const res = await page.request.get(`/book/${TOUR}/review/?flow=private`, { maxRedirects: 0 });
	expect(res.status()).toBe(303);
	expect(res.headers().location).toBe(`/book/${TOUR}/private/?error=session-expired`);
});

test('tours with no boat price yet keep the request: their CTA plans a private experience, and the old step redirects', async ({ page, request }) => {
	await page.goto('/tours/golden-horn-brac-hvar/');
	await expect(page.locator('#book').getByRole('link', { name: 'Plan a private experience' })).toHaveAttribute('href', '/private-charter/?tour=golden-horn-brac-hvar');
	await expect(page.locator('#book .tour__boat')).toHaveCount(0);
	for (const slug of ['golden-horn-brac-hvar', 'blue-lagoon-morning', 'blue-lagoon-afternoon', 'hvar-red-rocks-pakleni', 'dubrovnik-one-way', 'create-perfect-day-private']) {
		const res = await request.get(`/book/${slug}/private/`, { maxRedirects: 0 });
		// Netlify (and astro dev, from a built dist/_redirects) answers with the 301; without a build there's only the 404.
		expect([301, 404], slug).toContain(res.status());
		if (res.status() === 301) {
			const target = new URL(res.headers().location, 'http://localhost');
			expect(target.pathname + target.search, slug).toBe(`/private-charter/?tour=${slug}`);
		}
	}
});

test('book the boat at its usual departure, review, pay: the server prices it', async ({ page }) => {
	await page.setExtraHTTPHeaders(ip());
	await page.goto(`/book/${TOUR}/private/`);
	await hydrated(page);
	// A future day (the 07:20 boat closes at 07:05 today).
	await page.locator('.cal__day:not([aria-disabled])').last().click();
	// No latest departure from the operator yet: the usual time is shown, not chosen; no extras are offered.
	await expect(page.locator('#private-time')).toHaveCount(0);
	await expect(page.locator('.flow__departure')).toContainText('Departure 07:20 (check-in 07:05)');
	await expect(page.getByText('Leave later if you like')).toHaveCount(0);
	await expect(page.getByRole('heading', { name: 'Extras' })).toHaveCount(0);
	await expect(page.getByRole('radio', { name: /Riva stand 14/ })).toBeChecked();
	await page.locator('#private-first').fill('Test');
	await page.locator('#private-last').fill('Guest');
	await page.locator('#private-email').fill('guest@example.com');
	const summary = page.locator('.summary-card-ui');
	await expect(summary).toContainText('07:20');
	await expect(summary).toContainText('Riva stand 14');
	const shown = (await summary.locator('.summary-card-ui__total').innerText()).match(/€(\d+)/)?.[1];
	expect(['1500', '2000']).toContain(shown);
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
	await page.getByRole('radio', { name: /Other location/ }).check();
	await expect(page.getByRole('button', { name: /Send request/ })).toBeVisible();
	await expect(page.locator('.summary-card-ui__total')).toContainText("We'll send you a quote");
	// A request is priced in the quote and needs a day's notice: no cut-off note, no season price line.
	await expect(page.locator('.flow__cutoff')).toHaveText("Requests need a day's notice.");
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

test('the server refuses a tampered time, any extra, a pick-up off the list or an ineligible tour, and prices nothing from the client', async ({ request }) => {
	const post = (overrides: Record<string, unknown>) => request.post('/api/bookings/draft', { data: details(overrides), headers: { Accept: 'application/json', ...ip() } });
	for (const [overrides, field] of [
		[{ slot: '07:35' }, 'slot'],
		[{ slot: '08:30' }, 'slot'],
		[{ extras: ['champagne'] }, 'extras'],
		[{ pickup: 'other' }, 'pickup'],
		[{ pickup: 'helipad' }, 'pickup'],
	] as const) {
		const res = await post(overrides);
		expect(res.status(), JSON.stringify(overrides)).toBe(400);
		expect((await res.json()).errors, JSON.stringify(overrides)).toHaveProperty(field);
	}
	const ineligible = await post({ tourId: 'blue-lagoon-morning', slot: '09:30' });
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
		await expect(form.locator('select[name="slot"]')).toHaveCount(0);
		await expect(form).toContainText('Departure 07:20 (check-in 07:05)');
		await expect(form.getByRole('checkbox')).toHaveCount(0);
		await form.locator('input[name="firstName"]').fill('Plain');
		await form.locator('input[name="lastName"]').fill('Form');
		await form.locator('input[name="email"]').fill('plain@example.com');
		await form.getByRole('button', { name: 'Review booking' }).click();
		await expect(page).toHaveURL(new RegExp(`/book/${TOUR}/review/\\?flow=private$`));
		await expect(page.locator('main')).toContainText('07:20');
		await expect(page.locator('main')).toContainText('Private boat with skipper');
	});
});
