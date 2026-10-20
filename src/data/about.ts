import { LICENCE_CONFIRMED } from '../config/site';
import { MAX_GUESTS } from '../lib/booking';
import { yearsOperating } from './marketing';

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

export type TrustStat = {
	icon: string;
	value: string;
	label: string;
	/** The owner's sign-off (§17): unconfirmed stats aren't shown. */
	confirmed: boolean;
};

/**
 * About page content (C-5: crew and history as on the current site, not yet
 * confirmed by the owner). Guest quotes were removed: they need a source and
 * the Omnibus disclosures (D-5).
 */
export const ABOUT = {
	headline: 'Split locals, open-sea specialists',
	intro:
		'Hello Blue Cave started with a simple idea: show guests the islands the way we explore them ourselves, with early departures, small groups, and routes that follow the weather rather than a rigid script. We’re based on Split’s Riva, run our own boats, and still take every charter seriously enough to turn back when the sea says no.',
	foundingTimeline: [
		{
			year: '2016',
			title: 'First season from the Riva',
			description:
				'We launched with one speedboat and a Blue Cave–focused route, meeting guests at stand 14 and capping groups small enough that everyone could swim.',
		},
		{
			year: '2019',
			title: 'Half-day lagoon routes',
			description:
				'Guest demand for shorter days led to our Blue Lagoon morning and afternoon tours, same crew standards, less time commitment.',
		},
		{
			year: '2022',
			title: 'Private charters & cabin boat',
			description:
				'We added flexible private days and a luxury cabin option for families who wanted shade and comfort on longer open-sea legs.',
		},
		{
			year: '2025',
			title: 'Seven tours, one harbour',
			description:
				'Today we run seven scheduled routes from Split, from half-day lagoon escapes to full-day island-hopping, still with local skippers on every departure.',
		},
	] satisfies TimelineEvent[],
	crew: [
		{
			initials: 'MV',
			name: 'Marko Vuković',
			role: 'Founder & Lead Skipper',
			bio: 'Split-born captain with fifteen years on the Adriatic. Knows every channel between Vis and Hvar, and when not to take them.',
		},
		{
			initials: 'AK',
			name: 'Ana Kovač',
			role: 'Operations & Bookings',
			bio: 'Runs the schedule, the stand, and the WhatsApp inbox. If your tour time changes because of weather, Ana tells you first.',
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
				'We keep departures manageable so everyone gets a seat, shade, and time in the water, not a rush through a checklist.',
		},
		{
			icon: 'cloud-storm',
			title: 'Weather-first routing',
			description:
				'If conditions aren’t safe, we adjust or reschedule. The islands aren’t going anywhere. Neither is our reputation.',
		},
		{
			icon: 'map-pin',
			title: 'Local knowledge',
			description:
				'Split skippers, Split harbour, routes refined over hundreds of seasons, not copied from a generic brochure.',
		},
		{
			icon: 'shield-check',
			title: 'Safety without shortcuts',
			description:
				'Experienced crew, maintained boats, life jackets for every size, and briefings before every departure. Non-negotiable.',
		},
	] satisfies ValueItem[],
	trustStats: [
		// Years from FOUNDING_YEAR (D-14, C-1).
		{ icon: 'calendar', value: `${yearsOperating()} years`, label: 'operating from Split', confirmed: true },
		{ icon: 'users', value: `${MAX_GUESTS} max`, label: 'persons per group tour', confirmed: true },
		// Hidden until there's a rating source with its disclosures (D-5, C-2).
		{ icon: 'star', value: '4.9', label: 'average guest rating', confirmed: false },
		// Hidden until the licence is confirmed (C-7); see LICENCE_CONFIRMED.
		{ icon: 'certificate', value: 'Licensed', label: 'Croatian Maritime Authority', confirmed: LICENCE_CONFIRMED },
	] satisfies TrustStat[],
};
