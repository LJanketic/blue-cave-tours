import type { TourDetail } from '../../types/tour';

export const MEETING_POINT =
	"Meet at Split's Riva promenade, stand number 14. After booking you'll receive the exact location, map link, and what time to arrive.";

export const WEATHER_COPY =
	'We track forecasts and sea state. If conditions are rough or a stop is closed, we adjust the route or timing and communicate changes clearly.';

export const SAFETY_COPY =
	'Follow crew instructions, wear a life jacket when asked, stay seated during manoeuvres, and tell us if you have conditions that affect swimming or sun exposure.';

export const BRING_DEFAULT = ['Sunscreen & hat', 'Swimwear & towel', 'Light jacket', 'Water', 'Sea-sickness remedy if needed'];

export const DISCLAIMERS = [
	'Routes, order of stops, and swim breaks may vary with weather, harbour traffic, and site regulations.',
	'National park and cave entry fees may be charged separately on-site where applicable.',
];

export const LONG_BLUE_CAVE_INTRO =
	'Step aboard our modern speedboat and discover the Adriatic in the most exciting yet comfortable way. Powerful, safe, and expertly handled by our experienced skipper, the boat offers the perfect balance of smooth cruising and dynamic performance. Glide across crystal-clear waters, feel the fresh sea breeze, and enjoy panoramic views of hidden bays and iconic islands.';

export const CAVE_NOTE =
	'Entrance to the Blue Cave may require a separate ticket payable on-site; availability depends on sea conditions and official cave opening hours.';

export const PRICE_STANDARD =
	'Indicative pricing: infants 0–3 €0; children 4–10 from €139; adults from €159 — final price shown at checkout before payment.';

export const PRICE_THREE_ISLANDS =
	'Indicative pricing: infants 0–3 €0; children 4–10 from €122; adults from €139 — final price shown at checkout before payment.';

export const PRICE_PRIVATE =
	'Private charters are quoted per boat and season. Request a quote via the contact form or by phone.';

export const IMG = {
	boat: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
	deck: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
	islands: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1200&q=80',
	lagoon: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
	cave: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=1200&q=80',
	hvar: 'https://images.unsplash.com/photo-1555993539-1732b0258235?auto=format&fit=crop&w=1200&q=80',
};

export function galleryTriplet(a: string, b: string, c: string): TourDetail['gallery'] {
	return [
		{ src: a, alt: 'Adriatic coastal scenery' },
		{ src: b, alt: 'Boat experience' },
		{ src: c, alt: 'Island and sea views' },
	];
}
