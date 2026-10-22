import { BESTSELLER_EVIDENCE, MEETING_POINT_LABEL, MEETING_POINT_MAP_URL, ZENTA_MEETING_POINT_MAP_URL } from '../config/site';
import type { TourDetail } from '../types/tour';

/*
 * Display rules for tours. No catalog import, so Vue islands can use these
 * without shipping the tour data to the browser.
 */

/** "Best seller" shows only with evidence behind it (C-24): the badge AND BESTSELLER_EVIDENCE. */
export function showsBestseller(tour: Pick<TourDetail, 'badge'>, evidence: string | null = BESTSELLER_EVIDENCE): boolean {
	return tour.badge === 'bestseller' && evidence !== null;
}

/** The "Cave entry" fact on a tour page: the cave fee if there is one, else that the route skips the cave. */
export function caveEntryNote(tour: Pick<TourDetail, 'additionalFees'>): string {
	return tour.additionalFees[0]?.text ?? 'This route does not visit the Blue Cave.';
}

export type Cta = { label: string; href: string };

/** The landing page for private charters (D-23): its primary action is the charter request. */
const CHARTER_LANDING = 'create-perfect-day-private';

/**
 * The tour page's booking actions (spec §6.3.4):
 * - instant-book tours: "Book group tour"
 * - the private experience landing page: "Plan your experience"
 * - group tours with no price yet: "Ask about the group tour" (contact form)
 * - private-only tours, quoted on request: "Enquire about this tour"
 * plus "Plan a private experience" on every tour that runs both as a group
 * and privately, priced or not (handoff ruling: every tour is group +
 * private). A private-only tour's enquiry already is the charter request, so
 * it gets no second button to the same form.
 */
export function tourCtas(
	tour: Pick<TourDetail, 'slug' | 'types' | 'prices'>,
	links: { book: (slug: string) => string; contact: (slug: string, topic?: 'group') => string; charter: (slug: string) => string },
): { primary: Cta; secondary: Cta | null } {
	const isGroup = tour.types.includes('group');
	const primary: Cta =
		isGroup && tour.prices !== null
			? { label: 'Book group tour', href: links.book(tour.slug) }
			: tour.slug === CHARTER_LANDING
				? { label: 'Plan your experience', href: links.charter(tour.slug) }
				: isGroup
					? { label: 'Ask about the group tour', href: links.contact(tour.slug, 'group') }
					: { label: 'Enquire about this tour', href: links.contact(tour.slug) };
	const offersPrivate = isGroup && tour.types.includes('private');
	return { primary, secondary: offersPrivate ? { label: 'Plan a private experience', href: links.charter(tour.slug) } : null };
}

/**
 * A tour page's breadcrumb trail: Tours › <tour> (handoff G7). The visible
 * breadcrumb and the BreadcrumbList JSON-LD both come from here, so they
 * can't drift; the JSON-LD puts Home in front. Hrefs are site-relative.
 */
export function tourBreadcrumbs(tour: Pick<TourDetail, 'slug' | 'title'>): { label: string; href: string }[] {
	return [
		{ label: 'Tours', href: '/tours/' },
		{ label: tour.title, href: `/tours/${tour.slug}/` },
	];
}

/** A run of text in a fact tile; with `href` it's an external map link. */
export type TextPart = { text: string; href?: string };

/**
 * The "Meeting point" tile. Group tours leave from the Riva; private tours
 * may leave from the Riva or Zenta, and the exact spot is confirmed with the
 * guest after booking.
 * - flexible itinerary (Create Your Perfect Day), whatever the types: agreed
 *   when booking, with the Riva and Zenta as examples
 * - group only: the Riva link
 * - private only: "Riva stand 14 or Zenta", both linked, plus a note
 * - both: the Riva link, then "Private tours: Riva stand 14 or Zenta"
 */
