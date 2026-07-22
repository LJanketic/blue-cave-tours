<script setup lang="ts">
import { computed, ref } from 'vue';
import {
	FAQ_CATEGORIES,
	FAQ_ITEMS,
	faqCountByCategory,
	type FaqCategory,
	type FaqItem,
} from '../../data/faq';

type CategoryFilter = FaqCategory | 'all';

const props = defineProps<{
	siteEmail: string;
	sitePhone: string;
	sitePhoneDisplay: string;
}>();

const CATEGORY_ICONS: Record<FaqCategory, { bg: string; color: string }> = {
	booking: { bg: '#E1F5EE', color: '#085041' },
	weather: { bg: '#E6F1FB', color: '#0C447C' },
	onboard: { bg: '#EEEDFE', color: '#3C3489' },
	guests: { bg: '#FAEEDA', color: '#633806' },
	private: { bg: '#EEEDFE', color: '#3C3489' },
};

const NAV_LABELS: Record<FaqCategory, string> = {
	booking: 'Booking',
	weather: 'Weather',
	onboard: 'On board',
	guests: 'Guests',
	private: 'Private',
};

const activeCategory = ref<CategoryFilter>('all');
const searchQuery = ref('');
const openKey = ref<string | null>(null);

const filteredItems = computed(() => {
	const q = searchQuery.value.trim().toLowerCase();
	return FAQ_ITEMS.filter((item) => {
		const matchesCategory = activeCategory.value === 'all' || item.category === activeCategory.value;
		if (!matchesCategory) return false;
		if (!q) return true;
		return (
			item.question.toLowerCase().includes(q) ||
			item.answer.toLowerCase().includes(q)
		);
	});
});

const visibleCategories = computed(() => {
	if (activeCategory.value !== 'all') {
		return FAQ_CATEGORIES.filter((cat) => cat.id === activeCategory.value);
	}
	return FAQ_CATEGORIES.filter((cat) =>
		filteredItems.value.some((item) => item.category === cat.id),
	);
});

function itemsForCategory(category: FaqCategory): FaqItem[] {
	return filteredItems.value.filter((item) => item.category === category);
}

function setCategory(category: CategoryFilter) {
	activeCategory.value = category;
}

function categoryCount(category: CategoryFilter): number {
	if (category === 'all') return filteredItems.value.length;
	return faqCountByCategory(category);
}

function itemKey(item: FaqItem): string {
	return `${item.category}-${item.question}`;
}

function isOpen(item: FaqItem): boolean {
	return openKey.value === itemKey(item);
}

function toggleItem(item: FaqItem) {
	const key = itemKey(item);
	openKey.value = openKey.value === key ? null : key;
}

function answerId(item: FaqItem): string {
	return `faq-${itemKey(item).replace(/[^a-z0-9-]/gi, '-')}`;
}
</script>

