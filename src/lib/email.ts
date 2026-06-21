import nodemailer from 'nodemailer';
import { SITE_EMAIL } from '../config/site';
import { bookingGuestEmail, bookingOpsEmail, contactOpsEmail } from './email-templates';
import { isSmtpConfigured } from './env';

export type BookingEmailPayload = {
	tourSlug: string;
	tourDate: string;
	adults: number;
	children: number;
	infants: number;
	customerName: string;
	customerEmail: string;
	customerPhone?: string;
	total: number;
	currency: string;
	orderId: string;
};

export type ContactEmailPayload = {
	name: string;
	email: string;
	phone?: string;
	tourSlug?: string;
	message: string;
};

function getTransport() {
	if (!isSmtpConfigured()) return null;
	const port = Number.parseInt(import.meta.env.SMTP_PORT ?? '587', 10);
	return nodemailer.createTransport({
		host: import.meta.env.SMTP_HOST,
		port,
		secure: port === 465,
		auth: {
			user: import.meta.env.SMTP_USER,
			pass: import.meta.env.SMTP_PASS,
		},
	});
}

export async function sendBookingEmails(payload: BookingEmailPayload): Promise<boolean> {
	const transport = getTransport();
	if (!transport) {
		if (import.meta.env.DEV) console.info('[email] booking (skipped — SMTP not configured)', payload);
		return false;
	}
	const from = import.meta.env.SMTP_FROM ?? SITE_EMAIL;
	const to = import.meta.env.SMTP_TO ?? SITE_EMAIL;
	const guest = bookingGuestEmail(payload);
	const ops = bookingOpsEmail(payload);
	await transport.sendMail({
		from,
		to: payload.customerEmail,
		subject: guest.subject,
		html: guest.html,
	});
	await transport.sendMail({
		from,
		to,
		replyTo: payload.customerEmail,
		subject: ops.subject,
		html: ops.html,
	});
	return true;
}

export async function sendContactEmail(payload: ContactEmailPayload): Promise<boolean> {
	const transport = getTransport();
	if (!transport) {
		if (import.meta.env.DEV) console.info('[email] contact (skipped — SMTP not configured)', payload);
		return false;
	}
	const from = import.meta.env.SMTP_FROM ?? SITE_EMAIL;
	const to = import.meta.env.SMTP_TO ?? SITE_EMAIL;
	const mail = contactOpsEmail(payload);
	await transport.sendMail({
		from,
		to,
		replyTo: payload.email,
		subject: mail.subject,
		html: mail.html,
	});
	return true;
}
