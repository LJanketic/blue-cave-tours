<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Destination } from '../../data/destinations';

type DestinationCard = Pick<
	Destination,
	'slug' | 'name' | 'region' | 'icon' | 'shortDescription' | 'tags' | 'attrs' | 'featured' | 'tourSlugs'
>;

type DestinationFilter = 'all' | 'island' | 'coast' | 'cave' | 'swim';

const props = defineProps<{
	destinations: DestinationCard[];
}>();

const FILTERS: { id: DestinationFilter; label: string; icon: string }[] = [
	{ id: 'all', label: 'All destinations', icon: 'map' },
	{ id: 'island', label: 'Islands', icon: 'building-lighthouse' },
	{ id: 'coast', label: 'Coastal towns', icon: 'anchor' },
	{ id: 'cave', label: 'Caves & nature', icon: 'mountain' },
	{ id: 'swim', label: 'Best for swimming', icon: 'swimming' },
];

const activeFilter = ref<DestinationFilter>('all');

function matchesDestinationFilter(dest: DestinationCard, filter: DestinationFilter): boolean {
	if (filter === 'all') return true;

	const tagText = dest.tags.join(' ').toLowerCase();

	if (filter === 'island') {
		return tagText.includes('island') || dest.region.toLowerCase().includes('island');
	}
	if (filter === 'coast') {
		return (
			tagText.includes('departure') ||
			tagText.includes('historic') ||
			tagText.includes('riva') ||
			tagText.includes('harbour')
		);
	}
	if (filter === 'cave') {
		return tagText.includes('cave');
	}
	if (filter === 'swim') {
		return tagText.includes('swim') || tagText.includes('snorkel');
	}

	return true;
}

const filteredDestinations = computed(() =>
	props.destinations.filter((dest) => matchesDestinationFilter(dest, activeFilter.value)),
);

const featuredDestinations = computed(() =>
	filteredDestinations.value.filter((d) => d.featured),
);

const otherDestinations = computed(() =>
	filteredDestinations.value.filter((d) => !d.featured),
);

function setFilter(filter: DestinationFilter) {
	activeFilter.value = filter;
}

function tourCount(dest: DestinationCard): number {
	return dest.tourSlugs.length;
}

function toursHref(dest: DestinationCard): string {
	return `/tours?destination=${dest.slug}`;
}

function destinationHref(slug: string): string {
	return `/destinations/${slug}`;
}
</script>

<template>
	<div class="destinations-catalog">
		<div class="filter-row" role="group" aria-label="Filter destinations">
			<span class="filter-label">Filter:</span>
			<button
				v-for="chip in FILTERS"
				:key="chip.id"
				type="button"
				class="filter-chip"
				:class="{ active: activeFilter === chip.id }"
				:aria-pressed="activeFilter === chip.id"
				@click="setFilter(chip.id)"
			>
				<i v-if="chip.id !== 'all'" :class="`ti ti-${chip.icon}`" aria-hidden="true"></i>
				{{ chip.label }}
			</button>
		</div>

		<div class="result-row">
			<span class="result-count">
				{{ filteredDestinations.length }} destination{{ filteredDestinations.length === 1 ? '' : 's' }}
			</span>
		</div>

		<template v-if="featuredDestinations.length">
			<p class="section-label">Not to miss</p>
			<div class="dest-grid dest-grid--listing">
				<article
					v-for="(dest, index) in featuredDestinations"
					:key="`featured-${dest.slug}`"
					class="dest-card dest-card--rich"
					:class="{ wide: index === 0 }"
				>
					<a class="dest-card__link" :href="destinationHref(dest.slug)">
						<div class="card-img">
							<i :class="`ti ti-${dest.icon}`" aria-hidden="true"></i>
							<span class="region-pill">{{ dest.region }}</span>
						</div>
						<div class="card-body">
							<h3 class="card-name">{{ dest.name }}</h3>
							<p class="card-region">
								<i class="ti ti-map-pin" aria-hidden="true"></i>
								{{ dest.region }}
							</p>
							<p class="card-desc">{{ dest.shortDescription }}</p>
							<div class="attr-row">
								<span v-for="attr in dest.attrs" :key="attr.label" class="attr-tag">
									<i :class="`ti ti-${attr.icon}`" aria-hidden="true"></i>
									{{ attr.label }}
								</span>
							</div>
						</div>
					</a>
					<div class="card-footer">
						<span class="tour-count">
							<i class="ti ti-sailboat" aria-hidden="true"></i>
							{{ tourCount(dest) }} tour{{ tourCount(dest) === 1 ? '' : 's' }} visit here
						</span>
						<a class="card-cta" :href="toursHref(dest)">See tours →</a>
					</div>
				</article>
			</div>
		</template>

		<p v-if="otherDestinations.length" class="section-label">More destinations</p>
		<div v-if="otherDestinations.length" class="dest-grid dest-grid--listing">
			<article
				v-for="dest in otherDestinations"
				:key="dest.slug"
				class="dest-card dest-card--rich"
			>
				<a class="dest-card__link" :href="destinationHref(dest.slug)">
					<div class="card-img">
						<i :class="`ti ti-${dest.icon}`" aria-hidden="true"></i>
						<span class="region-pill">{{ dest.region }}</span>
					</div>
					<div class="card-body">
						<h3 class="card-name">{{ dest.name }}</h3>
						<p class="card-region">
							<i class="ti ti-map-pin" aria-hidden="true"></i>
							{{ dest.region }}
						</p>
						<p class="card-desc">{{ dest.shortDescription }}</p>
						<div class="attr-row">
							<span v-for="attr in dest.attrs" :key="attr.label" class="attr-tag">
								<i :class="`ti ti-${attr.icon}`" aria-hidden="true"></i>
								{{ attr.label }}
							</span>
						</div>
					</div>
				</a>
				<div class="card-footer">
					<span class="tour-count">
						<i class="ti ti-sailboat" aria-hidden="true"></i>
						{{ tourCount(dest) }} tour{{ tourCount(dest) === 1 ? '' : 's' }} visit here
					</span>
					<a class="card-cta" :href="toursHref(dest)">See tours →</a>
				</div>
			</article>
		</div>

		<div v-if="filteredDestinations.length === 0" class="no-results">
			<i class="ti ti-compass-off" aria-hidden="true"></i>
			<p>No destinations match this filter.</p>
		</div>
	</div>
