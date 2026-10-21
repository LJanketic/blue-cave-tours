import { MAX_GUESTS, supportsInstantBook } from '../booking';
import { businessDate } from '../bookings/dates';
import { newBookingRef, newId } from '../bookings/ids';
import { bookings, enquiries, nextCounterValue, outbox, resetCounter, type Booking, type Enquiry } from '../bookings/store';
import { computeBookingTotal, lineItemsFor } from '../price';
import { TERMS_VERSION } from '../../config/legal';
import { PAYMENTS_ARE_DEMO } from '../../config/payments';
import { getAllTours } from '../tours';
import { routeById } from '../../config/charter';

/**
 * "Load demo data" in the admin: a believable spread of bookings around
 * today so the manifest and lists aren't empty when showing the admin.
 * Records are flagged `sample` and no emails are sent for them. Tomorrow has
 * one overbooked boat on purpose (13 of 14 taken, then a booking for 4 adults
 * and an infant), so the overbooking warnings can be shown.
 */

const GUESTS: [first: string, last: string, phone: string][] = [
	['Emma', 'Schneider', '+49 151 2345 6789'],
	['Luca', 'Rossi', '+39 347 123 4567'],
	['Olivia', 'Brown', '+44 7700 900123'],
	['Noah', 'Dubois', '+33 6 12 34 56 78'],
	['Mia', 'Novak', '+385 91 234 5678'],
	['James', 'Miller', '+1 415 555 0134'],
	['Sofia', 'García', '+34 612 345 678'],
	['Lukas', 'Huber', '+43 664 1234567'],
	['Ana', 'Kovačević', '+385 98 765 4321'],
	['Oskar', 'Lindqvist', '+46 70 123 45 67'],
	['Charlotte', 'Wilson', '+44 7700 900456'],
	['Matteo', 'Ferrari', '+39 333 765 4321'],
	['Léa', 'Martin', '+33 7 65 43 21 09'],
	['Jakob', 'Wagner', '+49 170 9876543'],
	['Ivana', 'Horvat', '+385 95 111 2233'],
	['Daniel', 'Smith', '+1 212 555 0198'],
	['Elena', 'Popescu', '+40 721 234 567'],
	['Tomáš', 'Dvořák', '+420 602 123 456'],
	['Freya', 'Jensen', '+45 20 12 34 56'],
	['Pablo', 'Moreno', '+34 699 876 543'],
];

// [dayOffset, tour index, guest index, adults, children, status, payment]
const PLAN: [number, number, number, number, number, Booking['status'], Booking['paymentStatus']][] = [
	[-1, 0, 0, 2, 1, 'completed', 'paid'],
	[-1, 2, 1, 2, 0, 'no_show', 'paid'],
	[0, 0, 2, 2, 2, 'confirmed', 'paid'],
	[0, 0, 3, 4, 0, 'confirmed', 'paid'],
	[0, 0, 4, 2, 0, 'confirmed', 'paid'],
	[0, 2, 5, 3, 1, 'confirmed', 'paid'],
	[0, 2, 6, 2, 0, 'pending_payment', 'unpaid'],
	[1, 1, 7, 2, 0, 'confirmed', 'paid'],
	[1, 1, 8, 1, 0, 'confirmed', 'paid'],
	[1, 3, 9, 2, 2, 'confirmed', 'paid'],
	[1, 0, 1, 2, 0, 'cancelled', 'refunded'],
	// The overbooked boat: Ferrari and Wagner book early (13 of 14 seats), Smith pays last for 4 adults and an infant.
	[1, 2, 11, 4, 2, 'confirmed', 'paid'],
	[1, 2, 13, 7, 0, 'confirmed', 'paid'],
	[1, 2, 15, 4, 0, 'confirmed', 'paid'],
	...futurePlan(),
];

/** Infants on two bookings (D-9), one of them on the overbooked boat: they take seats. Key: "dayOffset|guest index". */
const INFANTS = new Map([
	['0|2', 1],
	['1|15', 1],
]);

/**
 * Days 2–20 ahead: a fixed (not random) pattern so every "Load demo data" looks
 * the same: quiet days, empty days, a couple of near-full boats, and the odd
 * unpaid or cancelled booking.
 */
