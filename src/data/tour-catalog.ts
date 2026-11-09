import type { AgeBands, TourDetail } from '../types/tour';
import { seasonMonths } from '../config/season';
import { galleryFromDestinations } from './destination-photos';
import { PHOTO } from './tour-photos';
import { CHILD_MAX_AGE, INFANT_MAX_AGE, PRICE_BLUE_CAVE, PRICE_BLUE_LAGOON, PRICE_GOLDEN_HORN } from './prices';
import { MAX_GUESTS } from '../lib/booking';
import { PRIVATE_TOURS } from '../config/private';

/**
 * A private-only tour's start, from src/config/private.ts: "09:00, or later
 * up to 11:00" while a latest departure is set (Mare, 8 Nov 2026), so the
 * copy follows the placeholder when Vedro confirms the times.
 */
function privateStart(slug: string, time: string): string {
	const latest = PRIVATE_TOURS[slug]?.latestDeparture;
	return latest && latest !== time ? `${time}, or later up to ${latest}` : time;
}

/** Tour catalog — Hello Blue Cave. Content sourced from the verified FigJam tour board. */
const MEETING_POINT =
	'Meet at Split’s Riva promenade, stand number 14. After booking you’ll receive the exact location, map link, and what time to arrive.';

/** Private tours leave from the Riva; the exact spot is confirmed after booking. */
const MEETING_POINT_PRIVATE =
	'Meet at Split’s Riva promenade, stand number 14. We confirm the exact spot with you after booking.';

/** Create Your Perfect Day: the meeting point is agreed per booking. */
const MEETING_POINT_FLEXIBLE =
	'Flexible: we agree the meeting point with you when you book, for example Split’s Riva promenade, stand number 14.';

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
	'Entry fees, such as the Blue Cave ticket, are paid on site where applicable.',
];


/** Age bands shown in the booking flow unless a tour sets its own (D-9, operator price table, ClickUp 31 Oct 2026: infants 0–3 travel free but take a seat, child 4–11, adult 12+). */
export const DEFAULT_AGE_BANDS: AgeBands = {
	adult: `Age ${CHILD_MAX_AGE + 1}+`,
	child: `Age ${INFANT_MAX_AGE + 1}–${CHILD_MAX_AGE}`,
	infantMaxAge: INFANT_MAX_AGE,
};

/*
 * Operator tour sheet, 4 Nov 2026 (HBC_Tour_Content_Updated.xlsx on ClickUp
 * "Tour description and Itinerary", checked by Mare: "provjerila ture, sve ok").
 * Names, descriptions, itineraries, inclusions, "Good to know" and the tour
 * FAQs below follow it word for word, except the guest limit: the sheet says 12,
 * the booking limit is MAX_GUESTS (14, ClickUp "Max 12 guests per departure:
 * dogovoreno 14 osoba"), and the copy uses MAX_GUESTS so the two can't disagree.
 */
const SHEET_INCLUDED = ['Crew', 'Fuel', 'Bottled water', 'Snorkelling masks', 'Safety equipment'];
const SHEET_BRING = ['Swimwear', 'towel', 'sunscreen', 'cash for lunch', 'light jacket for cooler sea breezes'];
const SHEET_BRING_CAVE = ['Swimwear', 'towel', 'sunscreen', 'cash for the cave ticket and lunch', 'light jacket for cooler sea breezes'];
const SHEET_SAFETY = 'Emergency life jackets on board are not meant for swimming.';
const SHEET_ACCESSIBILITY =
	'Our tours aren’t recommended for pregnant women, guests with back or neck problems, or serious medical conditions. If you use a wheelchair or pushchair, please contact us before booking so we can arrange the right boat.';
const SHEET_LANGUAGES = ['English', 'Croatian'];

/** "Departures carry a maximum of N people …": the sheet's second paragraph for the group + private tours. */
const smallGroup = (rest: string) =>
	`Departures carry a maximum of ${MAX_GUESTS} people — group or private — so there’s room to move on deck and time at every stop. ${rest}`;

