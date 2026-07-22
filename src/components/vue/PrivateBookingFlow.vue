<script setup lang="ts">
import { computed, ref } from 'vue';

type Props = {
	tourSlug: string;
	tourTitle: string;
	fromPrice?: string;
	priceNotes?: string;
};

const props = withDefaults(defineProps<Props>(), {
	fromPrice: 'Quoted',
	priceNotes: 'Private charters are quoted per boat and season.',
});

const BOATS = [
	{
		name: 'Open speedboat',
		cap: 8,
		icon: 'ti-sailboat',
		color: '#1D9E75',
		tags: ['Sun deck', 'Snorkel gear'],
	},
	{
		name: 'Cabin speedboat',
		cap: 12,
		icon: 'ti-ship',
		color: '#534AB7',
		tags: ['Cabin', 'BBQ-ready'],
	},
] as const;

const ROUTES = [
	{ icon: 'ti-droplet', name: 'Blue Cave & Vis', desc: 'Biševo cave and Vis bays when conditions allow' },
	{ icon: 'ti-building-lighthouse', name: 'Hvar & Pakleni', desc: 'Hvar town and Pakleni archipelago swim stops' },
	{ icon: 'ti-swimming', name: 'Blue Lagoon route', desc: 'Budikovac lagoon and nearby hidden bays' },
	{ icon: 'ti-map', name: 'Design your own', desc: 'Share your priorities — we plan the route with you' },
] as const;

const EXTRAS = [
	{ icon: 'ti-bottle', name: 'Champagne welcome', desc: 'Chilled on ice when you board' },
	{ icon: 'ti-camera', name: 'Photo package', desc: 'On-board photos, edited gallery within 24h' },
	{ icon: 'ti-tools-kitchen-2', name: 'Picnic lunch', desc: 'Local produce, seafood, and cheese board' },
	{ icon: 'ti-fish', name: 'Snorkelling gear', desc: 'Mask, fins, and vest for all guests' },
] as const;
const DUR_LABEL: Record<string, string> = {
	'2': '2 hours',
	'3': '3 hours',
	'4': '4 hours',
	'6': '6 hours',
	'8': 'Full day (8h)',
};

const selBoat = ref(0);
const preferredDate = ref('');
const departureTime = ref('10:00');
const duration = ref('3');
const adults = ref(2);
const children = ref(0);
const selRoute = ref(0);
const selectedExtras = ref<Set<number>>(new Set());
const specialRequests = ref('');

const boat = computed(() => BOATS[selBoat.value]);
const selectedExtrasList = computed(() => [...selectedExtras.value].map((i) => EXTRAS[i].name));

const guestSummary = computed(() => {
	const parts = [`${adults.value} adult${adults.value !== 1 ? 's' : ''}`];
	if (children.value > 0) {
		parts.push(`${children.value} child${children.value !== 1 ? 'ren' : ''}`);
	}
	return parts.join(', ');
});

const canSubmit = computed(() => preferredDate.value.length > 0);

function selectBoat(index: number) {
	selBoat.value = index;
	const cap = BOATS[index].cap;
	if (adults.value + children.value > cap) {
		children.value = Math.max(0, cap - adults.value);
	}
}

function bump(field: 'adults' | 'children', delta: number) {
	const cap = boat.value.cap;
	if (field === 'adults') {
		const n = adults.value + delta;
		if (n < 1 || n + children.value > cap) return;
		adults.value = n;
	} else {
		const n = children.value + delta;
		if (n < 0 || adults.value + n > cap) return;
		children.value = n;
	}
}

function toggleExtra(index: number) {
	const next = new Set(selectedExtras.value);
	if (next.has(index)) next.delete(index);
	else next.add(index);
	selectedExtras.value = next;
}

function goToReview() {
	if (!canSubmit.value) return;
	window.location.href = `/book/${props.tourSlug}/review`;
}
</script>

