import { describe, expect, it } from 'vitest';
import { tours } from '../data/tour-catalog';
import { MEETING_POINT_MAP_URL, ZENTA_MEETING_POINT_MAP_URL } from '../config/site';
import { meetingPointLines, tourBreadcrumbs, tourCtas } from './tour-display';

const links = { book: (s: string) => `/book/${s}/group/`, contact: (s: string, topic?: string) => `/contact/?tour=${s}${topic ? `&topic=${topic}` : ''}`, charter: (s: string) => `/charter/${s}` };
const ctas = (slug: string) => tourCtas(tours.find((t) => t.slug === slug)!, links);

describe('tourCtas', () => {
	const groupAndPrivate = { slug: 'x', types: ['group', 'private'] as ('group' | 'private')[] };

	it('books instant-book tours and offers a private experience where there is one', () => {
		expect(ctas('blue-cave-hvar-5-islands')).toEqual({
			primary: { label: 'Book group tour', href: '/book/blue-cave-hvar-5-islands/group/' },
			secondary: { label: 'Plan a private experience', href: '/charter/blue-cave-hvar-5-islands' },
		});
	});

	it('offers the private experience on every group tour that also runs privately', () => {
		expect(ctas('golden-horn-brac-hvar').secondary).toEqual({ label: 'Plan a private experience', href: '/charter/golden-horn-brac-hvar' });
	});

	it('keeps the private button on a group + private tour with no group price yet', () => {
		expect(tourCtas({ ...groupAndPrivate, prices: null }, links)).toEqual({
			primary: { label: 'Ask about the group tour', href: '/contact/?tour=x&topic=group' },
			secondary: { label: 'Plan a private experience', href: '/charter/x' },
		});
	});

	it('asks about an unpriced group-only tour, with no private button', () => {
		expect(tourCtas({ slug: 'x', types: ['group'], prices: null }, links)).toEqual({
			primary: { label: 'Ask about the group tour', href: '/contact/?tour=x&topic=group' },
			secondary: null,
		});
	});

	it('offers the private experience on the Blue Lagoon tours too', () => {
		expect(ctas('blue-lagoon-morning')).toEqual({
			primary: { label: 'Book group tour', href: '/book/blue-lagoon-morning/group/' },
			secondary: { label: 'Plan a private experience', href: '/charter/blue-lagoon-morning' },
		});
	});

	it('sends quote-only private tours to the contact form, with no second button to the same form', () => {
		expect(tourCtas({ slug: 'x', types: ['private'], prices: null }, links)).toEqual({
			primary: { label: 'Enquire about this tour', href: '/contact/?tour=x' },
			secondary: null,
		});
	});

	it.each(['hvar-red-rocks-pakleni', 'dubrovnik-one-way'])('asks about the unpriced group option of %s and keeps its private one', (slug) => {
		expect(ctas(slug)).toEqual({
			primary: { label: 'Ask about the group tour', href: `/contact/?tour=${slug}&topic=group` },
			secondary: { label: 'Plan a private experience', href: `/charter/${slug}` },
		});
	});

	it('plans a charter from the charter landing page, without a second charter button', () => {
		expect(ctas('create-perfect-day-private')).toEqual({ primary: { label: 'Plan your charter', href: '/charter/create-perfect-day-private' }, secondary: null });
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

	it('offers private-only tours the Riva or Zenta, with the spot confirmed after booking', () => {
		const view = meetingPointLines({ types: ['private'] });
		expect(view.lines.map((line) => line.map((part) => part.text).join(''))).toEqual(['Riva stand 14 or Zenta']);
		expect(hrefs(['private'])).toEqual([MEETING_POINT_MAP_URL, ZENTA_MEETING_POINT_MAP_URL]);
		expect(view.note).toBe('Exact spot confirmed after booking');
	});

	it('keeps the Riva for group tours and adds the private options on tours with both', () => {
		const view = meetingPointLines({ types: ['group', 'private'] });
		expect(view.lines.map((line) => line.map((part) => part.text).join(''))).toEqual([
			'Riva promenade, stand 14, Split',
			'Private tours: Riva stand 14 or Zenta',
		]);
		expect(hrefs(['group', 'private'])).toEqual([MEETING_POINT_MAP_URL, ZENTA_MEETING_POINT_MAP_URL]);
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
			'For example Riva stand 14 or Zenta',
		]);
		expect(view.lines.flat().flatMap((part) => (part.href ? [part.href] : []))).toEqual([MEETING_POINT_MAP_URL, ZENTA_MEETING_POINT_MAP_URL]);
		expect(view.note).toBeNull();
	});
});
