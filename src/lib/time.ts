/*
 * Wall-clock times as "HH:MM" (24h): the one pattern and the two conversions
 * the booking code shares. No imports, so islands can use it.
 */

/** "07:20", "14:30"; not "7:20" or "24:00". */
export const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "07:20" → 440. Call with a time that passed TIME_RE. */
export function toMinutes(time: string): number {
	return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

/** 440 → "07:20". For 0 to 1439 minutes. */
export function toTime(total: number): string {
	return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
