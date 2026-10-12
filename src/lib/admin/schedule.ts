import type { Booking } from '../bookings/store';
import { departuresOn, type Departure } from './manifest';

export type DaySummary = {
	date: string;
	departures: Departure[];
	guests: number;
	/** Seats on the departures that have bookings; there's no fixed timetable to count empty boats. */
	capacity: number;
	unpaid: number;
	/** Seats still free, counting each boat on its own (an overbooked boat adds none). */
	free: number;
	/** Departures carrying more guests than seats. */
	overbooked: number;
};

/** "YYYY-MM-DD" shifted by whole calendar days. */
export function addDays(isoDate: string, days: number): string {
	const [year, month, day] = isoDate.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function isIsoDate(value: string | null | undefined): value is string {
	return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

export function summarizeDay(date: string, all: Booking[]): DaySummary {
	const departures = departuresOn(date, all);
	return {
		date,
		departures,
		guests: departures.reduce((sum, d) => sum + d.seatsTaken, 0),
		capacity: departures.reduce((sum, d) => sum + (d.passengers.length ? d.capacity : 0), 0),
		unpaid: departures.reduce((sum, d) => sum + d.unpaid.length, 0),
		free: departures.reduce((sum, d) => sum + (d.passengers.length ? Math.max(0, d.capacity - d.seatsTaken) : 0), 0),
		overbooked: departures.filter((d) => d.overBy > 0).length,
	};
}

/** Seven consecutive days starting at `start`. */
export function weekFrom(start: string, all: Booking[]): DaySummary[] {
	return Array.from({ length: 7 }, (_, i) => summarizeDay(addDays(start, i), all));
}
