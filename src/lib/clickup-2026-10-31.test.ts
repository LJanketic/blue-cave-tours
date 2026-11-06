import { describe, expect, it } from 'vitest';
import { tours, DEFAULT_AGE_BANDS } from '../data/tour-catalog';
import { CHILD_MAX_AGE, INFANT_MAX_AGE, PRICE_BLUE_CAVE, PRICE_BLUE_LAGOON, PRICE_GOLDEN_HORN } from '../data/prices';
import { pricingAnswer } from '../data/faq';
import { LOWEST_GROUP_PRICE } from '../data/marketing';
import { toTourCardDTO } from './cards';
import { tourJsonLd } from './seo';
import { getTourBySlug } from './tours';
import { computeBookingTotal, lineItemsFor } from './price';
import { tourCtas } from './tour-display';
import { offersPrivateFlow, supportsPrivateBook } from './booking';
import { validatePrivateBookingInput, type PrivateBookingInput } from './bookings/service';
import { parseCharterRequest, validateCharterRequest } from './charter';
import { CHARTER_ROUTES, CUSTOM_ROUTE_ID, charterTourSlug, closestDuration, routeById } from '../config/charter';
import { CANCELLATION_CARD, CANCELLATION_HOURS, CANCELLATION_SHORT } from '../config/cancellation';
import { assertHomeVideo } from './video-preview';
import type { TourDetail } from '../types/tour';

/*
 * Coverage for the ClickUp tasks of 31 Oct 2026 (docs/clickup-2026-10-31-plan.md):
 * C1 prices and age bands, C4 the tour card's actions, C5 the private step on
 * every group + private tour, C6 the video config guard.
 */

const tour = (slug: string) => {
	const t = tours.find((x) => x.slug === slug);
	if (!t) throw new Error(`no tour ${slug}`);
	return t;
};

const GROUP_AND_PRIVATE = ['blue-cave-hvar-5-islands', 'golden-horn-brac-hvar', 'hvar-red-rocks-pakleni', 'blue-lagoon-morning', 'blue-lagoon-afternoon', 'dubrovnik-one-way'];
const QUOTE_ONLY_PRIVATE = GROUP_AND_PRIVATE.filter((s) => s !== 'blue-cave-hvar-5-islands');

describe('C1: age bands (operator table: infant 0–3, child 4–11, adult 12+)', () => {
	it('sets the age limits the table gives', () => {
		expect(CHILD_MAX_AGE).toBe(11);
		expect(INFANT_MAX_AGE).toBe(3);
	});

	it('labels the default age bands from them', () => {
		expect(DEFAULT_AGE_BANDS).toEqual({ adult: 'Age 12+', child: 'Age 4–11', infantMaxAge: 3 });
	});

	it('no tour in the catalog overrides the default bands with the old 0–2 / 3–17 / 18+ ones', () => {
		for (const t of tours) {
			const bands = t.ageBands ?? DEFAULT_AGE_BANDS;
			expect(bands.adult, t.slug).not.toMatch(/18/);
			expect(bands.child, t.slug).not.toMatch(/17/);
			expect(bands.infantMaxAge, t.slug).toBe(3);
		}
	});
});

