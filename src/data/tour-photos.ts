import type { ImageMetadata } from 'astro';

/** Photo registry — placeholders omit `src`; destination galleries include it. */
export type PhotoRef = {
	/** Registry key — matches docs/redesign/04-IMAGE-ASSETS.md */
	id: string;
	alt: string;
	/** Dominant color for placeholder blocks (hex). */
	color: string;
	/** Present on destination-owned assets; omitted for hero placeholders. */
	src?: ImageMetadata;
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
	goldenHorn: {
		id: 'goldenHorn',
		alt: 'Golden Horn Beach on Brač, seen from the water',
		color: '#4a7d6e',
	},
	trogir: {
		id: 'trogir',
		alt: 'Trogir Old Town waterfront',
		color: '#5a6f8a',
	},
	korcula: {
		id: 'korcula',
		alt: 'Korčula Old Town walls from the sea',
		color: '#3a5a78',
	},
	dubrovnik: {
		id: 'dubrovnik',
		alt: 'Dubrovnik city walls and harbour',
		color: '#2a4a68',
	},
} as const satisfies Record<string, PhotoRef>;

export function galleryFrom(...items: PhotoRef[]): PhotoRef[] {
	return items;
}

export type GalleryViewPhoto = {
	color: string;
	alt: string;
	icon: string;
	src?: string;
};

export function toGalleryView(photo: PhotoRef, icon = 'sailboat'): GalleryViewPhoto {
	return {
		color: photo.color,
		alt: photo.alt,
		icon,
		src: photo.src?.src,
	};
}
