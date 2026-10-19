import { EMAIL_SIGN_OFF, MEETING_POINT_LABEL, MEETING_POINT_MAP_URL, SITE_EMAIL, SITE_NAME, SITE_PHONE_DISPLAY } from '../../config/site';
import { formatBookingDate, guestSummaryFromCounts, meetingPointShort } from '../booking';
import type { Booking, Enquiry } from '../bookings/store';
import { topicLabel } from '../contact-validation';
import { getTourBySlug } from '../tours';
import type { EmailMessage } from './send';
import { PAYMENTS_ARE_DEMO } from '../../config/payments';
import { CANCELLATION_FULL, CANCELLATION_WEATHER } from '../../config/cancellation';
import { IMPRINT, TERMS_VERSION } from '../../config/legal';

export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** A label and value; with a link, the value itself is the link (e.g. the meeting point opens Google Maps). */
type Row = [label: string, value: string, link?: { href: string; hint: string }];

// Brand blue-900 for links (9.8:1 on white); the brand blue for the name line.
// Emails can't use CSS variables, so these mirror tokens/design.css (§9.4).
const LINK_COLOR = '#0c447c';
const BRAND_COLOR = '#1a6fc4';

function rowValueHtml(value: string, link?: Row[2]): string {
	if (!link) return escapeHtml(value);
	// One link: the value, with the hint underneath, so it's a single tap target.
	return (
		`<a href="${escapeHtml(link.href)}" target="_blank" rel="noopener" style="color:${LINK_COLOR};text-decoration:underline">${escapeHtml(value)}` +
		`<br><span style="font-size:13px;font-weight:400">${escapeHtml(link.hint)} &#8599;</span></a>`
	);
}

function rowsHtml(rows: Row[]): string {
	return rows
		.map(
			([label, value, link]) =>
				`<tr><td style="padding:6px 0;color:#555;font-size:14px;vertical-align:top;width:40%">${escapeHtml(label)}</td>` +
				`<td style="padding:6px 0;color:#111;font-size:14px;font-weight:600;text-align:right">${rowValueHtml(value, link)}</td></tr>`,
		)
		.join('');
}

function rowsText(rows: Row[]): string {
	return rows.map(([label, value, link]) => `${label}: ${value}${link ? `\n${link.hint}: ${link.href}` : ''}`).join('\n');
}

/**
 * Google Maps link for a tour's meeting point. Riva tours use the same link as
 * the website; any other meeting point gets a search for its own name.
 */
export function meetingPointMapUrl(meetingPoint: string): string {
	if (/\briva\b/i.test(meetingPoint)) return MEETING_POINT_MAP_URL;
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${meetingPointShort(meetingPoint)}, Split, Croatia`)}`;
}

/**
 * One shared shell: plain table layout and inline styles, which every mail client renders.
 * Without a heading the email opens straight on the intro; `footer` replaces the default address line.
 */
function layout(heading: string, intro: string, body: string, options: { title?: string; footer?: string } = {}): string {
	const footer = options.footer ?? `${escapeHtml(SITE_NAME)} · Riva promenade, stand 14, Split, Croatia<br>${escapeHtml(SITE_PHONE_DISPLAY)} · ${escapeHtml(SITE_EMAIL)}`;
	return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(options.title ?? heading)}</title></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px">
<tr><td style="font-size:13px;font-weight:600;color:${BRAND_COLOR};letter-spacing:.04em;text-transform:uppercase;padding-bottom:12px">${escapeHtml(SITE_NAME)}</td></tr>
${heading ? `<tr><td style="font-size:22px;font-weight:600;color:#111;padding-bottom:8px">${escapeHtml(heading)}</td></tr>\n` : ''}<tr><td style="font-size:15px;line-height:1.5;color:#333;padding-bottom:20px">${intro}</td></tr>
${body}
<tr><td style="font-size:12px;line-height:1.5;color:#767676;padding-top:24px;border-top:1px solid #e5e5e3">${footer}</td></tr>
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
		['Guests', guestSummaryFromCounts(booking.adults, booking.children, booking.infants)],
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

