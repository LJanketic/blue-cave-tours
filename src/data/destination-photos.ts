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
		'02': 'A hand reaching into glowing blue water',
		'03': 'A quiet bay with a stone house at the water, seen through dry grass',
	},
	'blue-lagoon': {
		'01': 'Aerial view of the Blue Lagoon at Budikovac with anchored boats',
		'02': 'Turquoise shallows and boats in the Blue Lagoon',
		'03': 'Two snorkellers just under the surface of clear green water',
		'04': 'Blue Lagoon swim area from above',
		'05': 'A snorkeller in fins swimming over a sandy seabed',
		'06': 'A swimmer floating on her back in turquoise water, seen from above',
	},
	hvar: {
		'01': 'The main square of Hvar town with the cathedral bell tower',
		'02': 'Palms and an old stone wall above Hvar town and the sea',
		'03': 'An arcaded stone building with a clock tower on a sunny square in Hvar',
		'04': 'Stone alley and café steps in Hvar town',
	},
	pakleni: {
		'01': 'Agaves and palms in a Mediterranean garden',
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
		'04': 'The sun setting over the sea, framed by a window in a rock wall',
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

