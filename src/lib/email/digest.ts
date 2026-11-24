import { formatBookingDate, guestSummaryFromCounts } from '../booking';
import { isCharterQuote, type Booking } from '../bookings/store';
import { formatEuro } from '../price';
import { escapeHtml, layout, LINK_COLOR, paragraph, rowsText, section, type Row } from './layout';
import type { EmailMessage } from './send';

/*
 * The digest email apart from templates.ts: templates.ts reads the tour
 * catalog (and with it the images), which Netlify's own function bundler
 * can't build. This module imports nothing Astro-only, so the hourly
 * scheduled function (netlify/functions/hourly.mts) can send it.
 */

/** Bookings set out in full in one digest; any more new ones are counted, with the admin link. */
export const DIGEST_MAX_ITEMS = 50;

/** "Blue Lagoon" from "Private experience: Blue Lagoon"; a group tour's title as it is. */
function routeName(booking: Booking): string {
	return booking.tourTitle.replace(/^(?:Private experience|Private charter): /, '');
}

/**
 * The hourly list of bookings waiting for confirmation (sendWaitingDigest):
 * guests who booked while online payment wasn't open to them, so nothing was
 * paid. Staff confirm each one ("Confirm, pay offline") or cancel it. One
 * email for all of them, at most once an hour, instead of one per booking
 * (review S1). `fresh`: ids new since the previous digest.
 *
 * Only the new bookings are set out with the guest's name, email and phone,
 * at most DIGEST_MAX_ITEMS of them: the ones earlier digests already listed
 * are a count and the admin link, so a booking's details are in one email,
 * not one an hour while it waits. `relatedIds` names the bookings set out,
 * so the retention sweep deletes this email with any of them.
 */
export function adminWaitingDigestEmail(waiting: Booking[], fresh: Set<string>, to: string, listUrl: string, adminOrigin: string): EmailMessage {
	const count = waiting.length;
	const noun = count === 1 ? 'booking' : 'bookings';
	const fresher = waiting.filter((b) => fresh.has(b.id));
	const shown = fresher.slice(0, DIGEST_MAX_ITEMS);
	const moreNew = fresher.length - shown.length;
	const earlier = count - fresher.length;
	const subject = `${count} ${noun} waiting for confirmation${fresher.length ? ` (${fresher.length} new)` : ''}`;
	const lede =
		`Online payment isn't open yet, so ${count === 1 ? 'this guest' : 'these guests'} booked without paying. Nothing was charged. ` +
		'Contact each one, then confirm the booking in the admin ("Confirm, pay offline") or cancel it. Until then the seats are not held.';
	// Notes can hold health details (GDPR Art. 9): they stay in the admin, never in an email (S-5).
	const items = shown.map((b) => {
		const what = b.kind === 'private' && isCharterQuote(b) ? 'charter quote' : b.kind === 'private' ? 'private experience' : 'group';
		const rows: Row[] = [
			['Tour', `${routeName(b)} (${what})`],
			['Date', `${formatBookingDate(b.date)}${b.slot ? `, ${b.slot}` : ''}`],
			['Guests', guestSummaryFromCounts(b.adults, b.children, b.infants)],
			['Total (incl. VAT)', `${formatEuro(b.total)} (not paid)`],
			['Name', `${b.firstName} ${b.lastName}`],
			['Email', b.email],
			['Phone', b.phone || '—'],
		];
		return { title: `${b.ref} (new)`, ref: b.ref, rows, url: `${adminOrigin}/admin/bookings/${b.id}/` };
	});
	const notes = [
		moreNew ? `${moreNew} more new ${moreNew === 1 ? 'booking is' : 'bookings are'} waiting: see the admin.` : '',
		earlier ? `${earlier} ${earlier === 1 ? 'booking' : 'bookings'} from earlier emails ${earlier === 1 ? 'is' : 'are'} still waiting: see the admin.` : '',
	].filter(Boolean);
	const html = layout(
		'Bookings waiting for confirmation',
		`${escapeHtml(lede)} <a href="${escapeHtml(listUrl)}" style="color:${LINK_COLOR}">See them in the admin</a>.`,
		items
			.map(({ title, ref, rows, url }) => section(title, rows) + paragraph(`<a href="${escapeHtml(url)}" style="color:${LINK_COLOR}">Open ${escapeHtml(ref)} in the admin</a>`))
			.join('') + notes.map((note) => paragraph(`${escapeHtml(note)} <a href="${escapeHtml(listUrl)}" style="color:${LINK_COLOR}">All waiting bookings</a>`)).join(''),
	);
	const text = [lede, '', ...items.flatMap(({ title, rows, url }) => [title, rowsText(rows), `Admin: ${url}`, '']), ...notes.flatMap((note) => [note, '']), `All waiting: ${listUrl}`].join('\n');
	return { kind: 'admin_booking', to, replyTo: null, subject, html, text, relatedId: null, relatedIds: shown.map((b) => b.id) };
}
