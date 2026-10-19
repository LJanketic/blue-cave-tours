/**
 * Cancellation policy: the three figures, and every string built from them, for
 * the booking flow, tour pages and FAQ. /legal/cancellation and /legal/terms
 * still have their own copies of these figures until PR 6 wires them here.
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
export const CANCELLATION_FULL_SUFFIX = ` before departure. Cancellations within ${CANCELLATION_HOURS} hours are non-refundable. In case of bad weather, you'll receive a full refund (paid within ${WEATHER_REFUND_DAYS} days) or free rescheduling.`;

/**
 * The full policy as plain text, built from PREFIX/WINDOW/SUFFIX. The FAQ,
 * booking review page and emails all render this one string.
 */
export const CANCELLATION_FULL = `${CANCELLATION_FULL_PREFIX}${CANCELLATION_WINDOW}${CANCELLATION_FULL_SUFFIX}`;

export const CANCELLATION_WEATHER = `If we cancel for safety reasons, we'll let you know at least ${WEATHER_NOTICE_HOURS} hours before departure. You can take a full refund, paid within ${WEATHER_REFUND_DAYS} days, or move to another date this season.`;