<template>
	<div class="private-booking">
		<div class="card">
			<p class="card-title"><i class="ti ti-sailboat" aria-hidden="true"></i> Choose your boat</p>
			<p class="card-sub">All boats come with a licensed captain and safety equipment.</p>
			<div class="boat-grid">
				<button
					v-for="(b, i) in BOATS"
					:key="b.name"
					type="button"
					class="boat-option"
					:class="{ sel: selBoat === i }"
					@click="selectBoat(i)"
				>
					<div class="boat-icon" :style="{ color: b.color }">
						<i :class="['ti', b.icon]" aria-hidden="true"></i>
					</div>
					<span class="boat-name">{{ b.name }}</span>
					<span class="boat-cap"><i class="ti ti-users" aria-hidden="true"></i> Up to {{ b.cap }} guests</span>
					<div class="boat-tags">
						<span v-for="tag in b.tags" :key="tag" class="boat-tag">{{ tag }}</span>
					</div>
					<span class="boat-price">From {{ props.fromPrice }}</span>
				</button>
			</div>
			<p class="cap-note">
				<i class="ti ti-info-circle" aria-hidden="true"></i>
				<span>{{ boat.name }} fits up to {{ boat.cap }} guests.</span>
			</p>
		</div>

		<div class="card">
			<p class="card-title"><i class="ti ti-calendar" aria-hidden="true"></i> When and how long</p>
			<p class="card-sub">Private charters depart at any time — we'll confirm availability after booking.</p>
			<div class="dtd-grid">
				<div class="field">
					<label for="private-date">Date</label>
					<input id="private-date" v-model="preferredDate" type="date" />
				</div>
				<div class="field">
					<label for="private-time">Departure time</label>
					<input id="private-time" v-model="departureTime" type="time" />
				</div>
				<div class="field">
					<label for="private-duration">Duration</label>
					<select id="private-duration" v-model="duration">
						<option value="2">2 hours</option>
						<option value="3">3 hours</option>
						<option value="4">4 hours</option>
						<option value="6">6 hours</option>
						<option value="8">Full day (8h)</option>
					</select>
				</div>
			</div>
		</div>

		<div class="card">
			<p class="card-title"><i class="ti ti-users" aria-hidden="true"></i> Guests</p>
			<p class="card-sub">Maximum {{ boat.cap }} guests for the selected boat.</p>
			<div class="guests-grid">
				<div class="guest-row">
					<div>
						<p class="guest-label">Adults</p>
						<p class="guest-sub-label">Age 13+</p>
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
						<p class="guest-sub-label">Age 3–12</p>
					</div>
					<div class="stepper">
						<button type="button" class="step-btn" aria-label="Fewer children" @click="bump('children', -1)">−</button>
						<span class="step-val">{{ children }}</span>
						<button type="button" class="step-btn" aria-label="More children" @click="bump('children', 1)">+</button>
					</div>
				</div>
			</div>
		</div>

		<div class="card">
			<p class="card-title"><i class="ti ti-map-2" aria-hidden="true"></i> Choose your route</p>
			<p class="card-sub">Pick a suggested route or describe your own in special requests.</p>
			<div class="route-grid">
				<button
					v-for="(route, i) in ROUTES"
					:key="route.name"
					type="button"
					class="route-option"
					:class="{ sel: selRoute === i }"
					@click="selRoute = i"
				>
					<i :class="['ti', route.icon, 'route-icon']" aria-hidden="true"></i>
					<div>
						<p class="route-name">{{ route.name }}</p>
						<p class="route-desc">{{ route.desc }}</p>
					</div>
				</button>
			</div>
		</div>

		<div class="card">
			<p class="card-title">
				<i class="ti ti-sparkles" aria-hidden="true"></i>
				Add extras
				<span class="optional-tag">— optional</span>
			</p>
			<p class="card-sub">Per-booking add-ons — all prepared before you arrive.</p>
			<div class="extras-list">
				<button
					v-for="(extra, i) in EXTRAS"
					:key="extra.name"
					type="button"
					class="extra-item"
					:class="{ sel: selectedExtras.has(i) }"
					@click="toggleExtra(i)"
				>
					<div class="extra-icon"><i :class="['ti', extra.icon]" aria-hidden="true"></i></div>
					<div class="extra-body">
						<p class="extra-name">{{ extra.name }}</p>
						<p class="extra-desc">{{ extra.desc }}</p>
					</div>
					<span class="extra-price">Quoted</span>
					<div class="extra-check" aria-hidden="true">
						<i v-if="selectedExtras.has(i)" class="ti ti-check"></i>
					</div>
				</button>
			</div>
		</div>

		<div class="card">
			<p class="card-title"><i class="ti ti-message" aria-hidden="true"></i> Special requests</p>
			<p class="card-sub">Allergies, accessibility needs, celebrations, custom route ideas.</p>
			<textarea
				v-model="specialRequests"
				class="requests-input"
				placeholder="e.g. It's our anniversary — can you have flowers on board?"
			></textarea>
		</div>

		<div class="summary-card">
			<p class="sum-title">Your charter</p>
			<div class="sum-row">
				<span class="sum-label">Boat</span>
				<span class="sum-val">{{ boat.name }}</span>
			</div>
			<div class="sum-row">
				<span class="sum-label">Duration</span>
				<span class="sum-val">{{ DUR_LABEL[duration] }}</span>
			</div>
			<div class="sum-row">
				<span class="sum-label">Guests</span>
				<span class="sum-val">{{ guestSummary }}</span>
			</div>
			<div class="sum-row">
				<span class="sum-label">Route</span>
				<span class="sum-val">{{ ROUTES[selRoute].name }}</span>
			</div>
			<div v-if="selectedExtrasList.length" class="sum-row">
				<span class="sum-label">Extras</span>
				<span class="sum-val">{{ selectedExtrasList.join(', ') }}</span>
			</div>
			<hr class="sum-div" />
			<div class="sum-total">
				<span>Indicative from</span>
				<span>{{ props.fromPrice }}</span>
			</div>
			<p class="sum-note">{{ props.priceNotes }}</p>
		</div>

		<button type="button" class="cta-btn" :disabled="!canSubmit" @click="goToReview">
			Review booking
			<i class="ti ti-arrow-right" aria-hidden="true"></i>
		</button>
		<a class="back-btn" href="/tours/create-perfect-day-private">← Back to tour type</a>
		<p class="policy-note">
			<i class="ti ti-shield-check" aria-hidden="true"></i>
			Free cancellation up to 48h before departure
		</p>
	</div>
