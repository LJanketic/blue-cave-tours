import { expect, test, type Page } from '@playwright/test';

/**
 * ClickUp tasks of 31 Oct 2026 (docs/clickup-2026-10-31-plan.md):
 * C1 prices, C2 no notes under the calendar, C3 "Your details" as designed,
 * C4 the tour card (aside), C5 the private step on every group + private tour.
 */

const hydrated = (page: Page) => page.waitForFunction(() => document.querySelectorAll('astro-island[ssr]').length === 0);
const squash = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();

type Aside = {
	price: string;
	child: string | null;
	next: string;
	primary: { label: string; href: string };
	secondary: { label: string; href: string; price: string | null } | null;
	/** The group tours' 48h line, or the private-only tours' link to their own terms. */
	policy: 'group' | 'private';
};

const ASIDES: Record<string, Aside> = {
	'blue-cave-hvar-5-islands': {
		price: 'From €149 / adult',
		child: 'Children from €129',
		next: '07:20',
		primary: { label: 'Book group tour tickets', href: '/book/blue-cave-hvar-5-islands/group/' },
		secondary: { label: 'Private experience', href: '/book/blue-cave-hvar-5-islands/private/', price: '€1,200 / boat' },
		policy: 'group',
	},
	'golden-horn-brac-hvar': {
		price: 'From €129 / adult',
		child: 'Children from €89',
		next: '09:00',
		primary: { label: 'Book group tour tickets', href: '/book/golden-horn-brac-hvar/group/' },
		secondary: { label: 'Private experience', href: '/book/golden-horn-brac-hvar/private/', price: '€1,200 / boat' },
		policy: 'group',
	},
	'blue-lagoon-morning': {
		price: 'From €70 / adult',
		child: 'Children from €60',
		next: '09:30',
		primary: { label: 'Book group tour tickets', href: '/book/blue-lagoon-morning/group/' },
		secondary: { label: 'Private experience', href: '/book/blue-lagoon-morning/private/', price: '€1,200 / boat' },
		policy: 'group',
	},
	'blue-lagoon-afternoon': {
		price: 'From €70 / adult',
		child: 'Children from €60',
		next: '14:30',
		primary: { label: 'Book group tour tickets', href: '/book/blue-lagoon-afternoon/group/' },
		secondary: { label: 'Private experience', href: '/book/blue-lagoon-afternoon/private/', price: '€1,200 / boat' },
		policy: 'group',
	},
	'hvar-red-rocks-pakleni': {
		// Private only since the operator's tour sheet of 4 Nov 2026; paid online at €1,200 a boat since 8 Nov.
		price: 'From €1,200 / boat',
		child: null,
		next: '09:00',
		primary: { label: 'Plan your private tour', href: '/book/hvar-red-rocks-pakleni/private/' },
		secondary: null,
		policy: 'private',
	},
	'dubrovnik-one-way': {
		// Private only since the operator's tour sheet of 4 Nov 2026; paid online at €1,200 a boat since 8 Nov.
		price: 'From €1,200 / boat',
		child: null,
		next: '08:00',
		primary: { label: 'Plan your private tour', href: '/book/dubrovnik-one-way/private/' },
		secondary: null,
		policy: 'private',
	},
	'create-perfect-day-private': {
		price: 'On request',
		child: null,
		next: 'Time confirmed at booking',
		primary: { label: 'Plan your experience', href: '/private-charter/?tour=create-perfect-day-private' },
		secondary: null,
		policy: 'private',
	},
};

/** A fixed departure gets its date in the browser ("Mon, 1 Mar, 07:20"); the date moves with the clock. */
function nextValue(a: Aside): string | RegExp {
	return /^\d{2}:\d{2}$/.test(a.next) ? new RegExp(`^(Today|Tomorrow|\\w{3}, \\d{1,2} \\w{3}), ${a.next}$`) : a.next;
}

/** The visible lines of the card, top to bottom (the design: price, children, next departure, the buttons, the policy). */
function expectedLines(a: Aside, next: string): string[] {
	return [
		a.price,
		...(a.child ? [a.child] : []),
		/^\d{2}:\d{2}$/.test(a.next) ? 'Next available' : 'Next departure',
		next,
		a.primary.label,
		...(a.secondary ? [a.secondary.price ? `${a.secondary.label} ${a.secondary.price}` : a.secondary.label] : []),
		a.policy === 'group' ? 'Free cancellation up to 48h before' : 'Private experiences have their own cancellation terms',
	];
}

