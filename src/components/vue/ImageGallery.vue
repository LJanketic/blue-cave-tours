<script setup lang="ts">
/*
 * Photo gallery with a lightbox (spec §6.3.2). The hero is the first real
 * photo; four thumbnails follow. The lightbox is a native <dialog> opened
 * with showModal(): focus moves into it, Escape closes it, and focus goes
 * back to the control that opened it.
 *
 * Without JavaScript the hero and thumbnails are plain links to the
 * full-size photos.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import type { GalleryViewPhoto } from '../../data/tour-photos';
import type { BadgeTone } from '../ui/Badge.vue';
import Badge from '../ui/Badge.vue';

export type GalleryTag = { icon: string; label: string; tone: BadgeTone };

const props = withDefaults(defineProps<{ photos: GalleryViewPhoto[]; tags?: GalleryTag[] }>(), { tags: () => [] });

const THUMB_COUNT = 4;

/** Real photos only; placeholders have nothing to show full-size. */
const realPhotos = computed(() => props.photos.filter((photo) => photo.src));
const placeholder = computed(() => props.photos[0]);
const count = computed(() => realPhotos.value.length);
const thumbs = computed(() => realPhotos.value.slice(1, 1 + THUMB_COUNT));
/** Photos beyond the hero and the four thumbnails, shown as "+N" on the last thumbnail. */
const moreCount = computed(() => Math.max(0, count.value - 1 - THUMB_COUNT));

const hydrated = ref(false);
const dialog = ref<HTMLDialogElement | null>(null);
const index = ref(0);
const current = computed(() => realPhotos.value[index.value]);
let opener: HTMLElement | null = null;

function fullSrc(photo: GalleryViewPhoto): string | undefined {
	// The srcset's last candidate is the largest width.
	return photo.srcset?.split(',').pop()?.trim().split(' ')[0] ?? photo.src;
}

function thumbLabel(position: number): string {
	const isLast = position === thumbs.value.length - 1 && moreCount.value > 0;
	return `Open photo ${position + 2} of ${count.value}${isLast ? `, +${moreCount.value} more` : ''}`;
}

async function open(at: number, event: Event) {
	opener = event.currentTarget as HTMLElement;
	index.value = at;
	dialog.value?.showModal();
	document.documentElement.style.overflow = 'hidden';
	await nextTick();
	scrollStripToCurrent();
}

function close() {
	dialog.value?.close();
}

// Runs however the dialog closed: button, Escape, backdrop.
function onClose() {
	document.documentElement.style.overflow = '';
	opener?.focus();
	opener = null;
}

function step(delta: number) {
	index.value = (index.value + delta + count.value) % count.value;
	nextTick(scrollStripToCurrent);
}

function show(at: number) {
	index.value = at;
	nextTick(scrollStripToCurrent);
}

function scrollStripToCurrent() {
	dialog.value
		?.querySelector('.gallery-ui__strip-thumb[aria-current="true"]')
		?.scrollIntoView({ block: 'nearest', inline: 'center' });
}

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'ArrowRight') step(1);
	else if (event.key === 'ArrowLeft') step(-1);
	else return;
	event.preventDefault();
}

// The backdrop is everything around the photo and the controls.
function onDialogClick(event: MouseEvent) {
	const target = event.target as HTMLElement;
	if (target === dialog.value || target.classList.contains('gallery-ui__stage') || target.classList.contains('gallery-ui__frame')) {
		close();
	}
}

// Swipe left/right on touch screens.
let swipeStartX: number | null = null;
function onPointerDown(event: PointerEvent) {
	if (event.pointerType === 'touch') swipeStartX = event.clientX;
}
function onPointerUp(event: PointerEvent) {
	if (swipeStartX === null) return;
	const dx = event.clientX - swipeStartX;
	swipeStartX = null;
	if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
}

onMounted(() => {
	hydrated.value = true;
});

onBeforeUnmount(() => {
	document.documentElement.style.overflow = '';
});
</script>

