/** Shared contact form limits and validation — used by client + /api/contact. */

export const CONTACT_LIMITS = {
	name: 200,
	email: 254,
	message: 5000,
	phone: 30,
	tourSlug: 80,
} as const;

export const CONTACT_MIN_SUBMIT_MS = 2000;
export const CONTACT_MIN_NAME_LEN = 2;
export const CONTACT_MIN_MESSAGE_LEN = 10;
export const CONTACT_MAX_FORM_AGE_MS = 86_400_000;

/** Honeypot field name — must match the hidden input in contact/index.astro */
export const HONEYPOT_FIELD = 'company';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[\d\s+().-]{7,30}$/;

export function trimField(value: unknown, max: number): string {
	return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function parseStartedAt(value: unknown): number | null {
	const n = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(n)) return null;
	return n;
}

export type ContactFields = {
	name: string;
	email: string;
	message: string;
	phone: string;
	tourSlug: string;
	honeypot: string;
	startedAt: number | null;
};

/** Form fields a validation error can point at (ids match contact/index.astro). */
export type ContactFieldName = 'name' | 'email' | 'message' | 'phone' | 'tourSlug';

export type ContactValidationResult =
	| { ok: true; silent?: boolean }
	| { ok: false; error: string; status?: number; fields?: ContactFieldName[] };

export function validateContactSubmission(fields: ContactFields): ContactValidationResult {
	if (fields.honeypot) {
		return { ok: true, silent: true };
	}

	const missing = (['name', 'email', 'message'] as const).filter((field) => !fields[field]);
	if (missing.length) {
		return { ok: false, error: 'Name, email, and message are required', status: 400, fields: [...missing] };
	}
	if (fields.name.length < CONTACT_MIN_NAME_LEN) {
		return { ok: false, error: 'Enter your full name', status: 400, fields: ['name'] };
	}
	if (!EMAIL_RE.test(fields.email)) {
		return { ok: false, error: 'Enter a valid email address', status: 400, fields: ['email'] };
	}
	if (fields.message.length < CONTACT_MIN_MESSAGE_LEN) {
		return {
			ok: false,
			error: `Message must be at least ${CONTACT_MIN_MESSAGE_LEN} characters`,
			status: 400,
			fields: ['message'],
		};
	}
	if (fields.phone && !PHONE_RE.test(fields.phone)) {
		return { ok: false, error: 'Enter a valid phone number', status: 400, fields: ['phone'] };
	}

	const now = Date.now();
	if (fields.startedAt === null) {
		return { ok: false, error: 'Invalid submission', status: 400 };
	}
	if (fields.startedAt > now || now - fields.startedAt > CONTACT_MAX_FORM_AGE_MS) {
		return { ok: false, error: 'Invalid submission', status: 400 };
	}
	if (now - fields.startedAt < CONTACT_MIN_SUBMIT_MS) {
		return { ok: false, error: 'Please wait a moment and try again', status: 429 };
	}

	return { ok: true };
}
