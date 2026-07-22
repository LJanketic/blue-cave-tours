import type { ImageMetadata } from 'astro';
import heroBanner from '../assets/hero-banner.jpg';

/** Homepage banner — hardcoded aerial motorboat shot. */
export const HERO_IMAGE = {
	src: heroBanner,
	alt: 'High-angle aerial view of a white luxury motorboat with a wooden deck sailing on deep blue, clear ocean water.',
	color: '#0a3a6e',
} as const satisfies {
	src: ImageMetadata;
	alt: string;
	color: string;
};
