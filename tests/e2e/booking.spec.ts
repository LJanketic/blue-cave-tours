import { expect, test, type APIRequestContext } from '@playwright/test';

/**
 * Group booking server (spec §8.1.6): the sealed booking cookie, the draft
 * endpoint, /api/bookings and the redirects. No personal data may appear in
 * any URL (S-2), and every POST checks its Origin (S-9).
 */

const TOUR = 'blue-lagoon-morning';
const SLOT = '09:30';

/** A day in the season (1 March to 31 October), a week or more ahead. */
function seasonDate(): string {
	const d = new Date(Date.now() + 7 * 86_400_000);
	const iso = d.toISOString().slice(0, 10);
	const md = iso.slice(5);
	if (md >= '03-01' && md <= '10-31') return iso;
	return `${md > '10-31' ? d.getUTCFullYear() + 1 : d.getUTCFullYear()}-03-15`;
}

const details = (overrides: Record<string, string | number> = {}) => ({
	tourId: TOUR,
	date: seasonDate(),
	slot: SLOT,
	adults: 2,
	children: 1,
	infants: 1,
	firstName: 'Test',
	lastName: 'Guest',
	email: 'guest@example.com',
	phone: '+385 91 000 0000',
	notes: 'Late arrival possible',
	...overrides,
});

const PERSONAL = /@|Test|Guest|firstName|email|phone|notes|\+385/;
const ip = () => ({ 'x-nf-client-connection-ip': `198.18.0.${Math.floor(Math.random() * 250) + 1}` });

async function startDraft(request: APIRequestContext, overrides = {}) {
	return request.post('/api/bookings/draft', { data: details(overrides), headers: { Accept: 'application/json', ...ip() } });
}

test('a full booking: details stay out of every URL, and the cookie goes at the end', async ({ page, context }) => {
	await page.setExtraHTTPHeaders(ip());
	const draft = await startDraft(page.request);
	expect(draft.status()).toBe(200);
	expect(await draft.json()).toEqual({ redirect: `/book/${TOUR}/review/` });
	const cookie = (await context.cookies()).find((c) => c.name === 'hbc_booking');
	expect(cookie?.httpOnly).toBe(true);
	expect(cookie?.sameSite).toBe('Strict');
	expect(cookie?.value).not.toMatch(PERSONAL);

	const urls: string[] = [];
	page.on('framenavigated', (frame) => urls.push(frame.url()));
	await page.goto(`/book/${TOUR}/review/`);
	await expect(page.locator('main')).toContainText('guest@example.com');
	await expect(page.locator('main')).toContainText('Infants');
	await page.getByRole('button', { name: /Continue to payment/ }).click();
	await expect(page).toHaveURL(/\/booking\/pay\/\?id=[0-9a-f-]{36}$/);
	await page.getByRole('button', { name: /^Pay €/ }).click();
	await expect(page).toHaveURL(/\/booking\/success\/\?id=[0-9a-f-]{36}$/);
	// S-3: the confirmation page shows no name, phone or notes, and a masked email.
	await expect(page.getByRole('heading', { level: 1 })).toHaveText("You're booked!");
	const text = await page.locator('main').innerText();
	expect(text).not.toMatch(/\bTest\b|\bGuest\b|guest@example\.com|\+385 91 000|Late arrival/);

	for (const url of urls) expect(new URL(url).search, url).not.toMatch(PERSONAL);
	expect((await context.cookies()).find((c) => c.name === 'hbc_booking')).toBeUndefined();
});

test('submitting twice goes to the same booking', async ({ page }) => {
	await page.setExtraHTTPHeaders(ip());
	await startDraft(page.request);
	const first = await page.request.post('/api/bookings', { form: await reviewForm(page.request), maxRedirects: 0, headers: { Origin: baseOrigin(page.url() || 'http://localhost:4329') } });
	const second = await page.request.post('/api/bookings', { form: await reviewForm(page.request), maxRedirects: 0, headers: { Origin: baseOrigin('http://localhost:4329') } });
	expect(first.status()).toBe(303);
	expect(second.headers().location).toBe(first.headers().location);
});

test('changed terms send the customer back to review them', async ({ page }) => {
	await page.setExtraHTTPHeaders(ip());
	await startDraft(page.request);
	const res = await page.request.post('/api/bookings', { form: { ...(await reviewForm(page.request)), termsVersion: '1999-01-01' }, maxRedirects: 0, headers: { Origin: 'http://localhost:4329' } });
	expect(res.status()).toBe(303);
	expect(res.headers().location).toBe(`/book/${TOUR}/review/?error=terms-changed`);
});

