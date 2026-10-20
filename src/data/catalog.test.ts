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

	it('gives every group tour with a price a fixed departure, except those waiting for a time', () => {
		// Group tours on sale whose time isn't fixed yet (D-16). Add a departure, then remove the slug here.
		const timeToBeConfirmed = new Set<string>();
		for (const tour of tours.filter((t) => t.types.includes('group') && t.prices !== null)) {
			if (timeToBeConfirmed.has(tour.slug)) expect(tour.departures, tour.slug).toEqual([]);
			else expect(tour.departures.length, tour.slug).toBeGreaterThan(0);
		}
	});

	it('prices every tour as the operator sheet does (Oct 2026)', () => {
		// Frozen on purpose: change it only together with the operator's price sheet.
		const sheet: Record<string, { low: [number, number]; peak: [number, number] } | null> = {
			'blue-cave-hvar-5-islands': { low: [149, 129], peak: [169, 139] },
			'golden-horn-brac-hvar': { low: [129, 89], peak: [139, 99] },
			'blue-lagoon-morning': { low: [65, 59], peak: [75, 69] },
			'blue-lagoon-afternoon': { low: [65, 59], peak: [75, 69] },
			'hvar-red-rocks-pakleni': null,
			'dubrovnik-one-way': null,
			'create-perfect-day-private': null,
		};
		expect([...tourSlugs].sort()).toEqual(Object.keys(sheet).sort());
		for (const tour of tours) {
			const row = sheet[tour.slug];
			const actual = tour.prices && {
				low: [tour.prices.low.adult, tour.prices.low.child],
				peak: [tour.prices.peak.adult, tour.prices.peak.child],
			};
			expect(actual, tour.slug).toEqual(row);
		}
	});

	it('uses HH:MM times', () => {
		const time = /^([01]\d|2[0-3]):[0-5]\d$/;
		for (const tour of tours) {
			for (const d of tour.departures) {
				expect(d.time, tour.slug).toMatch(time);
				if (d.checkIn) expect(d.checkIn < d.time, `${tour.slug} check-in before departure`).toBe(true);
			}
			for (const step of tour.itinerary) if (step.time) expect(step.time, tour.slug).toMatch(time);
		}
	});

	it('only uses icons that are in the icon font subset', () => {
		const subset = new Set([...readFileSync('src/styles/icons.css', 'utf8').matchAll(/\.ti-([a-z0-9-]+):before/g)].map((m) => m[1]));
		for (const tour of tours) for (const step of tour.itinerary) expect(subset.has(step.icon), `${tour.slug}: ${step.icon}`).toBe(true);
		for (const dest of destinations) for (const hl of dest.highlights) expect(subset.has(hl.icon), `${dest.slug}: ${hl.icon}`).toBe(true);
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
