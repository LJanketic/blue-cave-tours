import { defineConfig, devices } from '@playwright/test';

/**
 * Visual, accessibility and end-to-end tests. Run locally, not in CI: fonts
 * and rendering differ on CI runners, so screenshots wouldn't match.
 *
 *   pnpm test:visual   screenshots (Chromium + WebKit)
 *   pnpm test:e2e      flows (Chromium + WebKit + Firefox)
 *
 * The dev server runs with email switched off: no test can send real mail.
 * CONTEXT=playwright gives it its own Blobs stores (see scopedName in
 * src/lib/bookings/store.ts), so tests never read or wipe your local dev
 * bookings. Each run also poses as its own client IP, so the admin login
 * rate limit (5 per 10 minutes) doesn't carry over between runs.
 */
const PORT = 4329;
const RUN_IP = `198.51.100.${Math.floor(Math.random() * 250) + 1}`;

export default defineConfig({
	testDir: 'tests',
	fullyParallel: false,
	workers: 1,
	reporter: [['list']],
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: 'retain-on-failure',
		extraHTTPHeaders: { 'x-nf-client-connection-ip': RUN_IP },
	},
	expect: {
		toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled', caret: 'hide' },
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'webkit', use: { ...devices['Desktop Safari'] } },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] }, testMatch: /e2e\// },
	],
	webServer: {
		command: `pnpm exec astro dev --port ${PORT}`,
		url: `http://localhost:${PORT}/`,
		reuseExistingServer: false,
		timeout: 120_000,
		// Every run sends charter requests, contact messages and admin logins into the same store: lift the hourly caps
		// on everyone together for tests. DEMO_CHECKOUT=open lets the booking flows pay with the demo checkout;
		// tests/e2e/demo-checkout-gate.spec.ts closes it per request (a dev-only header) to test what guests on production see.
		// ASTRO_DEV_BACKGROUND=0: Astro 7 sends `astro dev` to the background when it detects an AI agent,
		// and Playwright would take the early exit as a crash. Every run also books and pays the same departures:
		// CAPACITY_CHECKS=off (dev only) skips the "sold out" refusals (src/lib/bookings/capacity.ts).
		env: {
			ASTRO_DEV_BACKGROUND: '0',
			CONTEXT: 'playwright',
			RESEND_API_KEY: '',
			EMAIL_SENDING: '',
			ADMIN_EMAIL: '',
			ADMIN_PASSWORD: '',
			CHARTER_HOURLY_CAP: '10000',
			CONTACT_HOURLY_CAP: '10000',
			ADMIN_LOGIN_HOURLY_CAP: '10000',
			PAYMENTS_MODE: '',
			DEMO_CHECKOUT: 'open',
			CAPACITY_CHECKS: 'off',
		},
	},
});
