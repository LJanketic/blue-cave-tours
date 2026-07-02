/** Phase 1 — placeholder registry. Photo IDs map to colors for design placeholders; swap src in phase 2. */
export type PhotoRef = {
	/** Registry key — matches docs/redesign/04-IMAGE-ASSETS.md */
	id: string;
	alt: string;
	/** Dominant color for placeholder blocks (hex). */
	color: string;
};

export const PHOTO = {
	blueCave: {
		id: 'blueCave',
		alt: 'Sea cave with turquoise water — Blue Cave area',
		color: '#1a5c6e',
	},
	blueLagoon: {
		id: 'blueLagoon',
		alt: 'Aerial view of Blue Lagoon at Budikovac',
		color: '#3a8fa8',
	},
	blueLagoonAlt: {
		id: 'blueLagoonAlt',
		alt: 'Turquoise bays and anchored boats near Budikovac',
		color: '#2d7a94',
	},
	hvar: {
		id: 'hvar',
		alt: 'Hvar town and harbour from the hillside',
		color: '#5a7a8a',
	},
	pakleni: {
		id: 'pakleni',
		alt: 'Turquoise Adriatic water beneath limestone cliffs',
		color: '#2a8099',
	},
	stiniva: {
		id: 'stiniva',
		alt: 'Layered cliffs and emerald water at Stiniva',
		color: '#3a6860',
	},
	boatSpeed: {
		id: 'boatSpeed',
		alt: 'Tour boat entering a sea cave',
		color: '#2a5060',
	},
	boatDeck: {
		id: 'boatDeck',
		alt: 'Tour boat at a sea cave entrance',
		color: '#2a5060',
	},
} as const satisfies Record<string, PhotoRef>;

export const HERO_IMAGE: PhotoRef = {
	id: 'blueLagoon',
	alt: 'Blue Lagoon aerial view',
	color: '#3a8fa8',
};

export function galleryFrom(...items: PhotoRef[]): PhotoRef[] {
	return items;
}
