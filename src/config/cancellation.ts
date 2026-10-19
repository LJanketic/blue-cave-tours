/**
 * Cancellation policy: the three figures, and every string built from them, for
 * the booking flow, tour pages, FAQ, emails and the legal pages. Wording follows
 * the operator's Terms & Conditions of 19.10.2026 (sections 4 and 5).
 */

/** Free cancellation up to this many hours before departure. */
export const CANCELLATION_HOURS = 48;

/** If we cancel for safety, we tell guests at least this many hours before departure. */
export const WEATHER_NOTICE_HOURS = 4;

/** After a weather cancellation, the refund is paid within this many days. */
export const WEATHER_REFUND_DAYS = 30;

export const CANCELLATION_SHORT = `Free cancellation up to ${CANCELLATION_HOURS}h before departure`;

export const CANCELLATION_WINDOW = `${CANCELLATION_HOURS} hours`;

export const CANCELLATION_FULL_PREFIX = 'Free cancellation up to ';
export const CANCELLATION_FULL_SUFFIX = ` before departure. Cancellations within ${CANCELLATION_HOURS} hours are non-refundable. If we cancel for bad weather, technical issues or force majeure, you choose: free rescheduling, an alternative tour, or a full refund (paid within ${WEATHER_REFUND_DAYS} days).`;

/**
 * The full policy as plain text, built from PREFIX/WINDOW/SUFFIX. The FAQ,
 * booking review page and emails all render this one string.
 */
export const CANCELLATION_FULL = `${CANCELLATION_FULL_PREFIX}${CANCELLATION_WINDOW}${CANCELLATION_FULL_SUFFIX}`;

export const CANCELLATION_WEATHER = `If we cancel for safety reasons, we'll let you know at least ${WEATHER_NOTICE_HOURS} hours before departure. You choose: move to the next available date, switch to an alternative tour, or take a full refund, paid within ${WEATHER_REFUND_DAYS} days.`;
