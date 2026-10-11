import { describe, expect, it } from 'vitest';
import { type ContactFields, validateContactSubmission } from './contact-validation';

const valid = (overrides: Partial<ContactFields> = {}): ContactFields => ({
	name: 'Jane Smith',
	email: 'jane@example.com',
	message: 'Two adults, 15 July, any tour.',
	phone: '',
	tourSlug: '',
	honeypot: '',
	startedAt: Date.now() - 10_000,
	...overrides,
});

describe('validateContactSubmission', () => {
	it('accepts a normal submission', () => {
		expect(validateContactSubmission(valid())).toEqual({ ok: true });
	});

	it('silently accepts bot submissions that fill the honeypot', () => {
		expect(validateContactSubmission(valid({ honeypot: 'Acme' }))).toEqual({ ok: true, silent: true });
	});

	it('names every missing required field', () => {
		const result = validateContactSubmission(valid({ name: '', message: '' }));
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.fields).toEqual(['name', 'message']);
	});

	it.each([
		[{ name: 'J' }, 'name'],
		[{ email: 'jane@example' }, 'email'],
		[{ message: 'Hi' }, 'message'],
		[{ phone: 'call me' }, 'phone'],
	] as const)('points %o at the %s field', (overrides, field) => {
		const result = validateContactSubmission(valid(overrides));
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.fields).toEqual([field]);
	});

	it('rejects forms submitted too fast or with no start time', () => {
		const fast = validateContactSubmission(valid({ startedAt: Date.now() }));
		expect(fast).toMatchObject({ ok: false, status: 429 });
		expect(validateContactSubmission(valid({ startedAt: null }))).toMatchObject({ ok: false, status: 400 });
	});
});
