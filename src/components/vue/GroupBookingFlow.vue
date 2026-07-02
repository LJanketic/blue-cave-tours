<script setup lang="ts">
import { computed, ref } from 'vue';

type Props = {
	tourSlug: string;
	tourTitle: string;
	duration: string;
	departure: string;
	fromPrice: string;
	priceNotes: string;
	maxGuests?: number;
};

const props = withDefaults(defineProps<Props>(), {
	maxGuests: 12,
});

const MAX_GUESTS = props.maxGuests;
const SLOTS = [
	{ time: '09:00', label: 'Morning departure', icon: 'ti-sun', color: '#EF9F27' },
	{ time: '18:00', label: 'Sunset departure', icon: 'ti-sunset', color: '#E05C34' },
] as const;

const today = new Date();
const viewYear = ref(today.getFullYear());
const viewMonth = ref(today.getMonth());
const selectedDay = ref<number | null>(null);
const selectedSlot = ref('09:00');
const adults = ref(2);
const children = ref(0);
const firstName = ref('');
const lastName = ref('');
const email = ref('');
const phone = ref('');
const notes = ref('');

const monthLabel = computed(() =>
	new Date(viewYear.value, viewMonth.value, 1).toLocaleDateString('en-GB', {
		month: 'long',
		year: 'numeric',
	}),
);

const calendarCells = computed(() => {
	const first = new Date(viewYear.value, viewMonth.value, 1);
	const startPad = (first.getDay() + 6) % 7;
	const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate();
	const cells: Array<{ key: string; day: number | null; past: boolean; today: boolean }> = [];

	for (let i = 0; i < startPad; i++) {
		cells.push({ key: `empty-${i}`, day: null, past: false, today: false });
	}

	for (let d = 1; d <= daysInMonth; d++) {
		const date = new Date(viewYear.value, viewMonth.value, d);
		const past =
			date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
		const isToday =
			date.getFullYear() === today.getFullYear() &&
			date.getMonth() === today.getMonth() &&
			date.getDate() === today.getDate();
		cells.push({ key: `day-${d}`, day: d, past, today: isToday });
	}

	return cells;
});

const selectedDateLabel = computed(() => {
	if (selectedDay.value === null) return '— select a date';
	const date = new Date(viewYear.value, viewMonth.value, selectedDay.value);
	return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
});

const guestSummary = computed(() => {
	const parts = [`${adults.value} adult${adults.value !== 1 ? 's' : ''}`];
	if (children.value > 0) {
		parts.push(`${children.value} child${children.value !== 1 ? 'ren' : ''}`);
	}
	return parts.join(', ');
});

const childFromPrice = computed(() => {
	const match = props.priceNotes.match(/children[^€]*?(€\d+)/i);
	return match?.[1] ?? null;
});

const adultUnitPrice = computed(() => {
	const match = props.fromPrice.match(/€(\d+)/);
	return match ? Number.parseInt(match[1], 10) : null;
});

const adultsTotalDisplay = computed(() => {
	if (adultUnitPrice.value === null) return `from ${props.fromPrice}`;
	return `€${adults.value * adultUnitPrice.value}`;
});

const childrenTotalDisplay = computed(() => {
	if (!childFromPrice.value) return 'see price notes';
	const match = childFromPrice.value.match(/€(\d+)/);
	if (!match) return childFromPrice.value;
	return `€${children.value * Number.parseInt(match[1], 10)}`;
});

const adultPriceLabel = computed(() => `Age 11+ · ${props.fromPrice}`);
const childPriceLabel = computed(() =>
	childFromPrice.value ? `Age 4–10 · ${childFromPrice.value}` : 'Age 4–10',
);
const adultsLineLabel = computed(() => `Adults (${adults.value} × ${props.fromPrice})`);
const childrenLineLabel = computed(() =>
	childFromPrice.value
		? `Children (${children.value} × ${childFromPrice.value})`
		: `Children (${children.value})`,
);

