<script setup lang="ts">
/*
 * Date picker for the booking flow (spec §8.1.2). Monday-first; each day is a
 * button with its full date as its name. Days in the past or outside the
 * season (D-15) are aria-disabled and explained by a visible legend. "Today"
 * is Split's today (Europe/Zagreb), worked out in the browser: the page is
 * prerendered, so `renderedOn` is only the build date. Today is blocked too
 * once booking has closed for every departure (dayClosed).
 */
import { computed, ref, watch } from 'vue';
import { parseIsoDate, toIsoDate } from '../../../lib/booking';
import { businessDate, dayClosed } from '../../../lib/bookings/dates';

const props = defineProps<{
	/** YYYY-MM-DD the page was built, so the first client render matches the HTML. */
	renderedOn: string;
	/** MM-DD, inclusive. */
	seasonStart: string;
	seasonEnd: string;
	seasonLabel: string;
	/** The current moment, set by the parent once mounted (null while server-rendering). */
	now: Date | null;
	/** Fixed departure times ("HH:MM"); empty when the time isn't fixed. */
	departures: string[];
}>();

const selected = defineModel<string | null>({ default: null });

const today = computed(() => (props.now ? businessDate(props.now) : props.renderedOn));
/** Booking has closed for every one of today's departures. */
const todayClosed = computed(() => props.now !== null && dayClosed(today.value, props.departures, props.now));
const start = parseIsoDate(props.renderedOn) ?? new Date();
const viewYear = ref(start.getFullYear());
const viewMonth = ref(start.getMonth());

const allYear = computed(() => props.seasonStart === '01-01' && props.seasonEnd === '12-31');
const inSeason = (iso: string) => {
	const md = iso.slice(5);
	return md >= props.seasonStart && md <= props.seasonEnd;
};

const monthLabel = computed(() => new Date(viewYear.value, viewMonth.value, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }));
const canGoBack = computed(() => {
	const t = parseIsoDate(today.value);
	return !t || viewYear.value > t.getFullYear() || (viewYear.value === t.getFullYear() && viewMonth.value > t.getMonth());
});

type Cell = { key: string; iso: string | null; day: number | null; label: string; blocked: boolean; reason: string; today: boolean };

const cells = computed<Cell[]>(() => {
	const first = new Date(viewYear.value, viewMonth.value, 1);
	const pad = (first.getDay() + 6) % 7;
	const days = new Date(viewYear.value, viewMonth.value + 1, 0).getDate();
	const out: Cell[] = Array.from({ length: pad }, (_, i) => ({ key: `pad-${i}`, iso: null, day: null, label: '', blocked: true, reason: '', today: false }));
	for (let d = 1; d <= days; d++) {
		const date = new Date(viewYear.value, viewMonth.value, d);
		const iso = toIsoDate(date);
		const past = iso < today.value;
		const closed = iso === today.value && todayClosed.value;
		const off = !inSeason(iso);
		out.push({
			key: iso,
			iso,
			day: d,
			label: date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
			blocked: past || closed || off,
			reason: past ? ', in the past' : closed ? ', booking closed for today' : off ? ', outside the season' : '',
			today: iso === today.value,
		});
	}
	return out;
});

function move(delta: number) {
	if (delta < 0 && !canGoBack.value) return;
	const next = new Date(viewYear.value, viewMonth.value + delta, 1);
	viewYear.value = next.getFullYear();
	viewMonth.value = next.getMonth();
}

function pick(cell: Cell) {
	if (cell.iso && !cell.blocked) selected.value = cell.iso;
}

/** Shows the selected date's month (e.g. after a prefill). */
function showSelected() {
	const d = selected.value ? parseIsoDate(selected.value) : null;
	if (d) {
		viewYear.value = d.getFullYear();
		viewMonth.value = d.getMonth();
	}
}
defineExpose({ showSelected });

