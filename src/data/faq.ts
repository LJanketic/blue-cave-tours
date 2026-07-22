export type FaqCategory = 'booking' | 'weather' | 'onboard' | 'guests' | 'private';

export type FaqItem = {
	category: FaqCategory;
	question: string;
	answer: string;
	link?: { href: string; label: string };
};

export const FAQ_CATEGORIES: { id: FaqCategory; label: string; icon: string }[] = [
	{ id: 'booking', label: 'Booking & cancellation', icon: 'calendar-check' },
	{ id: 'weather', label: 'Weather & cancellations', icon: 'cloud-storm' },
	{ id: 'onboard', label: 'On board', icon: 'sailboat' },
	{ id: 'guests', label: 'Guests & suitability', icon: 'users' },
	{ id: 'private', label: 'Private charters', icon: 'crown' },
];

export const FAQ_ITEMS: FaqItem[] = [
	{
		category: 'booking',
		question: 'How do I book a tour?',
		answer:
			'Choose a tour on our website, pick your date and guest count, and complete checkout. You’ll receive confirmation with meeting time, stand location, and what to bring.',
		link: { href: '/tours', label: 'Browse tours' },
	},
	{
		category: 'booking',
		question: 'Where do we meet?',
		answer:
			'Split’s Riva promenade, stand 14. You’ll receive the exact meeting time and any last-minute updates after booking.',
	},
	{
		category: 'booking',
		question: 'Will I receive a confirmation after booking?',
		answer:
			'Yes — immediately after payment. Check spam if it doesn’t arrive within a few minutes; contact us with your name and tour date if needed.',
		link: { href: '/contact', label: 'Contact us' },
	},
	{
		category: 'booking',
		question: 'Is online payment secure?',
		answer:
			'Yes. All payments are processed securely by Stripe — card details go straight to Stripe and are never stored on our servers. Prices are shown in Euros with applicable taxes included.',
		link: { href: '/legal/privacy', label: 'Privacy policy' },
	},
	{
		category: 'booking',
		question: 'Can I cancel or reschedule?',
		answer:
			'Free cancellation up to 48 hours before departure. Cancellations within 48 hours are non-refundable. To reschedule, contact us as early as possible and we\'ll do our best to move you to another date, subject to availability.',
		link: { href: '/legal/cancellation', label: 'Cancellation policy' },
	},
	{
		category: 'weather',
		question: 'What if the weather is bad?',
		answer:
			'We monitor forecasts. Routes may be shortened, reordered, or rescheduled so the day stays safe and enjoyable.',
	},
	{
		category: 'weather',
		question: 'How do you decide if conditions are safe to sail?',
		answer:
			'Our captains use official forecasts plus local knowledge — wind, wave height, and visibility. Guest safety always comes first.',
	},
	{
		category: 'weather',
		question: 'What if it rains but the sea is calm?',
		answer:
			'Light rain rarely cancels a tour. We only withhold departures when sea conditions make it unsafe. We’ll contact you if there’s any doubt.',
	},
	{
		category: 'onboard',
		question: 'Is the Blue Cave ticket included?',
		answer:
			'Cave entry is often billed separately on-site and depends on sea conditions and official opening hours. We show what’s included before you confirm your booking.',
	},
	{
		category: 'onboard',
		question: 'What should I bring?',
		answer:
			'Sunscreen and hat, swimwear and towel, a light jacket, water, and sea-sickness remedy if you’re prone to it. Soft day bags only — limited space on board.',
	},
	{
		category: 'onboard',
		question: 'Are life jackets provided?',
		answer:
			'Yes — all sizes including children’s. A safety briefing is given at the start of every departure.',
	},
	{
		category: 'onboard',
		question: 'Is food and drink provided?',
		answer:
			'Water is available on board. Meals are not included on group tours unless stated — most full-day routes include time to eat ashore.',
	},
	{
		category: 'guests',
		question: 'Can I bring young children?',
		answer:
			'Children are welcome on group tours. Infants 0–3 often travel free; life jackets in children’s sizes are provided. Private charters suit families who want a flexible pace.',
	},
	{
		category: 'guests',
		question: 'Is the tour suitable for non-swimmers?',
		answer:
			'Yes. Swimming stops are optional and life jackets are provided. Let the crew know if anyone in your group prefers to stay on the boat.',
	},
	{
		category: 'guests',
		question: 'Can you cater to food allergies or dietary needs?',
		answer:
			'Meals aren’t included on group tours, so you choose your own food during stops ashore — which makes allergies easy to manage. On private charters with catering, tell us about any allergies or dietary needs in advance and we’ll do our best to accommodate.',
	},
	{
		category: 'guests',
		question: 'What if I get seasick?',
		answer:
			'Open-sea legs can feel lively on windy days. Take remedy before departure, sit near the centre of the boat, and tell the crew — they’ll suggest the calmest spots.',
	},
	{
		category: 'private',
		question: 'Private vs group tours?',
		answer:
			'Group tours follow a fixed timetable; private charters pick timing and pacing within operational limits — see',
		link: { href: '/tours/create-perfect-day-private', label: 'Create your perfect day at sea' },
	},
	{
		category: 'private',
		question: 'Can I choose my own route on a private charter?',
		answer:
			'Yes — within fuel and time limits. Describe your ideal day when you enquire and your skipper will help plan the best possible route.',
		link: { href: '/contact?tour=create-perfect-day-private', label: 'Request a quote' },
	},
	{
		category: 'private',
		question: 'How far in advance should I book a private charter?',
		answer:
			'At least two weeks ahead in July and August; one week is often enough in shoulder season. Last-minute slots sometimes open — contact us directly.',
		link: { href: '/contact', label: 'Contact us' },
	},
];

/** Items per category — useful for FAQ nav counts. */
export function faqCountByCategory(category: FaqCategory): number {
	return FAQ_ITEMS.filter((item) => item.category === category).length;
}
