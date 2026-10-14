<script setup lang="ts">
/* The island twin of ui/Button.astro: same classes, same stylesheet. */
import '../../styles/components/button.css';

withDefaults(
	defineProps<{
		variant?: 'primary' | 'secondary' | 'on-image' | 'on-image-ghost' | 'tile';
		size?: 'sm' | 'base' | 'md' | 'lg';
		href?: string;
		icon?: string;
		iconEnd?: string;
		block?: boolean;
		type?: 'button' | 'submit' | 'reset';
	}>(),
	{ variant: 'primary', size: 'base', href: undefined, icon: undefined, iconEnd: undefined, block: false, type: 'button' },
);
</script>

<template>
	<component
		:is="href ? 'a' : 'button'"
		:href="href"
		:type="href ? undefined : type"
		:class="['button', `button--${variant}`, size !== 'base' && `button--${size}`, block && 'button--block']"
	>
		<i v-if="icon" :class="`ti ti-${icon}`" aria-hidden="true"></i>
		<slot />
		<i v-if="iconEnd" :class="`ti ti-${iconEnd} button__end-icon`" aria-hidden="true"></i>
	</component>
</template>
