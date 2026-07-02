<script setup lang="ts">
import { ref } from 'vue';
import type { Destination } from '../../data/destinations';

type DestinationOption = Pick<Destination, 'slug' | 'name'>;

defineProps<{
	destinations: DestinationOption[];
}>();

const destination = ref('');
const date = ref('');
const tourType = ref('all');

function onSubmit(event: Event) {
	event.preventDefault();

	const url = new URL('/tours', window.location.origin);

	if (destination.value) {
		url.searchParams.set('destination', destination.value);
	}
	if (date.value) {
		url.searchParams.set('date', date.value);
	}
	if (tourType.value && tourType.value !== 'all') {
		url.searchParams.set('filter', tourType.value);
	}

	window.location.href = url.href;
}
</script>

<template>
	<form class="quick-search" @submit="onSubmit">
		<div class="qs-field">
			<span class="qs-label">Destination</span>
			<select id="qs-destination" v-model="destination">
				<option value="">All destinations</option>
				<option v-for="dest in destinations" :key="dest.slug" :value="dest.slug">
					{{ dest.name }}
				</option>
			</select>
		</div>
		<div class="qs-field">
			<span class="qs-label">Date</span>
			<input id="qs-date" v-model="date" type="date" />
		</div>
		<div class="qs-field">
			<span class="qs-label">Tour type</span>
			<select id="qs-type" v-model="tourType">
				<option value="all">Group or private</option>
				<option value="group">Group tour</option>
				<option value="private">Private charter</option>
			</select>
		</div>
		<button type="submit" class="qs-btn">
			<i class="ti ti-search" aria-hidden="true"></i>
			Search
		</button>
	</form>
</template>

<style scoped>
.qs-field select,
.qs-field input {
	width: 100%;
}

.qs-btn {
	min-height: unset;
	padding: 9px 18px;
}

.qs-btn .ti {
	font-size: 13px;
}
</style>
