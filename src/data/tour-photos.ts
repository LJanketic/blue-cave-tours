/** Optimized local photos — see docs/TOUR-CATALOG-AND-PHOTOS.md for source mapping. */
export const PHOTO = {
	blueCave: {
		src: '/assets/tours/blue-cave-1280.jpg',
		alt: 'Sea cave with turquoise water — Blue Cave area',
	},
	blueLagoon: {
		src: '/assets/tours/blue-lagoon-1280.jpg',
		alt: 'Aerial view of Blue Lagoon at Budikovac',
	},
	blueLagoonAlt: {
		src: '/assets/tours/blue-lagoon-alt-1280.jpg',
		alt: 'Turquoise bays and anchored boats near Budikovac',
	},
	hvar: {
		src: '/assets/tours/hvar-1280.jpg',
		alt: 'Hvar town and harbour from the hillside',
	},
	pakleni: {
		src: '/assets/tours/pakleni-1280.jpg',
		alt: 'Turquoise Adriatic water beneath limestone cliffs',
	},
	stiniva: {
		src: '/assets/tours/stiniva-1280.jpg',
		alt: 'Layered cliffs and emerald water at Stiniva',
	},
	boatSpeed: {
		src: '/assets/tours/boat-speed-1280.jpg',
		alt: 'Tour boat entering a sea cave',
	},
	boatDeck: {
		src: '/assets/tours/boat-deck-1280.jpg',
		alt: 'Tour boat at a sea cave entrance',
	},
} as const;

export type PhotoRef = (typeof PHOTO)[keyof typeof PHOTO];

export function galleryFrom(...items: PhotoRef[]): { src: string; alt: string }[] {
	return items.map(({ src, alt }) => ({ src, alt }));
}
