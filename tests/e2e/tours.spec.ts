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

test('a destination link shows a removable chip and only tours that go there', async ({ page }) => {
	await page.goto('/tours/?destination=vis');
	const chip = page.getByRole('button', { name: /Vis island.*remove this filter/ });
	await expect(chip).toBeVisible();
	const shown = await page.locator('.tours-results__grid > li').count();
	await chip.click();
	await expect(page).toHaveURL(/\/tours\/$/);
	expect(await page.locator('.tours-results__grid > li').count()).toBeGreaterThan(shown);
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

test('every tour page opens its gallery on a real photo and has no Highlights section', async ({ page }) => {
	await page.goto('/tours/');
	const links = await page.locator('.tours-results__grid a.tour-card-ui').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
	expect(links.length).toBeGreaterThan(5);
	for (const href of links) {
		await page.goto(href);
		await expect(page.locator('.gallery-ui__hero img'), href).toHaveAttribute('src', /.+/);
		await expect(page.getByRole('heading', { name: 'Highlights' }), href).toHaveCount(0);
	}
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
