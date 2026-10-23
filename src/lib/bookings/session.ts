import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { secretKey } from '../secrets';

/**
 * The booking in progress lives in a sealed cookie (spec §8.1.6), never in the
 * URL and never in a server-side draft: no shareable link to someone's details,
 * no storage cost, nothing to delete later. AES-256-GCM, so it can be neither
 * read nor altered without the key.
 */

export const BOOKING_COOKIE = 'hbc_booking';
export const BOOKING_COOKIE_MAX_AGE = 7200; // 2 hours

export type BookingDraft = {
	/**
	 * 1 for a group booking, 2 for a private experience. A build that only
	 * knows group drafts (a rollback) refuses a private one instead of
	 * booking it as a group.
	 */
	v: 1 | 2;
	tourSlug: string;
	date: string;
	slot: string;
	adults: number;
	children: number;
	infants: number;
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	notes: string;
	/** ms since epoch; the draft expires BOOKING_COOKIE_MAX_AGE after this. */
	createdAt: number;
	/** Set once /api/bookings has created the booking: a second submit goes to its payment instead. */
	bookingId?: string;
	/** A private experience (the whole boat, paid now); a group booking leaves these out. */
	kind?: 'private';
	/** Private only: the chosen extras' ids (src/config/private.ts). */
	extras?: string[];
	/** Private only: the pick-up point's id. */
	pickup?: string;
};

function key(): Buffer | null {
	return secretKey('booking-cookie');
}

/** base64url(iv | tag | ciphertext). Null when no key can be had (fail closed). */
export function sealDraft(draft: BookingDraft): string | null {
	const k = key();
	if (!k) return null;
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', k, iv);
	const body = Buffer.concat([cipher.update(JSON.stringify(draft), 'utf8'), cipher.final()]);
	return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}

/** The draft, or null when missing, tampered with, sealed with another key, malformed or expired. */
export function openDraft(token: string | undefined | null, now: number = Date.now()): BookingDraft | null {
	const k = key();
	if (!k || !token) return null;
	try {
		const raw = Buffer.from(token, 'base64url');
		if (raw.length < 29) return null;
		const decipher = createDecipheriv('aes-256-gcm', k, raw.subarray(0, 12));
		decipher.setAuthTag(raw.subarray(12, 28));
		const text = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
		const draft = JSON.parse(text) as BookingDraft;
		if ((draft?.v !== 1 && draft?.v !== 2) || typeof draft.createdAt !== 'number') return null;
		// The version and the kind must agree: a private draft is always v2, a group one v1.
		if ((draft.v === 2) !== (draft.kind === 'private')) return null;
		if (now - draft.createdAt > BOOKING_COOKIE_MAX_AGE * 1000 || draft.createdAt > now + 60_000) return null;
		return draft;
	} catch {
		return null;
	}
}

/** Cookie options: HttpOnly, Secure (except plain-http localhost), SameSite=Strict, 2 hours. */
export function bookingCookieOptions(url: URL) {
	return {
		httpOnly: true,
		secure: url.protocol === 'https:',
		sameSite: 'strict' as const,
		path: '/',
		maxAge: BOOKING_COOKIE_MAX_AGE,
	};
}
