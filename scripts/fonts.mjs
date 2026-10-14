#!/usr/bin/env node
// Builds the self-hosted display face (spec §3.3): a woff2 subset with Basic
// Latin, Latin-1 and Latin Extended-A (Croatian č ć đ š ž), plus the
// typographic punctuation the copy uses. Ligatures and kerning are kept.
//
//   node scripts/fonts.mjs    regenerate (needs network)
//
// The face is Anton (SIL OFL 1.1) until the agency confirms that Glorich may
// be embedded on the web (decision D-4). To switch: point SOURCE at the
// Glorich Bold file (git show eeef9ff:public/fonts/glorich/Glorich-Bold.ttf),
// swap LICENSE, and rerun. Nothing else changes: CSS only knows the family
// name "Display".

import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Pinned to a commit of github.com/google/fonts, so a rerun gives the same file.
const GOOGLE_FONTS = 'https://raw.githubusercontent.com/google/fonts/e0a8124cf36bb7c32ca68e5d46d6acdbc3df866a/ofl/anton';
const SOURCE = `${GOOGLE_FONTS}/Anton-Regular.ttf`;
const LICENSE = `${GOOGLE_FONTS}/OFL.txt`;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Lives under src/ so Vite fingerprints it into /_astro/ (cached immutably by netlify.toml).
const FONT_OUT = path.join(root, 'src/assets/fonts/display-700.woff2');
const LICENSE_OUT = path.join(root, 'src/assets/fonts/LICENSE-display.txt');

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const CODEPOINTS = [
	...range(0x20, 0x7e), // Basic Latin
	...range(0xa0, 0xff), // Latin-1 Supplement
	...range(0x100, 0x17f), // Latin Extended-A
	0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2026, 0x20ac, // – — ‘ ’ “ ” • … €
];
/** Without these, Croatian names would fall back to the sans mid-word. */
const REQUIRED = [...'čćđšžČĆĐŠŽ'].map((c) => c.codePointAt(0));

async function download(url) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`${url}: ${res.status}`);
	return Buffer.from(await res.arrayBuffer());
}

/** The codepoints a font file maps, read with the harfbuzz build subset-font ships. */
async function coverage(font) {
	const require = createRequire(createRequire(import.meta.url).resolve('subset-font'));
	const { Blob, Face } = await import(pathToFileURL(require.resolve('harfbuzzjs')).href);
	return new Set(new Face(new Blob(font), 0).collectUnicodes());
}

const { default: subsetFont } = await import('subset-font');
const [source, license] = await Promise.all([download(SOURCE), download(LICENSE)]);

const available = await coverage(source);
const missingRequired = REQUIRED.filter((cp) => !available.has(cp));
if (missingRequired.length) {
	throw new Error(`The display face lacks ${String.fromCodePoint(...missingRequired)}: Croatian names would fall back to the sans.`);
}
const text = String.fromCodePoint(...CODEPOINTS.filter((cp) => available.has(cp)));
const skipped = CODEPOINTS.filter((cp) => !available.has(cp));

const subset = await subsetFont(source, text, {
	targetFormat: 'woff2',
	preserveNameIds: [0, 1, 2, 13, 14], // copyright, family, style, licence text and URL
});

await mkdir(path.dirname(FONT_OUT), { recursive: true });
await writeFile(FONT_OUT, subset);
await writeFile(LICENSE_OUT, `Display face: ${path.basename(SOURCE)}, subset by scripts/fonts.mjs.\n\n${license}`);
console.log(`fonts: ${subset.length} bytes → ${path.relative(root, FONT_OUT)}` + (skipped.length ? ` (not in the face: ${String.fromCodePoint(...skipped)})` : ''));
