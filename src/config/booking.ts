/**
 * Online booking cut-off: the figure, and the sentence built from it, for the
 * booking flow, the server's error message and the cut-off checks (dates.ts).
 */

/** Online booking (and starting payment) closes this many minutes before departure. */
export const BOOKING_CUTOFF_MINUTES = 15;

export const BOOKING_CUTOFF_NOTE = `Online booking closes ${BOOKING_CUTOFF_MINUTES} minutes before departure.`;
