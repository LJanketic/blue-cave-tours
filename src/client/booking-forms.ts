/** Instant book — send catalog/detail CTAs into the group booking form. */
document.addEventListener('submit', (e) => {
	const form = e.target;
	if (!(form instanceof HTMLFormElement) || !form.classList.contains('booking-form')) return;
	e.preventDefault();
	const tourId = form.getAttribute('data-tour-id');
	if (!tourId) return;

	window.location.href = `/book/${encodeURIComponent(tourId)}/group`;
});
