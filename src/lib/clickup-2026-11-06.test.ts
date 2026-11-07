import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CANCELLATION_WEATHER, WEATHER_UPDATE_NOTE } from '../config/cancellation';
import { HERO_SLIDES } from '../data/marketing';
import { PRIVATE_PICKUPS } from '../config/private';
import { MAX_GUESTS } from './booking';

/* ClickUp Team Board, 6 Nov 2026 (afternoon): weather line, hero texts, pick-up labels. */

describe('Weather update', () => {
	it("is Mare's sentence, on the success page and in the confirmation email", () => {
		expect(WEATHER_UPDATE_NOTE).toBe("We'll contact you before departure if conditions change. If cancelled, you get a full refund or free rescheduling.");
		expect(readFileSync('src/pages/booking/success.astro', 'utf8')).toContain('<strong>Weather update.</strong> {WEATHER_UPDATE_NOTE}');
		expect(readFileSync('src/lib/email/templates.ts', 'utf8')).toContain('const weatherNote = WEATHER_UPDATE_NOTE;');
	});

	it('leaves the full policy, with its figures, for the FAQ and the legal page', () => {
		expect(CANCELLATION_WEATHER).toContain('at least 4 hours before departure');
	});
});

describe('Hero banner texts', () => {
	it('keeps slide 1, gives slide 2 the private-boat line and makes slide 3 "Lounge, cruise & relax"', () => {
		expect(HERO_SLIDES.map((s) => s.titleLines.join(' '))).toEqual(['Hello Blue Cave Croatia', 'Escape in style & comfort', 'Lounge, cruise & relax']);
		expect(HERO_SLIDES[1].sub).toBe(`Private boat tours from Split for up to ${MAX_GUESTS} people. Your route, your pace — the Blue Cave, Hvar or a quiet bay.`);
		expect(HERO_SLIDES[2].sub).toBe('Swim in crystal-clear waters, visit hidden bays and enjoy the ultimate island getaway.');
	});
});

describe('Pick-up labels', () => {
	it("match Ivan's list word for word", () => {
		expect(PRIVATE_PICKUPS.map((p) => p.label)).toEqual([
			'Riva Waterfront (Stand 14), Split',
			'Zenta Marina, Split',
			'Radisson Blu Hotel, Split',
			'Le Méridien Lav Hotel, Podstrana',
			'Hotel San Antonio, Podstrana',
			'Old Town Waterfront, Trogir',
			'Stomorska Waterfront, Šolta Island',
			'Sutivan Waterfront, Brač Island',
			'Milna Marina, Brač Island',
			'Hvar Town Waterfront, Hvar Island',
		]);
	});
});
