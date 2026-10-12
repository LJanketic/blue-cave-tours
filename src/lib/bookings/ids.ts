import { randomBytes, randomUUID } from 'node:crypto';

/** No 0/O or 1/I, so a ref read out over the phone can't be misheard. */
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Random customer-facing booking reference, e.g. `HBC-7K3QXM` (32^6 ≈ 1 billion values). */
export function newBookingRef(): string {
	const bytes = randomBytes(6);
	let ref = '';
	for (const byte of bytes) ref += REF_ALPHABET[byte % REF_ALPHABET.length];
	return `HBC-${ref}`;
}

/** Opaque record id, used in URLs instead of any personal data. */
export function newId(): string {
	return randomUUID();
}

export function isRecordId(value: string | null | undefined): value is string {
	return typeof value === 'string' && /^[0-9a-f-]{36}$/.test(value);
}
