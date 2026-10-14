import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDraft, sealDraft, type BookingDraft } from './session';

const draft = (overrides: Partial<BookingDraft> = {}): BookingDraft => ({
	v: 1,
	tourSlug: 'blue-lagoon-morning',
	date: '2027-07-15',
	slot: '09:30',
	adults: 2,
	children: 1,
	infants: 1,
	firstName: 'Ivan',
	lastName: 'Kovač',
	email: 'ivan@example.com',
	phone: '+385 91 000 0000',
	notes: 'x'.repeat(500),
	createdAt: Date.now(),
	...overrides,
});

describe('booking cookie', () => {
	const saved = { ...process.env };
	beforeEach(() => {
		process.env.BOOKING_COOKIE_SECRET = Buffer.alloc(32, 7).toString('base64');
	});
	afterEach(() => {
		process.env = { ...saved };
	});

	it('round-trips, and the sealed text hides the contents', () => {
		const sealed = sealDraft(draft()) as string;
		expect(sealed).not.toContain('Ivan');
		expect(Buffer.from(sealed, 'base64url').toString('latin1')).not.toContain('example.com');
		expect(openDraft(sealed)).toMatchObject({ firstName: 'Ivan', infants: 1 });
	});

	it('stays under 4 KB with the longest notes', () => {
		expect((sealDraft(draft()) as string).length).toBeLessThan(4096 - 200);
	});

	it('rejects any change to the sealed text', () => {
		const sealed = sealDraft(draft()) as string;
		const bytes = Buffer.from(sealed, 'base64url');
		bytes[bytes.length - 1] ^= 1;
		expect(openDraft(bytes.toString('base64url'))).toBeNull();
		expect(openDraft('garbage')).toBeNull();
		expect(openDraft('')).toBeNull();
	});

	it('rejects a cookie sealed with another key', () => {
		const sealed = sealDraft(draft()) as string;
		process.env.BOOKING_COOKIE_SECRET = Buffer.alloc(32, 9).toString('base64');
		expect(openDraft(sealed)).toBeNull();
	});

	it('expires after two hours', () => {
		const createdAt = Date.now();
		const sealed = sealDraft(draft({ createdAt })) as string;
		expect(openDraft(sealed, createdAt + 7199_000)).not.toBeNull();
		expect(openDraft(sealed, createdAt + 7201_000)).toBeNull();
	});

	it('without its own secret, derives the key from the admin secret', () => {
		delete process.env.BOOKING_COOKIE_SECRET;
		process.env.ADMIN_SESSION_SECRET = 'first-admin-secret';
		const sealed = sealDraft(draft()) as string;
		expect(openDraft(sealed)).not.toBeNull();
		// Rotating the admin secret ends drafts in progress (they last 2 hours anyway).
		process.env.ADMIN_SESSION_SECRET = 'second-admin-secret';
		expect(openDraft(sealed)).toBeNull();
	});
});
