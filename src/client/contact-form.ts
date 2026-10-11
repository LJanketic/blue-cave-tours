import {
	CONTACT_LIMITS,
	HONEYPOT_FIELD,
	trimField,
	validateContactSubmission,
} from '../lib/contact-validation';

/** Minimal surface of the Cloudflare Turnstile widget API we call into. */
type TurnstileApi = {
	getResponse: (widgetId?: string) => string | undefined;
	reset: (widgetId?: string) => void;
};

function getTurnstile(): TurnstileApi | undefined {
	return (window as unknown as { turnstile?: TurnstileApi }).turnstile;
}

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

	// Point screen readers from each invalid field to the status message, and
	// clear the flag as soon as the visitor edits that field.
	function markInvalid(fields: HTMLElement[]) {
		for (const field of fields) {
			field.setAttribute('aria-invalid', 'true');
			field.setAttribute('aria-describedby', 'contact-status');
		}
		fields[0]?.focus();
	}

	function fieldsById(ids: readonly string[] | undefined): HTMLElement[] {
		return (ids ?? [])
			.map((id) => contactForm.querySelector<HTMLElement>(`#${id}`))
			.filter((el): el is HTMLElement => el !== null);
	}

	contactForm.addEventListener('input', (e) => {
		const field = e.target;
		if (field instanceof HTMLElement && field.getAttribute('aria-invalid') === 'true') {
			field.removeAttribute('aria-invalid');
			field.removeAttribute('aria-describedby');
		}
	});

	// aria-disabled rather than disabled while sending: a disabled button drops
	// keyboard focus to <body>.
	let sending = false;

	contactForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (sending) return;
		const btn = contactForm.querySelector('button[type="submit"]');
		sending = true;
		btn?.setAttribute('aria-disabled', 'true');
		statusEl.textContent = 'Sending…';

		// Set once the request is sent: Turnstile tokens are single-use, so only a
		// token the server has seen needs a reset. A local validation failure keeps it.
		let submitted = false;

		try {
			const data = Object.fromEntries(new FormData(contactForm).entries());
			const result = validateContactSubmission({
				name: trimField(data.name, CONTACT_LIMITS.name),
				email: trimField(data.email, CONTACT_LIMITS.email),
				message: trimField(data.message, CONTACT_LIMITS.message),
				phone: trimField(data.phone, CONTACT_LIMITS.phone),
				tourSlug: trimField(data.tourSlug, CONTACT_LIMITS.tourSlug),
				honeypot: trimField(data[HONEYPOT_FIELD], 200),
				startedAt: Number(startedAtEl.value) || null,
			});

			if (!result.ok) {
				statusEl.textContent = result.error;
				markInvalid(fieldsById(result.fields));
				return;
			}

			const turnstileToken = getTurnstile()?.getResponse() ?? '';
			submitted = true;
			const res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...data, turnstileToken }),
			});
			const json = (await res.json().catch(() => ({}))) as { error?: string; fields?: string[] };
			if (!res.ok) {
				// The server re-validates (and checks things the client can't, like the tour).
				markInvalid(fieldsById(json.fields));
				throw new Error(json.error || 'Failed to send');
			}
			statusEl.textContent = 'Thanks — we received your message and will get back to you soon.';
			contactForm.reset();
			startedAtEl.value = String(Date.now());
			applyTourPreselect();
		} catch (err) {
			statusEl.textContent = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			sending = false;
			btn?.removeAttribute('aria-disabled');
			if (submitted) getTurnstile()?.reset();
		}
	});
}
