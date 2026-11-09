import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CONTACT_NUMBERS, INSTAGRAM_URL, SITE_PHONE, SITE_PHONE_DISPLAY, whatsappLink } from '../config/site';
import { tours } from '../data/tour-catalog';
import { MAX_GUESTS, offersPrivateFlow, supportsPrivateBook } from './booking';
import { tourCtas } from './tour-display';

/*
 * ClickUp Team Board, 4–5 Nov 2026: contact details, Instagram, and the
 * operator's tour sheet (HBC_Tour_Content_Updated.xlsx) for the tour pages.
 */

const tour = (slug: string) => tours.find((t) => t.slug === slug)!;

describe('Contact details (ClickUp "Contact Details mobile and whatsapp")', () => {
	it('lists the three numbers in the design order, the first one marked fastest', () => {
		expect(CONTACT_NUMBERS.map((n) => n.display)).toEqual(['+385 99 472 0697', '+385 98 702 250', '+385 99 389 9994']);
		expect(CONTACT_NUMBERS.filter((n) => n.fastest).map((n) => n.display)).toEqual(['+385 99 472 0697']);
		for (const n of CONTACT_NUMBERS) expect(n.tel.replace(/\D/g, '')).toBe(n.display.replace(/\D/g, ''));
	});

	it('uses the number the operator chose for the footer as the site-wide number', () => {
		expect(SITE_PHONE_DISPLAY).toBe('+385 98 702 250');
		expect(SITE_PHONE).toBe('+38598702250');
		expect(whatsappLink(SITE_PHONE)).toBe('https://wa.me/38598702250');
	});

	it('links Instagram to @hellobluecave', () => {
		expect(INSTAGRAM_URL).toBe('https://www.instagram.com/hellobluecave/');
	});
});

describe('Tour sheet, 4 Nov 2026', () => {
	it('renames the tours as the sheet does', () => {
		expect(tours.map((t) => t.title)).toEqual([
			'Blue Cave, Vis & Hvar — Five Islands Tour',
			'Golden Horn, Brač & Hvar Island Tour',
			'Hvar Red Rocks & Pakleni Islands Tour',
			'Blue Lagoon Tour, Drvenik — Morning',
			'Blue Lagoon Tour, Drvenik — Afternoon',
			'Split to Dubrovnik (One-way)',
			'Create Your Perfect Day at Sea',
		]);
	});

	it('uses the sheet departure times and durations', () => {
		// 8 Nov 2026: Blue Cave guests arrive by the departure itself (Booking confirmation screen).
		expect(tour('blue-cave-hvar-5-islands').departures).toEqual([{ time: '07:20', arriveOnTime: true }]);
		expect(tour('golden-horn-brac-hvar').departures).toEqual([{ time: '09:00', checkIn: '08:45' }]);
		expect(tour('golden-horn-brac-hvar').durationHours).toBe(8);
		expect(tour('blue-lagoon-morning').departures).toEqual([{ time: '09:30', checkIn: '09:15' }]);
		expect(tour('blue-lagoon-morning').returnTime).toBe('14:00');
		expect(tour('blue-lagoon-afternoon').departures).toEqual([{ time: '14:30', checkIn: '14:15' }]);
		expect(tour('blue-lagoon-afternoon').returnTime).toBe('19:00');
		expect(tour('hvar-red-rocks-pakleni').durationHours).toBe(9);
		expect(tour('dubrovnik-one-way').durationHours).toBe(9);
	});

	it('Blue Cave has no "15 minutes early": be there for 07:20 (ClickUp "Mail potvrde gostu")', () => {
		const t = tour('blue-cave-hvar-5-islands');
		expect(t.departures[0].checkIn).toBeUndefined();
		expect(t.faqs?.[0].answer).toContain('Please be there on time.');
		expect(JSON.stringify(t)).not.toMatch(/15 minutes early|07:05/);
	});

	it('makes Red Rocks and Dubrovnik private only, booked and paid through their own private step (Mare, 8 Nov 2026)', () => {
		for (const slug of ['hvar-red-rocks-pakleni', 'dubrovnik-one-way']) {
			const t = tour(slug);
			expect(t.types, slug).toEqual(['private']);
			expect(offersPrivateFlow(t), slug).toBe(true);
			expect(supportsPrivateBook(t), slug).toBe(true);
			const links = { book: () => '', contact: () => '/contact/', charter: () => '/private-charter/', private: (s: string) => `/book/${s}/private/` };
			expect(tourCtas(t, links).primary).toEqual({ label: 'Plan your private tour', href: `/book/${slug}/private/` });
		}
		expect(offersPrivateFlow(tour('create-perfect-day-private'))).toBe(false);
	});

	it('keeps the private boat price in src/config/private.ts, not as a per-person price on the tour', () => {
		for (const slug of ['hvar-red-rocks-pakleni', 'dubrovnik-one-way']) expect(tour(slug).prices, slug).toBeNull();
		expect(supportsPrivateBook(tour('blue-cave-hvar-5-islands'))).toBe(true);
	});

	it('states the guest limit from MAX_GUESTS, never a second number', () => {
		for (const t of tours) {
			const copy = [t.overviewHighlights, ...(t.introMore ?? [])].join(' ');
			for (const n of copy.matchAll(/(?:maximum of|up to) (\d+) people/g)) expect(Number(n[1]), t.slug).toBe(MAX_GUESTS);
		}
	});

	it('gives every sheet tour its FAQs, the sheet inclusions, the safety line and languages', () => {
		for (const t of tours.filter((x) => x.slug !== 'create-perfect-day-private')) {
			expect(t.faqs?.length, t.slug).toBeGreaterThanOrEqual(8);
			expect(t.included.slice(0, 5), t.slug).toEqual(['Crew', 'Fuel', 'Bottled water', 'Snorkelling masks', 'Safety equipment']);
			expect(t.importantInfo, t.slug).toBe('Emergency life jackets on board are not meant for swimming.');
			expect(t.languages, t.slug).toEqual(['English', 'Croatian']);
			expect(t.accessibility, t.slug).toMatch(/^Our tours aren’t recommended for pregnant women/);
		}
		expect(tour('dubrovnik-one-way').included).toContain('Luggage on board');
		expect(tour('dubrovnik-one-way').notIncluded).toEqual(['Lunch', 'Return to Split']);
	});

	it('links the Blue Cave ticket price list', () => {
		expect(tour('blue-cave-hvar-5-islands').additionalFees[0].url).toMatch(/^https:\/\/bluecave-bisevo\.com\/.+\.pdf$/);
	});

	it('has no redirect left on a private booking step that now exists', () => {
		const redirects = readFileSync(new URL('../../public/_redirects', import.meta.url), 'utf8');
		expect(redirects).not.toMatch(/\/book\/(hvar-red-rocks-pakleni|dubrovnik-one-way)\/private/);
	});
});
