/**
 * Online booking cut-off: the figure, and the sentence built from it, for the
 * booking flow, the server's error message and the cut-off checks (dates.ts).
 * Also the capacity the website sells against (src/lib/bookings/capacity.ts).
 */

import { MAX_GUESTS } from '../lib/booking';

/** Online booking (and starting payment) closes this many minutes before departure. */
export const BOOKING_CUTOFF_MINUTES = 15;

export const BOOKING_CUTOFF_NOTE = `Online booking closes ${BOOKING_CUTOFF_MINUTES} minutes before departure.`;

/*
 * PENDING OPERATOR CONFIRMATION (Q15 in docs/status-and-plan-2026-11-23.md):
 * seats per boat, boats per day, and whether a private booking takes a boat
 * away from the group departures. Until Vedro answers, these are guesses on
 * the safe side: the site sells less than the fleet may carry, never more.
 * A booking past them is refused and sent to contact us / request a quote;
 * staff can still sell more by hand (charter quotes are never refused).
 *
 * Assumed for now: private boats are separate from the group departures, so a
 * private booking never takes seats from a group departure.
 */

/**
 * Seats sold online on one group departure (tour + date + time). Same as the
 * most guests one booking may bring (MAX_GUESTS): one boat per departure.
 */
export const SEATS_PER_DEPARTURE = MAX_GUESTS;

/**
 * Private boats per day, across all private tours and charter quotes. One is
 * the safe guess: a second private booking that day is refused online and
 * goes to a request instead.
 */
export const PRIVATE_BOATS_PER_DAY = 1;