</template>

<style scoped>
.filter-row {
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
	flex-shrink: 0;
}

.result-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 14px;
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

.dest-grid--listing {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
	gap: 14px;
	margin-bottom: 28px;
}

.dest-card--rich {
	color: inherit;
	background: var(--color-background-primary);
	border: 0.5px solid var(--color-border-tertiary);
	border-radius: var(--radius-lg);
	overflow: hidden;
	display: flex;
	flex-direction: column;
}

.dest-card--rich:hover {
	border-color: var(--color-border-primary);
}

.dest-card__link {
	display: block;
	color: inherit;
	text-decoration: none;
	cursor: pointer;
	flex: 1 1 auto;
}

.dest-card--rich.wide {
	display: grid;
}

.dest-card--rich.wide .dest-card__link {
	display: contents;
}

.dest-card--rich .card-body {
	padding: 14px 16px 12px;
}

.card-name {
	font-size: 15px;
	font-weight: 500;
	margin: 0 0 3px;
	line-height: 1.3;
}

.dest-card--rich .card-img {
	height: 160px;
	flex-shrink: 0;
	background: var(--color-background-secondary);
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
}

.dest-card--rich.wide .card-img {
	height: 100%;
	min-height: 160px;
}

.dest-card--rich .card-img .ti {
	font-size: 40px;
	color: var(--color-border-secondary);
}

.region-pill {
	position: absolute;
	bottom: 8px;
	left: 8px;
	font-size: 11px;
	font-weight: 500;
	padding: 3px 9px;
	border-radius: 20px;
	background: var(--color-background-primary);
	color: var(--color-text-secondary);
	border: 0.5px solid var(--color-border-tertiary);
}

.dest-card--rich .card-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px 16px 16px;
	margin: 0;
	border-top: 0.5px solid var(--color-border-tertiary);
}

.card-region {
	font-size: 12px;
	color: var(--color-text-tertiary);
	margin: 0 0 8px;
	display: flex;
	align-items: center;
	gap: 4px;
}

.card-desc {
	font-size: 12px;
	color: var(--color-text-secondary);
	line-height: 1.55;
	margin: 0 0 12px;
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.attr-row {
	display: flex;
	flex-wrap: wrap;
	gap: 5px;
	margin-bottom: 0;
}

.card-body .attr-row {
	margin-bottom: 0;
}

.attr-tag {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	font-size: 11px;
	padding: 3px 8px;
	border-radius: 12px;
	background: var(--color-background-secondary);
	color: var(--color-text-secondary);
}

.tour-count {
	font-size: 12px;
	color: var(--color-text-secondary);
	display: flex;
	align-items: center;
	gap: 4px;
	min-width: 0;
	flex: 1 1 auto;
}

.card-cta {
	font-size: 12px;
	padding: 5px 12px;
	border-radius: var(--radius-md);
	border: 0.5px solid var(--color-border-secondary);
	background: none;
	font-weight: 500;
	color: inherit;
	text-decoration: none;
	cursor: pointer;
}

.card-cta:hover {
	border-color: var(--color-border-primary);
}

.no-results {
	text-align: center;
	padding: 2.5rem;
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

@media (max-width: 768px) {
	.filter-row {
		flex-wrap: nowrap;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
		padding-bottom: 4px;
		margin-bottom: 16px;
		margin-inline: calc(-1 * var(--page-gutter));
		padding-inline: var(--page-gutter);
	}

	.filter-row::-webkit-scrollbar {
		display: none;
	}

	.filter-row .filter-chip {
		flex-shrink: 0;
	}

	.dest-grid--listing {
		display: grid;
		overflow-x: visible;
		scroll-snap-type: none;
		padding-right: 0;
	}

	.dest-grid--listing > * {
		flex: unset;
		min-width: unset;
		scroll-snap-align: unset;
	}

	.dest-card--rich.wide .card-img {
		height: 160px;
		min-height: 160px;
	}

	/* Region shown on image pill — hide duplicate line in body */
	.card-region {
		display: none;
	}
}

@media (max-width: 480px) {
	.dest-grid--listing {
		grid-template-columns: 1fr;
	}

	.dest-card--rich .card-footer {
		flex-wrap: wrap;
		gap: 8px;
	}

	.card-cta {
		flex-shrink: 0;
	}
}
</style>
