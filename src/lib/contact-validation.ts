/** Shared contact form limits and validation — used by client + /api/contact. */

export const CONTACT_LIMITS = {
	name: 200,
	firstName: 100,
	lastName: 100,
	bookingRef: 20,
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

/** The Subject select (D-10), with the board's wording; `topic` is what's stored. */
export const CONTACT_TOPICS = [
	{ id: 'general', label: 'General enquiry' },
	{ id: 'group', label: 'Group booking question' },
	{ id: 'charter', label: 'Private charter enquiry' },
	{ id: 'change', label: 'Cancellation or rescheduling' },
	{ id: 'feedback', label: 'Feedback or complaint' },
	{ id: 'press', label: 'Press / media' },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]['id'];

/** Topics that ask which tour it's about. */
export const TOPICS_WITH_TOUR: readonly ContactTopic[] = ['group', 'charter', 'change'];

export function topicLabel(topic: string | undefined): string {
	return CONTACT_TOPICS.find((t) => t.id === topic)?.label ?? 'General enquiry';
}

/** Booking references as issued (HBC- and six letters or digits, see newBookingRef). */
const BOOKING_REF_RE = /^HBC-[A-Z0-9]{6}$/;

/** "Ivan" + "Kovač" → "Ivan Kovač". The form has two fields (D-10); the record keeps one name. */
export function joinName(first: string, last: string): string {
	return [first, last].map((part) => part.trim()).filter(Boolean).join(' ');
}

/**
 * The usual shape of an address: letters, digits and the RFC 5322 "atext" signs
 * before the @, a dotted host name after it. Stricter than the old "anything but
 * spaces", which let `a@b.co?bcc=x@y.z` through into mailto links and Resend.
 * Host names may use any letters (`žena.hr`); the part before the @ stays ASCII.
 * GroupBookingFlow.vue keeps a copy of this pattern (its island has a size budget).
 */
export const EMAIL_RE = /^[A-Za-z0-9.!#$%'*+/=^_`{|}~-]+@[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?(?:\.[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?)*\.[\p{L}]{2,}$/u;

/**
 * The address with its host name in ASCII (`ana@žena.hr` → `ana@xn--ena-b3a.hr`),
 * so storage, mailto links and Resend never depend on internationalised mail support.
 * Call it after EMAIL_RE has passed.
 */
export function asciiEmail(email: string): string {
	const at = email.lastIndexOf('@');
	try {
		return `${email.slice(0, at)}@${new URL(`http://${email.slice(at + 1)}`).hostname}`;
	} catch {
		return email;
	}
}
/** Digits, spaces and + ( ) - . ; shared by the contact and charter forms. */
export const PHONE_RE = /^[\d\s+().-]{7,30}$/;

export function trimField(value: unknown, max: number): string {
	return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function parseStartedAt(value: unknown): number | null {
	// An empty field (a plain form post: no script set it) is no time, not 1970.
	if (value === '' || value === undefined || value === null) return null;
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
	/** '' when the form didn't send one (older clients): treated as general. */
	topic?: string;
	bookingRef?: string;
	honeypot: string;
	startedAt: number | null;
};

/** Form fields a validation error can point at (ids match contact/index.astro). */
export type ContactFieldName = 'name' | 'email' | 'message' | 'phone' | 'tourSlug' | 'topic' | 'bookingRef';

export type ContactValidationResult =
	| { ok: true; silent?: boolean }
	| { ok: false; error: string; status?: number; fields?: ContactFieldName[] };

/**
 * `startedAtOptional`: a plain form post (no JavaScript) has no start time,
 * since only the page script sets it. The contact form fails open then (§3.5):
 * the honeypot and the rate limit still apply.
 */
export function validateContactSubmission(fields: ContactFields, { startedAtOptional = false } = {}): ContactValidationResult {
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
	if (fields.topic && !CONTACT_TOPICS.some((t) => t.id === fields.topic)) {
		return { ok: false, error: 'Choose a subject from the list', status: 400, fields: ['topic'] };
	}
	if (fields.bookingRef && !BOOKING_REF_RE.test(fields.bookingRef.toUpperCase())) {
		return { ok: false, error: 'Booking references look like HBC-7K3QXM', status: 400, fields: ['bookingRef'] };
	}

	const now = Date.now();
	if (fields.startedAt === null && startedAtOptional) {
		return { ok: true };
	}
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
