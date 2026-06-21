import { getTeyaApiBase, getTeyaTokenUrl, isTeyaConfigured } from './env';

type TeyaToken = { access_token: string; expires_in: number };

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
	if (!isTeyaConfigured()) {
		throw new Error('Teya is not configured');
	}

	const now = Date.now();
	if (cachedToken && now < cachedToken.expiresAt - 30_000) {
		return cachedToken.token;
	}

	const body = new URLSearchParams({
		grant_type: 'client_credentials',
		client_id: import.meta.env.TEYA_CLIENT_ID!,
		client_secret: import.meta.env.TEYA_CLIENT_SECRET!,
		scope: 'checkout/sessions/create checkout/sessions/id/get',
	});

	const res = await fetch(getTeyaTokenUrl(), {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body,
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Teya auth failed: ${res.status} ${text}`);
	}

	const json = (await res.json()) as TeyaToken;
	cachedToken = { token: json.access_token, expiresAt: now + json.expires_in * 1000 };
	return json.access_token;
}

/** Teya amounts are minor units (e.g. €159.00 → 15900). */
export function toTeyaMinorUnits(amount: number): number {
	return Math.round(amount * 100);
}

export type CreateCheckoutSessionInput = {
	amount: number;
	currency: string;
	successUrl: string;
	failureUrl: string;
	idempotencyKey?: string;
};

export type CreateCheckoutSessionResult = {
	sessionId: string;
	sessionUrl: string;
};

/**
 * Hosted Checkout — redirect customer to Teya payment page.
 * @see https://docs.teya.com/apis/overview
 * @see https://api.teya.com/v2/checkout/sessions (production)
 */
export async function createCheckoutSession(
	input: CreateCheckoutSessionInput,
): Promise<CreateCheckoutSessionResult> {
	const token = await getAccessToken();
	const headers: Record<string, string> = {
		Authorization: `Bearer ${token}`,
		'Content-Type': 'application/json',
	};
	if (input.idempotencyKey) {
		headers['Idempotency-Key'] = input.idempotencyKey;
	}

	const res = await fetch(`${getTeyaApiBase()}/v2/checkout/sessions`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			type: 'SALE',
			amount: {
				currency: input.currency,
				value: toTeyaMinorUnits(input.amount),
			},
			success_url: input.successUrl,
			failure_url: input.failureUrl,
		}),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Teya create session failed: ${res.status} ${text}`);
	}

	const json = (await res.json()) as {
		id?: string;
		session_id?: string;
		session_url?: string;
	};

	const sessionId = json.session_id ?? json.id;
	const sessionUrl = json.session_url;
	if (!sessionId || !sessionUrl) {
		throw new Error('Teya create session returned incomplete response');
	}

	return { sessionId, sessionUrl };
}

export type CheckoutSessionStatus = {
	sessionId: string;
	sessionStatus: string;
	paymentStatus: string;
};

/**
 * Poll session after customer returns from Hosted Checkout.
 * payment_status: NONE | SUCCESS | FAILED
 * session_status: ACTIVE | PROCESSING | COMPLETED | EXPIRED
 */
export async function getCheckoutSession(sessionId: string): Promise<CheckoutSessionStatus> {
	const token = await getAccessToken();
	const res = await fetch(`${getTeyaApiBase()}/v2/checkout/sessions/${sessionId}`, {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Teya get session failed: ${res.status} ${text}`);
	}

	const json = (await res.json()) as {
		id?: string;
		session_id?: string;
		session_status?: string;
		payment_status?: string;
	};

	return {
		sessionId: json.session_id ?? json.id ?? sessionId,
		sessionStatus: json.session_status ?? 'UNKNOWN',
		paymentStatus: json.payment_status ?? 'NONE',
	};
}
