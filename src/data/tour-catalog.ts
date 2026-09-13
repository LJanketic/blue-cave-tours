import type { TourDetail } from '../types/tour';
import { galleryFromDestinations } from './destination-photos';
import { PHOTO } from './tour-photos';

/** Tour catalog — Hello Blue Cave. Content sourced from the verified FigJam tour board. */
const MEETING_POINT =
	'Meet at Split’s Riva promenade, stand number 14. After booking you’ll receive the exact location, map link, and what time to arrive.';

const WEATHER_COPY =
	'We track forecasts and sea state. If conditions are rough or a stop is closed, we adjust the route or timing and communicate the changes.';

const SAFETY_COPY =
	'Follow crew instructions, wear a life jacket when asked, stay seated during manoeuvres, and tell us if you have conditions that affect swimming or sun exposure.';

const BRING_DEFAULT = [
	'Swimsuit and towel',
	'Sunscreen and sunglasses',
	'Hat or cap',
	'Camera or smartphone',
	'Light jacket for cooler sea breezes',
	'Water shoes or sandals (optional)',
	'Small bag or backpack for personal items',
];

const INCLUDED_DEFAULT = [
	'Fuel and boat expenses',
	'Snorkelling equipment',
	'Bottled water on board',
	'Safety equipment and insurance',
];

const NOT_INCLUDED_DEFAULT = [
	'Entrance tickets where applicable',
	'Personal expenses',
	'Lunch expenses, since guests have free time ashore to eat at their own expense',
];

const DISCLAIMERS = [
	'Routes, order of stops, and swim breaks may vary with weather, harbour traffic, and site regulations.',
	'National park and cave entry fees may be charged separately on-site where applicable.',
	'Speedboat transportation, English-speaking crew, and VAT/taxes were marked as under review by the operator at time of writing. Confirm exact inclusions when you book.',
];

const CAVE_NOTE =
	'Entrance to the Blue Cave may require a separate ticket payable on-site; availability depends on sea conditions and official cave opening hours.';

const NOT_A_CAVE_TOUR = 'This route does not visit the Blue Cave.';

const PRICE_BLUE_CAVE =
	'Low season (1 Apr–15 Jun, 1 Sep–30 Nov): €149 per adult, €129 per child (0–17). Peak season (15 Jun–30 Sep): €169 per adult, €139 per child (0–17). Final price confirmed at booking.';

const PRICE_GOLDEN_HORN =
	'Low season (1 Apr–15 Jun, 1 Sep–30 Nov): €129 per adult, €89 per child (0–17). Peak season (15 Jun–30 Sep): €139 per adult, €99 per child (0–17). Final price confirmed at booking.';

const PRICE_BLUE_LAGOON =
	'Low season (1 Apr–15 Jun, 1 Sep–30 Nov): €65 per adult, €59 per child (0–17). Peak season (15 Jun–30 Sep): €75 per adult, €69 per child (0–17). Final price confirmed at booking.';

const PRICE_PRIVATE =
	'Private charters are quoted per boat and season. Request a quote via the contact form or by phone.';

