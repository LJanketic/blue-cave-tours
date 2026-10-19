<script setup lang="ts">
/*
 * Group booking step 2 (spec §8.1.2): date, departure, guests and contact
 * details, with a live summary. "Review booking" keeps everything in the
 * server's sealed booking cookie (/api/bookings/draft) and moves on; nothing
 * goes into a URL or into browser storage (S-2, S-12). Coming back to edit
 * refills the form from that cookie (WCAG 3.3.7).
 *
 * Without JavaScript the page shows a plain form instead (group.astro).
 */
import { computed, onMounted, ref } from 'vue';
import { MAX_GUESTS, guestSummaryFromCounts, parseIsoDate } from '../../lib/booking';
import { computeBookingTotal } from '../../lib/price';
import type { AgeBands, Departure } from '../../types/tour';
import { CANCELLATION_SHORT } from '../../config/cancellation';
import BookingCalendar from './booking/BookingCalendar.vue';
import GuestSteppers from './booking/GuestSteppers.vue';
import ChoiceCards from './booking/ChoiceCards.vue';
import FormField from '../ui/FormField.vue';
import SummaryCard from '../booking/SummaryCard.vue';
import Button from '../ui/Button.vue';

const props = defineProps<{
	tourSlug: string;
	tourTitle: string;
	/** Fixed daily departures; empty when the time isn't fixed yet. */
	departures: Departure[];
	adultPrice: number | null;
	childPrice: number | null;
	/** Seasonal price copy, shown under the total (season pricing must be disclosed). */
	priceNotes: string;
	/** "+ Blue Cave ticket, paid on site", an optional fee's line, or none (feeLabel). */
	feeLabel?: string;
	ageBands: AgeBands;
	/** YYYY-MM-DD the page was built on (Split time), so hydration matches the HTML. */
	renderedOn: string;
	seasonStart: string;
	seasonEnd: string;
	seasonLabel: string;
}>();

const NOTES_MAX = 500;

const date = ref<string | null>(null);
const slot = ref(props.departures[0]?.time ?? '');
const adults = ref(2);
const children = ref(0);
const infants = ref(0);
const firstName = ref('');
const lastName = ref('');
const email = ref('');
const phone = ref('');
const notes = ref('');
const calendar = ref<InstanceType<typeof BookingCalendar> | null>(null);

const dateLabel = computed(() => {
	const d = date.value ? parseIsoDate(date.value) : null;
	return d ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Not chosen yet';
});

const total = computed(() => computeBookingTotal({ adultPrice: props.adultPrice, childPrice: props.childPrice }, adults.value, children.value));

const summaryRows = computed(() => {
	const rows = [
		{ label: 'Tour', value: props.tourTitle },
		{ label: 'Date', value: dateLabel.value },
		{ label: 'Departure', value: slot.value || 'Confirmed at booking' },
		{ label: 'Guests', value: guestSummaryFromCounts(adults.value, children.value, infants.value) },
	];
	if (props.adultPrice !== null) rows.push({ label: 'Adults', value: `${adults.value} × €${props.adultPrice}` });
	if (children.value > 0 && props.childPrice !== null) rows.push({ label: 'Children', value: `${children.value} × €${props.childPrice}` });
	if (infants.value > 0) rows.push({ label: 'Infants', value: `${infants.value} × free` });
	return rows;
});

const slotOptions = computed(() =>
	props.departures.map((d) => ({ value: d.time, label: d.time, sub: d.checkIn ? `Check-in ${d.checkIn}` : d.label, icon: 'clock' })),
);

/** What still blocks "Review booking", said next to the button. */
const missing = computed(() => {
	const out: string[] = [];
	if (!date.value) out.push('a date');
	if (!firstName.value.trim()) out.push('your first name');
	if (!lastName.value.trim()) out.push('your last name');
	if (!email.value.trim()) out.push('your email');
	else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) out.push('a valid email');
	return out;
});
const canSubmit = computed(() => missing.value.length === 0);

