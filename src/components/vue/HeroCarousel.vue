<script setup lang="ts">
/*
 * Homepage hero carousel (spec §6.1.2). A fixed h1 overline, then three photo
 * slides with display titles, then the same two CTAs for every slide (handoff
 * H1, H4: rendered once, outside the slide loop). Rotates every 6s, but never under reduced motion, never while the
 * pointer is on the text or controls, never while keyboard focus is inside,
 * and never after Pause. The pause button is the first control in the DOM
 * (WAI-ARIA carousel pattern), but shows only on keyboard focus; a tap on the
 * active dot pauses too.
 *
 * Without JavaScript, slide 1 shows on its own. Slides 2 and 3 get their
 * image source only after hydration, so they don't compete with the LCP.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import Button from '../ui/Button.vue';

export type HeroSlideView = {
	id: string;
	titleLines: string[];
	sub: string;
	position: string;
	image: { src: string; srcset: string; alt: string };
};

export type HeroCta = { label: string; href: string };

const props = withDefaults(
	defineProps<{
		slides: HeroSlideView[];
		/** The page's h1, fixed above the slides. */
		heading: string;
		ctas: { primary: HeroCta; secondary: HeroCta };
		intervalMs?: number;
		scrollTarget?: string;
	}>(),
	{
		intervalMs: 6000,
		scrollTarget: 'trust',
	},
);

const TEXT_SWAP_MS = 450;

/** The photo on screen. */
const index = ref(0);
/** The text on screen: it follows the photo after the old text has faded out. */
const textIndex = ref(0);
const leaving = ref(false);
// The text animates in on slide changes only. On load it's simply there: an
// entrance that starts at opacity 0 hides the slide title from Largest
// Contentful Paint and delays the page's first meaningful paint.
const animated = ref(false);
const loaded = ref<Set<number>>(new Set([0]));
const reducedMotion = ref(false);
// Pause only renders once hydrated: without JavaScript nothing rotates, so it would do nothing.
const hydrated = ref(false);
const userPaused = ref(false);
const hovering = ref(false);
const focusWithin = ref(false);
// Pressing Play overrides hover/focus pausing until the pointer or focus leaves.
let playRequested = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let swapTimer: ReturnType<typeof setTimeout> | undefined;

const count = computed(() => props.slides.length);
const rotating = computed(
	() => !reducedMotion.value && !userPaused.value && count.value > 1 && (playRequested || (!hovering.value && !focusWithin.value)),
);

function schedule() {
	clearTimeout(timer);
	timer = rotating.value ? setTimeout(() => show(index.value + 1), props.intervalMs) : undefined;
}

function show(i: number) {
	const next = (i + count.value) % count.value;
	loaded.value = new Set([...loaded.value, next, (next + 1) % count.value]);
	index.value = next;
	animated.value = true;
	clearTimeout(swapTimer);
	if (reducedMotion.value) {
		textIndex.value = next;
	} else {
		leaving.value = true;
		swapTimer = setTimeout(() => {
			textIndex.value = next;
			leaving.value = false;
		}, TEXT_SWAP_MS);
	}
	schedule();
}

function togglePause() {
	userPaused.value = !userPaused.value;
	playRequested = !userPaused.value;
	schedule();
}

// Mouse only: a tap fires an "enter" with no matching "leave".
function onPointerEnter(event: PointerEvent) {
	if (event.pointerType !== 'mouse') return;
	hovering.value = true;
	schedule();
}

function onPointerLeave(event: PointerEvent) {
	if (event.pointerType !== 'mouse') return;
	hovering.value = false;
	playRequested = false;
	schedule();
}

// Keyboard focus only: a click also focuses, and hover covers pointer users.
function onFocusIn(event: FocusEvent) {
	if (!(event.target instanceof HTMLElement) || !event.target.matches(':focus-visible')) return;
	focusWithin.value = true;
	schedule();
}

