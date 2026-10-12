import { SITE_EMAIL, SITE_NAME, SITE_PHONE_DISPLAY } from '../../config/site';
import { CANCELLATION_FULL_PREFIX, CANCELLATION_FULL_SUFFIX, CANCELLATION_WINDOW } from '../../config/cancellation';
import { formatBookingDate, guestSummaryFromCounts, meetingPointShort } from '../booking';
import type { Booking, Enquiry } from '../bookings/store';
import { getTourBySlug } from '../tours';
import type { EmailMessage } from './send';
import { PAYMENTS_ARE_DEMO } from '../../config/payments';

export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

type Row = [label: string, value: string];

function rowsHtml(rows: Row[]): string {
	return rows
		.map(
			([label, value]) =>
				`<tr><td style="padding:6px 0;color:#555;font-size:14px;vertical-align:top;width:40%">${escapeHtml(label)}</td>` +
				`<td style="padding:6px 0;color:#111;font-size:14px;font-weight:600;text-align:right">${escapeHtml(value)}</td></tr>`,
		)
		.join('');
}

function rowsText(rows: Row[]): string {
	return rows.map(([label, value]) => `${label}: ${value}`).join('\n');
}

/** One shared shell: plain table layout and inline styles, which every mail client renders. */
function layout(heading: string, intro: string, body: string): string {
	return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px">
<tr><td style="font-size:13px;font-weight:600;color:#1d9e75;letter-spacing:.04em;text-transform:uppercase;padding-bottom:12px">${escapeHtml(SITE_NAME)}</td></tr>
<tr><td style="font-size:22px;font-weight:600;color:#111;padding-bottom:8px">${escapeHtml(heading)}</td></tr>
<tr><td style="font-size:15px;line-height:1.5;color:#333;padding-bottom:20px">${intro}</td></tr>
${body}
<tr><td style="font-size:12px;line-height:1.5;color:#767676;padding-top:24px;border-top:1px solid #e5e5e3">${escapeHtml(SITE_NAME)} · Riva promenade, stand 14, Split, Croatia<br>${escapeHtml(SITE_PHONE_DISPLAY)} · ${escapeHtml(SITE_EMAIL)}</td></tr>
</table></td></tr></table></body></html>`;
}

function section(title: string, rows: Row[]): string {
	return `<tr><td style="padding-bottom:20px"><div style="font-size:13px;font-weight:600;color:#111;padding-bottom:6px;border-bottom:1px solid #e5e5e3">${escapeHtml(title)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml(rows)}</table></td></tr>`;
}

function paragraph(html: string): string {
	return `<tr><td style="font-size:14px;line-height:1.5;color:#333;padding-bottom:16px">${html}</td></tr>`;
}

function bookingRows(booking: Booking): Row[] {
	const rows: Row[] = [
		['Booking ref', booking.ref],
		['Tour', booking.tourTitle],
		['Date', formatBookingDate(booking.date)],
		['Guests', guestSummaryFromCounts(booking.adults, booking.children)],
	];
	if (booking.slot) rows.splice(3, 0, ['Departure', booking.slot]);
	return rows;
}

/** The JIR (fiscal code) goes to the admin only: on a demo račun it would make a customer email look like a real receipt. */
function paymentRows(booking: Booking, audience: 'customer' | 'admin'): Row[] {
	const demo = PAYMENTS_ARE_DEMO ? ' (demo, no money taken)' : '';
	const rows: Row[] = [
		['Total paid', `€${booking.total}${demo}`],
		['Paid with', booking.paymentProvider === 'paypal' ? 'PayPal' : 'Card'],
	];
	if (booking.invoice) {
		const label = PAYMENTS_ARE_DEMO ? ' (demo, not a valid receipt)' : '';
		rows.push(['Invoice (račun)', `${booking.invoice.number}${label}`]);
		if (audience === 'admin') rows.push(['JIR', booking.invoice.jir]);
	}
	return rows;
}

const DEMO_NOTICE = 'This is a demo booking. No payment was taken.';

export function bookingConfirmationEmail(booking: Booking): EmailMessage {
	const tour = getTourBySlug(booking.tourSlug);
	const meeting = tour ? meetingPointShort(tour.meetingPoint) : 'Riva stand 14';
	const bring = tour?.whatToBring.slice(0, 4).join(', ') ?? 'Sunscreen, swimwear, towel';
	const cancellation = `${CANCELLATION_FULL_PREFIX}${CANCELLATION_WINDOW}${CANCELLATION_FULL_SUFFIX}`;

	const tripRows: Row[] = [
		['Meeting point', `${meeting}, Split`],
		['Arrive', '15 minutes before departure'],
		['What to bring', bring],
	];

	const subject = `Booking confirmed: ${booking.tourTitle}, ${formatBookingDate(booking.date)} (${booking.ref})`;
	const html = layout(
		"You're booked!",
		`${PAYMENTS_ARE_DEMO ? `<strong>${DEMO_NOTICE}</strong><br><br>` : ''}Hi ${escapeHtml(booking.firstName)}, thanks for booking with us. Here are your details. Show this email or just tell the crew your name.`,
		section('Your booking', bookingRows(booking)) +
			section('Before you go', tripRows) +
			section('Payment', paymentRows(booking, 'customer')) +
			paragraph(`<strong>Cancellation:</strong> ${escapeHtml(cancellation)}`) +
			paragraph(
				`Questions? Reply to this email or call ${escapeHtml(SITE_PHONE_DISPLAY)}. Please quote <strong>${escapeHtml(booking.ref)}</strong>.`,
			),
	);
	const text = [
		...(PAYMENTS_ARE_DEMO ? [DEMO_NOTICE, ''] : []),
		`Hi ${booking.firstName}, you're booked!`,
		'',
		rowsText(bookingRows(booking)),
		'',
		rowsText(tripRows),
		'',
		rowsText(paymentRows(booking, 'customer')),
		'',
		`Cancellation: ${cancellation}`,
		'',
		`Questions? Reply to this email or call ${SITE_PHONE_DISPLAY}. Please quote ${booking.ref}.`,
		'',
		`${SITE_NAME} · Riva promenade, stand 14, Split, Croatia`,
	].join('\n');

	return {
		kind: 'booking_confirmation',
		to: booking.email,
		replyTo: null,
		subject,
		html,
		text,
		relatedId: booking.id,
	};
}