for (const [slug, aside] of Object.entries(ASIDES)) {
	test(`C4 tour card of ${slug}: the design's lines, actions and policy, nothing else`, async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto(`/tours/${slug}/`);
		const book = page.locator('#book');
		await expect(book.locator('.tour__price')).toHaveText(aside.price, { useInnerText: true });
		if (aside.child) await expect(book.locator('.tour__child')).toHaveText(aside.child);
		else await expect(book.locator('.tour__child')).toHaveCount(0);
		await expect(book.locator('.tour__rows dd')).toHaveText(nextValue(aside));

		const primary = book.locator('a.tour__cta:not(.tour__cta--secondary)');
		await expect(primary).toHaveCount(1);
		await expect(primary).toHaveText(aside.primary.label);
		await expect(primary).toHaveAttribute('href', aside.primary.href);

		const secondary = book.locator('a.tour__cta--secondary');
		if (aside.secondary) {
			await expect(secondary).toHaveCount(1);
			await expect(secondary.locator('.tour__cta-label')).toHaveText(aside.secondary.label);
			await expect(secondary).toHaveAttribute('href', aside.secondary.href);
			if (aside.secondary.price) await expect(secondary.locator('.tour__cta-price')).toHaveText(aside.secondary.price, { useInnerText: true });
			else await expect(secondary.locator('.tour__cta-price')).toHaveCount(0);
		} else {
			await expect(secondary).toHaveCount(0);
		}

		if (aside.policy === 'group') {
			await expect(book.locator('.tour__policy')).toHaveText('Free cancellation up to 48h before');
			await expect(book.locator('.tour__policy--private')).toHaveCount(0);
		} else {
			// Private-only tours keep a reference to their own terms (legal/cancellation §3), never the 48h line.
			const terms = book.locator('.tour__policy--private a');
			await expect(book.locator('.tour__policy')).toHaveCount(1);
			await expect(terms).toHaveText('Private experiences have their own cancellation terms');
			await expect(terms).toHaveAttribute('href', '/legal/cancellation/#private');
		}

		// Removed from the card (C4). No tour has a mandatory fee today, so no fee line either
		// (optional fees left the card; a mandatory one would show, C-23).
		for (const gone of ['.tour__fee', '.tour__boat', '.tour__custom']) await expect(book.locator(gone), gone).toHaveCount(0);
		for (const text of ['Something custom', 'Private boat from', 'Group tours:', 'Blue Cave entry', 'Plan a private experience', 'Book private experience']) {
			await expect(book, text).not.toContainText(text);
		}
		if (aside.policy === 'group') await expect(book, 'private terms').not.toContainText('Private experiences have their own');
		await expect(book.locator('a[href^="/private-charter/"]')).toHaveCount(slug === 'create-perfect-day-private' ? 1 : 0);

		// The whole card, as the guest sees it, top to bottom, with nothing else in it
		// (innerText splits flex items onto lines, so compare the text as one run).
		// "Book now" is the visually hidden heading.
		await expect(book.locator('#book-heading')).toHaveText('Book now');
		const text = squash((await book.innerText()).replace(/^\s*Book now\s*/, ''));
		const next = await book.locator('.tour__rows dd').innerText();
		expect(text).toBe(expectedLines(aside, next).join(' '));
	});
}

test('C4 mobile 375px: the priced "Private experience" button does not overflow', async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto('/tours/blue-cave-hvar-5-islands/');
	const button = page.locator('#book a.tour__cta--secondary');
	await button.scrollIntoViewIfNeeded();
	await expect(button).toBeVisible();
	const { scrollWidth, clientWidth, right, viewport, priceRight } = await button.evaluate((el) => {
		const r = el.getBoundingClientRect();
		const price = el.querySelector('.tour__cta-price')?.getBoundingClientRect();
		return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, right: r.right, viewport: document.documentElement.clientWidth, priceRight: price?.right ?? 0 };
	});
	expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
	expect(right).toBeLessThanOrEqual(viewport);
	expect(priceRight).toBeLessThanOrEqual(right);
	// The page itself doesn't scroll sideways.
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('C4 at 320px too: the label wraps rather than pushing the price out', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 700 });
	await page.goto('/tours/blue-cave-hvar-5-islands/');
	const button = page.locator('#book a.tour__cta--secondary');
	await button.scrollIntoViewIfNeeded();
	const fits = await button.evaluate((el) => el.scrollWidth <= el.clientWidth);
	expect(fits).toBe(true);
});

