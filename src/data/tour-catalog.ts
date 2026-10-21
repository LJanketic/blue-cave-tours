import type { AgeBands, TourDetail } from '../types/tour';
import { galleryFromDestinations } from './destination-photos';
import { PHOTO } from './tour-photos';
import { CHILD_MAX_AGE, INFANT_MAX_AGE, PRICE_BLUE_CAVE, PRICE_BLUE_LAGOON, PRICE_GOLDEN_HORN } from './prices';

/** Tour catalog — Hello Blue Cave. Content sourced from the verified FigJam tour board. */
const MEETING_POINT =
	'Meet at Split’s Riva promenade, stand number 14. After booking you’ll receive the exact location, map link, and what time to arrive.';

/** Private tours leave from the Riva or Zenta depending on the boat. */
const MEETING_POINT_PRIVATE =
	'Meet at Split’s Riva promenade, stand number 14, or at Zenta, depending on the boat. We confirm the exact spot with you after booking.';

/** Create Your Perfect Day: the meeting point is agreed per booking. */
const MEETING_POINT_FLEXIBLE =
	'Flexible: we agree the meeting point with you when you book, for example Split’s Riva promenade, stand number 14, or Zenta.';

const WEATHER_COPY =
	'We track forecasts and sea state. If conditions are rough or a stop is closed, we adjust the route or timing and communicate the changes.';

const SAFETY_COPY =
	'Follow crew instructions, wear a life jacket when asked, stay seated during manoeuvres, and tell us if you have conditions that affect swimming or sun exposure.';

const BRING_DEFAULT = [
	'Swimsuit and towel',
	'Sunscreen and sunglasses',
	'Hat or cap',
	'Camera or smartphone',
	'Cash or card for lunch and extras',
	'Light jacket for cooler sea breezes',
	'Water shoes or sandals (optional)',
	'Small bag or backpack for personal items',
];

const INCLUDED_DEFAULT = [
	'Professional skipper',
	'Fuel',
	'Bottled water on board',
	'Snorkelling masks',
	'Safety equipment and insurance',
	'VAT',
];

const NOT_INCLUDED_DEFAULT = [
	'Lunch and restaurant drinks, since guests have free time ashore to eat at their own expense',
	'Entrance tickets where applicable, e.g. the Blue Cave ticket',
	'Personal expenses',
];

const DISCLAIMERS = [
	'Routes, order of stops, and swim breaks may vary with weather, harbour traffic, and site regulations.',
	'National park and cave entry fees may be charged separately on-site where applicable.',
];

const CAVE_NOTE =
	'Entering the Blue Cave is optional and the ticket is paid on site. Most guests go in; entry depends on sea conditions and official cave opening hours.';

/** Age bands shown in the booking flow unless a tour sets its own (D-9: infants 0–2 travel free but take a seat). */
export const DEFAULT_AGE_BANDS: AgeBands = {
	adult: `Age ${CHILD_MAX_AGE + 1}+`,
	child: `Age 0–${CHILD_MAX_AGE}`,
	infantMaxAge: INFANT_MAX_AGE,
};

