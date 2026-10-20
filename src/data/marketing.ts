import { charterUrl } from '../config/routes';
import { CANCELLATION_HOURS } from '../config/cancellation';
import { seasonLabel, type SeasonAmount } from '../config/season';
import { FOUNDING_YEAR, LICENCE_CONFIRMED } from '../config/site';
import { MAX_GUESTS, supportsInstantBook } from '../lib/booking';
import { tours } from './tour-catalog';

/**
 * Homepage marketing copy (spec §6.1, §9.3), in one place instead of the page
 * markup. Facts here must hold for Split and this operator (§17): anything
 * the owner hasn't confirmed carries `confirmed: false` and isn't rendered.
 */

/** Whole years since the founding season (D-14, C-1). */
export function yearsOperating(today = new Date()): number {
	return today.getFullYear() - FOUNDING_YEAR;
}

export type HeroSlide = {
	id: 'group' | 'charter' | 'blue-cave';
	/** Display title, one line each (the slide title is a <p>; the page h1 is fixed, §6.1.1). */
	titleLines: string[];
	sub: string;
	ctaLabel: string;
	ctaHref: string;
	/** object-position of the photo on wide screens; phones use 70% center (§6.1.2). */
	position: string;
};

// C-22: the board's copy, adjusted: "real skippers" (not guides), no "for two
// or twenty" (the cap is 14), the year computed, "Licensed and insured" only
// once the licence is confirmed (C-7).
export const HERO_SLIDES: HeroSlide[] = [
	{
		id: 'group',
		titleLines: ['Escape', 'in style', '& comfort'],
		sub: 'Group departures along the Dalmatian coast. Small boats, real skippers, no tourist conveyor belts.',
		ctaLabel: 'Browse group tours',
		ctaHref: '/tours/?type=group',
		// Not the board's calc(70% + 180px): when the photo is only as wide as the
		// screen, that offset uncovers a strip on the left (seen at 1920px).
		position: 'right center',
	},
	{
		id: 'charter',
		titleLines: ['All', 'aboard,', 'mateys!'],
		sub: 'Private charters for your group. Set the route, set the pace, skip the crowds.',
		ctaLabel: 'Plan a private charter',
		ctaHref: charterUrl(),
		position: '70% center',
	},
	{
		id: 'blue-cave',
		titleLines: ['Hello', 'Blue Cave', 'Croatia'],
		sub: `Speedboat tours from Split since ${FOUNDING_YEAR}.${LICENCE_CONFIRMED ? ' Licensed and insured.' : ''}`,
		ctaLabel: 'See the Blue Cave tour',
		ctaHref: '/tours/blue-cave-hvar-5-islands/',
		position: 'right center',
	},
];

export type TrustItem = {
	icon: string;
	/** Bold part, then the rest of the line. */
	strong: string;
	text: string;
	href?: string;
	/** The owner's sign-off (§17). Unconfirmed items aren't rendered. */
	confirmed: boolean;
};

// The rating slot (D-5, "4.9 from N reviews") replaces the last item once
// src/data/reviews.ts has a real source.
export const TRUST_ITEMS: TrustItem[] = [
	{
		icon: 'shield-check',
		strong: 'Free cancellation',
		text: `up to ${CANCELLATION_HOURS}h on group tours`,
		href: '/legal/cancellation/',
		confirmed: true,
	},
	{ icon: 'users', strong: `Max ${MAX_GUESTS} persons`, text: 'per departure', confirmed: true },
	{ icon: 'certificate', strong: `${yearsOperating()} years`, text: 'on the water', confirmed: true },
	{ icon: 'anchor', strong: 'Small boats,', text: 'real skippers', confirmed: true },
];

export const HOW_IT_WORKS: { title: string; description: string }[] = [
	{ title: 'Choose a tour', description: 'Browse by destination or duration. Group or private, your call.' },
	{ title: 'Pick your date', description: 'Choose a day and how many of you are coming.' },
	{ title: 'Book securely', description: 'Pay online by card or PayPal. Your confirmation comes by email.' },
	{ title: 'Show up and sail', description: 'Meet your skipper at Riva stand 14. We take care of the rest.' },
];

/** The cheapest group tour's adult price in each season, so the type card can't drift from the catalog. */
const groupPrices = tours.filter(supportsInstantBook).flatMap((t) => (t.prices ? [t.prices] : []));
export const LOWEST_GROUP_PRICES: SeasonAmount = {
	low: Math.min(...groupPrices.map((p) => p.low.adult)),
	peak: Math.min(...groupPrices.map((p) => p.peak.adult)),
};

export type TypeCard = {
	kind: 'group' | 'private';
	badge: { icon: string; label: string };
	icon: string;
	title: string;
	description: string;
	/** `strong` is shown bold inside the line, e.g. the price; a seasonal price shows today's season's (SeasonPrice). */
	features: { text: string; strong?: string | SeasonAmount }[];
	ctaLabel: string;
	ctaHref: string;
};

export const TYPE_CARDS: TypeCard[] = [
	{
		kind: 'group',
		badge: { icon: 'users', label: 'Other people on board' },
		icon: 'users',
		title: 'Group tour',
		description: `Join a small shared departure, max ${MAX_GUESTS} persons. Great for solo travellers, couples, and anyone who likes meeting people on the water.`,
		features: [
			{ text: 'From {strong} per person', strong: LOWEST_GROUP_PRICES },
			{ text: 'Fixed departures, every day' },
			...(LICENCE_CONFIRMED ? [{ text: 'Licensed skipper on every route' }] : []),
		],
		ctaLabel: 'Browse group tours',
		ctaHref: '/tours/?type=group',
	},
	{
		kind: 'private',
		badge: { icon: 'crown', label: 'Just you on board' },
		icon: 'crown',
		title: 'Private charter',
		description:
			'The whole boat is yours. Choose your route, set your pace, bring your own food and music. Ideal for families, celebrations, and corporate groups.',
		// "From €X for the boat" only once the charter price table exists (D-8).
		features: [{ text: 'Quoted per boat and season' }, { text: 'Fully customisable route' }, { text: 'Flexible departure time' }],
		ctaLabel: 'Plan a private charter',
		ctaHref: charterUrl(),
	},
];

export const DESTINATIONS_INTRO = 'Islands, sea caves and old towns along the Dalmatian coast, all within a boat ride of Split.';

export const CTA_BAND = {
	heading: 'Ready to get on the water?',
	// No "most sell out 3–5 days ahead": an unbacked scarcity claim (UCPD).
	text: `Tours run daily from Split, ${seasonLabel()}. Book early in July and August.`,
	primary: { label: 'Browse all tours', href: '/tours/' },
	secondary: { label: 'Plan a private charter', href: charterUrl() },
};
