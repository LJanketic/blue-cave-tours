import { reactive } from 'vue';
import type { DestinationCategory } from '../data/destinations';

/**
 * The Destinations page filter, shared by the chips in the photo hero
 * (DestinationFilters.vue) and the results below (DestinationsCatalog.vue):
 * islands are separate Vue apps but share ES modules. '' is "All".
 */
export const destinationsState = reactive<{ category: DestinationCategory | '' }>({ category: '' });

export const DESTINATION_FILTERS: { id: DestinationCategory | ''; label: string; icon: string }[] = [
	{ id: '', label: 'All destinations', icon: 'map-2' },
	{ id: 'island', label: 'Islands', icon: 'beach' },
	{ id: 'coastal-town', label: 'Coastal towns', icon: 'anchor' },
	{ id: 'cave-nature', label: 'Caves & nature', icon: 'mountain' },
	{ id: 'swimming', label: 'Best for swimming', icon: 'swimming' },
];
