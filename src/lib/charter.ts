import { MAX_GUESTS, parseIsoDate, seatCount } from './booking';
import { isInSeason, seasonLabel } from '../config/season';
import {
	CHARTER_DURATIONS,
	CHARTER_EARLIEST_TIME,
	CHARTER_LATEST_TIME,
	CHARTER_TIME_RE,
	QUOTE_MAX_EUR,
	QUOTE_NOTE_MAX,
	QUOTE_VALID_DAYS,
	routeById,
} from '../config/charter';
import { EMAIL_RE, PHONE_RE, parseStartedAt, trimField, CONTACT_MAX_FORM_AGE_MS, CONTACT_MIN_SUBMIT_MS } from './contact-validation';
import { businessDate } from './bookings/dates';
import type { CharterRequestDetails } from './bookings/store';

/**
 * Private charter request (spec §8.2): the fields the form sends, the rules
 * the server checks, and the staff quote that answers a request. The browser
 * checks the same things for convenience only.
 */

export const CHARTER_LIMITS = { firstName: 100, lastName: 100, email: 254, phone: 30, notes: 500 } as const;


export const CHARTER_ERRORS = {
	route: 'Choose a route.',
	date: 'Choose a date for your charter.',
	past: 'Choose a date from tomorrow on: charters are booked at least a day ahead. For a trip today, please call us.',
	season: `We sail ${seasonLabel()}. Please choose a date in the season.`,
	time: `Choose a departure time between ${CHARTER_EARLIEST_TIME} and ${CHARTER_LATEST_TIME}.`,
	duration: 'Choose how long you want the boat.',
	guests: `Choose up to ${MAX_GUESTS} persons in total (infants included), with at least one adult.`,
	name: 'Enter your first name.',
	'last-name': 'Enter your last name.',
	email: 'Enter a valid email address.',
	phone: 'Enter a phone number, so the skipper can reach you.',
	notes: `Keep special requests to ${CHARTER_LIMITS.notes} characters.`,
	invalid: 'Something went wrong with the form. Please reload the page and try again.',
	'too-fast': 'Please wait a moment and try again.',
	check: 'We could not verify the request. Please try again.',
	busy: 'Too many requests from your connection. Please wait a few minutes and try again.',
	server: 'We could not send your request. Please try again, or email or call us.',
} as const;
export type CharterError = keyof typeof CHARTER_ERRORS;

export function isCharterError(code: string | null | undefined): code is CharterError {
	return Boolean(code) && Object.hasOwn(CHARTER_ERRORS, code as string);
}

/** Which form field each error belongs to (ids in CharterRequest.vue and the no-JS form). */
export const CHARTER_ERROR_FIELDS: Partial<Record<CharterError, string>> = {
	route: 'route',
	date: 'date',
	past: 'date',
	season: 'date',
	time: 'time',
	duration: 'duration',
	guests: 'adults',
	name: 'firstName',
	'last-name': 'lastName',
	email: 'email',
	phone: 'phone',
	notes: 'notes',
};

export type CharterRequestInput = CharterRequestDetails & {
	email: string;
	phone: string;
	notes: string;
	honeypot: string;
	startedAt: number | null;
};

function int(value: unknown, fallback = Number.NaN): number {
	if (typeof value === 'number') return Number.isInteger(value) ? value : Number.NaN;
	if (typeof value !== 'string' || value.trim() === '') return fallback;
	return /^\d+$/.test(value.trim()) ? Number(value.trim()) : Number.NaN;
}

/** The posted fields, trimmed and capped. Notes are kept whole so an over-long one is refused, not cut. */
export function parseCharterRequest(fields: Record<string, unknown>, honeypotField: string): CharterRequestInput {
	return {
		route: trimField(fields.route, 60),
		date: trimField(fields.date, 10),
		time: trimField(fields.time, 5),
		durationHours: int(fields.duration),
		adults: int(fields.adults),
		children: int(fields.children, 0),
		infants: int(fields.infants, 0),
		firstName: trimField(fields.firstName, CHARTER_LIMITS.firstName),
		lastName: trimField(fields.lastName, CHARTER_LIMITS.lastName),
		email: trimField(fields.email, CHARTER_LIMITS.email),
		phone: trimField(fields.phone, CHARTER_LIMITS.phone),
		notes: typeof fields.notes === 'string' ? fields.notes.trim() : '',
		honeypot: trimField(fields[honeypotField], 200),
		startedAt: parseStartedAt(fields._startedAt),
	};
}