export function meetingPointLines(
	tour: Pick<TourDetail, 'types'> & Partial<Pick<TourDetail, 'itineraryKind' | 'departures'>>,
): { lines: TextPart[][]; note: string | null } {
	const riva: TextPart = { text: MEETING_POINT_LABEL, href: MEETING_POINT_MAP_URL };
	const riva14: TextPart = { text: 'Riva stand 14', href: MEETING_POINT_MAP_URL };
	const zenta: TextPart = { text: 'Zenta', href: ZENTA_MEETING_POINT_MAP_URL };
	if (tour.itineraryKind === 'flexible') {
		return { lines: [[{ text: 'Flexible, agreed when you book' }], [{ text: 'For example ' }, riva14, { text: ' or ' }, zenta]], note: null };
	}
	if (!tour.types.includes('private')) return { lines: [[riva]], note: null };
	if (!tour.types.includes('group')) {
		return { lines: [[riva14, { text: ' or ' }, zenta]], note: 'Exact spot confirmed after booking' };
	}
	// No scheduled group departure yet (group price on request, D4b): the spot isn't fixed either.
	const groupScheduled = tour.departures === undefined || tour.departures.length > 0;
	return { lines: [[riva], [{ text: 'Private tours: Riva stand 14 or ' }, zenta]], note: groupScheduled ? null : 'Exact spot confirmed after booking' };
}

/** How a destination reads in "from Split to …"; any other slug uses its name up to a bracket. */
const ITINERARY_PLACES: Record<string, string> = {
	'blue-cave': 'the Blue Cave',
	vis: 'Vis',
	hvar: 'Hvar',
	pakleni: 'the Pakleni islands',
	'blue-lagoon': 'the Blue Lagoon',
	'zlatni-rat': 'Zlatni Rat on Brač',
	korcula: 'Korčula',
};

/** The tour's name inside a sentence: "Blue Lagoon Morning Tour" → "Blue Lagoon Morning". */
export function tourShortName(title: string): string {
	return title
		.replace(/^create your\s+/i, '')
		.replace(/\s+tour$/i, '')
		.trim();
}

export type TourHeadings = { about: string; itinerary: string; included: string; notIncluded: string; goodToKnow: string };

/**
 * The tour page's section headings, worded the way people search (handoff
 * D1). `destinations` are the stops the tour visits, without Split
 * (getDestinationsForTour). The headline destination leads the list; a
 * one-way route ends there instead ("to Dubrovnik via Hvar and Korčula").
 * The flexible charter has no fixed route, so its heading says so.
 */
export function tourHeadings(
	tour: Pick<TourDetail, 'title' | 'itineraryKind' | 'itineraryLabel' | 'primaryDestinationSlug' | 'seoHeadings'>,
	destinations: { slug: string; name: string }[],
): TourHeadings {
	const flexible = tour.itineraryKind === 'flexible';
	const noun = flexible ? 'experience' : 'tour';
	const place = (d: { slug: string; name: string }) => ITINERARY_PLACES[d.slug] ?? d.name.split('(')[0].trim();
	const lead = destinations.find((d) => d.slug === tour.primaryDestinationSlug);
	const others = destinations.filter((d) => d !== lead).map(place);
	const list = (names: string[]) => new Intl.ListFormat('en-GB', { type: 'conjunction' }).format(names);

	let route = '';
	if (flexible) route = 'the islands you choose';
	else if (lead && others.length > 0 && /one-way/i.test(tour.itineraryLabel)) route = `${place(lead)} via ${list(others)}`;
	else if (lead || others.length > 0) route = list([...(lead ? [place(lead)] : []), ...others]);

	return {
		about: tour.seoHeadings?.about ?? `About the ${tourShortName(tour.title)} ${noun}`,
		itinerary: tour.seoHeadings?.itinerary ?? (route ? `${flexible ? 'Your' : 'Tour'} itinerary — from Split to ${route}` : `${flexible ? 'Your' : 'Tour'} itinerary`),
		included: `What's included in the ${noun}`,
		notIncluded: "What's not included",
		goodToKnow: 'Good to know before you go',
	};
}
