import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { tours } from '../data/tour-catalog';
import { DEFAULT_PICKUP_ID, OTHER_PICKUP_ID, OTHER_PICKUP_MAX, PRIVATE_EXTRAS, PRIVATE_PICKUPS, PRIVATE_TOURS, privateDepartureTimes, privatePickup, privateTour } from './private';
import { CHARTER_ROUTES } from './charter';
import { charterUrl } from './routes';
import { offersPrivateFlow, supportsPrivateBook } from '../lib/booking';

describe('privateDepartureTimes', () => {
	it('is just the tour departure while no latest departure is set', () => {
		expect(privateDepartureTimes('07:20')).toEqual(['07:20']);
		expect(privateDepartureTimes('7:20')).toEqual([]);
	});

	// Explicit arguments: the operator hasn't given any latest departure yet (src/config/private.ts).
	it('steps 15 minutes from the tour departure up to the latest', () => {
		expect(privateDepartureTimes('09:30', '10:30')).toEqual(['09:30', '09:45', '10:00', '10:15', '10:30']);
	});

	it('always offers the latest departure, even off the 15-minute grid', () => {
		expect(privateDepartureTimes('07:20', '08:30')).toEqual(['07:20', '07:35', '07:50', '08:05', '08:20', '08:30']);
	});

	it('is just the departure when it already is the latest', () => {
		expect(privateDepartureTimes('14:30', '14:30')).toEqual(['14:30']);
	});

	it('is empty for malformed times or a latest before the first', () => {
		expect(privateDepartureTimes('9:30', '10:30')).toEqual([]);
		expect(privateDepartureTimes('09:30', '24:00')).toEqual([]);
		expect(privateDepartureTimes('10:30', '09:30')).toEqual([]);
	});
});

describe('PRIVATE_TOURS', () => {
	it('only lists live private tours with a fixed departure, a charter route, and any latest departure after it', () => {
		for (const [slug, config] of Object.entries(PRIVATE_TOURS)) {
			const tour = tours.find((t) => t.slug === slug);
			expect(tour, slug).toBeDefined();
			expect(tour?.types, slug).toContain('private');
			const first = tour?.departures[0]?.time ?? '';
			expect(first, slug).not.toBe('');
			if (config.latestDeparture !== undefined) expect(config.latestDeparture >= first, slug).toBe(true);
			expect(config.boat.low, slug).toBeLessThanOrEqual(config.boat.peak);
			// A pick-up off the list is sent as a charter request on this tour's route.
			expect(CHARTER_ROUTES.some((r) => r.tourSlug === slug || r.aliases?.includes(slug)), slug).toBe(true);
		}
	});

	it('sells every fixed-route private tour at €1,200 a boat, up to an 11:00 departure (Mare, 8 Nov 2026)', () => {
		const boat = { low: 1200, peak: 1200 };
		expect(PRIVATE_TOURS).toEqual({
			'blue-cave-hvar-5-islands': { boat, latestDeparture: '11:00' },
			'golden-horn-brac-hvar': { boat, latestDeparture: '11:00' },
			'hvar-red-rocks-pakleni': { boat, latestDeparture: '11:00' },
			'blue-lagoon-morning': { boat, latestDeparture: '11:00' },
			// Leaves at 14:30, after the 11:00 latest: its usual time only.
			'blue-lagoon-afternoon': { boat },
			'dubrovnik-one-way': { boat, latestDeparture: '11:00' },
		});
	});

	it('leaves the custom day on request (a quote, not pay now)', () => {
		expect(privateTour('create-perfect-day-private')).toBeNull();
		// Not fooled by Object.prototype.
		expect(privateTour('constructor')).toBeNull();
	});
});

describe('the private booking step', () => {
	it('is offered on every tour with a fixed private route, and every one of them pays now', () => {
		const offered = tours.filter(offersPrivateFlow).map((t) => t.slug).sort();
		expect(offered).toEqual(['blue-cave-hvar-5-islands', 'blue-lagoon-afternoon', 'blue-lagoon-morning', 'dubrovnik-one-way', 'golden-horn-brac-hvar', 'hvar-red-rocks-pakleni']);
		expect(tours.filter(supportsPrivateBook).map((t) => t.slug).sort()).toEqual(offered);
		// Pay now is a subset of the step.
		for (const tour of tours.filter(supportsPrivateBook)) expect(offersPrivateFlow(tour), tour.slug).toBe(true);
	});

	it('is not offered on group-only tours or the custom day', () => {
		expect(offersPrivateFlow({ slug: 'x', types: ['group'] })).toBe(false);
		expect(offersPrivateFlow(tours.find((t) => t.slug === 'create-perfect-day-private')!)).toBe(false);
	});

	it('can send a quote request on every tour that offers it: each has a charter route', () => {
		for (const tour of tours.filter(offersPrivateFlow)) {
			expect(CHARTER_ROUTES.some((r) => r.tourSlug === tour.slug || r.aliases?.includes(tour.slug)), tour.slug).toBe(true);
		}
	});
});

