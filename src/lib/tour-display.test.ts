import { describe, expect, it } from 'vitest';
import { tours } from '../data/tour-catalog';
import { MEETING_POINT_MAP_URL } from '../config/site';
import { meetingPointLines, tourBreadcrumbs, tourCtas } from './tour-display';

const links = {
	book: (s: string) => `/book/${s}/group/`,
	contact: (s: string, topic?: string) => `/contact/?tour=${s}${topic ? `&topic=${topic}` : ''}`,
	charter: (s: string) => `/charter/${s}`,
	private: (s: string) => `/book/${s}/private/`,
};
const ctas = (slug: string) => tourCtas(tours.find((t) => t.slug === slug)!, links);

describe('tourCtas', () => {
	const groupAndPrivate = { slug: 'x', types: ['group', 'private'] as ('group' | 'private')[] };

	it("books instant-book tours, and books the boat privately where there is a private price, showing the boat's low-season price", () => {
		expect(ctas('blue-cave-hvar-5-islands')).toEqual({
			primary: { label: 'Book group tour tickets', href: '/book/blue-cave-hvar-5-islands/group/' },
			secondary: { label: 'Private experience', href: '/book/blue-cave-hvar-5-islands/private/', price: '€1,500' },
		});
	});

	it.each(['golden-horn-brac-hvar', 'blue-lagoon-morning', 'blue-lagoon-afternoon'])('opens the private booking step of %s (a quote request), with no price, while it has no boat price', (slug) => {
		expect(ctas(slug).secondary).toEqual({ label: 'Private experience', href: `/book/${slug}/private/` });
	});

	it('opens the private booking step of a group + private tour with no private price, without a price', () => {
		expect(tourCtas({ ...groupAndPrivate, prices: null }, links)).toEqual({
			primary: { label: 'Ask about the group tour', href: '/contact/?tour=x&topic=group' },
			secondary: { label: 'Private experience', href: '/book/x/private/' }
		});
	});

	it('asks about an unpriced group-only tour, with no private button', () => {
		expect(tourCtas({ slug: 'x', types: ['group'], prices: null }, links)).toEqual({
			primary: { label: 'Ask about the group tour', href: '/contact/?tour=x&topic=group' },
			secondary: null
		});
	});

	it('needs a fixed departure before it shows the boat price (without one the step is a quote request)', () => {
		const blueCave = tours.find((t) => t.slug === 'blue-cave-hvar-5-islands')!;
		expect(tourCtas({ ...blueCave, departures: [] }, links).secondary).toEqual({ label: 'Private experience', href: '/book/blue-cave-hvar-5-islands/private/' });
	});

	it('sends a private-only tour with a fixed route to its private booking step, with no second button', () => {
		expect(tourCtas({ slug: 'x', types: ['private'], prices: null }, links)).toEqual({
			primary: { label: 'Plan your private tour', href: '/book/x/private/' },
			secondary: null
		});
	});

	// Tour sheet 4 Nov 2026: private only ("Plan your private tour" on the AFTER pages).
	it.each(['hvar-red-rocks-pakleni', 'dubrovnik-one-way'])('plans %s as a private tour through its private booking step', (slug) => {
		expect(ctas(slug)).toEqual({
			primary: { label: 'Plan your private tour', href: `/book/${slug}/private/` },
			secondary: null
		});
	});

	it('plans a charter from the charter landing page, without a second charter button', () => {
		expect(ctas('create-perfect-day-private')).toEqual({ primary: { label: 'Plan your experience', href: '/charter/create-perfect-day-private' }, secondary: null });
	});
});

describe('tourBreadcrumbs', () => {
	it('is Tours, then the tour itself: no destination level', () => {
		expect(tourBreadcrumbs({ slug: 'golden-horn-brac-hvar', title: 'Golden Horn' })).toEqual([
			{ label: 'Tours', href: '/tours/' },
			{ label: 'Golden Horn', href: '/tours/golden-horn-brac-hvar/' },
		]);
	});

	it('has exactly two crumbs for every tour in the catalog', () => {
		for (const tour of tours) expect(tourBreadcrumbs(tour)).toHaveLength(2);
	});
});

describe('meetingPointLines', () => {
	const hrefs = (types: ('group' | 'private')[]) => meetingPointLines({ types }).lines.flat().flatMap((part) => (part.href ? [part.href] : []));

	it('sends group tours to the Riva only', () => {
		expect(meetingPointLines({ types: ['group'] })).toEqual({
			lines: [[{ text: 'Riva promenade, stand 14, Split', href: MEETING_POINT_MAP_URL }]],
			note: null,
		});
	});

	it('offers private-only tours the Riva, with the spot confirmed after booking', () => {
		const view = meetingPointLines({ types: ['private'] });
		expect(view.lines.map((line) => line.map((part) => part.text).join(''))).toEqual(['Riva stand 14']);
		expect(hrefs(['private'])).toEqual([MEETING_POINT_MAP_URL]);
		expect(view.note).toBe('Exact spot confirmed after booking');
	});

	it('shows only the Riva on tours with both group and private', () => {
		const view = meetingPointLines({ types: ['group', 'private'] });
		expect(view.lines.map((line) => line.map((part) => part.text).join(''))).toEqual(['Riva promenade, stand 14, Split']);
		expect(hrefs(['group', 'private'])).toEqual([MEETING_POINT_MAP_URL]);
		expect(view.note).toBeNull();
	});

	it('says the spot is confirmed after booking while a group tour has no scheduled departure', () => {
		expect(meetingPointLines({ types: ['group', 'private'], departures: [] }).note).toBe('Exact spot confirmed after booking');
		expect(meetingPointLines({ types: ['group', 'private'], departures: [{ time: '07:20' }] }).note).toBeNull();
	});

	it('agrees the meeting point per booking on the flexible Perfect Day charter', () => {
		const perfectDay = tours.find((t) => t.slug === 'create-perfect-day-private')!;
		const view = meetingPointLines(perfectDay);
		expect(view.lines.map((line) => line.map((part) => part.text).join(''))).toEqual([
			'Flexible, agreed when you book',
			'For example Riva stand 14',
		]);
		expect(view.lines.flat().flatMap((part) => (part.href ? [part.href] : []))).toEqual([MEETING_POINT_MAP_URL]);
		expect(view.note).toBeNull();
	});
});
