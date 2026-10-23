import { charterUrl } from '../config/routes';
import { CANCELLATION_HOURS } from '../config/cancellation';
import { seasonLabel } from '../config/season';
import { FOUNDING_YEAR, LICENCE_CONFIRMED } from '../config/site';
import { MAX_GUESTS, supportsInstantBook, supportsPrivateBook } from '../lib/booking';
import { PRIVATE_TOURS } from '../config/private';
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

/** The page's only h1 (handoff H1): fixed above the rotating slides, so it never changes. */
export const HERO_OVERLINE = 'Blue Cave & island hopping · Split, Croatia';

export type HeroSlide = {
	id: 'group' | 'charter' | 'blue-cave';
	/** Display title, one line each (the slide title is a <p>; the h1 is {@link HERO_OVERLINE}). */
	titleLines: string[];
	sub: string;
	/** object-position of the photo on wide screens; phones use 70% center (§6.1.2). */
	position: string;
};

// Handoff H2/H3: the designer's copy with this operator's facts. Capacity and
// founding year come from config, never from the handoff's copy (D2, D3), and
// "licensed" shows only once the licence is confirmed (D11, C-7).
export const HERO_SLIDES: HeroSlide[] = [
	{
		id: 'blue-cave',
		titleLines: ['Hello', 'Blue Cave', 'Croatia'],
		sub: `Small-group and private boat tours from Split to the Blue Cave, Hvar and the Pakleni islands — running since ${FOUNDING_YEAR}.`,
		position: 'right center',
	},
	{
		id: 'group',
		titleLines: ['Escape', 'in style', '& comfort'],
		sub: `Modern, comfortable speedboats with a ${LICENCE_CONFIRMED ? 'licensed ' : ''}skipper — fast, smooth rides to the islands, max ${MAX_GUESTS} persons on board.`,
		// Not the board's calc(70% + 180px): when the photo is only as wide as the
		// screen, that offset uncovers a strip on the left (seen at 1920px).
		position: 'right center',
	},
	{
		id: 'charter',
		titleLines: ['All', 'aboard,', 'mateys!'],
		sub: `Private boat tours from Split for up to ${MAX_GUESTS} persons. Your route, your pace — the Blue Cave, Hvar or a quiet bay.`,
		position: '70% center',
	},
];

/** The same two actions on every slide (handoff H4), so the hero renders them once. */
export const HERO_CTAS = {
	primary: { label: 'Browse group tours', href: '/tours/?type=group' },
	secondary: { label: 'Plan a private experience', href: charterUrl() },
};

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

/** The cheapest group tour's low-season adult price (the "From" price), so the type card can't drift from the catalog. */
const groupPrices = tours.filter(supportsInstantBook).flatMap((t) => (t.prices ? [t.prices] : []));
export const LOWEST_GROUP_PRICE: number = Math.min(...groupPrices.map((p) => p.low.adult));

/** The cheapest private boat's low-season price (src/config/private.ts), for the same "From" line. */
export const LOWEST_PRIVATE_PRICE: number = Math.min(...tours.filter(supportsPrivateBook).map((t) => PRIVATE_TOURS[t.slug].boat.low));

export type TypeCard = {
	kind: 'group' | 'private';
	badge: { icon: string; label: string };
	icon: string;
	title: string;
	description: string;
	/** `strong` is shown bold inside the line, e.g. the price; a price is a number, shown as euros. */
	features: { text: string; strong?: string | number }[];
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
			{ text: 'From {strong} per person', strong: LOWEST_GROUP_PRICE },
			{ text: 'Fixed daily departures on most routes' },
			...(LICENCE_CONFIRMED ? [{ text: 'Licensed skipper on every route' }] : []),
		],
		ctaLabel: 'Browse group tours',
		ctaHref: '/tours/?type=group',
	},
	{
		kind: 'private',
		badge: { icon: 'crown', label: 'Just you on board' },
		icon: 'crown',
		title: 'Private experience',
		description:
			'The whole boat is yours. Choose your route, set your pace, bring your own food and music. Ideal for families, celebrations, and corporate groups.',
		// Priced boats (src/config/private.ts) are booked and paid online, one price for the boat by season (plan P);
		// every other route, and a custom route or time, is a request answered with a quote.
		features: [
			{ text: 'From {strong} for the boat', strong: LOWEST_PRIVATE_PRICE },
			{ text: 'Book online, or ask us for a quote' },
			{ text: 'Your own route and time on request' },
		],
		ctaLabel: 'Plan a private experience',
		ctaHref: charterUrl(),
	},
];

export const DESTINATIONS_INTRO = 'Islands, sea caves and old towns along the Dalmatian coast, all within a boat ride of Split.';

export const CTA_BAND = {
	heading: 'Ready to get on the water?',
	// No "most sell out 3–5 days ahead": an unbacked scarcity claim (UCPD).
	text: `Most tours run daily from Split, ${seasonLabel()}. Book early in July and August.`,
	primary: { label: 'Browse all tours', href: '/tours/' },
	secondary: { label: 'Plan a private experience', href: charterUrl() },
};