function onFocusOut(event: FocusEvent) {
	if ((event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) return;
	focusWithin.value = false;
	playRequested = false;
	schedule();
}

// Phones: swipe left or right (≥40px) instead of the arrows.
let swipeX: number | null = null;
function onPointerDown(event: PointerEvent) {
	if (event.pointerType !== 'mouse') swipeX = event.clientX;
}
function onPointerUp(event: PointerEvent) {
	if (swipeX === null) return;
	const dx = event.clientX - swipeX;
	swipeX = null;
	if (Math.abs(dx) >= 40) show(index.value + (dx < 0 ? 1 : -1));
}

function explore() {
	const target = document.getElementById(props.scrollTarget);
	if (!target) return;
	const header = document.getElementById('site-header')?.offsetHeight ?? 0;
	const top = target.getBoundingClientRect().top + window.scrollY - header;
	window.scrollTo({ top, behavior: reducedMotion.value ? 'auto' : 'smooth' });
}

onMounted(() => {
	reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	hydrated.value = true;
	// Slide 2's photo loads once the page has finished loading (it shows after
	// 6s at the earliest); each later photo loads when the slide before it shows.
	// Anything earlier competes with the first paint on slow connections.
	const loadNext = () => (loaded.value = new Set([...loaded.value, 1 % count.value]));
	const afterLoad = () => ('requestIdleCallback' in window ? window.requestIdleCallback(loadNext, { timeout: 2000 }) : setTimeout(loadNext, 1000));
	if (document.readyState === 'complete') afterLoad();
	else window.addEventListener('load', afterLoad, { once: true });
	schedule();
});

onBeforeUnmount(() => {
	clearTimeout(timer);
	clearTimeout(swapTimer);
});
</script>

<template>
	<section
		class="home-hero on-photo"
		aria-roledescription="carousel"
		aria-label="Highlights"
		:style="{ '--hero-interval': `${intervalMs}ms` }"
		@focusin="onFocusIn"
		@focusout="onFocusOut"
		@pointerdown="onPointerDown"
		@pointerup="onPointerUp"
	>
		<div class="home-hero__photos" aria-hidden="true">
			<img
				v-for="(slide, i) in slides"
				:key="slide.id"
				class="home-hero__photo"
				:class="{ 'is-on': i === index }"
				:src="loaded.has(i) ? slide.image.src : undefined"
				:srcset="loaded.has(i) ? slide.image.srcset : undefined"
				sizes="100vw"
				alt=""
				:fetchpriority="i === 0 ? 'high' : undefined"
				:style="{ '--hero-position': slide.position }"
				decoding="async"
			/>
		</div>

		<div class="home-hero__content">
			<h1 class="home-hero__overline">{{ heading }}</h1>

			<!--
				Pause comes first in the DOM, so it's the first thing a keyboard reaches (§11.3, WAI-ARIA carousel
				pattern); the grid puts it next to the dots, below the CTAs (handoff H5), but it only shows while it
				has keyboard focus: the design has no visible Pause. The label says what it does and changes with
				the state, so no aria-pressed (a pressed "Play" would contradict itself).
			-->
			<button
				v-if="count > 1 && hydrated && !reducedMotion"
				type="button"
				class="home-hero__pause"
				:aria-label="userPaused ? 'Play slideshow' : 'Pause slideshow'"
				@click="togglePause"
				@pointerenter="onPointerEnter"
				@pointerleave="onPointerLeave"
			>
				<i :class="['ti', userPaused ? 'ti-player-play' : 'ti-player-pause']" aria-hidden="true"></i>
			</button>

			<div class="home-hero__slides" :class="{ 'is-animated': animated }" :aria-live="rotating ? 'off' : 'polite'">
				<div
					v-for="(slide, i) in slides"
					v-show="i === textIndex"
					:key="slide.id"
					class="home-hero__panel"
					:class="{ 'is-leaving': leaving && i === textIndex }"
					role="group"
					aria-roledescription="slide"
					:aria-label="`${i + 1} of ${count}`"
					:inert="i !== textIndex ? true : undefined"
					@pointerenter="onPointerEnter"
					@pointerleave="onPointerLeave"
				>
					<p class="home-hero__title display">
						<template v-for="(line, l) in slide.titleLines" :key="l">
							<br v-if="l > 0" />{{ line }}
						</template>
					</p>
					<p class="home-hero__sub">{{ slide.sub }}</p>
				</div>
			</div>

			<div class="home-hero__ctas" @pointerenter="onPointerEnter" @pointerleave="onPointerLeave">
				<Button variant="on-image" size="lg" icon-end="arrow-right" :href="ctas.primary.href">{{ ctas.primary.label }}</Button>
				<Button variant="on-image-ghost" size="lg" :href="ctas.secondary.href">{{ ctas.secondary.label }}</Button>
			</div>

			<!-- After the CTAs, as they look. A tap on the active dot pauses or plays: the way to pause without a keyboard. -->
			<div
				v-if="count > 1"
				class="home-hero__dots"
				:class="{ 'is-paused': !rotating, 'no-rotate': reducedMotion }"
				role="group"
				aria-label="Slides"
				@pointerenter="onPointerEnter"
				@pointerleave="onPointerLeave"
			>
				<button
					v-for="(slide, i) in slides"
					:key="`dot-${slide.id}`"
					type="button"
					class="home-hero__dot"
					:class="{ 'is-active': i === index }"
					:aria-label="`Show slide ${i + 1} of ${count}`"
					:aria-current="i === index ? 'true' : undefined"
					@click="i === index ? count > 1 && !reducedMotion && togglePause() : show(i)"
				></button>
			</div>
		</div>

		<template v-if="count > 1">
			<button type="button" class="home-hero__arrow home-hero__arrow--prev" aria-label="Previous slide" @click="show(index - 1)">
				<i class="ti ti-chevron-left" aria-hidden="true"></i>
			</button>
			<button type="button" class="home-hero__arrow home-hero__arrow--next" aria-label="Next slide" @click="show(index + 1)">
				<i class="ti ti-chevron-right" aria-hidden="true"></i>
			</button>
		</template>

		<button type="button" class="home-hero__explore" @click="explore">
			<i class="ti ti-chevron-down" aria-hidden="true"></i>
			Explore
			<i class="ti ti-chevron-down" aria-hidden="true"></i>
		</button>
	</section>