export const tours: TourDetail[] = [
	{
		slug: 'blue-cave-hvar-5-islands',
		primaryDestinationSlug: 'blue-cave',
		title: 'Blue Cave, Hvar & 5 islands',
		tagline: 'Full-day signature route',
		shortDescription:
			'Our flagship day: the Blue Cave on Biševo, a swim at Budikovac Blue Lagoon, Stiniva Cove on Vis, and free time in Hvar Town and the Pakleni Islands.',
		availability: 'Every day from 1 April to 30 November',
		scheduleLabel: 'Full day: 07:20 – 18:00',
		departure: '07:10 check-in · 07:20 departure',
		duration: 'Approx. 10 hours',
		returnTime: '18:00',
		itineraryKind: 'full',
		itineraryLabel: 'Full-day itinerary',
		itinerary: [
			'07:20 Departure from Split toward Vis & Biševo area, home to the magical Blue Cave (subject to conditions and optional ticket).',
			'Swim stop at Budikovac Blue Lagoon (approx. 30–45 minutes).',
			'Stiniva Cove on Vis, with scenic coastal cruising along the way.',
			'Free time ashore in Hvar Town and the Pakleni Islands where the schedule allows (possible alternates: Komiža, or Milna for a drink).',
			'18:00 Return along the Split channel with panoramic views.',
		],
		overviewHighlights:
			'This full-day speedboat tour takes you to the magical Blue Cave on Biševo Island, where sunlight creates a glowing blue light beneath the cliffs. From there you swim at Budikovac Blue Lagoon and Stiniva Cove on Vis, then explore the streets of Hvar Town and the turquoise bays of the Pakleni Islands. There’s plenty of time to dive into crystal-clear water, snorkel around hidden coves, or stretch out on a picturesque beach before cruising back to Split as the sun dips over the islands.',
		meetingPoint: MEETING_POINT,
		weather: WEATHER_COPY,
		importantInfo: SAFETY_COPY,
		whatToBring: BRING_DEFAULT,
		included: INCLUDED_DEFAULT,
		notIncluded: NOT_INCLUDED_DEFAULT,
		priceNotes: PRICE_BLUE_CAVE,
		caveTicketNote: CAVE_NOTE,
		disclaimers: DISCLAIMERS,
		gallery: galleryFromDestinations('blue-cave', 'pakleni', 'hvar', 'vis'),
		image: PHOTO.blueCave,
		fromPrice: '€169',
		featured: true,
		types: ['group', 'private'],
	},
	{
		slug: 'golden-horn-brac-hvar',
		primaryDestinationSlug: 'zlatni-rat',
		title: 'Golden Horn, Brač and Hvar Tour',
		tagline: 'Full-day · Golden Horn & Hvar',
		shortDescription:
			'The iconic Golden Horn Beach on Brač, a relaxed lunch stop at Pakleni or Milna, and free time in historic Hvar Town.',
		availability: 'Every day from 1 April to 30 November',
		scheduleLabel: 'Full day: 08:30 – 18:00',
		departure: '08:20 check-in · 08:30 departure',
		duration: 'Approx. 10 hours',
		returnTime: '18:00',
		itineraryKind: 'full',
		itineraryLabel: 'Full-day itinerary',
		itinerary: [
			'08:30 Departure from Split toward Brač Island.',
			'Golden Horn Beach on Brač (approx. 2 hours).',
			'Swim stops and coastal cruising toward the Pakleni Islands (30–60 minutes).',
			'Free time ashore in Hvar Town, with time for lunch.',
			'18:00 Return along the Split channel with panoramic views.',
		],
		overviewHighlights:
			'This full-day speedboat tour takes you to the iconic Golden Horn Beach on Brač Island, known for its striking shape and crystal-clear water. From there it’s on to the Pakleni Islands or Milna for a relaxed lunch stop, then time in the charming streets of Hvar Town. Along the way there’s room for a swim off the boat, some snorkelling over hidden reefs, or soaking up the sun on a scenic beach, before heading back to Split.',
		meetingPoint: MEETING_POINT,
		weather: WEATHER_COPY,
		importantInfo: SAFETY_COPY,
		whatToBring: BRING_DEFAULT,
		included: INCLUDED_DEFAULT,
		notIncluded: NOT_INCLUDED_DEFAULT,
		priceNotes: PRICE_GOLDEN_HORN,
		caveTicketNote: NOT_A_CAVE_TOUR,
		disclaimers: DISCLAIMERS,
		gallery: galleryFromDestinations('zlatni-rat', 'pakleni', 'hvar'),
		image: PHOTO.goldenHorn,
		fromPrice: '€139',
		featured: false,
		types: ['group'],
	},
	{
		slug: 'hvar-red-rocks-pakleni',
		primaryDestinationSlug: 'hvar',
		title: 'Hvar, Red Rocks & Pakleni islands',
		tagline: 'Full-day · Hvar & Pakleni',
		shortDescription: 'A day exploring Hvar Town, the Red Rocks coastline, and the turquoise bays of the Pakleni islands.',
		availability: 'Every day from 1 April to 30 November',
		scheduleLabel: 'Full day: approx. 8–9 hours',
		departure: 'Departure time confirmed at booking',
		duration: 'Approx. 8–9 hours',
		returnTime: 'Approx. 16:00',
		itineraryKind: 'full',
		itineraryLabel: 'Full-day itinerary',
		itinerary: [
			'Departure from Split, exact time confirmed at booking.',
			'Time in Hvar Town, along the Red Rocks coastline, and around the Pakleni Islands.',
			'Return to Split by approximately 16:00.',
		],
		overviewHighlights:
			'A full-day route exploring Hvar Town, the Red Rocks coastline, and the turquoise bays of the Pakleni Islands. Full stop-by-stop itinerary details are confirmed closer to your booking date.',
		meetingPoint: MEETING_POINT,
		weather: WEATHER_COPY,
		importantInfo: SAFETY_COPY,
		whatToBring: BRING_DEFAULT,
		included: INCLUDED_DEFAULT,
		notIncluded: NOT_INCLUDED_DEFAULT,
		priceNotes: 'Pricing confirmed at booking. Contact us for current rates.',
		caveTicketNote: NOT_A_CAVE_TOUR,
		disclaimers: DISCLAIMERS,
		gallery: galleryFromDestinations('hvar', 'pakleni'),
		image: PHOTO.hvar,
		fromPrice: 'Price on request',
		featured: false,
		types: ['group'],
	},
	{
		slug: 'blue-lagoon-morning',
		primaryDestinationSlug: 'blue-lagoon',
		title: 'Blue Lagoon Morning Tour',
		tagline: 'Half day · Blue Lagoon & Trogir',
		shortDescription:
			'A relaxed half-day to Duga Bay on Čiovo and the turquoise Blue Lagoon, with free time in Trogir Old Town.',
		availability: 'Every day from 1 April to 30 November',
		scheduleLabel: 'Half day: 09:30 – 14:00',
		departure: '09:20 check-in · 09:30 departure',
		duration: 'Approx. 5 hours',
		returnTime: '14:00',
		itineraryKind: 'morning',
		itineraryLabel: 'Morning itinerary',
		itinerary: [
			'09:30 Departure from Split toward Čiovo Island and Duga Bay or Borko (approx. 60 minutes).',
			'Swim stop at the turquoise Blue Lagoon, with scenic coastal cruising along the way (approx. 60 minutes).',
			'Free time ashore in Trogir Old Town or Maslinica (Šolta Island) where the schedule allows (approx. 60 minutes).',
			'14:00 Return to Split.',
		],
		overviewHighlights:
			'This half-day morning speedboat tour takes you to Duga Bay on Čiovo Island, then to swim in the turquoise waters of the Blue Lagoon, before strolling through the historic streets of Trogir Old Town. There’s time to cool off with a swim, try some snorkelling, or unwind on the beach before heading back to Split in time for the afternoon.',
		meetingPoint: MEETING_POINT,
		weather: WEATHER_COPY,
		importantInfo: SAFETY_COPY,
		whatToBring: BRING_DEFAULT,
		included: INCLUDED_DEFAULT,
		notIncluded: NOT_INCLUDED_DEFAULT,
		priceNotes: PRICE_BLUE_LAGOON,
		caveTicketNote: NOT_A_CAVE_TOUR,
		disclaimers: DISCLAIMERS,
		gallery: galleryFromDestinations('blue-lagoon', 'trogir'),
		image: PHOTO.blueLagoon,
		fromPrice: '€75',
		featured: true,
		types: ['group'],
	},
	{
		slug: 'blue-lagoon-afternoon',
		primaryDestinationSlug: 'blue-lagoon',
		title: 'Blue Lagoon Afternoon Tour',
		tagline: 'Half day · Blue Lagoon & Trogir',
		shortDescription: 'The same Blue Lagoon half-day route as our morning tour, run as a later afternoon departure.',
		availability: 'Every day from 1 April to 30 November',
		scheduleLabel: 'Half day: afternoon departure (exact time confirmed at booking)',
		departure: 'Afternoon departure, exact time confirmed at booking',
		duration: 'Approx. 5 hours',
		returnTime: 'Early evening',
		itineraryKind: 'afternoon',
		itineraryLabel: 'Afternoon itinerary',
		itinerary: [
			'Afternoon departure from Split toward Čiovo Island and Duga Bay, exact time confirmed at booking.',
			'Swim stop at the turquoise Blue Lagoon, with scenic coastal cruising along the way.',
			'Free time ashore in Trogir Old Town or Maslinica (Šolta Island) where the schedule allows.',
			'Return to Split in the early evening.',
		],
		overviewHighlights:
			'The same Duga Bay, Blue Lagoon, and Trogir Old Town route as our morning tour, run as a later afternoon departure. Exact timing confirmed at booking.',
		meetingPoint: MEETING_POINT,
		weather: WEATHER_COPY,
		importantInfo: SAFETY_COPY,
		whatToBring: BRING_DEFAULT,
		included: INCLUDED_DEFAULT,
		notIncluded: NOT_INCLUDED_DEFAULT,
		priceNotes: PRICE_BLUE_LAGOON,
		caveTicketNote: NOT_A_CAVE_TOUR,
		disclaimers: DISCLAIMERS,
		gallery: galleryFromDestinations('blue-lagoon', 'trogir'),
		image: PHOTO.blueLagoonAlt,
		fromPrice: '€75',
		featured: false,
		types: ['group'],
	},
	{
		slug: 'dubrovnik-one-way',
		primaryDestinationSlug: 'dubrovnik',
		title: 'Dubrovnik One Way Tour',
		tagline: 'Private · one-way to Dubrovnik',
		shortDescription: 'A one-way private transfer from Split to Dubrovnik, calling at Hvar Old Town and Korčula along the way.',
		availability: 'On request',
		scheduleLabel: 'One-way: approx. 08:00–09:00 – 16:00–17:00',
		departure: 'Approx. 08:00–09:00 departure',
		duration: 'Approx. 10 hours',
		returnTime: 'No return leg, one-way to Dubrovnik',
		itineraryKind: 'full',
		itineraryLabel: 'One-way itinerary',
		itinerary: [
			'Approx. 08:00–09:00 Departure from Split toward Hvar Old Town.',
			'Swim stop in a secluded bay, with scenic coastal cruising toward Korčula.',
			'Free time ashore in Korčula Old Town, with time for lunch.',
			'Second swim stop or snorkelling among the islands (optional).',
			'Approx. 16:00–17:00 Arrival in Dubrovnik (no return leg, one-way private charter).',
		],
		overviewHighlights:
			'This private one-way speedboat journey takes you from Split to historic Hvar Old Town, with a stop for a swim in a secluded bay, before exploring the walled town of Korčula with time for lunch. From there it’s a second swim or scenic snorkelling among the islands as you continue toward Dubrovnik, arriving by early evening.',
		meetingPoint: MEETING_POINT,
		weather: WEATHER_COPY,
		importantInfo: SAFETY_COPY,
		whatToBring: BRING_DEFAULT,
		included: INCLUDED_DEFAULT,
		notIncluded: NOT_INCLUDED_DEFAULT,
		priceNotes: 'Priced as a private one-way charter. Request a quote via the contact form or by phone.',
		caveTicketNote: NOT_A_CAVE_TOUR,
		disclaimers: DISCLAIMERS,
		gallery: galleryFromDestinations('hvar', 'korcula', 'dubrovnik'),
		image: PHOTO.dubrovnik,
		fromPrice: 'On request',
		featured: false,
		types: ['private'],
	},
	{
		slug: 'create-perfect-day-private',
		title: 'Create Your Perfect Day at Sea',
		tagline: 'Private charter · flexible itinerary',
		shortDescription:
			'A fully private charter: pick your own route from the Blue Cave, Hvar Town, Pakleni, Brač, Vis, or Šolta, or let your skipper plan the day.',
		availability: 'On request',
		scheduleLabel: 'Flexible · 1–10 hours',
		departure: 'Flexible, typically 09:30 for half-day or full-day charters',
		duration: '1–10 hours, depending on your booking',
		returnTime: 'Flexible',
		itineraryKind: 'flexible',
		itineraryLabel: 'Flexible itinerary',
		itinerary: [
			'Departure flexible, typically 09:30 for half-day or full-day charters, from Split’s Riva promenade (stand 14) or Zenta.',
			'Route planning discussed with the captain before or at departure. Pick from Blue Cave, Hvar Town, Pakleni Islands, Brač, Vis, and Šolta, or let the skipper recommend based on weather and conditions.',
			'On the water: swim, snorkel, or go ashore at each stop for as long as you like, fully flexible.',
			'Return flexible, 1–10 hours after departure depending on half-day or full-day.',
		],
		overviewHighlights:
			'This fully private charter puts you and the captain in complete control of the day at sea. Choose your own route to the Blue Cave, Hvar Town, the Pakleni Islands, Brač, Vis, or Šolta, or lean on the skipper’s local knowledge to shape a route around your group’s pace and interests. The boat is reserved exclusively for you, and departure is flexible, typically 09:30 for both half-day and full-day charters. There’s no fixed schedule to follow, only time to swim, snorkel, sunbathe, or relax on deck wherever the day takes you.',
		meetingPoint: MEETING_POINT,
		weather: WEATHER_COPY,
		importantInfo: SAFETY_COPY,
		whatToBring: BRING_DEFAULT,
		included: ['Private use of the booked vessel for the agreed time block', ...INCLUDED_DEFAULT],
		notIncluded: NOT_INCLUDED_DEFAULT,
		priceNotes: PRICE_PRIVATE,
		caveTicketNote: 'Blue Cave entry is billed separately on-site if you add it to your route.',
		disclaimers: DISCLAIMERS,
		gallery: galleryFromDestinations('hvar', 'blue-lagoon', 'pakleni'),
		image: PHOTO.boatDeck,
		fromPrice: 'On request',
		featured: true,
		types: ['private'],
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
