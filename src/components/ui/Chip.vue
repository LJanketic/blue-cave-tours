<script setup lang="ts">
/*
 * Glass filter chip for photo heroes (spec §6.2.1). A toggle button: the
 * pressed state shows as a white fill AND aria-pressed, never colour alone.
 */
withDefaults(defineProps<{ pressed?: boolean; icon?: string }>(), { pressed: false, icon: undefined });
defineEmits<{ click: [event: MouseEvent] }>();
</script>

<template>
	<button type="button" class="chip" :class="{ 'chip--pressed': pressed }" :aria-pressed="pressed" @click="$emit('click', $event)">
		<i v-if="icon" :class="`ti ti-${icon}`" aria-hidden="true"></i>
		<slot />
	</button>
</template>

<style scoped>
@layer components {
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 38px; /* board 02 */
		padding: 0 14px;
		border: 1px solid var(--color-border-glass);
		border-radius: var(--radius-pill);
		background: var(--color-glass-dark);
		backdrop-filter: blur(14px) saturate(140%);
		-webkit-backdrop-filter: blur(14px) saturate(140%);
		color: var(--color-text-on-image);
		font: inherit;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		white-space: nowrap;
		cursor: pointer;
		transition:
			background-color var(--duration-fast) ease,
			color var(--duration-fast) ease,
			border-color var(--duration-fast) ease;
	}

	.chip .ti {
		font-size: 16px;
	}

	.chip:hover {
		background: var(--color-glass-dark-hover);
	}

	.chip--pressed,
	.chip--pressed:hover {
		background: var(--color-surface-chip-active);
		border-color: var(--color-background-primary);
		color: var(--color-text-primary);
	}
}
</style>