const ERROR_MESSAGES: Record<string, string> = {
	'session-expired': 'Your booking session expired. Please check your details and continue again.',
	busy: 'Too many attempts from your connection. Please wait a few minutes and try again.',
};
const fieldErrors = ref<Record<string, string>>({});
const submitError = ref('');
const sending = ref(false);

async function review() {
	if (!canSubmit.value || !date.value || sending.value) return;
	sending.value = true;
	submitError.value = '';
	fieldErrors.value = {};
	try {
		const res = await fetch('/api/bookings/draft', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			body: JSON.stringify({
				tourId: props.tourSlug,
				date: date.value,
				slot: slot.value,
				adults: adults.value,
				children: children.value,
				infants: infants.value,
				firstName: firstName.value,
				lastName: lastName.value,
				email: email.value,
				phone: phone.value,
				notes: notes.value,
			}),
		});
		const json = (await res.json().catch(() => ({}))) as { redirect?: string; error?: string; errors?: Record<string, string> };
		if (res.ok && json.redirect) {
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

/** Coming back from the review page: refill from the booking cookie. */
async function restore() {
	const code = new URLSearchParams(window.location.search).get('error');
	if (code && ERROR_MESSAGES[code]) submitError.value = ERROR_MESSAGES[code];
	try {
		const res = await fetch('/api/bookings/draft', { headers: { Accept: 'application/json' } });
		if (res.status !== 200) return;
		const d = (await res.json()) as Record<string, string | number> & { tourSlug?: string };
		if (d.tourSlug !== props.tourSlug) return;
		const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zagreb' }).format(new Date());
		if (typeof d.date === 'string' && d.date >= today) {
			date.value = d.date;
			calendar.value?.showSelected();
		}
		if (typeof d.slot === 'string' && (props.departures.length === 0 || props.departures.some((x) => x.time === d.slot))) slot.value = d.slot;
		const a = Number(d.adults);
		const c = Number(d.children) || 0;
		const i = Number(d.infants) || 0;
		if (a >= 1 && a + c + i <= MAX_GUESTS) {
			adults.value = a;
			children.value = c;
			infants.value = i;
		}
		for (const [key, target] of [['firstName', firstName], ['lastName', lastName], ['email', email], ['phone', phone], ['notes', notes]] as const) {
			if (typeof d[key] === 'string') target.value = d[key] as string;
		}
	} catch {
		// No draft, or offline: start empty.
	}
}

onMounted(() => {
	void restore();
});
</script>

<template>
	<form class="flow" method="post" action="/api/bookings/draft" novalidate @submit.prevent="review">
		<section class="flow__card" aria-labelledby="date-heading">
			<h2 id="date-heading" class="flow__title"><i class="ti ti-calendar" aria-hidden="true"></i> Choose a date</h2>
			<p class="flow__sub">Tours run daily in the season. Pick your day.</p>
			<BookingCalendar ref="calendar" v-model="date" :rendered-on="renderedOn" :season-start="seasonStart" :season-end="seasonEnd" :season-label="seasonLabel" />
			<p v-if="fieldErrors.date" class="flow__error" role="alert">{{ fieldErrors.date }}</p>

			<div class="flow__departure">
				<p v-if="departures.length === 0" class="flow__line"><i class="ti ti-clock" aria-hidden="true"></i> Departure time confirmed at booking</p>
				<p v-else-if="departures.length === 1" class="flow__line">
					<i class="ti ti-clock" aria-hidden="true"></i>
					<span v-if="departures[0].checkIn">Check-in {{ departures[0].checkIn }} · departure {{ departures[0].time }}</span>
					<span v-else>Departure {{ departures[0].time }}</span>
				</p>
				<ChoiceCards v-else v-model="slot" name="slot" legend="Departure time" :options="slotOptions" />
			</div>
		</section>

		<section class="flow__card" aria-labelledby="guests-heading">
			<h2 id="guests-heading" class="flow__title"><i class="ti ti-users" aria-hidden="true"></i> How many guests?</h2>
			<p class="flow__sub">Up to {{ MAX_GUESTS }} guests per departure, infants included.</p>
			<GuestSteppers
				v-model:adults="adults"
				v-model:children="children"
				v-model:infants="infants"
				:age-bands="ageBands"
				:adult-price="adultPrice"
				:child-price="childPrice"
				:max="MAX_GUESTS"
			/>
			<p v-if="fieldErrors.adults" class="flow__error" role="alert">{{ fieldErrors.adults }}</p>
			<p class="flow__lock"><i class="ti ti-lock" aria-hidden="true"></i> We confirm your seats as soon as you pay.</p>
		</section>

		<section class="flow__card" aria-labelledby="details-heading">
			<h2 id="details-heading" class="flow__title"><i class="ti ti-user" aria-hidden="true"></i> Your details</h2>
			<p class="flow__sub">We'll send your confirmation and any updates here. Fields marked * are required.</p>
			<div class="flow__fields">
				<FormField id="book-first" v-model="firstName" label="First name" name="firstName" autocomplete="given-name" required :error="fieldErrors.firstName" />
				<FormField id="book-last" v-model="lastName" label="Last name" name="lastName" autocomplete="family-name" required />
				<FormField id="book-email" v-model="email" label="Email" name="email" type="email" autocomplete="email" required :error="fieldErrors.email" />
				<FormField id="book-phone" v-model="phone" label="Phone, so the skipper can reach you on the day" name="phone" type="tel" autocomplete="tel" />
				<FormField
					id="book-notes"
					v-model="notes"
					class="flow__full"
					label="Anything the crew should know? (optional)"
					name="notes"
					as="textarea"
					:maxlength="NOTES_MAX"
					hint="For example, a child seat. Please tell us about health matters (allergies, mobility) by phone or in person, not here."
					:error="fieldErrors.notes"
				/>
			</div>
		</section>

		<SummaryCard title="Your booking" :rows="summaryRows" :total="{ label: 'Total', value: total !== null ? `€${total}` : 'Price on request' }">
			<p v-if="feeLabel" class="flow__fee">{{ feeLabel }}</p>
			<p class="flow__notes">{{ priceNotes }}</p>
		</SummaryCard>

		<div class="flow__actions">
			<Button type="submit" size="lg" block icon-end="arrow-right" :aria-disabled="!canSubmit || sending ? 'true' : undefined" :aria-busy="sending" aria-describedby="flow-hint">
				Review booking
			</Button>
			<p id="flow-hint" class="flow__hint" aria-live="polite">
				<template v-if="missing.length">To continue, add {{ missing.join(', ') }}.</template>
			</p>
			<p v-if="submitError" class="flow__error" role="alert">{{ submitError }}</p>
			<Button :href="`/tours/${tourSlug}/`" variant="secondary" block>← Back to tour</Button>
			<p class="flow__policy"><i class="ti ti-shield-check" aria-hidden="true"></i> {{ CANCELLATION_SHORT }}</p>
		</div>
	</form>
</template>

<style scoped>
@layer components {
	/* §8.1.1 cards */
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

	.flow__departure {
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

	.flow__lock {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin: var(--space-3) 0 0;
		padding: 10px var(--space-3);
		border-radius: var(--radius-md);
		background: var(--color-background-secondary);
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.flow__fields {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-4);
	}

	.flow :deep(.flow__full) {
		grid-column: 1 / -1;
	}

	.flow__fee,
	.flow__notes {
		margin: 6px 0 0;
		font-size: var(--font-size-xs);
		color: var(--color-text-tertiary);
		text-align: right;
	}

	.flow__fee {
		color: var(--color-text-secondary);
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

	.flow__policy {
		margin: var(--space-1) 0 0;
		font-size: var(--font-size-sm);
		text-align: center;
		color: var(--color-text-success);
	}

	@media (max-width: 768px) {
		.flow__fields {
			grid-template-columns: 1fr;
		}
	}
}
</style>