/**
 * Every rule a request must meet. Charters need a day's notice, so today is
 * refused (the boss checks the boat and skipper before quoting).
 */
export function validateCharterRequest(input: CharterRequestInput, now: Date = new Date()): CharterError | null {
	if (!routeById(input.route)) return 'route';
	if (!input.date || !parseIsoDate(input.date)) return 'date';
	if (input.date <= businessDate(now)) return 'past';
	if (!isInSeason(input.date)) return 'season';
	if (!CHARTER_TIME_RE.test(input.time) || input.time < CHARTER_EARLIEST_TIME || input.time > CHARTER_LATEST_TIME) return 'time';
	if (!(CHARTER_DURATIONS as readonly number[]).includes(input.durationHours)) return 'duration';
	const { adults, children, infants } = input;
	if (![adults, children, infants].every((n) => Number.isInteger(n) && n >= 0)) return 'guests';
	if (adults < 1 || seatCount({ adults, children, infants }) > MAX_GUESTS) return 'guests';
	if (!input.firstName) return 'name';
	if (!input.lastName) return 'last-name';
	if (!input.email || !EMAIL_RE.test(input.email)) return 'email';
	if (!PHONE_RE.test(input.phone)) return 'phone';
	if (input.notes.length > CHARTER_LIMITS.notes) return 'notes';
	return null;
}

/**
 * Bot checks, as on the contact form: a filled honeypot is accepted silently
 * (and dropped); a script-sent form must have taken a human amount of time.
 * A plain form post has no start time and fails open (§3.5).
 */
export function botCheck(input: Pick<CharterRequestInput, 'honeypot' | 'startedAt'>, asForm: boolean, now = Date.now()): 'ok' | 'silent' | CharterError {
	if (input.honeypot) return 'silent';
	if (input.startedAt === null) return asForm ? 'ok' : 'invalid';
	if (input.startedAt > now || now - input.startedAt > CONTACT_MAX_FORM_AGE_MS) return 'invalid';
	if (now - input.startedAt < CONTACT_MIN_SUBMIT_MS) return 'too-fast';
	return 'ok';
}

export type QuoteInput = { price: number; date: string; time: string; durationHours: number; validDays: number; note: string };

export const QUOTE_ERRORS = {
	price: `Enter the price in whole euros, between 1 and ${QUOTE_MAX_EUR}.`,
	date: 'Enter a date from tomorrow on.',
	time: 'Enter a departure time like 09:30.',
	duration: 'Choose one of the durations.',
	valid: `The quote can be valid for ${QUOTE_VALID_DAYS.min} to ${QUOTE_VALID_DAYS.max} days.`,
	note: `Keep the note to ${QUOTE_NOTE_MAX} characters.`,
	paid: 'This request already has a paid booking.',
	missing: 'That request no longer exists.',
} as const;
export type QuoteError = keyof typeof QUOTE_ERRORS;

export function parseQuote(form: { get(name: string): unknown }): QuoteInput {
	const text = (name: string) => (typeof form.get(name) === 'string' ? (form.get(name) as string).trim() : '');
	return {
		price: int(text('price')),
		date: text('date'),
		time: text('time'),
		durationHours: int(text('duration')),
		validDays: int(text('validDays')),
		note: text('note'),
	};
}

export function validateQuote(input: QuoteInput, now: Date = new Date()): QuoteError | null {
	if (!Number.isInteger(input.price) || input.price < 1 || input.price > QUOTE_MAX_EUR) return 'price';
	if (!parseIsoDate(input.date) || input.date <= businessDate(now)) return 'date';
	if (!CHARTER_TIME_RE.test(input.time)) return 'time';
	if (!(CHARTER_DURATIONS as readonly number[]).includes(input.durationHours)) return 'duration';
	if (!Number.isInteger(input.validDays) || input.validDays < QUOTE_VALID_DAYS.min || input.validDays > QUOTE_VALID_DAYS.max) return 'valid';
	if (input.note.length > QUOTE_NOTE_MAX) return 'note';
	return null;
}
