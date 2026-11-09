import type { Departure } from '../types/tour';
import { TIME_RE, toMinutes, toTime } from './time';

/**
 * When a guest should be at the meeting point, for the confirmation page and
 * the confirmation email (one rule for both).
 *
 * - A tour with `arriveOnTime` (Blue Cave, ClickUp 8 Nov 2026): the departure
 *   itself, whatever time a private boat was moved to.
 * - The booked departure's `checkIn`, when it is before the departure.
 * - Otherwise 15 minutes before the departure.
 *
 * Null when the slot isn't an "HH:MM" time (a charter whose time is confirmed
 * by email) or the result would fall before midnight.
 */
export type Arrival = { time: string; minutesEarly: number };

export const DEFAULT_MINUTES_EARLY = 15;


export function arrivalFor(departures: readonly Departure[] | undefined, slot: string | null | undefined): Arrival | null {
	if (!slot || !TIME_RE.test(slot)) return null;
	const list = departures ?? [];
	if (list.some((d) => d.arriveOnTime)) return { time: slot, minutesEarly: 0 };
	const at = toMinutes(slot);
	const checkIn = list.find((d) => d.time === slot)?.checkIn;
	if (checkIn && TIME_RE.test(checkIn) && toMinutes(checkIn) < at) return { time: checkIn, minutesEarly: at - toMinutes(checkIn) };
	const early = at - DEFAULT_MINUTES_EARLY;
	return early < 0 ? null : { time: toTime(early), minutesEarly: DEFAULT_MINUTES_EARLY };
}

/** Board 07: "07:05 (15 min early)", or just "07:20" for an on-time tour. */
export function arriveByLabel(arrival: Arrival | null): string {
	if (!arrival) return `${DEFAULT_MINUTES_EARLY} minutes before departure`;
	return arrival.minutesEarly === 0 ? arrival.time : `${arrival.time} (${arrival.minutesEarly} min early)`;
}
