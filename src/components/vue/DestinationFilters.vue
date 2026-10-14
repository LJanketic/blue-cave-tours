<script setup lang="ts">
/* The Destinations hero's category chips (spec §6.4): single-select. */
import { onMounted, ref } from 'vue';
import Chip from '../ui/Chip.vue';
import ChipGroup from '../ui/ChipGroup.vue';
import { DESTINATION_FILTERS, destinationsState } from '../../lib/destinations-catalog-state';

// Mirror what the server rendered (All) until mounted, so hydration matches.
const mounted = ref(false);
onMounted(() => (mounted.value = true));
const isOn = (id: string) => (mounted.value ? destinationsState.category : '') === id;
</script>

<template>
	<ChipGroup label="Filter destinations">
		<Chip
			v-for="chip in DESTINATION_FILTERS"
			:key="chip.id || 'all'"
			:icon="chip.id ? chip.icon : undefined"
			:pressed="isOn(chip.id)"
			@click="destinationsState.category = chip.id"
		>
			{{ chip.label }}
		</Chip>
	</ChipGroup>
</template>