test('a review page for a draft another tab has replaced books nothing, and shows the new one', async ({ page }) => {
	await page.setExtraHTTPHeaders(ip());
	await startDraft(page.request);
	const stale = await reviewForm(page.request);
	// Another tab starts again (a new draft, a new stamp) before this one confirms.
	await new Promise((resolve) => setTimeout(resolve, 5));
	await startDraft(page.request, { adults: 3 });
	const res = await page.request.post('/api/bookings', { form: stale, maxRedirects: 0, headers: { Origin: 'http://localhost:4329' } });
	expect(res.status()).toBe(303);
	expect(res.headers().location).toBe(`/book/${TOUR}/review/?error=draft-changed`);
	const fresh = await page.request.post('/api/bookings', { form: await reviewForm(page.request), maxRedirects: 0, headers: { Origin: 'http://localhost:4329' } });
	expect(fresh.headers().location).toMatch(/^\/booking\/pay\/\?id=/);
});

test('the draft endpoint refuses bad input with a code only, and other content types with 415', async ({ request }) => {
	const bad = await request.post('/api/bookings/draft', {
		form: Object.fromEntries(Object.entries(details({ adults: 12, children: 2, infants: 1 })).map(([k, v]) => [k, String(v)])),
		maxRedirects: 0,
		headers: { Origin: 'http://localhost:4329', ...ip() },
	});
	expect(bad.status()).toBe(303);
	expect(bad.headers().location).toBe(`/book/${TOUR}/group/?error=guests`);
	expect(bad.headers().location).not.toMatch(PERSONAL);

	const json = await startDraft(request, { slot: '06:00' });
	expect(json.status()).toBe(400);
	expect((await json.json()).errors).toHaveProperty('slot');

	// The boats are out of the water from 1 November to the end of February: a winter date is refused; March is open.
	const nextYear = new Date().getUTCFullYear() + 1;
	const winter = await startDraft(request, { date: `${nextYear}-01-15` });
	expect(winter.status()).toBe(400);
	expect((await winter.json()).errors).toHaveProperty('date');
	const march = await startDraft(request, { date: `${nextYear}-03-15` });
	expect(march.status()).toBe(200);

	const text = await request.post('/api/bookings/draft', { data: 'hello', headers: { 'Content-Type': 'text/plain', ...ip() } });
	expect([403, 415]).toContain(text.status());
});

test('the review page needs the cookie, and ignores details in the URL', async ({ page }) => {
	const res = await page.request.get(`/book/${TOUR}/review/?firstName=Eve&email=eve@example.com&date=2027-07-01&adults=2`, { maxRedirects: 0 });
	expect(res.status()).toBe(303);
	expect(res.headers().location).toBe(`/book/${TOUR}/group/?error=session-expired`);
});

test('cross-site posts are refused (S-9)', async ({ request }) => {
	for (const path of ['/api/bookings', '/api/bookings/draft', '/api/contact', '/booking/pay/?id=00000000-0000-0000-0000-000000000000']) {
		const res = await request.post(path, { form: { a: 'b' }, headers: { Origin: 'https://evil.example' }, maxRedirects: 0 });
		expect(res.status(), path).toBe(403);
	}
});

test('the booking cookie prefills step 2 when coming back to edit', async ({ page }) => {
	await page.setExtraHTTPHeaders(ip());
	await startDraft(page.request);
	await page.goto(`/book/${TOUR}/group/`);
	await expect(page.locator('#book-first')).toHaveValue('Test');
	await expect(page.locator('#book-email')).toHaveValue('guest@example.com');
});

/** What the review page's form posts: the terms version and the stamp of the draft it shows. */
async function reviewForm(request: APIRequestContext): Promise<{ termsVersion: string; draftAt: string }> {
	const html = await (await request.get(`/book/${TOUR}/review/`)).text();
	return {
		termsVersion: html.match(/name="termsVersion" value="([^"]+)"/)?.[1] ?? '',
		draftAt: html.match(/name="draftAt" value="([^"]+)"/)?.[1] ?? '',
	};
}

function baseOrigin(url: string): string {
	return new URL(url.startsWith('http') ? url : 'http://localhost:4329').origin;
}

