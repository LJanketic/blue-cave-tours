import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { tours } from '../data/tour-catalog';
import { DEFAULT_PICKUP_ID, OTHER_PICKUP_ID, PRIVATE_EXTRAS, PRIVATE_PICKUPS, PRIVATE_TOURS, privateDepartureTimes, privatePickup, privateTour } from './private';
import { CHARTER_ROUTES } from './charter';
import { charterUrl } from './routes';
import { supportsPrivateBook } from '../lib/booking';

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

	it('sells only the Blue Cave boat, at the operator doc\'s prices, at its usual departure', () => {
		expect(PRIVATE_TOURS).toEqual({ 'blue-cave-hvar-5-islands': { boat: { low: 1500, peak: 2000 } } });
	});

	it('leaves the tours without an operator boat price on request', () => {
		for (const slug of ['golden-horn-brac-hvar', 'blue-lagoon-morning', 'blue-lagoon-afternoon', 'hvar-red-rocks-pakleni', 'dubrovnik-one-way', 'create-perfect-day-private']) {
			expect(privateTour(slug), slug).toBeNull();
		}
		// Not fooled by Object.prototype.
		expect(privateTour('constructor')).toBeNull();
	});
});

describe('extras and pick-ups', () => {
	it('have unique ids and whole-euro prices', () => {
		for (const list of [PRIVATE_EXTRAS, PRIVATE_PICKUPS]) {
			expect(new Set(list.map((item) => item.id)).size).toBe(list.length);
			for (const item of list) expect(Number.isInteger(item.price) && item.price >= 0, item.id).toBe(true);
		}
	});

	it('has no extras until the operator prices one, and only the Riva as a bookable pick-up', () => {
		expect(PRIVATE_EXTRAS).toEqual([]);
		expect(PRIVATE_PICKUPS.map((p) => p.id)).toEqual([DEFAULT_PICKUP_ID]);
	});

	it('meet at the Riva for free by default, and never price the "other" sentinel', () => {
		expect(privatePickup(DEFAULT_PICKUP_ID)?.price).toBe(0);
		expect(privatePickup(OTHER_PICKUP_ID)).toBeNull();
		expect(PRIVATE_PICKUPS.some((p) => p.id === OTHER_PICKUP_ID)).toBe(false);
	});
});

// /book/<slug>/private/ is a real page for the tours sold privately on the site. The
// other private tours redirect it to the charter request; a rule for a tour that
// has the page would never fire (Netlify serves the page), so the two lists are kept apart.
describe('public/_redirects: private booking steps', () => {
	const rules = readFileSync(new URL('../../public/_redirects', import.meta.url), 'utf8')
		.split('\n')
		.filter((line) => line.trim() && !line.trim().startsWith('#'))
		.map((line) => line.trim().split(/\s+/));
	const redirected = new Map(rules.flatMap(([from, to, status]) => {
		const slug = from.match(/^\/book\/([^/]+)\/private\/?$/)?.[1];
		return slug ? [[slug, { to, status }] as const] : [];
	}));

	it('redirects exactly the private tours that are only booked on request, to their charter request', () => {
		const onRequest = tours.filter((t) => t.types.includes('private') && !supportsPrivateBook(t)).map((t) => t.slug).sort();
		expect([...redirected.keys()].sort()).toEqual(onRequest);
		for (const [slug, rule] of redirected) expect(rule, slug).toEqual({ to: charterUrl(slug), status: '301' });
	});

	it('never redirects a tour sold privately on the site, and has no catch-all rule', () => {
		for (const slug of Object.keys(PRIVATE_TOURS)) expect(redirected.has(slug), slug).toBe(false);
		expect(rules.some(([from]) => from.startsWith('/book/:'))).toBe(false);
	});
});
