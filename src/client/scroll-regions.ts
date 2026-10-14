/**
 * Rows that scroll sideways only on narrow screens (`data-scroll-region="Label"`)
 * become keyboard-scrollable labelled regions while they overflow (WCAG 2.1.1,
 * spec §11.13), and plain blocks otherwise, so wide screens get no empty tab stop.
 */
for (const el of document.querySelectorAll<HTMLElement>('[data-scroll-region]')) {
	const sync = () => {
		if (el.scrollWidth > el.clientWidth) {
			el.tabIndex = 0;
			el.setAttribute('role', 'region');
			el.setAttribute('aria-label', el.dataset.scrollRegion ?? '');
		} else {
			el.removeAttribute('tabindex');
			el.removeAttribute('role');
			el.removeAttribute('aria-label');
		}
	};
	sync();
	new ResizeObserver(sync).observe(el);
}
