import { describe, expect, it } from 'vitest';
import { getDestinationBySlug } from './destinations';
import { DEFAULT_OG_IMAGE, breadcrumbJsonLd, destinationJsonLd, socialImageFor } from './seo';

const SITE = 'https://hello-blue-cave.netlify.app';

describe('destinationJsonLd', () => {
	it('describes the destination with its trailing-slash URL', () => {
		const vis = getDestinationBySlug('vis');
		expect(vis).toBeDefined();
		const ld = destinationJsonLd(vis!, `${SITE}/`);
		expect(ld['@type']).toBe('TouristDestination');
		expect(ld.url).toBe(`${SITE}/destinations/vis/`);
	});
});

describe('breadcrumbJsonLd', () => {
	it('numbers items from 1', () => {
		const ld = breadcrumbJsonLd([
			{ name: 'Home', url: `${SITE}/` },
			{ name: 'Tours', url: `${SITE}/tours/` },
		]);
		expect(ld.itemListElement.map((item) => item.position)).toEqual([1, 2]);
	});
});

describe('socialImageFor', () => {
	it('falls back to the default JPG for placeholder photos', async () => {
		expect(DEFAULT_OG_IMAGE).toMatch(/\.jpg$/);
		await expect(socialImageFor({ id: 'x', alt: 'x', color: '#000' })).resolves.toEqual({ src: DEFAULT_OG_IMAGE });
	});
});
