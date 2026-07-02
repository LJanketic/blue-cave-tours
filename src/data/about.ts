export type TimelineEvent = {
	year: string;
	title: string;
	description: string;
};

export type CrewMember = {
	initials: string;
	name: string;
	role: string;
	bio: string;
};

export type ValueItem = {
	icon: string;
	title: string;
	description: string;
};

export type GuestQuote = {
	quote: string;
	author: string;
	context: string;
};

export type TrustStat = {
	icon: string;
	value: string;
	label: string;
};

export const ABOUT = {
	headline: 'Split locals, open-sea specialists',
	intro:
		'Hello Blue Cave started with a simple idea: show guests the islands the way we explore them ourselves — early departures, small groups, and routes that follow the weather rather than a rigid script. We’re based on Split’s Riva, run our own boats, and still take every charter seriously enough to turn back when the sea says no.',
	foundingTimeline: [
		{
			year: '2016',
			title: 'First season from the Riva',
			description:
				'We launched with one speedboat and a Blue Cave–focused route, meeting guests at stand 14 and capping groups small enough that everyone could actually swim.',
		},
		{
			year: '2019',
			title: 'Half-day lagoon routes',
			description:
				'Guest demand for shorter days led to our Blue Lagoon morning and afternoon tours — same crew standards, less time commitment.',
		},
		{
			year: '2022',
			title: 'Private charters & cabin boat',
			description:
				'We added flexible private days and a luxury cabin option for families who wanted shade and comfort on longer open-sea legs.',
		},
		{
			year: '2025',
			title: 'Ten tours, one harbour',
			description:
				'Today we run ten scheduled routes from Split — from half-day lagoon escapes to six-island adventures — still with licensed local skippers on every departure.',
		},
	] satisfies TimelineEvent[],
	crew: [
		{
			initials: 'MV',
			name: 'Marko Vuković',
			role: 'Founder & Lead Skipper',
			bio: 'Split-born captain with fifteen years on the Adriatic. Knows every channel between Vis and Hvar — and when not to take them.',
		},
		{
			initials: 'AK',
			name: 'Ana Kovač',
			role: 'Operations & Bookings',
			bio: 'Runs the schedule, the stand, and the WhatsApp inbox. If your tour time changes because of weather, Ana is the one who tells you first.',
		},
		{
			initials: 'LP',
			name: 'Luka Perić',
			role: 'Skipper & Guide',
			bio: 'Former dive instructor turned speedboat skipper. Great at spotting calm bays and explaining why the Blue Cave glows the way it does.',
		},
	] satisfies CrewMember[],
	values: [
		{
			icon: 'users',
			title: 'Small groups, always',
			description:
				'We keep departures manageable so everyone gets a seat, shade, and time in the water — not a rush through a checklist.',
		},
		{
			icon: 'cloud-storm',
			title: 'Weather-first routing',
			description:
				'If conditions aren’t safe, we adjust or reschedule. The islands aren’t going anywhere — and neither is our reputation.',
		},
		{
			icon: 'map-pin',
			title: 'Local knowledge',
			description:
				'Split skippers, Split harbour, routes refined over hundreds of seasons — not copied from a generic brochure.',
		},
		{
			icon: 'shield-check',
			title: 'Safety without shortcuts',
			description:
				'Licensed crew, maintained boats, life jackets for every size, and briefings before every departure. Non-negotiable.',
		},
	] satisfies ValueItem[],
	pressMentions: [
		{
			quote:
				'Best day of our Croatia trip. The crew timed the Blue Cave perfectly and still had us swimming in three different bays.',
			author: 'Sarah & James',
			context: 'Blue Cave & 5 islands · July 2024',
		},
		{
			quote:
				'We booked the morning lagoon tour with two kids under six — short day, calm water, and the skipper was patient with every question.',
			author: 'Elena M.',
			context: 'Blue Lagoon morning · August 2024',
		},
		{
			quote:
				'Private charter for our anniversary. They built the route around our pace and found a quiet cove near Pakleni for lunch on the boat.',
			author: 'Thomas R.',
			context: 'Create your perfect day · June 2025',
		},
	] satisfies GuestQuote[],
	trustStats: [
		{ icon: 'calendar', value: '9 yrs', label: 'operating from Split' },
		{ icon: 'users', value: '12 max', label: 'guests per group tour' },
		{ icon: 'star', value: '4.9 ★', label: 'average guest rating' },
		{ icon: 'certificate', value: 'Licensed', label: 'Croatian Maritime Authority' },
	] satisfies TrustStat[],
};