export function adminBookingEmail(booking: Booking, to: string, adminUrl: string): EmailMessage {
	const customerRows: Row[] = [
		['Name', `${booking.firstName} ${booking.lastName}`],
		['Email', booking.email],
		['Phone', booking.phone || '—'],
		['Special requests', booking.customerNotes || 'None'],
	];
	const subject = `New booking ${booking.ref}: ${booking.tourTitle}, ${formatBookingDate(booking.date)}, ${guestSummaryFromCounts(booking.adults, booking.children)}`;
	const html = layout(
		'New booking',
		`A customer booked and paid on the website${PAYMENTS_ARE_DEMO ? ' (demo payment)' : ''}. <a href="${escapeHtml(adminUrl)}" style="color:#1d9e75">Open it in the admin</a>.`,
		section('Booking', bookingRows(booking)) + section('Customer', customerRows) + section('Payment', paymentRows(booking, 'admin')),
	);
	const text = [
		`A customer booked and paid on the website${PAYMENTS_ARE_DEMO ? ' (demo payment)' : ''}.`,
		'',
		rowsText(bookingRows(booking)),
		'',
		rowsText(customerRows),
		'',
		rowsText(paymentRows(booking, 'admin')),
		'',
		`Admin: ${adminUrl}`,
	].join('\n');

	return { kind: 'admin_booking', to, replyTo: booking.email, subject, html, text, relatedId: booking.id };
}

export function adminEnquiryEmail(enquiry: Enquiry, to: string, adminUrl: string): EmailMessage {
	const tourTitle = enquiry.tourSlug ? (getTourBySlug(enquiry.tourSlug)?.title ?? enquiry.tourSlug) : 'General enquiry';
	const rows: Row[] = [
		['Name', enquiry.name],
		['Email', enquiry.email],
		['Phone', enquiry.phone || '—'],
		['About', tourTitle],
	];
	const subject = `New enquiry from ${enquiry.name}: ${tourTitle}`;
	const html = layout(
		'New enquiry',
		`Someone sent a message through the contact form. Reply to this email to answer them, or <a href="${escapeHtml(adminUrl)}" style="color:#1d9e75">open the enquiries in the admin</a>.`,
		section('From', rows) +
			paragraph(`<strong>Message</strong><br>${escapeHtml(enquiry.message).replace(/\n/g, '<br>')}`),
	);
	const text = ['New enquiry from the contact form.', '', rowsText(rows), '', 'Message:', enquiry.message, '', `Admin: ${adminUrl}`].join(
		'\n',
	);

	return { kind: 'admin_enquiry', to, replyTo: enquiry.email, subject, html, text, relatedId: enquiry.id };
}
