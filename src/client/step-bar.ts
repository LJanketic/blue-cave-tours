/**
 * The step bar is server-rendered, but a pay-now private booking can turn into
 * a quote request in the browser ("Other location"). This switches the bar
 * between Review → Payment and Request; the rules are in StepBar.astro.
 */
export function setStepBarRequest(on: boolean): void {
	const bar = document.querySelector('.step-bar-ui');
	if (!bar) return;
	bar.toggleAttribute('data-request', on);
	const label = bar.querySelector('[data-step="3"] .step-bar-ui__label');
	if (label) label.textContent = on ? 'Request' : 'Review';
}
