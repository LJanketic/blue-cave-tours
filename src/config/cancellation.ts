/**
 * Cancellation policy copy for the booking flow, tour pages, and FAQ.
 * Written to match /legal/cancellation by hand — that page and /legal/terms
 * keep their own copies of the same 48h/4h figures and aren't wired to this
 * file, so a policy change still needs updating in both places.
 */

export const CANCELLATION_SHORT = 'Free cancellation up to 48h before departure';

export const CANCELLATION_WINDOW = '48 hours';

export const CANCELLATION_FULL_PREFIX = 'Free cancellation up to ';
export const CANCELLATION_FULL_SUFFIX =
	" before departure. Cancellations within 48 hours are non-refundable. In case of bad weather, you'll receive a full refund or free rescheduling.";

/**
 * Plain-text form, for contexts that can't render markup (e.g. the FAQ page).
 * The booking review page renders PREFIX/WINDOW/SUFFIX separately instead, so
 * it can bold the cutoff — both forms build on the same WINDOW/SUFFIX text.
 */
export const CANCELLATION_FULL = `${CANCELLATION_FULL_PREFIX}${CANCELLATION_WINDOW}${CANCELLATION_FULL_SUFFIX}`;

export const CANCELLATION_WEATHER =
	"If we cancel for safety reasons, we'll let you know at least 4 hours before departure. You can take a full refund or move to another date this season.";
