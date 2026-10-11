import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REMOVED_TOUR_SLUGS, tours } from './tour-catalog';
import { destinations } from './destinations';

const tourSlugs = new Set(tours.map((t) => t.slug));
const destinationSlugs = new Set(destinations.map((d) => d.slug));

describe('tour catalog', () => {
	it('has unique slugs', () => {
		expect(tourSlugs.size).toBe(tours.length);
	});

	it('gives every tour at least one booking type', () => {
		for (const tour of tours) expect(tour.types.length, tour.slug).toBeGreaterThan(0);
	});
});

describe('destinations', () => {
	it('has unique slugs', () => {
		expect(destinationSlugs.size).toBe(destinations.length);
	});

	it('only references tours and nearby stops that exist', () => {
		for (const dest of destinations) {
			for (const slug of dest.tourSlugs) expect(tourSlugs.has(slug), `${dest.slug} → ${slug}`).toBe(true);
			for (const stop of dest.nearby) {
				expect(destinationSlugs.has(stop.slug), `${dest.slug} → ${stop.slug}`).toBe(true);
			}
		}
	});
});

// A _redirects rule for a slug that is live again never fires (Netlify serves
// the real page), so it only misleads: keep retired slugs and live ones apart.
describe('public/_redirects', () => {
	const rules = readFileSync(new URL('../../public/_redirects', import.meta.url), 'utf8')
		.split('\n')
		.filter((line) => line.trim() && !line.trim().startsWith('#'))
		.map((line) => line.trim().split(/\s+/));

	it('never redirects a live tour', () => {
		for (const [from] of rules) {
			const slug = from.match(/^\/tours\/([^/]+)\/?$/)?.[1];
			if (slug) expect(tourSlugs.has(slug), from).toBe(false);
		}
	});

	it('redirects every retired tour slug', () => {
		const redirected = new Set(rules.map(([from]) => from.replace(/^\/tours\/|\/$/g, '')));
		for (const slug of REMOVED_TOUR_SLUGS) {
			expect(tourSlugs.has(slug), `${slug} is live again`).toBe(false);
			expect(redirected.has(slug), slug).toBe(true);
		}
	});

	it('points at trailing-slash targets so there is a single hop', () => {
		for (const [, to] of rules) expect(to.split('?')[0].endsWith('/'), to).toBe(true);
	});
});
