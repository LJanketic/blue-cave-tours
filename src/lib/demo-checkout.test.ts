import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoCheckoutAllowed, demoCheckoutFlag, paymentsMode } from '../config/payments';
import { createDemoAccessToken, demoAccessConfigured, demoAccessCookieOptions, demoAccessExpiry, DEMO_ACCESS_DAYS, testHeaderClosesGate, verifyDemoAccessToken } from './demo-access';
import { createSessionToken } from './admin/auth';
import { getTourBySlug } from './tours';
import type { TourDetail } from '../types/tour';
import { applyAdminAction, createPendingBooking, DEMO_INVOICE_COUNTER, finalizePaidBooking, INVOICE_COUNTER, notifyPaymentNotOpen, ADMIN_NOTIFY_DAILY_CAP } from './bookings/service';
import { bookings, nextCounterValue, outbox, resetMemoryStore } from './bookings/store';
import { loadSampleData } from './admin/sample-data';

/**
 * The demo checkout gate (plan W0-A): on production, while payments are a
 * demo, only an admin-enabled browser may use the fake Pay buttons; demo
 * payments never use up real invoice numbers.
 */

describe('payment mode and the demo checkout gate', () => {
	it('is live only for the exact value `live`', () => {
		expect(paymentsMode('live')).toBe('live');
		expect(paymentsMode(' live ')).toBe('live');
		for (const raw of [undefined, '', 'Live', 'LIVE', 'lvie', 'true', 'demo']) expect(paymentsMode(raw), String(raw)).toBe('demo');
	});

	it('opens to everyone only for DEMO_CHECKOUT=open, on astro dev, deploy previews and branch deploys', () => {
		// astro dev: `pnpm dev` and the Playwright server.
		expect(demoCheckoutFlag('open', undefined, true)).toBe(true);
		expect(demoCheckoutFlag('open', 'playwright', true)).toBe(true);
		expect(demoCheckoutFlag('open', 'deploy-preview', false)).toBe(true);
		expect(demoCheckoutFlag('open', 'branch-deploy', false)).toBe(true);
		for (const raw of [undefined, '', 'Open', 'yes', 'true', '1']) expect(demoCheckoutFlag(raw, 'deploy-preview', false), String(raw)).toBe(false);
	});

	it('stays closed on any other build: production, and a local `pnpm build` deployed by hand', () => {
		expect(demoCheckoutFlag('open', 'production', false)).toBe(false);
		// Production stays closed even in a dev server (e.g. `netlify dev --context production`).
		expect(demoCheckoutFlag('open', 'production', true)).toBe(false);
		expect(demoCheckoutFlag('open', undefined, false)).toBe(false);
		expect(demoCheckoutFlag('open', '', false)).toBe(false);
		expect(demoCheckoutFlag('open', 'playwright', false)).toBe(false);
		expect(demoCheckoutFlag('open', 'dev', false)).toBe(false);
	});

	it('allows the demo checkout in demo mode with the flag or a valid cookie, and never once payments are live', () => {
		expect(demoCheckoutAllowed({ mode: 'demo', openFlag: false, cookieValid: false })).toBe(false);
		expect(demoCheckoutAllowed({ mode: 'demo', openFlag: true, cookieValid: false })).toBe(true);
		expect(demoCheckoutAllowed({ mode: 'demo', openFlag: false, cookieValid: true })).toBe(true);
		expect(demoCheckoutAllowed({ mode: 'live', openFlag: true, cookieValid: true })).toBe(false);
		expect(demoCheckoutAllowed({ mode: 'live', openFlag: false, cookieValid: false })).toBe(false);
	});

	describe('read from the build environment', () => {
		afterEach(() => {
			vi.unstubAllEnvs();
			vi.resetModules();
		});

		it('PAYMENTS_MODE=live drops the demo, and DEMO_CHECKOUT is ignored on production', async () => {
			vi.stubEnv('PAYMENTS_MODE', 'live');
			vi.stubEnv('DEMO_CHECKOUT', 'open');
			vi.stubEnv('CONTEXT', 'production');
			vi.resetModules();
			const live = await import('../config/payments');
			expect(live.PAYMENTS_MODE).toBe('live');
			expect(live.PAYMENTS_ARE_DEMO).toBe(false);
			expect(live.DEMO_CHECKOUT_OPEN).toBe(false);
		});

		it('a built site without a preview context (a local `pnpm build`) ignores DEMO_CHECKOUT=open', async () => {
			vi.stubEnv('DEV', false);
			vi.stubEnv('DEMO_CHECKOUT', 'open');
			vi.stubEnv('CONTEXT', '');
			vi.resetModules();
			expect((await import('../config/payments')).DEMO_CHECKOUT_OPEN).toBe(false);
			vi.stubEnv('CONTEXT', 'deploy-preview');
			vi.resetModules();
			expect((await import('../config/payments')).DEMO_CHECKOUT_OPEN).toBe(true);
		});

		it('unset means demo, with the checkout closed', async () => {
			vi.stubEnv('PAYMENTS_MODE', '');
			vi.stubEnv('DEMO_CHECKOUT', '');
			vi.resetModules();
			const demo = await import('../config/payments');
			expect(demo.PAYMENTS_ARE_DEMO).toBe(true);
			expect(demo.DEMO_CHECKOUT_OPEN).toBe(false);
		});

		it('refuses to load demo data once payments are live', async () => {
			vi.stubEnv('PAYMENTS_MODE', 'live');
			vi.resetModules();
			const sample = await import('./admin/sample-data');
			await expect(sample.loadSampleData()).rejects.toThrow(/showcase only/);
			await expect(sample.clearAllData()).rejects.toThrow(/showcase only/);
		});
	});
});

