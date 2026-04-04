/** Hero background (Unsplash) — shared by `Hero.astro` and home LCP `<link rel="preload">`. */
export const HERO_IMAGE_SRC =
	'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1920&q=80';

/** Max width in srcset — cap avoids ~260 KiB pulls on very wide viewports (Lighthouse image audit). */
export const HERO_SRCSET_WIDTHS = [640, 960, 1280, 1600] as const;
