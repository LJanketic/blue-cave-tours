import { expect, test } from '@playwright/test';

/** Tours overview and tour detail (spec §6.2, §6.3, §11.15). */

test('filters narrow the list, update the URL and can be cleared', async ({ page }) => {
	await page.goto('/tours/');
	const count = page.locator('.tours-results__count');
	const total = Number(await count.locator('strong').innerText());
	await page.getByRole('group', { name: 'Filter tours' }).getByRole('button', { name: 'Half day' }).click();
	await expect(count).toContainText('match your filters');
	expect(Number(await count.locator('strong').innerText())).toBeLessThan(total);
	await expect(page).toHaveURL(/\?type=short$/);

	await page.getByRole('button', { name: 'Clear filters' }).first().click();
	await expect(count).toHaveText(`${total} tours`);
	await expect(page).toHaveURL(/\/tours\/$/);
});

test('the destination dropdown filters the list and its first option clears it', async ({ page }) => {
	await page.goto('/tours/');
	const count = page.locator('.tours-results__count');
	const total = Number(await count.locator('strong').innerText());
	const select = page.getByLabel('Destination');
	await select.selectOption({ label: 'Korčula' });
	await expect(page).toHaveURL(/\?destination=korcula$/);
	await expect(count).toContainText(/match(es)? your filters/); // "1 tour matches" / "2 tours match"
	expect(Number(await count.locator('strong').innerText())).toBeLessThan(total);
	await select.selectOption({ label: 'All destinations' });
	await expect(count).toHaveText(`${total} tours`);
	await expect(page).toHaveURL(/\/tours\/$/);
});

test('a destination page link (?destination=vis) selects its grouped option', async ({ page }) => {
	await page.goto('/tours/?destination=vis');
	await expect(page.getByLabel('Destination')).toHaveValue('blue-cave');
	await expect(page.getByLabel('Destination').locator('option:checked')).toHaveText('Blue Cave & Vis');
	const shown = await page.locator('.tours-results__grid > li').count();
	await page.getByRole('button', { name: 'Clear filters' }).first().click();
	await expect(page.getByLabel('Destination')).toHaveValue('');
	await expect(page).toHaveURL(/\/tours\/$/);
	expect(await page.locator('.tours-results__grid > li').count()).toBeGreaterThan(shown);
});

test('a click anywhere on a dropdown pill lands on its select', async ({ page }) => {
	await page.goto('/tours/');
	for (const name of ['Destination', 'Sort tours']) {
		const select = page.getByLabel(name);
		const pill = select.locator('xpath=..');
		const box = (await pill.boundingBox())!;
		// The icon end and the chevron end of the pill both hit the select, not the icons.
		for (const x of [box.x + 12, box.x + box.width - 12]) {
			const hit = await page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.tagName, [x, box.y + box.height / 2]);
			expect(hit, name).toBe('SELECT');
		}
	}
});

test('sort by price puts the cheapest first and quote-only tours last', async ({ page }) => {
	await page.goto('/tours/');
	await page.getByLabel('Sort tours').selectOption('price-asc');
	const prices = await page.locator('.tour-card-ui__amount').allInnerTexts();
	const numbers = prices.map((p) => (p.startsWith('€') ? Number(p.slice(1)) : Infinity));
	expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
});

test('without JavaScript every tour is listed', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await page.goto('/tours/?type=group');
	expect(await page.locator('.tours-results__grid > li').count()).toBe(Number(await page.locator('.tours-results__count strong').innerText()));
	expect(await page.locator('.tours-results__grid > li').count()).toBeGreaterThan(5);
	await context.close();
});

// Dubrovnik has no photos of its own places yet (22 Oct feedback: a Hvar photo read as the wrong city).
const NO_PHOTOS_YET = ['/tours/dubrovnik-one-way/'];

test('every tour page opens its gallery on a real photo and has no Highlights section', async ({ page }) => {
	await page.goto('/tours/');
	const links = await page.locator('.tours-results__grid a.tour-card-ui').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
	expect(links.length).toBeGreaterThan(5);
	for (const href of links) {
		await page.goto(href);
		if (NO_PHOTOS_YET.includes(href)) await expect(page.locator('.gallery-ui__hero--placeholder'), href).toBeVisible();
		else await expect(page.locator('.gallery-ui__hero img'), href).toHaveAttribute('src', /.+/);
		await expect(page.getByRole('heading', { name: 'Highlights' }), href).toHaveCount(0);
	}
});

