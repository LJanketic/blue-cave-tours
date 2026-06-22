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
	gallery: { src: string; alt: string }[];
	image: { src: string; alt: string };
	fromPrice: string;
	featured?: boolean;
};
