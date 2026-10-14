import { createHash } from 'node:crypto';
import { adminPassword } from './admin/auth';

/**
 * A 32-byte key for one purpose (`booking-cookie`, `rate-limit`), from its own
 * environment variable when set, otherwise derived from the admin secret that
 * every deploy already has (ADMIN_SESSION_SECRET or ADMIN_PASSWORD; "demo" in
 * `astro dev`). Derived keys differ per purpose, so one can't stand in for
 * another. Null when there's nothing to derive from: the caller fails closed.
 */
export function secretKey(purpose: 'booking-cookie' | 'rate-limit', envName: string): Buffer | null {
	const own = process.env[envName];
	if (own) {
		const decoded = Buffer.from(own, 'base64');
		// A proper 32-byte base64 key is used as is; anything else is hashed into one.
		return decoded.length === 32 ? decoded : createHash('sha256').update(own).digest();
	}
	const base = process.env.ADMIN_SESSION_SECRET || adminPassword();
	return base ? createHash('sha256').update(`hbc:${purpose}:${base}`).digest() : null;
}
