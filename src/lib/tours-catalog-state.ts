import { reactive } from 'vue';
import type { CatalogQuery } from './tour-filters';

/**
 * Filter state shared by the two Tours page islands: the chips in the photo
 * hero (TourFilters.vue) and the results below (ToursCatalog.vue). Islands
 * are separate Vue apps but share ES modules, so this one object is theirs.
 */
export const catalogState = reactive<CatalogQuery & { ready: boolean }>({
	filters: [],
	sort: 'recommended',
	destination: '',
	q: '',
	/** True once the URL has been read, so results don't flash the unfiltered list. */
	ready: false,
});