/** What to bring, as worded in the confirmation email template. */
const EMAIL_BRING_LIST = 'Swimsuit and towel, Sunscreen and sunglasses, Hat or cap, Cash or card for lunch and extras, Light jacket for cooler sea breezes';

const PAYMENT_STATUS_TEXT: Record<Booking['paymentStatus'], string> = {
	paid: PAYMENTS_ARE_DEMO ? 'Paid (demo, no money taken)' : 'Paid',
	unpaid: 'Not paid yet',
	failed: 'Payment declined',
	refunded: 'Refunded',
};

/** A label/value table with no section title, for the confirmation's plain list of details. */
function detailsTable(rows: Row[]): string {
	return `<tr><td style="padding-bottom:16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml(rows)}</table></td></tr>`;
}

/**
 * What the confirmation must state as text, not just link to: a link is not a
 * durable medium (CJEU C-49/11). §9.4; the lawyer verifies the wording (PR 11).
 */
function bookingTermsLines(booking: Booking): { rows: Row[]; paragraphs: string[] } {
	const tour = getTourBySlug(booking.tourSlug);
	const rows: Row[] = (booking.lineItems ?? []).map((item) => [
		item.qty > 1 || item.unit > 0 ? `${item.label} (${item.qty} × €${item.unit})` : item.label,
		`€${item.amount}`,
	]);
	rows.push(['Total', `€${booking.total}${PAYMENTS_ARE_DEMO ? ' (demo, no money taken)' : ''}`]);
	for (const fee of tour?.additionalFees ?? []) {
		rows.push([fee.mandatory ? 'Not included' : 'Extra', fee.amountLabel ? `${fee.shortText} (${fee.amountLabel})` : fee.shortText]);
	}
	const paragraphs = [
		CANCELLATION_FULL,
		'This is a leisure service on a fixed date, so the 14-day right of withdrawal for distance contracts does not apply. The cancellation policy above does.',
		`Questions or complaints: email ${SITE_EMAIL}. We confirm receipt and reply within 15 days.`,
		`Booked under our terms of ${booking.termsVersion ?? TERMS_VERSION}.`,
	];
	if (IMPRINT) paragraphs.push(`${IMPRINT.legalName}, ${IMPRINT.address}, OIB ${IMPRINT.oib}.`);
	return { rows, paragraphs };
}

/**
 * The website address customers see: the configured site (PUBLIC_SITE_URL) when
 * there is one, otherwise the address this request came in on. Admin links keep
 * using the request's address, because each deploy keeps its own bookings.
 */
function publicOrigin(requestOrigin: string): string {
	const site = import.meta.env.SITE;
	return site ? new URL(site).origin : requestOrigin;
}

/**
 * The customer's booking confirmation, following the owner's wording
 * (2026-10-12). `requestOrigin` is used for the website link when no site URL is configured.
 */