test('Read more: the whole intro is in the HTML, collapsed to a preview until the button opens it', async ({ page, request }) => {
	const html = await (await request.get('/tours/blue-cave-hvar-5-islands/')).text();
	expect(html).toContain('before cruising back to Split in the late afternoon');
	await page.goto('/tours/blue-cave-hvar-5-islands/');
	const intro = page.locator('#intro-body');
	const button = page.locator('.tour__more');
	await expect(button).toBeVisible();
	await expect(button).toHaveAttribute('aria-expanded', 'false');
	await expect(button).toHaveAttribute('aria-controls', 'intro-body');
	await expect(intro).toHaveAttribute('data-collapsed', '');
	await button.click();
	await expect(button).toHaveAttribute('aria-expanded', 'true');
	await expect(button).toHaveText(/Show less/);
	await expect(intro).not.toHaveAttribute('data-collapsed', '');
	await button.click();
	await expect(button).toHaveAttribute('aria-expanded', 'false');
});

test('Read more: without JavaScript the full intro shows and there is no button', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await page.goto('/tours/blue-cave-hvar-5-islands/');
	await expect(page.locator('#intro-body')).not.toHaveAttribute('data-collapsed', '');
	await expect(page.locator('.tour__more')).toBeHidden();
	await context.close();
});

test('tour pages have search-worded section headings', async ({ page }) => {
	await page.goto('/tours/blue-cave-hvar-5-islands/');
	await expect(page.getByRole('heading', { level: 2, name: 'About the Blue Cave, Hvar & 5 islands tour' })).toBeVisible();
	await expect(page.getByRole('heading', { level: 2, name: /^Tour itinerary — from Split to the Blue Cave/ })).toBeVisible();
	await expect(page.getByRole('heading', { level: 2, name: "What's included in the tour" })).toBeVisible();
	await expect(page.getByRole('heading', { level: 2, name: 'Good to know before you go' })).toBeVisible();
});

test('booking a tour with one fixed departure: no time line under the calendar, the summary has it with the check-in', async ({ page }) => {
	await page.goto('/book/blue-cave-hvar-5-islands/group/');
	await page.waitForFunction(() => document.querySelectorAll('astro-island[ssr]').length === 0);
	const departure = page.locator('.flow__departure');
	await expect(departure).not.toContainText('07:20');
	await expect(departure).toContainText('Online booking closes');
	await expect(page.getByRole('radiogroup', { name: 'Departure time' })).toHaveCount(0);
	await expect(page.locator('.summary-card-ui__row').filter({ hasText: 'Departure' })).toContainText('07:20 (check-in 07:05)');
});

test.describe('phone', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('keyboard focus is never hidden under the header or the booking bar (WCAG 2.4.11)', async ({ page, browserName }) => {
		test.skip(browserName === 'webkit', 'Safari skips links on Tab by default');
		await page.goto('/tours/blue-cave-hvar-5-islands/');
		const problems: string[] = [];
		for (let i = 0; i < 40; i++) {
			await page.keyboard.press('Tab');
			const hit = await page.evaluate(() => {
				const el = document.activeElement as HTMLElement | null;
				if (!el || el === document.body) return null;
				const r = el.getBoundingClientRect();
				const header = document.getElementById('site-header')?.getBoundingClientRect();
				const bar = document.querySelector('.mobile-action-bar:not(.is-hidden)')?.getBoundingClientRect();
				const overlaps = (b?: DOMRect) => Boolean(b && b.height > 0 && r.top < b.bottom && r.bottom > b.top);
				// Elements inside the header or the bar are allowed to be there.
				if (el.closest('#site-header, .mobile-action-bar')) return null;
				return overlaps(header) || overlaps(bar) ? `${el.tagName} "${el.textContent?.trim().slice(0, 30)}"` : null;
			});
			if (hit) problems.push(hit);
		}
		expect(problems).toEqual([]);
	});

	test('the mobile bar leads to the booking box and hides there', async ({ page }) => {
		await page.goto('/tours/blue-cave-hvar-5-islands/');
		const bar = page.locator('.mobile-action-bar');
		await expect(bar).toBeVisible();
		await bar.getByRole('link', { name: 'Book now' }).click();
		await expect(bar).toBeHidden();
		await expect(page.locator('#book')).toBeInViewport();
	});
});
