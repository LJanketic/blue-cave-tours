<script setup lang="ts">
/*
 * Private charter request (spec §8.2, board 06 as changed by the 20 Oct
 * handoff): route, date, preferred time, duration, guests, special requests
 * and contact details. "Send request" posts to /api/charter-request; nothing
 * is charged here. The boss confirms availability and replies with a quote
 * and a payment link.
 *
 * Without JavaScript the page shows a plain form instead (private-charter/index.astro).
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { MAX_GUESTS, guestSummaryFromCounts, parseIsoDate } from '../../lib/booking';
import { EMAIL_RE, HONEYPOT_FIELD, PHONE_RE } from '../../lib/contact-validation';
import { CHARTER_LIMITS } from '../../lib/charter';
import { CHARTER_DEFAULT_HOURS, CHARTER_DEFAULT_TIME, CHARTER_TIME_RE } from '../../config/charter';
import type { AgeBands } from '../../types/tour';
import BookingCalendar from './booking/BookingCalendar.vue';
import GuestSteppers from './booking/GuestSteppers.vue';
import ChoiceCards from './booking/ChoiceCards.vue';
import FormField from '../ui/FormField.vue';
import SummaryCard from '../booking/SummaryCard.vue';
import Button from '../ui/Button.vue';

type Preset = { time: string; hours: number };
type Route = { id: string; label: string; sub: string; icon: string; matches: string[]; time: string; hours: number; presets: Record<string, Preset> };

const props = defineProps<{
	routes: Route[];
	customRouteId: string;
	durations: { value: string; label: string }[];
	ageBands: AgeBands;
	renderedOn: string;
	seasonStart: string;
	seasonEnd: string;
	seasonLabel: string;
	earliestTime: string;
	latestTime: string;
	replyTime: string;
	cancellationHref: string;
	turnstileSiteKey: string;
}>();

const NOTES_MAX = CHARTER_LIMITS.notes;

const route = ref(props.customRouteId);
const date = ref<string | null>(null);
const time = ref(CHARTER_DEFAULT_TIME);
const duration = ref(String(CHARTER_DEFAULT_HOURS));
const adults = ref(2);
const children = ref(0);
const infants = ref(0);
const notes = ref('');
const firstName = ref('');
const lastName = ref('');
const email = ref('');
const phone = ref('');
const company = ref('');
const startedAt = ref(0);

/*
 * The calendar greys out today: a charter needs a day's notice, so "today" is
 * passed as closed (a departure at 00:00 has always closed by the time anyone
 * looks). The server checks the same rule.
 */
const now = ref<Date | null>(null);
let clock: ReturnType<typeof setInterval> | undefined;

const routeOptions = computed(() => props.routes.map((r) => ({ value: r.id, label: r.label, sub: r.sub, icon: r.icon })));
const chosenRoute = computed(() => props.routes.find((r) => r.id === route.value));

/** Choosing a route suggests its usual departure and length; the guest can change both. */
watch(route, (id) => {
	const r = props.routes.find((x) => x.id === id);
	if (!r) return;
	time.value = r.time;
	duration.value = String(r.hours);
});

const dateLabel = computed(() => {
	const d = date.value ? parseIsoDate(date.value) : null;
	return d ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Not chosen yet';
});
const durationText = computed(() => props.durations.find((d) => d.value === duration.value)?.label ?? '');
const summaryRows = computed(() => [
	{ label: 'Route', value: chosenRoute.value?.label ?? '' },
	{ label: 'Date', value: dateLabel.value },
	{ label: 'Departure', value: time.value || 'Not chosen yet' },
	{ label: 'Duration', value: durationText.value },
	{ label: 'Guests', value: guestSummaryFromCounts(adults.value, children.value, infants.value) },
]);

const timeOk = computed(() => CHARTER_TIME_RE.test(time.value) && time.value >= props.earliestTime && time.value <= props.latestTime);
const missing = computed(() => {
	const out: string[] = [];
	if (!date.value) out.push('a date');
	if (!timeOk.value) out.push(`a departure time between ${props.earliestTime} and ${props.latestTime}`);
	if (!firstName.value.trim()) out.push('your first name');
	if (!lastName.value.trim()) out.push('your last name');
	if (!email.value.trim()) out.push('your email');
	else if (!EMAIL_RE.test(email.value.trim())) out.push('a valid email');
	if (!phone.value.trim()) out.push('your phone number');
	else if (!PHONE_RE.test(phone.value.trim())) out.push('a phone number with digits only (+ and spaces are fine)');
	return out;
});
const canSubmit = computed(() => missing.value.length === 0);

const fieldErrors = ref<Record<string, string>>({});
const submitError = ref('');
const sending = ref(false);
const sent = ref(false);
const sentEmail = ref('');
const doneHeading = ref<HTMLElement | null>(null);

