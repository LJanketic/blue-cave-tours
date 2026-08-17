<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

export type HeroPanel = {
	id: string;
	icon: string;
	heading: string;
	subtext: string;
	ctaLabel: string;
	ctaHref: string;
	/** Accessible label for the dot that jumps to this panel. */
	dotLabel: string;
};

const props = withDefaults(
	defineProps<{
		panels: HeroPanel[];
		intervalMs?: number;
	}>(),
	{ intervalMs: 6000 },
);

const index = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;
let reducedMotion = false;

const count = computed(() => props.panels.length);

function setPanel(i: number) {
	index.value = (i + count.value) % count.value;
}

function advance() {
	setPanel(index.value + 1);
}

function startRotation() {
	if (reducedMotion || count.value < 2) return;
	stopRotation();
	timer = setInterval(advance, props.intervalMs);
}

function stopRotation() {
	if (timer) {
		clearInterval(timer);
		timer = undefined;
	}
}

function goTo(i: number) {
	stopRotation();
	setPanel(i);
	startRotation();
}

function next() {
	goTo(index.value + 1);
}

function prev() {
	goTo(index.value - 1);
}

function scrollPastHero() {
	const hero = document.querySelector('.hero--home');
	if (!(hero instanceof HTMLElement)) return;

	const top = hero.getBoundingClientRect().bottom + window.scrollY;
	window.scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' });
}

onMounted(() => {
	reducedMotion =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	startRotation();
});

onBeforeUnmount(stopRotation);
</script>

<template>
	<div
		class="hero-chrome"
		role="region"
		aria-roledescription="carousel"
		aria-label="Featured highlights"
		@mouseenter="stopRotation"
		@mouseleave="startRotation"
	>
		<button
			v-if="count > 1"
			type="button"
			class="hero-arrow hero-arrow-prev"
			aria-label="Previous banner"
			@click.stop="prev"
		>
			<i class="ti ti-chevron-left" aria-hidden="true"></i>
		</button>
		<button
			v-if="count > 1"
			type="button"
			class="hero-arrow hero-arrow-next"
			aria-label="Next banner"
			@click.stop="next"
		>
			<i class="ti ti-chevron-right" aria-hidden="true"></i>
		</button>

		<div class="hero-content">
			<div
				v-for="(panel, i) in panels"
				:id="`hero-panel-${panel.id}`"
				:key="panel.id"
				class="hero-panel"
				:class="{ active: i === index }"
				role="group"
				aria-roledescription="slide"
				:aria-label="`${i + 1} of ${count}`"
				:aria-hidden="i !== index ? 'true' : 'false'"
				:inert="i !== index ? true : undefined"
			>
				<component :is="i === index ? 'h1' : 'p'" class="hero-h">{{ panel.heading }}</component>
				<p class="hero-sub">{{ panel.subtext }}</p>
				<a class="btn-primary" :href="panel.ctaHref">{{ panel.ctaLabel }}</a>
			</div>
		</div>

		<button type="button" class="hero-scroll" aria-label="Continue to tours" @click="scrollPastHero">
			<span>Explore</span>
			<i class="ti ti-chevron-down" aria-hidden="true"></i>
		</button>

		<div v-if="count > 1" class="hero-dots" role="tablist" aria-label="Choose banner">
			<button
				v-for="(panel, i) in panels"
				:key="`dot-${panel.id}`"
				type="button"
				class="hero-dot"
				:class="{ active: i === index }"
				role="tab"
				:aria-label="panel.dotLabel"
				:aria-selected="i === index ? 'true' : 'false'"
				@click.stop="goTo(i)"
			></button>
		</div>
	</div>
</template>
