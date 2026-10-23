<script setup lang="ts">
/*
 * Private experience step 2 (plan P): the whole boat for one tour, paid on the
 * site. Date, departure (the tour's time; later in 15-minute steps once the
 * operator sets a latest departure), guests, extras (once any are priced),
 * pick-up and contact details, with a live price. "Review booking"
 * keeps everything in the sealed booking cookie (/api/bookings/draft), as the
 * group flow does; the server prices it again from src/config/private.ts.
 *
 * A pick-up off the list can't be priced here, so it becomes a request
 * instead: "Send request" posts to /api/charter-request and staff reply with
 * a quote and a payment link (the existing charter flow).
 *
 * Without JavaScript the page shows a plain form instead (private.astro).
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { MAX_GUESTS, departureLabel as formatDeparture, guestSummaryFromCounts, parseIsoDate } from '../../lib/booking';
import { bookingClosed, businessDate, dayClosed } from '../../lib/bookings/dates';
import { lineItemsTotal, privateLineItems, seasonPriceLabel } from '../../lib/price';
import { isInSeason, seasonFor } from '../../config/season';
import { DEFAULT_PICKUP_ID, OTHER_PICKUP_ID, OTHER_PICKUP_MAX, PRIVATE_EXTRAS, PRIVATE_PICKUPS, privatePickup } from '../../config/private';
import { EMAIL_RE, HONEYPOT_FIELD, PHONE_RE } from '../../lib/contact-validation';
import { BOOKING_CUTOFF_NOTE } from '../../config/booking';
import type { AgeBands } from '../../types/tour';
import BookingCalendar from './booking/BookingCalendar.vue';
import GuestSteppers from './booking/GuestSteppers.vue';
import ChoiceCards from './booking/ChoiceCards.vue';
import FormField from '../ui/FormField.vue';
import SummaryCard from '../booking/SummaryCard.vue';
import Button from '../ui/Button.vue';

const props = defineProps<{
	tourSlug: string;
	tourTitle: string;
	/** Departure times the boat can leave at, earliest first (privateDepartureTimes). One time: the tour's fixed departure. */
	times: string[];
	/** Check-in for the tour's usual departure, shown when that's the only time. */
	checkIn?: string;
	ageBands: AgeBands;
	/** YYYY-MM-DD the page was built on (Split time), so hydration matches the HTML. */
	renderedOn: string;
	seasonStart: string;
	seasonEnd: string;
	seasonLabel: string;
	/** For a pick-up off the list: the charter route of this tour, and the length to ask for. */
	charterRoute: string;
	charterHours: number;
	cancellationHref: string;
	turnstileSiteKey: string;
}>();

const NOTES_MAX = 500;

const date = ref<string | null>(null);
const slot = ref(props.times[0] ?? '');
const adults = ref(2);
const children = ref(0);
const infants = ref(0);
const extras = ref<string[]>([]);
const pickup = ref(DEFAULT_PICKUP_ID);
const pickupPlace = ref('');
const firstName = ref('');
const lastName = ref('');
const email = ref('');
const phone = ref('');
const notes = ref('');
const startedAt = ref(0);
const calendar = ref<InstanceType<typeof BookingCalendar> | null>(null);

/** A pick-up off the list: a request for a quote, not a booking. */
const isRequest = computed(() => pickup.value === OTHER_PICKUP_ID);

/*
 * The current moment, known only in the browser (the page is prerendered).
 * Null until mounted, then refreshed every 30 seconds so a page left open
 * closes departures as their cut-off passes. The server re-checks on submit.
 */
const now = ref<Date | null>(null);
let clock: ReturnType<typeof setInterval> | undefined;
const isClosed = (time: string) => now.value !== null && date.value !== null && bookingClosed(date.value, time, now.value);
const today = computed(() => (now.value ? businessDate(now.value) : props.renderedOn));
/** A request needs a day's notice (validateCharterRequest), so the calendar closes today for it, as the charter form does. */
const calendarTimes = computed(() => (isRequest.value ? ['00:00'] : props.times));
const dateNotice = ref('');

const dateLabel = computed(() => {
	const d = date.value ? parseIsoDate(date.value) : null;
	return d ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Not chosen yet';
});

