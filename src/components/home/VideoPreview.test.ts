import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import poster from '../../assets/destinations/blue-lagoon/01.jpg';
import VideoPreview from './VideoPreview.astro';

/**
 * Renders the component with a fixture (no real footage exists yet; this path
 * is never served). Checks the no-JS markup: the poster links to the MP4, and
 * the <video> waits inert in a template with preload="none".
 */
const fixture = {
	src: '/media/fixture.mp4',
	poster,
	durationSeconds: 22,
	description: 'Fixture description of the footage.',
};

describe('VideoPreview', () => {
	it('renders the section, the poster link and the inert video', async () => {
		const container = await AstroContainer.create();
		const html = await container.renderToString(VideoPreview, { props: { video: fixture, bandImage: poster } });

		expect(html).toMatch(/<section[^>]*class="vp[^"]*"[^>]*aria-labelledby="vp-title"/);
		expect(html).toContain('id="vp-title"');
		expect(html).toMatch(/<div class="vp__band" aria-hidden="true"[^>]*>\s*<picture/);
		expect(html).toContain('Preview from our tours');
		expect(html).toContain('Experience it first-hand');
		expect(html).toMatch(/<a[^>]*href="\/media\/fixture\.mp4"[^>]*aria-label="Play the tour preview video, 22 seconds, no sound"/);
		expect(html).toContain('0:22 · A day on the water');
		expect(html).toMatch(/<p[^>]*id="vp-desc"[^>]*>Fixture description of the footage\.<\/p>/);

		const template = html.match(/<template data-vp-video[^>]*>([\s\S]*?)<\/template>/)?.[1] ?? '';
		expect(template).toMatch(/<video[^>]*src="\/media\/fixture\.mp4"/);
		expect(template).toContain('preload="none"');
		expect(template).toContain('playsinline');
		expect(template).toContain('controls');
		expect(template).toContain('aria-describedby="vp-desc"');
		expect(template).toContain('aria-label="Tour preview video"');
		// No <video> outside the template: nothing loads before the click.
		expect(html.replace(/<!--[\s\S]*?-->/g, '').replace(/<template[\s\S]*?<\/template>/, '')).not.toContain('<video');
	});

	it('refuses a video that is not self-hosted', async () => {
		const container = await AstroContainer.create();
		await expect(
			container.renderToString(VideoPreview, { props: { video: { ...fixture, src: 'https://example.com/a.mp4' } } }),
		).rejects.toThrow(/media/);
	});
});
