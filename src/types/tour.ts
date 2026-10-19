import type { PhotoRef } from '../data/tour-photos';

export type ItineraryKind = 'morning' | 'afternoon' | 'full' | 'flexible';

/** A fixed daily departure. `checkIn` is when guests should be at the boat. */
export type Departure = { time: string; checkIn?: string; label?: string };

/** One itinerary stop. `time` only where the operator gives one (C-19). */
export type ItineraryStep = { time?: string; label: string; description?: string; icon: string };

/** Filter tags (spec §9.1); they replace guessing from titles and durations. */
export type TourTag = 'sunset' | 'swim' | 'snorkel' | 'cave' | 'half-day' | 'family';

/**
 * A fee paid on top of the tour price, e.g. a cave ticket bought on-site (C-23).
 * `shortText` is the card and price-box line ("Blue Cave ticket, paid on site").
 */
export type AdditionalFee = { text: string; shortText: string; amountLabel?: string; mandatory: boolean; url?: string };

export type AgeBands = { adult: string; child: string; infantMaxAge: number };

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
	/** Display copy, e.g. "07:05 check-in · 07:20 departure" or "Departure time confirmed at booking". */
	departure: string;
	/** Fixed daily departures the booking flow offers. Empty when the time isn't fixed yet. */
	departures: Departure[];
	/** Display copy, e.g. "Approx. 10 hours". */
	duration: string;
	/** Short card label, e.g. "10 h". */
	durationShort: string;
	/** For sorting; the shortest option for a range ("1–10 hours" → 1). */
	durationHours: number;
	returnTime: string;
	itineraryKind: ItineraryKind;
	itineraryLabel: string;
	itinerary: ItineraryStep[];
	overviewHighlights: string;
	meetingPoint: string;
	weather: string;
	importantInfo: string;
	whatToBring: string[];
	included: string[];
	notIncluded: string[];
	/** Display pricing copy (seasonal tiers, "quoted per boat") shown on detail and booking pages. */
	priceNotes: string;
	/**
	 * Peak-season prices in euros, what the booking total is computed from.
	 * Null when the tour is quoted on request. Seasonal pricing is out of scope
	 * (payments plan D8); the low-season figures are only in `priceNotes`.
	 */
	adultPrice: number | null;
	childPrice: number | null;
	priceUnit: 'person' | 'boat';
	/** Fees on top of the price; shown next to it (consumer law, C-23). */
	additionalFees: AdditionalFee[];
	groupSale?: string;
	disclaimers: string[];
	gallery: PhotoRef[];
	image: PhotoRef;
	/** Slider order on the homepage and the "Recommended" sort. */
	featured?: boolean;
	/**
	 * Which booking modes this tour offers. Drives the Group/Private labels;
	 * together with a numeric `adultPrice` it also decides whether the tour
	 * can be booked instantly (see supportsInstantBook).
	 */
	types: ('group' | 'private')[];
	tags: TourTag[];
	/**
	 * Marketing badge. 'bestseller' only shows once BESTSELLER_EVIDENCE is set
	 * in src/config/site.ts (C-24): an unbacked "Best seller" is a misleading claim.
	 */
	badge: 'bestseller' | 'pick' | 'new' | null;
	/** Owner-supplied; unset means not stated. */
	languages?: string[];
	/** Defaults to DEFAULT_AGE_BANDS (src/data/tour-catalog.ts). */
	ageBands?: AgeBands;
	/**
	 * Slug of this tour's headline destination (see src/data/destinations.ts),
	 * for the breadcrumb and structured data. Not inferred from
	 * getDestinationsForTour's result order, which reflects declaration order
	 * in the destinations file, not relevance to this specific tour. Omit for
	 * tours with no single namesake destination (e.g. a custom/flexible route).
	 */
	primaryDestinationSlug?: string;
};
