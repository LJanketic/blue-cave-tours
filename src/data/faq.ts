export type FaqItem = {
	question: string;
	answer: string;
	link?: { href: string; label: string };
};

export const FAQ_ITEMS: FaqItem[] = [
	{
		question: 'Is the Blue Cave ticket included?',
		answer:
			'Cave entry is often billed separately on-site and depends on sea conditions and official opening hours. We show what’s included before you confirm your booking.',
	},
	{
		question: 'What if the weather is bad?',
		answer:
			'We monitor forecasts. Routes may be shortened, reordered, or rescheduled so the day stays safe and enjoyable.',
	},
	{
		question: 'Private vs group tours?',
		answer:
			'Group tours follow a fixed timetable; private charters pick timing and pacing within operational limits — see',
		link: { href: '/tours/create-perfect-day-private', label: 'Create your perfect day at sea' },
	},
	{
		question: 'Where do we meet?',
		answer:
			'Split’s Riva promenade, stand 14. You’ll receive the exact meeting time and any last-minute updates after booking.',
	},
];
