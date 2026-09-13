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

/**
 * Quality floor / cost ceiling for every image variant set: a `widths`
 * ladder must include a candidate at or above the largest size that object
 * is ever rendered at across every context it can appear in (never ship
 * something asked to upscale), and every `<img srcset>` built from one of
 * these must carry a matching, hand-written `sizes` attribute reflecting
 * that specific tag's real CSS-rendered width (so the browser fetches the
 * smallest sufficient candidate instead of defaulting to the largest).
 * Generating extra widths is free — build-time only, via Astro's own
 * Sharp-based image service (see astro.config.mjs's `imageCDN: false`) —
 * guessing wrong on either end is not.
 */

/** Matches ImageGallery.vue's fixed-height boxes (.img-hero / .img-thumb). */
export const GALLERY_HERO_SIZE: GalleryImageSize = {
	widths: [400, 800, 1200],
	sizes: '(max-width: 700px) 100vw, 700px',
};
/**
 * Gallery photos (tour.gallery / destination galleries): rendered as an
 * ~160px thumbnail, AND promoted into the ~700px hero box in
 * ImageGallery.vue once clicked (see its `activePhoto` computed) — the
 * ladder must cover both, hence hero-grade widths included here too.
 */
export const GALLERY_PHOTO_SIZE: GalleryImageSize = {
	widths: [80, 160, 400, 800, 1200],
	sizes: '80px', // unused directly — sizes is hardcoded per <img> instead, since the same photo renders in two different boxes depending on template
};
/** Matches the tour/destination card grids (ToursCatalog.vue / DestinationsCatalog.vue). */
export const GALLERY_CARD_SIZE: GalleryImageSize = {
	widths: [400, 800],
	sizes: '(max-width: 700px) 88vw, 380px',
};

/**
 * Runs a real photo through Astro's build-time image service (webp, resized, real srcset)
 * instead of shipping the original file as-is. `imageSize` has no default on purpose: every
 * call site must pick the ladder that matches where the result is actually rendered (see the
 * quality-floor/cost-ceiling rule above `GalleryImageSize`) rather than silently inheriting
 * whichever constant happened to be the default.
 */
export async function toGalleryView(
	photo: PhotoRef,
	icon: string,
	imageSize: GalleryImageSize,
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
