import { describe, expect, it } from 'vitest';
import { CONTACT_MIN_SUBMIT_MS } from './contact-validation';
import { confirmFormResponse, confirmStartedAt } from './form-confirm';

/** The hidden fields of a confirm page, decoded, as the browser would post them back. */
async function confirmFields(response: Response): Promise<Record<string, string>> {
	const html = await response.text();
	const decode = (s: string) => s.replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)));
	return Object.fromEntries([...html.matchAll(/<input type="hidden" name="([^"]*)" value="([^"]*)">/g)].map(([, name, value]) => [decode(name), decode(value)]));
}

describe('confirm step for plain form posts (S5)', () => {
	const NOW = 1_800_000_000_000;

	it('carries the fields back with a server start time, and drops the honeypot, old time and Turnstile token', async () => {
		const res = confirmFormResponse(
			{ action: '/api/contact', fields: { email: 'jane@example.com', message: 'Hi there', company: '', _startedAt: '', turnstileToken: 'x', 'cf-turnstile-response': 'y' } },
			NOW,
		);
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toContain('text/html');
		expect(res.headers.get('cache-control')).toBe('no-store');
		expect(await confirmFields(res)).toEqual({ email: 'jane@example.com', message: 'Hi there', _startedAt: String(confirmStartedAt(NOW)) });
	});

	it('escapes what was typed, so it stays text', async () => {
		const res = confirmFormResponse({ action: '/api/contact', fields: { message: '"><script>alert(1)</script>' } }, NOW);
		const html = await res.clone().text();
		expect(html).not.toContain('<script>');
		expect((await confirmFields(res)).message).toBe('"><script>alert(1)</script>');
	});

	it('needs the confirm page open for a second, not the full minimum', () => {
		expect(NOW + 1000 - confirmStartedAt(NOW)).toBe(CONTACT_MIN_SUBMIT_MS);
	});
});
