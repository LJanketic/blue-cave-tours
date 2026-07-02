import {
	HONEYPOT_FIELD,
	trimField,
	validateContactSubmission,
} from '../lib/contact-validation';

/** Contact page: POST JSON to `/api/contact`, update status, reset on success. */
export function initContactForm(): void {
	const form = document.getElementById('contact-form');
	const statusEl = document.getElementById('contact-status');
	const startedAtEl = document.getElementById('contact-started-at');
	if (!(form instanceof HTMLFormElement) || !(statusEl instanceof HTMLElement)) return;
	if (!(startedAtEl instanceof HTMLInputElement)) return;

	const contactForm = form;
	startedAtEl.value = String(Date.now());

	const params = new URLSearchParams(window.location.search);
	const tourFromUrl = params.get('tour');

	function applyTourPreselect() {
		if (!tourFromUrl) return;
		const select = contactForm.querySelector('#tourSlug');
		if (select instanceof HTMLSelectElement && [...select.options].some((o) => o.value === tourFromUrl)) {
			select.value = tourFromUrl;
		}
	}

	applyTourPreselect();

	contactForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		const btn = contactForm.querySelector('button[type="submit"]');
		if (btn instanceof HTMLButtonElement) btn.disabled = true;
		statusEl.textContent = 'Sending…';

		const data = Object.fromEntries(new FormData(contactForm).entries());
		const result = validateContactSubmission({
			name: trimField(data.name, 200),
			email: trimField(data.email, 254),
			message: trimField(data.message, 5000),
			phone: trimField(data.phone, 30),
			tourSlug: trimField(data.tourSlug, 80),
			honeypot: trimField(data[HONEYPOT_FIELD], 200),
			startedAt: Number(startedAtEl.value) || null,
		});

		if (!result.ok) {
			statusEl.textContent = result.error;
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
			contactForm.reset();
			startedAtEl.value = String(Date.now());
			applyTourPreselect();
		} catch (err) {
			statusEl.textContent = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			if (btn instanceof HTMLButtonElement) btn.disabled = false;
		}
	});
}