// Once the browser knows the real time: open on Split's today, whatever the visitor's time zone.
watch(
	() => props.now !== null,
	(known) => {
		if (!known) return;
		const t = parseIsoDate(today.value);
		if (t && !selected.value) {
			viewYear.value = t.getFullYear();
			viewMonth.value = t.getMonth();
		}
		// Out of season this month: open on the first month that has bookable days.
		for (let i = 0; i < 12 && !cells.value.some((c) => c.iso && !c.blocked); i++) move(1);
	},
	{ immediate: true },
);
</script>

<template>
	<div class="cal">
		<div class="cal__head">
			<button type="button" class="cal__nav" aria-label="Previous month" :aria-disabled="!canGoBack" @click="move(-1)">
				<i class="ti ti-chevron-left" aria-hidden="true"></i>
			</button>
			<p id="cal-month" class="cal__month" aria-live="polite">{{ monthLabel }}</p>
			<button type="button" class="cal__nav" aria-label="Next month" @click="move(1)">
				<i class="ti ti-chevron-right" aria-hidden="true"></i>
			</button>
		</div>
		<div class="cal__grid" role="group" aria-labelledby="cal-month">
			<span v-for="d in ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']" :key="d" class="cal__dow" aria-hidden="true">{{ d }}</span>
			<template v-for="cell in cells" :key="cell.key">
				<span v-if="cell.day === null" aria-hidden="true"></span>
				<button
					v-else
					type="button"
					class="cal__day"
					:class="{ 'is-today': cell.today, 'is-selected': selected === cell.iso, 'is-blocked': cell.blocked }"
					:aria-pressed="selected === cell.iso"
					:aria-disabled="cell.blocked || undefined"
					:aria-current="cell.today ? 'date' : undefined"
					:aria-label="`${cell.label}${selected === cell.iso ? ', selected' : ''}${cell.reason}`"
					@click="pick(cell)"
				>
					{{ cell.day }}
				</button>
			</template>
		</div>
		<p class="cal__legend">
			<span class="cal__swatch" aria-hidden="true"></span>
			<template v-if="allYear">Greyed-out days are past or closed for booking.</template>
			<template v-else>Greyed-out days are past, closed for booking or outside the season ({{ seasonLabel }}).</template>
		</p>
	</div>
</template>

<style scoped>
@layer components {
	.cal__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-2);
	}

	.cal__month {
		margin: 0;
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-medium);
	}

	.cal__nav {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: 0.5px solid var(--color-border-secondary);
		border-radius: var(--radius-md);
		background: var(--color-background-primary);
		color: var(--color-text-primary);
		cursor: pointer;
	}

	.cal__nav[aria-disabled='true'] {
		color: var(--color-border-secondary);
		cursor: default;
	}

	.cal__grid {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: var(--space-1);
	}

	.cal__dow {
		padding: 4px 0;
		font-size: var(--font-size-micro);
		font-weight: var(--font-weight-medium);
		text-align: center;
		color: var(--color-text-tertiary);
	}

	.cal__day {
		height: 36px;
		padding: 0;
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		background: none;
		color: var(--color-text-primary);
		font: inherit;
		font-size: var(--font-size-sm);
		cursor: pointer;
	}

	.cal__day:hover {
		border-color: var(--color-border-primary);
		background: var(--color-background-secondary);
	}

	.cal__day.is-today {
		border-color: var(--color-border-info);
	}

	.cal__day.is-selected {
		border-color: var(--color-border-brand);
		background: var(--color-background-brand);
		color: var(--color-text-on-image);
		font-weight: var(--font-weight-medium);
	}

	.cal__day.is-blocked {
		border-color: transparent;
		background: none;
		color: var(--color-text-tertiary);
		text-decoration: line-through;
		cursor: default;
	}

	.cal__legend {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin: var(--space-3) 0 0;
		font-size: var(--font-size-xs);
		color: var(--color-text-tertiary);
	}

	.cal__swatch {
		width: 14px;
		height: 2px;
		background: var(--color-text-tertiary);
	}

	@media (max-width: 768px) {
		.cal__grid {
			gap: 2px;
		}
	}
}
</style>
