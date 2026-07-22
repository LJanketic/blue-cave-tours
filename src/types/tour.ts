import type { PhotoRef } from '../data/tour-photos';

export type ItineraryKind = 'morning' | 'afternoon' | 'full' | 'flexible';

export type TourDetail = {
	/** URL segment and booking id */
	slug: string;
	title: string;
	tagline: string;
	/** Card + SEO description */
	shortDescription: string;
	availability: string;
	/** e.g. "Full day: 08:00 – 18:00" */
	scheduleLabel: string;
	departure: string;
	duration: string;
	returnTime: string;
	itineraryKind: ItineraryKind;
	itineraryLabel: string;
	itinerary: string[];
	overviewHighlights: string;
	meetingPoint: string;
	weather: string;
	importantInfo: string;
	whatToBring: string[];
	included: string[];
	notIncluded: string[];
	/** Display pricing copy shown on cards and detail pages */
	priceNotes: string;
	caveTicketNote: string;
	groupSale?: string;
	disclaimers: string[];
	gallery: PhotoRef[];
	image: PhotoRef;
	fromPrice: string;
	featured?: boolean;
	/**
	 * Which booking modes this tour offers. When omitted it is derived from
	 * booking support (instant-book tours default to group + private available,
	 * quote-only tours default to private).
	 */
	types?: ('group' | 'private')[];
	/** Optional marketing badge shown on cards (e.g. a newly added route). */
	badge?: 'new';
};
