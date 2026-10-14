import { describe, expect, it } from 'vitest';
import { tours } from '../data/tour-catalog';
import { tourCtas } from './tour-display';

const links = { book: (s: string) => `/book/${s}/group/`, contact: (s: string) => `/contact/?tour=${s}`, charter: (s: string) => `/charter/${s}` };
const ctas = (slug: string) => tourCtas(tours.find((t) => t.slug === slug)!, links);

describe('tourCtas', () => {
	it('books instant-book tours and offers a charter where there is one', () => {
		expect(ctas('blue-cave-hvar-5-islands')).toEqual({
			primary: { label: 'Book group tour', href: '/book/blue-cave-hvar-5-islands/group/' },
			secondary: { label: 'Book as private charter', href: '/charter/blue-cave-hvar-5-islands' },
		});
	});

	it('sends quote-only tours to the contact form', () => {
		expect(ctas('hvar-red-rocks-pakleni').primary).toEqual({ label: 'Enquire about this tour', href: '/contact/?tour=hvar-red-rocks-pakleni' });
	});

	it('plans a charter from the charter landing page, without a second charter button', () => {
		expect(ctas('create-perfect-day-private')).toEqual({ primary: { label: 'Plan your charter', href: '/charter/create-perfect-day-private' }, secondary: null });
	});

	it('never offers a charter for the one-way transfer', () => {
		expect(ctas('dubrovnik-one-way')).toEqual({ primary: { label: 'Enquire about this tour', href: '/contact/?tour=dubrovnik-one-way' }, secondary: null });
	});
});