describe('C1: prices (operator table)', () => {
	it('matches the table, both seasons', () => {
		expect(PRICE_BLUE_CAVE).toEqual({ low: { adult: 149, child: 129 }, peak: { adult: 159, child: 139 } });
		expect(PRICE_GOLDEN_HORN).toEqual({ low: { adult: 129, child: 89 }, peak: { adult: 139, child: 99 } });
		expect(PRICE_BLUE_LAGOON).toEqual({ low: { adult: 70, child: 60 }, peak: { adult: 75, child: 65 } });
	});

	it('the FAQ pricing answer has the new prices and age limits, word for word', () => {
		const answer = pricingAnswer();
		expect(answer).toContain('Blue Cave, Vis & Hvar — Five Islands: €149 per adult and €129 per child in low season, €159 and €139 in peak season.');
		expect(answer).toContain('Golden Horn, Brač & Hvar: €129 per adult and €89 per child in low season, €139 and €99 in peak season.');
		expect(answer).toContain('Blue Lagoon, Drvenik (morning or afternoon): €70 per adult and €60 per child in low season, €75 and €65 in peak season.');
		expect(answer).toContain('children up to 11 pay the child price; infants up to 3 travel free');
		// The private Blue Cave boat is paid on the site now, at the operator's price; the rest are quoted.
		expect(answer).toContain(
			'A private Blue Cave boat is €1,500 (low season) or €2,000 (peak); other private experiences are quoted on request.',
		);
		expect(answer).not.toContain('Private experiences are quoted on request');
		// The old prices and ages are gone.
		for (const old of ['€169', '€65 per adult', '€59', '€69', 'up to 17', 'up to 2 ']) expect(answer).not.toContain(old);
	});

	it('the cheapest group tour is "From €70"', () => {
		expect(LOWEST_GROUP_PRICE).toBe(70);
	});

	it.each([
		['blue-cave-hvar-5-islands', 149],
		['golden-horn-brac-hvar', 129],
		['blue-lagoon-morning', 70],
		['blue-lagoon-afternoon', 70],
	])('the %s card says "From €%i"', (slug, from) => {
		expect(toTourCardDTO(tour(slug), [], null).fromPrice).toBe(from);
	});

	it('the quote-only tours have no "From" price on their card', () => {
		for (const slug of ['hvar-red-rocks-pakleni', 'dubrovnik-one-way', 'create-perfect-day-private']) {
			expect(toTourCardDTO(tour(slug), [], null), slug).not.toHaveProperty('fromPrice');
		}
	});

	it.each(['blue-lagoon-morning', 'blue-lagoon-afternoon'])('the %s JSON-LD offers €70 to €75', (slug) => {
		expect(tourJsonLd(getTourBySlug(slug)!, 'https://example.com/').offers).toMatchObject({ lowPrice: 70, highPrice: 75, offerCount: 2, priceCurrency: 'EUR' });
	});

	it('the Golden Horn JSON-LD offers €129 to €139', () => {
		expect(tourJsonLd(getTourBySlug('golden-horn-brac-hvar')!, 'https://example.com/').offers).toMatchObject({ lowPrice: 129, highPrice: 139 });
	});
});

describe('C1: booking totals at the new prices (infants free)', () => {
	const blueCave = tour('blue-cave-hvar-5-islands');
	const blueLagoon = tour('blue-lagoon-afternoon');

	it('a peak Blue Cave day: 2 adults, 2 children, 1 infant', () => {
		expect(computeBookingTotal(blueCave, '2027-08-01', 2, 2)).toBe(2 * 159 + 2 * 139);
		expect(lineItemsFor(blueCave, '2027-08-01', 2, 2, 1)).toEqual([
			{ label: 'Adults', unit: 159, qty: 2, amount: 318 },
			{ label: 'Children', unit: 139, qty: 2, amount: 278 },
			{ label: 'Infants (free)', unit: 0, qty: 1, amount: 0 },
		]);
	});

	it('a low Blue Lagoon day: 2 adults, 1 child, 2 infants', () => {
		expect(computeBookingTotal(blueLagoon, '2027-05-10', 2, 1)).toBe(2 * 70 + 60);
		expect(lineItemsFor(blueLagoon, '2027-05-10', 2, 1, 2)).toEqual([
			{ label: 'Adults', unit: 70, qty: 2, amount: 140 },
			{ label: 'Children', unit: 60, qty: 1, amount: 60 },
			{ label: 'Infants (free)', unit: 0, qty: 2, amount: 0 },
		]);
	});

	it('a peak Blue Lagoon day and the season edges (31 May low, 1 Jun peak, 14 Sep peak, 15 Sep low)', () => {
		expect(computeBookingTotal(blueLagoon, '2027-05-31', 1, 1)).toBe(70 + 60);
		expect(computeBookingTotal(blueLagoon, '2027-06-01', 1, 1)).toBe(75 + 65);
		expect(computeBookingTotal(blueLagoon, '2027-09-14', 1, 1)).toBe(75 + 65);
		expect(computeBookingTotal(blueLagoon, '2027-09-15', 1, 1)).toBe(70 + 60);
	});
});

