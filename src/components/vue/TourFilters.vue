<script setup lang="ts">
/*
 * The Tours hero's destination dropdown, filter chips and sort (spec §6.2.1,
 * handoff T3). Shares its state with ToursCatalog.vue through catalogState,
 * and keeps the URL in step so a filtered list can be shared. Without
 * JavaScript nothing renders here and the full list shows below.
 */
import { computed, onMounted, ref, watch } from 'vue';
import Chip from '../ui/Chip.vue';
import ChipGroup from '../ui/ChipGroup.vue';
import { catalogState } from '../../lib/tours-catalog-state';
import {
	catalogQueryString,
	parseCatalogQuery,
	TOUR_DESTINATION_OPTIONS,
	type TourFilter,
	type TourSort,
} from '../../lib/tour-filters';

const props = defineProps<{
	/** The Sunset chip only shows when some tour has the tag. */
	hasSunset: boolean;
}>();

// "Private", not "Private only": the chip lists every tour that runs privately,
// and most of those run as group tours too.
const CHIPS = computed<{ id: TourFilter; label: string; icon: string }[]>(() => [
	{ id: 'group', label: 'Group', icon: 'users' },
	{ id: 'private', label: 'Private', icon: 'crown' },
	{ id: 'short', label: 'Half day', icon: 'clock' },
	...(props.hasSunset ? [{ id: 'sunset' as const, label: 'Sunset', icon: 'sunset' }] : []),
]);

// "Recommended", not "Most popular": the order is featured first, not sales data.
const SORTS: { id: TourSort; label: string }[] = [
	{ id: 'recommended', label: 'Recommended' },
	{ id: 'price-asc', label: 'Price: low to high' },
	{ id: 'price-desc', label: 'Price: high to low' },
	{ id: 'duration', label: 'Duration' },
];

// Render what the server did (no filters) until mounted: the results island
// may have read the URL into the shared state first, and hydrating straight
// into that state would mismatch the HTML.
const mounted = ref(false);
const view = computed(() => (mounted.value ? catalogState : parseCatalogQuery('')));

function toggle(id: TourFilter) {
	catalogState.filters = catalogState.filters.includes(id)
		? catalogState.filters.filter((f) => f !== id)
		: [...catalogState.filters, id];
}

onMounted(() => {
	if (!catalogState.ready) {
		Object.assign(catalogState, parseCatalogQuery(window.location.search), { ready: true });
	}
	mounted.value = true;
});

watch(
	() => catalogQueryString(catalogState),
	(query) => {
		if (!catalogState.ready) return;
		history.replaceState(null, '', `${window.location.pathname}${query}${window.location.hash}`);
	},
);
</script>

<template>
	<div class="tour-filters">
		<ChipGroup label="Filter tours">
			<!-- The select fills the pill, so a tap anywhere on it opens the list; the icons let clicks through. -->
			<label class="tour-filters__select">
				<i class="ti ti-map-pin" aria-hidden="true"></i>
				<select :value="view.destination" aria-label="Destination" @change="catalogState.destination = ($event.target as HTMLSelectElement).value">
					<option value="">All destinations</option>
					<option v-for="option in TOUR_DESTINATION_OPTIONS" :key="option.id" :value="option.id">{{ option.label }}</option>
				</select>
				<i class="ti ti-chevron-down" aria-hidden="true"></i>
			</label>
			<Chip v-for="chip in CHIPS" :key="chip.id" :icon="chip.icon" :pressed="view.filters.includes(chip.id)" @click="toggle(chip.id)">
				{{ chip.label }}
			</Chip>
			<label class="tour-filters__select tour-filters__select--sort">
				<i class="ti ti-arrows-sort" aria-hidden="true"></i>
				<select v-model="catalogState.sort" aria-label="Sort tours">
					<option v-for="option in SORTS" :key="option.id" :value="option.id">{{ option.label }}</option>
				</select>
				<i class="ti ti-chevron-down" aria-hidden="true"></i>
			</label>
		</ChipGroup>
	</div>
</template>

<style scoped>
@layer components {
	.tour-filters {
		width: 100%;
	}

	/*
	 * A glass pill like the chips, wrapping a native select (board 02
	 * .sort-chip). The select itself fills the pill, padded past the icons,
	 * which sit on top and let clicks through (handoff T4).
	 */
	.tour-filters__select {
		position: relative;
		display: inline-flex;
		flex: 0 0 auto;
		height: 38px;
		border: 1px solid var(--color-border-glass);
		border-radius: var(--radius-pill);
		background: var(--color-glass-dark);
		backdrop-filter: blur(14px) saturate(140%);
		-webkit-backdrop-filter: blur(14px) saturate(140%);
		color: var(--color-text-on-image);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
	}

	.tour-filters__select--sort {
		margin-left: auto;
	}

	.tour-filters__select:hover {
		background: var(--color-glass-dark-hover);
	}

	/* The ring for keyboard focus only (as the rest of the site); :focus-within where :has() isn't supported. */
	.tour-filters__select:has(select:focus-visible) {
		outline: 2px solid var(--color-text-on-image);
		outline-offset: 2px;
		box-shadow: 0 0 0 4px var(--palette-navy-950);
	}

	@supports not selector(:has(*)) {
		.tour-filters__select:focus-within {
			outline: 2px solid var(--color-text-on-image);
			outline-offset: 2px;
			box-shadow: 0 0 0 4px var(--palette-navy-950);
		}
	}

	.tour-filters__select .ti {
		position: absolute;
		top: 50%;
		font-size: 16px;
		transform: translateY(-50%);
		pointer-events: none;
	}

	.tour-filters__select .ti:first-child {
		left: 14px;
	}

	.tour-filters__select .ti:last-child {
		right: 12px;
	}

	.tour-filters__select select {
		height: 100%;
		margin: 0;
		/* 14px gutter + 16px icon + 6px gap on the left; the chevron's on the right. */
		padding: 0 34px 0 36px;
		border: 0;
		border-radius: inherit;
		background: transparent;
		color: inherit;
		font: inherit;
		cursor: pointer;
		appearance: none;
		-webkit-appearance: none;
		/* As wide as the chosen option, not the longest one, where supported. */
		field-sizing: content;
	}

	/* The ring is on the pill. */
	.tour-filters__select select:focus-visible {
		outline: none;
	}

	.tour-filters__select option {
		color: var(--color-text-primary);
	}

	@media (max-width: 768px) {
		.tour-filters__select--sort {
			margin-left: 0;
		}
	}
}
</style>
