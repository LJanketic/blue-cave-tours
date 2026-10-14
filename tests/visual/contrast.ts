import type { Locator, Page } from '@playwright/test';

/*
 * Text-on-photo contrast (spec §6.1.2, §11.9): the text's colour against the
 * LIGHTEST pixel of the photo under its box, with the text hidden. Text
 * shadows are ignored, so this is the worst case.
 */

function luminance([r, g, b]: number[]): number {
	const f = (c: number) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a: number[], b: number[]): number {
	const [la, lb] = [luminance(a), luminance(b)];
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** The lightest pixel (by luma) inside a box of the current page. */
async function lightestPixel(page: Page, box: { x: number; y: number; width: number; height: number }): Promise<number[]> {
	const png = await page.screenshot({ clip: box });
	return page.evaluate(async (data) => {
		const img = new Image();
		img.src = `data:image/png;base64,${data}`;
		await img.decode();
		const canvas = document.createElement('canvas');
		canvas.width = img.width;
		canvas.height = img.height;
		const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
		ctx.drawImage(img, 0, 0);
		const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
		let best = [0, 0, 0];
		let bestLuma = -1;
		for (let i = 0; i < d.length; i += 4) {
			const luma = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
			if (luma > bestLuma) {
				bestLuma = luma;
				best = [d[i], d[i + 1], d[i + 2]];
			}
		}
		return best;
	}, png.toString('base64'));
}

/**
 * Worst-case contrast of white text (at `opacity`) over the photo behind
 * `text`. Hides the text, measures, then shows it again.
 */
export async function photoTextContrast(text: Locator, opacity = 1): Promise<number> {
	const page = text.page();
	const box = await text.boundingBox();
	if (!box) throw new Error('text not visible');
	// Hide the text and let the browser repaint before the screenshot (WebKit can lag a frame).
	await text.evaluate(
		(el) =>
			new Promise<void>((resolve) => {
				el.style.setProperty('visibility', 'hidden');
				requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
			}),
	);
	const bg = await lightestPixel(page, box);
	await text.evaluate((el) => el.style.removeProperty('visibility'));
	const fg = bg.map((c) => opacity * 255 + (1 - opacity) * c);
	return contrastRatio(fg, bg);
}