</template>

<style scoped>
@layer components {
	.home-hero {
		/* The handoff's rhythm (H6). 28px and 14px aren't on the --space scale, so they stay local. */
		--hero-gap-overline: 28px; /* h1 → headline */
		--hero-gap-sub: 20px; /* headline → subtitle */
		--hero-gap-ctas: 28px; /* subtitle → CTAs */
		--hero-gap-dots: 28px; /* CTAs → dots */
		position: relative;
		height: 100vh;
		height: 100svh;
		min-height: 580px;
		max-height: 1140px;
		overflow: hidden;
		background: var(--color-background-hero);
		color: var(--color-text-on-image);
		touch-action: pan-y;
	}

	.home-hero__photos {
		position: absolute;
		inset: 0;
	}

	/* A scrim the board defines but never shows, made strong enough for the text
	   (§6.1.2, measured in PR 3), plus the header fade. */
	.home-hero__photos::after {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--color-overlay-header), var(--color-overlay-hero-home);
	}

	.home-hero__photo {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: var(--hero-position);
		opacity: 0;
		transition: opacity 1.2s ease;
	}

	.home-hero__photo.is-on {
		opacity: 1;
	}

	/* A grid, so Pause (first in the DOM) can sit beside the dots (last). */
	.home-hero__content {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template:
			'overline overline' auto
			'slides slides' auto
			'ctas ctas' auto
			'dots pause' auto / auto 1fr;
		align-content: center;
		justify-items: start;
		height: 100%;
		max-width: var(--content-max);
		margin: 0 auto;
		padding: 0 var(--space-6);
	}

	.home-hero__overline {
		grid-area: overline;
		margin: 0 0 var(--hero-gap-overline);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-semibold);
		line-height: var(--line-height-normal);
		text-transform: uppercase;
		letter-spacing: var(--letter-spacing-eyebrow);
		color: var(--color-text-on-image);
	}

	.home-hero__slides {
		grid-area: slides;
	}

	.home-hero__panel {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.home-hero__title {
		margin: 0;
		font-size: var(--font-size-display-xl);
		line-height: var(--line-height-display-hero);
		letter-spacing: var(--letter-spacing-display-hero);
		white-space: nowrap;
	}

	.home-hero__sub {
		max-width: 480px;
		margin: var(--hero-gap-sub) 0 0;
		font-size: var(--font-size-base);
		line-height: var(--line-height-relaxed);
		color: var(--color-text-on-image-muted);
	}

	.is-animated .home-hero__title {
		animation: hero-title-in 0.7s var(--ease-out) 0.1s both;
	}

	.is-animated .home-hero__sub {
		animation: hero-fade-in 0.6s ease 0.25s both;
	}

	.is-leaving .home-hero__title {
		opacity: 0;
		transform: translateY(28px);
		animation: none;
		transition:
			opacity 0.4s ease,
			transform 0.45s cubic-bezier(0.5, 0, 0.8, 0.4);
	}

	.is-leaving .home-hero__sub {
		opacity: 0;
		animation: none;
		transition: opacity 0.3s ease;
	}

	@keyframes hero-title-in {
		from {
			opacity: 0;
			transform: translateY(28px);
		}
	}

	@keyframes hero-fade-in {
		from {
			opacity: 0;
		}
	}

	/* The CTAs don't change with the slide, so they don't animate with it. */
	.home-hero__ctas {
		grid-area: ctas;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		margin-top: var(--hero-gap-ctas);
	}

	/* Dots, pause and arrows */

	/*
	 * Below the CTAs, left-aligned (H5), in a 32px row that Pause shares (so
	 * nothing moves when it appears). Each dot sits 8px inside its 24px hit
	 * area, so the margins pull the hit areas out by 8px: the visible dots then
	 * start at the text edge, 28px below the CTAs.
	 */
	.home-hero__dots {
		grid-area: dots;
		display: flex;
		align-items: center;
		height: 32px;
		margin: calc(var(--hero-gap-dots) - 12px) 0 0 -8px;
	}

	/* 8px dots with a 24px hit area (WCAG 2.5.8). */
	.home-hero__dot {
		position: relative;
		width: 24px;
		height: 24px;
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
	}

	.home-hero__dot::before {
		content: '';
		position: absolute;
		top: 8px;
		left: 8px;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-text-on-image-eyebrow);
		transition: transform var(--duration-fast) ease;
	}

	.home-hero__dot:hover::before {
		transform: scale(1.4);
	}

	.home-hero__dot.is-active {
		width: 44px;
	}

	/* The active dot is a 28px pill that fills over the interval. */
	.home-hero__dot.is-active::before {
		width: 28px;
		border-radius: 4px;
		background: var(--color-border-glass);
	}

	.home-hero__dot.is-active:hover::before {
		transform: scale(1.25);
	}

	.home-hero__dot.is-active::after {
		content: '';
		position: absolute;
		top: 8px;
		left: 8px;
		width: 28px;
		height: 8px;
		border-radius: 4px;
		background: var(--color-progress);
		transform-origin: left center;
		animation: hero-dot-fill var(--hero-interval) linear both;
	}

	.is-paused .home-hero__dot.is-active::after {
		animation-play-state: paused;
	}

	.no-rotate .home-hero__dot.is-active::after {
		animation: none;
	}

	@keyframes hero-dot-fill {
		from {
			transform: scaleX(0);
		}
	}

	.home-hero__pause,
	.home-hero__arrow {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: 1px solid var(--color-border-glass);
		border-radius: 50%;
		background: var(--color-glass-dark);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		color: var(--color-text-on-image);
		cursor: pointer;
		transition:
			background-color var(--duration-fast) ease,
			opacity var(--duration-fast) ease;
	}

	.home-hero__pause:hover,
	.home-hero__arrow:hover {
		background: var(--color-glass-dark-hover);
	}

	/* To the right of the dots, 32px (WCAG 2.2.2, 2.5.8). */
	.home-hero__pause {
		grid-area: pause;
		width: 32px;
		height: 32px;
		margin: calc(var(--hero-gap-dots) - 12px) 0 0 var(--space-2);
		font-size: 16px;
	}

	/*
	 * The dots show alone, as on the board, on every screen. Pause stays first
	 * in the DOM for keyboard users (WCAG 2.2.2) but only shows while it has
	 * keyboard focus; everyone else pauses with a tap on the active dot.
	 */
	.home-hero__pause {
		opacity: 0;
		pointer-events: none;
	}

	.home-hero__pause:focus-visible {
		opacity: 1;
		pointer-events: auto;
	}

	/* 20px from the edges; shown on hover and whenever a control has keyboard focus. */
	.home-hero__arrow {
		position: absolute;
		z-index: 2;
		top: 50%;
		width: 40px;
		height: 40px;
		font-size: 18px;
		opacity: 0;
		transform: translateY(-50%);
	}

	.home-hero__arrow--prev {
		left: 20px;
	}

	.home-hero__arrow--next {
		right: 20px;
	}

	.home-hero:hover .home-hero__arrow,
	.home-hero:focus-within .home-hero__arrow {
		opacity: 1;
	}

	.home-hero__explore {
		position: absolute;
		bottom: 22px;
		left: 50%;
		z-index: 2;
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		height: 36px;
		padding: 0 var(--space-4);
		border: 0;
		border-radius: var(--radius-pill);
		background: transparent;
		color: var(--color-text-on-image);
		font: inherit;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		letter-spacing: 0.02em;
		cursor: pointer;
		transform: translateX(-50%);
		transition: background-color var(--duration-fast) ease;
	}

	.home-hero__explore:hover {
		background: var(--color-glass-light);
	}

	.home-hero__explore .ti {
		font-size: 16px;
		animation: explore-bob 1.8s ease-in-out infinite;
	}

	@keyframes explore-bob {
		50% {
			transform: translateY(3px);
		}
	}

	@media (max-width: 1024px) {
		.home-hero__overline,
		.home-hero__title {
			text-shadow: var(--text-shadow-hero);
		}

		.home-hero__sub {
			text-shadow: var(--text-shadow-hero-sub);
		}
	}

	@media (max-width: 768px) {
		.home-hero {
			--hero-gap-overline: 20px;
			--hero-gap-sub: 14px;
			--hero-gap-ctas: 20px;
			--hero-gap-dots: 20px;
		}

		.home-hero__photo {
			object-position: 70% center;
		}

		/* Phones put the text at the bottom: darken from there. */
		.home-hero__photos::after {
			background: var(--color-overlay-header), var(--color-overlay-hero-home-phone);
		}

		/* Clear of Explore at the bottom. */
		.home-hero__content {
			align-content: end;
			padding: 0 var(--space-4) 64px;
		}

		/* Full width and stacked (H4). */
		.home-hero__ctas {
			flex-direction: column;
			justify-self: stretch;
		}

		.home-hero__arrow {
			display: none;
		}

		.home-hero__explore {
			bottom: var(--space-4);
		}
	}


	/* Short viewports: the hero takes the height it needs (§11.14). */
	@media (max-height: 480px) {
		.home-hero {
			height: auto;
			min-height: 0;
		}

		.home-hero__content {
			padding-top: calc(var(--site-header-height) + var(--space-6));
			padding-bottom: var(--space-6);
		}

		.home-hero__explore {
			display: none;
		}
	}
}
</style>
