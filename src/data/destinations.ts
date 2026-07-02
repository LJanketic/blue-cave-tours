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

export type Destination = {
	slug: string;
	name: string;
	region: string;
	/** Tabler icon suffix, e.g. `droplet` → `ti-droplet` */
	icon: string;
	shortDescription: string;
	intro: string;
	tags: string[];
	attrs: string[];
	highlights: string[];
	/** Month scores Jan–Dec: 0 off-season, 1 good, 2 very good, 3 peak */
	bestTimeMonths: [number, number, number, number, number, number, number, number, number, number, number, number];
	bestTimeNote: string;
	geo: GeoFact[];
	nearby: NearbyStop[];
	insiderTips: [string, string, string];
	imagePhotoId: string;
	featured: boolean;
	tourSlugs: string[];
};

export const destinations: Destination[] = [
	{
		slug: 'blue-cave',
		name: 'Blue Cave (Biševo)',
		region: 'Central Dalmatia · Vis archipelago',
		icon: 'droplet',
		shortDescription:
			'The famous sea cave on Biševo where sunlight turns the water an unreal electric blue — the headline stop on our cave-focused routes.',
		intro:
			'The Blue Cave on Biševo island is the Adriatic’s most photographed natural wonder. On calm mornings, sunlight refracts through an underwater opening and floods the chamber with luminous blue light. We reach it by speedboat from Split, timing the visit around official opening hours and sea conditions — because the cave is worth the planning.',
		tags: ['Cave', 'Swimming', 'Must-see'],
		attrs: ['Sea cave', 'Ticket on-site', 'Weather-dependent'],
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
			'May through September offers the most reliable calm seas for cave entry. July and August are busiest — book early for morning slots.',
		geo: [
			{ label: 'Distance from Split', value: '~50 km by sea' },
			{ label: 'Travel time by boat', value: '~1.5–2 hours' },
			{ label: 'Island', value: 'Biševo, near Vis' },
			{ label: 'How we get there', value: 'Speedboat via Vis channel' },
		],
		nearby: [
			{ slug: 'vis', name: 'Vis island', distance: '~20 min', icon: 'island' },
			{ slug: 'hvar', name: 'Hvar town', distance: '~1 hour', icon: 'building-castle' },
			{ slug: 'pakleni', name: 'Pakleni islands', distance: '~1.5 hours', icon: 'beach' },
		],
		insiderTips: [
			'Arrive early in the season (May–June) for fewer queues at the cave entrance — the light is just as vivid.',
			'Bring a light layer; the cave interior is cooler than the open deck even on hot days.',
			'Cave tickets are often paid on-site in cash — your crew will explain amounts and timing before you arrive.',
		],
		imagePhotoId: 'blueCave',
		featured: true,
		tourSlugs: [
			'blue-cave-hvar-5-islands',
			'blue-cave-open-boat',
			'blue-cave-luxury-cabin',
			'blue-cave-6-islands',
			'create-perfect-day-private',
		],
	},
	{
		slug: 'vis',
		name: 'Vis island',
		region: 'Central Dalmatia · Outer islands',
		icon: 'island',
		shortDescription:
			'Remote, unhurried Vis — gateway to the Blue Cave, home to Stiniva Bay, and one of the Adriatic’s most authentic island atmospheres.',
		intro:
			'Vis sits further from the mainland than Hvar or Brač, which kept it quieter for decades. Today it’s the anchor for Blue Cave visits and some of the clearest swim stops on our routes — think Stiniva’s emerald cove, hidden bays, and a town that still feels like a working island rather than a postcard set.',
		tags: ['Island', 'Swimming', 'Hidden bays'],
		attrs: ['Remote island', 'Swim stops', 'Blue Cave gateway'],
		highlights: [
			'Stiniva Bay — one of Croatia’s most famous beaches',
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
			'Stiniva is best photographed from the boat — the beach itself is a steep walk down if you go ashore.',
			'Vis town has excellent lunch spots; ask the crew which restaurants are open on the day you visit.',
			'The open-sea leg can feel lively on windy days — sit aft or in the cabin if you’re prone to seasickness.',
		],
		imagePhotoId: 'stiniva',
		featured: false,
		tourSlugs: [
			'blue-cave-hvar-5-islands',
			'blue-cave-open-boat',
			'blue-cave-luxury-cabin',
			'blue-cave-6-islands',
			'three-islands',
			'create-perfect-day-private',
		],
	},
	{
		slug: 'hvar',
		name: 'Hvar island',
		region: 'Central Dalmatia · Hvar archipelago',
		icon: 'sun',
		shortDescription:
			'Croatia’s sunniest island — lavender hills, Venetian architecture, and a harbour that buzzes from morning espresso to late evening.',
		intro:
			'Hvar town is the Adriatic at its most glamorous: a hilltop fortress, marble streets, and yachts lined along the riva. Our tours give you time ashore or in the harbour depending on the schedule — enough to wander, swim nearby, and feel the island’s energy without rushing the open-sea legs that get you there.',
		tags: ['Island', 'Culture', 'Swimming'],
		attrs: ['Historic town', 'Fortress views', 'Lively harbour'],
		highlights: [
			'Venetian-era old town and waterfront promenade',
			'Fortica fortress with panoramic views',
			'Sunniest island in Croatia — reliable summer weather',
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
			{ slug: 'vis', name: 'Vis island', distance: '~45 min', icon: 'island' },
		],
		insiderTips: [
			'The fortress walk takes about twenty minutes from the main square — go late afternoon for the best light.',
			'Arriving by boat puts you right in the old town; ferry passengers walk further from the main action.',
			'If the town feels busy, the crew often knows quieter swim spots on the Pakleni side — just ask.',
		],
		imagePhotoId: 'hvar',
		featured: true,
		tourSlugs: [
			'blue-cave-hvar-5-islands',
			'hvar-pakleni',
			'blue-cave-6-islands',
			'three-islands',
			'create-perfect-day-private',
		],
	},
	{
		slug: 'pakleni',
		name: 'Pakleni islands',
		region: 'Central Dalmatia · Hvar archipelago',
		icon: 'beach',
		shortDescription:
			'A chain of small islands off Hvar — turquoise bays, pine-shaded coves, and the best swimming near Hvar without the harbour crowds.',
		intro:
			'The Pakleni (Paklinski) islands are where locals take their boats on weekends: shallow turquoise water, rocky coves, and pine trees down to the shore. Our Hvar-focused routes anchor here for extended swim breaks — the kind of stop where you forget about the clock until the crew calls everyone back aboard.',
		tags: ['Swimming', 'Snorkelling', 'Island chain'],
		attrs: ['Turquoise bays', 'Swim stops', 'Near Hvar'],
		highlights: [
			'Some of the clearest water in the Hvar archipelago',
			'Multiple bays — Palmižana, Vinogradišće, and more',
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
			{ slug: 'vis', name: 'Vis island', distance: '~1 hour', icon: 'island' },
		],
		insiderTips: [
			'Palmižana has a marina restaurant if you want a long lunch — tell the crew when you board if you’re interested.',
			'Reef-safe sunscreen helps protect the shallow bays where everyone swims and snorkels.',
			'The water looks inviting everywhere — follow the crew’s pick for the day’s safest anchorage.',
		],
		imagePhotoId: 'pakleni',
		featured: false,
		tourSlugs: [
			'blue-cave-hvar-5-islands',
			'hvar-pakleni',
			'blue-cave-6-islands',
			'three-islands',
			'create-perfect-day-private',
		],
	},
	{
		slug: 'blue-lagoon',
		name: 'Blue Lagoon',
		region: 'Central Dalmatia · Drvenik Veli area',
		icon: 'swimming',
		shortDescription:
			'Shallow turquoise lagoon near Drvenik Veli — the centrepiece of our half-day tours and a swim stop on selected full-day routes.',
		intro:
			'The Blue Lagoon at Budikovac is exactly what the name promises: shallow, luminous water over white sand, ringed by small islets. It’s close enough to Split for a relaxed half-day but feels worlds away from the city. Our morning and afternoon slots maximise swim time without the long open-sea legs of a full island-hopping day.',
		tags: ['Swimming', 'Half-day', 'Snorkelling'],
		attrs: ['Shallow lagoon', 'Half-day tours', 'Family-friendly'],
		highlights: [
			'Calm, shallow water ideal for swimming and snorkelling',
			'Morning and afternoon departure options',
			'Short boat ride from Split — maximum time in the water',
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
			'Half-day tours mean less packing — still bring sunscreen, towel, and a water bottle.',
			'Morning slots tend to have fewer boats in the lagoon; afternoons are quieter on weekdays.',
			'If you love the lagoon, the Three islands tour adds more stops without committing to a full cave day.',
		],
		imagePhotoId: 'blueLagoon',
		featured: true,
		tourSlugs: [
			'blue-lagoon-morning',
			'blue-lagoon-afternoon',
			'blue-lagoon-half-day',
			'three-islands',
			'create-perfect-day-private',
		],
	},
	{
		slug: 'split',
		name: 'Split',
		region: 'Central Dalmatia · Departure hub',
		icon: 'anchor',
		shortDescription:
			'Your starting point on the Riva — Roman palace walls on one side, the Adriatic on the other, and our stand at number 14.',
		intro:
			'Every Hello Blue Cave tour begins in Split, where Diocletian’s Palace meets a working harbour and the Riva promenade buzzes with cafés and boats. We meet at stand 14 — easy to find, right on the waterfront. Split is more than a transit point: it’s the gateway to the islands, and many guests add a day in the old town before or after their tour.',
		tags: ['Departure', 'Historic city', 'Riva harbour'],
		attrs: ['Meeting point', 'UNESCO old town', 'Ferry & airport access'],
		highlights: [
			'Meet at Riva promenade, stand 14 — waterfront location',
			'Diocletian’s Palace — UNESCO World Heritage old town',
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
			'Arrive ten to fifteen minutes before check-in — the Riva gets busy in peak season and parking can take time.',
			'Stand 14 is on the sea side of the promenade; look for our Hello Blue Cave signage near the boat berths.',
			'If you have luggage, drop it at your hotel first — board space is limited to day bags and soft packs.',
		],
		imagePhotoId: 'boatSpeed',
		featured: false,
		tourSlugs: [
			'blue-cave-hvar-5-islands',
			'three-islands',
			'hvar-pakleni',
			'blue-lagoon-morning',
			'blue-lagoon-afternoon',
			'blue-cave-open-boat',
			'blue-cave-luxury-cabin',
			'blue-cave-6-islands',
			'blue-lagoon-half-day',
			'create-perfect-day-private',
		],
	},
];
