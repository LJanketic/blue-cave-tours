import { SITE_EMAIL, SITE_NAME } from '../../config/site';
import { newId } from '../bookings/ids';
import { outbox, type OutboxEmail } from '../bookings/store';
import { PAYMENTS_ARE_DEMO } from '../../config/payments';

export type EmailMessage = Pick<OutboxEmail, 'kind' | 'to' | 'replyTo' | 'subject' | 'html' | 'text' | 'relatedId'>;

/** Where admin notifications go. Defaults to the address on the contact page. */
export function adminEmail(): string {
	return process.env.ADMIN_EMAIL || SITE_EMAIL;
}

export const DELIVERY_LABELS: Record<OutboxEmail['delivery'], string> = {
	outbox: 'Not sent (demo)',
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

/** True once a real email provider is configured; until then emails only reach the admin outbox. */
export function emailDeliveryEnabled(): boolean {
	return Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);
}

/**
 * Records the email in the outbox (shown in the admin), then delivers it
 * through Brevo when `BREVO_API_KEY` and `EMAIL_FROM` are set. Until then the
 * outbox is the whole delivery: the showcase runs end to end with no account.
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

	const apiKey = process.env.BREVO_API_KEY;
	const from = process.env.EMAIL_FROM;
	if (apiKey && from && mayDeliverTo(message.to)) {
		try {
			const res = await fetch('https://api.brevo.com/v3/smtp/email', {
				method: 'POST',
				headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
				body: JSON.stringify({
					sender: { name: process.env.EMAIL_FROM_NAME || SITE_NAME, email: from },
					to: [{ email: message.to }],
					...(message.replyTo ? { replyTo: { email: message.replyTo } } : {}),
					subject: message.subject,
					htmlContent: message.html,
					textContent: message.text,
				}),
				signal: AbortSignal.timeout(8000),
			});
			email.delivery = res.ok ? 'sent' : 'failed';
			if (!res.ok) email.deliveryError = `Brevo responded ${res.status}`;
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