<template>
	<div class="faq-page">
		<div class="hero">
			<h1>Frequently asked questions</h1>
			<p>Everything you need to know before you book. Can't find the answer? We're happy to help directly.</p>
		</div>

		<div class="search-bar">
			<input
				v-model="searchQuery"
				type="text"
				placeholder="Search — e.g. cancel, children, weather…"
				aria-label="Search FAQs"
			/>
			<button type="button">
				<i class="ti ti-search search-icon" aria-hidden="true"></i>
				Search
			</button>
		</div>

		<div class="faq-layout">
			<nav class="cat-nav" aria-label="FAQ categories">
				<button
					type="button"
					class="cat-link"
					:class="{ active: activeCategory === 'all' }"
					@click="setCategory('all')"
				>
					<i class="ti ti-list" aria-hidden="true"></i>
					All
					<span class="cat-count">{{ categoryCount('all') }}</span>
				</button>
				<button
					v-for="cat in FAQ_CATEGORIES"
					:key="cat.id"
					type="button"
					class="cat-link"
					:class="{ active: activeCategory === cat.id }"
					@click="setCategory(cat.id)"
				>
					<i :class="`ti ti-${cat.icon}`" aria-hidden="true"></i>
					{{ NAV_LABELS[cat.id] }}
					<span class="cat-count">{{ categoryCount(cat.id) }}</span>
				</button>
			</nav>

			<div class="faq-main">
				<section
					v-for="cat in visibleCategories"
					:key="cat.id"
					class="cat-section"
					:data-section="cat.id"
				>
					<div class="cat-header">
						<div
							class="cat-icon"
							:style="{
								background: CATEGORY_ICONS[cat.id].bg,
								color: CATEGORY_ICONS[cat.id].color,
							}"
						>
							<i :class="`ti ti-${cat.icon}`" aria-hidden="true"></i>
						</div>
						<h2 class="cat-title">{{ cat.label }}</h2>
					</div>
					<div class="faq-list">
						<div
							v-for="item in itemsForCategory(cat.id)"
							:key="itemKey(item)"
							class="faq-item"
							:class="{ open: isOpen(item) }"
						>
							<button
								type="button"
								class="faq-q faq-trigger"
								:aria-expanded="isOpen(item)"
								:aria-controls="answerId(item)"
								@click="toggleItem(item)"
							>
								<span class="faq-q-row">
									<span class="faq-q-text">{{ item.question }}</span>
									<i class="ti ti-chevron-down faq-chevron" aria-hidden="true"></i>
								</span>
							</button>
							<div :id="answerId(item)" class="faq-a" :hidden="!isOpen(item)">
								<p>
									{{ item.answer }}<template v-if="item.link">
										<a :href="item.link.href"> {{ item.link.label }}</a>
									</template>
								</p>
							</div>
						</div>
					</div>
				</section>

				<div v-if="filteredItems.length === 0" class="no-results">
					<i class="ti ti-mood-sad" aria-hidden="true"></i>
					No questions match your search.
				</div>
			</div>
		</div>

		<div class="contact-band">
			<div>
				<h3>Still have a question?</h3>
				<p>We usually reply within a couple of hours during the season.</p>
			</div>
			<div class="contact-band-btns">
				<a
					class="btn-sm btn-outline"
					:href="`mailto:${props.siteEmail}`"
					:aria-label="`Email us at ${props.siteEmail}`"
				>
					<i class="ti ti-mail" aria-hidden="true"></i>
					Email us
				</a>
				<a
					class="btn-sm btn-dark"
					:href="`tel:${props.sitePhone}`"
					:aria-label="`Call us at ${props.sitePhoneDisplay}`"
				>
					<i class="ti ti-phone" aria-hidden="true"></i>
					Call us
				</a>
			</div>
		</div>
	</div>
</template>

<style scoped>
.hero h1 {
	font-size: 20px;
	font-weight: 500;
}

.hero p {
	font-size: 13px;
	color: var(--color-text-secondary);
	line-height: 1.6;
}

.search-bar {
	display: flex;
	gap: 8px;
	margin-bottom: 24px;
}

.search-bar input {
	flex: 1;
	font-size: 13px;
	padding: 8px 10px;
	border: 0.5px solid var(--color-border-secondary);
	border-radius: var(--radius-md);
	background: var(--color-background-primary);
	color: var(--color-text-primary);
	outline: none;
	font-family: inherit;
}

.search-bar button {
	padding: 0 16px;
	font-size: 13px;
	cursor: pointer;
	border-radius: var(--radius-md);
	background: var(--color-text-primary);
	color: var(--color-background-primary);
	border: none;
	font-family: inherit;
	display: flex;
	align-items: center;
	gap: 5px;
}

.search-icon {
	font-size: 13px;
	vertical-align: -1px;
}

.faq-layout {
	display: grid;
	grid-template-columns: 200px 1fr;
	gap: 24px;
	align-items: start;
}

