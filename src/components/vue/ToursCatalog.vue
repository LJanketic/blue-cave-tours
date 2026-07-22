<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { TourDetail } from '../../types/tour';
import { contactHrefForTour, supportsInstantBook } from '../../lib/booking';
import {
	matchesAnyFilter,
	searchTours,
	sortTours,
	tourTypes,
	type TourFilter,
} from '../../lib/tour-filters';

const props = defineProps<{
	tours: TourDetail[];
	/** Destination slug → tour slugs that visit it (for `/tours?destination=`). */
	toursByDestination?: Record<string, string[]>;
}>();

const FILTERS: { id: TourFilter; label: string; icon: string }[] = [
	{ id: 'group', label: 'Group', icon: 'users' },
	{ id: 'private', label: 'Private only', icon: 'crown' },
	{ id: 'short', label: 'Half day', icon: 'clock' },
	{ id: 'sunset', label: 'Sunset', icon: 'sunset' },
];

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

function toggleFilter(filter: TourFilter) {
	const next = new Set(activeFilters.value);
	if (next.has(filter)) next.delete(filter);
	else next.add(filter);
	activeFilters.value = next;
}

function isActive(filter: TourFilter): boolean {
	return activeFilters.value.has(filter);
}

function tourIcon(tour: TourDetail): string {
	const instant = supportsInstantBook(tour);
	if (!instant || tour.slug.includes('private')) return 'crown';
	if (tour.slug.includes('lagoon')) return 'swimming';
	if (tour.slug.includes('cave')) return 'droplet';
	return 'sailboat';
}

function priceUnit(tour: TourDetail): string {
	return supportsInstantBook(tour) ? '/ person' : '/ boat';
}

function typeBadgeClass(type: 'group' | 'private'): string {
	return type === 'group' ? 'badge-group' : 'badge-private';
}

function typeBadgeLabel(type: 'group' | 'private'): string {
	return type === 'group' ? 'Group' : 'Private';
}

function typeMeta(tour: TourDetail): string {
	return tourTypes(tour).map(typeBadgeLabel).join(' / ');
}

function typeMetaIcon(tour: TourDetail): string {
	return tourTypes(tour).includes('group') ? 'users' : 'crown';
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

onMounted(readUrlParams);
</script>

<template>
	<div class="tours-catalog">
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
			<p class="section-label">{{ section.label }}</p>
			<div class="tour-grid" :class="{ 'tour-grid--featured': section.highlight }">
				<div
					v-for="tour in section.tours"
					:key="`${section.label}-${tour.slug}`"
					class="tour-cell"
				>
					<a :href="`/tours/${tour.slug}`" class="tour-card" :class="{ featured: section.highlight }">
						<div class="card-img" :style="{ '--placeholder-color': tour.image.color }">
							<i :class="`ti ti-${tourIcon(tour)}`" aria-hidden="true"></i>
							<div class="img-badges">
								<span v-if="tour.featured" class="img-badge badge-bestseller">Best seller</span>
								<span v-if="tour.badge === 'new'" class="img-badge badge-new">New</span>
								<span
									v-for="type in tourTypes(tour)"
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
									<span class="price-from">From </span>
									<span class="price-val">{{ tour.fromPrice }}</span>
									<span class="price-per"> {{ priceUnit(tour) }}</span>
								</div>
							</div>
						</div>
					</a>
					<button type="button" class="wishlist-btn" aria-label="Save tour" @click.stop>
						<i class="ti ti-heart" aria-hidden="true"></i>
					</button>
					<form
						v-if="supportsInstantBook(tour)"
						class="booking-form tours-catalog__hook"
						:data-tour-id="tour.slug"
					>
						<button type="submit" tabindex="-1">Book</button>
					</form>
					<a
						v-else
						class="tours-catalog__hook"
						:href="contactHrefForTour(tour)"
						tabindex="-1"
						aria-hidden="true"
					>
						Request a quote
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