const bookingTotalDisplay = computed(() => {
	let total = 0;
	let hasNumeric = false;
	if (adultUnitPrice.value !== null) {
		total += adults.value * adultUnitPrice.value;
		hasNumeric = true;
	}
	if (childFromPrice.value && children.value > 0) {
		const match = childFromPrice.value.match(/€(\d+)/);
		if (match) {
			total += children.value * Number.parseInt(match[1], 10);
			hasNumeric = true;
		}
	}
	if (!hasNumeric) return `from ${props.fromPrice}`;
	return `€${total}`;
});

const totalGuests = computed(() => adults.value + children.value);
const atCapacity = computed(() => totalGuests.value >= MAX_GUESTS);

const canSubmit = computed(
	() =>
		selectedDay.value !== null &&
		totalGuests.value >= 1 &&
		firstName.value.trim().length >= 1 &&
		lastName.value.trim().length >= 1 &&
		email.value.includes('@'),
);

function prevMonth() {
	if (viewMonth.value === 0) {
		viewMonth.value = 11;
		viewYear.value -= 1;
	} else {
		viewMonth.value -= 1;
	}
}

function nextMonth() {
	if (viewMonth.value === 11) {
		viewMonth.value = 0;
		viewYear.value += 1;
	} else {
		viewMonth.value += 1;
	}
}

function selectDay(day: number, past: boolean) {
	if (past) return;
	selectedDay.value = day;
	selectedSlot.value = '09:00';
}

function bump(field: 'adults' | 'children', delta: number) {
	const next = { adults: adults.value, children: children.value };
	next[field] = Math.max(field === 'adults' ? 1 : 0, next[field] + delta);
	if (next.adults + next.children > MAX_GUESTS) return;
	adults.value = next.adults;
	children.value = next.children;
}

function goToReview() {
	if (!canSubmit.value) return;
	window.location.href = `/book/${props.tourSlug}/review`;
}
</script>