const timeOptions = computed(() => props.times.filter((time) => !isClosed(time)).map((time) => ({ value: time, label: time === props.times[0] ? `${time} (usual departure)` : time })));
const latest = computed(() => props.times[props.times.length - 1] ?? '');
/** No latest departure set (src/config/private.ts): the boat leaves at the tour's usual time, shown, not chosen. */
const fixedTime = computed(() => props.times.length === 1);
const departureText = computed(() => (slot.value ? formatDeparture([{ time: props.times[0], checkIn: props.checkIn }], slot.value) : 'Not chosen yet'));

/*
 * The price follows the tour date's season; before a date is chosen it's
 * today's (the build date until mounted, so hydration matches). An 'other'
 * pick-up has no price, so the boat and extras are shown and the total is a quote.
 */
const priceDate = computed(() => date.value ?? today.value);
const items = computed(() => privateLineItems(props.tourSlug, priceDate.value, extras.value, isRequest.value ? DEFAULT_PICKUP_ID : pickup.value) ?? []);
const total = computed(() => lineItemsTotal(items.value));
const dateSeason = computed(() => (date.value ? seasonFor(date.value) : null));
const boatPrice = computed(() => items.value[0]?.amount ?? 0);

const pickupOptions = [
	...PRIVATE_PICKUPS.map((p) => ({ value: p.id, label: p.label, sub: p.price ? `+ €${p.price}` : 'Included', icon: p.id === DEFAULT_PICKUP_ID ? 'anchor' : 'building' })),
	{ value: OTHER_PICKUP_ID, label: 'Other location', sub: "We'll send you a quote", icon: 'map-2' },
];

const pickupLabel = computed(() => (isRequest.value ? pickupPlace.value.trim() || 'Other location' : (privatePickup(pickup.value)?.label ?? '')));

const summaryRows = computed(() => {
	const rows = [
		{ label: 'Tour', value: props.tourTitle },
		{ label: 'Date', value: dateLabel.value },
		{ label: 'Departure', value: departureText.value },
		{ label: 'Guests', value: guestSummaryFromCounts(adults.value, children.value, infants.value) },
		{ label: 'Pick-up', value: pickupLabel.value },
	];
	// A request is priced in the quote, so no season line for it.
	if (dateSeason.value && !isRequest.value) rows.push({ label: 'Price', value: seasonPriceLabel(dateSeason.value) });
	for (const item of items.value) rows.push({ label: item.label, value: `€${item.amount}` });
	if (isRequest.value) rows.push({ label: 'Pick-up price', value: 'In your quote' });
	return rows;
});

/*
 * Keep the departure bookable as time passes: a new date, or the chosen time
 * closing, moves to the first open time and says so. A day with every time
 * closed is dropped (the calendar greys it out).
 */
watch([date, now], ([day]) => {
	if (!day || !now.value) return;
	if (dayClosed(day, calendarTimes.value, now.value)) {
		date.value = null;
		dateNotice.value = 'Booking for that day has closed. Please choose another date.';
		return;
	}
	if (isClosed(slot.value)) {
		const next = props.times.find((t) => !isClosed(t)) ?? '';
		dateNotice.value = slot.value && next ? `Booking for ${slot.value} has closed, so we picked ${next}. You can choose a later time.` : '';
		slot.value = next;
		return;
	}
	dateNotice.value = '';
});

/** What still blocks the button, said next to it. */
const missing = computed(() => {
	const out: string[] = [];
	if (!date.value) out.push('a date');
	else if (isRequest.value && date.value <= today.value) out.push("a date from tomorrow on (requests need a day's notice)");
	else if (!slot.value || isClosed(slot.value)) out.push('a departure time that is still open');
	if (isRequest.value && !pickupPlace.value.trim()) out.push('where to pick you up');
	if (!firstName.value.trim()) out.push('your first name');
	if (!lastName.value.trim()) out.push('your last name');
	if (!email.value.trim()) out.push('your email');
	else if (!EMAIL_RE.test(email.value.trim())) out.push('a valid email');
	if (isRequest.value) {
		if (!phone.value.trim()) out.push('your phone number');
		else if (!PHONE_RE.test(phone.value.trim())) out.push('a phone number with digits only (+ and spaces are fine)');
	}
	return out;
});
const canSubmit = computed(() => missing.value.length === 0);