<template>
	<div class="gallery-ui">
		<div class="gallery-ui__hero-wrap">
			<component
				:is="hydrated ? 'button' : 'a'"
				v-if="count > 0"
				class="gallery-ui__hero"
				:type="hydrated ? 'button' : undefined"
				:href="hydrated ? undefined : fullSrc(realPhotos[0])"
				:aria-label="`Open photo gallery, ${count} ${count === 1 ? 'photo' : 'photos'}`"
				@click="hydrated && open(0, $event)"
			>
				<img
					:src="realPhotos[0].src"
					:srcset="realPhotos[0].srcset"
					sizes="(max-width: 960px) 100vw, 912px"
					:alt="realPhotos[0].alt"
					fetchpriority="high"
					decoding="async"
				/>
				<span class="gallery-ui__count" aria-hidden="true">
					<i class="ti ti-photo"></i>
					{{ count === 1 ? 'View photo' : `View all ${count} photos` }}
				</span>
			</component>
			<div v-else class="gallery-ui__hero gallery-ui__hero--placeholder" role="img" :aria-label="placeholder?.alt">
				<i :class="`ti ti-${placeholder?.icon ?? 'sailboat'}`" aria-hidden="true"></i>
			</div>
			<ul v-if="tags.length" class="gallery-ui__tags" role="list">
				<li v-for="tag in tags" :key="tag.label">
					<Badge :tone="tag.tone" :icon="tag.icon">{{ tag.label }}</Badge>
				</li>
			</ul>
		</div>

		<ul v-if="thumbs.length" class="gallery-ui__thumbs" role="list">
			<li v-for="(photo, position) in thumbs" :key="photo.src">
				<component
					:is="hydrated ? 'button' : 'a'"
					class="gallery-ui__thumb"
					:type="hydrated ? 'button' : undefined"
					:href="hydrated ? undefined : fullSrc(photo)"
					:aria-label="thumbLabel(position)"
					@click="hydrated && open(position + 1, $event)"
				>
					<img :src="photo.src" :srcset="photo.srcset" sizes="(max-width: 768px) 25vw, 222px" alt="" loading="lazy" decoding="async" />
					<span v-if="position === thumbs.length - 1 && moreCount > 0" class="gallery-ui__more" aria-hidden="true">
						+{{ moreCount }}
					</span>
				</component>
			</li>
		</ul>

		<dialog
			v-if="count > 0"
			ref="dialog"
			class="gallery-ui__dialog"
			aria-label="Photo gallery"
			@close="onClose"
			@click="onDialogClick"
			@keydown="onKeydown"
		>
			<div class="gallery-ui__top">
				<p class="gallery-ui__position" aria-live="polite">{{ index + 1 }} / {{ count }}</p>
				<button type="button" class="gallery-ui__btn" aria-label="Close gallery" @click="close">
					<i class="ti ti-x" aria-hidden="true"></i>
				</button>
			</div>
			<div class="gallery-ui__stage" @pointerdown="onPointerDown" @pointerup="onPointerUp">
				<button v-if="count > 1" type="button" class="gallery-ui__btn gallery-ui__prev" aria-label="Previous photo" @click="step(-1)">
					<i class="ti ti-chevron-left" aria-hidden="true"></i>
				</button>
				<div class="gallery-ui__frame">
					<img v-if="current" :key="current.src" class="gallery-ui__full" :src="current.src" :srcset="current.srcset" sizes="100vw" :alt="current.alt" />
				</div>
				<button v-if="count > 1" type="button" class="gallery-ui__btn gallery-ui__next" aria-label="Next photo" @click="step(1)">
					<i class="ti ti-chevron-right" aria-hidden="true"></i>
				</button>
			</div>
			<ul v-if="count > 1" class="gallery-ui__strip" role="list">
				<li v-for="(photo, position) in realPhotos" :key="photo.src">
					<button
						type="button"
						class="gallery-ui__strip-thumb"
						:aria-label="`Show photo ${position + 1}`"
						:aria-current="position === index ? 'true' : undefined"
						@click="show(position)"
					>
						<img :src="photo.src" :srcset="photo.srcset" sizes="72px" alt="" loading="lazy" decoding="async" />
					</button>
				</li>
			</ul>
		</dialog>
	</div>
</template>

