<script setup lang="ts">
/* The island twin of ui/EmptyState.astro. The default slot holds an optional action (e.g. "Clear filters"). */
import '../../styles/components/empty-state.css';

withDefaults(defineProps<{ icon?: string; text: string }>(), { icon: 'mood-sad' });
</script>

<template>
	<div class="empty-state">
		<i :class="`ti ti-${icon}`" aria-hidden="true"></i>
		<p>{{ text }}</p>
		<slot />
	</div>
</template>