const ERROR_MESSAGES: Record<string, string> = {
	'session-expired': 'Your booking session expired. Please check your details and continue again.',
	busy: 'Too many attempts from your connection. Please wait a few minutes and try again.',
	extras: 'One of your extras is no longer offered. Please choose your extras again.',
	pickup: 'Your pick-up point is no longer on our list. Please choose it again.',
};
/** The charter request's field names, as this form calls them. */
const REQUEST_FIELDS: Record<string, string> = { time: 'slot', route: 'slot', duration: 'slot' };
const fieldErrors = ref<Record<string, string>>({});
const submitError = ref('');
const sending = ref(false);

/*
 * Turnstile, only for a request and only when a site key is set: the script is
 * loaded the first time request mode turns on, and the widget rendered
 * explicitly into its container (which exists only in request mode).
 */
type TurnstileApi = {
	render: (el: HTMLElement, options: { sitekey: string; theme: string }) => string;
	getResponse: (id?: string) => string | undefined;
	reset: (id?: string) => void;
	remove: (id?: string) => void;
};
const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const turnstileBox = ref<HTMLElement | null>(null);
let turnstileId: string | undefined;
let turnstileLoad: Promise<TurnstileApi | undefined> | undefined;
const turnstileApi = () => (window as unknown as { turnstile?: TurnstileApi }).turnstile;

function loadTurnstile(): Promise<TurnstileApi | undefined> {
	turnstileLoad ??= new Promise((resolve) => {
		if (turnstileApi()) return resolve(turnstileApi());
		const script = document.createElement('script');
		script.src = TURNSTILE_SRC;
		script.async = true;
		script.onload = () => resolve(turnstileApi());
		script.onerror = () => resolve(undefined);
		document.head.append(script);
	});
	return turnstileLoad;
}

watch(isRequest, async (on) => {
	if (!props.turnstileSiteKey) return;
	if (!on) {
		if (turnstileId !== undefined) turnstileApi()?.remove(turnstileId);
		turnstileId = undefined;
		return;
	}
	const api = await loadTurnstile();
	await nextTick();
	if (!api || !turnstileBox.value || !isRequest.value || turnstileId !== undefined) return;
	turnstileId = api.render(turnstileBox.value, { sitekey: props.turnstileSiteKey, theme: 'light' });
});

const turnstileToken = () => (turnstileId !== undefined ? (turnstileApi()?.getResponse(turnstileId) ?? '') : '');
const resetTurnstile = () => {
	if (turnstileId !== undefined) turnstileApi()?.reset(turnstileId);
};

async function post(url: string, body: Record<string, unknown>) {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify(body),
	});
	const json = (await res.json().catch(() => ({}))) as { ok?: boolean; redirect?: string; error?: string; errors?: Record<string, string> };
	return { ok: res.ok, json };
}

async function submit() {
	if (!canSubmit.value || !date.value || sending.value) return;
	sending.value = true;
	submitError.value = '';
	fieldErrors.value = {};
	const guests = { adults: adults.value, children: children.value, infants: infants.value };
	const contact = { firstName: firstName.value, lastName: lastName.value, email: email.value, phone: phone.value, notes: notes.value };
	try {
		if (isRequest.value) {
			const { ok, json } = await post('/api/charter-request', {
				route: props.charterRoute,
				date: date.value,
				time: slot.value,
				duration: props.charterHours,
				...guests,
				...contact,
				pickup: pickupPlace.value,
				extras: extras.value,
				[HONEYPOT_FIELD]: '',
				_startedAt: startedAt.value,
				turnstileToken: turnstileToken(),
			});
			if (ok && json.ok) {
				window.location.href = '/private-charter/sent/';
				return;
			}
			fieldErrors.value = Object.fromEntries(Object.entries(json.errors ?? {}).map(([field, message]) => [REQUEST_FIELDS[field] ?? field, message]));
			submitError.value = json.error ?? 'We could not send your request. Please try again.';
			resetTurnstile();
			return;
		}
		const { ok, json } = await post('/api/bookings/draft', {
			kind: 'private',
			tourId: props.tourSlug,
			date: date.value,
			slot: slot.value,
			...guests,
			...contact,
			extras: extras.value,
			pickup: pickup.value,
		});
		if (ok && json.redirect) {
			window.location.href = json.redirect;
			return;
		}
		fieldErrors.value = json.errors ?? {};
		submitError.value = json.error ?? 'We could not save your details. Please try again.';
	} catch {
		submitError.value = 'You seem to be offline. Please check your connection and try again.';
	} finally {
		sending.value = false;
	}
}