<template>
	<div class="group-booking">
		<div class="card">
			<p class="card-title"><i class="ti ti-calendar" aria-hidden="true"></i> Choose a date</p>
			<p class="card-sub">Tours run daily. Select your preferred day.</p>
			<div class="cal-header">
				<button type="button" class="cal-nav" aria-label="Previous month" @click="prevMonth">‹</button>
				<span class="cal-month">{{ monthLabel }}</span>
				<button type="button" class="cal-nav" aria-label="Next month" @click="nextMonth">›</button>
			</div>
			<div class="cal-grid" role="grid" aria-label="Calendar">
				<span v-for="dow in ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']" :key="dow" class="cal-dow">{{ dow }}</span>
				<button
					v-for="cell in calendarCells"
					:key="cell.key"
					type="button"
					class="cal-day"
					:class="{
						empty: cell.day === null,
						past: cell.past,
						today: cell.today,
						sel: cell.day !== null && selectedDay === cell.day,
					}"
					:disabled="cell.day === null || cell.past"
					@click="cell.day !== null && selectDay(cell.day, cell.past)"
				>
					<span v-if="cell.day !== null">{{ cell.day }}</span>
					<span v-if="cell.day !== null && !cell.past" class="avail-dot" aria-hidden="true"></span>
				</button>
			</div>
			<div v-if="selectedDay !== null" class="slot-section">
				<p class="slot-heading">Choose a departure time</p>
				<div class="slots">
					<button
						v-for="slot in SLOTS"
						:key="slot.time"
						type="button"
						class="slot"
						:class="{ sel: selectedSlot === slot.time }"
						@click="selectedSlot = slot.time"
					>
						<div class="slot-icon" :style="{ color: slot.color }">
							<i :class="['ti', slot.icon]" aria-hidden="true"></i>
						</div>
						<div>
							<p class="slot-time">{{ slot.time }}</p>
							<p class="slot-label">{{ slot.label }}</p>
						</div>
						<div class="slot-radio" aria-hidden="true"></div>
					</button>
				</div>
			</div>
		</div>

		<div class="card">
			<p class="card-title"><i class="ti ti-users" aria-hidden="true"></i> How many guests?</p>
			<p class="card-sub">Max {{ MAX_GUESTS }} guests per departure. Children under 3 travel free.</p>
			<div class="guests-grid">
				<div class="guest-row">
					<div>
						<p class="guest-label">Adults</p>
						<p class="guest-sub-label">{{ adultPriceLabel }}</p>
					</div>
					<div class="stepper">
						<button type="button" class="step-btn" aria-label="Fewer adults" @click="bump('adults', -1)">−</button>
						<span class="step-val">{{ adults }}</span>
						<button type="button" class="step-btn" aria-label="More adults" @click="bump('adults', 1)">+</button>
					</div>
				</div>
				<div class="guest-row">
					<div>
						<p class="guest-label">Children</p>
						<p class="guest-sub-label">{{ childPriceLabel }}</p>
					</div>
					<div class="stepper">
						<button type="button" class="step-btn" aria-label="Fewer children" @click="bump('children', -1)">−</button>
						<span class="step-val">{{ children }}</span>
						<button type="button" class="step-btn" aria-label="More children" @click="bump('children', 1)">+</button>
					</div>
				</div>
			</div>
			<p v-if="atCapacity" class="cap-warn">
				<i class="ti ti-alert-triangle" aria-hidden="true"></i>
				Maximum {{ MAX_GUESTS }} guests per departure reached.
			</p>
			<div class="hold-note">
				<i class="ti ti-lock" aria-hidden="true"></i>
				Your spots are held for 12 minutes once you proceed to review.
			</div>
		</div>

		<div class="card">
			<p class="card-title"><i class="ti ti-user" aria-hidden="true"></i> Your details</p>
			<p class="card-sub">We'll send your confirmation and any updates here.</p>
			<div class="details-grid">
				<div class="field">
					<label for="book-first">First name</label>
					<input id="book-first" v-model="firstName" type="text" autocomplete="given-name" placeholder="Ivan" />
				</div>
				<div class="field">
					<label for="book-last">Last name</label>
					<input id="book-last" v-model="lastName" type="text" autocomplete="family-name" placeholder="Kovač" />
				</div>
				<div class="field">
					<label for="book-email">Email</label>
					<input id="book-email" v-model="email" type="email" autocomplete="email" placeholder="ivan@example.com" />
				</div>
				<div class="field">
					<label for="book-phone">Phone</label>
					<input id="book-phone" v-model="phone" type="tel" autocomplete="tel" placeholder="+385 91 234 5678" />
				</div>
				<div class="field full">
					<label for="book-notes">Special requests</label>
					<textarea
						id="book-notes"
						v-model="notes"
						rows="3"
						placeholder="Allergies, accessibility needs, anything we should know…"
					></textarea>
				</div>
			</div>
		</div>

		<div class="summary-card">
			<p class="sum-title">Booking summary</p>
			<div class="sum-row">
				<span class="sum-label">Tour</span>
				<span class="sum-val">{{ tourTitle }}</span>
			</div>
			<div class="sum-row">
				<span class="sum-label">Date</span>
				<span class="sum-val">{{ selectedDateLabel }}</span>
			</div>
			<div class="sum-row">
				<span class="sum-label">Departure</span>
				<span class="sum-val">{{ selectedDay !== null ? selectedSlot : '—' }}</span>
			</div>
			<div class="sum-row">
				<span class="sum-label">Guests</span>
				<span class="sum-val">{{ guestSummary }}</span>
			</div>
			<hr class="sum-div" />
			<div class="sum-row">
				<span class="sum-label">{{ adultsLineLabel }}</span>
				<span class="sum-val">{{ adultsTotalDisplay }}</span>
			</div>
			<div v-if="children > 0" class="sum-row">
				<span class="sum-label">{{ childrenLineLabel }}</span>
				<span class="sum-val">{{ childrenTotalDisplay }}</span>
			</div>
			<hr class="sum-div" />
			<div class="sum-total">
				<span>Total</span>
				<span>{{ bookingTotalDisplay }}</span>
			</div>
			<p class="sum-note">{{ priceNotes }}</p>
		</div>

		<button type="button" class="cta-btn" :disabled="!canSubmit" @click="goToReview">
			Review booking
			<i class="ti ti-arrow-right" aria-hidden="true"></i>
		</button>
		<a class="back-btn" :href="`/tours/${tourSlug}`">← Back to tour type</a>
		<p class="policy-note">
			<i class="ti ti-shield-check" aria-hidden="true"></i>
			Free cancellation up to 48h before departure
		</p>
	</div>
