<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { TourDetail } from '../../types/tour';
import { contactHrefForTour, supportsInstantBook } from '../../lib/booking';
import {
	matchesFilter,
	searchTours,
	sortTours,
	type TourFilter,
} from '../../lib/tour-filters';

const props = defineProps<{
	tours: TourDetail[];
}>();

const FILTERS: { id: TourFilter; label: string; icon: string }[] = [
	{ id: 'all', label: 'All tours', icon: 'list' },
	{ id: 'group', label: 'Group', icon: 'users' },
	{ id: 'private', label: 'Private', icon: 'crown' },
	{ id: 'half-day', label: 'Half day', icon: 'clock' },
	{ id: 'swim', label: 'Swimming', icon: 'swimming' },
];

const activeFilter = ref<TourFilter>('all');
const searchQuery = ref('');
const sort = ref('popular');

const filtersActive = computed(
	() => activeFilter.value !== 'all' || searchQuery.value.trim() !== '' || sort.value !== 'popular',
);

const filteredTours = computed(() => {
	let list = props.tours.filter((tour) => matchesFilter(tour, activeFilter.value));
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
		sections.push({ label: 'Featured', tours: featuredTours.value, highlight: true });
	}
	if (otherTours.value.length) {
		sections.push({ label: 'All tours', tours: otherTours.value, highlight: false });
	}

	return sections;
});

function setFilter(filter: TourFilter) {
	activeFilter.value = filter;
}

function tourIcon(tour: TourDetail): string {
	const instant = supportsInstantBook(tour);
	if (!instant || tour.slug.includes('private')) return 'crown';
	if (tour.slug.includes('lagoon')) return 'swimming';
	if (tour.slug.includes('cave')) return 'droplet';
	return 'island';
}

function priceUnit(tour: TourDetail): string {
	return supportsInstantBook(tour) ? '/ person' : '/ boat';
}

function typeLabel(tour: TourDetail): string {
	return supportsInstantBook(tour) ? 'group' : 'private';
}

function readUrlParams() {
	if (typeof window === 'undefined') return;

	const params = new URLSearchParams(window.location.search);

	const type = params.get('type') ?? params.get('filter');
	if (type === 'group') activeFilter.value = 'group';
	if (type === 'private') activeFilter.value = 'private';

	const destination = params.get('destination');
	const q = params.get('q') ?? params.get('search');
	if (q) {
		searchQuery.value = q;
	} else if (destination) {
		searchQuery.value = destination.replace(/-/g, ' ');
	}
}

onMounted(readUrlParams);
</script>

<template>
	<div class="tours-catalog">
		<header class="hero-bar">
			<div>
				<h1 class="hero-title">Our tours</h1>
				<p class="hero-sub">
					{{ tours.length }} experiences from Split — group departures and private charters along the
					Adriatic
				</p>
			</div>
			<div class="search-row">
				<input
					v-model="searchQuery"
					type="search"
					placeholder="Search tours or destinations…"
					aria-label="Search tours"
				/>
				<button type="button">
					<i class="ti ti-search" aria-hidden="true"></i>
					Search
				</button>
			</div>
		</header>

		<div class="filter-bar">
			<span class="filter-label">Filter:</span>
			<button
				v-for="chip in FILTERS"
				:key="chip.id"
				type="button"
				class="filter-chip"
				:class="{ active: activeFilter === chip.id }"
				@click="setFilter(chip.id)"
			>
				<i v-if="chip.id !== 'all'" :class="`ti ti-${chip.icon}`" aria-hidden="true"></i>
				{{ chip.label }}
			</button>
		</div>

		<div class="sort-row">
			<span class="result-count">
				Showing {{ filteredTours.length }} tour{{ filteredTours.length === 1 ? '' : 's' }}
			</span>
			<select v-model="sort" aria-label="Sort tours">
				<option value="popular">Sort: most popular</option>
				<option value="price-asc">Price: low to high</option>
				<option value="price-desc">Price: high to low</option>
				<option value="duration">Duration</option>
			</select>
		</div>

		<template v-for="section in catalogSections" :key="section.label">
			<p class="section-label">{{ section.label }}</p>
			<div class="tour-grid">
				<article
					v-for="tour in section.tours"
					:key="`${section.label}-${tour.slug}`"
					class="tour-card"
					:class="{ featured: section.highlight }"
				>
					<button type="button" class="wishlist-btn" aria-label="Save tour" @click.stop>
						<i class="ti ti-heart" aria-hidden="true"></i>
					</button>
					<a :href="`/tours/${tour.slug}`" class="tour-card__link">
						<div class="card-img" :style="{ '--placeholder-color': tour.image.color }">
							<i :class="`ti ti-${tourIcon(tour)}`" aria-hidden="true"></i>
							<div class="img-badges">
								<span v-if="tour.featured" class="img-badge badge-bestseller">Best seller</span>
								<span v-if="supportsInstantBook(tour)" class="img-badge badge-group">Group</span>
								<span v-else class="img-badge badge-private">Private</span>
							</div>
						</div>
						<div class="card-body">
							<p class="card-title">{{ tour.title }}</p>
							<div class="card-meta">
								<span class="meta-item">
									<i class="ti ti-clock" aria-hidden="true"></i>
									{{ tour.duration }}
								</span>
								<span class="meta-item">
									<i
										:class="supportsInstantBook(tour) ? 'ti ti-users' : 'ti ti-crown'"
										aria-hidden="true"
									></i>
									{{ typeLabel(tour) }}
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
				</article>
			</div>
		</template>

		<div v-if="filteredTours.length === 0" class="no-results">
			<i class="ti ti-mood-sad" aria-hidden="true"></i>
			<p>No tours match your filters.</p>
		</div>
	</div>