describe('extras and pick-ups', () => {
	it('have unique ids and whole-euro prices', () => {
		for (const list of [PRIVATE_EXTRAS, PRIVATE_PICKUPS]) {
			expect(new Set(list.map((item) => item.id)).size).toBe(list.length);
			for (const item of list) expect(Number.isInteger(item.price) && item.price >= 0, item.id).toBe(true);
		}
	});

	it('sells the extras from ClickUp "Extras for private" (6 Nov 2026) at the design prices', () => {
		expect(PRIVATE_EXTRAS.map((x) => [x.label, x.price])).toEqual([
			['Champagne welcome', 40],
			['SUP', 35],
			['Seabob', 150],
		]);
	});

	it('lists the pick-ups from ClickUp "Pick up point za private" (6 Nov 2026) in order, Riva first and free', () => {
		expect(PRIVATE_PICKUPS.map((p) => [p.label, p.price])).toEqual([
			['Riva Waterfront (Stand 14), Split', 0],
			['Zenta Marina, Split', 30],
			['Radisson Blu Hotel, Split', 40],
			['Le Méridien Lav Hotel, Podstrana', 60],
			['Hotel San Antonio, Podstrana', 60],
			['Old Town Waterfront, Trogir', 80],
			['Stomorska Waterfront, Šolta Island', 100],
			['Sutivan Waterfront, Brač Island', 100],
			['Milna Marina, Brač Island', 120],
			['Hvar Town Waterfront, Hvar Island', 150],
		]);
		expect(PRIVATE_PICKUPS[0].id).toBe(DEFAULT_PICKUP_ID);
		// A listed spot is sent by name on a quote request, which caps the place at OTHER_PICKUP_MAX.
		for (const p of PRIVATE_PICKUPS) expect(p.label.length, p.id).toBeLessThanOrEqual(OTHER_PICKUP_MAX);
	});

	it('meet at the Riva for free by default, and never price the "other" sentinel', () => {
		expect(privatePickup(DEFAULT_PICKUP_ID)?.price).toBe(0);
		expect(privatePickup(OTHER_PICKUP_ID)).toBeNull();
		expect(PRIVATE_PICKUPS.some((p) => p.id === OTHER_PICKUP_ID)).toBe(false);
	});
});

// /book/<slug>/private/ is a real page for every group + private tour (pay now or a
// quote request). Private-only tours redirect it to the charter request; a rule for a
// tour that has the page would never fire (Netlify serves the page), so the two lists are kept apart.
describe('public/_redirects: private booking steps', () => {
	const rules = readFileSync(new URL('../../public/_redirects', import.meta.url), 'utf8')
		.split('\n')
		.filter((line) => line.trim() && !line.trim().startsWith('#'))
		.map((line) => line.trim().split(/\s+/));
	const redirected = new Map(rules.flatMap(([from, to, status]) => {
		const slug = from.match(/^\/book\/([^/]+)\/private\/?$/)?.[1];
		return slug ? [[slug, { to, status }] as const] : [];
	}));

	it('redirects exactly the private tours with no private booking step, to their charter request', () => {
		const onRequest = tours.filter((t) => t.types.includes('private') && !offersPrivateFlow(t)).map((t) => t.slug).sort();
		expect([...redirected.keys()].sort()).toEqual(onRequest);
		for (const [slug, rule] of redirected) expect(rule, slug).toEqual({ to: charterUrl(slug), status: '301' });
	});

	it('never redirects a tour with a private booking step, and has no catch-all rule', () => {
		for (const slug of Object.keys(PRIVATE_TOURS)) expect(redirected.has(slug), slug).toBe(false);
		for (const tour of tours.filter(offersPrivateFlow)) expect(redirected.has(tour.slug), tour.slug).toBe(false);
		expect(rules.some(([from]) => from.startsWith('/book/:'))).toBe(false);
	});
});