</template>

<style scoped>
.private-booking :deep(input),
.private-booking :deep(select),
.private-booking :deep(textarea) {
	font-family: var(--font-ui);
	padding: 8px 10px;
	border: 0.5px solid var(--color-border-secondary);
	border-radius: var(--radius-md);
	background: var(--color-background-primary);
	color: var(--color-text-primary);
	outline: none;
	width: 100%;
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

.optional-tag {
	font-size: 12px;
	font-weight: 400;
	color: var(--color-text-tertiary);
}

.card-sub {
	font-size: 12px;
	color: var(--color-text-secondary);
	margin: 0 0 14px;
}

.boat-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 10px;
}

.boat-option {
	border: 0.5px solid var(--color-border-secondary);
	border-radius: var(--radius-md);
	padding: 12px;
	cursor: pointer;
	display: flex;
	flex-direction: column;
	gap: 5px;
	background: var(--color-background-primary);
	font-family: var(--font-ui);
	text-align: left;
	width: 100%;
}

.boat-option:hover {
	border-color: var(--color-border-primary);
}

.boat-option.sel {
	border: 2px solid var(--color-text-primary);
	background: var(--color-background-secondary);
}

.boat-icon {
	font-size: 22px;
}

.boat-name {
	font-size: 13px;
	font-weight: 500;
}

.boat-cap {
	font-size: 11px;
	color: var(--color-text-secondary);
}

.boat-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	margin-top: 2px;
}

.boat-tag {
	font-size: 10px;
	padding: 2px 7px;
	border-radius: 10px;
	background: var(--color-background-secondary);
	color: var(--color-text-secondary);
}

.boat-option.sel .boat-tag {
	background: var(--color-background-primary);
}

