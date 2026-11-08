/*
 * Tours that run the same route at different times of day and are booked
 * from one step: the guest picks the date, then the time (design board 04b
 * "Group booking — half day"; ClickUp "Blue Lagoon vrijeme polaska", 8 Nov
 * 2026). They stay separate tours (their own pages, prices and capacity);
 * the choice only decides which one the booking is for.
 */

export type DepartureChoice = {
	/** The tour the booking goes to when this time is picked. */
	tourSlug: string;
	/** "Morning": shown as "09:30 · Morning". */
	label: string;
	icon: string;
};

export type DepartureChoiceGroup = {
	/** The booking step's heading for any tour of the group. */
	title: string;
	choices: readonly DepartureChoice[];
};

export const DEPARTURE_CHOICE_GROUPS: readonly DepartureChoiceGroup[] = [
	{
		title: 'Blue Lagoon Tour, Drvenik — Morning / Afternoon',
		choices: [
			{ tourSlug: 'blue-lagoon-morning', label: 'Morning', icon: 'sun' },
			{ tourSlug: 'blue-lagoon-afternoon', label: 'Afternoon', icon: 'sunset' },
		],
	},
];

/** The group a tour is booked in, or null when it's booked on its own. */
export function departureChoiceGroup(slug: string): DepartureChoiceGroup | null {
	return DEPARTURE_CHOICE_GROUPS.find((group) => group.choices.some((choice) => choice.tourSlug === slug)) ?? null;
}
