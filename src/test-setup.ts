import { beforeEach, vi } from 'vitest';

/**
 * Tests never talk to the network or see real settings: a test that pays a
 * booking must not be able to email anyone. Each test starts with sending
 * settings cleared and a fetch that refuses; a test that wants a network
 * response stubs fetch itself with vi.stubGlobal.
 */
const SENDING_ENV = ['RESEND_API_KEY', 'EMAIL_SENDING', 'EMAIL_FROM', 'EMAIL_FROM_NAME', 'ADMIN_EMAIL', 'EMAIL_DEMO_ALLOWLIST'];

function refuseNetwork(input: unknown): Promise<Response> {
	return Promise.reject(new Error(`Network access is disabled in tests (fetch ${String(input)})`));
}

beforeEach(() => {
	for (const name of SENDING_ENV) delete process.env[name];
	vi.stubGlobal('fetch', refuseNetwork);
});
