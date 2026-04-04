/**
 * Unsplash image CDN helpers — responsive widths + consistent compression for Lighthouse.
 */
export function unsplashUrl(src: string, width: number, quality = 65): string {
	try {
		const u = new URL(src);
		u.searchParams.set('auto', 'format');
		u.searchParams.set('fit', 'crop');
		u.searchParams.set('w', String(width));
		u.searchParams.set('q', String(quality));
		return u.href;
	} catch {
		return src;
	}
}

export function unsplashSrcSet(src: string, widths: readonly number[], quality = 65): string {
	return widths.map((w) => `${unsplashUrl(src, w, quality)} ${w}w`).join(', ');
}

/** Default `src` for LCP / fallback: middle of common range */
export function unsplashDefaultSrc(src: string, fallbackWidth = 960, quality = 65): string {
	return unsplashUrl(src, fallbackWidth, quality);
}
