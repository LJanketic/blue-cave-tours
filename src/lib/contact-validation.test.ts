import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EMAIL_RE, asciiEmail, type ContactFields, validateContactSubmission } from './contact-validation';

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

describe('EMAIL_RE', () => {
	it.each(['jane@example.com', 'j.o+tag@mail.example.co.uk', "o'brien@x.ie", 'a_b-c@sub-domain.example.hr', 'ana@žena.hr', 'ana@xn--ena-b3a.hr', 'posta@mail.hr'])('accepts %s', (email) => {
		expect(EMAIL_RE.test(email)).toBe(true);
	});

	// Each of these once passed, and `?`/`&`/`,` reach mailto links as extra headers or recipients.
	it.each(['a@b.co?bcc=evil%40x.com', 'a@b.co,c', 'a@b.co>', 'a@<b>.com', 'a@b.co&cc=x@y.z', 'a b@c.co', 'a@b', 'a@-b.co', 'ana@žena.h1', 'pošta@mail.hr'])('rejects %s', (email) => {
		expect(EMAIL_RE.test(email)).toBe(false);
	});

	it('turns an accented host name into its ASCII form', () => {
		expect(asciiEmail('ana@žena.hr')).toBe('ana@xn--ena-b3a.hr');
		expect(asciiEmail('Jane@Example.com')).toBe('Jane@example.com');
	});

	it('is the same pattern the booking form checks in the browser', () => {
		const vue = readFileSync(new URL('../components/vue/GroupBookingFlow.vue', import.meta.url), 'utf8');
		expect(vue).toContain(`/${EMAIL_RE.source}/${EMAIL_RE.flags}`);
	});
});
