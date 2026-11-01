import { describe, expect, it } from 'vitest';
import { HOME_VIDEO } from '../config/video';
import { assertHomeVideo, formatVideoDuration, spokenVideoDuration, videoMetaText, videoPlayLabel } from './video-preview';

describe('video preview labels (spec §6.1.4)', () => {
	it('formats the on-screen duration as m:ss', () => {
		expect(formatVideoDuration(22)).toBe('0:22');
		expect(formatVideoDuration(5)).toBe('0:05');
		expect(formatVideoDuration(65)).toBe('1:05');
	});

	it('reads the duration out in words', () => {
		expect(spokenVideoDuration(22)).toBe('22 seconds');
		expect(spokenVideoDuration(1)).toBe('1 second');
		expect(spokenVideoDuration(60)).toBe('1 minute');
		expect(spokenVideoDuration(125)).toBe('2 minutes 5 seconds');
	});

	it('names the play button and the meta line as on the board', () => {
		expect(videoPlayLabel(22)).toBe('Play the tour preview video, 22 seconds, no sound');
		expect(videoMetaText(22)).toBe('0:22 · A day on the water');
	});

	it('rejects a duration that is not a whole positive number of seconds', () => {
		for (const bad of [0, -3, 2.5, Number.NaN]) expect(() => formatVideoDuration(bad)).toThrow();
	});

	it('only accepts a self-hosted MP4 under /media/ with a description', () => {
		const ok = { src: '/media/home-preview.mp4', durationSeconds: 22, description: 'The boat leaves Hvar.' };
		expect(() => assertHomeVideo(ok)).not.toThrow();
		expect(() => assertHomeVideo({ ...ok, src: 'https://cdn.example.com/a.mp4' })).toThrow(/media/);
		expect(() => assertHomeVideo({ ...ok, src: '/media/clip.webm' })).toThrow(/MP4/);
		expect(() => assertHomeVideo({ ...ok, description: '  ' })).toThrow(/description/);
	});

	it('HOME_VIDEO stays off until the operator supplies footage and rights (D-6, C-17), or is valid', () => {
		if (HOME_VIDEO === null) expect(HOME_VIDEO).toBeNull();
		else expect(() => assertHomeVideo(HOME_VIDEO!)).not.toThrow();
	});
});