function futurePlan(): typeof PLAN {
	const perDay = [2, 1, 3, 0, 2, 4, 1, 2, 3, 1, 0, 2, 5, 2, 1, 3, 2, 1, 4];
	const plan: typeof PLAN = [];
	const seats = new Map<string, number>();
	perDay.forEach((count, index) => {
		const offset = index + 2;
		for (let i = 0; i < count; i++) {
			const seed = offset * 7 + i * 3;
			// Busy days pile onto the flagship tour so its seat bar fills up.
			const tourIndex = count >= 4 && i < 3 ? 0 : (offset + i) % 4;
			let adults = 1 + ((offset + i * 2) % 4);
			const children = (offset + i) % 3 === 0 ? 1 + (i % 2) : 0;
			const cancelled = (offset + i) % 11 === 0;
			const unpaid = !cancelled && (offset + i) % 9 === 0;
			// Never overbook the demo boat: paid bookings stop at the boat's capacity.
			const key = `${offset}|${tourIndex}`;
			const free = MAX_GUESTS - (seats.get(key) ?? 0) - children;
			if (!cancelled && !unpaid) {
				if (free < 1) continue;
				adults = Math.min(adults, free);
				seats.set(key, (seats.get(key) ?? 0) + adults + children);
			}
			plan.push([
				offset,
				tourIndex,
				seed % GUESTS.length,
				adults,
				children,
				cancelled ? 'cancelled' : unpaid ? 'pending_payment' : 'confirmed',
				cancelled ? 'refunded' : unpaid ? 'unpaid' : 'paid',
			]);
		}
	});
	return plan;
}

const ENQUIRIES: Omit<Enquiry, 'id' | 'createdAt' | 'status' | 'notified'>[] = [
	{
		name: 'Marco Bianchi',
		email: 'marco.b@example.com',
		phone: '',
		tourSlug: 'dubrovnik-one-way',
		message: 'Is the one-way transfer to Dubrovnik possible with 3 large suitcases? Date would be 14 August.',
	},
	{
		name: 'Grace Taylor',
		email: 'grace.taylor@example.com',
		phone: '+44 7911 123456',
		tourSlug: '',
		topic: 'group',
		message: 'Do you offer any discount for a school group of 20 students in May?',
	},
];

/**
 * Private charter requests (spec §8.2) at the three stages the boss sees: a
 * new one waiting for a quote, one quoted and waiting for payment, one paid.
 * Key: [days ahead, route id, time, hours, adults, children, stage, price]. The quoted one sits on a day that
 * already has bookings and an unpaid one, and the paid one just past the 7-day strip (next week's page), so the
 * dashboard's first week looks as it did before charters (the frozen admin look in tests/visual).
 */
type CharterStage = 'new' | 'quoted' | 'paid';
const CHARTERS: [first: string, last: string, email: string, phone: string, ahead: number, route: string, time: string, hours: number, adults: number, children: number, stage: CharterStage, price: number, notes: string][] = [
	['Hannah', 'Weber', 'hannah.weber@example.com', '+49 160 9876543', 12, 'custom', '09:30', 8, 8, 0, 'new', 0, 'We are 8 friends and would love a full day: Blue Lagoon and Hvar if possible, with a long lunch stop.'],
	['Oliver', 'Jones', 'oliver.jones@example.com', '+44 7700 900789', 9, 'blue-cave-hvar-5-islands', '08:00', 10, 4, 2, 'quoted', 1450, 'Celebrating our 10th anniversary.'],
	['Giulia', 'Conti', 'giulia.conti@example.com', '+39 340 555 1234', 8, 'blue-lagoon', '10:00', 4, 6, 0, 'paid', 690, ''],
];

async function loadSampleCharters(now: Date): Promise<number> {
	for (const [index, [first, last, email, phone, ahead, routeId, time, hours, adults, children, stage, price, notes]] of CHARTERS.entries()) {
		const route = routeById(routeId);
		const date = businessDate(now, ahead);
		const askedAt = new Date(now.getTime() - (index + 1) * 26 * 3_600_000).toISOString();
		const enquiry: Enquiry = {
			id: newId(),
			createdAt: askedAt,
			status: stage === 'new' ? 'new' : 'replied',
			kind: 'charter',
			topic: 'charter',
			name: `${first} ${last}`,
			email,
			phone,
			tourSlug: route?.tourSlug ?? '',
			message: notes,
			charter: { route: routeId, date, time, durationHours: hours, adults, children, infants: 0, firstName: first, lastName: last },
			sample: true,
		};
		if (stage !== 'new') {
			const quotedAt = new Date(new Date(askedAt).getTime() + 3 * 3_600_000).toISOString();
			const paid = stage === 'paid';
			const paidAt = new Date(new Date(quotedAt).getTime() + 5 * 3_600_000).toISOString();
			const booking: Booking = {
				id: newId(),
				ref: newBookingRef(),
				createdAt: quotedAt,
				updatedAt: paid ? paidAt : quotedAt,
				status: paid ? 'confirmed' : 'pending_payment',
				paymentStatus: paid ? 'paid' : 'unpaid',
				paymentProvider: paid ? 'teya' : null,
				paymentRef: paid ? `DEMO-SAMPLE-CH${index}` : null,
				paidAt: paid ? paidAt : null,
				kind: 'private',
				enquiryId: enquiry.id,
				// Valid for 3 days from loading the demo, so a demo the next day still has an open quote.
				quoteExpiresAt: new Date(now.getTime() + 3 * 86_400_000).toISOString(),
				durationHours: hours,
				tourSlug: route?.tourSlug ?? '',
				tourTitle: `Private charter: ${route?.label ?? 'Your own route'}`,
				date,
				slot: time,
				adults,
				children,
				infants: 0,
				total: price,
				lineItems: [{ label: `Private boat with skipper, ${hours} hours`, unit: price, qty: 1, amount: price }],
				...(paid ? { termsVersion: TERMS_VERSION, termsAcceptedAt: paidAt } : {}),
				firstName: first,
				lastName: last,
				email,
				phone,
				customerNotes: notes,
				invoice: paid ? { number: `${await nextCounterValue('invoice')}/HBC1/1`, jir: newId(), zki: newId().replace(/-/g, ''), issuedAt: paidAt } : null,
				staffNotes: [],
				history: [
					{ at: quotedAt, by: 'demo data', action: `Quote sent: €${price}, valid 3 days` },
					...(paid ? [{ at: paidAt, by: 'Teya', action: `Paid €${price}` }] : []),
				],
				sample: true,
			};
			enquiry.quoteBookingId = booking.id;
			await bookings().put(booking);
		}
		await enquiries().put(enquiry);
	}
	return CHARTERS.length;
}

