/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly PUBLIC_SITE_URL?: string;
	readonly PUBLIC_PAYPAL_CLIENT_ID?: string;
	readonly PAYPAL_CLIENT_ID?: string;
	readonly PAYPAL_CLIENT_SECRET?: string;
	readonly PAYPAL_MODE?: 'sandbox' | 'live';
	readonly PAYPAL_WEBHOOK_ID?: string;
	readonly PAYMENT_PROVIDER?: 'demo';
	readonly TEYA_CLIENT_ID?: string;
	readonly TEYA_CLIENT_SECRET?: string;
	readonly TEYA_MODE?: 'sandbox' | 'live';
	readonly TEYA_STORE_ID?: string;
	readonly SUPABASE_URL?: string;
	readonly SUPABASE_SERVICE_ROLE_KEY?: string;
	readonly SMTP_HOST?: string;
	readonly SMTP_PORT?: string;
	readonly SMTP_USER?: string;
	readonly SMTP_PASS?: string;
	readonly SMTP_FROM?: string;
	readonly SMTP_TO?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
