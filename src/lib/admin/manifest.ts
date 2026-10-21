import { MAX_GUESTS, seatCount } from '../booking';
import { isDeadQuote, takesSeats } from '../bookings/service';
import type { Booking } from '../bookings/store';

export type Departure = {
	key: string;
	tourSlug: string;
	tourTitle: string;
	slot: string;
	/** A private charter: one booking has the whole boat, so it's never shared with a group. */
	private: boolean;
	capacity: number;
	seatsTaken: number;
	adults: number;
	children: number;
	infants: number;
	/** Paid and not cancelled, by surname. */
	passengers: Booking[];
	/** Started but never paid; shown so the boss can chase them. */
	unpaid: Booking[];
	/** Seats taken beyond capacity (0 when the boat isn't overbooked). */
	overBy: number;
	/** The bookings that pushed the departure past capacity, in the order they took their seats. */
	overbookings: Overbooking[];
};

/** A booking that took seats the boat didn't have. */
export type Overbooking = {
	booking: Booking;
	/** How many of this booking's guests are over capacity. */
	seatsOver: number;
	/** Seats taken just before / just after this booking took its seats. */
	seatsBefore: number;
	seatsAfter: number;
	capacity: number;
};

/**
 * When a booking started counting against the boat: when it was paid, or when
 * staff last put a cancelled booking back. Ties fall back to creation order.
 */
function seatOrder(a: Booking, b: Booking): number {
	const at = (x: Booking) => x.seatsSince ?? x.paidAt ?? x.createdAt;
	return at(a).localeCompare(at(b)) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

/**
 * Replays the passengers in the order they took their seats, so the booking
 * that crossed capacity (and every one after it) is named, e.g. 13 of 14
 * taken, then a booking for 4 arrives: that booking is 3 seats over.
 */
function findOverbookings(passengers: Booking[], capacity: number): Overbooking[] {
	const result: Overbooking[] = [];
	let taken = 0;
	for (const booking of [...passengers].sort(seatOrder)) {
		const seatsBefore = taken;
		taken += seatCount(booking);
		if (taken > capacity) {
			result.push({ booking, seatsOver: taken - Math.max(seatsBefore, capacity), seatsBefore, seatsAfter: taken, capacity });
		}
	}
	return result;
}

/** One card per tour + departure time on the given date, earliest first. */
export function departuresOn(date: string, all: Booking[]): Departure[] {
	const byKey = new Map<string, Departure>();
	for (const booking of all) {
		// A replaced, withdrawn or expired charter quote is no boat at all.
		if (booking.date !== date || isDeadQuote(booking)) continue;
		// A private charter is its own boat: its own card, never counted against the group departure.
		const isPrivate = booking.kind === 'private';
		const key = isPrivate ? `private:${booking.id}|${booking.slot}` : `${booking.tourSlug}|${booking.slot}`;
		let departure = byKey.get(key);
		if (!departure) {
			departure = {
				key,
				tourSlug: booking.tourSlug,
				tourTitle: booking.tourTitle,
				slot: booking.slot,
				private: isPrivate,
				capacity: MAX_GUESTS,
				seatsTaken: 0,
				adults: 0,
				children: 0,
				infants: 0,
				passengers: [],
				unpaid: [],
				overBy: 0,
				overbookings: [],
			};
			byKey.set(key, departure);
		}
		if (takesSeats(booking)) {
			departure.passengers.push(booking);
			departure.seatsTaken += seatCount(booking);
			departure.adults += booking.adults;
			departure.children += booking.children;
			departure.infants += booking.infants;
		} else if (booking.paymentStatus !== 'paid' && booking.status === 'pending_payment') {
			departure.unpaid.push(booking);
		}
	}
	const departures = [...byKey.values()].filter((d) => d.passengers.length || d.unpaid.length);
	for (const d of departures) {
		// A private boat has no seats to sell: its capacity is its own party, so "seats free" never counts it.
		if (d.private) d.capacity = d.seatsTaken || seatCount(d.unpaid[0] ?? { adults: 0, children: 0 });
		d.overBy = Math.max(0, d.seatsTaken - d.capacity);
		d.overbookings = findOverbookings(d.passengers, d.capacity);
		d.passengers.sort((a, b) => a.lastName.localeCompare(b.lastName));
	}
	return departures.sort((a, b) => (a.slot || '99').localeCompare(b.slot || '99') || a.tourTitle.localeCompare(b.tourTitle));
}

/** Every booking that overbooked its departure, by booking id, across all dates. */
export function overbookingsById(all: Booking[]): Map<string, Overbooking> {
	const byId = new Map<string, Overbooking>();
	for (const date of new Set(all.map((b) => b.date))) {
		for (const departure of departuresOn(date, all)) {
			for (const o of departure.overbookings) byId.set(o.booking.id, o);
		}
	}
	return byId;
}

/** Overbooked departures from `fromDate` on, soonest first. */
export function overbookedDepartures(all: Booking[], fromDate: string): { date: string; departure: Departure }[] {
	const dates = [...new Set(all.map((b) => b.date))].filter((d) => d >= fromDate).sort();
	return dates.flatMap((date) => departuresOn(date, all).filter((d) => d.overBy > 0).map((departure) => ({ date, departure })));
}

/** Digits-only number for wa.me links, or null when there's nothing dialable. */
export function whatsappNumber(phone: string): string | null {
	const digits = phone.replace(/[^\d]/g, '');
	return digits.length >= 7 ? digits : null;
}