describe('C4/C5: tourCtas for every tour in the catalog, with the site links', () => {
	const links = {
		book: (s: string) => `/book/${s}/group/`,
		contact: (s: string, topic?: string) => `/contact/?tour=${s}${topic ? `&topic=${topic}` : ''}`,
		charter: (s: string) => `/private-charter/?tour=${s}`,
		private: (s: string) => `/book/${s}/private/`,
	};

	const expected: Record<string, { primary: { label: string; href: string }; secondary: { label: string; href: string; price?: string } | null }> = {
		'blue-cave-hvar-5-islands': {
			primary: { label: 'Book group tour tickets', href: '/book/blue-cave-hvar-5-islands/group/' },
			secondary: { label: 'Private experience', href: '/book/blue-cave-hvar-5-islands/private/', price: '€1,500' },
		},
		'golden-horn-brac-hvar': {
			primary: { label: 'Book group tour tickets', href: '/book/golden-horn-brac-hvar/group/' },
			secondary: { label: 'Private experience', href: '/book/golden-horn-brac-hvar/private/' },
		},
		'hvar-red-rocks-pakleni': {
			primary: { label: 'Plan your private tour', href: '/book/hvar-red-rocks-pakleni/private/' },
			secondary: null,
		},
		'blue-lagoon-morning': {
			primary: { label: 'Book group tour tickets', href: '/book/blue-lagoon-morning/group/' },
			secondary: { label: 'Private experience', href: '/book/blue-lagoon-morning/private/' },
		},
		'blue-lagoon-afternoon': {
			primary: { label: 'Book group tour tickets', href: '/book/blue-lagoon-afternoon/group/' },
			secondary: { label: 'Private experience', href: '/book/blue-lagoon-afternoon/private/' },
		},
		'dubrovnik-one-way': {
			primary: { label: 'Plan your private tour', href: '/book/dubrovnik-one-way/private/' },
			secondary: null,
		},
		'create-perfect-day-private': {
			primary: { label: 'Plan your experience', href: '/private-charter/?tour=create-perfect-day-private' },
			secondary: null,
		},
	};

	it('the table above covers the whole catalog', () => {
		expect(tours.map((t) => t.slug).sort()).toEqual(Object.keys(expected).sort());
	});

	it.each(Object.keys(expected))('%s', (slug) => {
		expect(tourCtas(tour(slug), links)).toEqual(expected[slug]);
	});

	it('no action on any tour still sends the private option to the charter form, or uses the old labels', () => {
		for (const t of tours) {
			const { primary, secondary } = tourCtas(t, links);
			for (const cta of [primary, secondary]) {
				if (!cta) continue;
				expect(cta.label, t.slug).not.toMatch(/^(Book group tour|Book private experience|Plan a private experience)$/);
			}
			if (secondary) expect(secondary.href, t.slug).not.toContain('/private-charter/');
		}
	});
});

describe('C5: which tours get the private step, and which pay now', () => {
	it.each(tours.map((t) => [t.slug, t] as const))('%s', (slug, t) => {
		expect(offersPrivateFlow(t), slug).toBe(GROUP_AND_PRIVATE.includes(slug));
		expect(supportsPrivateBook(t), slug).toBe(slug === 'blue-cave-hvar-5-islands');
	});

	it('truth table on synthetic tours', () => {
		const dep = [{ time: '07:20' }];
		expect(offersPrivateFlow({ slug: 'x', types: ['group', 'private'] })).toBe(true);
		expect(offersPrivateFlow({ slug: 'x', types: ['private', 'group'] })).toBe(true);
		expect(offersPrivateFlow({ slug: 'x', types: ['group'] })).toBe(false);
		// Since the 4 Nov tour sheet a private-only tour with a fixed route has the step too; only the custom day doesn't.
		expect(offersPrivateFlow({ slug: 'x', types: ['private'] })).toBe(true);
		expect(offersPrivateFlow({ slug: 'create-perfect-day-private', types: ['private'] })).toBe(false);
		expect(offersPrivateFlow({ slug: 'x', types: [] })).toBe(false);
		// Pay now needs private, a boat price and a fixed departure.
		expect(supportsPrivateBook({ slug: 'blue-cave-hvar-5-islands', types: ['group', 'private'], departures: dep })).toBe(true);
		expect(supportsPrivateBook({ slug: 'blue-cave-hvar-5-islands', types: ['group'], departures: dep })).toBe(false);
		expect(supportsPrivateBook({ slug: 'blue-cave-hvar-5-islands', types: ['group', 'private'], departures: [] })).toBe(false);
		expect(supportsPrivateBook({ slug: 'golden-horn-brac-hvar', types: ['group', 'private'], departures: dep })).toBe(false);
	});
});

