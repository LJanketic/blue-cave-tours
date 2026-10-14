<script setup lang="ts">
/* The island twin of booking/SummaryCard.astro: same classes, same stylesheet. */
import '../../styles/components/summary-card.css';

withDefaults(
	defineProps<{
		title?: string;
		rows: { label: string; value: string }[];
		total?: { label: string; value: string };
		note?: string;
		large?: boolean;
		level?: 2 | 3;
	}>(),
	{ title: undefined, total: undefined, note: undefined, large: false, level: 2 },
);
</script>

<template>
	<div :class="['summary-card-ui', large && 'summary-card-ui--large']">
		<component :is="`h${level}`" v-if="title" class="summary-card-ui__title">{{ title }}</component>
		<dl class="summary-card-ui__rows">
			<div v-for="row in rows" :key="row.label" class="summary-card-ui__row">
				<dt>{{ row.label }}</dt>
				<dd>{{ row.value }}</dd>
			</div>
		</dl>
		<p v-if="total" class="summary-card-ui__total">
			<span>{{ total.label }}</span>
			<span>{{ total.value }}</span>
		</p>
		<p v-if="note" class="summary-card-ui__note">{{ note }}</p>
		<slot />
	</div>
</template>
