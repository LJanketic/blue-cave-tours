type QuoteLineItem = {
	label: string;
	quantity: number;
	unitPrice: number;
	lineTotal: number;
};

type QuoteResponse = {
	quote?: {
		total: number;
		currency: string;
		requiresContact: boolean;
		placeholder?: boolean;
		lineItems?: QuoteLineItem[];
	};
	error?: string;
};

type CreateOrderResponse = {
	orderId?: string;
	approveUrl?: string;
	error?: string;
};

type CreateSessionResponse = {
	sessionId?: string;
	redirectUrl?: string;
	error?: string;
};

type PaymentMethod = 'paypal' | 'teya';

declare global {
	interface Window {
		paypal?: {
			Buttons: (config: {
				createOrder: () => Promise<string>;
				onApprove: (data: { orderID: string }) => Promise<void>;
				onError: (err: unknown) => void;
			}) => { render: (selector: string | HTMLElement) => Promise<void> };
		};
	}
}

function formMsg(form: HTMLFormElement, key: keyof DOMStringMap, fallback: string): string {
	const value = form.dataset[key];
	return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function interpolate(template: string, vars: Record<string, string>): string {
	let result = template;
	for (const [name, value] of Object.entries(vars)) {
		result = result.replaceAll(`{${name}}`, value);
	}
	return result;
}

function formatTotal(total: number, currency: string): string {
	try {
		return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(total);
	} catch {
		return `${total} ${currency}`;
	}
}

function readFormPayload(form: HTMLFormElement) {
	const fd = new FormData(form);
	return {
		tourSlug: form.dataset.tourSlug ?? '',
		locale: form.dataset.locale ?? 'hr',
		tourDate: String(fd.get('tourDate') ?? ''),
		adults: Number(fd.get('adults') ?? 1),
		children: Number(fd.get('children') ?? 0),
		infants: Number(fd.get('infants') ?? 0),
		name: String(fd.get('name') ?? '').trim(),
		email: String(fd.get('email') ?? '').trim(),
		phone: String(fd.get('phone') ?? '').trim(),
	};
}

function formatPartyLine(
	form: HTMLFormElement,
	adults: number,
	children: number,
	infants: number,
): string {
	const parts: string[] = [];
	if (adults > 0) {
		const label = formMsg(
			form,
			adults === 1 ? 'msgContactPartyAdult' : 'msgContactPartyAdults',
			adults === 1 ? 'adult' : 'adults',
		);
		parts.push(`${adults} ${label}`);
	}
	if (children > 0) {
		const label = formMsg(
			form,
			children === 1 ? 'msgContactPartyChild' : 'msgContactPartyChildren',
			children === 1 ? 'child' : 'children',
		);
		parts.push(`${children} ${label}`);
	}
	if (infants > 0) {
		const label = formMsg(
			form,
			infants === 1 ? 'msgContactPartyInfant' : 'msgContactPartyInfants',
			infants === 1 ? 'infant' : 'infants',
		);
		parts.push(`${infants} ${label}`);
	}
	return parts.join(', ');
}

async function fetchQuote(form: HTMLFormElement): Promise<QuoteResponse> {
	const payload = readFormPayload(form);
	const res = await fetch('/api/booking/quote', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			tourSlug: payload.tourSlug,
			locale: payload.locale,
			tourDate: payload.tourDate || undefined,
			adults: payload.adults,
			children: payload.children,
			infants: payload.infants,
		}),
	});
	return (await res.json().catch(() => ({}))) as QuoteResponse;
}

async function createPayPalOrder(form: HTMLFormElement): Promise<CreateOrderResponse> {
	const payload = readFormPayload(form);
	const res = await fetch('/api/paypal/create-order', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
	return (await res.json().catch(() => ({}))) as CreateOrderResponse;
}

async function createTeyaSession(form: HTMLFormElement): Promise<CreateSessionResponse> {
	const payload = readFormPayload(form);
	const res = await fetch('/api/teya/create-session', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
	return (await res.json().catch(() => ({}))) as CreateSessionResponse;
}

function bookingPath(
	locale: string,
	page: 'success' | 'cancel',
	params?: URLSearchParams,
): string {
	const prefix = locale && locale !== 'hr' ? `/${locale}` : '';
	const qs = params?.toString() ? `?${params.toString()}` : '';
	return `${prefix}/booking/${page}${qs}`;
}

function buildSuccessUrl(form: HTMLFormElement, tourId: string, provider: PaymentMethod, orderId?: string): string {
	const payload = readFormPayload(form);
	const params = new URLSearchParams({
		tourId,
		provider,
	});
	if (orderId) params.set('orderId', orderId);
	return bookingPath(payload.locale, 'success', params);
}

async function captureOrder(form: HTMLFormElement, orderId: string): Promise<void> {
	const res = await fetch('/api/paypal/capture-order', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ orderId }),
	});
	const json = (await res.json().catch(() => ({}))) as { error?: string };
	if (!res.ok) {
		throw new Error(json.error || formMsg(form, 'msgCaptureFailed', 'Capture failed'));
	}
}

