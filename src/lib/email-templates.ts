import { SITE_EMAIL, SITE_MEETING_POINT, SITE_NAME } from '../config/site';
import type { BookingEmailPayload, ContactEmailPayload } from './email';

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function layout(title: string, body: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;max-width:560px;margin:0 auto;padding:24px">
${body}
<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
<p style="font-size:12px;color:#64748b">${escapeHtml(SITE_NAME)} · ${escapeHtml(SITE_EMAIL)}</p>
</body></html>`;
}

export function bookingGuestEmail(payload: BookingEmailPayload): { subject: string; html: string } {
	const subject = `${SITE_NAME} — booking confirmed`;
	const html = layout(
		subject,
		`
<p>Hi ${escapeHtml(payload.customerName)},</p>
<p>Thank you for booking with <strong>${escapeHtml(SITE_NAME)}</strong>.</p>
<table style="width:100%;border-collapse:collapse;font-size:15px">
<tr><td style="padding:6px 0;color:#64748b">Tour</td><td><strong>${escapeHtml(payload.tourSlug)}</strong></td></tr>
<tr><td style="padding:6px 0;color:#64748b">Date</td><td>${escapeHtml(payload.tourDate)}</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Guests</td><td>${payload.adults} adult(s), ${payload.children} child(ren), ${payload.infants} infant(s)</td></tr>
<tr><td style="padding:6px 0;color:#64748b">Reference</td><td>${escapeHtml(payload.orderId)}</td></tr>
</table>
<p><strong>Meeting point:</strong> ${escapeHtml(SITE_MEETING_POINT)}</p>
<p>We will follow up with any last details before your tour. If you have questions, reply to this email.</p>
`,
	);
	return { subject, html };
}

export function bookingOpsEmail(payload: BookingEmailPayload): { subject: string; html: string } {
	const subject = `${SITE_NAME} — new booking ${payload.orderId}`;
	const html = layout(
		subject,
		`
<p><strong>New paid booking</strong></p>
<ul>
<li>Tour: ${escapeHtml(payload.tourSlug)}</li>
<li>Date: ${escapeHtml(payload.tourDate)}</li>
<li>Party: ${payload.adults}A / ${payload.children}C / ${payload.infants}I</li>
<li>Guest: ${escapeHtml(payload.customerName)} &lt;${escapeHtml(payload.customerEmail)}&gt; ${escapeHtml(payload.customerPhone ?? '')}</li>
<li>Total: ${payload.total} ${escapeHtml(payload.currency)}</li>
<li>PayPal order: ${escapeHtml(payload.orderId)}</li>
</ul>
`,
	);
	return { subject, html };
}

export function contactOpsEmail(payload: ContactEmailPayload): { subject: string; html: string } {
	const subject = `${SITE_NAME} — contact from ${payload.name}`;
	const html = layout(
		subject,
		`
<p><strong>Contact form</strong></p>
<ul>
<li>Name: ${escapeHtml(payload.name)}</li>
<li>Email: ${escapeHtml(payload.email)}</li>
<li>Phone: ${escapeHtml(payload.phone ?? '—')}</li>
<li>Tour: ${escapeHtml(payload.tourSlug ?? '—')}</li>
</ul>
<p>${escapeHtml(payload.message).replace(/\n/g, '<br>')}</p>
`,
	);
	return { subject, html };
}
