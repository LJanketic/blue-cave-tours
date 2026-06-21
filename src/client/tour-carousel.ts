document.querySelectorAll('[data-tour-carousel]').forEach((root) => {
	const viewport = root.querySelector('[data-carousel-viewport]');
	const prev = root.querySelector('[data-carousel-prev]');
	const next = root.querySelector('[data-carousel-next]');
	if (!(viewport instanceof HTMLElement)) return;

	const step = () => Math.max(280, viewport.clientWidth * 0.75);

	prev?.addEventListener('click', () => {
		viewport.scrollBy({ left: -step(), behavior: 'smooth' });
	});
	next?.addEventListener('click', () => {
		viewport.scrollBy({ left: step(), behavior: 'smooth' });
	});
});