function setStatus(form: HTMLFormElement, message: string, state: 'error' | 'info' | '' = ''): void {
	const el = form.querySelector('[data-booking-status]');
	if (!(el instanceof HTMLElement)) return;
	el.textContent = message;
	el.dataset.state = state;
}

function setTotal(form: HTMLFormElement, total: number, currency: string): void {
	const wrap = form.querySelector('[data-booking-total]');
	const val = form.querySelector('[data-booking-total-value]');
	if (wrap instanceof HTMLElement) wrap.hidden = false;
	if (val instanceof HTMLElement) val.textContent = formatTotal(total, currency);
}

function setBreakdown(form: HTMLFormElement, lineItems: QuoteLineItem[], currency: string): void {
	const list = form.querySelector('[data-booking-breakdown]');
	if (!(list instanceof HTMLUListElement)) return;
	const freeLabel = formMsg(form, 'msgFree', 'free');

	if (!lineItems.length) {
		list.hidden = true;
		list.innerHTML = '';
		return;
	}

	list.hidden = false;
	list.innerHTML = lineItems
		.map((li) => {
			const unit =
				li.unitPrice > 0
					? ` × ${formatTotal(li.unitPrice, currency)}`
					: li.quantity > 0
						? ` (${freeLabel})`
						: '';
			const line = li.lineTotal > 0 ? ` — ${formatTotal(li.lineTotal, currency)}` : '';
			return `<li>${li.quantity} ${li.label}${unit}${line}</li>`;
		})
		.join('');
}

function buildContactUrl(form: HTMLFormElement, quote?: QuoteResponse['quote']): string {
	const link = form.querySelector('[data-booking-contact-link]');
	const base = link instanceof HTMLAnchorElement ? link.href.split('?')[0] : '/contact';
	const payload = readFormPayload(form);
	const tourTitle = form.dataset.tourTitle ?? payload.tourSlug;
	const party = formatPartyLine(form, payload.adults, payload.children, payload.infants);

	const lines = [
		interpolate(formMsg(form, 'msgContactRequest', 'Booking request: {tour}'), { tour: tourTitle }),
		payload.tourDate
			? interpolate(formMsg(form, 'msgContactPreferredDate', 'Preferred date: {date}'), {
					date: payload.tourDate,
				})
			: null,
		interpolate(formMsg(form, 'msgContactParty', 'Party: {party}'), { party }),
		quote && !quote.requiresContact
			? interpolate(
					formMsg(form, 'msgContactEstimatedTotal', 'Estimated total: {total}'),
					{ total: formatTotal(quote.total, quote.currency) },
				)
			: null,
		'',
		formMsg(form, 'msgContactConfirm', 'Please confirm availability and next steps.'),
	].filter(Boolean);

	const params = new URLSearchParams();
	if (payload.name) params.set('name', payload.name);
	if (payload.email) params.set('email', payload.email);
	if (payload.phone) params.set('phone', payload.phone);
	if (payload.tourSlug) params.set('tourSlug', payload.tourSlug);
	params.set('message', lines.join('\n'));

	return `${base}?${params.toString()}`;
}

function showDemoContactPath(form: HTMLFormElement, quote?: QuoteResponse['quote']): void {
	const q = quote ?? undefined;
	const link = form.querySelector('[data-booking-contact-link]');
	const hint = form.dataset.demoHint ?? formMsg(form, 'msgError', 'Something went wrong');
	if (link instanceof HTMLAnchorElement) {
		link.href = buildContactUrl(form, q);
		link.hidden = false;
	}
	setStatus(form, hint, 'info');
}

let paypalSdkPromise: Promise<void> | null = null;

