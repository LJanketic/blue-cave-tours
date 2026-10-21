<script setup lang="ts">
/*
 * Destinations results (spec §6.4): a labelled count, the card grid and the
 * empty state. The chips live in DestinationFilters.vue (the hero); both read
 * destinationsState. Without JavaScript every destination shows.
 */
import { computed, onMounted, ref } from 'vue';
import type { DestinationCardDTO } from '../../lib/cards';
import { DESTINATION_FILTERS, destinationsState } from '../../lib/destinations-catalog-state';
import DestinationCard from './DestinationCard.vue';
import EmptyState from '../ui/EmptyState.vue';

const props = defineProps<{ destinations: DestinationCardDTO[] }>();

const mounted = ref(false);
onMounted(() => (mounted.value = true));
const category = computed(() => (mounted.value ? destinationsState.category : ''));
const shown = computed(() =>
	category.value ? props.destinations.filter((d) => d.categories.includes(category.value as never)) : props.destinations,
);
const label = computed(() => DESTINATION_FILTERS.find((f) => f.id === category.value)?.label ?? 'All destinations');
</script>

<template>
	<div class="dest-results">
		<h2 class="dest-results__label" aria-live="polite">{{ label }} ({{ shown.length }})</h2>
		<ul v-if="shown.length" class="dest-results__grid" role="list">
			<li v-for="destination in shown" :key="destination.slug">
				<DestinationCard :destination="destination" />
			</li>
		</ul>
		<EmptyState v-else icon="compass-off" text="No destinations match this filter." class="dest-results__empty" />
	</div>
</template>

<style scoped>
@layer components {
	.dest-results {
		padding-top: 28px;
	}

	/* board 04 .section-label */
	.dest-results__label {
		margin: 0 0 var(--space-3);
		font-size: var(--font-size-micro);
		font-weight: var(--font-weight-medium);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-tertiary);
	}

	/* 20 Oct handoff: 3 columns, 2 from 1024px, 1 from 640px. */
	.dest-results__grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-5);
		margin: 0 0 28px;
		padding: 0;
		list-style: none;
	}

	.dest-results__grid > li {
		display: flex;
	}

	.dest-results__grid > li > :deep(*) {
		flex: 1;
	}

	.dest-results__empty {
		padding: 2.5rem;
	}

	@media (max-width: 1024px) {
		.dest-results__grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 640px) {
		.dest-results__grid {
			grid-template-columns: 1fr;
			gap: 14px;
		}
	}
}
</style>
