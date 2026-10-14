<script setup lang="ts">
import { computed, ref, watch } from 'vue';

type GalleryPhoto = {
	color: string;
	alt: string;
	icon: string;
	src?: string;
	srcset?: string;
};

export type GalleryTag = {
	icon: string;
	label: string;
	/** Visual treatment; maps to a semantic colour. */
	variant?: 'feat' | 'group' | 'private' | 'tip';
};

const props = withDefaults(
	defineProps<{
		hero: GalleryPhoto;
		gallery: GalleryPhoto[];
		/** Optional pills overlaid on the top-left of the hero image. */
		tags?: GalleryTag[];
	}>(),
	{ tags: () => [] },
);

/** Thumbs are destination-owned photos; the large hero stays a placeholder until selected. */
const thumbPhotos = computed(() => props.gallery.slice(0, 4));
const overflowCount = computed(() => Math.max(0, props.gallery.length - 4));
const selectedIndex = ref<number | null>(null);

// The last thumb shows "+N" when photos overflow; its accessible name has to
// include that visible text (WCAG 2.5.3).
function thumbLabel(photo: { alt: string }, index: number): string {
	const more = index === thumbPhotos.value.length - 1 && overflowCount.value > 0 ? `+${overflowCount.value} more photos. ` : '';
	return `${more}View image ${index + 2} of ${totalCount.value}: ${photo.alt}`;
}

const activePhoto = computed(() => {
	if (selectedIndex.value === null) return props.hero;
	return props.gallery[selectedIndex.value] ?? props.hero;
});

const totalCount = computed(() => props.gallery.length + 1);
const displayIndex = computed(() => (selectedIndex.value === null ? 1 : selectedIndex.value + 2));

function selectPhoto(index: number) {
	selectedIndex.value = index;
}

// Steps through hero + every gallery photo (null = hero), wrapping at both
// ends. The thumbs only show the first four, so this is the way to the rest.
function step(delta: number) {
	const position = selectedIndex.value === null ? 0 : selectedIndex.value + 1;
	const next = (position + delta + totalCount.value) % totalCount.value;
	selectedIndex.value = next === 0 ? null : next - 1;
}

// Announced after an arrow or thumb press; empty on load so nothing speaks.
const liveText = ref('');
watch(selectedIndex, () => {
	liveText.value = `Image ${displayIndex.value} of ${totalCount.value}: ${activePhoto.value.alt}`;
});
</script>

<template>
	<div class="image-gallery">
		<div class="image-gallery__stage">
		<div
			class="img-hero"
			:style="activePhoto.src ? undefined : { background: activePhoto.color }"
			role="img"
			:aria-label="activePhoto.alt"
		>
			<img
				v-if="activePhoto.src"
				class="img-hero__photo"
				:src="activePhoto.src"
				:srcset="activePhoto.srcset"
				sizes="(max-width: 700px) 100vw, 700px"
				:alt="activePhoto.alt"
				loading="eager"
				fetchpriority="high"
				decoding="async"
			/>
			<i
				v-else
				class="image-gallery__hero-icon"
				:class="`ti ti-${activePhoto.icon}`"
				aria-hidden="true"
			></i>
			<div v-if="tags.length" class="image-gallery__tags">
				<span
					v-for="tag in tags"
					:key="tag.label"
					class="image-gallery__tag"
					:class="`image-gallery__tag--${tag.variant ?? 'feat'}`"
				>
					<i :class="`ti ti-${tag.icon}`" aria-hidden="true"></i>
					{{ tag.label }}
				</span>
			</div>
			<div class="image-gallery__counter">
				<i class="ti ti-photo" aria-hidden="true"></i>
				{{ displayIndex }} / {{ totalCount }}
			</div>
		</div>
		<!-- Outside .img-hero: its role="img" would hide these buttons from screen readers. -->
		<template v-if="totalCount > 1">
			<button type="button" class="image-gallery__arrow image-gallery__arrow--prev" aria-label="Previous photo" @click="step(-1)">
				<i class="ti ti-chevron-left" aria-hidden="true"></i>
			</button>
			<button type="button" class="image-gallery__arrow image-gallery__arrow--next" aria-label="Next photo" @click="step(1)">
				<i class="ti ti-chevron-right" aria-hidden="true"></i>
			</button>
		</template>
		<p class="sr-only" aria-live="polite">{{ liveText }}</p>
		</div>
		<div v-if="thumbPhotos.length" class="img-thumbs">
			<button
				v-for="(photo, index) in thumbPhotos"
				:key="`${photo.alt}-${index}`"
				type="button"
				class="img-thumb"
				:class="{ 'img-thumb--active': selectedIndex === index }"
				:style="photo.src ? undefined : { background: photo.color }"
				:aria-label="thumbLabel(photo, index)"
				:aria-current="selectedIndex === index ? 'true' : undefined"
				@click="selectPhoto(index)"
			>
				<img
					v-if="photo.src"
					class="img-thumb__photo"
					:src="photo.src"
					:srcset="photo.srcset"
					sizes="(max-width: 700px) 90px, 160px"
					alt=""
					loading="lazy"
					decoding="async"
				/>
				<template v-else>
					<i v-if="index < 3" :class="`ti ti-${photo.icon}`" aria-hidden="true"></i>
					<span v-else-if="overflowCount > 0" class="img-thumb__more">+{{ overflowCount }}</span>
					<i v-else :class="`ti ti-${photo.icon}`" aria-hidden="true"></i>
				</template>
				<span
					v-if="photo.src && index === 3 && overflowCount > 0"
					class="img-thumb__more img-thumb__more--overlay"
				>+{{ overflowCount }}</span>
			</button>
		</div>
	</div>
