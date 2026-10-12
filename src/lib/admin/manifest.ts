import { MAX_GUESTS } from '../booking';
import { takesSeats } from '../bookings/service';
import type { Booking } from '../bookings/store';

export type Departure = {
	key: string;
	tourSlug: string;
	tourTitle: string;
	slot: string;
	capacity: number;
	seatsTaken: number;
	adults: number;
	children: number;
	/** Paid and not cancelled, by surname. */
	passengers: Booking[];
	/** Started but never paid; shown so the boss can chase them. */
	unpaid: Booking[];
};

/** One card per tour + departure time on the given date, earliest first. */
export function departuresOn(date: string, all: Booking[]): Departure[] {
	const byKey = new Map<string, Departure>();
	for (const booking of all) {
		if (booking.date !== date) continue;
		const key = `${booking.tourSlug}|${booking.slot}`;
		let departure = byKey.get(key);
		if (!departure) {
			departure = {
				key,
				tourSlug: booking.tourSlug,
				tourTitle: booking.tourTitle,
				slot: booking.slot,
				capacity: MAX_GUESTS,
				seatsTaken: 0,
				adults: 0,
				children: 0,
				passengers: [],
				unpaid: [],
			};
			byKey.set(key, departure);
		}
		if (takesSeats(booking)) {
			departure.passengers.push(booking);
			departure.seatsTaken += booking.adults + booking.children;
			departure.adults += booking.adults;
			departure.children += booking.children;
		} else if (booking.paymentStatus !== 'paid' && booking.status === 'pending_payment') {
			departure.unpaid.push(booking);
		}
	}
	const departures = [...byKey.values()].filter((d) => d.passengers.length || d.unpaid.length);
	for (const d of departures) d.passengers.sort((a, b) => a.lastName.localeCompare(b.lastName));
	return departures.sort((a, b) => (a.slot || '99').localeCompare(b.slot || '99') || a.tourTitle.localeCompare(b.tourTitle));
}

/** Digits-only number for wa.me links, or null when there's nothing dialable. */
export function whatsappNumber(phone: string): string | null {
	const digits = phone.replace(/[^\d]/g, '');
	return digits.length >= 7 ? digits : null;
}
