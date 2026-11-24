/**
 * Payment mode, from PAYMENTS_MODE. Only the exact value `live` switches real
 * payments on; unset, empty or anything else (a typo included) means demo,
 * so a missing setting can never take money or drop the demo labels.
 *
 * Read through import.meta.env, so Astro fixes the value at build time: the
 * prerendered pages (TrustStrip) and the server-rendered checkout always agree.
 * After changing it in Netlify, redeploy.
 */
export type PaymentsMode = 'demo' | 'live';

export function paymentsMode(raw: string | undefined): PaymentsMode {
	return raw?.trim() === 'live' ? 'live' : 'demo';
}

// `?.`: import.meta.env is undefined in the hourly function's bundle (built without Vite), which reads this through
// src/lib/email/send.ts; unset there means demo, so delivery stays limited to the admin and the allowlist.
export const PAYMENTS_MODE: PaymentsMode = paymentsMode(import.meta.env?.PAYMENTS_MODE);

/**
 * True while checkout is the showcase mock (src/pages/booking/pay.astro): no
 * money moves and the račun isn't fiscalized. Customer pages and emails say so
 * wherever they mention payment or the invoice. Set PAYMENTS_MODE=live only
 * when real Teya/PayPal payments and fiscalization are wired in.
 */
export const PAYMENTS_ARE_DEMO = PAYMENTS_MODE === 'demo';

/**
 * DEMO_CHECKOUT=open lets everyone use the demo checkout, but only on a build
 * that isn't a public one: `astro dev` (`pnpm dev` and the Playwright server)
 * and Netlify deploy previews and branch deploys (netlify.toml). Only the
 * exact value `open` counts. Any other build is closed whatever the setting:
 * production, and also a local `pnpm build` (no CONTEXT) deployed by hand,
 * so neither a setting copied to every context in Netlify nor a stray .env
 * can open the fake checkout to the public. There, staff use the demo-access
 * cookie from /admin/tools instead (src/lib/demo-access.ts). Inlined at build
 * time, like PAYMENTS_MODE.
 */
const DEMO_OPEN_CONTEXTS = ['deploy-preview', 'branch-deploy'];

export function demoCheckoutFlag(raw: string | undefined, context: string | undefined, dev: boolean): boolean {
	if (raw?.trim() !== 'open' || context === 'production') return false;
	return dev || DEMO_OPEN_CONTEXTS.includes(context ?? '');
}

export const DEMO_CHECKOUT_OPEN = demoCheckoutFlag(import.meta.env?.DEMO_CHECKOUT, import.meta.env?.CONTEXT, Boolean(import.meta.env?.DEV));

/**
 * Whether this request may use the demo checkout (the Pay buttons and their
 * POST). Never once payments are live: the demo buttons would mark a booking
 * paid with no money taken. In demo mode only when the build opened it for
 * everyone, or the browser carries a valid demo-access cookie an admin set.
 * Everyone else sees that online payment isn't open yet.
 */
export function demoCheckoutAllowed({ mode, openFlag, cookieValid }: { mode: PaymentsMode; openFlag: boolean; cookieValid: boolean }): boolean {
	if (mode !== 'demo') return false;
	return openFlag || cookieValid;
}
