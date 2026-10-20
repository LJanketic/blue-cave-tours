<script setup lang="ts">
/*
 * A euro amount that depends on the price season, on prerendered pages: both
 * amounts are in the HTML and the page shows the one for today's season in
 * Split. BaseLayout sets <html data-season> from the build date and a tiny
 * inline script in <head> corrects it to the visitor's day before the first
 * paint, so there's no rebuild needed at a season change, no layout shift and
 * no hydration mismatch (the HTML is the same whatever the day). The hiding
 * rule is in BaseLayout too; it also hides the separator, which is there so
 * the text without CSS reads "€149 / €169". Renders one amount when both
 * seasons agree.
 */
import type { SeasonAmount } from '../../config/season';

defineProps<SeasonAmount>();
</script>

<template>
	<template v-if="low === peak">€{{ low }}</template>
	<template v-else><span class="season-price-ui season-price-ui--low">€{{ low }}</span><span class="season-price-ui__sep"> / </span><span class="season-price-ui season-price-ui--peak">€{{ peak }}</span></template>
</template>
