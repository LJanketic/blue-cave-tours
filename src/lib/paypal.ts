import { getPayPalApiBase, isPayPalConfigured } from './env';

type PayPalToken = { access_token: string; expires_in: number };

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
	if (!isPayPalConfigured()) {
		throw new Error('PayPal is not configured');
	}
	const now = Date.now();
	if (cachedToken && now < cachedToken.expiresAt - 30_000) {
		return cachedToken.token;
	}
	const clientId = import.meta.env.PAYPAL_CLIENT_ID ?? import.meta.env.PUBLIC_PAYPAL_CLIENT_ID;
	const secret = import.meta.env.PAYPAL_CLIENT_SECRET!;
	const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
	const res = await fetch(`${getPayPalApiBase()}/v1/oauth2/token`, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${auth}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: 'grant_type=client_credentials',
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`PayPal auth failed: ${res.status} ${text}`);
	}
	const json = (await res.json()) as PayPalToken;
	cachedToken = { token: json.access_token, expiresAt: now + json.expires_in * 1000 };
	return json.access_token;
}

export type CreateOrderInput = {
	amount: number;
	currency: string;
	description: string;
	referenceId: string;
	returnUrl: string;
	cancelUrl: string;
};

export type CreateOrderResult = {
	id: string;
	status: string;
	approveUrl?: string;
};

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
	const token = await getAccessToken();
	const value = input.amount.toFixed(2);
	const res = await fetch(`${getPayPalApiBase()}/v2/checkout/orders`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			intent: 'CAPTURE',
			purchase_units: [
				{
					reference_id: input.referenceId,
					description: input.description,
					amount: {
						currency_code: input.currency,
						value,
					},
				},
			],
			application_context: {
				return_url: input.returnUrl,
				cancel_url: input.cancelUrl,
				brand_name: 'Blue Cave Tours',
				user_action: 'PAY_NOW',
			},
		}),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`PayPal create order failed: ${res.status} ${text}`);
	}
	const json = (await res.json()) as {
		id: string;
		status: string;
		links?: { rel: string; href: string }[];
	};
	const approve = json.links?.find((l) => l.rel === 'approve');
	return { id: json.id, status: json.status, approveUrl: approve?.href };
}

export type CaptureOrderResult = {
	id: string;
	status: string;
	captureId?: string;
	amount?: { currency_code: string; value: string };
};

export async function captureOrder(orderId: string): Promise<CaptureOrderResult> {
	const token = await getAccessToken();
	const res = await fetch(`${getPayPalApiBase()}/v2/checkout/orders/${orderId}/capture`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`PayPal capture failed: ${res.status} ${text}`);
	}
	const json = (await res.json()) as {
		id: string;
		status: string;
		purchase_units?: {
			payments?: { captures?: { id: string; amount?: { currency_code: string; value: string } }[] };
		}[];
	};
	const capture = json.purchase_units?.[0]?.payments?.captures?.[0];
	return {
		id: json.id,
		status: json.status,
		captureId: capture?.id,
		amount: capture?.amount,
	};
}

export type WebhookVerifyInput = {
	transmissionId: string;
	timestamp: string;
	webhookId: string;
	event: unknown;
	certUrl: string;
	authAlgo: string;
	transmissionSig: string;
};

export async function verifyWebhook(input: WebhookVerifyInput): Promise<boolean> {
	if (!isPayPalConfigured()) return false;
	const webhookId = import.meta.env.PAYPAL_WEBHOOK_ID;
	if (!webhookId) {
		console.warn('[paypal] PAYPAL_WEBHOOK_ID not set — skipping verification');
		return false;
	}
	const token = await getAccessToken();
	const res = await fetch(`${getPayPalApiBase()}/v1/notifications/verify-webhook-signature`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			transmission_id: input.transmissionId,
			transmission_time: input.timestamp,
			cert_url: input.certUrl,
			auth_algo: input.authAlgo,
			transmission_sig: input.transmissionSig,
			webhook_id: webhookId,
			webhook_event: input.event,
		}),
	});
	if (!res.ok) return false;
	const json = (await res.json()) as { verification_status?: string };
	return json.verification_status === 'SUCCESS';
}