<style scoped>
@layer components {
	.gallery-ui__hero-wrap {
		position: relative;
		margin-bottom: 10px;
	}

	/* board 03 .img-hero */
	.gallery-ui__hero {
		display: block;
		width: 100%;
		aspect-ratio: 16 / 9;
		max-height: 540px;
		padding: 0;
		overflow: hidden;
		border: 0;
		border-radius: var(--radius-lg);
		background: var(--color-background-secondary);
		cursor: zoom-in;
	}

	.gallery-ui__hero--placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: default;
	}

	.gallery-ui__hero--placeholder .ti {
		font-size: 52px;
		color: var(--color-border-secondary);
	}

	.gallery-ui__hero img,
	.gallery-ui__thumb img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.4s ease;
	}

	.gallery-ui__hero:hover img,
	.gallery-ui__thumb:hover img {
		transform: scale(1.03);
	}

	.gallery-ui__count {
		position: absolute;
		right: var(--space-3);
		bottom: var(--space-3);
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px var(--space-3);
		border-radius: var(--radius-md);
		background: var(--color-surface-pill);
		box-shadow: var(--shadow-pill);
		color: var(--color-text-primary);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
	}

	.gallery-ui__count .ti {
		font-size: 15px;
	}

	.gallery-ui__tags {
		position: absolute;
		top: 10px;
		left: 10px;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		max-width: calc(100% - 90px);
		margin: 0;
		padding: 0;
		list-style: none;
		pointer-events: none;
	}

	.gallery-ui__thumbs {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--space-2);
		margin: 0 0 28px;
		padding: 0;
		list-style: none;
	}

	.gallery-ui__thumb {
		position: relative;
		display: block;
		width: 100%;
		aspect-ratio: 16 / 10;
		padding: 0;
		overflow: hidden;
		border: 0;
		border-radius: var(--radius-md);
		background: var(--color-background-secondary);
		cursor: zoom-in;
	}

	.gallery-ui__more {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-overlay-thumb);
		color: var(--color-text-on-image);
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
	}

	/* Lightbox (board 03 .lb) */
	.gallery-ui__dialog {
		width: 100%;
		max-width: none;
		height: 100vh;
		height: 100dvh;
		max-height: none;
		margin: 0;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--color-text-on-image);
	}

	.gallery-ui__dialog[open] {
		display: flex;
		flex-direction: column;
		animation: gallery-fade-in 0.2s ease;
	}

	.gallery-ui__dialog::backdrop {
		background: var(--color-lightbox-backdrop);
	}

	@keyframes gallery-fade-in {
		from {
			opacity: 0;
		}
	}

	.gallery-ui__top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-5);
		font-size: var(--font-size-sm);
	}

	.gallery-ui__position {
		margin: 0;
	}

	.gallery-ui__btn {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		width: var(--touch-min);
		height: var(--touch-min);
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: var(--color-glass-control);
		color: var(--color-text-on-image);
		font-size: 22px;
		cursor: pointer;
		transition: background-color var(--duration-fast) ease;
	}

	.gallery-ui__btn:hover {
		background: var(--color-glass-control-hover);
	}

	/* White ring on the dark backdrop. */
	.gallery-ui__dialog :focus-visible {
		outline-color: var(--color-text-on-image);
	}

	.gallery-ui__stage {
		position: relative;
		display: flex;
		flex: 1;
		align-items: center;
		justify-content: center;
		gap: var(--space-4);
		min-height: 0;
		padding: 0 var(--space-5);
		touch-action: pan-y;
	}

	.gallery-ui__frame {
		display: flex;
		flex: 1;
		align-items: center;
		justify-content: center;
		min-width: 0;
		height: 100%;
	}

	.gallery-ui__full {
		display: block;
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		border-radius: var(--radius-md);
	}

	.gallery-ui__strip {
		display: flex;
		justify-content: center;
		gap: var(--space-2);
		margin: 0;
		padding: var(--space-4) var(--space-5) var(--space-5);
		overflow-x: auto;
		list-style: none;
		scrollbar-width: none;
	}

	.gallery-ui__strip li {
		flex: 0 0 72px;
	}

	.gallery-ui__strip-thumb {
		display: block;
		width: 72px;
		height: 52px;
		padding: 0;
		overflow: hidden;
		border: 2px solid transparent;
		border-radius: var(--radius-sm);
		background: none;
		opacity: 0.5;
		cursor: pointer;
		transition:
			opacity var(--duration-fast) ease,
			border-color var(--duration-fast) ease;
	}

	.gallery-ui__strip-thumb:hover {
		opacity: 0.85;
	}

	.gallery-ui__strip-thumb[aria-current='true'] {
		border-color: var(--color-text-on-image);
		opacity: 1;
	}

	.gallery-ui__strip-thumb img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	@media (max-width: 768px) {
		.gallery-ui__hero {
			aspect-ratio: 3 / 2;
		}

		.gallery-ui__thumbs {
			margin-bottom: var(--space-5);
		}

		.gallery-ui__stage {
			gap: 0;
			padding: 0 var(--space-2);
		}

		.gallery-ui__prev,
		.gallery-ui__next {
			position: absolute;
			top: 50%;
			z-index: 1;
			transform: translateY(-50%);
		}

		.gallery-ui__prev {
			left: var(--space-3);
		}

		.gallery-ui__next {
			right: var(--space-3);
		}

		.gallery-ui__strip {
			justify-content: flex-start;
		}
	}
}
</style>
