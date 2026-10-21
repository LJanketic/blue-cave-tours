import { describe, expect, it } from 'vitest';
import { tours } from '../data/tour-catalog';
import { getDestinationsForTour } from './destinations';
import { tourHeadings, tourShortName } from './tour-display';

const headings = (slug: string) => {
	const tour = tours.find((t) => t.slug === slug)!;
	return tourHeadings(tour, getDestinationsForTour(slug));
};

describe('tourHeadings', () => {
	it('words every tour page for search', () => {
		expect(Object.fromEntries(tours.map((t) => [t.slug, headings(t.slug)]))).toEqual({
			'blue-cave-hvar-5-islands': {
				about: 'About the Blue Cave, Hvar & 5 islands tour',
				itinerary: 'Tour itinerary — from Split to the Blue Cave, Vis, Hvar and the Pakleni islands',
				included: "What's included in the tour",
				notIncluded: "What's not included",
				goodToKnow: 'Good to know before you go',
			},
			'golden-horn-brac-hvar': {
				about: 'About the Golden Horn, Brač and Hvar tour',
				itinerary: 'Tour itinerary — from Split to Zlatni Rat on Brač, Hvar and the Pakleni islands',
				included: "What's included in the tour",
				notIncluded: "What's not included",
				goodToKnow: 'Good to know before you go',
			},
			'hvar-red-rocks-pakleni': {
				about: 'About the Hvar, Red Rocks & Pakleni islands tour',
				itinerary: 'Tour itinerary — from Split to Hvar and the Pakleni islands',
				included: "What's included in the tour",
				notIncluded: "What's not included",
				goodToKnow: 'Good to know before you go',
			},
			'blue-lagoon-morning': {
				about: 'About the Blue Lagoon Morning tour',
				itinerary: 'Tour itinerary — from Split to the Blue Lagoon and Trogir',
				included: "What's included in the tour",
				notIncluded: "What's not included",
				goodToKnow: 'Good to know before you go',
			},
			'blue-lagoon-afternoon': {
				about: 'About the Blue Lagoon Afternoon tour',
				itinerary: 'Tour itinerary — from Split to the Blue Lagoon and Trogir',
				included: "What's included in the tour",
				notIncluded: "What's not included",
				goodToKnow: 'Good to know before you go',
			},
			'dubrovnik-one-way': {
				about: 'About the Split to Dubrovnik one-way tour',
				itinerary: 'Tour itinerary — from Split to Dubrovnik via Hvar and Korčula',
				included: "What's included in the tour",
				notIncluded: "What's not included",
				goodToKnow: 'Good to know before you go',
			},
			'create-perfect-day-private': {
				about: 'About the Perfect Day at Sea charter',
				itinerary: 'Charter itinerary — from Split to the islands you choose',
				included: "What's included in the charter",
				notIncluded: "What's not included",
				goodToKnow: 'Good to know before you go',
			},
		});
	});

	it('uses the data overrides when set', () => {
		const tour = { ...tours[0], seoHeadings: { about: 'About this day', itinerary: 'The route' } };
		expect(tourHeadings(tour, getDestinationsForTour(tour.slug))).toMatchObject({ about: 'About this day', itinerary: 'The route' });
	});

	it('falls back to a plain heading when no destination is known', () => {
		expect(tourHeadings({ ...tours[0], primaryDestinationSlug: undefined }, []).itinerary).toBe('Tour itinerary');
	});

	it('gives every tour a distinct About heading', () => {
		const about = tours.map((t) => headings(t.slug).about);
		expect(new Set(about).size).toBe(about.length);
	});

	it('shortens titles for use inside a sentence', () => {
		expect(tourShortName('Golden Horn, Brač and Hvar Tour')).toBe('Golden Horn, Brač and Hvar');
		expect(tourShortName('Create Your Perfect Day at Sea')).toBe('Perfect Day at Sea');
		expect(tourShortName('Blue Cave, Hvar & 5 islands')).toBe('Blue Cave, Hvar & 5 islands');
	});
});