/** Coming back from the review page: refill from the booking cookie, if it holds this tour's private booking. */
async function restore() {
	const code = new URLSearchParams(window.location.search).get('error');
	if (code && ERROR_MESSAGES[code]) submitError.value = ERROR_MESSAGES[code];
	try {
		const res = await fetch('/api/bookings/draft', { headers: { Accept: 'application/json' } });
		if (res.status !== 200) return;
		const d = (await res.json()) as Record<string, unknown>;
		if (d.tourSlug !== props.tourSlug || d.kind !== 'private') return;
		if (typeof d.date === 'string' && d.date >= businessDate() && isInSeason(d.date)) {
			date.value = d.date;
			calendar.value?.showSelected();
		}
		if (typeof d.slot === 'string' && props.times.includes(d.slot)) slot.value = d.slot;
		const a = Number(d.adults);
		const c = Number(d.children) || 0;
		const i = Number(d.infants) || 0;
		if (a >= 1 && a + c + i <= MAX_GUESTS) {
			adults.value = a;
			children.value = c;
			infants.value = i;
		}
		if (Array.isArray(d.extras)) extras.value = PRIVATE_EXTRAS.filter((x) => (d.extras as unknown[]).includes(x.id)).map((x) => x.id);
		if (typeof d.pickup === 'string' && privatePickup(d.pickup)) pickup.value = d.pickup;
		for (const [key, target] of [['firstName', firstName], ['lastName', lastName], ['email', email], ['phone', phone], ['notes', notes]] as const) {
			if (typeof d[key] === 'string') target.value = d[key] as string;
		}
	} catch {
		// No draft, or offline: start empty.
	}
}

onMounted(() => {
	now.value = new Date();
	startedAt.value = Date.now();
	clock = setInterval(() => {
		now.value = new Date();
	}, 30_000);
	void restore();
});

onUnmounted(() => clearInterval(clock));
</script>

