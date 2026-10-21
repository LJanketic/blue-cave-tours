<script setup lang="ts">
/*
 * Guest counts (spec §8.1.2): adults (at least 1), children and infants.
 * Infants are free but take a seat, so the cap counts all three (D-9). One
 * status line announces each change and the cap.
 */
import { computed, ref } from 'vue';
import type { AgeBands } from '../../../types/tour';

const props = withDefaults(
	defineProps<{
		ageBands: AgeBands;
		adultPrice: number | null;
		childPrice: number | null;
		max: number;
		/** What the cap is per: a group departure, or a private boat. */
		capUnit?: string;
		/** Infants ride free on a group tour; a private boat is priced by quote, so it doesn't say "free". */
		infantsFree?: boolean;
	}>(),
	{ capUnit: 'per departure', infantsFree: true },
);
const adults = defineModel<number>('adults', { required: true });
const children = defineModel<number>('children', { required: true });
const infants = defineModel<number>('infants', { required: true });

const total = computed(() => adults.value + children.value + infants.value);
const status = ref('');

type Kind = 'adults' | 'children' | 'infants';
const ROWS = computed(() => [
	{ kind: 'adults' as Kind, label: 'Adults', sub: `${props.ageBands.adult}${props.adultPrice !== null ? ` · €${props.adultPrice}` : ''}`, min: 1 },
	{ kind: 'children' as Kind, label: 'Children', sub: `${props.ageBands.child}${props.childPrice !== null ? ` · €${props.childPrice}` : ''}`, min: 0 },
	{ kind: 'infants' as Kind, label: 'Infants', sub: `Under ${props.ageBands.infantMaxAge + 1}${props.infantsFree ? ' · free' : ''}`, min: 0 },
]);

const model = { adults, children, infants };
const noun = (kind: Kind, n: number) => (kind === 'adults' ? (n === 1 ? 'adult' : 'adults') : kind === 'children' ? (n === 1 ? 'child' : 'children') : n === 1 ? 'infant' : 'infants');

function step(kind: Kind, delta: number, min: number) {
	const value = model[kind].value + delta;
	if (value < min) return;
	if (delta > 0 && total.value >= props.max) {
		status.value = `Up to ${props.max} persons ${props.capUnit}, infants included.`;
		return;
	}
	model[kind].value = value;
	status.value = `${value} ${noun(kind, value)}${total.value >= props.max ? `. That's the maximum of ${props.max} guests.` : ''}`;
}
</script>

<template>
	<div class="guests">
		<div v-for="row in ROWS" :key="row.kind" class="guests__row">
			<div>
				<p :id="`guests-${row.kind}`" class="guests__label">{{ row.label }}</p>
				<p class="guests__sub">{{ row.sub }}</p>
			</div>
			<div class="guests__stepper" role="group" :aria-labelledby="`guests-${row.kind}`">
				<button
					type="button"
					class="guests__btn"
					:aria-label="`Fewer ${row.label.toLowerCase()}`"
					:aria-disabled="model[row.kind].value <= row.min || undefined"
					@click="step(row.kind, -1, row.min)"
				>
					<i class="ti ti-minus" aria-hidden="true"></i>
				</button>
				<span class="guests__value" aria-hidden="true">{{ model[row.kind].value }}</span>
				<span class="sr-only">{{ model[row.kind].value }} {{ noun(row.kind, model[row.kind].value) }}</span>
				<button
					type="button"
					class="guests__btn"
					:aria-label="`More ${row.label.toLowerCase()}`"
					:aria-disabled="total >= max || undefined"
					@click="step(row.kind, 1, row.min)"
				>
					<i class="ti ti-plus" aria-hidden="true"></i>
				</button>
			</div>
		</div>
		<p class="sr-only" role="status">{{ status }}</p>
		<p v-if="total >= max" class="guests__cap">That's the maximum of {{ max }} persons {{ capUnit }}, infants included.</p>
	</div>
</template>

<style scoped>
@layer components {
	.guests {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-2);
	}

	.guests__row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		padding: 10px var(--space-3);
		border-radius: var(--radius-md);
		background: var(--color-background-secondary);
	}

	.guests__label {
		margin: 0;
		font-size: var(--font-size-base);
	}

	.guests__sub {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--color-text-tertiary);
	}

	.guests__stepper {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	/* 28px as designed; there's space around them, so the target is met (WCAG 2.5.8). */
	.guests__btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: 0.5px solid var(--color-border-input);
		border-radius: 50%;
		background: var(--color-background-primary);
		color: var(--color-text-primary);
		cursor: pointer;
	}

	.guests__btn[aria-disabled='true'] {
		border-color: var(--color-border-tertiary);
		color: var(--color-border-secondary);
		cursor: default;
	}

	.guests__value {
		min-width: 1.5em;
		font-weight: var(--font-weight-medium);
		text-align: center;
	}

	.guests__cap {
		grid-column: 1 / -1;
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--color-text-warning);
	}

	@media (max-width: 768px) {
		.guests {
			grid-template-columns: 1fr;
		}
	}
}
</style>