const FAQ_CHILDREN = {
	question: 'Can children join?',
	answer: 'Yes — children are welcome but must be supervised by an adult at all times. Under-3s travel free, and we carry emergency life jackets in children’s sizes.',
};
const FAQ_ACCESSIBLE = { question: 'Is the tour accessible?', answer: SHEET_ACCESSIBILITY };
const FAQ_WEATHER = {
	question: 'What if the weather is bad, or I need to cancel?',
	answer: 'Cancellation is free up to 48 hours before departure. If we cancel for weather, you get a full refund or a free new date.',
};
const faqBring = (bring: string[]) => ({ question: 'What should I bring?', answer: `${bring.join(', ')}.` });
const FAQ_NO_FEES = {
	question: 'Are there any extra fees on the day?',
	answer: 'No — there are no extra fees on the day. Just bring cash if you plan to buy lunch or drinks ashore.',
};

/** The Blue Cave operator's ticket price list (tour sheet, "Additional fees link"). */
const CAVE_TICKET_PRICES_URL = 'https://bluecave-bisevo.com/wp-content/uploads/2025/04/Cjenik-usluga-Modra-spilja-2025.pdf';

const BLUE_LAGOON_INTRO =
	'This half-day speedboat tour runs as a morning or an afternoon trip. It takes you to Duga Bay on Čiovo Island, then on to swim in the turquoise waters of the Blue Lagoon near Drvenik, before strolling through the historic streets of Trogir Old Town or the village of Maslinica on Šolta. Along the way there’s time to cool off with a swim, try some snorkelling, or simply unwind on the beach — and you’re back in Split by 14:00 on the morning trip, or by 19:00 on the afternoon one.';

const BLUE_LAGOON_FAQS = [
	{
		question: 'Should I pick the morning or the afternoon trip?',
		answer: 'The morning trip runs 09:30–14:00 and the afternoon trip 14:30–19:00. Mornings are usually calmer and less crowded.',
	},
	{ question: 'Is snorkelling gear included?', answer: 'Yes, snorkelling gear is on board. Bring your own mask if you prefer.' },
	{
		question: 'Do we stop in Trogir or in Maslinica?',
		answer: 'The second stop is either Trogir’s old town or Maslinica village on Šolta — we confirm it on the day.',
	},
	{ question: 'Is it suitable for weaker swimmers?', answer: 'Yes. The lagoon is shallow and calm — ideal for a gentle swim.' },
	FAQ_CHILDREN,
	faqBring(SHEET_BRING),
	FAQ_ACCESSIBLE,
	FAQ_WEATHER,
];

/** The Blue Lagoon stops after the departure; the times are offsets from it (tour sheet). */
const blueLagoonItinerary = (departure: string, back: string) => [
	{ time: departure, label: 'Departure — Split Riva, stand number 14', description: 'Hop on board, meet the crew and start your trip.', icon: 'map-pin' },
	{ timeLabel: '+30 min', label: 'Duga Bay, Čiovo Island', description: 'Swim stop in turquoise water.', icon: 'swimming' },
	{ timeLabel: '+45 min', label: 'Blue Lagoon, Drvenik', description: 'Swim and snorkel in shallow turquoise water.', icon: 'ripple' },
	{ timeLabel: '+45 min', label: 'Trogir or Maslinica, Šolta', description: 'A stroll through Trogir’s old town or Maslinica village.', icon: 'building-castle' },
	{ time: back, label: 'Return to Split', description: 'Short cruise back across the channel.', icon: 'anchor' },
];

