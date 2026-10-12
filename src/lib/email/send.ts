import { SITE_NAME } from '../../config/site';
import { newId } from '../bookings/ids';
import { outbox, type OutboxEmail } from '../bookings/store';
import { PAYMENTS_ARE_DEMO } from '../../config/payments';

export type EmailMessage = Pick<OutboxEmail, 'kind' | 'to' | 'replyTo' | 'subject' | 'html' | 'text' | 'relatedId'>;

/**
 * Where admin notifications go: ADMIN_EMAIL, and nothing else. With it unset,
 * admin notifications are saved in the admin but never sent anywhere.
 */
export function adminEmail(): string {
	return process.env.ADMIN_EMAIL?.trim() ?? '';
}

export const DELIVERY_LABELS: Record<OutboxEmail['delivery'], string> = {
	outbox: 'Not sent',
	sent: 'Sent',
	failed: 'Failed',
};

/**
 * While payments are a demo, real delivery is limited to the admin address
 * and EMAIL_DEMO_ALLOWLIST (comma-separated), so the public demo checkout
 * can't be used to send "Booking confirmed" emails to arbitrary people.
 */
function mayDeliverTo(address: string): boolean {
	if (!PAYMENTS_ARE_DEMO) return true;
	const allowed = [adminEmail(), ...(process.env.EMAIL_DEMO_ALLOWLIST ?? '').split(',')]
		.map((a) => a.trim().toLowerCase())
		.filter(Boolean);
	return allowed.includes(address.trim().toLowerCase());
}

/**
 * Resend's shared test sender. It needs no domain, but Resend only delivers it
 * to the email address the Resend account was created with.
 */
export const RESEND_TEST_SENDER = 'onboarding@resend.dev';

/**
 * Real sending is opt-in per Netlify deploy: it needs the Resend key AND
 * EMAIL_SENDING=on. Without both, emails are only saved in the admin outbox,
 * quietly; nothing warns about it.
 */
export function emailSendingOn(): boolean {
	return Boolean(process.env.RESEND_API_KEY) && process.env.EMAIL_SENDING?.trim().toLowerCase() === 'on';
}

/** The From address: EMAIL_FROM once our domain is verified in Resend, the test sender until then. */
export function emailSender(): { name: string; address: string; isTestSender: boolean } {
	const address = process.env.EMAIL_FROM || RESEND_TEST_SENDER;
	return { name: process.env.EMAIL_FROM_NAME || SITE_NAME, address, isTestSender: address === RESEND_TEST_SENDER };
}

/** Resend's error text (e.g. "You can only send testing emails to your own email address"), kept short. Never includes the key. */
async function resendError(res: Response): Promise<string> {
	let detail = '';
	try {
		const body = (await res.json()) as { message?: unknown };
		if (typeof body.message === 'string') detail = `: ${body.message.slice(0, 200)}`;
	} catch {
		// Not JSON: the status code is all we have.
	}
	return `Resend responded ${res.status}${detail}`;
}

/**
 * Records the email in the outbox (shown in the admin), then delivers it
 * through Resend when sending is switched on in Netlify (see
 * `emailSendingOn`). Otherwise the outbox is the whole delivery: the showcase
 * runs end to end with no account.
 *
 * Never throws. A booking must not fail because an email couldn't be sent.
 */
export async function sendEmail(message: EmailMessage): Promise<OutboxEmail> {
	const email: OutboxEmail = {
		...message,
		id: newId(),
		createdAt: new Date().toISOString(),
		delivery: 'outbox',
	};

	const apiKey = process.env.RESEND_API_KEY;
	if (apiKey && emailSendingOn() && message.to && mayDeliverTo(message.to)) {
		const sender = emailSender();
		try {
			const res = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${apiKey}`,
					'Content-Type': 'application/json',
					// Same outbox record, same email: Resend drops a repeat within 24 hours.
					'Idempotency-Key': email.id,
				},
				body: JSON.stringify({
					from: `${sender.name.replace(/[<>"]/g, '')} <${sender.address}>`,
					to: [message.to],
					...(message.replyTo ? { reply_to: message.replyTo } : {}),
					subject: message.subject,
					html: message.html,
					text: message.text,
				}),
				signal: AbortSignal.timeout(8000),
			});
			email.delivery = res.ok ? 'sent' : 'failed';
			if (!res.ok) email.deliveryError = await resendError(res);
		} catch (error) {
			email.delivery = 'failed';
			email.deliveryError = error instanceof Error ? error.message : 'Unknown error';
		}
	}

	try {
		await outbox().put(email);
	} catch (error) {
		console.error('[email] could not record outbox entry', error);
	}
	return email;
}
