import { createHash } from 'node:crypto';

/** Each purpose has its own secret, set only for that job; none is derived from another or from the admin password. */
const SECRET_ENV = {
	'admin-session': 'ADMIN_SESSION_SECRET',
	'booking-cookie': 'BOOKING_COOKIE_SECRET',
	'rate-limit': 'RATE_LIMIT_SALT',
} as const;

export type SecretPurpose = keyof typeof SECRET_ENV;

/** 32 random bytes, base64: `openssl rand -base64 32` gives 44 characters. Anything shorter is refused. */
const MIN_SECRET_LENGTH = 32;

const reported = new Set<string>();

function report(message: string): void {
	if (reported.has(message)) return;
	reported.add(message);
	console.error(message);
}

/**
 * The 32-byte key for one purpose, from that purpose's own environment
 * variable. A base64 32-byte value is used as is; any other value of at least
 * 32 characters is hashed into one. In `astro dev` a fixed dev-only key stands
 * in when the variable is unset, so local cookies survive restarts. In
 * production a missing or short secret gives null and the caller fails closed:
 * that feature switches off instead of falling back to something guessable.
 */
export function secretKey(purpose: SecretPurpose): Buffer | null {
	const envName = SECRET_ENV[purpose];
	const own = process.env[envName];
	if (own) {
		if (own.length < MIN_SECRET_LENGTH) {
			report(`${envName} is shorter than ${MIN_SECRET_LENGTH} characters, so it is ignored. Generate one with: openssl rand -base64 32`);
			return null;
		}
		const decoded = Buffer.from(own, 'base64');
		return decoded.length === 32 ? decoded : createHash('sha256').update(own).digest();
	}
	if (import.meta.env.DEV) return createHash('sha256').update(`hbc-dev-only:${purpose}`).digest();
	report(`${envName} is not set, so ${purpose} is switched off. Generate one with: openssl rand -base64 32`);
	return null;
}
