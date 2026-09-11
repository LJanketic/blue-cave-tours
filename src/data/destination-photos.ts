import type { ImageMetadata } from 'astro';
import type { PhotoRef } from './tour-photos';

const files = import.meta.glob<{ default: ImageMetadata }>(
	'../assets/destinations/**/*.jpg',
	{ eager: true },
);

const DEST_COLOR: Record<string, string> = {
	'blue-cave': '#1a5c6e',
	'blue-lagoon': '#3a8fa8',
	hvar: '#5a7a8a',
	pakleni: '#2a8099',
	vis: '#3a6860',
};

const DEST_ALTS: Record<string, Record<string, string>> = {
	'blue-cave': {
		'01': 'Inside the Blue Cave on Biševo — a small boat on glowing turquoise water',
		'02': 'Blue Cave chamber and limestone walls on Biševo',
		'03': 'Coastal bay near the Blue Cave with a stone house at the water',
	},
	'blue-lagoon': {
		'01': 'Aerial view of the Blue Lagoon at Budikovac with anchored boats',
		'02': 'Turquoise shallows and boats in the Blue Lagoon',
		'03': 'Wide aerial of the Blue Lagoon and surrounding islets',
		'04': 'Blue Lagoon swim area from above',
		'05': 'Clear water and shoreline at the Blue Lagoon',
		'06': 'Boats at anchor in the Blue Lagoon',
	},
	hvar: {
		'01': 'Hvar town and harbour from above',
		'02': 'Hvar waterfront and terracotta rooftops',
		'03': 'Hvar island coast and harbour approach',
		'04': 'Stone alley and café steps in Hvar town',
	},
	pakleni: {
		'01': 'Turquoise bay in the Pakleni islands',
		'02': 'Pakleni coastline and pine-covered hills',
		'03': 'Rocky cove in the Pakleni archipelago',
		'04': 'Clear water off the Pakleni islands',
		'05': 'Pakleni swim stop with limestone shore',
		'06': 'Anchorage among the Pakleni islands',
		'07': 'Pakleni islands from the water',
	},
	vis: {
		'01': 'Stiniva Cove on Vis — cliffs around a narrow pebble beach',
		'02': 'Stiniva Bay from the cliffs on Vis',
		'03': 'White pebble beach at Stiniva, Vis',
		'04': 'Komiža harbour on Vis island',
		'05': 'Komiža waterfront and fishing boats',
		'06': 'Komiža town on the Vis coast',
		'07': 'Komiža bay and hillside houses',
		'08': 'Komiža harbour in evening light',
	},
};

function fileName(path: string): string {
	return path.split('/').pop()?.replace(/\.jpg$/i, '') ?? path;
}

function destSlugFromPath(path: string): string {
	const parts = path.split('/');
	const destIndex = parts.lastIndexOf('destinations');
	return parts[destIndex + 1] ?? '';
}

function photosBySlug(): Record<string, PhotoRef[]> {
	const grouped: Record<string, PhotoRef[]> = {};

	for (const [path, mod] of Object.entries(files)) {
		const slug = destSlugFromPath(path);
		const name = fileName(path);
		if (!slug) continue;
		const photo: PhotoRef = {
			id: `${slug}-${name}`,
			alt: DEST_ALTS[slug]?.[name] ?? `${slug} — ${name}`,
			color: DEST_COLOR[slug] ?? '#2a5060',
			src: mod.default,
		};
		(grouped[slug] ??= []).push(photo);
	}

	for (const list of Object.values(grouped)) {
		list.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
	}

	return grouped;
}

const GALLERIES = photosBySlug();

export function galleryForDestination(slug: string): PhotoRef[] {
	return GALLERIES[slug] ?? [];
}

export function firstPhotoForDestination(slug: string, index = 0): PhotoRef | undefined {
	return galleryForDestination(slug)[index];
}

/** One photo per destination, in order — used as tour galleries. */
export function galleryFromDestinations(...slugs: string[]): PhotoRef[] {
	const photos: PhotoRef[] = [];
	for (const slug of slugs) {
		const photo = firstPhotoForDestination(slug);
		if (photo) photos.push(photo);
	}
	return photos;
}

export function photoUrl(photo: PhotoRef | undefined): string | undefined {
	return photo?.src?.src;
}