describe('C5 (server): no pay-now for a tour without a boat price', () => {
	const NOW = new Date('2027-06-01T10:00:00Z');
	const base: PrivateBookingInput = {
		kind: 'private',
		date: '2027-07-15',
		slot: '',
		adults: 2,
		children: 0,
		infants: 0,
		extras: [],
		pickup: 'riva',
		firstName: 'Jane',
		lastName: 'Smith',
		email: 'jane@example.com',
		phone: '+44 7700 900123',
		notes: null,
	};

	it.each(QUOTE_ONLY_PRIVATE)('refuses a private draft of %s, even at its own departure time or a charter-window time', (slug) => {
		const t = getTourBySlug(slug) as TourDetail;
		for (const slot of [t.departures[0]?.time ?? '10:00', '10:00']) {
			expect(validatePrivateBookingInput(t, { ...base, slot }, NOW), `${slug} ${slot}`).toBe('private');
		}
	});

	it('still accepts the Blue Cave boat (control)', () => {
		const t = getTourBySlug('blue-cave-hvar-5-islands') as TourDetail;
		expect(validatePrivateBookingInput(t, { ...base, slot: '07:20' }, NOW)).toBeNull();
	});
});

describe('C5 (server): the quote request each private step sends is accepted', () => {
	const NOW = new Date('2027-06-01T10:00:00Z');
	const routeFor = (slug: string) => CHARTER_ROUTES.find((r) => r.tourSlug === slug || r.aliases?.includes(slug))!;
	/** What PrivateBookingFlow posts (private.astro passes charterRoute and closestDuration(tour.durationHours)). */
	const request = (slug: string, time: string) =>
		parseCharterRequest(
			{
				route: routeFor(slug).id,
				tourSlug: slug,
				date: '2027-06-10',
				time,
				duration: String(closestDuration(tour(slug).durationHours)),
				adults: 2,
				children: 1,
				infants: 0,
				firstName: 'Jane',
				lastName: 'Smith',
				email: 'jane@example.com',
				phone: '+44 7700 900123',
				notes: '',
				pickup: '',
				extras: [],
			},
			'website',
		);

	it.each(QUOTE_ONLY_PRIVATE)('%s: at its catalog departure (or the default when it has none), filed under that tour', (slug) => {
		const input = request(slug, tour(slug).departures[0]?.time ?? '10:00');
		expect(validateCharterRequest(input, NOW), slug).toBeNull();
		expect(charterTourSlug(routeById(input.route)!, input.tourSlug), slug).toBe(slug);
	});

	it.each(['hvar-red-rocks-pakleni', 'dubrovnik-one-way'])('%s (no fixed departure): takes the charter window 06:00–20:00, refuses 05:55 and 20:05', (slug) => {
		expect(tour(slug).departures).toEqual([]);
		expect(validateCharterRequest(request(slug, '06:00'), NOW)).toBeNull();
		expect(validateCharterRequest(request(slug, '20:00'), NOW)).toBeNull();
		expect(validateCharterRequest(request(slug, '05:55'), NOW)).toBe('time');
		expect(validateCharterRequest(request(slug, '20:05'), NOW)).toBe('time');
		expect(validateCharterRequest(request(slug, '9:15'), NOW)).toBe('time');
	});

	it('the duration the step sends is one the charter form offers, for every tour with the step', () => {
		for (const t of tours.filter(offersPrivateFlow)) expect(validateCharterRequest(request(t.slug, t.departures[0]?.time ?? '10:00'), NOW), t.slug).toBeNull();
	});
});

