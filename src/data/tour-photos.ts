import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';

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
	srcset?: string;
};

type GalleryImageSize = { widths: number[]; sizes: string };

/** Matches ImageGallery.vue's fixed-height boxes (.img-hero / .img-thumb). */
export const GALLERY_HERO_SIZE: GalleryImageSize = {
	widths: [400, 800, 1200],
	sizes: '(max-width: 700px) 100vw, 700px',
};
export const GALLERY_THUMB_SIZE: GalleryImageSize = {
	widths: [80, 160],
	sizes: '80px',
};
/** Matches the tour/destination card grids (ToursCatalog.vue / DestinationsCatalog.vue). */
export const GALLERY_CARD_SIZE: GalleryImageSize = {
	widths: [400, 800],
	sizes: '(max-width: 700px) 88vw, 380px',
};

/** Runs a real photo through Astro's build-time image service (webp, resized, real srcset) instead of shipping the original file as-is. */
export async function toGalleryView(
	photo: PhotoRef,
	icon = 'sailboat',
	imageSize: GalleryImageSize = GALLERY_THUMB_SIZE,
): Promise<GalleryViewPhoto> {
	if (!photo.src) {
		return { color: photo.color, alt: photo.alt, icon };
	}
	const optimized = await getImage({
		src: photo.src,
		widths: imageSize.widths,
		format: 'webp',
		quality: 70,
	});
	return {
		color: photo.color,
		alt: photo.alt,
		icon,
		src: optimized.src,
		srcset: optimized.srcSet.attribute,
	};
}
