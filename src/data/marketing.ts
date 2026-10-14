import { charterUrl } from '../config/routes';
import { MAX_GUESTS } from '../lib/booking';
import { seasonLabel } from '../config/season';
import { ABOUT } from './about';
import { tours } from './tour-catalog';

/**
 * Homepage marketing copy (spec §9.3), in one place instead of the page
 * markup. Facts here must hold for Split and this operator (§17); anything
 * the owner hasn't confirmed carries `confirmed: false` and stays hidden once
 * the redesigned homepage reads that flag (PR 3).
 */

export type HeroSlide = {
	id: string;
	/** Tabler icon suffix for the dot/label. */
	icon: string;
	heading: string;
	subtext: string;
	ctaLabel: string;
	ctaHref: string;
	/** Accessible name of the slide's dot. */
	dotLabel: string;
};

export const HERO_SLIDES: HeroSlide[] = [
	{
		id: 'tours',
		icon: 'sailboat',
		heading: 'The Adriatic from the water, the way it should be',
		subtext: 'Group departures along the Dalmatian coast. Small boats, real skippers, no tourist conveyor belts.',
		ctaLabel: 'Browse all tours',
		ctaHref: '/tours/',
		dotLabel: 'Show all tours',
	},
	{
		id: 'charter',
		icon: 'anchor',
		heading: 'Your own boat, your own itinerary',
		subtext: 'Private charters for two or twenty. Set the route, set the pace, skip the crowds entirely.',
		ctaLabel: 'Plan a private charter',
		ctaHref: charterUrl(),
		dotLabel: 'Show private charter',
	},
];

export const HOW_IT_WORKS: { title: string; description: string }[] = [
	{ title: 'Choose a tour', description: 'Browse by destination, duration, or activity. Group or private, your call.' },
	{ title: 'Pick your date', description: 'Check availability and choose a departure that suits your schedule.' },
	{ title: 'Book securely', description: 'Pay online via secure checkout. Instant confirmation to your inbox.' },
	{ title: 'Show up and sail', description: 'Meet your captain at Riva stand 14. We take care of everything else.' },
];

export type TypeCard = {
	kind: 'group' | 'private';
	icon: string;
	title: string;
	description: string;
	features: string[];
	ctaLabel: string;
	ctaHref: string;
};

/** The cheapest group tour's adult price, so the type card can't drift from the catalog. */
const lowestGroupPrice = Math.min(
	...tours.filter((t) => t.types.includes('group') && t.adultPrice !== null).map((t) => t.adultPrice as number),
);

export const TYPE_CARDS: TypeCard[] = [
	{
		kind: 'group',
		icon: 'users',
		title: 'Group tour',
		description:
			`Join a small shared departure, max ${MAX_GUESTS} guests. Great for solo travellers, couples, and anyone who likes meeting people on the water.`,
		features: [`From €${lowestGroupPrice} per person`, 'Fixed departures, daily', 'Licensed skipper on every route'],
		ctaLabel: 'Browse group tours',
		ctaHref: '/tours/',
	},
	{
		kind: 'private',
		icon: 'crown',
		title: 'Private charter',
		description:
			'The whole boat is yours. Choose your route, set your pace, bring your own food and music. Ideal for families, celebrations, and corporate groups.',
		features: ['Quoted per boat and season', 'Fully customisable route', 'Flexible departure time'],
		ctaLabel: 'Plan a private charter',
		ctaHref: charterUrl(),
	},
];

/**
 * Trust band. `confirmed` is the owner's sign-off (§17): ratings need a
 * source and the Omnibus disclosures (D-5), years and licence need the facts.
 */
export const TRUST_ITEMS: { icon: string; value: string; label: string; confirmed: boolean }[] = ABOUT.trustStats.map(
	(stat) => ({ ...stat, confirmed: stat.label === 'guests per group tour' }),
);

export const CTA_BAND = {
	heading: 'Ready to get on the water?',
	text: `Tours run daily from Split, ${seasonLabel()}. Book early in July and August. Popular routes fill 3–5 days ahead.`,
	primary: { label: 'Browse all tours', href: '/tours/' },
	secondary: { label: 'Plan a private charter', href: charterUrl() },
};
