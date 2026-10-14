<script setup lang="ts">
/* The island twin of ui/Badge.astro: same classes, same stylesheet. */
import '../../styles/components/badge.css';

export type BadgeTone = 'brand' | 'private' | 'premium' | 'tip' | 'neutral';

withDefaults(defineProps<{ tone?: BadgeTone; shape?: 'card' | 'tag'; icon?: string }>(), {
	tone: 'brand',
	shape: 'tag',
	icon: undefined,
});
</script>

<template>
	<span :class="['badge', `badge--${shape}`, `badge--${tone}`]">
		<i v-if="icon" :class="`ti ti-${icon}`" aria-hidden="true"></i>
		<slot />
	</span>
</template>
