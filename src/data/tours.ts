export type Tour = {
	id: string;
	title: string;
	tagline: string;
	description: string;
	duration: string;
	highlight: string;
	image: { src: string; alt: string };
	/** From price label for display only */
	fromPrice: string;
};

export const tours: Tour[] = [
	{
		id: 'blue-cave-adventure',
		title: 'Blue Cave Adventure',
		tagline: 'A day you’ll never forget',
		description:
			'Step aboard our modern speedboat and discover the Adriatic in the most exciting yet comfortable way. Glide across crystal-clear waters, swim in hidden bays, and visit the iconic Blue Cave.',
		duration: 'Full day · ca. 10h',
		highlight: 'Small groups · Experienced skipper',
		image: {
			src: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
			alt: 'Speedboat on turquoise Adriatic sea near cliffs',
		},
		fromPrice: '€159',
	},
	{
		id: 'private-split-coast',
		title: 'Private Coast & Islands',
		tagline: 'Your route, your pace',
		description:
			'Half-day or full-day private charters tailored to you—perfect for families and groups who want flexibility, premium comfort, and direct communication with your crew.',
		duration: 'Half day · 09:30–14:00 or full day',
		highlight: 'Custom pickup · Predefined messages for private tours',
		image: {
			src: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
			alt: 'Luxury boat deck overlooking the sea',
		},
		fromPrice: 'On request',
	},
	{
		id: 'split-island-hopping',
		title: 'Island Hopping Classic',
		tagline: 'Icons of Dalmatia in one tour',
		description:
			'Visit beloved stops along the Split archipelago with a friendly crew, plenty of swim time, and panoramic views of the islands—ideal if you want the full “postcard” experience.',
		duration: 'Full day',
		highlight: 'Scheduled departures · All boat tours category',
		image: {
			src: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1200&q=80',
			alt: 'Coastal islands and boats in Croatia',
		},
		fromPrice: 'From €139',
	},
];
