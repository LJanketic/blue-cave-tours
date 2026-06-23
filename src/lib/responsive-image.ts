import { unsplashDefaultSrc, unsplashSrcSet } from './unsplash';

const LOCAL_WIDTH_SUFFIX = /-(\d+)\.(jpe?g|webp)$/i;

/** Local assets use paired -640 / -1280 files under `/assets/tours/`. */
export function isLocalTourImage(src: string): boolean {
	return src.startsWith('/assets/');
}

function localSrcForWidth(src: string, width: number): string {
	const match = src.match(LOCAL_WIDTH_SUFFIX);
	if (!match) return src;
	const target = width <= 720 ? 640 : 1280;
	return src.replace(LOCAL_WIDTH_SUFFIX, `-${target}.$2`);
}

export function responsiveSrc(src: string, fallbackWidth = 960): string {
	if (isLocalTourImage(src)) return localSrcForWidth(src, fallbackWidth);
	return unsplashDefaultSrc(src, fallbackWidth);
}

export function responsiveSrcSet(src: string, widths: readonly number[]): string {
	if (isLocalTourImage(src)) {
		const seen = new Set<number>();
		const parts: string[] = [];
		for (const w of widths) {
			const bucket = w <= 720 ? 640 : 1280;
			if (seen.has(bucket)) continue;
			seen.add(bucket);
			parts.push(`${localSrcForWidth(src, bucket)} ${bucket}w`);
		}
		return parts.join(', ');
	}
	return unsplashSrcSet(src, widths);
}
