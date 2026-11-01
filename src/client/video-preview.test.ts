import { describe, expect, it } from 'vitest';
import { buttonFromLink } from './video-preview';

/**
 * Vitest runs without a DOM here, so the link and the button are small fakes
 * with just what buttonFromLink touches: attributes, setAttribute, append.
 */
function fakeElement(tag: string, attrs: Record<string, string> = {}, children: unknown[] = []) {
	const attributes = new Map(Object.entries(attrs));
	const childNodes = [...children];
	return {
		tagName: tag.toUpperCase(),
		get attributes() {
			return [...attributes].map(([name, value]) => ({ name, value }));
		},
		childNodes,
		getAttribute: (name: string) => attributes.get(name) ?? null,
		hasAttribute: (name: string) => attributes.has(name),
		setAttribute: (name: string, value: string) => void attributes.set(name, value),
		append: (...nodes: unknown[]) => void childNodes.push(...nodes),
		ownerDocument: { createElement: (t: string) => fakeElement(t) },
	};
}

describe('buttonFromLink', () => {
	const poster = { nodeName: 'PICTURE' };
	const link = fakeElement(
		'a',
		{
			class: 'vp__player',
			href: '/media/fixture.mp4',
			'aria-label': 'Play the tour preview video, 22 seconds, no sound',
			'aria-describedby': 'vp-desc',
			'data-vp-player': '',
			'data-astro-cid-abc123': '',
		},
		[poster],
	);
	const button = buttonFromLink(link as unknown as HTMLAnchorElement) as unknown as ReturnType<typeof fakeElement>;

	it('keeps the scoped-style attribute, so .vp__player styles still apply', () => {
		expect(button.tagName).toBe('BUTTON');
		expect(button.hasAttribute('data-astro-cid-abc123')).toBe(true);
	});

	it('copies class, aria and data attributes but not href', () => {
		expect(button.getAttribute('class')).toBe('vp__player');
		expect(button.getAttribute('aria-label')).toBe('Play the tour preview video, 22 seconds, no sound');
		expect(button.getAttribute('aria-describedby')).toBe('vp-desc');
		expect(button.hasAttribute('data-vp-player')).toBe(true);
		expect(button.hasAttribute('href')).toBe(false);
		expect(button.getAttribute('type')).toBe('button');
	});

	it('moves the poster into the button', () => {
		expect(button.childNodes).toEqual([poster]);
	});
});
