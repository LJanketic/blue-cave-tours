<script setup lang="ts">
/*
 * A choice between a few options (spec §3.2): native radios inside label
 * cards, in a fieldset with a legend. No ARIA radio roles needed.
 */
defineProps<{
	name: string;
	legend: string;
	/** Hide the legend visually when a card heading already says it. */
	legendHidden?: boolean;
	options: { value: string; label: string; sub?: string; icon?: string }[];
}>();
const model = defineModel<string>({ required: true });
</script>

<template>
	<fieldset class="choices">
		<legend :class="legendHidden ? 'sr-only' : 'choices__legend'">{{ legend }}</legend>
		<label v-for="option in options" :key="option.value" class="choices__card" :class="{ 'is-on': model === option.value }">
			<input v-model="model" type="radio" :name="name" :value="option.value" class="choices__input" />
			<span v-if="option.icon" class="choices__icon" aria-hidden="true"><i :class="`ti ti-${option.icon}`"></i></span>
			<span>
				<span class="choices__label">{{ option.label }}</span>
				<span v-if="option.sub" class="choices__sub">{{ option.sub }}</span>
			</span>
		</label>
	</fieldset>
</template>

<style scoped>
@layer components {
	.choices {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
		margin: 0;
		padding: 0;
		border: 0;
	}

	.choices__legend {
		grid-column: 1 / -1;
		margin-bottom: var(--space-2);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
	}

	.choices__card {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: 14px var(--space-4);
		border: 1px solid var(--color-border-card);
		border-radius: var(--radius-lg);
		cursor: pointer;
	}

	.choices__card:hover {
		border-color: var(--color-border-primary);
	}

	/* Selected: 2px brand border and a blue-100 fill (§3.2). */
	.choices__card.is-on {
		padding: 13px 15px;
		border: 2px solid var(--color-border-brand);
		background: var(--color-background-brand-soft);
	}

	/* The native radio stays visible: its own focus ring and checked state work everywhere. */
	.choices__input {
		flex-shrink: 0;
		width: 18px;
		height: 18px;
		margin: 0;
		accent-color: var(--color-brand);
	}

	.choices__icon {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: var(--radius-md);
		background: var(--color-background-secondary);
		font-size: 18px;
		color: var(--color-text-brand);
	}

	.choices__label {
		display: block;
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-medium);
	}

	.choices__sub {
		display: block;
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}

	@media (max-width: 768px) {
		.choices {
			grid-template-columns: 1fr;
		}
	}
}
</style>