.boat-price {
	font-size: 13px;
	font-weight: 500;
	margin-top: 4px;
}

.cap-note {
	font-size: 11px;
	color: var(--color-text-tertiary);
	margin-top: 8px;
	display: flex;
	align-items: center;
	gap: 5px;
}

.dtd-grid {
	display: grid;
	grid-template-columns: 1fr 1fr 1fr;
	gap: 10px;
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

.route-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;
}

.route-option {
	border: 0.5px solid var(--color-border-secondary);
	border-radius: var(--radius-md);
	padding: 11px 13px;
	cursor: pointer;
	display: flex;
	align-items: flex-start;
	gap: 9px;
	background: var(--color-background-primary);
	font-family: var(--font-ui);
	text-align: left;
	width: 100%;
}

.route-option:hover {
	border-color: var(--color-border-primary);
}

.route-option.sel {
	border: 2px solid var(--color-text-primary);
	background: var(--color-background-secondary);
}

.route-icon {
	font-size: 18px;
	color: #1d9e75;
	margin-top: 1px;
	flex-shrink: 0;
}

.route-name {
	font-size: 13px;
	font-weight: 500;
	margin: 0 0 2px;
}

.route-desc {
	font-size: 11px;
	color: var(--color-text-secondary);
	line-height: 1.4;
	margin: 0;
}

.extras-list {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.extra-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 11px 13px;
	border: 0.5px solid var(--color-border-tertiary);
	border-radius: var(--radius-md);
	cursor: pointer;
	background: var(--color-background-primary);
	font-family: var(--font-ui);
	text-align: left;
	width: 100%;
}

.extra-item:hover {
	border-color: var(--color-border-secondary);
}

.extra-item.sel {
	border: 0.5px solid var(--color-text-primary);
	background: var(--color-background-secondary);
}

.extra-icon {
	width: 34px;
	height: 34px;
	border-radius: var(--radius-md);
	background: var(--color-background-secondary);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 16px;
	color: #1d9e75;
	flex-shrink: 0;
}

.extra-item.sel .extra-icon {
	background: var(--color-background-primary);
}

.extra-body {
	flex: 1;
	min-width: 0;
}

.extra-name {
	font-size: 13px;
	font-weight: 500;
	margin: 0 0 2px;
}

.extra-desc {
	font-size: 11px;
	color: var(--color-text-secondary);
	margin: 0;
}

.extra-price {
	font-size: 13px;
	font-weight: 500;
	white-space: nowrap;
	margin-left: auto;
}

.extra-check {
	width: 18px;
	height: 18px;
	border-radius: 4px;
	border: 0.5px solid var(--color-border-secondary);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	font-size: 11px;
}

.extra-item.sel .extra-check {
	background: var(--color-text-primary);
	border-color: var(--color-text-primary);
	color: var(--color-background-primary);
}

.requests-input {
	width: 100%;
	min-height: 72px;
	font-size: 13px;
	resize: vertical;
}

.summary-card {
	background: var(--color-background-secondary);
	border-radius: var(--radius-lg);
	padding: 1.1rem 1.25rem;
	margin-bottom: 16px;
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
	margin: 4px 0 0;
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
	flex-wrap: wrap;
	justify-content: center;
	gap: 4px 6px;
	font-size: 12px;
	color: var(--color-text-success);
	text-align: center;
	padding-inline: 0.5rem;
	margin: 10px 0 0;
}

.policy-note .ti {
	font-size: 13px;
}

@media (max-width: 768px) {
	.boat-grid,
	.guests-grid,
	.route-grid {
		grid-template-columns: 1fr;
	}

	.private-booking :deep(input),
	.private-booking :deep(select),
	.private-booking :deep(textarea) {
		font-size: 16px;
	}

	.dtd-grid {
		grid-template-columns: 1fr 1fr;
	}

	.dtd-grid .field:last-child {
		grid-column: 1 / -1;
	}
}

@media (max-width: 480px) {
	.dtd-grid {
		grid-template-columns: 1fr;
	}
}
</style>
