import { PHOTO } from './tour-photos';

export type GeoFact = {
	label: string;
	value: string;
};

export type NearbyStop = {
	slug: string;
	name: string;
	distance: string;
	icon: string;
};

export type DestinationAttr = {
	/** Tabler icon suffix, e.g. `swimming` → `ti-swimming` */
	icon: string;
	label: string;
};

/** Optional "tip"-styled highlight pill shown on the detail hero overlay. */
export type DestinationTipTag = {
	/** Tabler icon suffix, e.g. `sun` → `ti-sun` */
	icon: string;
	label: string;
};

export type Destination = {
	slug: string;
	name: string;
	region: string;
	/** Tabler icon suffix, e.g. `droplet` → `ti-droplet` */
	icon: string;
	shortDescription: string;
	intro: string;
	tags: string[];
	/** Optional single "tip" pill highlighted on the detail hero image. */
	tipTag?: DestinationTipTag;
	attrs: DestinationAttr[];
	highlights: string[];
	/** Month scores Jan–Dec: 0 off-season, 1 good, 2 very good, 3 peak */
	bestTimeMonths: [number, number, number, number, number, number, number, number, number, number, number, number];
	bestTimeNote: string;
	geo: GeoFact[];
	nearby: NearbyStop[];
	insiderTips: [string, string, string];
	imagePhotoId: keyof typeof PHOTO;
	featured: boolean;
	tourSlugs: string[];
	/**
	 * True for the departure point (Split) — every tour lists it in
	 * `tourSlugs` since every tour leaves from there, but it isn't a
	 * touristic stop. Excluded from "destinations this tour visits" UI.
	 */
	isDepartureHub?: boolean;
};

