import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Island payloads (spec §6.2.3): a hydrated island's props are serialised
 * into the page, so the Tours catalog gets slim card DTOs, not the catalog.
 * Checks the built page when a build exists. The budget was 6 KB; it's 7 KB
 * since the optional fee lines and private badges/types joined the cards
 * (tour content update, Oct 2026). The cards are still slim DTOs.
 */
const page = path.resolve(__dirname, '../../dist/tours/index.html');

describe('island payloads', () => {
	it.skipIf(!existsSync(page))('the ToursCatalog island carries at most 7 KB of props', () => {
		const html = readFileSync(page, 'utf8');
		const islands = [...html.matchAll(/<astro-island[^>]*component-url="[^"]*ToursCatalog[^"]*"[^>]*>/g)];
		expect(islands).toHaveLength(1);
		const props = islands[0][0].match(/ props="([^"]*)"/)?.[1] ?? '';
		expect(props.length).toBeGreaterThan(0);
		expect(props.length).toBeLessThanOrEqual(7 * 1024);
	});
});