</template>

<style scoped>
.hero-bar {
	background: var(--color-background-secondary);
	border-radius: var(--radius-lg);
	padding: 1.25rem 1.5rem;
	margin-bottom: 24px;
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.hero-title {
	font-size: 20px;
	font-weight: 500;
	margin: 0 0 2px;
}

.hero-sub {
	font-size: 13px;
	color: var(--color-text-secondary);
	margin: 0 0 16px;
}

.search-row {
	display: flex;
	gap: 8px;
}

.search-row input {
	flex: 1;
}

.search-row button {
	padding: 0 14px;
	font-size: 13px;
	cursor: pointer;
	border-radius: var(--radius-md);
	background: var(--color-text-primary);
	color: var(--color-background-primary);
	border: none;
	display: inline-flex;
	align-items: center;
	gap: 4px;
}

.search-row button .ti {
	font-size: 13px;
	vertical-align: -1px;
}

.filter-bar {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	align-items: center;
	margin-bottom: 20px;
}

.filter-label {
	font-size: 12px;
	color: var(--color-text-tertiary);
	margin-right: 2px;
}

.filter-chip {
	min-height: unset;
}

.sort-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16px;
	gap: 12px;
	flex-wrap: wrap;
}

.result-count {
	font-size: 13px;
	color: var(--color-text-secondary);
}

.section-label {
	font-size: 11px;
	font-weight: 500;
	color: var(--color-text-tertiary);
	text-transform: uppercase;
	letter-spacing: 0.06em;
	margin: 0 0 12px;
}

.tour-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
	gap: 14px;
	margin-bottom: 28px;
}

.tour-card {
	background: var(--color-background-primary);
	border: 0.5px solid var(--color-border-tertiary);
	border-radius: var(--radius-lg);
	overflow: hidden;
	cursor: pointer;
	position: relative;
}

.tour-card:hover {
	border-color: var(--color-border-primary);
}

.tour-card.featured {
	border: 2px solid var(--color-border-info);
}

.tour-card__link {
	display: block;
	color: inherit;
	text-decoration: none;
}

.card-img {
	height: 148px;
	background-color: var(--placeholder-color, var(--color-background-secondary));
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
}

.card-img .ti {
	font-size: 36px;
	color: var(--color-border-secondary);
}

.img-badges {
	position: absolute;
	top: 8px;
	left: 8px;
	display: flex;
	gap: 5px;
	flex-wrap: wrap;
}

.img-badge {
	font-size: 11px;
	font-weight: 500;
	padding: 3px 8px;
	border-radius: 20px;
}

.badge-bestseller {
	background: #faeeda;
	color: #633806;
}

.badge-group {
	background: #e1f5ee;
	color: #085041;
}

.badge-private {
	background: #eeedfe;
	color: #3c3489;
}

.wishlist-btn {
	position: absolute;
	top: 8px;
	right: 8px;
	z-index: 1;
	width: 30px;
	height: 30px;
	border-radius: 50%;
	background: var(--color-background-primary);
	border: 0.5px solid var(--color-border-tertiary);
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	padding: 0;
}

.wishlist-btn .ti {
	font-size: 14px;
	color: var(--color-text-secondary);
}

.card-body {
	padding: 12px 14px 14px;
}

.card-title {
	font-size: 14px;
	font-weight: 500;
	margin: 0 0 5px;
}

.card-meta {
	display: flex;
	gap: 10px;
	flex-wrap: wrap;
	margin-bottom: 8px;
	font-size: 12px;
	color: var(--color-text-secondary);
}

.meta-item {
	display: flex;
	align-items: center;
	gap: 4px;
}

.card-desc {
	font-size: 12px;
	color: var(--color-text-secondary);
	line-height: 1.5;
	margin: 0 0 10px;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.card-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-top: 10px;
	border-top: 0.5px solid var(--color-border-tertiary);
}

.price-from {
	font-size: 11px;
	color: var(--color-text-tertiary);
}

.price-val {
	font-size: 16px;
	font-weight: 500;
}

.price-per {
	font-size: 11px;
	color: var(--color-text-secondary);
}

.tours-catalog__hook {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border: 0;
}

.no-results {
	text-align: center;
	padding: 2rem;
	color: var(--color-text-secondary);
	font-size: 13px;
}

.no-results .ti {
	font-size: 28px;
	display: block;
	margin-bottom: 8px;
	color: var(--color-border-secondary);
}

.no-results p {
	margin: 0;
}

@media (max-width: 480px) {
	.search-row {
		flex-direction: column;
	}
}
</style>