.cat-nav {
	position: sticky;
	top: 16px;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cat-link {
	font-size: 13px;
	padding: 7px 12px;
	border-radius: var(--radius-md);
	color: var(--color-text-secondary);
	cursor: pointer;
	display: flex;
	align-items: center;
	gap: 8px;
	border: 0.5px solid transparent;
	background: none;
	font-family: inherit;
	text-align: left;
	width: 100%;
}

.cat-link i {
	font-size: 14px;
}

.cat-link:hover {
	background: var(--color-background-secondary);
	color: var(--color-text-primary);
}

.cat-link.active {
	background: var(--color-background-secondary);
	color: var(--color-text-primary);
	border-color: var(--color-border-tertiary);
	font-weight: 500;
}

.cat-count {
	margin-left: auto;
	font-size: 11px;
	color: var(--color-text-tertiary);
	background: var(--color-background-primary);
	border: 0.5px solid var(--color-border-tertiary);
	border-radius: 10px;
	padding: 1px 7px;
}

.cat-section {
	margin-bottom: 28px;
}

.cat-header {
	display: flex;
	align-items: center;
	gap: 9px;
	margin-bottom: 12px;
	padding-bottom: 10px;
	border-bottom: 0.5px solid var(--color-border-tertiary);
}

.cat-icon {
	width: 30px;
	height: 30px;
	border-radius: var(--radius-md);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 15px;
	flex-shrink: 0;
}

.cat-title {
	font-size: 15px;
	font-weight: 500;
	margin: 0;
}

.faq-list {
	margin-bottom: 0;
	border: 0.5px solid var(--color-border-tertiary);
	border-radius: var(--radius-lg);
	overflow: hidden;
}

.faq-item {
	border-bottom: 0.5px solid var(--color-border-tertiary);
	padding: 0;
	cursor: default;
	display: block;
	background: transparent;
}

.faq-item:last-child {
	border-bottom: none;
}

.faq-item:hover {
	background: transparent;
}

.faq-q {
	display: block;
	padding: 13px 16px;
	cursor: pointer;
	width: 100%;
	border: 0;
	background: none;
	font: inherit;
	color: inherit;
	text-align: left;
}

.faq-q-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 12px;
}

.faq-q:hover,
.faq-item.open .faq-q {
	background: var(--color-background-secondary);
}

.faq-q-text {
	font-size: 13px;
	font-weight: 500;
	margin: 0;
	line-height: 1.4;
}

.faq-chevron {
	font-size: 15px;
	color: var(--color-text-tertiary);
	flex-shrink: 0;
	transition: transform 0.15s;
}

.faq-item.open .faq-chevron {
	transform: rotate(180deg);
}

.faq-a[hidden] {
	display: none !important;
}

.faq-a {
	padding: 0 16px 14px;
	font-size: 13px;
	color: var(--color-text-secondary);
	line-height: 1.7;
	margin: 0;
}

.faq-item.open .faq-a {
	display: block;
}

.faq-item.open {
	background: transparent;
}

.faq-a p {
	margin: 0 0 8px;
}

.faq-a p:last-child {
	margin: 0;
}

.faq-a a {
	color: var(--color-text-info);
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

.contact-band {
	background: var(--color-background-secondary);
	border-radius: var(--radius-lg);
	padding: 1.25rem 1.5rem;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	margin-top: 8px;
	flex-wrap: wrap;
}

.contact-band h3 {
	font-size: 14px;
	font-weight: 500;
	margin: 0 0 3px;
}

.contact-band p {
	font-size: 12px;
	color: var(--color-text-secondary);
	margin: 0;
}

.contact-band-btns {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
}

.btn-sm {
	font-size: 12px;
	padding: 7px 14px;
	display: inline-flex;
	align-items: center;
	gap: 5px;
	border-radius: var(--radius-md);
	cursor: pointer;
	font-family: inherit;
	font-weight: 500;
	text-decoration: none;
}

.btn-outline {
	background: none;
	color: var(--color-text-primary);
	border: 0.5px solid var(--color-border-secondary);
}

.btn-dark {
	background: var(--color-text-primary);
	color: var(--color-background-primary);
	border: none;
}

@media (max-width: 768px) {
	.faq-layout {
		grid-template-columns: 1fr;
	}

	.cat-nav {
		position: static;
	}
}

@media (max-width: 480px) {
	.search-bar {
		flex-direction: column;
	}

	.search-bar button {
		width: 100%;
		justify-content: center;
	}
}
</style>