</template>

<style scoped>
.group-booking :deep(input),
.group-booking :deep(select),
.group-booking :deep(textarea) {
	font-family: var(--font-ui);
	padding: 8px 10px;
	border: 0.5px solid var(--color-border-secondary);
	border-radius: var(--radius-md);
	background: var(--color-background-primary);
	color: var(--color-text-primary);
	outline: none;
	width: 100%;
}

.group-booking :deep(textarea) {
	resize: vertical;
	min-height: 60px;
}

.card {
	background: var(--color-background-primary);
	border: 0.5px solid var(--color-border-tertiary);
	border-radius: var(--radius-lg);
	padding: 1.25rem;
	margin-bottom: 14px;
}

.card-title {
	font-size: 14px;
	font-weight: 500;
	margin: 0 0 4px;
	display: flex;
	align-items: center;
	gap: 8px;
}

.card-title .ti {
	font-size: 16px;
	color: #1d9e75;
}

.card-sub {
	font-size: 12px;
	color: var(--color-text-secondary);
	margin: 0 0 14px;
}

.cal-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
}

.cal-month {
	font-size: 14px;
	font-weight: 500;
}

.cal-nav {
	background: none;
	border: 0.5px solid var(--color-border-secondary);
	border-radius: var(--radius-md);
	width: 28px;
	height: 28px;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	font-family: var(--font-ui);
}

.cal-nav:hover {
	background: var(--color-background-secondary);
}

.cal-grid {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	gap: 4px;
}

.cal-dow {
	font-size: 11px;
	color: var(--color-text-tertiary);
	text-align: center;
	padding-bottom: 4px;
	font-weight: 500;
}

.cal-day {
	height: 36px;
	border-radius: var(--radius-md);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	font-size: 13px;
	cursor: pointer;
	border: 0.5px solid transparent;
	background: none;
	font-family: var(--font-ui);
	color: inherit;
	padding: 0;
}

.cal-day:hover:not(.empty, .past, :disabled) {
	background: var(--color-background-secondary);
	border-color: var(--color-border-secondary);
}

.cal-day.empty,
.cal-day.past {
	cursor: default;
	color: var(--color-text-tertiary);
}

.cal-day.today {
	border-color: var(--color-border-info);
	color: var(--color-text-info);
}

.cal-day.sel {
	background: var(--color-text-primary);
	color: var(--color-background-primary);
	border-color: var(--color-text-primary);
}

.guests-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 10px;
}

.guest-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px 12px;
	background: var(--color-background-secondary);
	border-radius: var(--radius-md);
}

.guest-label {
	font-size: 13px;
	margin: 0;
}

.guest-sub-label {
	font-size: 11px;
	color: var(--color-text-tertiary);
	margin: 0;
}

.stepper {
	display: flex;
	align-items: center;
	gap: 8px;
}

.step-btn {
	width: 28px;
	height: 28px;
	border-radius: 50%;
	border: 0.5px solid var(--color-border-secondary);
	background: var(--color-background-primary);
	font-size: 16px;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	font-family: var(--font-ui);
	line-height: 1;
}

.step-val {
	font-size: 14px;
	font-weight: 500;
	min-width: 20px;
	text-align: center;
}

.field {
	display: flex;
	flex-direction: column;
	gap: 5px;
}

