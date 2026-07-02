import type { ImageMetadata } from 'astro';
import blueCave from '../assets/tours/blue-cave.jpg';
import blueLagoon from '../assets/tours/blue-lagoon.jpg';
import blueLagoonAlt from '../assets/tours/blue-lagoon-alt.jpg';
import boatSpeed from '../assets/tours/boat-speed.jpg';
import hvar from '../assets/tours/hvar.jpg';
import pakleni from '../assets/tours/pakleni.jpg';
import stiniva from '../assets/tours/stiniva.jpg';

/** Optimized local photos — see docs/TOUR-CATALOG-AND-PHOTOS.md for source mapping. */
export type PhotoRef = {
	src: ImageMetadata;
	alt: string;
	/** Dominant color for card/gallery placeholders (hex). */
	color: string;
};

export const PHOTO = {
	blueCave: {
		src: blueCave,
		alt: 'Sea cave with turquoise water — Blue Cave area',
		color: '#1a5c6e',
	},
	blueLagoon: {
		src: blueLagoon,
		alt: 'Aerial view of Blue Lagoon at Budikovac',
		color: '#3a8fa8',
	},
	blueLagoonAlt: {
		src: blueLagoonAlt,
		alt: 'Turquoise bays and anchored boats near Budikovac',
		color: '#2d7a94',
	},
	hvar: {
		src: hvar,
		alt: 'Hvar town and harbour from the hillside',
		color: '#5a7a8a',
	},
	pakleni: {
		src: pakleni,
		alt: 'Turquoise Adriatic water beneath limestone cliffs',
		color: '#2a8099',
	},
	stiniva: {
		src: stiniva,
		alt: 'Layered cliffs and emerald water at Stiniva',
		color: '#3a6860',
	},
	boatSpeed: {
		src: boatSpeed,
		alt: 'Tour boat entering a sea cave',
		color: '#2a5060',
	},
	/** Same asset as boatSpeed — people-free fleet shot, different alt for luxury cabin tour. */
	boatDeck: {
		src: boatSpeed,
		alt: 'Tour boat at a sea cave entrance',
		color: '#2a5060',
	},
} as const satisfies Record<string, PhotoRef>;

/** Homepage hero — same aerial lagoon as blueLagoon (canonical asset on disk). */
export const HERO_IMAGE: PhotoRef = {
	src: blueLagoon,
	alt: '',
	color: '#3a8fa8',
};

export function galleryFrom(...items: PhotoRef[]): PhotoRef[] {
	return items;
}