type TurnstileApi = { getResponse: () => string | undefined; reset: () => void };
const turnstile = () => (window as unknown as { turnstile?: TurnstileApi }).turnstile;

async function send() {
	if (!canSubmit.value || !date.value || sending.value) return;
	sending.value = true;
	submitError.value = '';
	fieldErrors.value = {};
	try {
		const res = await fetch('/api/charter-request', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			body: JSON.stringify({
				route: route.value,
				date: date.value,
				time: time.value,
				duration: duration.value,
				adults: adults.value,
				children: children.value,
				infants: infants.value,
				notes: notes.value,
				firstName: firstName.value,
				lastName: lastName.value,
				email: email.value,
				phone: phone.value,
				[HONEYPOT_FIELD]: company.value,
				_startedAt: startedAt.value,
				turnstileToken: turnstile()?.getResponse() ?? '',
			}),
		});
		const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; errors?: Record<string, string> };
		if (res.ok && json.ok) {
			sentEmail.value = email.value.trim();
			sent.value = true;
			await nextTick();
			window.scrollTo({ top: 0 });
			doneHeading.value?.focus();
			return;
		}
		fieldErrors.value = json.errors ?? {};
		submitError.value = json.error ?? 'We could not send your request. Please try again.';
		turnstile()?.reset();
	} catch {
		submitError.value = 'You seem to be offline. Please check your connection and try again.';
	} finally {
		sending.value = false;
	}
}

onMounted(() => {
	now.value = new Date();
	startedAt.value = Date.now();
	clock = setInterval(() => {
		now.value = new Date();
	}, 60_000);
	// ?tour= preselects the route (a tour slug or a route id); anything else is "Your own route".
	const wanted = new URLSearchParams(window.location.search).get('tour') ?? '';
	const match = props.routes.find((r) => r.matches.includes(wanted));
	route.value = match?.id ?? props.customRouteId;
	// The route watcher fills in the route's usual time first; then the tour's own preset (the
	// Blue Lagoon afternoon leaves at 14:30, not the morning's 09:30) replaces it.
	void nextTick(() => {
		const start = match?.presets[wanted];
		if (!start) return;
		time.value = start.time;
		duration.value = String(start.hours);
	});
});

onUnmounted(() => clearInterval(clock));
</script>