export const tours: TourDetail[] = [
	{
		slug: 'blue-cave-hvar-5-islands',
		primaryDestinationSlug: 'blue-cave',
		title: 'Blue Cave, Hvar & 5 islands',
		tagline: 'Full-day signature route',
		shortDescription:
			'Our flagship day: the Blue Cave on Biševo, a swim at Budikovac Blue Lagoon, Stiniva Cove on Vis, and free time in Hvar Town and the Pakleni Islands.',
		availability: 'Every day, all year round',
		scheduleLabel: 'Full day: 07:20 – approx. 17:30–18:00',
		departure: '07:05 check-in · 07:20 departure',
		departures: [{ time: '07:20', checkIn: '07:05' }],
		duration: 'Approx. 10 hours',
		durationShort: '10 h',
		durationHours: 10,
		returnTime: 'Approx. 17:30–18:00',
		itineraryKind: 'full',
		itineraryLabel: 'Full-day itinerary',
		itinerary: [
			{ time: '07:20', label: '07:20 Departure from Split toward Vis & Biševo area, home to the magical Blue Cave (subject to conditions and optional ticket).', icon: 'map-pin' },
			{ label: 'Swim stop at Budikovac Blue Lagoon (approx. 30–45 minutes).', icon: 'sailboat' },
			{ label: 'Stiniva Cove on Vis (approx. 5–10 minutes), with scenic coastal cruising along the way.', icon: 'swimming' },
			{
				label: 'Free time ashore in Hvar Town (approx. 2–3 hours) and a swim stop at the Pakleni Islands, including Carpe Diem beach (approx. 45–115 minutes).',
				description:
					'In pre-season, when it’s too early for swimming, the route visits Komiža on Vis (approx. 1–1.5 hours) instead of the Pakleni Islands and adds a stop in Milna (approx. 45 minutes) for a drink.',
				icon: 'sunset',
			},
			// No `time`: the return is a window, and itinerary times are a single HH:MM.
			{ label: '17:30–18:00 Return along the Split channel with panoramic views.', icon: 'anchor' },
		],
		overviewHighlights:
			'This full-day speedboat tour takes you to the magical Blue Cave on Biševo Island, where sunlight creates a glowing blue light beneath the cliffs. From there you swim at Budikovac Blue Lagoon and Stiniva Cove on Vis, then explore the streets of Hvar Town and the turquoise bays of the Pakleni Islands. There’s plenty of time to dive into crystal-clear water, snorkel around hidden coves, or stretch out on a picturesque beach before cruising back to Split as the sun dips over the islands.',
		introCollapsible: true,
		meetingPoint: MEETING_POINT,
		weather: WEATHER_COPY,
		importantInfo: SAFETY_COPY,
		whatToBring: BRING_DEFAULT,
		included: INCLUDED_DEFAULT,
		notIncluded: NOT_INCLUDED_DEFAULT,
		prices: PRICE_BLUE_CAVE,
		priceUnit: 'person',
		additionalFees: [{ text: CAVE_NOTE, shortText: 'Blue Cave entry optional, ticket paid on site', mandatory: false }],
		disclaimers: DISCLAIMERS,
		gallery: galleryFromDestinations('blue-cave', 'pakleni', 'hvar', 'vis'),
		image: PHOTO.blueCave,
		featured: true,
		types: ['group', 'private'],
		tags: ['cave', 'swim', 'snorkel'],
		badge: 'bestseller',
	},
	{
		slug: 'golden-horn-brac-hvar',
		primaryDestinationSlug: 'zlatni-rat',
		title: 'Golden Horn, Brač and Hvar Tour',
		tagline: 'Full-day · Golden Horn & Hvar',
		shortDescription:
			'The iconic Golden Horn Beach on Brač, a relaxed lunch stop at Pakleni or Milna, and free time in historic Hvar Town.',
		availability: 'Every day, all year round',
		scheduleLabel: 'Full day: 08:30 – 18:00',
		departure: '08:15 check-in · 08:30 departure',
		departures: [{ time: '08:30', checkIn: '08:15' }],
		duration: 'Approx. 10 hours',
		durationShort: '10 h',
		durationHours: 10,
		returnTime: '18:00',
		itineraryKind: 'full',
		itineraryLabel: 'Full-day itinerary',
		itinerary: [
			{ time: '08:30', label: '08:30 Departure from Split toward Brač Island.', icon: 'map-pin' },
			{ label: 'Golden Horn Beach in Bol (approx. 2 hours).', icon: 'sailboat' },
			{ label: 'Swim stops and coastal cruising toward the Pakleni Islands, Carpe Diem beach and Ždrilo (approx. 30–60 minutes).', icon: 'swimming' },
			{ label: 'Free time ashore in Hvar Town (approx. 2 hours), with time for lunch. Private tours stop for lunch in Milna instead.', icon: 'sunset' },
			{ time: '18:00', label: '18:00 Return along the Split channel with panoramic views.', icon: 'anchor' },
		],
		overviewHighlights:
			'This full-day speedboat tour takes you to the iconic Golden Horn Beach on Brač Island, known for its striking shape and crystal-clear water. From there it’s on to the Pakleni Islands or Milna for a relaxed lunch stop, then time in the charming streets of Hvar Town. Along the way there’s room for a swim off the boat, some snorkelling over hidden reefs, or soaking up the sun on a scenic beach, before heading back to Split.',
		meetingPoint: MEETING_POINT,
		weather: WEATHER_COPY,
		importantInfo: SAFETY_COPY,
		whatToBring: BRING_DEFAULT,
		included: INCLUDED_DEFAULT,
		notIncluded: NOT_INCLUDED_DEFAULT,
		prices: PRICE_GOLDEN_HORN,
		priceUnit: 'person',
		additionalFees: [],
		disclaimers: DISCLAIMERS,
		gallery: galleryFromDestinations('zlatni-rat', 'pakleni', 'hvar'),
		image: PHOTO.goldenHorn,
		featured: false,
		types: ['group', 'private'],
		tags: ['swim', 'snorkel'],
		badge: null,
	},
	{
		slug: 'hvar-red-rocks-pakleni',
		primaryDestinationSlug: 'hvar',
		title: 'Hvar, Red Rocks & Pakleni islands',
		tagline: 'Full-day · Hvar, Red Rocks & Pakleni',
		shortDescription:
			'A full day via Milna on Brač to the Red Rocks on Hvar’s south coast, historic Hvar Town, and lunch and a swim in the Pakleni Islands.',
		availability: 'On request',
		scheduleLabel: 'Full day: flexible, typically 09:30 – 18:00',
		departure: 'Flexible, typically 09:30',
		departures: [] /* flexible, agreed per booking: no fixed group time yet (D4b) */,
		duration: 'Approx. 8.5 hours',
		durationShort: '8.5 h',
		durationHours: 8.5,
		returnTime: '18:00',
		itineraryKind: 'full',
		itineraryLabel: 'Full-day itinerary',
		itinerary: [
			{ label: 'Flexible departure (typically 09:30) from Split toward Brač Island and Milna Village.', icon: 'map-pin' },
			{ label: 'Swim stops along Hvar’s scenic south coast and at the striking Red Rocks, with coastal cruising along the way.', icon: 'sailboat' },
			{ label: 'Free time ashore in Hvar Town and the Pakleni Islands, with lunch on the Pakleni Islands or in Milna on Hvar, where the schedule allows.', icon: 'sunset' },
			{ label: 'A final swim stop at the Pakleni Islands or a hidden bay on the way back.', icon: 'swimming' },
			{ time: '18:00', label: '18:00 Return to Split.', icon: 'anchor' },
		],
		overviewHighlights:
			'This full-day speedboat tour takes you to Milna Village on Brač Island, then along Hvar’s scenic south coast to swim at the striking Red Rocks, before exploring historic Hvar Town. The day finishes with lunch and a final swim in the turquoise bays of the Pakleni Islands. Along the way there’s time to jump straight off the boat for a swim, explore beneath the surface with a snorkel, or stretch out on a hidden beach – the choice is entirely yours.',
		meetingPoint: MEETING_POINT_PRIVATE,
		weather: WEATHER_COPY,
		importantInfo: SAFETY_COPY,
		whatToBring: BRING_DEFAULT,
		included: INCLUDED_DEFAULT,
		notIncluded: NOT_INCLUDED_DEFAULT,
		prices: null,
		// Per person once the group price is set (D4b): "Price on request" until then.
		priceUnit: 'person',
		additionalFees: [],
		disclaimers: DISCLAIMERS,
		gallery: galleryFromDestinations('hvar', 'pakleni'),
		image: PHOTO.hvar,
		featured: false,
		types: ['group', 'private'],
		tags: ['swim', 'snorkel'],
		badge: null,
	},
	{
		slug: 'blue-lagoon-morning',
		primaryDestinationSlug: 'blue-lagoon',
		title: 'Blue Lagoon Morning Tour',
		tagline: 'Half day · Blue Lagoon & Trogir',
		shortDescription:
			'A relaxed half-day to Duga Bay on Čiovo and the turquoise Blue Lagoon, with free time in Trogir Old Town.',
		availability: 'Every day, all year round',
		scheduleLabel: 'Half day: 09:30 – 14:00',
		departure: '09:15 check-in · 09:30 departure',
		departures: [{ time: '09:30', checkIn: '09:15' }],
		duration: 'Approx. 4.5 hours',
		durationShort: '4.5 h',
		durationHours: 4.5,
		returnTime: '14:00',
		itineraryKind: 'morning',
		itineraryLabel: 'Morning itinerary',
		itinerary: [
			{ time: '09:30', label: '09:30 Departure from Split toward Čiovo Island and Duga Bay or Borko (approx. 60 minutes).', icon: 'map-pin' },
			{ label: 'Swim stop at the turquoise Blue Lagoon, with scenic coastal cruising along the way (approx. 60 minutes).', icon: 'sailboat' },
			{ label: 'Free time ashore in Trogir Old Town or Maslinica (Šolta Island) where the schedule allows (approx. 60 minutes).', icon: 'swimming' },
			{ time: '14:00', label: '14:00 Return to Split.', icon: 'sunset' },
		],
		overviewHighlights:
			'This half-day morning speedboat tour takes you to Duga Bay on Čiovo Island, then to swim in the turquoise waters of the Blue Lagoon, before strolling through the historic streets of Trogir Old Town. There’s time to cool off with a swim, try some snorkelling, or unwind on the beach before heading back to Split in time for the afternoon.',
		meetingPoint: MEETING_POINT,
		weather: WEATHER_COPY,
		importantInfo: SAFETY_COPY,
		whatToBring: BRING_DEFAULT,
		included: INCLUDED_DEFAULT,
		notIncluded: NOT_INCLUDED_DEFAULT,
		prices: PRICE_BLUE_LAGOON,
		priceUnit: 'person',
		additionalFees: [],
		disclaimers: DISCLAIMERS,
		gallery: galleryFromDestinations('blue-lagoon', 'trogir'),
		image: PHOTO.blueLagoon,
		featured: true,
		types: ['group', 'private'],
		tags: ['swim', 'snorkel', 'half-day'],
		badge: 'bestseller',
	},
	{
		slug: 'blue-lagoon-afternoon',
		primaryDestinationSlug: 'blue-lagoon',
		title: 'Blue Lagoon Afternoon Tour',
		tagline: 'Half day · Blue Lagoon & Trogir',
		shortDescription:
			'An afternoon half-day to Duga Bay on Čiovo and the turquoise Blue Lagoon, with a stroll through Trogir Old Town as the day winds down.',
		availability: 'Every day, all year round',
		scheduleLabel: 'Half day: 14:30 – 19:00',
		departure: '14:15 check-in · 14:30 departure',
		departures: [{ time: '14:30', checkIn: '14:15' }],
		duration: 'Approx. 4.5 hours',
		durationShort: '4.5 h',
		durationHours: 4.5,
		returnTime: '19:00',
		itineraryKind: 'afternoon',
		itineraryLabel: 'Afternoon itinerary',
		itinerary: [
			{ time: '14:30', label: '14:30 Departure from Split toward Čiovo Island and Duga Bay or Borko.', icon: 'map-pin' },
			{ label: 'Swim stop at the turquoise Blue Lagoon, with scenic coastal cruising along the way.', icon: 'sailboat' },
			{ label: 'Free time ashore in Trogir Old Town where the schedule allows.', icon: 'swimming' },
			{ time: '19:00', label: '19:00 Return to Split.', icon: 'sunset' },
		],
		overviewHighlights:
			'This half-day afternoon speedboat tour takes you to Duga Bay on Čiovo Island, then on to swim in the turquoise waters of the Blue Lagoon, before strolling through the historic streets of Trogir Old Town. Along the way there’s time to cool off with a swim, try some snorkelling, or simply unwind on the beach as the day winds down, before heading back to Split.',
		meetingPoint: MEETING_POINT,
		weather: WEATHER_COPY,
		importantInfo: SAFETY_COPY,
		whatToBring: BRING_DEFAULT,
		included: INCLUDED_DEFAULT,
		notIncluded: NOT_INCLUDED_DEFAULT,
		prices: PRICE_BLUE_LAGOON,
		priceUnit: 'person',
		additionalFees: [],
		disclaimers: DISCLAIMERS,
		gallery: galleryFromDestinations('blue-lagoon', 'trogir'),
		image: PHOTO.blueLagoonAlt,
		featured: false,
		types: ['group', 'private'],
		tags: ['swim', 'snorkel', 'half-day'],
		badge: null,
	},
	{
		slug: 'dubrovnik-one-way',
		primaryDestinationSlug: 'dubrovnik',
		title: 'Split – Dubrovnik One Way',
		// The generated "About the Split – Dubrovnik One Way tour" reads awkwardly.
		seoHeadings: { about: 'About the Split to Dubrovnik one-way tour' },
		tagline: 'One-way · Split to Dubrovnik',
		shortDescription: 'A one-way transfer by speedboat from Split to Dubrovnik, calling at Hvar Old Town and Korčula along the way.',
		availability: 'On request',
		scheduleLabel: 'One-way: approx. 08:00–09:30 – 18:00–19:00',
		departure: 'Approx. 08:00–09:30 departure',
		departures: [] /* approx. 08:00–09:30, agreed per booking: no fixed group time yet (D4b) */,
		duration: 'Approx. 10 hours',
		durationShort: '10 h',
		durationHours: 10,
		returnTime: 'No return leg, one-way to Dubrovnik',
		itineraryKind: 'full',
		itineraryLabel: 'One-way itinerary',
		itinerary: [
			{ label: 'Approx. 08:00–09:30 Departure from Split toward Hvar Old Town.', icon: 'map-pin' },
			{ label: 'Swim stop in a secluded bay, with scenic coastal cruising toward Korčula.', icon: 'sailboat' },
			{ label: 'Free time ashore in Korčula Old Town, with time for lunch, where the schedule allows.', icon: 'swimming' },
			{ label: 'Second swim stop or snorkelling among the islands (optional).', icon: 'sunset' },
			{ label: 'Approx. 18:00–19:00 Arrival in Dubrovnik (no return leg, one-way trip).', icon: 'anchor' },
		],
		overviewHighlights:
			'This one-way speedboat journey takes you from Split to historic Hvar Old Town, with a stop for a swim in a secluded bay, before exploring the walled town of Korčula with time for lunch. From there it’s a second swim or some snorkelling among the islands as you continue toward Dubrovnik, arriving by early evening.',
		meetingPoint: MEETING_POINT_PRIVATE,
		weather: WEATHER_COPY,
		importantInfo: SAFETY_COPY,
		whatToBring: BRING_DEFAULT,
		included: INCLUDED_DEFAULT,
		notIncluded: NOT_INCLUDED_DEFAULT,
		prices: null,
		// Per person once the group price is set (D4b): "Price on request" until then.
		priceUnit: 'person',
		additionalFees: [],
		disclaimers: DISCLAIMERS,
		gallery: galleryFromDestinations('hvar', 'korcula', 'dubrovnik'),
		image: PHOTO.dubrovnik,
		featured: false,
		types: ['group', 'private'],
		tags: ['swim', 'snorkel'],
		badge: null,
	},
	{
		slug: 'create-perfect-day-private',
		title: 'Create Your Perfect Day at Sea',
		tagline: 'Private charter · flexible itinerary',
		shortDescription:
			'A fully private charter: pick your own route from the Blue Cave, Hvar Town, Pakleni, Brač, Vis, or Šolta, or let your skipper plan the day.',
		availability: 'On request',
		scheduleLabel: 'Flexible · 1–10 hours',
		departure: 'Flexible, agreed when you book',
		departures: [] /* private: flexible, agreed per booking */,
		duration: '1–10 hours, depending on your booking',
		durationShort: '1–10 h',
		durationHours: 1,
		returnTime: 'Flexible',
		itineraryKind: 'flexible',
		itineraryLabel: 'Flexible itinerary',
		itinerary: [
			{ label: 'Flexible departure, agreed with you when you book.', icon: 'map-pin' },
			{ label: 'You choose the stops, with your skipper’s recommendation based on weather and conditions: the Blue Cave, Hvar Town, the Pakleni Islands, Brač Island, Vis Island, or Šolta Island.', icon: 'sailboat' },
			{ label: 'On the water: swim, snorkel, or go ashore at each stop for as long as you like. The itinerary can be adjusted at any time during the tour.', icon: 'swimming' },
			{ label: 'Flexible return, 1–10 hours after departure depending on your booking.', icon: 'sunset' },
		],
		overviewHighlights:
			'This fully private, custom speedboat tour takes you to the destinations of your choice – the Blue Cave, Hvar Town, the Pakleni Islands, Brač, Vis, or Šolta. Along the way there’s time to swim, snorkel, sunbathe, or just relax on deck – the day is built exactly the way you and your group want it.',
		meetingPoint: MEETING_POINT_FLEXIBLE,
		weather: WEATHER_COPY,
		importantInfo: SAFETY_COPY,
		whatToBring: BRING_DEFAULT,
		included: ['Private use of the booked vessel for the agreed time block', ...INCLUDED_DEFAULT],
		notIncluded: NOT_INCLUDED_DEFAULT,
		prices: null,
		priceUnit: 'boat',
		additionalFees: [
			{
				text: 'Blue Cave entry is billed separately on-site if you add it to your route.',
				shortText: 'Blue Cave ticket, paid on site if added',
				mandatory: false,
			},
		],
		disclaimers: DISCLAIMERS,
		gallery: galleryFromDestinations('hvar', 'blue-lagoon', 'pakleni'),
		image: PHOTO.boatDeck,
		featured: true,
		types: ['private'],
		tags: ['swim', 'snorkel', 'half-day'],
		badge: 'bestseller',
	},
];

/**
 * Non-FigJam variants dropped when the catalog was rebuilt to match the verified
 * FigJam tour board exactly: 'three-islands', 'blue-cave-open-boat',
 * 'blue-cave-luxury-cabin', 'blue-cave-6-islands', 'blue-lagoon-half-day'.
 * 'golden-horn-brac-hvar' and 'hvar-red-rocks-pakleni' were previously removed
 * for lacking real photography and have been re-added above per FigJam, now
 * shipping with placeholder color-block imagery until real photos are sourced.
 */
export const REMOVED_TOUR_SLUGS = [
	'three-islands',
	'blue-cave-open-boat',
	'blue-cave-luxury-cabin',
	'blue-cave-6-islands',
	'blue-lagoon-half-day',
	'blue-lagoon-trogir',
	'three-islands-trogir',
	'brac-golden-horn',
] as const;