test('C2/C3 group flow: no notes under the calendar, "Your details" as designed, fields still required', async ({ page }) => {
	await page.goto('/book/blue-cave-hvar-5-islands/group/');
	await hydrated(page);
	const flow = page.locator('form.flow');
	await expect(page.locator('.cal__legend')).toHaveCount(0);
	await expect(page.locator('.flow__cutoff')).toHaveCount(0);
	await expect(page.locator('.flow__privacy')).toHaveCount(0);
	for (const text of ['Greyed-out days', 'Online booking closes', 'Fields marked', 'So the skipper', 'For example, a child seat', 'We use these details']) {
		await expect(flow, text).not.toContainText(text);
	}
	await expect(page.locator('.flow__sub').filter({ hasText: 'confirmation' })).toHaveText("We'll send your confirmation and any updates here.");

	const placeholders: [string, string][] = [
		['#book-first', 'Ivan'],
		['#book-last', 'Kovač'],
		['#book-email', 'ivan@example.com'],
		['#book-phone', '+385 91 234 5678'],
		['#book-notes', 'Accessibility needs, celebrations, anything we should know…'],
	];
	for (const [id, placeholder] of placeholders) await expect(page.locator(id), id).toHaveAttribute('placeholder', placeholder);
	await expect(flow.getByLabel('Special requests', { exact: true })).toHaveAttribute('id', 'book-notes');
	await expect(flow.getByLabel('Phone', { exact: true })).toHaveAttribute('id', 'book-phone');

	// Required stays, with no visible asterisk.
	for (const id of ['#book-first', '#book-last', '#book-email']) await expect(page.locator(id), id).toHaveAttribute('required', '');
	await expect(page.locator('#book-phone')).not.toHaveAttribute('required', '');
	for (const star of await page.locator('.flow__fields .form-field-ui__required').all()) await expect(star).toBeHidden();

	// The hint names what's missing, and the button doesn't go on without it.
	const hint = page.locator('#flow-hint');
	await expect(hint).toHaveText('To continue, add a date, your first name, your last name, your email.');
	await page.getByRole('button', { name: /Review booking/ }).click({ force: true });
	await expect(page).toHaveURL(/\/book\/blue-cave-hvar-5-islands\/group\/$/);
	await page.locator('#book-first').fill('Ivan');
	await page.locator('#book-email').fill('ivan@');
	await expect(hint).toContainText('your last name');
	await expect(hint).toContainText('a valid email');
	await expect(hint).not.toContainText('your first name');
});

test('C2 the private step has no notes under the calendar either (Blue Cave, pay now)', async ({ page }) => {
	await page.goto('/book/blue-cave-hvar-5-islands/private/');
	await hydrated(page);
	await expect(page.locator('.cal__legend')).toHaveCount(0);
	await expect(page.locator('.flow__cutoff')).toHaveCount(0);
	await expect(page.locator('form.flow')).not.toContainText("Requests need a day's notice");
	await expect(page.locator('form.flow')).not.toContainText('Fields marked');
	await expect(page.locator('form.flow').getByLabel('Special requests', { exact: true })).toHaveAttribute('placeholder', 'Accessibility needs, celebrations, anything we should know…');
});

test('C3 group page without JavaScript: no "Fields marked" sentence', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await page.goto('/book/blue-cave-hvar-5-islands/group/');
	await expect(page.locator('form.no-js')).toBeVisible();
	await expect(page.locator('form.no-js')).not.toContainText('Fields marked');
	await context.close();
});

