/** Contact page: POST JSON to `/api/contact`, prefill from query string, update status. */
function prefillFromQuery(form: HTMLFormElement): void {
	const params = new URLSearchParams(window.location.search);
	const set = (name: string) => {
		const value = params.get(name);
		if (!value) return;
		const el = form.elements.namedItem(name);
		if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
			el.value = value;
		}
	};
	for (const name of ['name', 'email', 'phone', 'tourSlug', 'message']) {
		set(name);
	}
}

export function initContactForm(): void {
	const form = document.getElementById('contact-form');
	const statusEl = document.getElementById('contact-status');
	if (!(form instanceof HTMLFormElement) || !(statusEl instanceof HTMLElement)) return;

	prefillFromQuery(form);

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		const btn = form.querySelector('button[type="submit"]');
		if (btn instanceof HTMLButtonElement) btn.disabled = true;
		const sending = form.dataset.msgSending ?? 'Sending…';
		const success = form.dataset.msgSuccess ?? 'Thanks — we received your message.';
		const successNoEmail =
			form.dataset.msgSuccessNoEmail ?? 'Thanks — we received your message. (Email not configured.)';
		statusEl.textContent = sending;
		const data = Object.fromEntries(new FormData(form).entries());
		try {
			const res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});
			const json = (await res.json().catch(() => ({}))) as { error?: string; emailed?: boolean };
			if (!res.ok) throw new Error(json.error || 'Failed to send');
			statusEl.textContent = json.emailed ? success : successNoEmail;
			form.reset();
		} catch (err) {
			statusEl.textContent = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			if (btn instanceof HTMLButtonElement) btn.disabled = false;
		}
	});
}