describe('C5: charterTourSlug never files a request under another route\'s tour', () => {
	it('falls back to the route\'s own tour for a tour of another route, an unknown slug or junk', () => {
		const lagoon = routeById('blue-lagoon')!;
		for (const bad of ['blue-cave-hvar-5-islands', 'create-perfect-day-private', 'nope', '', '../admin', '<script>alert(1)</script>', 'blue-lagoon-afternoon ', 'BLUE-LAGOON-AFTERNOON']) {
			expect(charterTourSlug(lagoon, bad), JSON.stringify(bad)).toBe('blue-lagoon-morning');
		}
	});

	it('does not accept a route id as a tour slug unless it is that tour (Blue Lagoon\'s id is not a tour)', () => {
		expect(charterTourSlug(routeById('blue-lagoon')!, 'blue-lagoon')).toBe('blue-lagoon-morning');
	});

	it('every route files its own tour, and only accepts itself or its aliases', () => {
		for (const route of CHARTER_ROUTES) {
			expect(charterTourSlug(route), route.id).toBe(route.tourSlug);
			for (const other of CHARTER_ROUTES) {
				if (other === route) continue;
				const accepted = other.tourSlug === route.tourSlug || route.aliases?.includes(other.tourSlug);
				expect(charterTourSlug(route, other.tourSlug), `${route.id} ← ${other.tourSlug}`).toBe(accepted ? other.tourSlug : route.tourSlug);
			}
		}
	});

	it('the custom route stays on the Perfect Day landing whatever tour is sent', () => {
		const custom = routeById(CUSTOM_ROUTE_ID)!;
		for (const t of tours) expect(charterTourSlug(custom, t.slug), t.slug).toBe('create-perfect-day-private');
	});

	it('parseCharterRequest caps the tour slug at 60 characters', () => {
		const long = `blue-lagoon-afternoon${'x'.repeat(200)}`;
		const parsed = parseCharterRequest({ route: 'blue-lagoon', tourSlug: long }, 'website');
		expect(parsed.tourSlug).toHaveLength(60);
		expect(charterTourSlug(routeById('blue-lagoon')!, parsed.tourSlug)).toBe('blue-lagoon-morning');
	});
});

describe('C4: CANCELLATION_CARD', () => {
	it('is the design\'s line, the short form of CANCELLATION_SHORT', () => {
		expect(CANCELLATION_HOURS).toBe(48);
		expect(CANCELLATION_CARD).toBe('Free cancellation up to 48h before');
		expect(CANCELLATION_SHORT.startsWith(CANCELLATION_CARD)).toBe(true);
	});
});

describe('C6: assertHomeVideo refuses anything but a flat /media/*.mp4', () => {
	const ok = { src: '/media/home-preview.mp4', durationSeconds: 22, description: 'The boat leaves Hvar.' };
	it.each([
		'media/home-preview.mp4',
		'//media/home-preview.mp4',
		'/public/media/home-preview.mp4',
		'/media/sub/home-preview.mp4',
		'/media/../secret.mp4',
		'/media/home-preview.mp4?autoplay=1',
		'/media/home-preview.MP4',
		'/media/home-preview.mp4.webm',
		'/media/home preview.mp4',
		'/images/home-preview.mp4',
		'data:video/mp4;base64,AAAA',
		'',
	])('refuses %j', (src) => {
		expect(() => assertHomeVideo({ ...ok, src })).toThrow();
	});

	it('refuses a bad duration even with a good file', () => {
		expect(() => assertHomeVideo({ ...ok, durationSeconds: 0 })).toThrow();
		expect(() => assertHomeVideo({ ...ok, durationSeconds: 22.5 })).toThrow();
	});
});