test('C3 the no-JS fallback forms match the islands: labels, placeholders, no asterisks', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	for (const path of ['/book/blue-cave-hvar-5-islands/group/', '/book/blue-cave-hvar-5-islands/private/']) {
		await page.goto(path);
		const form = page.locator('form.no-js');
		await expect(form, path).toBeVisible();
		await expect(form, path).not.toContainText('*');
		await expect(form, path).not.toContainText('optional)');
		const placeholders: [string, string][] = [
			['firstName', 'Ivan'],
			['lastName', 'Kovač'],
			['email', 'ivan@example.com'],
			['phone', '+385 91 234 5678'],
			['notes', 'Accessibility needs, celebrations, anything we should know…'],
		];
		for (const [name, placeholder] of placeholders) await expect(form.locator(`[name="${name}"]`), `${path} ${name}`).toHaveAttribute('placeholder', placeholder);
		for (const name of ['date', 'firstName', 'lastName', 'email']) await expect(form.locator(`[name="${name}"]`), `${path} ${name}`).toHaveAttribute('required', '');
		await expect(form.getByLabel('Phone', { exact: true }), path).toHaveAttribute('name', 'phone');
		await expect(form.getByLabel('Special requests', { exact: true }), path).toHaveAttribute('name', 'notes');
	}
	await context.close();
});

test('C5 Blue Lagoon afternoon private step: pays now at its own 14:30 (after the 11:00 latest, so no later times)', async ({ page }) => {
	await page.goto('/book/blue-lagoon-afternoon/private/');
	await hydrated(page);
	await expect(page.getByRole('button', { name: /Review booking/ })).toBeVisible();
	await expect(page.getByRole('button', { name: /Send request/ })).toHaveCount(0);
	await page.locator('.cal__day:not([aria-disabled])').last().click();
	await expect(page.locator('.flow__departure')).toContainText('Departure 14:30');
	await expect(page.locator('#private-time')).toHaveCount(0);
	const summary = page.locator('.summary-card-ui');
	await expect(summary.locator('.summary-card-ui__row').filter({ hasText: 'Departure' })).toContainText('14:30');
	await expect(summary.locator('.summary-card-ui__total')).toContainText('€1,200');
	await expect(summary.locator('.summary-card-ui__total')).toContainText('incl. VAT');
});

