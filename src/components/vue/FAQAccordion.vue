<script setup lang="ts">
/*
 * FAQ accordion (spec §6.1.10): a separate trigger button per question and
 * a panel it controls. The server renders every answer open, so the page
 * works without JavaScript; the island collapses them once it runs.
 */
import { onMounted, ref } from 'vue';
import type { FaqItem } from '../../data/faq';

const props = withDefaults(defineProps<{ items: FaqItem[]; idPrefix?: string }>(), { idPrefix: 'faq' });

const hydrated = ref(false);
const openIndex = ref<number | null>(null);

function isOpen(index: number): boolean {
	return !hydrated.value || openIndex.value === index;
}

function toggle(index: number) {
	openIndex.value = openIndex.value === index ? null : index;
}

onMounted(() => {
	hydrated.value = true;
});

const answerId = (index: number) => `${props.idPrefix}-answer-${index}`;
</script>

<template>
	<ul class="faq-acc" role="list">
		<li v-for="(item, index) in items" :key="item.question" class="faq-acc__item" :class="{ 'is-open': hydrated && isOpen(index) }">
			<h3 class="faq-acc__heading">
				<button
					type="button"
					class="faq-acc__trigger"
					:aria-expanded="isOpen(index)"
					:aria-controls="answerId(index)"
					@click="toggle(index)"
				>
					<span>{{ item.question }}</span>
					<i class="ti ti-chevron-down faq-acc__chevron" aria-hidden="true"></i>
				</button>
			</h3>
			<div :id="answerId(index)" class="faq-acc__answer" :hidden="!isOpen(index)">
				<p>
					{{ item.answer }}
					<a v-if="item.link" :href="item.link.href">{{ item.link.label }}</a>
				</p>
			</div>
		</li>
	</ul>
</template>

<style scoped>
@layer components {
	/* board 01 .faq-list / .faq-item */
	.faq-acc {
		margin: 0;
		padding: 0;
		overflow: hidden;
		border: 1px solid var(--color-border-card);
		border-radius: var(--radius-lg);
		list-style: none;
	}

	.faq-acc__item {
		border-bottom: 0.5px solid var(--color-border-tertiary);
		background: var(--color-background-primary);
		transition: background-color var(--duration-fast) ease;
	}

	.faq-acc__item:last-child {
		border-bottom: 0;
	}

	.faq-acc__item:hover,
	.faq-acc__item.is-open {
		background: var(--color-background-secondary);
	}

	.faq-acc__heading {
		margin: 0;
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-medium);
	}

	.faq-acc__trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		width: 100%;
		padding: 13px var(--space-4);
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.faq-acc__trigger:focus-visible {
		outline-offset: -2px;
	}

	.faq-acc__chevron {
		flex-shrink: 0;
		font-size: 14px;
		color: var(--color-text-tertiary);
		transition: transform var(--duration-fast) ease;
	}

	.is-open .faq-acc__chevron {
		transform: rotate(180deg);
	}

	.faq-acc__answer {
		padding: 0 var(--space-4) 13px;
	}

	.faq-acc__answer p {
		margin: 0;
		font-size: var(--font-size-base);
		line-height: var(--line-height-relaxed);
		color: var(--color-text-secondary);
	}
}
</style>
