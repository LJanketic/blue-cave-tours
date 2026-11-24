import { afterEach, describe, expect, it, vi } from 'vitest';
import { emailSendingOn } from './send';

afterEach(() => vi.unstubAllEnvs());

describe('real email on deploy previews (W0 review S3)', () => {
	it('never sends from a deploy preview, even with a Resend key and EMAIL_SENDING=on', () => {
		vi.stubEnv('RESEND_API_KEY', 're_test');
		vi.stubEnv('EMAIL_SENDING', 'on');
		vi.stubEnv('CONTEXT', 'production');
		expect(emailSendingOn()).toBe(true);
		vi.stubEnv('CONTEXT', 'deploy-preview');
		expect(emailSendingOn()).toBe(false);
	});
});
