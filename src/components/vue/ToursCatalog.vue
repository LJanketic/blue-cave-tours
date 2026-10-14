<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import type { TourDetail } from '../../types/tour';
import { isGroupTour, tourPriceUnit } from '../../lib/booking';
import { tourFromPrice } from '../../lib/price';
import { showsBestseller } from '../../lib/tour-display';
import {
	matchesAnyFilter,
	searchTours,
	sortTours,
	type TourFilter,
} from '../../lib/tour-filters';

type CardPhoto = { src?: string; srcset?: string; alt: string };

const props = defineProps<{
	tours: TourDetail[];
	/** Destination slug → tour slugs that visit it (for `/tours/?destination=`). */
	toursByDestination?: Record<string, string[]>;
	/** Tour slug → pre-optimized card photo (built at build time via astro:assets). */
	cardPhotos: Record<string, CardPhoto>;
}>();

const FILTERS: { id: TourFilter; label: string; icon: string }[] = [
	{ id: 'group', label: 'Group', icon: 'users' },
	{ id: 'private', label: 'Private only', icon: 'crown' },
	{ id: 'short', label: 'Half day', icon: 'clock' },
	{ id: 'sunset', label: 'Sunset', icon: 'sunset' },
];

/** Tour slug → price unit ('' when the price isn't a number), computed once. */
const priceUnits = computed(() => new Map(props.tours.map((tour) => [tour.slug, tourPriceUnit(tour)])));

const activeFilters = ref<Set<TourFilter>>(new Set());
const sort = ref('popular');
const destinationSlug = ref('');
const searchQuery = ref('');

const filtersActive = computed(
	() =>
		activeFilters.value.size > 0 ||
		destinationSlug.value !== '' ||
		searchQuery.value.trim() !== '',
);

const filteredTours = computed(() => {
	let list = props.tours.filter((tour) => matchesAnyFilter(tour, activeFilters.value));

	if (destinationSlug.value) {
		const slugs = new Set(props.toursByDestination?.[destinationSlug.value] ?? []);
		list = list.filter((tour) => slugs.has(tour.slug));
	}

	list = searchTours(list, searchQuery.value);
	return sortTours(list, sort.value);
});

const featuredTours = computed(() =>
	filtersActive.value ? [] : filteredTours.value.filter((t) => t.featured),
);

const otherTours = computed(() =>
	filtersActive.value ? filteredTours.value : filteredTours.value.filter((t) => !t.featured),
);

const catalogSections = computed(() => {
	const sections: { label: string; tours: TourDetail[]; highlight: boolean }[] = [];

	if (featuredTours.value.length) {
		sections.push({
			label: `Featured (${featuredTours.value.length})`,
			tours: featuredTours.value,
			highlight: true,
		});
	}
	if (otherTours.value.length) {
		sections.push({
			label: `All tours (${otherTours.value.length})`,
			tours: otherTours.value,
			highlight: false,
		});
	}

	return sections;
});

// The first card's photo is the page's largest paint: load it straight away.
// The prerendered HTML can only boost the unfiltered first card; once URL
// filters apply on mount this follows the list, so the first visible card
// switches to eager.
const firstTourSlug = computed(() => catalogSections.value[0]?.tours[0]?.slug);

function toggleFilter(filter: TourFilter) {
	const next = new Set(activeFilters.value);
	if (next.has(filter)) next.delete(filter);
	else next.add(filter);
	activeFilters.value = next;
}

function isActive(filter: TourFilter): boolean {
	return activeFilters.value.has(filter);
}

function typeBadgeClass(type: 'group' | 'private'): string {
	return type === 'group' ? 'badge-group' : 'badge-private';
}

function typeBadgeLabel(type: 'group' | 'private'): string {
	return type === 'group' ? 'Group' : 'Private';
}

function typeMeta(tour: TourDetail): string {
	return tour.types.map(typeBadgeLabel).join(' / ');
}

function typeMetaIcon(tour: TourDetail): string {
	return isGroupTour(tour) ? 'users' : 'crown';
}

function cardSrc(tour: TourDetail): string | undefined {
	return props.cardPhotos[tour.slug]?.src;
}

function cardSrcset(tour: TourDetail): string | undefined {
	return props.cardPhotos[tour.slug]?.srcset;
}

function cardAlt(tour: TourDetail): string {
	return props.cardPhotos[tour.slug]?.alt ?? tour.title;
}

function readUrlParams() {
	if (typeof window === 'undefined') return;

	const params = new URLSearchParams(window.location.search);
	const type = params.get('type') ?? params.get('filter');
	const next = new Set<TourFilter>();
	if (type === 'group') next.add('group');
	if (type === 'private') next.add('private');
	if (type === 'short' || type === 'half-day') next.add('short');
	if (type === 'sunset') next.add('sunset');
	if (next.size) activeFilters.value = next;

	const destination = params.get('destination');
	const q = params.get('q') ?? params.get('search');
	if (destination) destinationSlug.value = destination;
	if (q) searchQuery.value = q;
}