export function bookingConfirmationEmail(booking: Booking, requestOrigin: string): EmailMessage {
	const siteOrigin = publicOrigin(requestOrigin);
	const tour = getTourBySlug(booking.tourSlug);
	const riva = !tour || /\briva\b/i.test(tour.meetingPoint);
	const meeting = riva ? MEETING_POINT_LABEL : `${meetingPointShort(tour.meetingPoint)}, Split`;
	const mapUrl = riva ? MEETING_POINT_MAP_URL : meetingPointMapUrl(tour.meetingPoint);
	const date = formatBookingDate(booking.date);
	const departure = booking.slot || 'To be confirmed';
	const guests = guestSummaryFromCounts(booking.adults, booking.children, booking.infants);
	const total = `€${booking.total} — ${PAYMENT_STATUS_TEXT[booking.paymentStatus]}`;
	const website = siteOrigin.replace(/^https?:\/\//, '');
	const groupNote = "As you'll be joining a group, please be on time at the meeting point so we don't keep your fellow travelers waiting.";
	const weatherNote = CANCELLATION_WEATHER;
	const terms = bookingTermsLines(booking);

	const tripRows: Row[] = [
		['Booking ref', booking.ref],
		['Tour', booking.tourTitle],
		['Date', date],
		['Departure', departure],
		['Meeting point', meeting, { href: mapUrl, hint: 'Open in Google Maps' }],
	];
	const partyRows: Row[] = [
		['Guests', guests],
		['Total', total],
		['Bring', EMAIL_BRING_LIST],
	];

	const subject = `Your ${SITE_NAME} booking confirmation – ${booking.tourTitle}, ${date}`;
	const signature = `${escapeHtml(EMAIL_SIGN_OFF)} · ${escapeHtml(SITE_NAME)} · Split, Croatia<br>` +
		`<a href="${escapeHtml(siteOrigin)}" style="color:${LINK_COLOR}">${escapeHtml(website)}</a> · ${escapeHtml(SITE_PHONE_DISPLAY)} · ${escapeHtml(SITE_EMAIL)}`;
	const html = layout(
		'',
		`${PAYMENTS_ARE_DEMO ? `<strong>${DEMO_NOTICE}</strong><br><br>` : ''}Dear ${escapeHtml(booking.firstName)},<br><br>Thank you for booking with ${escapeHtml(SITE_NAME)}! Here are your booking details:`,
		detailsTable(tripRows) +
			paragraph(escapeHtml(groupNote)) +
			detailsTable(partyRows) +
			paragraph(escapeHtml(weatherNote)) +
			paragraph('<strong>See you aboard!</strong>') +
			section('The terms of your booking', terms.rows) +
			terms.paragraphs.map((line) => paragraph(escapeHtml(line))).join(''),
		{ title: subject, footer: signature },
	);
	const text = [
		...(PAYMENTS_ARE_DEMO ? [DEMO_NOTICE, ''] : []),
		`Dear ${booking.firstName},`,
		'',
		`Thank you for booking with ${SITE_NAME}! Here are your booking details:`,
		'',
		`Booking ref: ${booking.ref}`,
		`Tour: ${booking.tourTitle}`,
		`Date: ${date}`,
		`Departure: ${departure}`,
		`Meeting point: ${meeting} — ${mapUrl}`,
		'',
		groupNote,
		'',
		`Guests: ${guests}`,
		`Total: ${total}`,
		`Bring: ${EMAIL_BRING_LIST}`,
		'',
		weatherNote,
		'',
		'See you aboard!',
		'',
		'THE TERMS OF YOUR BOOKING',
		rowsText(terms.rows),
		'',
		...terms.paragraphs.flatMap((line) => [line, '']),
		`${EMAIL_SIGN_OFF} · ${SITE_NAME} · Split, Croatia`,
		`${website} · ${SITE_PHONE_DISPLAY} · ${SITE_EMAIL}`,
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
		// Notes can hold health details (GDPR Art. 9): they stay in the admin, never in an email (S-5).
		['Notes', booking.customerNotes ? 'Has notes, see admin' : 'None'],
	];
	const subject = `New booking ${booking.ref}: ${booking.tourTitle}, ${formatBookingDate(booking.date)}, ${guestSummaryFromCounts(booking.adults, booking.children, booking.infants)}`;
	const html = layout(
		'New booking',
		`A customer booked and paid on the website${PAYMENTS_ARE_DEMO ? ' (demo payment)' : ''}. <a href="${escapeHtml(adminUrl)}" style="color:${LINK_COLOR}">Open it in the admin</a>.`,
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
		...(enquiry.topic ? ([['Subject', topicLabel(enquiry.topic)]] as Row[]) : []),
		...(enquiry.bookingRef ? ([['Booking ref', enquiry.bookingRef]] as Row[]) : []),
	];
	const subject = `New enquiry from ${enquiry.name}: ${tourTitle}`;
	const html = layout(
		'New enquiry',
		`Someone sent a message through the contact form. Reply to this email to answer them, or <a href="${escapeHtml(adminUrl)}" style="color:${LINK_COLOR}">open the enquiries in the admin</a>.`,
		section('From', rows) +
			paragraph(`<strong>Message</strong><br>${escapeHtml(enquiry.message).replace(/\n/g, '<br>')}`),
	);
	const text = ['New enquiry from the contact form.', '', rowsText(rows), '', 'Message:', enquiry.message, '', `Admin: ${adminUrl}`].join(
		'\n',
	);

	return { kind: 'admin_enquiry', to, replyTo: enquiry.email, subject, html, text, relatedId: enquiry.id };
}
