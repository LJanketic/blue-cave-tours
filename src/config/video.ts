import type { ImageMetadata } from 'astro';

/**
 * The homepage tour preview video (spec §6.1.4, §3.4, D-6; ClickUp C6).
 *
 * Stays `null` until the operator supplies the footage AND confirms we have the
 * rights to use it (D-6, C-17). While it's null the homepage renders no video
 * section at all. Don't fill it with a stock or placeholder clip.
 *
 * When the footage arrives:
 * - The MP4 goes in `public/media/` (served as `/media/…`): H.264, 720p,
 *   ≤ 2 MB, audio track stripped at encode time, so it counts as video-only
 *   (§11.11). For example:
 *   `ffmpeg -i in.mov -an -c:v libx264 -profile:v high -crf 28 -preset slow -vf scale=-2:720 -movflags +faststart public/media/home-preview.mp4`
 * - The poster (a still from the clip) goes in `src/assets/site/` and is
 *   imported here, so astro:assets resizes it.
 * - `description` is one sentence saying what the footage shows (§11.11): it
 *   is the text alternative for a silent video.
 *
 * Example:
 *   import poster from '../assets/site/home-preview-poster.jpg';
 *   export const HOME_VIDEO: HomeVideo | null = {
 *     src: '/media/home-preview.mp4',
 *     poster,
 *     durationSeconds: 22,
 *     description: 'The boat leaves Hvar town, …',
 *   };
 */
export type HomeVideo = {
	/** Public path of the MP4, under /media/. */
	src: string;
	/** Poster still, imported from src/assets. */
	poster: ImageMetadata;
	/** Whole seconds; shown as "0:22" and read as "22 seconds". */
	durationSeconds: number;
	/** One sentence describing the footage (#vp-desc). */
	description: string;
};

export const HOME_VIDEO: HomeVideo | null = null;
