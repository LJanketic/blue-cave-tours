import { describe, expect, it } from 'vitest';
import { tours } from '../data/tour-catalog';
import { MEETING_POINT_MAP_URL, ZENTA_MEETING_POINT_MAP_URL } from '../config/site';
import { meetingPointLines, tourCtas } from './tour-display';

const links = { book: (s: string) => `/book/${s}/group/`, contact: (s: string) => `/contact/?tour=${s}`, charter: (s: string) => `/charter/${s}` };
const ctas = (slug: string) => tourCtas(tours.find((t) => t.slug === slug)!, links);

describe('tourCtas', () => {
	it('books instant-book tours and offers a charter where there is one', () => {
		expect(ctas('blue-cave-hvar-5-islands')).toEqual({
			primary: { label: 'Book group tour', href: '/book/blue-cave-hvar-5-islands/group/' },
			secondary: { label: 'Book as private charter', href: '/charter/blue-cave-hvar-5-islands' },
		});
	});

	it('offers the charter on every group tour that also runs privately', () => {
		expect(ctas('golden-horn-brac-hvar').secondary).toEqual({ label: 'Book as private charter', href: '/charter/golden-horn-brac-hvar' });
	});

	it('sends quote-only private tours to the contact form, with no second button to the same form', () => {
		expect(ctas('hvar-red-rocks-pakleni')).toEqual({ primary: { label: 'Enquire about this tour', href: '/contact/?tour=hvar-red-rocks-pakleni' }, secondary: null });
	});

	it('plans a charter from the charter landing page, without a second charter button', () => {
		expect(ctas('create-perfect-day-private')).toEqual({ primary: { label: 'Plan your charter', href: '/charter/create-perfect-day-private' }, secondary: null });
	});

	it('never offers a charter for the one-way transfer', () => {
		expect(ctas('dubrovnik-one-way')).toEqual({ primary: { label: 'Enquire about this tour', href: '/contact/?tour=dubrovnik-one-way' }, secondary: null });
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
});