test('step 2 in the browser: pick a day, fill in, review', async ({ page }) => {
	await page.setExtraHTTPHeaders(ip());
	await page.goto(`/book/${TOUR}/group/`);
	await page.waitForFunction(() => document.querySelectorAll('astro-island[ssr]').length === 0);
	// The calendar opens on the first month with a bookable day (March, out of season).
	await page.locator('.cal__day:not([aria-disabled])').last().click();
	const slot = page.getByRole('radio', { name: new RegExp(SLOT) });
	if (await slot.count()) await slot.check();
	await page.locator('#book-first').fill('Test');
	await page.locator('#book-last').fill('Guest');
	await page.locator('#book-email').fill('guest@example.com');
	await page.getByRole('button', { name: /Review booking/ }).click();
	await expect(page).toHaveURL(new RegExp(`/book/${TOUR}/review/$`));
	await expect(page.locator('main')).toContainText('guest@example.com');
});

test("step 2 closes today's departure 15 minutes before it leaves (Split time)", async ({ page }) => {
	// 15 Jul 2027 in Split (UTC+2): booking for the 09:30 boat closes at 09:15.
	for (const [utc, closed] of [['2027-07-15T07:14:00Z', false], ['2027-07-15T07:15:00Z', true]] as const) {
		await page.clock.setFixedTime(new Date(utc));
		await page.goto(`/book/${TOUR}/group/`);
		await page.waitForFunction(() => document.querySelectorAll('astro-island[ssr]').length === 0);
		await expect(page.getByRole('paragraph').filter({ hasText: 'July 2027' })).toBeVisible();
		const today = page.locator('.cal__day[aria-current="date"]');
		await expect(today).toHaveAccessibleName(/15 July 2027/);
		if (closed) {
			await expect(today).toHaveAttribute('aria-disabled', 'true');
			await expect(today).toHaveAccessibleName(/booking closed for today/);
		} else {
			await expect(today).not.toHaveAttribute('aria-disabled', 'true');
		}
		await expect(page.locator('.cal__day[aria-label*="14 July 2027"]')).toHaveAttribute('aria-disabled', 'true');
	}
});

test('out of season, step 2 opens the calendar on March, the first month with bookable days', async ({ page }) => {
	// 10 Nov 2026: the boats are out of the water until the end of February.
	await page.clock.setFixedTime(new Date('2026-11-10T10:00:00Z'));
	await page.goto(`/book/${TOUR}/group/`);
	await page.waitForFunction(() => document.querySelectorAll('astro-island[ssr]').length === 0);
	await expect(page.getByRole('paragraph').filter({ hasText: 'March 2027' })).toBeVisible();
	await expect(page.locator('.cal__day:not([aria-disabled])').first()).toHaveAccessibleName(/1 March 2027/);
	await page.getByRole('button', { name: 'Previous month' }).click();
	await expect(page.locator('.cal__day[aria-label*="28 February 2027"]')).toHaveAccessibleName(/outside the season/);
	await expect(page.locator('.cal__day[aria-label*="28 February 2027"]')).toHaveAttribute('aria-disabled', 'true');
});

test('step 2 without JavaScript: the plain form posts to the draft endpoint', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false, extraHTTPHeaders: ip() });
	const page = await context.newPage();
	await page.goto(`/book/${TOUR}/group/`);
	const form = page.locator('form.no-js');
	await expect(form).toBeVisible();
	await form.locator('input[name="date"]').fill(seasonDate());
	const slot = form.locator('select[name="slot"]');
	if (await slot.count()) await slot.selectOption(SLOT);
	await form.locator('input[name="firstName"]').fill('Test');
	await form.locator('input[name="lastName"]').fill('Guest');
	await form.locator('input[name="email"]').fill('guest@example.com');
	await form.getByRole('button', { name: /Review booking/ }).click();
	await expect(page).toHaveURL(new RegExp(`/book/${TOUR}/review/$`));
	await expect(page.locator('main')).toContainText('guest@example.com');
	await context.close();
});

test('a declined payment: nothing charged, try again goes back to payment', async ({ page }) => {
	await page.setExtraHTTPHeaders(ip());
	await startDraft(page.request);
	await page.goto(`/book/${TOUR}/review/`);
	await page.getByRole('button', { name: /Continue to payment/ }).click();
	await page.getByRole('button', { name: /simulate a declined payment/ }).click();
	await expect(page).toHaveURL(/\/booking\/error\/\?id=/);
	await expect(page.getByRole('alert')).toContainText("We don't hold seats until you pay");
	await page.getByRole('link', { name: 'Try payment again' }).click();
	await expect(page).toHaveURL(/\/booking\/pay\/\?id=/);
	await expect(page.getByRole('alert')).toContainText('declined');
});