<template>
	<form class="flow" method="post" action="/api/bookings/draft" novalidate @submit.prevent="submit">
		<section class="flow__card" aria-labelledby="date-heading">
			<h2 id="date-heading" class="flow__title"><i class="ti ti-calendar" aria-hidden="true"></i> Choose a date</h2>
			<p class="flow__sub">The boat and skipper are yours for the day.</p>
			<BookingCalendar
				ref="calendar"
				v-model="date"
				:rendered-on="renderedOn"
				:season-start="seasonStart"
				:season-end="seasonEnd"
				:season-label="seasonLabel"
				:now="now"
				:departures="calendarTimes"
			/>
			<p v-if="fieldErrors.date" class="flow__error" role="alert">{{ fieldErrors.date }}</p>
			<p class="flow__status" role="status">{{ dateNotice }}</p>

			<div class="flow__departure">
				<p v-if="fixedTime" class="flow__line"><i class="ti ti-clock" aria-hidden="true"></i> Departure {{ departureText }}</p>
				<FormField
					v-else
					id="private-time"
					v-model="slot"
					label="Departure time"
					name="slot"
					as="select"
					:options="timeOptions"
					required
					:hint="`Leave later if you like, up to ${latest}, in 15-minute steps.`"
					:error="fieldErrors.slot"
				/>
				<p class="flow__cutoff">{{ isRequest ? "Requests need a day's notice." : BOOKING_CUTOFF_NOTE }}</p>
			</div>
		</section>

		<section class="flow__card" aria-labelledby="guests-heading">
			<h2 id="guests-heading" class="flow__title"><i class="ti ti-users" aria-hidden="true"></i> How many guests?</h2>
			<p class="flow__sub">Up to {{ MAX_GUESTS }} persons on the boat, infants included. The price is for the whole boat.</p>
			<GuestSteppers
				v-model:adults="adults"
				v-model:children="children"
				v-model:infants="infants"
				:age-bands="ageBands"
				:adult-price="null"
				:child-price="null"
				:max="MAX_GUESTS"
				cap-unit="on the boat"
				:infants-free="false"
			/>
			<p v-if="dateSeason" class="flow__season"><i class="ti ti-sun" aria-hidden="true"></i> {{ seasonPriceLabel(dateSeason) }} for your date: €{{ boatPrice }} for the boat</p>
			<p v-if="fieldErrors.adults" class="flow__error" role="alert">{{ fieldErrors.adults }}</p>
		</section>

		<!-- Only once the operator has priced an extra (src/config/private.ts). -->
		<section v-if="PRIVATE_EXTRAS.length" class="flow__card" aria-labelledby="extras-heading">
			<h2 id="extras-heading" class="flow__title"><i class="ti ti-glass-full" aria-hidden="true"></i> Extras</h2>
			<p class="flow__sub">Optional.</p>
			<fieldset class="extras">
				<legend class="sr-only">Extras</legend>
				<label v-for="extra in PRIVATE_EXTRAS" :key="extra.id" class="extras__card" :class="{ 'is-on': extras.includes(extra.id) }">
					<input v-model="extras" type="checkbox" name="extras" :value="extra.id" class="extras__input" />
					<span class="extras__text">
						<span class="extras__label">{{ extra.label }}</span>
						<span class="extras__sub">{{ extra.desc }}</span>
					</span>
					<span class="extras__price">+ €{{ extra.price }}</span>
				</label>
			</fieldset>
			<p v-if="fieldErrors.extras" class="flow__error" role="alert">{{ fieldErrors.extras }}</p>
		</section>

		<section class="flow__card" aria-labelledby="pickup-heading">
			<h2 id="pickup-heading" class="flow__title"><i class="ti ti-map-pin" aria-hidden="true"></i> Pick-up</h2>
			<p class="flow__sub">Meet the boat on the Riva, or we pick you up.</p>
			<ChoiceCards v-model="pickup" name="pickup" legend="Pick-up" legend-hidden :options="pickupOptions" />
			<div v-if="isRequest" class="flow__other">
				<FormField
					id="private-pickup-place"
					v-model="pickupPlace"
					label="Where should we pick you up?"
					name="pickupPlace"
					:maxlength="OTHER_PICKUP_MAX"
					required
					hint="We'll check it and send you a quote with a payment link. Nothing is charged now."
				/>
			</div>
			<p v-if="fieldErrors.pickup" class="flow__error" role="alert">{{ fieldErrors.pickup }}</p>
		</section>

		<section class="flow__card" aria-labelledby="details-heading">
			<h2 id="details-heading" class="flow__title"><i class="ti ti-user" aria-hidden="true"></i> Your details</h2>
			<p class="flow__sub">We'll send your confirmation and any updates here. Fields marked * are required.</p>
			<div class="flow__fields">
				<FormField id="private-first" v-model="firstName" label="First name" name="firstName" autocomplete="given-name" required :error="fieldErrors.firstName" />
				<FormField id="private-last" v-model="lastName" label="Last name" name="lastName" autocomplete="family-name" required :error="fieldErrors.lastName" />
				<FormField id="private-email" v-model="email" label="Email" name="email" type="email" autocomplete="email" required :error="fieldErrors.email" />
				<FormField
					id="private-phone"
					v-model="phone"
					:label="isRequest ? 'Phone' : 'Phone (optional)'"
					name="phone"
					type="tel"
					autocomplete="tel"
					:required="isRequest"
					hint="So the skipper can reach you on the day."
					:error="fieldErrors.phone"
				/>
				<FormField
					id="private-notes"
					v-model="notes"
					class="flow__full"
					label="Anything the crew should know? (optional)"
					name="notes"
					as="textarea"
					:maxlength="NOTES_MAX"
					hint="For example, a child seat or a late arrival."
					:error="fieldErrors.notes"
				/>
			</div>
			<div v-if="turnstileSiteKey && isRequest" ref="turnstileBox" class="flow__turnstile"></div>
			<p class="flow__privacy">We use these details only to run your booking. See our <a href="/legal/privacy/">privacy policy</a>.</p>
		</section>

		<SummaryCard title="Your private experience" :rows="summaryRows" :total="{ label: 'Total (incl. VAT)', value: isRequest ? 'We\'ll send you a quote' : `€${total}` }">
			<p class="flow__notes">{{ isRequest ? 'A pick-up off our list is priced in your quote. Nothing is charged now.' : 'The price is for the whole boat with skipper, whatever the number of guests.' }}</p>
		</SummaryCard>

		<div class="flow__actions">
			<Button type="submit" size="lg" block icon-end="arrow-right" :aria-disabled="!canSubmit || sending ? 'true' : undefined" :aria-busy="sending" aria-describedby="private-hint">
				{{ isRequest ? 'Send request' : 'Review booking' }}
			</Button>
			<p id="private-hint" class="flow__hint" aria-live="polite">
				<template v-if="missing.length">To continue, add {{ missing.join(', ') }}.</template>
			</p>
			<p v-if="submitError" class="flow__error" role="alert">{{ submitError }}</p>
			<Button :href="`/tours/${tourSlug}/`" variant="secondary" block>← Back to tour</Button>
			<p class="flow__policy">
				<i class="ti ti-shield-check" aria-hidden="true"></i>
				Private experiences have <a :href="cancellationHref">their own cancellation terms</a>.
			</p>
		</div>
	</form>
