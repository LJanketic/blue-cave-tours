import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS } from './security-headers';

/** The `[headers.values]` of netlify.toml's `for = "/*"` block. */
function netlifyRootHeaders(): Record<string, string> {
	const toml = readFileSync('netlify.toml', 'utf8');
	const block = toml.split('[[headers]]').find((b) => /for\s*=\s*"\/\*"/.test(b));
	if (!block) throw new Error('netlify.toml has no headers block for "/*"');
	const values: Record<string, string> = {};
	for (const line of block.split('\n')) {
		const match = /^\s*([A-Za-z-]+)\s*=\s*"(.*)"\s*$/.exec(line);
		if (match && match[1] !== 'for') values[match[1]] = match[2];
	}
	return values;
}

describe('security headers', () => {
	it('match netlify.toml, so server-rendered pages get what prerendered pages get', () => {
		expect(SECURITY_HEADERS).toEqual(netlifyRootHeaders());
	});

	it('forbid framing', () => {
		expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
		expect(SECURITY_HEADERS['Content-Security-Policy']).toContain("frame-ancestors 'none'");
	});
});
