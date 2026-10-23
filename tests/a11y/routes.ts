import type { Page } from '@playwright/test';

/** Fixed public pages. Tour and destination detail pages are read from the overview pages' links. */
export const STATIC_ROUTES = [
	'/',
	'/tours/',
	'/destinations/',
	'/faq/',
	'/about/',
	'/contact/',
	'/legal/terms/',
	'/legal/privacy/',
	'/legal/cancellation/',
	'/private-charter/',
	'/private-charter/sent/',
	'/private-charter/problem/?error=email',
	'/not-a-page/',
	// The component kit (dev server and deploy previews only): new components must be clean.
	'/dev/kit/',
];

async function linksUnder(page: Page, overview: string, prefix: string): Promise<string[]> {
	await page.goto(overview);
	const hrefs = await page.locator(`a[href^="${prefix}"]`).evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''));
	return [...new Set(hrefs.filter((href) => new RegExp(`^${prefix}[^/]+/$`).test(href)))].sort();
}

/** Every public route, including each tour's group and private booking pages. */
export async function publicRoutes(page: Page): Promise<string[]> {
	const tours = await linksUnder(page, '/tours/', '/tours/');
	const destinations = await linksUnder(page, '/destinations/', '/destinations/');
	const booking = await linksUnder(page, '/tours/', '/book/');
	const groupPages: string[] = [];
	for (const tour of tours) {
		await page.goto(tour);
		groupPages.push(...(await page.locator('a[href^="/book/"]:is([href$="/group/"], [href$="/private/"])').evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''))));
	}
	return [...STATIC_ROUTES, ...tours, ...destinations, ...new Set([...booking, ...groupPages])];
}
