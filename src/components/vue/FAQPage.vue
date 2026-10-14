<script setup lang="ts">
/*
 * FAQ page island (spec §7.3): search, category filter and the grouped
 * questions. Counts follow the search: each category shows its matches and
 * "All" the total. One answer open per group.
 *
 * Without JavaScript every answer shows (a <noscript> style on the page), and
 * the search form reloads the page, which reads ?q= once this runs.
 */
import { computed, nextTick, onMounted, ref } from 'vue';
import { FAQ_CATEGORIES, FAQ_ITEMS, type FaqCategory, type FaqItem } from '../../data/faq';

type CategoryFilter = FaqCategory | 'all';

const NAV_LABELS: Record<FaqCategory, string> = {
	booking: 'Booking',
	weather: 'Weather',
	onboard: 'On board',
	guests: 'Guests',
	private: 'Private',
};

const activeCategory = ref<CategoryFilter>('all');
const query = ref('');
/** Open question per category. */
const open = ref<Partial<Record<FaqCategory, string>>>({});
const resultsHeading = ref<HTMLElement | null>(null);

const matches = computed(() => {
	const q = query.value.trim().toLowerCase();
	return q ? FAQ_ITEMS.filter((item) => `${item.question} ${item.answer}`.toLowerCase().includes(q)) : FAQ_ITEMS;
});

const shown = computed(() =>
	activeCategory.value === 'all' ? matches.value : matches.value.filter((item) => item.category === activeCategory.value),
);

const groups = computed(() =>
	FAQ_CATEGORIES.map((cat) => ({ ...cat, items: shown.value.filter((item) => item.category === cat.id) })).filter(
		(group) => group.items.length > 0,
	),
);

function count(category: CategoryFilter): number {
	return category === 'all' ? matches.value.length : matches.value.filter((item) => item.category === category).length;
}

const key = (item: FaqItem) => item.question;
const answerId = (item: FaqItem) => `faq-${item.category}-${FAQ_ITEMS.indexOf(item)}`;

function toggle(item: FaqItem) {
	open.value = { ...open.value, [item.category]: open.value[item.category] === key(item) ? undefined : key(item) };
}

function showAll() {
	query.value = '';
	activeCategory.value = 'all';
}

async function onSubmit() {
	await nextTick();
	resultsHeading.value?.focus();
}

const status = computed(() =>
	query.value.trim() ? `${shown.value.length} ${shown.value.length === 1 ? 'question matches' : 'questions match'}` : '',
);

onMounted(() => {
	const q = new URLSearchParams(window.location.search).get('q');
	if (q) query.value = q;
});
</script>

<template>
	<div class="faq">
		<form class="faq__search" role="search" action="/faq/" method="get" @submit.prevent="onSubmit">
			<label for="faq-search" class="sr-only">Search the FAQ</label>
			<input id="faq-search" v-model="query" name="q" type="search" placeholder="Search, e.g. cancel, children, weather…" autocomplete="off" />
			<button type="submit" class="faq__search-btn">
				<i class="ti ti-search" aria-hidden="true"></i>
				Search
			</button>
		</form>
		<p class="sr-only" role="status">{{ status }}</p>

		<div class="faq__layout">
			<div class="faq__cats" role="group" aria-label="FAQ categories">
				<button type="button" class="faq__cat" :aria-pressed="activeCategory === 'all'" @click="activeCategory = 'all'">
					<i class="ti ti-list" aria-hidden="true"></i>
					All
					<span class="faq__count">{{ count('all') }}</span>
				</button>
				<button
					v-for="cat in FAQ_CATEGORIES"
					:key="cat.id"
					type="button"
					class="faq__cat"
					:aria-pressed="activeCategory === cat.id"
					@click="activeCategory = cat.id"
				>
					<i :class="`ti ti-${cat.icon}`" aria-hidden="true"></i>
					{{ NAV_LABELS[cat.id] }}
					<span class="faq__count">{{ count(cat.id) }}</span>
				</button>
			</div>

			<div class="faq__main">
				<h2 ref="resultsHeading" class="sr-only" tabindex="-1">Questions</h2>
				<section v-for="group in groups" :key="group.id" class="faq__group" :aria-labelledby="`faq-group-${group.id}`">
					<div class="faq__group-head">
						<span class="faq__group-icon" :class="`faq__group-icon--${group.id}`" aria-hidden="true">
							<i :class="`ti ti-${group.icon}`"></i>
						</span>
						<h2 :id="`faq-group-${group.id}`">{{ group.label }}</h2>
					</div>
					<ul class="faq__list" role="list">
						<li v-for="item in group.items" :key="key(item)" class="faq__item" :class="{ 'is-open': open[item.category] === key(item) }">
							<h3 class="faq__q">
								<button
									type="button"
									:aria-expanded="open[item.category] === key(item)"
									:aria-controls="answerId(item)"
									@click="toggle(item)"
								>
									<span>{{ item.question }}</span>
									<i class="ti ti-chevron-down" aria-hidden="true"></i>
								</button>
							</h3>
							<div :id="answerId(item)" class="faq__a" data-faq-answer :hidden="open[item.category] !== key(item)">
								<p>
									{{ item.answer }}
									<a v-if="item.link" :href="item.link.href">{{ item.link.label }}</a>
								</p>
							</div>
						</li>
					</ul>
				</section>

				<div v-if="groups.length === 0" class="faq__empty">
					<i class="ti ti-mood-sad" aria-hidden="true"></i>
					<p>No questions match your search.</p>
					<button type="button" class="faq__show-all" @click="showAll">Show all questions</button>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
