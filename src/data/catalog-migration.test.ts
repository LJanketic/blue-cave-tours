import { describe, expect, it } from 'vitest';
import { tours } from './tour-catalog';

/**
 * PR 1b replaced fields that code used to parse out of display copy with
 * real data (spec §9.1). The old parsers live on only here, to prove the new
 * values say exactly what the copy said. `fromPrice` itself was deleted, so
 * its last values are frozen below.
 */

const OLD_FROM_PRICE: Record<string, string> = {
	'blue-cave-hvar-5-islands': '€169',
	'golden-horn-brac-hvar': '€139',
	'hvar-red-rocks-pakleni': 'Price on request',
	'blue-lagoon-morning': '€75',
	'blue-lagoon-afternoon': '€75',
	'dubrovnik-one-way': 'On request',
	'create-perfect-day-private': 'On request',
};

function parseAdultPrice(fromPrice: string): number | null {
	const match = fromPrice.match(/€(\d+)/);
	return match ? Number.parseInt(match[1], 10) : null;
}

function parseChildPrice(priceNotes: string): number | null {
	const matches = [...priceNotes.matchAll(/€(\d+)[^€]*?child/gi)];
	return matches.length ? Number.parseInt(matches[matches.length - 1][1], 10) : null;
}

function parseDurationHours(duration: string): number | null {
	const match = duration.match(/(\d+(?:\.\d+)?)/);
	return match ? Number(match[1]) : null;
}

/** The booking flow's old slot parser: only "HH:MM check-in · HH:MM departure" counted as a fixed time. */
function parseDepartureTime(departure: string): string | null {
	return departure.match(/\d{2}:\d{2}\s+check-in.*?(\d{2}:\d{2})\s+departure/i)?.[1] ?? null;
}

function oldIsShortTour(tour: (typeof tours)[number]): boolean {
	if (tour.itineraryKind === 'morning' || tour.itineraryKind === 'afternoon') return true;
	if (/half[- ]?day/i.test(`${tour.slug} ${tour.title} ${tour.tagline}`)) return true;
	const hours = parseDurationHours(tour.duration);
	return hours !== null && hours < 4;
}

function oldIsSunsetTour(tour: (typeof tours)[number]): boolean {
	return `${tour.title} ${tour.tagline} ${tour.slug} ${tour.shortDescription}`.toLowerCase().includes('sunset');
}

describe('catalog migration (PR 1b)', () => {
	it('covers every tour', () => {
		expect(tours.map((t) => t.slug).sort()).toEqual(Object.keys(OLD_FROM_PRICE).sort());
	});

	for (const tour of tours) {
		describe(tour.slug, () => {
			it('prices equal the old copy', () => {
				expect(tour.adultPrice).toBe(parseAdultPrice(OLD_FROM_PRICE[tour.slug]));
				expect(tour.childPrice).toBe(parseChildPrice(tour.priceNotes));
			});

			it('departures equal the old fixed-time parse', () => {
				const old = parseDepartureTime(tour.departure);
				expect(tour.departures.map((d) => d.time)).toEqual(old ? [old] : []);
			});

			it('duration hours and the half-day and sunset filters match', () => {
				expect(tour.durationHours).toBe(parseDurationHours(tour.duration));
				expect(tour.tags.includes('half-day')).toBe(oldIsShortTour(tour));
				expect(tour.tags.includes('sunset')).toBe(oldIsSunsetTour(tour));
			});

			it('itinerary times are the ones written at the start of each step', () => {
				for (const step of tour.itinerary) {
					expect(step.time ?? null).toBe(step.label.match(/^(\d{2}:\d{2}) /)?.[1] ?? null);
				}
			});
		});
	}
});