export const tours: TourDetail[] = [
	{
		slug: 'blue-cave-hvar-5-islands',
		primaryDestinationSlug: 'blue-cave',
		title: 'Blue Cave, Vis & Hvar — Five Islands Tour',
		seoHeadings: { about: 'About the Blue Cave & Hvar tour', faq: 'Questions about the Blue Cave tour' },
		tagline: 'Full-day signature route',
		shortDescription:
			'Our flagship day: the Blue Cave on Biševo, a swim at Budikovac Blue Lagoon, Stiniva Cove on Vis, and free time in Hvar Town and the Pakleni Islands.',
		availability: `Every day, ${seasonMonths()}`,
		scheduleLabel: 'Full day: 07:20 – approx. 17:30–18:00',
		// ClickUp "Mail potvrde gostu za grupnu turu" (5 Nov 2026): no "15 min early" for this tour, be there for 07:20.
		departure: '07:20 departure, please be there on time',
		departures: [{ time: '07:20', arriveOnTime: true }],
		duration: 'Approx. 10 hours',
		durationShort: '10 h',
		durationHours: 10,
		returnTime: 'Approx. 17:30–18:00',
		itineraryKind: 'full',
		itineraryLabel: 'Full-day itinerary',
		itinerary: [
			{ time: '07:20', label: 'Departure — Split Riva, stand number 14', description: 'Hop on board, meet the crew and start your trip.', icon: 'map-pin' },
			{ timeLabel: '~1.5–2 h', label: 'Biševo Island', description: 'Hop off board, buy your cave tickets and take a quick toilet break.', icon: 'anchor' },
			{ timeLabel: '30 min', label: 'Blue Cave visit', description: 'With your tickets, hop on a smaller boat and explore the cave.', icon: 'ripple' },
			{ timeLabel: '30–45 min', label: 'Vis Island, Budikovac — Blue Lagoon', description: 'Back on board, head back for a swim stop in shallow turquoise water.', icon: 'swimming' },
			{ timeLabel: '5–10 min', label: 'Vis Island, Stiniva Cove', description: 'Have a nice scenic cruise past the famous enclosed cove.', icon: 'camera' },
			{ timeLabel: '2–3 h', label: 'Hvar Town, Hvar Island', description: 'Hop off board for some free time and explore the old town.', icon: 'building-castle' },
			{ timeLabel: '45 min – 1 h', label: 'Pakleni Islands', description: 'Swim stop, if the schedule allows.', icon: 'swimming' },
			{ timeLabel: '17:30–18:00', label: 'Return to Split', description: 'Panoramic views through the Split channel.', icon: 'anchor' },
		],
		overviewHighlights:
			'This full-day speedboat tour takes you to the magical Blue Cave on Biševo Island, where sunlight creates a glowing blue light beneath the cliffs, then on to swim at Budikovac Blue Lagoon and cruise past the dramatic Stiniva Cove on Vis for photos, before exploring the streets of Hvar Town and the turquoise bays of the Pakleni Islands. Along the way there’s plenty of time to dive into crystal-clear water, snorkel around hidden coves, or simply stretch out on a picturesque beach, before cruising back to Split as the sun dips over the islands.',
		introMore: [
			smallGroup(
				'Your skipper handles the route on the day; in pre-season, Komiža replaces the Pakleni Islands and you get a drink stop in Milna. The Blue Cave entrance ticket is paid on site, and the price varies by season.',
			),
		],
		introCollapsible: true,
		meetingPoint: MEETING_POINT,
		weather: WEATHER_COPY,
		importantInfo: SHEET_SAFETY,
		whatToBring: SHEET_BRING_CAVE,
		included: SHEET_INCLUDED,
		notIncluded: ['Blue Cave entrance ticket', 'Lunch', 'Custom pickup (private only)'],
		prices: PRICE_BLUE_CAVE,
		priceUnit: 'person',
		additionalFees: [
			{
				text: 'Blue Cave entrance ticket, paid on site (price varies by season).',
				shortText: 'Blue Cave entry optional, ticket paid on site',
				mandatory: false,
				url: CAVE_TICKET_PRICES_URL,
			},
		],
		disclaimers: DISCLAIMERS,
		gallery: galleryFromDestinations('blue-cave', 'pakleni', 'hvar', 'vis'),
		image: PHOTO.blueCave,
		featured: true,
		types: ['group', 'private'],
		tags: ['cave', 'swim', 'snorkel'],
		badge: 'bestseller',
		languages: SHEET_LANGUAGES,
		preSeasonRoute: 'Komiža instead of Pakleni, plus a drink stop in Milna.',
		accessibility: SHEET_ACCESSIBILITY,
		faqs: [
			{
				question: 'What time does the tour leave, and when are we back?',
				answer: 'We leave at 07:20 from Split Riva, stand number 14, and we are back around 18:00. Please be there on time.',
			},
			{
				question: 'Is the Blue Cave ticket included?',
				answer: 'No. The entrance ticket is paid on site, and the price changes with the season. Bring cash just in case.',
			},
			{
				question: 'What happens if the Blue Cave is closed?',
				answer: 'The cave closes when the sea is rough. If that happens, your skipper swaps in another stop and lets you know on the day.',
			},
			{
				question: 'Is lunch included?',
				answer: 'Lunch is not included. You have 2–3 hours of free time in Hvar Town, with plenty of places to eat by the harbour.',
			},
			{
				question: 'Does the route change early in the season?',
				answer: 'Yes. In pre-season we visit Komiža instead of the Pakleni islands, plus a drink stop in Milna.',
			},
			FAQ_CHILDREN,
			faqBring(SHEET_BRING_CAVE),
			FAQ_ACCESSIBLE,
			FAQ_WEATHER,
		],
	},
	{
		slug: 'golden-horn-brac-hvar',
		primaryDestinationSlug: 'zlatni-rat',
		title: 'Golden Horn, Brač & Hvar Island Tour',
		seoHeadings: { about: 'About the Golden Horn & Hvar tour', faq: 'Questions about the Golden Horn tour' },
		tagline: 'Full-day · Golden Horn & Hvar',
		shortDescription:
			'The iconic Golden Horn Beach on Brač, a stop in the Pakleni Islands or Milna, and free time for lunch in historic Hvar Town.',
		availability: `Every day, ${seasonMonths()}`,
		scheduleLabel: 'Full day: 09:00 – 17:00',
		departure: '08:45 check-in · 09:00 departure',
		departures: [{ time: '09:00', checkIn: '08:45' }],
		duration: 'Approx. 8 hours',
		durationShort: '8 h',
		durationHours: 8,
		returnTime: 'Approx. 17:00',
		itineraryKind: 'full',
		itineraryLabel: 'Full-day itinerary',
		itinerary: [
			{ time: '09:00', label: 'Departure — Split Riva, stand number 14', description: 'Hop on board, meet the crew and start your trip.', icon: 'map-pin' },
			{ time: '10:15', label: 'Zlatni Rat (Golden Horn), Bol', description: 'Swim at Brač’s famous pebble beach.', icon: 'beach' },
			{ time: '12:30', label: 'Pakleni Islands or Milna, Brač', description: 'Swim stop, or a relaxed lunch stop.', icon: 'swimming' },
			{ time: '15:00', label: 'Hvar Town, Hvar Island', description: 'Free time for lunch and a walk through the old town.', icon: 'building-castle' },
			{ time: '17:00', label: 'Return to Split', description: 'Panoramic views through the Split channel.', icon: 'anchor' },
		],
		overviewHighlights:
			'This full-day speedboat tour takes you to the iconic Golden Horn Beach on Brač Island, known for its striking shape and crystal-clear water, then on to the Pakleni Islands or Milna for a relaxed lunch stop, before wandering the charming streets of Hvar Town. Along the way there’s time for a swim off the boat, some snorkelling over hidden reefs, or simply soaking up the sun on a scenic beach, before heading back to Split.',
		introMore: [smallGroup('Your skipper handles the route on the day, and lunch ashore is at your own cost.')],
		introCollapsible: true,
		meetingPoint: MEETING_POINT,
		weather: WEATHER_COPY,
		importantInfo: SHEET_SAFETY,
		whatToBring: SHEET_BRING,
		included: SHEET_INCLUDED,
		notIncluded: ['Lunch', 'Custom pickup (private only)'],
		prices: PRICE_GOLDEN_HORN,
		priceUnit: 'person',
		additionalFees: [],
		disclaimers: DISCLAIMERS,
		gallery: galleryFromDestinations('zlatni-rat', 'hvar', 'pakleni'),
		image: PHOTO.goldenHorn,
		featured: false,
		types: ['group', 'private'],
		tags: ['swim', 'snorkel'],
		badge: null,
		languages: SHEET_LANGUAGES,
		accessibility: SHEET_ACCESSIBILITY,
		faqs: [
			{
				question: 'What time does the tour leave, and when are we back?',
				answer: 'We leave at 09:00 from Split Riva, stand number 14, and we are back around 17:00. Please arrive 15 minutes early.',
			},
			{
				question: 'When do we get to Golden Horn?',
				answer: 'Golden Horn in Bol is the first stop, at around 10:15 — time for a swim before we head on to the Pakleni islands.',
			},
			{
				question: 'Is lunch included?',
				answer: 'Lunch is not included. From around 15:00 you have free time in Hvar town to eat and walk the old town.',
			},
			FAQ_NO_FEES,
			FAQ_CHILDREN,
			faqBring(SHEET_BRING),
			FAQ_ACCESSIBLE,
			FAQ_WEATHER,
		],
	},
	{
		slug: 'hvar-red-rocks-pakleni',
		primaryDestinationSlug: 'hvar',
		title: 'Hvar Red Rocks & Pakleni Islands Tour',
		seoHeadings: { about: 'About the Red Rocks & Pakleni Islands tour', faq: 'Questions about the Red Rocks tour' },
		tagline: 'Private full day · Red Rocks & Pakleni',
		shortDescription:
			'A private full day via Milna on Brač to the Red Rocks on Hvar’s south coast, historic Hvar Town, and lunch and a swim in the Pakleni Islands.',
		availability: `Every day, ${seasonMonths()}`,
		scheduleLabel: 'Full day: 09:00 – 18:00',
		departure: privateStart('hvar-red-rocks-pakleni', '09:00'),
		departures: [{ time: '09:00' }] /* Mare, 8 Nov 2026: paid online; the guest may shift it up to 11:00 (src/config/private.ts) */,
		duration: 'Approx. 9 hours',
		durationShort: '9 h',
		durationHours: 9,
		returnTime: 'Approx. 18:00',
		itineraryKind: 'full',
		itineraryLabel: 'Full-day itinerary',
		itinerary: [
			{ time: '09:00', label: 'Departure — Split Riva, stand number 14', description: 'Hop on board, meet the crew and start your trip.', icon: 'map-pin' },
			{ time: '10:00', label: 'Milna, Brač', description: 'Short coffee stop in the island village.', icon: 'coffee' },
			{ time: '11:30', label: 'Red Rocks, Hvar Island', description: 'Swim stop below Hvar’s Red Rock Cliffs.', icon: 'swimming' },
			{ time: '13:00', label: 'Hvar Town & Pakleni Islands', description: 'Free time ashore, have lunch on Pakleni or in Milna, Hvar.', icon: 'building-castle' },
			{ time: '16:00', label: 'Final swim stop', description: 'Pakleni Islands or a hidden bay.', icon: 'swimming' },
			{ time: '18:00', label: 'Return to Split', description: 'Panoramic views through the Split channel.', icon: 'anchor' },
		],
		overviewHighlights:
			'This private full-day speedboat tour takes you to Milna Village on Brač Island, then along Hvar’s scenic south coast to swim at the striking Red Rocks, before exploring historic Hvar Town. The day finishes with lunch and a final swim in the turquoise bays of the Pakleni Islands. Along the way there’s time to jump straight off the boat for a swim, explore beneath the surface with a snorkel, or stretch out on a hidden beach - the choice is entirely yours.',
		introMore: [
			`This is a private experience for up to ${MAX_GUESTS} people, so the boat, route and timing are entirely yours. You choose the departure time (${privateStart('hvar-red-rocks-pakleni', '09:00')}), and your skipper can adjust the stops on the day to suit your group. Lunch ashore is at your own cost.`,
		],
		introCollapsible: true,
		meetingPoint: MEETING_POINT_PRIVATE,
		weather: WEATHER_COPY,
		importantInfo: SHEET_SAFETY,
		whatToBring: SHEET_BRING,
		included: SHEET_INCLUDED,
		notIncluded: ['Lunch'],
		// No per-person prices: the whole boat is sold at the private price in src/config/private.ts.
		prices: null,
		priceUnit: 'boat',
		additionalFees: [],
		disclaimers: DISCLAIMERS,
		gallery: galleryFromDestinations('hvar', 'pakleni'),
		image: PHOTO.hvar,
		featured: false,
		// Tour sheet: Group available N, Private available Y.
		types: ['private'],
		tags: ['swim', 'snorkel'],
		badge: null,
		languages: SHEET_LANGUAGES,
		accessibility: SHEET_ACCESSIBILITY,
		faqs: [
			{
				question: 'What time does the tour leave, and when are we back?',
				answer: 'We leave at 09:00 from Split Riva, stand number 14, and we are back around 18:00. Please arrive 15 minutes early.',
			},
			{
				question: 'How many swim stops are there?',
				answer: 'At least two: below the Red Rocks on Hvar’s south coast, and a final stop at the Pakleni islands or a hidden bay. Milna can be a swim stop too.',
			},
			{
				question: 'Where do we have lunch?',
				answer: 'Lunch is not included. Around 13:00 you have free time ashore — eat on the Pakleni islands or in Milna.',
			},
			FAQ_NO_FEES,
			FAQ_CHILDREN,
			faqBring(SHEET_BRING),
			FAQ_ACCESSIBLE,
			FAQ_WEATHER,
		],
	},
	{
		slug: 'blue-lagoon-morning',
		primaryDestinationSlug: 'blue-lagoon',
		title: 'Blue Lagoon Tour, Drvenik — Morning',
		seoHeadings: { about: 'About the Blue Lagoon morning tour', faq: 'Questions about the Blue Lagoon tour' },
		tagline: 'Half day · Blue Lagoon & Trogir',
		shortDescription:
			'A relaxed half-day to Duga Bay on Čiovo and the turquoise Blue Lagoon near Drvenik, with a stop in Trogir Old Town or Maslinica.',
		availability: `Every day, ${seasonMonths()}`,
		scheduleLabel: 'Half day: 09:30 – 14:00',
		departure: '09:15 check-in · 09:30 departure',
		departures: [{ time: '09:30', checkIn: '09:15' }],
		duration: 'Approx. 4.5 hours',
		durationShort: '4.5 h',
		durationHours: 4.5,
		returnTime: '14:00',
		itineraryKind: 'morning',
		itineraryLabel: 'Morning itinerary',
		itinerary: blueLagoonItinerary('09:30', '14:00'),
		overviewHighlights: BLUE_LAGOON_INTRO,
		introMore: [smallGroup('Your skipper handles the route on the day.')],
		introCollapsible: true,
		meetingPoint: MEETING_POINT,
		weather: WEATHER_COPY,
		importantInfo: SHEET_SAFETY,
		whatToBring: SHEET_BRING,
		included: SHEET_INCLUDED,
		notIncluded: ['Custom pickup (private only)'],
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
		languages: SHEET_LANGUAGES,
		accessibility: SHEET_ACCESSIBILITY,
		faqs: BLUE_LAGOON_FAQS,
	},
	{
		slug: 'blue-lagoon-afternoon',
		primaryDestinationSlug: 'blue-lagoon',
		title: 'Blue Lagoon Tour, Drvenik — Afternoon',
		seoHeadings: { about: 'About the Blue Lagoon afternoon tour', faq: 'Questions about the Blue Lagoon tour' },
		tagline: 'Half day · Blue Lagoon & Trogir',
		shortDescription:
			'An afternoon half-day to Duga Bay on Čiovo and the turquoise Blue Lagoon near Drvenik, with a stop in Trogir Old Town or Maslinica as the day winds down.',
		availability: `Every day, ${seasonMonths()}`,
		scheduleLabel: 'Half day: 14:30 – 19:00',
		departure: '14:15 check-in · 14:30 departure',
		departures: [{ time: '14:30', checkIn: '14:15' }],
		duration: 'Approx. 4.5 hours',
		durationShort: '4.5 h',
		durationHours: 4.5,
		returnTime: '19:00',
		itineraryKind: 'afternoon',
		itineraryLabel: 'Afternoon itinerary',
		itinerary: blueLagoonItinerary('14:30', '19:00'),
		overviewHighlights: BLUE_LAGOON_INTRO,
		introMore: [smallGroup('Your skipper handles the route on the day.')],
		introCollapsible: true,
		meetingPoint: MEETING_POINT,
		weather: WEATHER_COPY,
		importantInfo: SHEET_SAFETY,
		whatToBring: SHEET_BRING,
		included: SHEET_INCLUDED,
		notIncluded: ['Custom pickup (private only)'],
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
		languages: SHEET_LANGUAGES,
		accessibility: SHEET_ACCESSIBILITY,
		faqs: BLUE_LAGOON_FAQS,
	},
	{
		slug: 'dubrovnik-one-way',
		primaryDestinationSlug: 'dubrovnik',
		title: 'Split to Dubrovnik (One-way)',
		// The generated "About the Split to Dubrovnik (One-way) tour" reads awkwardly.
		seoHeadings: { about: 'About the Split to Dubrovnik one-way tour', faq: 'Questions about the Split to Dubrovnik tour' },
		tagline: 'Private one-way · Split to Dubrovnik',
		shortDescription: 'A private one-way speedboat journey from Split to Dubrovnik, calling at Hvar Town and Korčula along the way.',
		availability: `Every day, ${seasonMonths()}`,
		scheduleLabel: 'One-way: 08:00 – 17:00',
		departure: privateStart('dubrovnik-one-way', '08:00'),
		departures: [{ time: '08:00' }] /* Mare, 8 Nov 2026: paid online; the guest may shift it up to 11:00 (src/config/private.ts) */,
		duration: 'Approx. 9 hours',
		durationShort: '9 h',
		durationHours: 9,
		returnTime: 'No return leg: arrival in Dubrovnik around 17:00',
		itineraryKind: 'full',
		itineraryLabel: 'One-way itinerary',
		itinerary: [
			{ time: '08:00', label: 'Departure — Split Riva, stand number 14', description: 'Hop on board, meet the crew and start your trip.', icon: 'map-pin' },
			{ time: '09:30', label: 'Hvar Town, Hvar Island', description: 'Short stop for coffee and a walk.', icon: 'coffee' },
			{ time: '11:00', label: 'Swim stop, secluded bay', description: 'Swim stop en route to Korčula Town.', icon: 'swimming' },
			{ time: '12:30', label: 'Korčula Town', description: 'Free time off board for a lunch break in the walled old town.', icon: 'building-castle' },
			{ time: '14:30', label: 'Second swim stop (optional)', description: 'Swimming and snorkelling among the islands.', icon: 'swimming' },
			{ time: '17:00', label: 'Arrival in Dubrovnik', description: 'Drop-off at the harbour — no return to Split.', icon: 'anchor' },
		],
		overviewHighlights:
			'This private one-way speedboat journey takes you from Split to historic Hvar Old Town, with a stop for a swim in a secluded bay, before exploring the walled town of Korčula with time for lunch. From there it’s a second swim or some snorkelling among the islands as you continue toward Dubrovnik, arriving by early evening.',
		introMore: [
			`This is a private, one-way experience for up to ${MAX_GUESTS} people. You choose the departure time (${privateStart('dubrovnik-one-way', '08:00')}), and your skipper can adjust stops along the way to suit your group. Lunch in Korčula is at your own cost, and we’ll confirm your exact drop-off point in Dubrovnik before departure.`,
		],
		introCollapsible: true,
		meetingPoint: MEETING_POINT_PRIVATE,
		weather: WEATHER_COPY,
		importantInfo: SHEET_SAFETY,
		whatToBring: SHEET_BRING,
		included: [...SHEET_INCLUDED, 'Luggage on board'],
		notIncluded: ['Lunch', 'Return to Split'],
		// No per-person prices: the whole boat is sold at the private price in src/config/private.ts.
		prices: null,
		priceUnit: 'boat',
		additionalFees: [],
		disclaimers: DISCLAIMERS,
		gallery: galleryFromDestinations('korcula', 'dubrovnik'),
		image: PHOTO.dubrovnik,
		featured: false,
		// Tour sheet: Group available N, Private available Y.
		types: ['private'],
		tags: ['swim', 'snorkel'],
		badge: null,
		languages: SHEET_LANGUAGES,
		accessibility: SHEET_ACCESSIBILITY,
		oneWayNote: 'This is a one-way route — there’s no return trip to Split.',
		faqs: [
			{ question: 'Can I bring my luggage?', answer: 'Yes. One suitcase and one small bag per person travel with you on board.' },
			{ question: 'Where do we arrive in Dubrovnik?', answer: 'We drop you at the harbour in Dubrovnik at around 17:00.' },
			{ question: 'Is there a return trip to Split?', answer: 'No, this is a one-way trip. The return to Split is not included.' },
			{
				question: 'Is lunch included?',
				answer: 'Lunch is not included. We stop for a lunch break in Korčula’s walled old town at around 12:30.',
			},
			{ question: 'Do I have to join the swim stop?', answer: 'No, the swim stop is optional — you can stay on board and relax.' },
			faqBring(SHEET_BRING),
			FAQ_ACCESSIBLE,
			FAQ_WEATHER,
		],
	},
	{
		slug: 'create-perfect-day-private',
		title: 'Create Your Perfect Day at Sea',
		tagline: 'Private experience · flexible itinerary',
		shortDescription:
			'A fully private experience: pick your own route from the Blue Cave, Hvar Town, Pakleni, Brač, Vis, or Šolta, or let your skipper plan the day.',
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
			{ label: 'On the water: swim, snorkel, or go ashore at each stop for as long as your booking allows. The itinerary can be adjusted at any time during the tour.', icon: 'swimming' },
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
 * for lacking real photography and have been re-added above per FigJam; they
 * now use the operator's photos (PHOTO.goldenHorn, PHOTO.hvar).
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