.field label {
	font-size: 11px;
	font-weight: 500;
	color: var(--color-text-tertiary);
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.field.full {
	grid-column: 1 / -1;
}

.summary-card {
	background: var(--color-background-secondary);
	border-radius: var(--radius-lg);
	padding: 1.1rem 1.25rem;
	margin-bottom: 16px;
}

.avail-dot {
	width: 4px;
	height: 4px;
	border-radius: 50%;
	background: #1d9e75;
	margin-top: 1px;
}

.cal-day.sel .avail-dot {
	background: var(--color-background-primary);
	opacity: 0.6;
}

.cal-day.past .avail-dot {
	display: none;
}

.slot-section {
	margin-top: 18px;
}

.slot-heading {
	font-size: 12px;
	font-weight: 500;
	color: var(--color-text-secondary);
	margin: 0 0 10px;
}

.slots {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 10px;
}

.slot {
	border: 0.5px solid var(--color-border-secondary);
	border-radius: var(--radius-md);
	padding: 14px 16px;
	cursor: pointer;
	display: flex;
	align-items: center;
	gap: 12px;
	transition: border-color 0.12s;
	background: var(--color-background-primary);
	font-family: var(--font-ui);
	text-align: left;
	width: 100%;
}

.slot:hover {
	border-color: var(--color-border-primary);
}

.slot.sel {
	border: 2px solid var(--color-text-primary);
	background: var(--color-background-secondary);
}

.slot-icon {
	width: 36px;
	height: 36px;
	border-radius: var(--radius-md);
	background: var(--color-background-secondary);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 17px;
	flex-shrink: 0;
}

.slot.sel .slot-icon {
	background: var(--color-background-primary);
}

.slot-time {
	font-size: 15px;
	font-weight: 500;
	margin: 0 0 2px;
}

.slot-label {
	font-size: 11px;
	color: var(--color-text-secondary);
	margin: 0;
}

.slot-radio {
	width: 18px;
	height: 18px;
	border-radius: 50%;
	border: 0.5px solid var(--color-border-secondary);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	margin-left: auto;
}

.slot.sel .slot-radio {
	background: var(--color-text-primary);
	border-color: var(--color-text-primary);
}

.slot.sel .slot-radio::after {
	content: '';
	width: 7px;
	height: 7px;
	border-radius: 50%;
	background: var(--color-background-primary);
}

.cap-warn {
	font-size: 11px;
	color: #ba7517;
	margin-top: 8px;
	display: flex;
	align-items: center;
	gap: 5px;
}

.hold-note {
	font-size: 12px;
	color: var(--color-text-secondary);
	margin-top: 10px;
	display: flex;
	align-items: center;
	gap: 6px;
	background: var(--color-background-secondary);
	padding: 8px 12px;
	border-radius: var(--radius-md);
}

.hold-note .ti {
	color: #1d9e75;
	font-size: 14px;
	flex-shrink: 0;
}

.details-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 10px;
}

.sum-title {
	font-size: 13px;
	font-weight: 500;
	margin: 0 0 10px;
}

.sum-row {
	display: flex;
	justify-content: space-between;
	font-size: 12px;
	margin-bottom: 5px;
}

.sum-label {
	color: var(--color-text-secondary);
}

.sum-val {
	font-weight: 500;
}

.sum-div {
	border: none;
	border-top: 0.5px solid var(--color-border-tertiary);
	margin: 10px 0;
}

.sum-total {
	display: flex;
	justify-content: space-between;
	font-size: 15px;
	font-weight: 500;
}

.sum-note {
	font-size: 11px;
	color: var(--color-text-tertiary);
	margin-top: 4px;
	text-align: right;
}

.cta-btn {
	width: 100%;
	padding: 13px;
	background: var(--color-text-primary);
	color: var(--color-background-primary);
	border: none;
	border-radius: var(--radius-md);
	font-size: 14px;
	font-weight: 500;
	cursor: pointer;
	font-family: var(--font-ui);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
}

.cta-btn:hover:not(:disabled) {
	opacity: 0.88;
}

.cta-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.back-btn {
	display: block;
	width: 100%;
	padding: 10px;
	background: none;
	color: var(--color-text-secondary);
	border: 0.5px solid var(--color-border-secondary);
	border-radius: var(--radius-md);
	font-size: 13px;
	cursor: pointer;
	font-family: var(--font-ui);
	margin-top: 8px;
	text-align: center;
	text-decoration: none;
}

.back-btn:hover {
	background: var(--color-background-secondary);
}

.policy-note {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 12px;
	color: var(--color-text-success);
	justify-content: center;
	margin-top: 10px;
}

.policy-note .ti {
	font-size: 13px;
}

@media (max-width: 768px) {
	.slots,
	.details-grid,
	.guests-grid {
		grid-template-columns: 1fr;
	}

	.cal-grid {
		gap: 2px;
	}
}

@media (max-width: 480px) {
	.cal-grid {
		font-size: 11px;
	}
}
</style>
