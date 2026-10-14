/**
 * Guest reviews for the homepage and tour pages (D-5). Empty until there's a
 * real source: showing ratings or reviews needs the Omnibus disclosures
 * (where they come from, how they're checked; spec §6.1.9), and the layouts
 * work without them.
 */
export type Review = {
	author: string;
	/** ISO date the review was written. */
	date: string;
	rating: 1 | 2 | 3 | 4 | 5;
	text: string;
	tourSlug?: string;
};

export type ReviewsData = {
	/** Where the reviews come from, e.g. 'Google' or 'TripAdvisor'; null = none shown. */
	source: string | null;
	/**
	 * How reviews are checked to come from real guests (Omnibus Directive), as a
	 * sentence, e.g. "Google doesn't check that reviewers took the tour."
	 */
	verification: string | null;
	/** "as of" date of the average and count, e.g. '1 October 2026'. */
	asOf: string | null;
	sourceUrl: string | null;
	average: number | null;
	count: number | null;
	items: Review[];
};

/**
 * Selection rule (Omnibus): `items` are the most recent reviews from the
 * source, never picked by rating. Names are first name + initial only.
 * `average` and `count` cover all reviews on the source.
 */
export const REVIEWS: ReviewsData = {
	source: null,
	verification: null,
	asOf: null,
	sourceUrl: null,
	average: null,
	count: null,
	items: [],
};