export async function loadSampleData(now: Date = new Date()): Promise<{ bookings: number; enquiries: number }> {
	const tours = getAllTours().filter(supportsInstantBook);
	const store = bookings();

	for (const [offset, tourIndex, guestIndex, adults, children, status, paymentStatus] of PLAN) {
		const tour = tours[tourIndex % tours.length];
		const [firstName, lastName, phone] = GUESTS[guestIndex];
		// Booked a few days to a couple of weeks before the trip, and never in the future.
		const leadDays = Math.min(offset + 1 + (guestIndex % 5) * 3, 21);
		const createdAt = new Date(Math.min(now.getTime(), now.getTime() + (offset - leadDays) * 86_400_000) - guestIndex * 3_600_000).toISOString();
		const paid = paymentStatus !== 'unpaid';
		const slot = tour.departures[0]?.time ?? '';
		const infants = INFANTS.get(`${offset}|${guestIndex}`) ?? 0;
		const date = businessDate(now, offset);
		// Priced by the tour date's season, as a real booking is.
		const total = computeBookingTotal(tour, date, adults, children) ?? 0;
		const booking: Booking = {
			id: newId(),
			ref: newBookingRef(),
			createdAt,
			updatedAt: createdAt,
			status,
			paymentStatus,
			paymentProvider: paid ? (guestIndex % 4 === 1 ? 'paypal' : 'teya') : null,
			paymentRef: paid ? `DEMO-SAMPLE-${guestIndex}${offset + 2}` : null,
			paidAt: paid ? createdAt : null,
			tourSlug: tour.slug,
			tourTitle: tour.title,
			date,
			slot,
			adults,
			children,
			infants,
			total,
			lineItems: lineItemsFor(tour, date, adults, children, infants) ?? [],
			termsVersion: TERMS_VERSION,
			termsAcceptedAt: createdAt,
			firstName,
			lastName,
			email: `${firstName}.${lastName}`.toLowerCase().normalize('NFD').replace(/[^\w.]/g, '') + '@example.com',
			phone,
			customerNotes: guestIndex === 2 && offset === 0 ? 'One child is 4 years old, do you have a small life jacket?' : '',
			invoice: paid
				? {
						number: `${await nextCounterValue('invoice')}/HBC1/1`,
						jir: newId(),
						zki: newId().replace(/-/g, ''),
						issuedAt: createdAt,
					}
				: null,
			staffNotes: [],
			history: [{ at: createdAt, by: 'demo data', action: 'Sample booking created' }],
			sample: true,
		};
		await store.put(booking);
	}

	for (const [index, enquiry] of ENQUIRIES.entries()) {
		await enquiries().put({
			...enquiry,
			id: newId(),
			createdAt: new Date(now.getTime() - (index + 1) * 5 * 3_600_000).toISOString(),
			status: index === 1 ? 'replied' : 'new',
			sample: true,
		});
	}
	const charters = await loadSampleCharters(now);
	return { bookings: PLAN.length + CHARTERS.filter((c) => c[10] !== 'new').length, enquiries: ENQUIRIES.length + charters };
}

/** Deletes everything: bookings, enquiries, the outbox and the invoice counter. Showcase only. */
export async function clearAllData(): Promise<void> {
	// Real bookings and invoice numbers must survive: refuse once payments are live.
	if (!PAYMENTS_ARE_DEMO) throw new Error('clearAllData is for the payment showcase only');
	await resetCounter('invoice');
	for (const collection of [bookings(), enquiries(), outbox()]) {
		const records = await collection.list();
		await Promise.all(records.map((record) => collection.delete(record.id)));
	}
}
