import type { ImageMetadata } from 'astro';

/** A self-hosted static map behind a MapLink caption. */
export type MapImage = {
	src: ImageMetadata;
	/** Shown on the image, e.g. "© OpenStreetMap contributors" plus the provider: whatever its licence asks for. */
	attribution: string;
};

/** 'contact' is the meeting point on the Contact page; the rest are destination slugs. */
export type MapImageKey = 'contact' | (string & {});

/**
 * Static map images for MapLink (Hvar destination page, Contact). Empty on
 * purpose: decision D7 is open, and there are no licensed images yet. Until a
 * key has an entry, its MapLink is the plain text link it always was.
 *
 * To add one, once its licence is confirmed (never tiles downloaded from
 * tile.openstreetmap.org or Google, and no drawn snapshot passed off as a map):
 *   1. Save the export as src/assets/maps/<key>.jpg (CSP is img-src 'self',
 *      so it must be self-hosted; astro:assets optimises it at build time).
 *   2. `import hvarMap from '../assets/maps/hvar.jpg';`
 *   3. Add `hvar: { src: hvarMap, attribution: '…' }` below.
 */
export const MAP_IMAGES: Partial<Record<MapImageKey, MapImage>> = {};
