import { CANCELLATION_FULL, CANCELLATION_WEATHER } from '../config/cancellation';

export type FaqCategory = 'booking' | 'changes' | 'guests' | 'bring';

export type FaqItem = {
	category: FaqCategory;
	question: string;
	answer: string;
	link?: { href: string; label: string };
};

export const FAQ_CATEGORIES: { id: FaqCategory; label: string; icon: string }[] = [
	{ id: 'booking', label: 'Booking & price', icon: 'receipt' },
	{ id: 'changes', label: 'Changes & cancellations', icon: 'refresh' },
	{ id: 'guests', label: 'Who can join', icon: 'users' },
	{ id: 'bring', label: 'What to bring', icon: 'list-check' },
];

export const FAQ_ITEMS: FaqItem[] = [
	{
		category: 'booking',
		question: 'What’s included in the price?',
		answer:
			'The boat tour, a professional skipper, fuel, bottled water, snorkelling masks, safety equipment, insurance and VAT. Lunch, restaurant drinks and entrance tickets (such as the Blue Cave ticket) are not included.',
	},
	{
		category: 'booking',
		question: 'Do I need to book in advance?',
		answer: 'Yes, especially in high season, when tours are often fully booked days ahead.',
		link: { href: '/tours/', label: 'Browse tours' },
	},
	{
		category: 'booking',
		question: 'Do you offer private tours?',
		answer:
			'Yes. Most of our tours can also be booked privately, and you can design a fully custom day on a private boat, with a flexible itinerary and a more personal experience.',
		link: { href: '/tours/create-perfect-day-private/', label: 'Create your perfect day at sea' },
	},
	{
		category: 'changes',
		question: 'What’s your cancellation policy?',
		answer: CANCELLATION_FULL,
		link: { href: '/legal/cancellation/', label: 'Cancellation policy' },
	},
	{
		category: 'changes',
		question: 'Can the itinerary change, and what if the Blue Cave is closed?',
		answer: `Yes. Sea conditions or weather may mean adjusting stops, skipping a location (such as the Blue Cave if it’s closed due to waves), or rescheduling. Your skipper always puts safety first. ${CANCELLATION_WEATHER}`,
	},
	{
		category: 'changes',
		question: 'What if I’m running late?',
		answer:
			'Contact us immediately. We can usually wait 10–15 minutes, but not longer, since it affects the rest of the day’s schedule.',
		link: { href: '/contact/', label: 'Contact us' },
	},
	{
		category: 'guests',
		question: 'Are the tours suitable for children?',
		answer: 'Yes, children are welcome. For longer tours, please consider the duration and sea conditions for younger kids.',
	},
	{
		category: 'guests',
		question: 'What about pregnancy, back or neck issues, or mobility needs?',
		answer:
			'Our boats aren’t recommended for guests in advanced pregnancy or with acute back or neck conditions, because of the boat’s movement at sea. Some boats can take strollers or wheelchairs. Contact us before booking so we can arrange the right boat for your needs.',
		link: { href: '/contact/', label: 'Contact us' },
	},
	{
		category: 'guests',
		question: 'Are pets allowed?',
		answer: 'Not on group tours. On request, pets may be allowed on private tours.',
	},
	{
		category: 'bring',
		question: 'What should I bring?',
		answer: 'Swimsuit, towel, sunscreen, sunglasses, hat, camera, and cash or card for lunch or extras.',
	},
	{
		category: 'bring',
		question: 'Can I bring luggage?',
		answer: 'Yes, there’s safe storage space on board.',
	},
];
