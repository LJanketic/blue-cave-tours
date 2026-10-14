<script setup lang="ts">
/* A labelled group of filter chips (spec §3.2, §11.7: buttons inside role=group). */
defineProps<{ label: string }>();
</script>

<template>
	<div class="chip-group" role="group" :aria-label="label">
		<slot />
	</div>
</template>

<style scoped>
@layer components {
	.chip-group {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
	}

	/* Phones: one row that scrolls sideways and bleeds to the right edge (board 02). */
	@media (max-width: 768px) {
		.chip-group {
			flex-wrap: nowrap;
			overflow-x: auto;
			scrollbar-width: none;
			margin-right: calc(-1 * var(--page-gutter));
			padding: 4px var(--page-gutter) 4px 4px;
			margin-left: -4px;
		}

		.chip-group::-webkit-scrollbar {
			display: none;
		}

		.chip-group > :deep(*) {
			flex: 0 0 auto;
		}
	}
}
</style>
