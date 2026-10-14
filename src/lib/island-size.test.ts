import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Island payloads (spec §6.2.3): a hydrated island's props are serialised
 * into the page, so the Tours catalog gets slim card DTOs, not the catalog.
 * Checks the built page when a build exists.
 */
const page = path.resolve(__dirname, '../../dist/tours/index.html');

describe('island payloads', () => {
	it.skipIf(!existsSync(page))('the ToursCatalog island carries at most 6 KB of props', () => {
		const html = readFileSync(page, 'utf8');
		const islands = [...html.matchAll(/<astro-island[^>]*component-url="[^"]*ToursCatalog[^"]*"[^>]*>/g)];
		expect(islands).toHaveLength(1);
		const props = islands[0][0].match(/ props="([^"]*)"/)?.[1] ?? '';
		expect(props.length).toBeGreaterThan(0);
		expect(props.length).toBeLessThanOrEqual(6 * 1024);
	});
});
