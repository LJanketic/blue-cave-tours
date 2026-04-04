/**
 * Delegated submit handler for `.checkout-form` — POST `/api/create-checkout-session`, then redirect.
 * Loaded once per page via SiteLayout.
 */
document.addEventListener('submit', async (e) => {
	const form = e.target;
	if (!(form instanceof HTMLFormElement) || !form.classList.contains('checkout-form')) return;
	e.preventDefault();
	const tourId = form.getAttribute('data-tour-id');
	const btn = form.querySelector('button[type="submit"]');
	if (!tourId || !(btn instanceof HTMLButtonElement)) return;
	btn.disabled = true;
	try {
		const res = await fetch('/api/create-checkout-session', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ tourId }),
		});
		const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
		if (!res.ok) throw new Error(data.error || 'Could not start checkout');
		if (data.url) window.location.href = data.url;
		else throw new Error('No checkout URL returned');
	} catch (err) {
		alert(err instanceof Error ? err.message : 'Something went wrong');
	} finally {
		btn.disabled = false;
	}
});
