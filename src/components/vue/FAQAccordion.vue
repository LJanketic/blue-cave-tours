<script setup lang="ts">
import { ref } from 'vue';
import type { FaqItem } from '../../data/faq';

const props = withDefaults(
	defineProps<{
		items: FaqItem[];
		singleOpen?: boolean;
	}>(),
	{ singleOpen: true },
);

const openIndex = ref<number | null>(null);
const openIndices = ref<Set<number>>(new Set());

function isOpen(index: number): boolean {
	return props.singleOpen ? openIndex.value === index : openIndices.value.has(index);
}

function toggle(index: number) {
	if (props.singleOpen) {
		openIndex.value = openIndex.value === index ? null : index;
		return;
	}

	const next = new Set(openIndices.value);
	if (next.has(index)) next.delete(index);
	else next.add(index);
	openIndices.value = next;
}

function answerId(index: number): string {
	return `faq-answer-${index}`;
}
</script>

<template>
	<div class="faq-list">
		<div
			v-for="(item, index) in items"
			:key="`${item.category}-${item.question}`"
			class="faq-item"
			:class="{ open: isOpen(index) }"
		>
			<button
				type="button"
				class="faq-trigger"
				:aria-expanded="isOpen(index)"
				:aria-controls="answerId(index)"
				@click="toggle(index)"
			>
				<span class="faq-trigger-row">
					<span class="faq-q">{{ item.question }}</span>
					<i class="ti ti-chevron-down faq-chevron" aria-hidden="true"></i>
				</span>
			</button>
			<div :id="answerId(index)" class="faq-answer" :hidden="!isOpen(index)">
				<p class="faq-a">
					{{ item.answer }}
					<template v-if="item.link">
						<a :href="item.link.href">{{ item.link.label }}</a>
					</template>
				</p>
			</div>
		</div>
	</div>
</template>

<style scoped>
.faq-trigger {
	display: block;
	width: 100%;
	padding: 0;
	border: 0;
	background: none;
	color: inherit;
	font: inherit;
	text-align: left;
	cursor: pointer;
}

.faq-trigger-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.faq-q {
	margin: 0;
	font-size: inherit;
	font-weight: inherit;
	line-height: 1.4;
}

.faq-answer[hidden] {
	display: none;
}
</style>
