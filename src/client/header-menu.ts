const header = document.getElementById('site-header');
const btn = document.getElementById('menu-toggle');
const nav = document.getElementById('primary-nav');

if (header instanceof HTMLElement && btn instanceof HTMLButtonElement && nav instanceof HTMLElement) {
	const mq = window.matchMedia('(min-width: 769px)');

	const syncAria = () => {
		if (mq.matches) {
			nav.removeAttribute('aria-hidden');
			nav.removeAttribute('inert');
		} else {
			const open = header.classList.contains('header--open');
			nav.setAttribute('aria-hidden', String(!open));
			if (open) nav.removeAttribute('inert');
			else nav.setAttribute('inert', '');
		}
	};

	const openLabel = btn.dataset.labelOpen ?? 'Open menu';
	const closeLabel = btn.dataset.labelClose ?? 'Close menu';

	const setOpen = (open: boolean) => {
		header.classList.toggle('header--open', open);
		btn.setAttribute('aria-expanded', String(open));
		document.body.style.overflow = open ? 'hidden' : '';
		btn.setAttribute('aria-label', open ? closeLabel : openLabel);
		syncAria();
	};

	btn.addEventListener('click', () => setOpen(!header.classList.contains('header--open')));
	nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && header.classList.contains('header--open')) setOpen(false);
	});
	mq.addEventListener('change', () => {
		if (mq.matches) {
			header.classList.remove('header--open');
			btn.setAttribute('aria-expanded', 'false');
			document.body.style.overflow = '';
			nav.removeAttribute('inert');
		}
		syncAria();
	});

	syncAria();
	btn.setAttribute('aria-label', openLabel);
}
