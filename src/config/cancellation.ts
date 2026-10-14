/**
 * Cancellation policy: the two figures, and every string built from them, for
 * the booking flow, tour pages and FAQ. /legal/cancellation and /legal/terms
 * still have their own copies of these figures until PR 6 wires them here.
 */

/** Free cancellation up to this many hours before departure. */
export const CANCELLATION_HOURS = 48;

/** If we cancel for safety, we tell guests at least this many hours before departure. */
export const WEATHER_NOTICE_HOURS = 4;

export const CANCELLATION_SHORT = `Free cancellation up to ${CANCELLATION_HOURS}h before departure`;

export const CANCELLATION_WINDOW = `${CANCELLATION_HOURS} hours`;

export const CANCELLATION_FULL_PREFIX = 'Free cancellation up to ';
export const CANCELLATION_FULL_SUFFIX = ` before departure. Cancellations within ${CANCELLATION_HOURS} hours are non-refundable. In case of bad weather, you'll receive a full refund or free rescheduling.`;

/**
 * Plain-text form, for contexts that can't render markup (e.g. the FAQ page).
 * The booking review page renders PREFIX/WINDOW/SUFFIX separately instead, so
 * it can bold the cutoff — both forms build on the same WINDOW/SUFFIX text.
 */
export const CANCELLATION_FULL = `${CANCELLATION_FULL_PREFIX}${CANCELLATION_WINDOW}${CANCELLATION_FULL_SUFFIX}`;

export const CANCELLATION_WEATHER = `If we cancel for safety reasons, we'll let you know at least ${WEATHER_NOTICE_HOURS} hours before departure. You can take a full refund or move to another date this season.`;