describe('demo-access cookie', () => {
	const NOW = 1_800_000_000_000;

	afterEach(() => {
		delete process.env.DEMO_ACCESS_SECRET;
		delete process.env.ADMIN_SESSION_SECRET;
		delete process.env.ADMIN_PASSWORD;
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	it('is valid for 30 days, and not after', () => {
		process.env.DEMO_ACCESS_SECRET = 'd'.repeat(44);
		const token = createDemoAccessToken(NOW) as string;
		expect(token).toMatch(/^v1\.\d+\.[\w-]+$/);
		expect(verifyDemoAccessToken(token, NOW + 60_000)).toBe(true);
		expect(demoAccessExpiry(token, NOW)).toBe(NOW + DEMO_ACCESS_DAYS * 86_400_000);
		expect(verifyDemoAccessToken(token, NOW + DEMO_ACCESS_DAYS * 86_400_000 + 1)).toBe(false);
	});

	it('breaks when tampered with, or when the secret changes', () => {
		process.env.DEMO_ACCESS_SECRET = 'd'.repeat(44);
		const token = createDemoAccessToken(NOW) as string;
		const [version, expires, signature] = token.split('.');
		// A later expiry with the old signature.
		expect(verifyDemoAccessToken(`${version}.${Number(expires) + 86_400_000}.${signature}`, NOW)).toBe(false);
		expect(verifyDemoAccessToken(`${token}x`, NOW)).toBe(false);
		expect(verifyDemoAccessToken(`${token}.extra`, NOW)).toBe(false);
		expect(verifyDemoAccessToken(`v2.${expires}.${signature}`, NOW)).toBe(false);
		expect(verifyDemoAccessToken('', NOW)).toBe(false);
		expect(verifyDemoAccessToken(undefined, NOW)).toBe(false);
		expect(verifyDemoAccessToken('yes', NOW)).toBe(false);
		process.env.DEMO_ACCESS_SECRET = 'e'.repeat(44);
		expect(verifyDemoAccessToken(token, NOW)).toBe(false);
	});

	it('is not an admin session, and an admin session is not demo access', () => {
		process.env.ADMIN_PASSWORD = 'sea-breeze';
		process.env.ADMIN_SESSION_SECRET = 'a'.repeat(44);
		process.env.DEMO_ACCESS_SECRET = 'a'.repeat(44);
		const session = createSessionToken(NOW) as string;
		expect(verifyDemoAccessToken(session, NOW)).toBe(false);
		expect(verifyDemoAccessToken(`v1.${session}`, NOW)).toBe(false);
	});

	it('on a production build, needs DEMO_ACCESS_SECRET: without it no cookie is issued or accepted', () => {
		vi.stubEnv('DEV', false);
		vi.spyOn(console, 'error').mockImplementation(() => {});
		process.env.DEMO_ACCESS_SECRET = 'd'.repeat(44);
		const token = createDemoAccessToken(NOW) as string;
		delete process.env.DEMO_ACCESS_SECRET;
		expect(demoAccessConfigured()).toBe(false);
		expect(createDemoAccessToken(NOW)).toBeNull();
		expect(verifyDemoAccessToken(token, NOW)).toBe(false);
		// Not even the admin session secret stands in for it.
		process.env.ADMIN_SESSION_SECRET = 'a'.repeat(44);
		expect(createDemoAccessToken(NOW)).toBeNull();
	});

	it('is HttpOnly, Lax, site-wide and kept 30 days', () => {
		expect(demoAccessCookieOptions()).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/', maxAge: 30 * 86_400 });
	});

	it('the dev-only test header can close the gate, and does nothing on a production build', () => {
		const headers = new Headers({ 'x-hbc-demo-checkout': 'closed' });
		expect(testHeaderClosesGate(headers)).toBe(true);
		expect(testHeaderClosesGate(new Headers({ 'x-hbc-demo-checkout': 'open' }))).toBe(false);
		vi.stubEnv('DEV', false);
		expect(testHeaderClosesGate(headers)).toBe(false);
	});
});

const NOW = new Date('2027-06-01T10:00:00Z');
const tour = getTourBySlug('blue-cave-hvar-5-islands') as TourDetail;

async function pending() {
	const result = await createPendingBooking(
		tour,
		{ date: '2027-07-15', slot: '07:20', adults: 2, children: 1, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', phone: '+44 7700 900123', notes: null },
		NOW,
	);
	if (!result.ok) throw new Error(result.error);
	return result.booking;
}

describe('demo invoices', () => {
	beforeEach(() => resetMemoryStore());

	it('use their own DEMO- series and never a number from the real invoice counter', async () => {
		const a = await finalizePaidBooking((await pending()).id, 'teya', 'DEMO-TEYA-1', 'https://example.test', NOW);
		const b = await finalizePaidBooking((await pending()).id, 'paypal', 'DEMO-PP-2', 'https://example.test', NOW);
		expect(a?.invoice?.number).toBe('DEMO-1/HBC1/1');
		expect(b?.invoice?.number).toBe('DEMO-2/HBC1/1');
		expect(DEMO_INVOICE_COUNTER).not.toBe(INVOICE_COUNTER);
		// The real series was never touched: its first number is still 1.
		expect(await nextCounterValue(INVOICE_COUNTER)).toBe(1);
	});

	it('demo data numbers its paid bookings in the DEMO- series too', async () => {
		await loadSampleData(new Date('2027-07-01T08:00:00Z'));
		const numbers = (await bookings().list()).flatMap((b) => (b.invoice ? [b.invoice.number] : []));
		expect(numbers.length).toBeGreaterThan(0);
		expect(numbers.every((n) => /^DEMO-\d+\/HBC1\/1$/.test(n))).toBe(true);
		expect(new Set(numbers).size).toBe(numbers.length);
		expect(await nextCounterValue(INVOICE_COUNTER)).toBe(1);
	});
});

describe('notifyPaymentNotOpen', () => {
	beforeEach(() => resetMemoryStore());

	it('emails the admin once per booking, and leaves it awaiting payment', async () => {
		const booking = await pending();
		const results = await Promise.all([1, 2, 3].map(() => notifyPaymentNotOpen(booking.id, 'https://example.test', NOW)));
		expect(results.filter(Boolean)).toHaveLength(1);
		expect(await notifyPaymentNotOpen(booking.id, 'https://example.test', NOW)).toBe(false);

		const emails = await outbox().list();
		expect(emails).toHaveLength(1);
		expect(emails[0].kind).toBe('admin_booking');
		expect(emails[0].subject).toMatch(/^Not paid yet HBC-/);
		expect(emails[0].text).toContain("online payment isn't open yet, so nothing was paid");
		expect(emails[0].text).toContain(`https://example.test/admin/bookings/${booking.id}/`);
		expect(emails[0].text).not.toMatch(/\bpaid with\b|Invoice/i);

		const stored = await bookings().get(booking.id);
		expect(stored?.status).toBe('pending_payment');
		expect(stored?.paymentStatus).toBe('unpaid');
		expect(stored?.invoice).toBeNull();
		expect(stored?.paymentNotOpenNotifiedAt).toBe(NOW.toISOString());
		expect(stored?.emailIds).toEqual([emails[0].id]);
	});

	it('says nothing about a booking that is paid or cancelled', async () => {
		const paid = await pending();
		await finalizePaidBooking(paid.id, 'teya', 'T-1', 'https://example.test', NOW);
		const cancelled = await pending();
		await applyAdminAction(cancelled.id, { type: 'status', status: 'cancelled' }, 'Admin', NOW);
		const before = (await outbox().list()).length;
		expect(await notifyPaymentNotOpen(paid.id, 'https://example.test', NOW)).toBe(false);
		expect(await notifyPaymentNotOpen(cancelled.id, 'https://example.test', NOW)).toBe(false);
		expect(await outbox().list()).toHaveLength(before);
	});

	it('stops emailing past the daily cap, so a flood of bookings cannot burn the email quota', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const ids = [];
		for (let i = 0; i <= ADMIN_NOTIFY_DAILY_CAP; i++) ids.push((await pending()).id);
		for (const id of ids) await notifyPaymentNotOpen(id, 'https://example.test', NOW);
		expect(await outbox().list()).toHaveLength(ADMIN_NOTIFY_DAILY_CAP);
		// Still recorded on the booking, so it is never emailed later either.
		expect((await bookings().get(ids.at(-1) as string))?.paymentNotOpenNotifiedAt).toBe(NOW.toISOString());
		vi.restoreAllMocks();
	});
});
