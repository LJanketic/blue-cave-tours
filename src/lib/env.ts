const env = import.meta.env;

export type PaymentMethod = 'paypal' | 'teya';

/** Which checkout backends are configured (customer may choose when both are true). */
export function getAvailablePaymentMethods(): { paypal: boolean; teya: boolean } {
	if (env.PAYMENT_PROVIDER === 'demo') {
		return { paypal: false, teya: false };
	}
	return {
		paypal: isPayPalConfigured(),
		teya: isTeyaConfigured(),
	};
}

export function hasOnlinePayments(): boolean {
	const { paypal, teya } = getAvailablePaymentMethods();
	return paypal || teya;
}

export function isPayPalConfigured(): boolean {
	const id = env.PAYPAL_CLIENT_ID ?? env.PUBLIC_PAYPAL_CLIENT_ID;
	return Boolean(id && env.PAYPAL_CLIENT_SECRET);
}

export function isSupabaseConfigured(): boolean {
	return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isSmtpConfigured(): boolean {
	return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

export function getPayPalApiBase(): string {
	return env.PAYPAL_MODE === 'live'
		? 'https://api-m.paypal.com'
		: 'https://api-m.sandbox.paypal.com';
}

export function getPublicPayPalClientId(): string | undefined {
	return env.PUBLIC_PAYPAL_CLIENT_ID ?? env.PAYPAL_CLIENT_ID;
}

export function getSiteUrl(fallback = 'http://localhost:4321'): string {
	return env.PUBLIC_SITE_URL ?? fallback;
}

export function isTeyaConfigured(): boolean {
	return Boolean(env.TEYA_CLIENT_ID && env.TEYA_CLIENT_SECRET);
}

export function getTeyaApiBase(): string {
	return env.TEYA_MODE === 'live' ? 'https://api.teya.com' : 'https://api.teya.xyz';
}

export function getTeyaTokenUrl(): string {
	return env.TEYA_MODE === 'live'
		? 'https://id.teya.com/oauth/v2/oauth-token'
		: 'https://id.teya.xyz/oauth/v2/oauth-token';
}
