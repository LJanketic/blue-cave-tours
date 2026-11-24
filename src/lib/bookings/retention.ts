import { businessDate } from './dates';
import { bookingRefs, bookings, enquiries, meta, outbox, type Booking } from './store';

/*
 * The retention sweep, apart from service.ts so the scheduled function
 * (netlify/functions/nightly.mts) can import it: this module and its imports
 * use no Astro-only modules (no astro:*, no images, no catalog), so Netlify's
 * own function bundler can build it. service.ts re-exports it unchanged.
 */

/**
 * Retention (S-13; figures confirmed by the lawyer in PR 11). Removes personal
 * data that's no longer needed, and keeps what accounting needs (ref, date,
 * amounts, invoice, name):
 * - booking notes 30 days after the trip, phone numbers 90 days after
 * - bookings that were never paid (no invoice, so no accounting record) 30 days after the trip
 * - contact enquiries 12 months after they came in, with the notification email about them
 * - the text and reply-to address of sent emails after 90 days (who, when and what kind stay)
 * Runs once a day (sweepPersonalDataDaily): from the scheduled function
 * netlify/functions/nightly.mts, and, as a fallback, from the first admin
 * dashboard load of the day. Returns what it changed.
 */
export const RETENTION_DAYS = { notes: 30, phone: 90, unpaidBooking: 30, enquiry: 365, emailBody: 90 } as const;

/** No invoice and no payment: nothing accounting must keep. */
export function neverPaid(booking: Booking): boolean {
	return booking.invoice === null && (booking.paymentStatus === 'unpaid' || booking.paymentStatus === 'failed');
}

export async function sweepPersonalData(now: Date = new Date()): Promise<{ bookings: number; enquiries: number; emails: number }> {
	const day = (offset: number) => businessDate(now, -offset);
	const at = now.toISOString();
	let changedBookings = 0;
	// Emails about records deleted here go with them: their subject and reply-to name the person.
	const deletedIds = new Set<string>();
	for (const booking of await bookings().list()) {
		if (neverPaid(booking) && booking.date < day(RETENTION_DAYS.unpaidBooking)) {
			await bookings().delete(booking.id);
			await bookingRefs().delete(booking.ref);
			deletedIds.add(booking.id);
			changedBookings++;
			continue;
		}
		const dropNotes = booking.customerNotes && booking.date < day(RETENTION_DAYS.notes);
		const dropPhone = booking.phone && booking.date < day(RETENTION_DAYS.phone);
		if (!dropNotes && !dropPhone) continue;
		const { written } = await bookings().update(booking.id, (current) => ({
			...current,
			customerNotes: dropNotes ? '' : current.customerNotes,
			phone: dropPhone ? '' : current.phone,
			personalDataRemovedAt: at,
		}));
		if (written) changedBookings++;
	}
	let removedEnquiries = 0;
	const enquiryCutoff = new Date(now.getTime() - RETENTION_DAYS.enquiry * 86_400_000).toISOString();
	for (const enquiry of await enquiries().list()) {
		if (enquiry.createdAt < enquiryCutoff) {
			await enquiries().delete(enquiry.id);
			deletedIds.add(enquiry.id);
			removedEnquiries++;
		} else if (enquiry.charter) {
			// A charter request holds what its booking holds: special requests go 30 days after the trip, the phone after 90.
			const dropMessage = enquiry.message && enquiry.charter.date < day(RETENTION_DAYS.notes);
			const dropPhone = enquiry.phone && enquiry.charter.date < day(RETENTION_DAYS.phone);
			if (!dropMessage && !dropPhone) continue;
			const { written } = await enquiries().update(enquiry.id, (current) => ({
				...current,
				message: dropMessage ? '' : current.message,
				phone: dropPhone ? '' : current.phone,
				personalDataRemovedAt: at,
			}));
			if (written) removedEnquiries++;
		}
	}
	let trimmedEmails = 0;
	const emailCutoff = new Date(now.getTime() - RETENTION_DAYS.emailBody * 86_400_000).toISOString();
	for (const email of await outbox().list()) {
		// A digest names several bookings (relatedIds): it goes with the first of them deleted.
		if ((email.relatedId && deletedIds.has(email.relatedId)) || email.relatedIds?.some((id) => deletedIds.has(id))) {
			await outbox().delete(email.id);
			trimmedEmails++;
		} else if (email.createdAt < emailCutoff && (email.html || email.text || email.replyTo || email.deliveryError)) {
			// A provider's error message can quote the recipient, so it goes too.
			await outbox().put({ ...email, html: '', text: '', replyTo: null, deliveryError: undefined });
			trimmedEmails++;
		}
	}
	return { bookings: changedBookings, enquiries: removedEnquiries, emails: trimmedEmails };
}

const SWEEP_META_ID = 'retention-sweep';

/**
 * sweepPersonalData at most once per Split day. The retention periods are in
 * days, so a second run the same day finds nothing new, and skipping it saves
 * reading every booking, enquiry and email on each dashboard load (Netlify
 * credits). Null when it already ran today.
 */
export async function sweepPersonalDataDaily(now: Date = new Date()): Promise<Awaited<ReturnType<typeof sweepPersonalData>> | null> {
	const today = businessDate(now);
	const last = await meta().get(SWEEP_META_ID);
	if (last?.value === today) return null;
	const result = await sweepPersonalData(now);
	await meta().put({ id: SWEEP_META_ID, value: today });
	return result;
}