function loadPayPalSdk(clientId: string): Promise<void> {
	if (window.paypal) return Promise.resolve();
	if (paypalSdkPromise) return paypalSdkPromise;
	paypalSdkPromise = new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=EUR`;
		script.async = true;
		script.onload = () => resolve();
		script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
		document.head.appendChild(script);
	});
	return paypalSdkPromise;
}

async function renderPayPalButtons(form: HTMLFormElement, clientId: string): Promise<void> {
	const container = form.querySelector('[data-paypal-container]');
	const submit = form.querySelector('[data-booking-submit]');
	const contactLink = form.querySelector('[data-booking-contact-link]');
	if (!(container instanceof HTMLElement)) return;

	await loadPayPalSdk(clientId);
	if (!window.paypal) throw new Error('PayPal SDK unavailable');

	container.hidden = false;
	if (submit instanceof HTMLButtonElement) submit.hidden = true;
	if (contactLink instanceof HTMLAnchorElement) contactLink.hidden = true;
	container.innerHTML = '';

	await window.paypal.Buttons({
		createOrder: async () => {
			setStatus(form, formMsg(form, 'msgCreatingOrder', 'Creating order…'));
			const created = await createPayPalOrder(form);
			if (!created.orderId) {
				throw new Error(created.error || formMsg(form, 'msgCouldNotCreateOrder', 'Could not create order'));
			}
			setStatus(form, '');
			return created.orderId;
		},
		onApprove: async (data) => {
			setStatus(form, formMsg(form, 'msgCompletingPayment', 'Completing payment…'));
			await captureOrder(form, data.orderID);
			const tourId = form.dataset.tourSlug ?? '';
			window.location.href = buildSuccessUrl(form, tourId, 'paypal', data.orderID);
		},
		onError: (err) => {
			console.error('[booking]', err);
			setStatus(form, formMsg(form, 'msgPaymentError', 'Payment error — please try again.'), 'error');
		},
	}).render(container);
}

async function applyQuote(form: HTMLFormElement, q: QuoteResponse, silent = false): Promise<boolean> {
	if (q.error || !q.quote) {
		if (!silent) {
			setStatus(form, q.error || formMsg(form, 'msgCouldNotCalculate', 'Could not calculate total'), 'error');
		}
		return false;
	}

	if (q.quote.requiresContact) {
		if (!silent) setStatus(form, formMsg(form, 'msgCustomQuote', 'Please contact us for a custom quote.'), 'info');
		return false;
	}

	setTotal(form, q.quote.total, q.quote.currency);
	if (q.quote.lineItems) {
		setBreakdown(form, q.quote.lineItems, q.quote.currency);
	}
	return true;
}

async function refreshQuote(form: HTMLFormElement, silent = false): Promise<QuoteResponse> {
	if (!silent) setStatus(form, formMsg(form, 'msgCalculating', 'Calculating…'));
	const q = await fetchQuote(form);
	await applyQuote(form, q, silent);
	if (silent) setStatus(form, '');
	return q;
}

function bindQuotePreview(form: HTMLFormElement): void {
	const fields = ['adults', 'children', 'infants'] as const;
	for (const name of fields) {
		const input = form.querySelector(`[name="${name}"]`);
		if (!(input instanceof HTMLInputElement)) continue;
		input.addEventListener('change', () => {
			void refreshQuote(form, true);
		});
	}
}

function readAvailableMethods(): PaymentMethod[] {
	const methods: PaymentMethod[] = [];
	if (document.documentElement.dataset.paypalAvailable === 'true') methods.push('paypal');
	if (document.documentElement.dataset.teyaAvailable === 'true') methods.push('teya');
	return methods;
}

function readSelectedMethod(form: HTMLFormElement): PaymentMethod | null {
	const checked = form.querySelector<HTMLInputElement>('input[name="paymentMethod"]:checked');
	if (checked?.value === 'paypal' || checked?.value === 'teya') return checked.value;
	return null;
}

function showPaymentSelector(form: HTMLFormElement): void {
	const fieldset = form.querySelector('[data-booking-payment]');
	if (fieldset instanceof HTMLElement) fieldset.hidden = false;
}

async function startCheckout(form: HTMLFormElement, method: PaymentMethod, clientId?: string): Promise<void> {
	if (method === 'teya') {
		await startTeyaCheckout(form);
		return;
	}
	if (!clientId) {
		showDemoContactPath(form);
		return;
	}
	await renderPayPalButtons(form, clientId);
	setStatus(form, formMsg(form, 'msgChoosePaypal', 'Choose PayPal below to complete your booking.'), 'info');
}

async function startTeyaCheckout(form: HTMLFormElement): Promise<void> {
	setStatus(form, formMsg(form, 'msgRedirecting', 'Redirecting to payment…'));
	const session = await createTeyaSession(form);
	if (!session.redirectUrl) {
		throw new Error(session.error || formMsg(form, 'msgCouldNotStartPayment', 'Could not start payment'));
	}
	window.location.href = session.redirectUrl;
}

export function initBookingForms(): void {
	const clientId = document.documentElement.dataset.paypalClientId;
	const forms = document.querySelectorAll<HTMLFormElement>('[data-booking-form]');
	forms.forEach((form) => {
		bindQuotePreview(form);
		void refreshQuote(form, true);

		form.addEventListener('submit', async (e) => {
			e.preventDefault();
			const submit = form.querySelector('[data-booking-submit]');
			if (submit instanceof HTMLButtonElement) submit.disabled = true;
			setStatus(form, formMsg(form, 'msgCalculating', 'Calculating…'));

			try {
				const payload = readFormPayload(form);
				if (!payload.tourDate) {
					setStatus(form, formMsg(form, 'msgChooseDate', 'Please choose a tour date.'), 'error');
					return;
				}

				const q = await fetchQuote(form);
				const ok = await applyQuote(form, q, false);
				if (!ok) return;

				const methods = readAvailableMethods();
				if (methods.length === 0) {
					showDemoContactPath(form, q.quote);
					return;
				}

				let method = readSelectedMethod(form);
				if (methods.length === 1) {
					method = methods[0];
				} else {
					showPaymentSelector(form);
					if (!method) {
						setStatus(form, formMsg(form, 'msgChoosePayment', 'Choose how you would like to pay.'), 'info');
						return;
					}
				}

				await startCheckout(form, method, clientId);
			} catch (err) {
				setStatus(
					form,
					err instanceof Error ? err.message : formMsg(form, 'msgError', 'Something went wrong'),
					'error',
				);
			} finally {
				if (submit instanceof HTMLButtonElement) submit.disabled = false;
			}
		});
	});
}
