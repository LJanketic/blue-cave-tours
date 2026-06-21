type ConfirmResponse = {
	ok?: boolean;
	status?: string;
	error?: string;
	alreadyPaid?: boolean;
};

type PageCopy = {
	verifying: string;
	leadPayPal: string;
	leadTeya: string;
	leadGeneric: string;
	unverified: string;
	pending: string;
	failed: string;
	followup: string;
};

function readParam(...names: string[]): string | null {
	const params = new URLSearchParams(window.location.search);
	for (const name of names) {
		const value = params.get(name);
		if (value) return value;
	}
	return null;
}

function setLead(main: HTMLElement, text: string): void {
	const lead = main.querySelector('[data-booking-success-lead]');
	if (lead) lead.textContent = text;
}

function setStatus(main: HTMLElement, text: string, state: 'error' | 'info' | '' = ''): void {
	const el = main.querySelector('[data-booking-success-status]');
	if (!(el instanceof HTMLElement)) return;
	el.textContent = text;
	el.dataset.state = state;
	el.hidden = !text;
}

function showFollowup(main: HTMLElement, copy: PageCopy): void {
	const followup = main.querySelector('[data-booking-success-followup]');
	if (followup instanceof HTMLElement) followup.hidden = false;
	if (!followup && copy.followup) {
		const help = main.querySelector('.muted');
		const status = main.querySelector('[data-booking-success-status]');
		const p = document.createElement('p');
		p.className = 'muted';
		p.dataset.bookingSuccessFollowup = '';
		p.textContent = copy.followup;
		if (status?.nextElementSibling) {
			main.insertBefore(p, status.nextElementSibling);
		} else if (help) {
			main.insertBefore(p, help);
		}
	}
}

async function confirmTeyaSession(sessionId: string): Promise<ConfirmResponse> {
	const res = await fetch('/api/teya/confirm-session', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ sessionId }),
	});
	return (await res.json().catch(() => ({}))) as ConfirmResponse;
}

async function capturePayPalOrder(orderId: string): Promise<ConfirmResponse> {
	const res = await fetch('/api/paypal/capture-order', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ orderId }),
	});
	return (await res.json().catch(() => ({}))) as ConfirmResponse;
}

function leadForProvider(copy: PageCopy, provider: string | null): string {
	if (provider === 'paypal') return copy.leadPayPal;
	if (provider === 'teya') return copy.leadTeya;
	return copy.leadGeneric;
}

export function initBookingSuccess(): void {
	const main = document.querySelector<HTMLElement>('[data-booking-success]');
	if (!main) return;

	const copy: PageCopy = {
		verifying: main.dataset.verifying ?? 'Verifying payment…',
		leadPayPal: main.dataset.leadPaypal ?? 'Your payment was processed with PayPal.',
		leadTeya: main.dataset.leadTeya ?? 'Your payment was processed securely.',
		leadGeneric: main.dataset.leadGeneric ?? 'Thank you for your booking.',
		unverified:
			main.dataset.unverified ??
			'This page alone does not confirm payment. Contact us if you were charged.',
		pending: main.dataset.pending ?? 'Payment is still processing. We will email you once confirmed.',
		failed: main.dataset.failed ?? 'We could not confirm your payment. Please contact us if you were charged.',
		followup: main.dataset.followup ?? '',
	};

	const provider = readParam('provider');
	const orderId = readParam('orderId', 'order_id', 'token');
	const sessionId = readParam('sessionId', 'session_id');

	if (!orderId && !sessionId) {
		setLead(main, copy.unverified);
		return;
	}

	void (async () => {
		setLead(main, leadForProvider(copy, provider));
		setStatus(main, copy.verifying, 'info');

		try {
			let result: ConfirmResponse;
			if (sessionId || provider === 'teya') {
				const id = sessionId ?? orderId;
				if (!id) return;
				result = await confirmTeyaSession(id);
			} else {
				const id = orderId;
				if (!id) return;
				result = await capturePayPalOrder(id);
			}

			if (result.ok && result.status === 'paid') {
				setLead(main, leadForProvider(copy, provider));
				setStatus(main, '');
				showFollowup(main, copy);
				return;
			}

			if (result.status && result.status !== 'paid' && result.status !== 'COMPLETED') {
				setLead(main, copy.pending);
				setStatus(main, copy.pending, 'info');
				return;
			}

			setLead(main, copy.failed);
			setStatus(main, result.error ?? copy.failed, 'error');
		} catch {
			setLead(main, copy.failed);
			setStatus(main, copy.failed, 'error');
		}
	})();
}
