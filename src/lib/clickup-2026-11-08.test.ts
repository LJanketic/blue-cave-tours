import { readFileSync } from 'node:fs';
import { arrivalFor, arriveByLabel } from './arrival';
import { describe, expect, it } from 'vitest';
import { tours } from '../data/tour-catalog';
import { FAQ_ITEMS } from '../data/faq';
import { PRIVATE_TOURS, privateDepartureTimes } from '../config/private';
import { LOWEST_PRIVATE_PRICE } from '../data/marketing';
import { supportsPrivateBook } from './booking';
import { privateOnlyFromPrice } from './tour-display';

/*
 * Mare's answers of 8 Nov 2026: every private tour is €1,200 a boat for now,
 * Red Rocks and Dubrovnik are paid online too, and the latest private
 * departure is 11:00, until Vedro confirms the price list and the times.
 * Plus her "Booking confirmation screen" note: arrive by 07:20 only on Blue
 * Cave, 15 minutes before departure on every other tour.
 */

const tour = (slug: string) => {
	const t = tours.find((x) => x.slug === slug);
	if (!t) throw new Error(`no tour ${slug}`);
	return t;
};

describe('ClickUp 8 Nov 2026: private booking on every tour', () => {
	it('pays now on every fixed-route private tour, at €1,200 in both seasons', () => {
		const paid = tours.filter(supportsPrivateBook).map((t) => t.slug).sort();
		expect(paid).toEqual(Object.keys(PRIVATE_TOURS).sort());
		expect(paid).not.toContain('create-perfect-day-private');
		for (const { boat } of Object.values(PRIVATE_TOURS)) expect(boat).toEqual({ low: 1200, peak: 1200 });
		expect(LOWEST_PRIVATE_PRICE).toBe(1200);
	});

	it('offers each tour its own departure, then every 15 minutes up to 11:00', () => {
		const times = (slug: string) => privateDepartureTimes(tour(slug).departures[0].time, PRIVATE_TOURS[slug].latestDeparture);
		expect(times('golden-horn-brac-hvar')).toEqual(['09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00']);
		expect(times('hvar-red-rocks-pakleni')[0]).toBe('09:00');
		expect(times('dubrovnik-one-way')[0]).toBe('08:00');
		expect(times('blue-lagoon-morning')).toEqual(['09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00']);
		expect(times('blue-cave-hvar-5-islands').at(-1)).toBe('11:00');
		// 14:30 is after 11:00: the afternoon boat keeps its own time.
		expect(times('blue-lagoon-afternoon')).toEqual(['14:30']);
		for (const slug of Object.keys(PRIVATE_TOURS)) expect(times(slug).length, slug).toBeGreaterThan(0);
	});

	it('shows "From €1,200 / boat" on the private-only tours, and nothing extra on the others', () => {
		expect(privateOnlyFromPrice(tour('hvar-red-rocks-pakleni'))).toBe(1200);
		expect(privateOnlyFromPrice(tour('dubrovnik-one-way'))).toBe(1200);
		// Group tours keep the adult price; the boat price is on their "Private experience" button.
		expect(privateOnlyFromPrice(tour('golden-horn-brac-hvar'))).toBeNull();
		expect(privateOnlyFromPrice(tour('create-perfect-day-private'))).toBeNull();
	});
});

describe('ClickUp 8 Nov 2026: booking confirmation screen', () => {
	it('tells Blue Cave guests to arrive by 07:20, and no other tour', () => {
		expect(tour('blue-cave-hvar-5-islands').departures).toEqual([{ time: '07:20', arriveOnTime: true }]);
		for (const t of tours.filter((x) => x.slug !== 'blue-cave-hvar-5-islands')) {
			for (const d of t.departures) expect(d.arriveOnTime, t.slug).toBeUndefined();
		}
	});

	it('gives the Blue Cave exception in the FAQ too, at the catalog departure', () => {
		const late = FAQ_ITEMS.find((item) => item.question === 'What if I’m running late?');
		expect(late?.answer).toContain('at least 15 minutes before departure');
		expect(late?.answer).toContain(`for the Blue Cave tour, on time for the ${tour('blue-cave-hvar-5-islands').departures[0].time} departure`);
	});

	it('computes the arrival time the same way for the page and the email (src/lib/arrival.ts)', () => {
		const blueCave = tour('blue-cave-hvar-5-islands').departures;
		const goldenHorn = tour('golden-horn-brac-hvar').departures;
		// Blue Cave: the departure itself, also for a private boat moved to 07:35.
		expect(arrivalFor(blueCave, '07:20')).toEqual({ time: '07:20', minutesEarly: 0 });
		expect(arrivalFor(blueCave, '07:35')).toEqual({ time: '07:35', minutesEarly: 0 });
		expect(arriveByLabel(arrivalFor(blueCave, '07:35'))).toBe('07:35');
		// A check-in, labelled with its real offset.
		expect(arriveByLabel(arrivalFor(goldenHorn, '09:00'))).toBe('08:45 (15 min early)');
		expect(arriveByLabel(arrivalFor([{ time: '09:00', checkIn: '08:30' }], '09:00'))).toBe('08:30 (30 min early)');
		// A private boat moved off the check-in's slot: 15 minutes before.
		expect(arriveByLabel(arrivalFor(goldenHorn, '10:15'))).toBe('10:00 (15 min early)');
		// No usable time.
		expect(arrivalFor(goldenHorn, '00:10')).toBeNull();
		expect(arrivalFor(goldenHorn, 'Flexible')).toBeNull();
		expect(arrivalFor(goldenHorn, '')).toBeNull();
		expect(arriveByLabel(null)).toBe('15 minutes before departure');
	});

	it('groups the total paid like every other price ("€1,200")', () => {
		expect(readFileSync('src/pages/booking/success.astro', 'utf8')).toContain('formatEuro(booking.total)');
	});
});
