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
const root = ref<HTMLElement | null>(null);
let timer: ReturnType<typeof setInterval> | undefined;
const reducedMotion = ref(false);
// Rotation stops while the pointer or keyboard focus is inside the carousel,
// so a slide never changes under someone reading or tabbing through it
// (WCAG 2.2.2), and when the visitor presses Pause.
const userPaused = ref(false);
let hovering = false;
let focusWithin = false;
// Pressing Play overrides hover/focus pausing until the pointer or focus
// leaves the carousel; after that, hover and focus pause it again as usual.
let playRequested = false;

const count = computed(() => props.panels.length);

function setPanel(i: number) {
	index.value = (i + count.value) % count.value;
}

function advance() {
	setPanel(index.value + 1);
}

function startRotation() {
	stopRotation();
	if (reducedMotion.value || userPaused.value || count.value < 2) return;
	if (!playRequested && (hovering || focusWithin)) return;
	timer = setInterval(advance, props.intervalMs);
}

function stopRotation() {
	if (timer) {
		clearInterval(timer);
		timer = undefined;
	}
}

function goTo(i: number) {
	setPanel(i);
	startRotation();
}

function togglePause() {
	userPaused.value = !userPaused.value;
	playRequested = !userPaused.value;
	startRotation();
}

// Hovering the slide text or a control pauses (the active panel takes pointer
// events for this, see .hero-panel.active in _home.css); the rest of the photo
// doesn't, or the full-screen hero would almost never rotate for mouse users.
// Mouse only: a tap on a phone fires an "enter" with no matching "leave",
// which would stop rotation for good.
function onPointerEnter(event: PointerEvent) {
	if (event.pointerType !== 'mouse') return;
	hovering = true;
	startRotation();
}

function onPointerLeave(event: PointerEvent) {
	if (event.pointerType !== 'mouse') return;
	hovering = false;
	playRequested = false;
	startRotation();
}

function onFocusIn(event: FocusEvent) {
	// Only keyboard focus pauses: a mouse click on an arrow or dot also focuses
	// the button, and hover already covers pointer users.
	if (!(event.target instanceof HTMLElement) || !event.target.matches(':focus-visible')) return;
	focusWithin = true;
	startRotation();
}

function onFocusOut(event: FocusEvent) {
	const region = event.currentTarget as HTMLElement;
	if (region.contains(event.relatedTarget as Node | null)) return;
	focusWithin = false;
	playRequested = false;
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
	window.scrollTo({ top, behavior: reducedMotion.value ? 'auto' : 'smooth' });
}

onMounted(() => {
	reducedMotion.value =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	// A pointer already resting on the slide text at hydration fires no "enter".
	hovering = root.value?.matches(':hover') ?? false;
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
		ref="root"
		@pointerenter="onPointerEnter"
		@pointerleave="onPointerLeave"
		@focusin="onFocusIn"
		@focusout="onFocusOut"
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
				<h2 class="hero-h">{{ panel.heading }}</h2>
				<p class="hero-sub">{{ panel.subtext }}</p>
				<a class="btn-primary" :href="panel.ctaHref">{{ panel.ctaLabel }}</a>
			</div>
		</div>

		<button type="button" class="hero-scroll" @click="scrollPastHero">
			<span>Explore</span>
			<i class="ti ti-chevron-down" aria-hidden="true"></i>
		</button>

		<div v-if="count > 1" class="hero-dots" role="group" aria-label="Choose banner">
			<button
				v-for="(panel, i) in panels"
				:key="`dot-${panel.id}`"
				type="button"
				class="hero-dot"
				:class="{ active: i === index }"
				:aria-label="panel.dotLabel"
				:aria-current="i === index ? 'true' : undefined"
				@click.stop="goTo(i)"
			></button>
			<button
				v-if="!reducedMotion"
				type="button"
				class="hero-pause"
				:aria-label="userPaused ? 'Play banner rotation' : 'Pause banner rotation'"
				@click.stop="togglePause"
			>
				<i :class="['ti', userPaused ? 'ti-player-play' : 'ti-player-pause']" aria-hidden="true"></i>
			</button>
		</div>
	</div>
</template>
