<script setup lang="ts">
/* Kit demo of the hero filter chips (Tours page, §6.2.1). */
import { ref } from 'vue';
import Chip from '../components/ui/Chip.vue';
import ChipGroup from '../components/ui/ChipGroup.vue';

const CHIPS = [
	{ id: 'group', label: 'Group', icon: 'users' },
	{ id: 'private', label: 'Private', icon: 'crown' },
	{ id: 'half-day', label: 'Half day', icon: 'clock' },
];
const active = ref<string[]>(['group']);

function toggle(id: string) {
	active.value = active.value.includes(id) ? active.value.filter((x) => x !== id) : [...active.value, id];
}
</script>

<template>
	<ChipGroup label="Filter tours">
		<Chip v-for="chip in CHIPS" :key="chip.id" :icon="chip.icon" :pressed="active.includes(chip.id)" @click="toggle(chip.id)">
			{{ chip.label }}
		</Chip>
	</ChipGroup>
</template>
