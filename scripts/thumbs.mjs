#!/usr/bin/env node
// Builds the small tour thumbnails that server-rendered pages show (the booking
// review page and the admin), so the deployed function never resizes an image
// at request time and Astro's on-demand /_image endpoint can stay off.
//
//   node scripts/thumbs.mjs          regenerate public/thumbs/ from the photos
//   node scripts/thumbs.mjs --check  fail if a photo has no thumbnail (rerun it after changing a photo)
//
// One WebP per photo and width: src/assets/destinations/<place>/<nn>.jpg →
// public/thumbs/<place>/<nn>-<width>.webp. Widths match THUMB_WIDTHS in
// src/data/destination-photos.ts.

import { readdir, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const WIDTHS = [128, 256];
const QUALITY = 70;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PHOTOS = path.join(root, 'src/assets/destinations');
const OUT = path.join(root, 'public/thumbs');

async function photos() {
	const out = [];
	for (const place of await readdir(PHOTOS, { withFileTypes: true })) {
		if (!place.isDirectory()) continue;
		for (const file of await readdir(path.join(PHOTOS, place.name))) {
			if (/\.jpe?g$/i.test(file)) out.push({ place: place.name, name: file.replace(/\.jpe?g$/i, ''), source: path.join(PHOTOS, place.name, file) });
		}
	}
	return out;
}

const target = (photo, width) => path.join(OUT, photo.place, `${photo.name}-${width}.webp`);

async function mtime(file) {
	try {
		return (await stat(file)).mtimeMs;
	} catch {
		return null;
	}
}

async function generate() {
	let made = 0;
	for (const photo of await photos()) {
		await mkdir(path.join(OUT, photo.place), { recursive: true });
		const sourceTime = await mtime(photo.source);
		for (const width of WIDTHS) {
			const out = target(photo, width);
			const outTime = await mtime(out);
			if (outTime !== null && outTime >= sourceTime) continue;
			await sharp(photo.source).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(out);
			made++;
		}
	}
	console.log(`thumbs: ${made} written, all photos covered`);
}

async function check() {
	const missing = [];
	for (const photo of await photos()) {
		for (const width of WIDTHS) {
			const outTime = await mtime(target(photo, width));
			if (outTime === null) missing.push(path.relative(root, target(photo, width)));
		}
	}
	if (missing.length) {
		console.error(`thumbs: missing ${missing.join(', ')}. Run: node scripts/thumbs.mjs`);
		process.exit(1);
	}
	console.log('thumbs: every photo has its thumbnails');
}

await (process.argv.includes('--check') ? check() : generate());
