import { adminEmail, sendEmail } from '../email/send';
import { adminWaitingDigestEmail } from '../email/digest';
import { businessDate } from './dates';
import { bookings, meta, nextCounterValue, type Booking } from './store';

/*
 * Bookings waiting for confirmation and the admin's hourly digest of them,
 * apart from service.ts so the hourly scheduled function
 * (netlify/functions/hourly.mts) can import them: this module and its
 * imports use no Astro-only modules (no astro:*, no images, no catalog), so
 * Netlify's own function bundler can build it. service.ts re-exports it.
 */

/** Still waiting for payment: never paid, cancelled or refunded. */
export function awaitingPayment(booking: Booking): boolean {
	return booking.status === 'pending_payment' && (booking.paymentStatus === 'unpaid' || booking.paymentStatus === 'failed');
}

/** A private charter quote past its "valid until". */
export function quoteExpired(booking: Booking, now: Date = new Date()): boolean {
	return Boolean(booking.quoteExpiresAt) && now.toISOString() > (booking.quoteExpiresAt as string);
}

/**
 * A guest couldn't pay online (notifyPaymentNotOpen), and staff haven't
 * confirmed or cancelled the booking yet, nor has its day passed. The
 * dashboard's "waiting for confirmation" banner, the bookings list filter
 * (?show=waiting) and the hourly digest list these. Expired charter quotes
 * are left out: the guest can't pay them any more.
 */
export function waitingForConfirmation(booking: Booking, now: Date = new Date()): boolean {
	return Boolean(booking.paymentNotOpenNotifiedAt) && awaitingPayment(booking) && !quoteExpired(booking, now) && booking.date >= businessDate(now);
}

/**
 * Digest emails about bookings waiting for confirmation per UTC day: a last
 * resort only, since the hour's claim already allows at most 24.
 */
export const WAITING_DIGEST_DAILY_CAP = 24;
/** The ids the last digest listed (a JSON array), so the next one can mark the bookings new since. */
const WAITING_DIGEST_LAST = 'waiting-digest-last-listed';
/** When a booking last started waiting, until a digest has listed it: the hourly run reads only this when nothing is new. */
const WAITING_DIGEST_DUE = 'waiting-digest-due';

function parseIds(value: string | undefined): string[] {
	try {
		const ids: unknown = JSON.parse(value ?? '[]');
		return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
	} catch {
		return [];
	}
}

/** A booking started waiting for confirmation: the next digest is due. One write. */
export async function markWaitingDigestDue(now: Date = new Date()): Promise<void> {
	await meta().put({ id: WAITING_DIGEST_DUE, value: now.toISOString() });
}

/**
 * Emails the admin the bookings waiting for confirmation, at most once per
 * UTC hour, when a booking started waiting since the last digest. Called by
 * the request that records a waiting booking (notifyPaymentNotOpen) and every
 * hour by netlify/functions/hourly.mts, so a booking recorded after the
 * hour's email still reaches the admin within the hour.
 * - Nothing new since the last digest: one read, nothing listed or sent.
 * - Otherwise the first caller of the hour takes the hour's counter
 *   (compare-and-swap, so of concurrent callers exactly one gets 1), lists
 *   the bookings once and sends; everyone else that hour does nothing.
 * Bookings the previous digest didn't list are new, and only those are set
 * out in full (adminWaitingDigestEmail). Returns whether it emailed.
 */
export async function sendWaitingDigest(siteOrigin: string, now: Date = new Date()): Promise<boolean> {
	const at = now.toISOString();
	const due = await meta().get(WAITING_DIGEST_DUE);
	if (!due?.value) return false;
	if ((await nextCounterValue(`admin-waiting-digest:hour:${at.slice(0, 13)}`)) !== 1) return false;
	if ((await nextCounterValue(`admin-waiting-digest:day:${at.slice(0, 10)}`)) > WAITING_DIGEST_DAILY_CAP) {
		console.error('[bookings] daily cap reached: admin not emailed about bookings waiting for confirmation');
		return false;
	}
	const waiting = (await bookings().list())
		.filter((booking) => waitingForConfirmation(booking, now))
		.sort((a, b) => a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot) || a.createdAt.localeCompare(b.createdAt));
	const listedBefore = new Set(parseIds((await meta().get(WAITING_DIGEST_LAST))?.value));
	const fresh = new Set(waiting.filter((b) => !listedBefore.has(b.id)).map((b) => b.id));
	let sent = false;
	// Nothing new after all (staff confirmed or cancelled it first): no email.
	if (fresh.size) {
		await meta().put({ id: WAITING_DIGEST_LAST, value: JSON.stringify(waiting.map((b) => b.id)) });
		const email = await sendEmail(adminWaitingDigestEmail(waiting, fresh, adminEmail(), `${siteOrigin}/admin/bookings/?show=waiting`, siteOrigin));
		// The new ones link to it from their admin page: one write each, never fatal.
		for (const id of fresh) {
			await bookings()
				.update(id, (current) => ({ ...current, emailIds: [...(current.emailIds ?? []), email.id] }))
				.catch((err) => console.error(`[booking ${id}] digest email not linked`, err));
		}
		sent = true;
	}
	// Done, unless another booking started waiting meanwhile (compare-and-swap): then the next hour's run lists it.
	await meta().update(WAITING_DIGEST_DUE, (record) => (record.value === due.value ? { ...record, value: '' } : null));
	return sent;
}