export const destinations: Destination[] = [
	{
		slug: 'blue-cave',
		name: 'Blue Cave (Biševo)',
		region: 'Central Dalmatia · Vis archipelago',
		icon: 'droplet',
		shortDescription:
			'The famous sea cave on Biševo where sunlight turns the water an unreal electric blue, the headline stop on our cave-focused routes.',
		intro:
			'The Blue Cave on Biševo island is the Adriatic’s most photographed natural wonder. On calm mornings, sunlight refracts through an underwater opening and floods the chamber with luminous blue light. We reach it by speedboat from Split, timing the visit around official opening hours and sea conditions, because the cave is worth the planning.',
		tags: ['Cave', 'Swimming', 'Must-see'],
		tipTag: { icon: 'clock', label: 'Best in the morning calm' },
		attrs: [
			{ icon: 'droplet', label: 'Sea cave' },
			{ icon: 'ticket', label: 'Ticket on-site' },
			{ icon: 'cloud-storm', label: 'Weather-dependent' },
		],
		highlights: [
			'Iconic blue light inside the cave chamber',
			'Short boat transfer from Vis island',
			'Best experienced in morning calm',
			'Part of our flagship island-hopping days',
			'Professional crew handles timing and logistics',
			'Combine with Vis bays on the same tour',
		],
		bestTimeMonths: [0, 0, 1, 2, 3, 3, 3, 3, 3, 2, 1, 0],
		bestTimeNote:
			'May through September offers the most reliable calm seas for cave entry. July and August are busiest. Book early for morning slots.',
		geo: [
			{ label: 'Distance from Split', value: '~50 km by sea' },
			{ label: 'Travel time by boat', value: '~1.5–2 hours' },
			{ label: 'Island', value: 'Biševo, near Vis' },
			{ label: 'How we get there', value: 'Speedboat via Vis channel' },
		],
		nearby: [
			{ slug: 'vis', name: 'Vis island', distance: '~20 min', icon: 'building-lighthouse' },
			{ slug: 'hvar', name: 'Hvar town', distance: '~1 hour', icon: 'building-castle' },
			{ slug: 'pakleni', name: 'Pakleni islands', distance: '~1.5 hours', icon: 'beach' },
		],
		insiderTips: [
			'Arrive early in the season (May–June) for fewer queues at the cave entrance. The light is just as vivid.',
			'Bring a light layer; the cave interior is cooler than the open deck even on hot days.',
			'Cave tickets are often paid on-site in cash. Your crew will explain amounts and timing before you arrive.',
		],
		imagePhotoId: 'blueCave',
		featured: true,
		tourSlugs: ['blue-cave-hvar-5-islands', 'create-perfect-day-private'],
	},
	{
		slug: 'vis',
		name: 'Vis island',
		region: 'Central Dalmatia · Outer islands',
		icon: 'building-lighthouse',
		shortDescription:
			'Remote, unhurried Vis: gateway to the Blue Cave, home to Stiniva Bay, and one of the Adriatic’s most authentic island atmospheres.',
		intro:
			'Vis sits further from the mainland than Hvar or Brač, which kept it quieter for decades. Today it’s the anchor for Blue Cave visits and some of the clearest swim stops on our routes. Think Stiniva’s emerald cove, hidden bays, and a town that still feels like a working island rather than a postcard set.',
		tags: ['Island', 'Swimming', 'Hidden bays'],
		tipTag: { icon: 'beach', label: 'Home to Stiniva Bay' },
		attrs: [
			{ icon: 'building-lighthouse', label: 'Remote island' },
			{ icon: 'swimming', label: 'Swim stops' },
			{ icon: 'droplet', label: 'Blue Cave gateway' },
		],
		highlights: [
			'Stiniva Bay, one of Croatia’s most famous beaches',
			'Crystal-clear water away from mainland crowds',
			'Authentic Vis town with local restaurants',
			'Natural stopover on cave-focused full-day tours',
			'Excellent snorkelling in sheltered coves',
			'Panoramic coastal cruising en route from Split',
		],
		bestTimeMonths: [0, 0, 1, 2, 3, 3, 3, 3, 3, 2, 1, 0],
		bestTimeNote:
			'June and September balance warm water with calmer crossings. Peak summer is stunning but plan for longer travel legs on busy days.',
		geo: [
			{ label: 'Distance from Split', value: '~45 km by sea' },
			{ label: 'Travel time by boat', value: '~1.5 hours' },
			{ label: 'Island size', value: '~90 km²' },
			{ label: 'How we get there', value: 'Open-sea crossing from Split' },
		],
		nearby: [
			{ slug: 'blue-cave', name: 'Blue Cave, Biševo', distance: '~20 min', icon: 'droplet' },
			{ slug: 'hvar', name: 'Hvar island fields', distance: '~45 min', icon: 'building-castle' },
			{ slug: 'pakleni', name: 'Pakleni islands', distance: '~1 hour', icon: 'beach' },
		],
		insiderTips: [
			'Stiniva is best photographed from the boat. The beach itself is a steep walk down if you go ashore.',
			'Vis town has excellent lunch spots; ask the crew which restaurants are open on the day you visit.',
			'The open-sea leg can feel lively on windy days. Sit aft or in the cabin if you’re prone to seasickness.',
		],
		imagePhotoId: 'stiniva',
		featured: false,
		tourSlugs: ['blue-cave-hvar-5-islands', 'create-perfect-day-private'],
	},
	{
		slug: 'hvar',
		name: 'Hvar island',
		region: 'Central Dalmatia · Hvar archipelago',
		icon: 'sun',
		shortDescription:
			'Croatia’s sunniest island: lavender hills, Venetian architecture, and a harbour that buzzes from morning espresso to late evening.',
		intro:
			'Hvar town is the Adriatic at its most glamorous: a hilltop fortress, marble streets, and yachts lined along the riva. Our tours give you time ashore or in the harbour depending on the schedule, enough to wander, swim nearby, and feel the island’s energy without rushing the open-sea legs that get you there.',
		tags: ['Island', 'Culture', 'Swimming'],
		tipTag: { icon: 'sun', label: 'Sunniest island in Croatia' },
		attrs: [
			{ icon: 'building-castle', label: 'Historic town' },
			{ icon: 'building-fortress', label: 'Fortress views' },
			{ icon: 'anchor', label: 'Lively harbour' },
		],
		highlights: [
			'Venetian-era old town and waterfront promenade',
			'Fortica fortress with panoramic views',
			'Sunniest island in Croatia, reliable summer weather',
			'Gateway to the Pakleni island chain',
			'Excellent local wine and seafood ashore',
			'Iconic stop on our Hvar & Pakleni full-day tour',
		],
		bestTimeMonths: [0, 0, 1, 2, 3, 3, 3, 3, 3, 2, 1, 0],
		bestTimeNote:
			'May, June, and September offer warm seas with fewer crowds than July–August. Lavender fields peak in early summer.',
		geo: [
			{ label: 'Distance from Split', value: '~40 km by sea' },
			{ label: 'Travel time by boat', value: '~1–1.5 hours' },
			{ label: 'Island length', value: '~68 km' },
			{ label: 'How we get there', value: 'Speedboat via Hvar channel' },
		],
		nearby: [
			{ slug: 'pakleni', name: 'Pakleni islands', distance: '~15 min', icon: 'beach' },
			{ slug: 'blue-cave', name: 'Blue Cave, Biševo', distance: '~1 hour', icon: 'droplet' },
			{ slug: 'vis', name: 'Vis island', distance: '~45 min', icon: 'building-lighthouse' },
		],
		insiderTips: [
			'The fortress walk takes about twenty minutes from the main square. Go late afternoon for the best light.',
			'Arriving by boat puts you right in the old town; ferry passengers walk further from the main action.',
			'If the town feels busy, the crew often knows quieter swim spots on the Pakleni side. Just ask.',
		],
		imagePhotoId: 'hvar',
		featured: true,
		tourSlugs: [
			'blue-cave-hvar-5-islands',
			'golden-horn-brac-hvar',
			'hvar-red-rocks-pakleni',
			'dubrovnik-one-way',
			'create-perfect-day-private',
		],
	},
	{
		slug: 'pakleni',
		name: 'Pakleni islands',
		region: 'Central Dalmatia · Hvar archipelago',
		icon: 'beach',
		shortDescription:
			'A chain of small islands off Hvar: turquoise bays, pine-shaded coves, and the best swimming near Hvar without the harbour crowds.',
		intro:
			'The Pakleni (Paklinski) islands are where locals take their boats on weekends: shallow turquoise water, rocky coves, and pine trees down to the shore. Our Hvar-focused routes anchor here for extended swim breaks, the kind of stop where you forget about the clock until the crew calls everyone back aboard.',
		tags: ['Swimming', 'Snorkelling', 'Island chain'],
		tipTag: { icon: 'droplet', label: 'Best swimming near Hvar' },
		attrs: [
			{ icon: 'droplet', label: 'Turquoise bays' },
			{ icon: 'swimming', label: 'Swim stops' },
			{ icon: 'map-pin', label: 'Near Hvar' },
		],
		highlights: [
			'Some of the clearest water in the Hvar archipelago',
			'Multiple bays: Palmižana, Vinogradišće, and more',
			'Perfect snorkelling in calm, shallow coves',
			'Natural complement to Hvar town on full-day tours',
			'Pine shade and limestone cliffs framing every bay',
			'Less crowded than Hvar’s main harbour beaches',
		],
		bestTimeMonths: [0, 0, 1, 2, 3, 3, 3, 3, 3, 2, 1, 0],
		bestTimeNote:
			'Water warms from May onward. Morning visits on peak-season days mean calmer anchorages before afternoon boat traffic builds.',
		geo: [
			{ label: 'Distance from Hvar town', value: '~2–5 km' },
			{ label: 'Travel time by boat', value: '~10–20 min from Hvar' },
			{ label: 'From Split', value: '~1.5 hours total' },
			{ label: 'How we get there', value: 'Short hop from Hvar channel' },
		],
		nearby: [
			{ slug: 'hvar', name: 'Hvar town', distance: '~15 min', icon: 'building-castle' },
			{ slug: 'blue-lagoon', name: 'Blue Lagoon', distance: '~45 min', icon: 'swimming' },
			{ slug: 'vis', name: 'Vis island', distance: '~1 hour', icon: 'building-lighthouse' },
		],
		insiderTips: [
			'Palmižana has a marina restaurant if you want a long lunch. Tell the crew when you board if you’re interested.',
			'Reef-safe sunscreen helps protect the shallow bays where everyone swims and snorkels.',
			'The water looks inviting everywhere. Follow the crew’s pick for the day’s safest anchorage.',
		],
		imagePhotoId: 'pakleni',
		featured: false,
		tourSlugs: [
			'blue-cave-hvar-5-islands',
			'golden-horn-brac-hvar',
			'hvar-red-rocks-pakleni',
			'create-perfect-day-private',
		],
	},
	{
		slug: 'blue-lagoon',
		name: 'Blue Lagoon',
		region: 'Central Dalmatia · Drvenik Veli area',
		icon: 'swimming',
		shortDescription:
			'Shallow turquoise lagoon near Drvenik Veli, the centrepiece of our half-day tours and a swim stop on selected full-day routes.',
		intro:
			'The Blue Lagoon at Budikovac is exactly what the name promises: shallow, luminous water over white sand, ringed by small islets. It’s close enough to Split for a relaxed half-day but feels worlds away from the city. Our morning and afternoon slots maximise swim time without the long open-sea legs of a full island-hopping day.',
		tags: ['Swimming', 'Half-day', 'Snorkelling'],
		tipTag: { icon: 'clock', label: 'Great for a relaxed half-day' },
		attrs: [
			{ icon: 'swimming', label: 'Shallow lagoon' },
			{ icon: 'clock', label: 'Half-day tours' },
			{ icon: 'users', label: 'Family-friendly' },
		],
		highlights: [
			'Calm, shallow water ideal for swimming and snorkelling',
			'Morning and afternoon departure options',
			'Short boat ride from Split, maximum time in the water',
			'Perfect introduction to Adriatic boat touring',
			'Featured on our Three islands sampler route',
			'Consistently clear water in summer months',
		],
		bestTimeMonths: [0, 0, 1, 2, 3, 3, 3, 3, 3, 2, 1, 0],
		bestTimeNote:
			'June through September is prime lagoon season. Morning tours offer softer light; afternoon slots suit late risers.',
		geo: [
			{ label: 'Distance from Split', value: '~15 km by sea' },
			{ label: 'Travel time by boat', value: '~45 min' },
			{ label: 'Area', value: 'Drvenik Veli · Budikovac' },
			{ label: 'How we get there', value: 'Coastal run from Split harbour' },
		],
		nearby: [
			{ slug: 'split', name: 'Split (departure)', distance: '~45 min return', icon: 'anchor' },
			{ slug: 'pakleni', name: 'Pakleni islands', distance: '~45 min', icon: 'beach' },
			{ slug: 'hvar', name: 'Hvar island', distance: '~1 hour', icon: 'building-castle' },
		],
		insiderTips: [
			'Half-day tours mean less packing. Still bring sunscreen, towel, and a water bottle.',
			'Morning slots tend to have fewer boats in the lagoon; afternoons are quieter on weekdays.',
			'If you love the lagoon, the Three islands tour adds more stops without committing to a full cave day.',
		],
		imagePhotoId: 'blueLagoon',
		featured: true,
		tourSlugs: ['blue-lagoon-morning', 'blue-lagoon-afternoon'],
	},
	{
		slug: 'split',
		name: 'Split',
		region: 'Central Dalmatia · Departure hub',
		icon: 'anchor',
		shortDescription:
			'Your starting point on the Riva: Roman palace walls on one side, the Adriatic on the other, and our stand at number 14.',
		intro:
			'Every Hello Blue Cave tour begins in Split, where Diocletian’s Palace meets a working harbour and the Riva promenade buzzes with cafés and boats. We meet at stand 14, easy to find, right on the waterfront. Split is more than a transit point: it’s the gateway to the islands, and many guests add a day in the old town before or after their tour.',
		tags: ['Departure', 'Historic city', 'Riva harbour'],
		tipTag: { icon: 'map-pin', label: 'Meet at Riva, stand 14' },
		attrs: [
			{ icon: 'map-pin', label: 'Meeting point' },
			{ icon: 'building-castle', label: 'UNESCO old town' },
			{ icon: 'plane', label: 'Ferry & airport access' },
		],
		highlights: [
			'Meet at Riva promenade, stand 14, waterfront location',
			'Diocletian’s Palace, UNESCO World Heritage old town',
			'Direct access to island routes south and east',
			'Excellent pre- or post-tour dining on the Riva',
			'Split airport and ferry connections for island-hopping trips',
			'Home base for all Hello Blue Cave departures',
		],
		bestTimeMonths: [0, 0, 1, 2, 3, 3, 3, 3, 3, 2, 1, 0],
		bestTimeNote:
			'Tour season runs April–November. Shoulder months (May, June, September) combine warm weather with a more relaxed city pace.',
		geo: [
			{ label: 'Meeting point', value: 'Riva promenade, stand 14' },
			{ label: 'Airport', value: 'Split (SPU) ~30 min by taxi' },
			{ label: 'Harbour', value: 'Central Split waterfront' },
			{ label: 'How we depart', value: 'Speedboat from Riva area' },
		],
		nearby: [
			{ slug: 'blue-lagoon', name: 'Blue Lagoon', distance: '~45 min by boat', icon: 'swimming' },
			{ slug: 'hvar', name: 'Hvar island', distance: '~1–1.5 hours', icon: 'building-castle' },
			{ slug: 'blue-cave', name: 'Blue Cave', distance: '~2 hours', icon: 'droplet' },
		],
		insiderTips: [
			'Arrive ten to fifteen minutes before check-in. The Riva gets busy in peak season and parking can take time.',
			'Stand 14 is on the sea side of the promenade; look for our Hello Blue Cave signage near the boat berths.',
			'If you have luggage, drop it at your hotel first. Board space is limited to day bags and soft packs.',
		],
		imagePhotoId: 'boatSpeed',
		featured: false,
		tourSlugs: [
			'blue-cave-hvar-5-islands',
			'golden-horn-brac-hvar',
			'hvar-red-rocks-pakleni',
			'blue-lagoon-morning',
			'blue-lagoon-afternoon',
			'dubrovnik-one-way',
			'create-perfect-day-private',
		],
		isDepartureHub: true,
	},
	{
		slug: 'zlatni-rat',
		name: 'Zlatni Rat (Golden Horn)',
		region: 'Central Dalmatia · Brač island',
		icon: 'beach',
		shortDescription:
			'The iconic Golden Horn Beach on Brač Island, known for its striking shape and crystal-clear water, the centrepiece of our Golden Horn, Brač and Hvar tour.',
		intro:
			'Zlatni Rat, the "Golden Horn," is Brač Island’s famous shifting-shape beach, its tip curving with the current and wind. Fine white pebbles slope into clear, shallow water that makes it one of the most photographed beaches on the Adriatic. Our Golden Horn, Brač and Hvar tour stops here for around two hours before continuing on to Pakleni and Hvar Town.',
		tags: ['Beach', 'Swimming', 'Iconic shape'],
		tipTag: { icon: 'beach', label: 'Croatia’s famous shifting-shape beach' },
		attrs: [
			{ icon: 'beach', label: 'Pebble beach' },
			{ icon: 'swimming', label: 'Shallow, clear water' },
			{ icon: 'map-pin', label: 'Brač island' },
		],
		highlights: [
			'One of the Adriatic’s most photographed beaches',
			'Shallow, clear water good for swimming at any age',
			'Fine white pebbles rather than sand or rock',
			'Centrepiece stop on our Golden Horn, Brač and Hvar tour',
			'Roughly two hours ashore before continuing to Pakleni and Hvar',
		],
		bestTimeMonths: [0, 0, 1, 2, 3, 3, 3, 3, 3, 2, 1, 0],
		bestTimeNote:
			'May through September offers the warmest, calmest swimming. The beach can get busy in July and August, especially around midday.',
		geo: [
			{ label: 'Distance from Split', value: '~40 km by sea' },
			{ label: 'Travel time by boat', value: '~1–1.5 hours' },
			{ label: 'Island', value: 'Brač' },
			{ label: 'How we get there', value: 'Speedboat direct from Split' },
		],
		nearby: [
			{ slug: 'pakleni', name: 'Pakleni islands', distance: '~30–60 min', icon: 'beach' },
			{ slug: 'hvar', name: 'Hvar town', distance: '~1 hour', icon: 'building-castle' },
			{ slug: 'split', name: 'Split (departure)', distance: '~1–1.5 hours', icon: 'anchor' },
		],
		insiderTips: [
			'The beach tip changes shape with the current and wind. No two visits look the same.',
			'Bring water shoes; the pebbles can be warm underfoot at midday.',
			'Our crew times the stop to avoid the busiest midday crowds where the schedule allows.',
		],
		imagePhotoId: 'goldenHorn',
		featured: false,
		tourSlugs: ['golden-horn-brac-hvar'],
	},
	{
		slug: 'trogir',
		name: 'Trogir',
		region: 'Split-Trogir riviera · Čiovo channel',
		icon: 'building-castle',
		shortDescription:
			'The historic streets of Trogir Old Town, a stroll stop on our half-day Blue Lagoon tours, occasionally swapped for Maslinica on Šolta depending on the day.',
		intro:
			'Trogir’s old town sits on a small island connected by bridges to the mainland and to Čiovo, its stone streets and Venetian architecture earning it UNESCO World Heritage status. Our morning and afternoon Blue Lagoon tours call here for free time ashore after the swim stop, close enough to Split for an easy half-day addition.',
		tags: ['Old town', 'Coastal town', 'Half-day'],
		tipTag: { icon: 'building-castle', label: 'UNESCO old town' },
		attrs: [
			{ icon: 'building-castle', label: 'Historic old town' },
			{ icon: 'anchor', label: 'Waterfront promenade' },
			{ icon: 'clock', label: 'Half-day stop' },
		],
		highlights: [
			'UNESCO World Heritage old town on a small island',
			'Venetian-era stone streets and waterfront promenade',
			'Free-time stop on our Blue Lagoon morning and afternoon tours',
			'Easy, compact town, comfortable to explore in an hour',
			'Occasionally swapped for Maslinica on Šolta depending on the day',
		],
		bestTimeMonths: [0, 0, 1, 2, 3, 3, 3, 3, 3, 2, 1, 0],
		bestTimeNote:
			'Pleasant to walk year-round in season; May, June, and September are quieter than peak summer afternoons.',
		geo: [
			{ label: 'Distance from Split', value: '~25 km by sea' },
			{ label: 'Travel time by boat', value: '~45–60 min' },
			{ label: 'Location', value: 'Split-Trogir riviera, Čiovo channel' },
			{ label: 'How we get there', value: 'Coastal run from Split' },
		],
		nearby: [
			{ slug: 'blue-lagoon', name: 'Blue Lagoon', distance: '~60 min', icon: 'swimming' },
			{ slug: 'split', name: 'Split (departure)', distance: '~45–60 min', icon: 'anchor' },
		],
		insiderTips: [
			'The old town is small enough to see on foot in under an hour, so there’s time for a coffee too.',
			'Ask the crew if the day’s stop is Trogir or Maslinica. The route depends on conditions.',
			'The waterfront promenade is the easiest place to regroup before reboarding.',
		],
		imagePhotoId: 'trogir',
		featured: false,
		tourSlugs: ['blue-lagoon-morning', 'blue-lagoon-afternoon'],
	},
	{
		slug: 'korcula',
		name: 'Korčula',
		region: 'South Dalmatia · Korčula island',
		icon: 'building-castle',
		shortDescription:
			'The walled old town of Korčula, with time ashore for lunch, a stop on our one-way Dubrovnik tour as we continue south from Hvar.',
		intro:
			'Korčula’s walled old town juts into the sea on its own small peninsula, its fan-shaped street plan and stone walls giving it a reputation as a smaller, quieter cousin of Dubrovnik. Our one-way Dubrovnik transfer stops here for free time and lunch before continuing south for a second swim stop.',
		tags: ['Old town', 'History', 'Lunch stop'],
		tipTag: { icon: 'building-castle', label: 'Walled old town' },
		attrs: [
			{ icon: 'building-castle', label: 'Walled old town' },
			{ icon: 'anchor', label: 'Harbour town' },
			{ icon: 'map-pin', label: 'South Dalmatia' },
		],
		highlights: [
			'Walled old town on its own small peninsula',
			'Fan-shaped medieval street plan, easy to explore on foot',
			'Free time and a lunch stop on our Dubrovnik one-way tour',
			'Quieter alternative to Dubrovnik’s old town crowds',
			'Scenic approach by sea between Hvar and Dubrovnik',
		],
		bestTimeMonths: [0, 0, 1, 2, 3, 3, 3, 3, 3, 2, 1, 0],
		bestTimeNote: 'Part of a long one-way day, so timing follows the tour’s overall schedule rather than a season preference.',
		geo: [
			{ label: 'Distance from Split', value: '~110 km by sea' },
			{ label: 'Position on route', value: 'Between Hvar and Dubrovnik' },
			{ label: 'Island', value: 'Korčula' },
			{ label: 'How we get there', value: 'Speedboat, one-way Dubrovnik tour' },
		],
		nearby: [
			{ slug: 'hvar', name: 'Hvar town', distance: 'earlier on the route', icon: 'building-castle' },
			{ slug: 'dubrovnik', name: 'Dubrovnik', distance: 'later on the route', icon: 'building-castle' },
		],
		insiderTips: [
			'This is a lunch stop on a long one-way day. Plan a quick, easy meal near the old town gate.',
			'The town walls make for a short, scenic walk if time is tight before reboarding.',
			'Only visited on the Dubrovnik one-way private charter, not on any round-trip tour.',
		],
		imagePhotoId: 'korcula',
		featured: false,
		tourSlugs: ['dubrovnik-one-way'],
	},
	{
		slug: 'dubrovnik',
		name: 'Dubrovnik',
		region: 'South Dalmatia · Dubrovnik-Neretva',
		icon: 'building-castle',
		shortDescription:
			'The endpoint of our one-way private transfer from Split, a full day’s scenic cruise via Hvar and Korčula, arriving in Dubrovnik by early evening.',
		intro:
			'Dubrovnik’s walled old town, with its limestone streets and city walls looking out over the Adriatic, is the endpoint of our longest route, a one-way private charter that threads south past Hvar and Korčula before arriving by early evening. There’s no return leg; this is a scenic, one-way transfer for guests continuing their trip from Dubrovnik.',
		tags: ['City', 'One-way transfer', 'History'],
		tipTag: { icon: 'building-castle', label: 'One-way private transfer' },
		attrs: [
			{ icon: 'building-castle', label: 'Historic walled city' },
			{ icon: 'map-pin', label: 'South Dalmatia' },
			{ icon: 'anchor', label: 'Arrival point, no return leg' },
		],
		highlights: [
			'Endpoint of our one-way Split-to-Dubrovnik private charter',
			'Full day’s scenic cruise via Hvar Old Town and Korčula',
			'Two swim or snorkelling stops along the way',
			'Arrival by early evening, ready to continue your trip',
			'No return leg, a one-way transfer rather than a round trip',
		],
		bestTimeMonths: [0, 0, 1, 2, 3, 3, 3, 3, 3, 2, 1, 0],
		bestTimeNote: 'Run as a private charter on request throughout the season. Timing is arranged directly with you.',
		geo: [
			{ label: 'Distance from Split', value: '~220 km by sea (via Hvar & Korčula)' },
			{ label: 'Travel time', value: '~10 hours, one-way' },
			{ label: 'Region', value: 'Dubrovnik-Neretva' },
			{ label: 'How we get there', value: 'Private speedboat charter, one-way' },
		],
		nearby: [
			{ slug: 'korcula', name: 'Korčula', distance: 'earlier on the route', icon: 'building-castle' },
			{ slug: 'hvar', name: 'Hvar town', distance: 'earlier on the route', icon: 'building-castle' },
		],
		insiderTips: [
			'This route is priced and booked as a private one-way charter, not an instant-book group tour.',
			'Arrange onward accommodation in Dubrovnik in advance. There’s no return leg to Split.',
			'The full day covers real distance; bring layers for the cooler evening arrival.',
		],
		imagePhotoId: 'dubrovnik',
		featured: false,
		tourSlugs: ['dubrovnik-one-way'],
	},
];
