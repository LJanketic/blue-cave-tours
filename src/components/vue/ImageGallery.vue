<script setup lang="ts">
import { computed, ref } from 'vue';

type GalleryPhoto = {
	color: string;
	alt: string;
	icon: string;
};

const props = defineProps<{
	hero: GalleryPhoto;
	gallery: GalleryPhoto[];
}>();

const allPhotos = computed(() => [props.hero, ...props.gallery]);
const activeIndex = ref(0);

const activePhoto = computed(() => allPhotos.value[activeIndex.value] ?? props.hero);
const thumbPhotos = computed(() => allPhotos.value.slice(0, 4));
const overflowCount = computed(() => Math.max(0, allPhotos.value.length - 4));

function selectPhoto(index: number) {
	activeIndex.value = index;
}
</script>

<template>
	<div class="image-gallery">
		<div
			class="img-hero"
			:style="{ background: activePhoto.color }"
			role="img"
			:aria-label="activePhoto.alt"
		>
			<i class="image-gallery__hero-icon" :class="`ti ti-${activePhoto.icon}`" aria-hidden="true"></i>
			<div class="image-gallery__counter">
				<i class="ti ti-photo" aria-hidden="true"></i>
				{{ activeIndex + 1 }} / {{ allPhotos.length }}
			</div>
		</div>
		<div class="img-thumbs">
			<button
				v-for="(photo, index) in thumbPhotos"
				:key="`${photo.alt}-${index}`"
				type="button"
				class="img-thumb"
				:class="{ 'img-thumb--active': activeIndex === index }"
				:style="{ background: photo.color }"
				:aria-label="`View image ${index + 1}: ${photo.alt}`"
				:aria-current="activeIndex === index ? 'true' : undefined"
				@click="selectPhoto(index)"
			>
				<i v-if="index < 3" :class="`ti ti-${photo.icon}`" aria-hidden="true"></i>
				<span v-else-if="overflowCount > 0" class="img-thumb__more">+{{ overflowCount }}</span>
				<i v-else :class="`ti ti-${photo.icon}`" aria-hidden="true"></i>
			</button>
		</div>
	</div>
</template>

<style scoped>
.image-gallery__hero-icon {
	font-size: 48px;
	color: rgb(255 255 255 / 85%);
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

.img-thumb__more {
	font-size: 12px;
	font-weight: 500;
	color: rgb(255 255 255 / 90%);
}
</style>
