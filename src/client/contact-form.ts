/** Contact page: POST JSON to `/api/contact`, update status, reset on success. */
export function initContactForm(): void {
	const form = document.getElementById('contact-form');
	const statusEl = document.getElementById('contact-status');
	if (!(form instanceof HTMLFormElement) || !(statusEl instanceof HTMLElement)) return;

	const params = new URLSearchParams(window.location.search);
	const tourFromUrl = params.get('tour');

	function applyTourPreselect() {
		if (!tourFromUrl) return;
		const select = form.querySelector('#tourSlug');
		if (select instanceof HTMLSelectElement && [...select.options].some((o) => o.value === tourFromUrl)) {
			select.value = tourFromUrl;
		}
	}

	applyTourPreselect();

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		const btn = form.querySelector('button[type="submit"]');
		if (btn instanceof HTMLButtonElement) btn.disabled = true;
		statusEl.textContent = 'Sending…';

		const data = Object.fromEntries(new FormData(form).entries());
		const name = String(data.name ?? '').trim();
		const email = String(data.email ?? '').trim();
		const message = String(data.message ?? '').trim();

		if (!name || !email || !message) {
			statusEl.textContent = 'Please fill in name, email, and message.';
			if (btn instanceof HTMLButtonElement) btn.disabled = false;
			return;
		}

		try {
			const res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});
			const json = (await res.json().catch(() => ({}))) as { error?: string };
			if (!res.ok) throw new Error(json.error || 'Failed to send');
			statusEl.textContent = 'Thanks — we received your message and will get back to you soon.';
			form.reset();
			applyTourPreselect();
		} catch (err) {
			statusEl.textContent = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			if (btn instanceof HTMLButtonElement) btn.disabled = false;
		}
	});
}
