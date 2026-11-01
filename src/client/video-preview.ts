/**
 * Homepage video preview (spec §6.1.4, §3.4). The server renders the poster as
 * a link to the MP4, so it works without JavaScript. Here it becomes a button;
 * a click swaps in the <video> from the inert template (preload="none": nothing
 * is fetched until then), starts it and moves focus to it.
 */

/**
 * The button that replaces the no-JS link. Every attribute but href is copied:
 * class and aria-* as well as Astro's scoped-style attribute (data-astro-cid-*),
 * without which none of the `.vp__player` styles match after the swap.
 */
export function buttonFromLink(link: HTMLAnchorElement): HTMLButtonElement {
	const button = link.ownerDocument.createElement('button');
	for (const { name, value } of Array.from(link.attributes)) {
		if (name !== 'href') button.setAttribute(name, value);
	}
	button.setAttribute('type', 'button');
	button.append(...Array.from(link.childNodes));
	return button;
}

export function initVideoPreviews(root: ParentNode = document): void {
	for (const section of root.querySelectorAll<HTMLElement>('[data-video-preview]')) {
		const link = section.querySelector<HTMLAnchorElement>('a[data-vp-player]');
		const template = section.querySelector<HTMLTemplateElement>('template[data-vp-video]');
		if (!link || !template) continue;

		const button = buttonFromLink(link);
		link.replaceWith(button);

		button.addEventListener(
			'click',
			() => {
				const video = template.content.querySelector('video')?.cloneNode(true);
				if (!(video instanceof HTMLVideoElement)) return;
				button.replaceWith(video);
				// Autoplay can still be refused; the controls are there either way.
				video.play().catch(() => {});
				video.focus();
				// Safari doesn't focus a <video> without a tabindex.
				if (document.activeElement !== video) {
					video.tabIndex = 0;
					video.focus();
				}
			},
			{ once: true },
		);
	}
}

if (typeof document !== 'undefined') initVideoPreviews();
