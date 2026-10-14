<script setup lang="ts">
/*
 * Tour card (spec §6.2.2). The whole card is one link, so it's one tab stop
 * and a big target; "View tour" is a styled span, not a second control.
 * Rendered statically from Astro pages (no client: directive) and inside
 * ToursCatalog.vue.
 */
import { computed } from 'vue';
import type { TourCardDTO } from '../../lib/cards';
import Badge from '../ui/Badge.vue';

const props = withDefaults(
	defineProps<{
		tour?: TourCardDTO;
		/** `slider`: no hover effects, so dragging doesn't flash them. `see-all`: the slider's last card. */
		variant?: 'default' | 'slider' | 'see-all';
		/** see-all only. */
		href?: string;
		/** The first visible card on a page can load eagerly. */
		eager?: boolean;
		headingLevel?: 2 | 3;
	}>(),
	{ tour: undefined, variant: 'default', href: '/tours/', eager: false, headingLevel: 3 },
);

const unit = computed(() => (props.tour?.priceUnit === 'boat' ? '/ boat' : '/ person'));
</script>

<template>
	<a v-if="variant === 'see-all'" class="tour-card-ui tour-card-ui--see-all" :href="href">
		<span class="tour-card-ui__all-icon" aria-hidden="true"><i class="ti ti-arrow-right"></i></span>
		<component :is="`h${headingLevel}`" class="tour-card-ui__all-title">See all tours</component>
		<span class="tour-card-ui__all-sub">Group trips and private charters</span>
	</a>
	<a v-else-if="tour" :class="['tour-card-ui', `tour-card-ui--${variant}`]" :href="`/tours/${tour.slug}/`">
		<div class="tour-card-ui__img">
			<img
				v-if="tour.photo"
				:src="tour.photo.src"
				:srcset="tour.photo.srcset"
				:sizes="tour.photo.sizes"
				:width="tour.photo.width"
				:height="tour.photo.height"
				:alt="tour.photo.alt"
				:loading="eager ? 'eager' : 'lazy'"
				decoding="async"
			/>
			<i v-else class="ti ti-sailboat" aria-hidden="true"></i>
			<Badge v-if="tour.badge" class="tour-card-ui__badge" shape="card" :tone="tour.badge.tone">{{ tour.badge.label }}</Badge>
		</div>
		<div class="tour-card-ui__body">
			<component :is="`h${headingLevel}`" class="tour-card-ui__name">{{ tour.title }}</component>
			<div class="tour-card-ui__foot">
				<span class="tour-card-ui__price">
					<template v-if="tour.adultPrice !== null">
						<span class="tour-card-ui__from">From</span>
						<span class="tour-card-ui__amount">{{ tour.priceLabel }}</span>
						<span class="tour-card-ui__per">{{ ` ${unit}` }}</span>
					</template>
					<span v-else class="tour-card-ui__amount tour-card-ui__amount--request">{{ tour.priceLabel }}</span>
				</span>
				<span class="tour-card-ui__duration">
					<i class="ti ti-clock" aria-hidden="true"></i>
					<span class="sr-only">Duration: </span>{{ tour.durationShort }}
				</span>
			</div>
			<span v-if="tour.mandatoryFeeLabel" class="tour-card-ui__fee">{{ tour.mandatoryFeeLabel }}</span>
			<span class="tour-card-ui__cta">View tour</span>
		</div>
	</a>
</template>

<style scoped>
@layer components {
	/* board hbc.css .tour-card */
	.tour-card-ui {
		/* Contains the absolutely positioned .sr-only text, so it can't escape a scrolling row. */
		position: relative;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border: 1px solid var(--color-border-card);
		border-radius: var(--radius-xl);
		background: var(--color-background-primary);
		color: var(--color-text-primary);
		text-decoration: none;
		transition:
			border-color var(--duration-fast) ease,
			box-shadow var(--duration-fast) ease,
			background-color var(--duration-fast) ease;
	}

	.tour-card-ui__img {
		position: relative;
		display: flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		height: 180px; /* board 02 */
		overflow: hidden;
		background: var(--color-background-secondary);
	}

	.tour-card-ui__img img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.4s ease;
	}

	.tour-card-ui__img > .ti {
		font-size: 40px;
		color: var(--color-border-secondary);
	}

	.tour-card-ui__badge {
		position: absolute;
		top: var(--space-3);
		left: var(--space-3);
		z-index: 1;
	}

	.tour-card-ui__body {
		display: flex;
		flex: 1;
		flex-direction: column;
		padding: 14px;
	}

	.tour-card-ui__name {
		margin: 0 0 14px;
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		line-height: var(--line-height-tight);
	}

	.tour-card-ui__foot {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--space-2);
		margin-top: auto;
	}

	.tour-card-ui__from {
		display: block;
		margin-bottom: 1px;
		font-size: var(--font-size-xs);
		color: var(--color-text-tertiary);
	}

	.tour-card-ui__amount {
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-semibold);
		line-height: 1.1;
	}

	.tour-card-ui__amount--request {
		font-size: var(--font-size-lg);
	}

	.tour-card-ui__per {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.tour-card-ui__duration {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		gap: 4px;
		padding-bottom: 3px;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-secondary);
	}

	.tour-card-ui__duration .ti {
		font-size: 16px;
	}

	/* Consumer law: a mandatory on-site fee shows next to the price (§6.2.2). */
	.tour-card-ui__fee {
		margin-top: 4px;
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}

	.tour-card-ui__cta {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 46px; /* board 02 .tc-btn */
		margin-top: 10px;
		border: 0.5px solid var(--color-border-tertiary);
		border-radius: var(--radius-btn);
		background: var(--color-background-secondary);
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-medium);
		transition:
			background-color var(--duration-fast) ease,
			border-color var(--duration-fast) ease,
			color var(--duration-fast) ease;
	}

	/* The ring goes round the whole card: it's the link. */
	.tour-card-ui:focus-visible .tour-card-ui__cta,
	.tour-card-ui--default:hover .tour-card-ui__cta {
		border-color: var(--color-border-highlight);
		background: var(--color-background-highlight);
		color: var(--color-text-on-image);
	}

	.tour-card-ui--default:hover {
		border-color: var(--color-border-primary);
		box-shadow: var(--shadow-card-hover);
	}

	.tour-card-ui--default:hover .tour-card-ui__img img {
		transform: scale(1.04);
	}

	/* See all (board 01 .tc-all). */
	.tour-card-ui--see-all {
		align-items: center;
		justify-content: center;
		gap: 10px;
		min-height: 100%;
		padding: var(--space-6);
		border: 1px dashed var(--color-border-secondary);
		background: var(--color-background-secondary);
		text-align: center;
	}

	.tour-card-ui--see-all:hover {
		border-color: var(--color-border-primary);
		background: var(--color-background-hover);
	}

	.tour-card-ui__all-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 56px;
		border: 0.5px solid var(--color-border-tertiary);
		border-radius: 50%;
		background: var(--color-background-primary);
		font-size: 24px;
		transition:
			background-color var(--duration-fast) ease,
			color var(--duration-fast) ease,
			transform var(--duration-fast) ease;
	}

	.tour-card-ui--see-all:hover .tour-card-ui__all-icon,
	.tour-card-ui--see-all:focus-visible .tour-card-ui__all-icon {
		border-color: var(--color-border-highlight);
		background: var(--color-background-highlight);
		color: var(--color-text-on-image);
		transform: translateX(3px);
	}

	.tour-card-ui__all-title {
		margin: 0;
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
	}

	.tour-card-ui__all-sub {
		max-width: 200px;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}
}
</style>
