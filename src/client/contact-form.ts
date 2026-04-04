/** Contact page: POST JSON to `/api/contact`, update status, reset on success. */
export function initContactForm(): void {
	const form = document.getElementById('contact-form');
	const statusEl = document.getElementById('contact-status');
	if (!(form instanceof HTMLFormElement) || !(statusEl instanceof HTMLElement)) return;

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		const btn = form.querySelector('button[type="submit"]');
		if (btn instanceof HTMLButtonElement) btn.disabled = true;
		statusEl.textContent = 'Sending…';
		const data = Object.fromEntries(new FormData(form).entries());
		try {
			const res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});
			const json = (await res.json().catch(() => ({}))) as { error?: string };
			if (!res.ok) throw new Error(json.error || 'Failed to send');
			statusEl.textContent = 'Thanks — we received your message.';
			form.reset();
		} catch (err) {
			statusEl.textContent = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			if (btn instanceof HTMLButtonElement) btn.disabled = false;
		}
	});
}