test('C5 Red Rocks private step: a list of departures from 09:00 to 11:00, not a free time field', async ({ page }) => {
	await page.goto('/book/hvar-red-rocks-pakleni/private/');
	await hydrated(page);
	await page.locator('.cal__day:not([aria-disabled])').last().click();
	const time = page.locator('#private-time');
	await expect(time).not.toHaveAttribute('type', 'time');
	await expect(time.locator('option')).toHaveText(['09:00 (usual departure)', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00']);
	await expect(page.locator('#private-time-error')).toHaveCount(0);
});

test('C3 no visible asterisk on any field of the private flow (pick-up place included)', async ({ page }) => {
	await page.goto('/book/blue-cave-hvar-5-islands/private/');
	await hydrated(page);
	await page.getByRole('radio', { name: /Other pickup location/ }).check();
	await expect(page.locator('#private-pickup-place')).toHaveAttribute('required', '');
	const stars = page.locator('form.flow .form-field-ui__required');
	expect(await stars.count()).toBeGreaterThan(0);
	for (const star of await stars.all()) await expect(star).toBeHidden();
});

test('C1 the Blue Cave private summary groups its amounts like the tour card (€1,200)', async ({ page }) => {
	await page.goto('/book/blue-cave-hvar-5-islands/private/');
	await hydrated(page);
	await page.locator('.cal__day:not([aria-disabled])').first().click();
	const summary = page.locator('.summary-card-ui');
	await expect(summary.locator('.summary-card-ui__total')).toContainText('€1,200');
	await expect(summary).not.toContainText(/€\d{4}/);
});

test('C5 the charter form files ?tour=blue-lagoon-afternoon under the afternoon tour', async ({ page }) => {
	let body: Record<string, unknown> | null = null;
	await page.route('**/api/charter-request', async (route) => {
		body = route.request().postDataJSON();
		await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
	});
	await page.goto('/private-charter/?tour=blue-lagoon-afternoon');
	await hydrated(page);
	await page.locator('.cal__day:not([aria-disabled])').last().click();
	await page.locator('#charter-first').fill('Test');
	await page.locator('#charter-last').fill('Guest');
	await page.locator('#charter-email').fill('guest@example.com');
	await page.locator('#charter-phone').fill('+385 91 000 0000');
	await page.waitForTimeout(2100);
	await page.getByRole('button', { name: /Send request/ }).click();
	await expect(page.getByRole('heading', { name: 'Request received' })).toBeVisible();
	expect(body).toMatchObject({ route: 'blue-lagoon', tourSlug: 'blue-lagoon-afternoon' });
});

test('C5 without JavaScript, every fixed-route private step has the plain pay-now form', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	for (const slug of ['blue-lagoon-afternoon', 'golden-horn-brac-hvar', 'hvar-red-rocks-pakleni']) {
		const res = await page.goto(`/book/${slug}/private/`);
		expect(res?.status(), slug).toBe(200);
		await expect(page.locator('form.no-js[action="/api/bookings/draft"]'), slug).toBeVisible();
		// A pick-up off the list is still a request, linked from the form.
		await expect(page.locator('.no-js a[href^="/private-charter/"]'), slug).toHaveAttribute('href', `/private-charter/?tour=${slug}`);
	}
	await context.close();
});

test('C5 the step bar promises a payment only where there is one', async ({ page }) => {
	const steps = page.getByRole('list', { name: 'Booking progress' }).getByRole('listitem');
	await page.goto('/book/golden-horn-brac-hvar/private/');
	await expect(steps).toHaveCount(4);
	await expect(steps.last()).toContainText('Payment');
	await page.goto('/book/blue-cave-hvar-5-islands/private/');
	await expect(steps).toHaveCount(4);
	await expect(steps.last()).toContainText('Payment');
});

test('C5 "Other location" on a pay-now tour switches the step bar to a request, and back', async ({ page }) => {
	const steps = page.getByRole('list', { name: 'Booking progress' }).getByRole('listitem');
	await page.goto('/book/blue-cave-hvar-5-islands/private/');
	await hydrated(page);
	await page.getByRole('radio', { name: /Other pickup location/ }).check();
	await expect(steps).toHaveCount(3);
	await expect(steps.last()).toContainText('Request');
	await page.getByRole('radio', { name: /meeting point/ }).check();
	await expect(steps).toHaveCount(4);
	await expect(steps.nth(2)).toContainText('Review');
	await expect(steps.last()).toContainText('Payment');
});

test('C5 without JavaScript, Blue Cave keeps its pay-now form', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await page.goto('/book/blue-cave-hvar-5-islands/private/');
	const form = page.locator('form.no-js[action="/api/bookings/draft"]');
	await expect(form).toBeVisible();
	await expect(form.locator('input[name="kind"]')).toHaveValue('private');
	await expect(page.locator('.no-js__note').filter({ hasText: 'quoted per request' })).toHaveCount(0);
	await context.close();
});

test('C1 the group flow prices a low-season Blue Lagoon day at the new prices', async ({ page }) => {
	await page.goto('/book/blue-lagoon-morning/group/');
	await hydrated(page);
	// The seasonal breakdown in the flow names both seasons' prices.
	const flow = page.locator('form.flow');
	await expect(flow).toContainText('€70 per adult, €60 per child');
	await expect(flow).toContainText('€75 per adult, €65 per child');
	await expect(flow).not.toContainText('€65 per adult');
	await expect(flow).not.toContainText('€59');
	// The new age bands (infant 0–3 free, child 4–11, adult 12+).
	await expect(flow).toContainText('Age 12+');
	await expect(flow).toContainText('Age 4–11');
	await expect(flow).toContainText('Under 4 · free');
	await expect(flow).not.toContainText('Age 18+');
});

test('follow-up: phones show no optional fee line in the bottom bar', async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto('/tours/blue-cave-hvar-5-islands/');
	await expect(page.locator('body')).not.toContainText('Blue Cave entry optional, ticket paid on site');
});

test('follow-up: the contact subject and the footer use the operator wording', async ({ page }) => {
	await page.goto('/contact/');
	await expect(page.locator('#topic option[value="group"]')).toHaveText('Group Tour enquiry');
	const bottom = page.locator('.site-footer__bottom');
	await expect(bottom).toContainText('MB 04213815');
	await expect(bottom).toContainText('Djelatnost 79110, Djelatnosti putničkih agencija');
	await expect(bottom.getByRole('link', { name: 'info@hellobluecave.com' })).toHaveAttribute('href', 'mailto:info@hellobluecave.com');
});
