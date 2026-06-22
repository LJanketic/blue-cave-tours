/** Instant book — redirects to confirmation page (preview flow; payment integration later). */
document.addEventListener('submit', (e) => {
	const form = e.target;
	if (!(form instanceof HTMLFormElement) || !form.classList.contains('booking-form')) return;
	e.preventDefault();
	const tourId = form.getAttribute('data-tour-id');
	if (!tourId) return;

	const url = new URL('/booking/success', window.location.origin);
	url.searchParams.set('tourId', tourId);
	window.location.href = url.href;
});