<template>
	<div v-if="sent" class="charter-done">
		<span class="charter-done__icon" aria-hidden="true"><i class="ti ti-circle-check"></i></span>
		<h2 ref="doneHeading" class="charter-done__title" tabindex="-1">Request received</h2>
		<p>
			We've got your request. We'll check the boat and skipper are free and send a quote to <strong>{{ sentEmail }}</strong>,
			usually {{ replyTime }}.
		</p>
		<SummaryCard title="Your request" :rows="summaryRows" :level="3" />
		<p class="charter-done__small">Nothing has been charged. Your charter is booked once you accept and pay the quote.</p>
		<Button href="/tours/?type=group" variant="secondary" block>Browse group tours</Button>
	</div>

	<form v-else class="flow" method="post" action="/api/charter-request" novalidate @submit.prevent="send">
		<section class="flow__card" aria-labelledby="route-heading">
			<h2 id="route-heading" class="flow__title"><i class="ti ti-map-2" aria-hidden="true"></i> Choose your route</h2>
			<p class="flow__sub">Pick one of our routes, or tell us your own in special requests.</p>
			<ChoiceCards v-model="route" name="route" legend="Route" legend-hidden :options="routeOptions" />
		</section>

		<section class="flow__card" aria-labelledby="when-heading">
			<h2 id="when-heading" class="flow__title"><i class="ti ti-calendar" aria-hidden="true"></i> When and how long</h2>
			<p class="flow__sub">Private charters leave when it suits you. We confirm availability in your quote.</p>
			<BookingCalendar
				v-model="date"
				:rendered-on="renderedOn"
				:season-start="seasonStart"
				:season-end="seasonEnd"
				:season-label="seasonLabel"
				:now="now"
				:departures="['00:00']"
			/>
			<p v-if="fieldErrors.date" class="flow__error" role="alert">{{ fieldErrors.date }}</p>
			<div class="flow__grid">
				<FormField
					id="charter-time"
					v-model="time"
					label="Preferred departure"
					name="time"
					type="time"
					:min="earliestTime"
					:max="latestTime"
					step="300"
					required
					:hint="`Between ${earliestTime} and ${latestTime}`"
					:error="fieldErrors.time"
				/>
				<FormField id="charter-duration" v-model="duration" label="Duration" name="duration" as="select" :options="durations" required :error="fieldErrors.duration" />
			</div>
		</section>

		<section class="flow__card" aria-labelledby="guests-heading">
			<h2 id="guests-heading" class="flow__title"><i class="ti ti-users" aria-hidden="true"></i> Guests</h2>
			<p class="flow__sub">Up to {{ MAX_GUESTS }} persons on the boat, infants included.</p>
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
			<p v-if="fieldErrors.adults" class="flow__error" role="alert">{{ fieldErrors.adults }}</p>
		</section>

		<section class="flow__card" aria-labelledby="requests-heading">
			<h2 id="requests-heading" class="flow__title"><i class="ti ti-message" aria-hidden="true"></i> Special requests</h2>
			<FormField
				id="charter-notes"
				v-model="notes"
				label="Celebrations, a custom route, anything we should plan for (optional)"
				name="notes"
				as="textarea"
				:maxlength="NOTES_MAX"
				hint="Please tell us about health matters (allergies, mobility) by phone, not here."
				:error="fieldErrors.notes"
			/>
		</section>

		<section class="flow__card" aria-labelledby="details-heading">
			<h2 id="details-heading" class="flow__title"><i class="ti ti-user" aria-hidden="true"></i> Your details</h2>
			<p class="flow__sub">We'll send your quote here. All fields are required.</p>
			<div class="flow__fields">
				<FormField id="charter-first" v-model="firstName" label="First name" name="firstName" autocomplete="given-name" required :error="fieldErrors.firstName" />
				<FormField id="charter-last" v-model="lastName" label="Last name" name="lastName" autocomplete="family-name" required :error="fieldErrors.lastName" />
				<FormField id="charter-email" v-model="email" label="Email" name="email" type="email" autocomplete="email" required :error="fieldErrors.email" />
				<FormField id="charter-phone" v-model="phone" label="Phone" name="phone" type="tel" autocomplete="tel" required :error="fieldErrors.phone" />
			</div>
			<div class="flow__trap" aria-hidden="true">
				<label for="charter-company">Company</label>
				<input id="charter-company" v-model="company" :name="HONEYPOT_FIELD" tabindex="-1" autocomplete="off" />
			</div>
			<div v-if="turnstileSiteKey" class="cf-turnstile flow__turnstile" :data-sitekey="turnstileSiteKey" data-theme="light"></div>
			<p class="flow__privacy">We use these details only to answer your request. See our <a href="/legal/privacy/">privacy policy</a>.</p>
		</section>

		<SummaryCard title="Your charter" :rows="summaryRows" :total="{ label: 'Price', value: 'We\'ll send you a quote' }">
			<p class="flow__notes">The final price is in your quote. Nothing is charged now.</p>
		</SummaryCard>

		<div class="flow__actions">
			<Button type="submit" size="lg" block icon-end="arrow-right" :aria-disabled="!canSubmit || sending ? 'true' : undefined" :aria-busy="sending" aria-describedby="charter-hint">
				Send request
			</Button>
			<p id="charter-hint" class="flow__hint" aria-live="polite">
				<template v-if="missing.length">To continue, add {{ missing.join(', ') }}.</template>
			</p>
			<p v-if="submitError" class="flow__error" role="alert">{{ submitError }}</p>
			<p class="flow__policy">
				<i class="ti ti-shield-check" aria-hidden="true"></i>
				No payment now. Private charters have <a :href="cancellationHref">their own cancellation terms</a>.
			</p>
		</div>
	</form>
</template>

<style scoped>
@layer components {
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

	.flow__grid,
	.flow__fields {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-4);
	}

	.flow__grid {
		margin-top: var(--space-4);
		padding-top: var(--space-4);
		border-top: 0.5px solid var(--color-border-tertiary);
	}

	/* Safari draws a native select at its own small height: give it the field's height and a drawn chevron. */
	.flow :deep(select.form-field-ui__control) {
		-webkit-appearance: none;
		appearance: none;
		padding-right: 32px;
		background-image:
			linear-gradient(45deg, transparent 50%, var(--color-text-secondary) 50%),
			linear-gradient(135deg, var(--color-text-secondary) 50%, transparent 50%);
		background-position:
			calc(100% - 17px) 50%,
			calc(100% - 12px) 50%;
		background-size: 5px 5px;
		background-repeat: no-repeat;
	}

	/* The honeypot: off-screen for people, still in the form for bots. */
	.flow__trap {
		position: absolute;
		left: -10000px;
		width: 1px;
		height: 1px;
		overflow: hidden;
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

	.charter-done {
		display: grid;
		gap: var(--space-4);
		text-align: center;
	}

	.charter-done p {
		margin: 0;
	}

	.charter-done__icon {
		justify-self: center;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--color-background-success);
		color: var(--color-text-success);
		font-size: 28px;
	}

	.charter-done__title {
		margin: 0;
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-medium);
	}

	.charter-done__title:focus {
		outline: none;
	}

	.charter-done__small {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.charter-done :deep(.summary-card-ui) {
		text-align: left;
	}

	@media (max-width: 768px) {
		.flow__fields {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 480px) {
		.flow__grid {
			grid-template-columns: 1fr;
		}
	}
}
</style>
