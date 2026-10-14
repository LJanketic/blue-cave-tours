<script setup lang="ts">
/*
 * Tours overview results (spec §6.2.2): count, "Clear filters", the card grid
 * and the empty state. The filters live in TourFilters.vue (the hero); both
 * read catalogState. Without JavaScript the server-rendered full list shows.
 */
import { computed, onMounted, ref } from 'vue';
import type { TourCardDTO } from '../../lib/cards';
import { catalogState } from '../../lib/tours-catalog-state';
import { filterCatalog, parseCatalogQuery } from '../../lib/tour-filters';
import TourCard from './TourCard.vue';
import EmptyState from '../ui/EmptyState.vue';
import Button from '../ui/Button.vue';

const props = defineProps<{ tours: TourCardDTO[] }>();

// Until this island has mounted it renders exactly what the server did (the
// full list): the hero's chips may already have read filters from the URL,
// and hydrating straight into a filtered list would mismatch the HTML.
const mounted = ref(false);
const query = computed(() => (mounted.value ? catalogState : parseCatalogQuery('')));
const shown = computed(() => filterCatalog(props.tours, query.value));
const filtered = computed(
	() => query.value.filters.length > 0 || query.value.destination !== '' || query.value.q.trim() !== '',
);

function clearFilters() {
	Object.assign(catalogState, { filters: [], destination: '', q: '' });
}

onMounted(() => {
	if (!catalogState.ready) {
		Object.assign(catalogState, parseCatalogQuery(window.location.search), { ready: true });
	}
	mounted.value = true;
});
</script>

<template>
	<div class="tours-results">
		<div class="tours-results__bar">
			<p class="tours-results__count" aria-live="polite">
				<strong>{{ shown.length }}</strong>
				{{ shown.length === 1 ? 'tour' : 'tours' }}{{ filtered ? (shown.length === 1 ? ' matches your filters' : ' match your filters') : '' }}
			</p>
			<button v-if="filtered" type="button" class="tours-results__clear" @click="clearFilters">Clear filters</button>
		</div>
		<ul v-if="shown.length" class="tours-results__grid" role="list">
			<li v-for="tour in shown" :key="tour.slug">
				<TourCard :tour="tour" />
			</li>
		</ul>
		<EmptyState v-else icon="mood-sad" text="No tours match your filters.">
			<Button variant="secondary" size="sm" @click="clearFilters">Clear filters</Button>
		</EmptyState>
	</div>
</template>

<style scoped>
@layer components {
	.tours-results {
		padding-top: var(--space-7);
	}

	.tours-results__bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 28px;
		margin-bottom: var(--space-4);
	}

	.tours-results__count {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.tours-results__count strong {
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
	}

	.tours-results__clear {
		min-height: 24px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-text-info);
		font: inherit;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
	}

	.tours-results__clear:hover {
		text-decoration: underline;
	}

	.tours-results__grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: var(--space-4);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.tours-results__grid > li {
		display: flex;
	}

	.tours-results__grid > li > :deep(*) {
		flex: 1;
	}
}
</style>