</template>

<style scoped>
@layer components {
	/* The booking flow's cards, as in GroupBookingFlow (§8.1.1). */
	.flow__card {
		margin-bottom: 14px;
		padding: 1.25rem;
		border: 1px solid var(--color-border-card);
		border-radius: var(--radius-lg);
	}

	.flow__title {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin: 0 0 4px;
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-medium);
	}

	.flow__title .ti {
		font-size: 16px;
		color: var(--color-accent);
	}

	.flow__sub {
		margin: 0 0 14px;
		font-size: var(--font-size-body-md);
		line-height: var(--line-height-body-md);
		color: var(--color-text-secondary);
	}

	.flow__departure,
	.flow__other {
		margin-top: var(--space-4);
		padding-top: var(--space-4);
		border-top: 0.5px solid var(--color-border-tertiary);
	}

	.flow__line {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin: 0;
		font-size: var(--font-size-base);
	}

	.flow__line .ti {
		color: var(--color-text-tertiary);
	}

	.flow__season {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin: var(--space-3) 0 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	/* Checkbox cards, styled as ChoiceCards' radio cards. */
	.extras {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
		margin: 0;
		padding: 0;
		border: 0;
	}

	.extras__card {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: 14px var(--space-4);
		border: 1px solid var(--color-border-card);
		border-radius: var(--radius-lg);
		cursor: pointer;
	}

	.extras__card:hover {
		border-color: var(--color-border-primary);
	}

	.extras__card.is-on {
		padding: 13px 15px;
		border: 2px solid var(--color-border-brand);
		background: var(--color-background-brand-soft);
	}

	.extras__input {
		flex-shrink: 0;
		width: 18px;
		height: 18px;
		margin: 0;
		accent-color: var(--color-brand);
	}

	.extras__text {
		flex: 1;
		min-width: 0;
	}

	.extras__label {
		display: block;
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-medium);
	}

	.extras__sub {
		display: block;
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}

	.extras__price {
		flex-shrink: 0;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
	}

	.flow__fields {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-4);
	}

	.flow :deep(.flow__full) {
		grid-column: 1 / -1;
	}

	.flow__turnstile {
		margin-top: var(--space-4);
	}

	.flow__notes {
		margin: 6px 0 0;
		font-size: var(--font-size-xs);
		color: var(--color-text-tertiary);
		text-align: right;
	}

	.flow__actions {
		display: grid;
		gap: var(--space-2);
		margin-top: var(--space-4);
	}

	.flow__hint {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.flow__hint:empty {
		display: none;
	}

	.flow__error {
		margin: var(--space-2) 0 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-danger);
	}

	.flow__status {
		margin: var(--space-2) 0 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	/* Empty, it takes no space but stays in the accessibility tree, so screen readers announce what's put in it later. */
	.flow__status:empty {
		margin: 0;
	}

	.flow__cutoff {
		margin: var(--space-2) 0 0;
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}

	.flow__privacy {
		margin: 14px 0 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.flow__privacy a,
	.flow__policy a {
		color: inherit;
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.flow__policy {
		margin: var(--space-1) 0 0;
		font-size: var(--font-size-sm);
		text-align: center;
		color: var(--color-text-secondary);
	}

	@media (max-width: 768px) {
		.extras,
		.flow__fields {
			grid-template-columns: 1fr;
		}
	}
}
</style>