</template>

<style scoped>
.image-gallery__stage {
	position: relative;
	margin-bottom: 10px;
}

.image-gallery__stage .img-hero {
	margin-bottom: 0;
}

.image-gallery__arrow {
	position: absolute;
	top: 50%;
	transform: translateY(-50%);
	width: 36px;
	height: 36px;
	border: 0;
	border-radius: 50%;
	background: var(--color-background-primary);
	color: var(--color-text-primary);
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	box-shadow: 0 1px 4px rgb(0 0 0 / 20%);
}

.image-gallery__arrow--prev {
	left: 10px;
}

.image-gallery__arrow--next {
	right: 10px;
}

.image-gallery__arrow .ti {
	font-size: 20px;
}

.image-gallery__hero-icon {
	font-size: 48px;
	color: var(--color-border-secondary);
}

.image-gallery__tags {
	position: absolute;
	top: 10px;
	left: 10px;
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	max-width: calc(100% - 90px);
}

.image-gallery__tag {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 4px 9px;
	border-radius: 20px;
	font-size: 11px;
	font-weight: 500;
	background: var(--color-background-primary);
	color: var(--color-text-secondary);
	border: 0.5px solid var(--color-border-tertiary);
}

.image-gallery__tag .ti {
	font-size: 12px;
	color: var(--color-accent);
}

.image-gallery__tag--group {
	background: var(--color-background-success);
	color: var(--color-text-success);
}

.image-gallery__tag--group .ti {
	color: var(--color-text-success);
}

.image-gallery__tag--private {
	background: var(--color-category-private-bg);
	color: var(--color-category-private-text);
}

.image-gallery__tag--private .ti {
	color: var(--color-category-private-icon);
}

.image-gallery__tag--tip {
	background: var(--color-category-tip-bg);
	color: var(--color-category-tip-text);
}

.image-gallery__tag--tip .ti {
	color: var(--color-category-warning-icon);
}

.image-gallery__counter {
	position: absolute;
	top: 10px;
	right: 10px;
	background: var(--color-background-primary);
	border-radius: var(--radius-md);
	padding: 4px 10px;
	font-size: 12px;
	font-weight: 500;
	border: 0.5px solid var(--color-border-tertiary);
	display: flex;
	align-items: center;
	gap: 5px;
}

.image-gallery__counter .ti {
	font-size: 13px;
}

.img-thumb {
	border: 0.5px solid var(--color-border-tertiary);
}

.img-thumb--active {
	border-color: var(--color-border-primary);
}

.img-thumb:hover {
	border-color: var(--color-border-primary);
}

.img-thumb .ti {
	font-size: 18px;
	color: rgb(255 255 255 / 85%);
}

.img-hero__photo,
.img-thumb__photo {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}

.img-thumb {
	position: relative;
	overflow: hidden;
	padding: 0;
}

.img-thumb__more {
	font-size: 12px;
	font-weight: 500;
	color: rgb(255 255 255 / 90%);
}

.img-thumb__more--overlay {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgb(0 0 0 / 45%);
}
</style>