// Results count for screen readers. Left empty until filters applied from the
// URL on load have settled, so it only speaks after the visitor changes something.
const statusText = ref('');
let announce = false;
// Watches the set of shown tours, not just its size, so a different result of
// the same length is still announced. Clearing first makes the live region
// repeat an unchanged count.
watch(
	() => filteredTours.value.map((tour) => tour.slug).join(),
	() => {
		if (!announce) return;
		const n = filteredTours.value.length;
		statusText.value = '';
		nextTick(() => {
			statusText.value = `${n} ${n === 1 ? 'tour' : 'tours'} shown`;
		});
	},
);

onMounted(() => {
	readUrlParams();
	nextTick(() => {
		announce = true;
	});
});
</script>

<template>
	<div class="tours-catalog">
		<p class="sr-only" role="status">{{ statusText }}</p>
		<div class="tours-header">
			<h1 class="tours-title">Our tours</h1>
			<p class="tours-desc">
				{{ tours.length }} experiences from Split — group departures and private charters along the
				Adriatic, from lagoon half-days to full-day island hops.
			</p>
		</div>

		<div class="filter-bar" role="group" aria-label="Filter tours">
			<button
				v-for="chip in FILTERS"
				:key="chip.id"
				type="button"
				class="filter-chip"
				:class="{ active: isActive(chip.id) }"
				:aria-pressed="isActive(chip.id)"
				@click="toggleFilter(chip.id)"
			>
				<i :class="`ti ti-${chip.icon}`" aria-hidden="true"></i>
				{{ chip.label }}
			</button>
			<label class="filter-chip sort-chip">
				<i class="ti ti-arrows-sort" aria-hidden="true"></i>
				<select v-model="sort" aria-label="Sort tours">
					<option value="popular">Most popular</option>
					<option value="price-asc">Price: low to high</option>
					<option value="price-desc">Price: high to low</option>
					<option value="duration">Duration</option>
				</select>
			</label>
		</div>

		<template v-for="section in catalogSections" :key="section.label">
			<h2 class="section-label">{{ section.label }}</h2>
			<div class="tour-grid" :class="{ 'tour-grid--featured': section.highlight }">
				<div
					v-for="tour in section.tours"
					:key="`${section.label}-${tour.slug}`"
					class="tour-cell"
				>
					<a :href="`/tours/${tour.slug}/`" class="tour-card" :class="{ featured: section.highlight }">
						<div class="card-img" :style="{ '--placeholder-color': tour.image.color }">
							<img
								v-if="cardSrc(tour)"
								class="card-img__photo"
								:src="cardSrc(tour)"
								:srcset="cardSrcset(tour)"
								sizes="(max-width: 700px) 88vw, 380px"
								:alt="cardAlt(tour)"
								:loading="tour.slug === firstTourSlug ? 'eager' : 'lazy'"
								:fetchpriority="tour.slug === firstTourSlug ? 'high' : undefined"
								decoding="async"
							/>
							<i v-else class="ti ti-sailboat" aria-hidden="true"></i>
							<div class="img-badges">
								<span v-if="showsBestseller(tour)" class="img-badge badge-bestseller">Best seller</span>
								<span v-if="tour.badge === 'new'" class="img-badge badge-new">New</span>
								<span
									v-for="type in tour.types"
									:key="type"
									class="img-badge"
									:class="typeBadgeClass(type)"
								>
									{{ typeBadgeLabel(type) }}
								</span>
							</div>
						</div>
						<div class="card-body">
							<h3 class="card-title">{{ tour.title }}</h3>
							<div class="card-meta">
								<span class="meta-item">
									<i class="ti ti-clock" aria-hidden="true"></i>
									{{ tour.duration }}
								</span>
								<span class="meta-item">
									<i :class="`ti ti-${typeMetaIcon(tour)}`" aria-hidden="true"></i>
									{{ typeMeta(tour) }}
								</span>
							</div>
							<p class="card-desc">{{ tour.shortDescription }}</p>
							<div class="card-footer">
								<div>
									<span v-if="priceUnits.get(tour.slug)" class="price-from">From </span>
									<span class="price-val">{{ tourFromPrice(tour) }}</span>
									<span v-if="priceUnits.get(tour.slug)" class="price-per"> {{ priceUnits.get(tour.slug) }}</span>
								</div>
							</div>
						</div>
					</a>
				</div>
			</div>
		</template>

		<div v-if="filteredTours.length === 0" class="no-results">
			<i class="ti ti-mood-sad" aria-hidden="true"></i>
			<p>No tours match your filters.</p>
		</div>
	</div>
</template>