@layer components {
	.faq__search {
		display: flex;
		gap: var(--space-2);
		margin-bottom: var(--space-6);
	}

	.faq__search input {
		flex: 1;
		min-width: 0;
		min-height: 44px;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-border-input);
		border-radius: var(--radius-md);
		background: var(--color-background-primary);
		color: var(--color-text-primary);
		font: inherit;
	}

	.faq__search input:focus {
		border-color: var(--color-border-brand);
	}

	.faq__search-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 0 var(--space-5);
		border: 0;
		border-radius: var(--radius-md);
		background: var(--color-background-brand);
		color: var(--color-text-on-image);
		font: inherit;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
	}

	.faq__search-btn:hover {
		opacity: 0.88;
	}

	.faq__layout {
		display: grid;
		grid-template-columns: 200px minmax(0, 1fr);
		gap: var(--space-6);
		align-items: start;
	}

	.faq__cats {
		position: sticky;
		top: calc(var(--site-header-height) + var(--space-4));
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.faq__cat {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
		padding: 7px var(--space-3);
		border: 0.5px solid transparent;
		border-radius: var(--radius-md);
		background: none;
		color: var(--color-text-secondary);
		font: inherit;
		font-size: var(--font-size-sm);
		text-align: left;
		cursor: pointer;
	}

	.faq__cat:hover {
		background: var(--color-background-secondary);
		color: var(--color-text-primary);
	}

	.faq__cat[aria-pressed='true'] {
		border-color: var(--color-border-tertiary);
		background: var(--color-background-secondary);
		color: var(--color-text-primary);
		font-weight: var(--font-weight-medium);
	}

	.faq__count {
		margin-left: auto;
		padding: 1px 7px;
		border: 0.5px solid var(--color-border-tertiary);
		border-radius: 10px;
		background: var(--color-background-primary);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-regular);
		color: var(--color-text-tertiary);
	}

	.faq__group {
		margin-bottom: 28px;
	}

	.faq__group-head {
		display: flex;
		align-items: center;
		gap: 9px;
		margin-bottom: var(--space-3);
		padding-bottom: 10px;
		border-bottom: 0.5px solid var(--color-border-tertiary);
	}

	.faq__group-head h2 {
		margin: 0;
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-medium);
	}

	.faq__group-icon {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border-radius: var(--radius-md);
		font-size: 15px;
	}

	.faq__group-icon--booking {
		background: var(--color-background-success);
		color: var(--color-text-success);
	}

	.faq__group-icon--weather {
		background: var(--color-background-info);
		color: var(--color-category-info-icon);
	}

	.faq__group-icon--onboard,
	.faq__group-icon--private {
		background: var(--color-category-private-bg);
		color: var(--color-category-private-text);
	}

	.faq__group-icon--guests {
		background: var(--color-category-tip-bg);
		color: var(--color-category-tip-text);
	}

	.faq__list {
		margin: 0;
		padding: 0;
		overflow: hidden;
		border: 1px solid var(--color-border-card);
		border-radius: var(--radius-lg);
		list-style: none;
	}

	.faq__item + .faq__item {
		border-top: 0.5px solid var(--color-border-tertiary);
	}

	.faq__q {
		margin: 0;
	}

	.faq__q button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		width: 100%;
		padding: 13px 14px;
		border: 0;
		background: none;
		color: var(--color-text-primary);
		font: inherit;
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-medium);
		line-height: var(--line-height-tight);
		text-align: left;
		cursor: pointer;
	}

	.faq__q button:hover,
	.is-open .faq__q button {
		background: var(--color-background-secondary);
	}

	.faq__q button:focus-visible {
		outline-offset: -2px;
	}

	.faq__q .ti {
		flex-shrink: 0;
		font-size: 15px;
		color: var(--color-text-tertiary);
		transition: transform var(--duration-fast) ease;
	}

	.is-open .faq__q .ti {
		transform: rotate(180deg);
	}

	.faq__a {
		padding: 14px 14px var(--space-4);
	}

	.faq__a p {
		margin: 0;
		font-size: var(--font-size-body-md);
		line-height: var(--line-height-body-md);
		color: var(--color-text-secondary);
	}

	.faq__a a {
		color: var(--color-text-info);
	}

	.faq__empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
		padding: 2rem;
		color: var(--color-text-secondary);
		text-align: center;
	}

	.faq__empty > .ti {
		font-size: 28px;
		color: var(--color-border-secondary);
	}

	.faq__empty p {
		margin: 0;
	}

	.faq__show-all {
		min-height: 24px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-text-info);
		font: inherit;
		font-weight: var(--font-weight-medium);
		cursor: pointer;
	}

	.faq__show-all:hover {
		text-decoration: underline;
	}

	@media (max-width: 768px) {
		.faq__layout {
			grid-template-columns: minmax(0, 1fr);
		}

		.faq__cats {
			position: static;
		}
	}
}
</style>
