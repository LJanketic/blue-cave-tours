import { describe, expect, it } from 'vitest';
import { checkRateLimit, getClientIp } from './rate-limit';

describe('getClientIp', () => {
	it('prefers Netlify client connection header', () => {
		const request = new Request('https://example.com', {
			headers: {
				'x-nf-client-connection-ip': '203.0.113.10',
				'x-forwarded-for': '198.51.100.1',
			},
		});
		expect(getClientIp(request)).toBe('203.0.113.10');
	});

	it('falls back to first x-forwarded-for hop', () => {
		const request = new Request('https://example.com', {
			headers: { 'x-forwarded-for': '198.51.100.1, 10.0.0.1' },
		});
		expect(getClientIp(request)).toBe('198.51.100.1');
	});
});

describe('checkRateLimit', () => {
	it('allows requests under the limit', () => {
		const key = `test-${Date.now()}`;
		expect(checkRateLimit(key, 2, 60_000).ok).toBe(true);
		expect(checkRateLimit(key, 2, 60_000).ok).toBe(true);
	});

	it('blocks after the limit is exceeded', () => {
		const key = `test-block-${Date.now()}`;
		expect(checkRateLimit(key, 1, 60_000).ok).toBe(true);
		const blocked = checkRateLimit(key, 1, 60_000);
		expect(blocked.ok).toBe(false);
		if (!blocked.ok) expect(blocked.retryAfterSec).toBeGreaterThan(0);
	});
});
