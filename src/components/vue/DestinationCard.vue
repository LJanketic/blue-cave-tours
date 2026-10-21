<script setup lang="ts">
/*
 * Destination card (spec §6.4). The card link wraps the body; "See tours" is
 * a separate sibling link (no nested links), and lights up on card hover.
 */
import type { DestinationCardDTO } from '../../lib/cards';
import Badge from '../ui/Badge.vue';
import { cardPhotoSrc } from '../../lib/cards';
import '../../styles/components/pill-link.css';

withDefaults(defineProps<{ destination: DestinationCardDTO; eager?: boolean; headingLevel?: 2 | 3 }>(), {
	eager: false,
	headingLevel: 3,
});
</script>

<template>
	<article class="dest-card-ui">
		<a class="dest-card-ui__link" :href="`/destinations/${destination.slug}/`">
			<div class="dest-card-ui__img">
				<img
					v-if="destination.photo"
					:src="cardPhotoSrc(destination.photo)"
					:srcset="destination.photo.srcset"
					sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 300px"
					:alt="destination.photo.alt"
					:loading="eager ? 'eager' : 'lazy'"
					decoding="async"
				/>
				<i v-else class="ti ti-map-pin" aria-hidden="true"></i>
				<Badge class="dest-card-ui__region" shape="card" tone="neutral">{{ destination.region }}</Badge>
			</div>
			<div class="dest-card-ui__body">
				<component :is="`h${headingLevel}`" class="dest-card-ui__name">{{ destination.name }}</component>
				<p class="dest-card-ui__desc">{{ destination.shortDescription }}</p>
				<ul class="dest-card-ui__attrs" role="list">
					<li v-for="attr in destination.attrs" :key="attr.label">
						<i :class="`ti ti-${attr.icon}`" aria-hidden="true"></i>
						{{ attr.label }}
					</li>
				</ul>
			</div>
		</a>
		<div class="dest-card-ui__foot">
			<span class="dest-card-ui__count">
				<i class="ti ti-sailboat" aria-hidden="true"></i>
				{{ destination.tourCount }} {{ destination.tourCount === 1 ? 'tour visits' : 'tours visit' }} here
			</span>
			<a class="pill-link" :href="`/tours/?destination=${destination.slug}`">
				See tours<span class="sr-only"> visiting {{ destination.name }}</span>
				<i class="ti ti-arrow-right" aria-hidden="true"></i>
			</a>
		</div>
	</article>
</template>

<style scoped>
@layer components {
	/* board 04: a tour card with an image and a footer row */
	.dest-card-ui {
		/* Contains the absolutely positioned .sr-only text, so it can't escape a scrolling row. */
		position: relative;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border: 1px solid var(--color-border-card);
		border-radius: var(--radius-xl);
		background: var(--color-background-primary);
		transition:
			border-color var(--duration-fast) ease,
			box-shadow var(--duration-fast) ease;
	}

	.dest-card-ui:hover {
		border-color: var(--color-border-primary);
		box-shadow: var(--shadow-card-hover);
	}

	.dest-card-ui__link {
		display: flex;
		flex: 1;
		flex-direction: column;
		color: var(--color-text-primary);
		text-decoration: none;
	}

	/* The link's ring sits inside the card, which clips overflow. */
	.dest-card-ui__link:focus-visible {
		outline-offset: -2px;
	}

	.dest-card-ui__img {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 180px; /* 20 Oct handoff, all widths */
		overflow: hidden;
		background: var(--color-background-secondary);
	}

	.dest-card-ui__img img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.4s ease;
	}

	.dest-card-ui:hover .dest-card-ui__img img {
		transform: scale(1.04);
	}

	.dest-card-ui__img > .ti {
		font-size: 40px;
		color: var(--color-border-secondary);
	}

	.dest-card-ui__region {
		position: absolute;
		top: var(--space-3);
		left: var(--space-3);
		max-width: calc(100% - 24px);
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.dest-card-ui__body {
		padding: 14px 14px 0;
	}

	.dest-card-ui__name {
		margin: 0 0 6px;
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		line-height: var(--line-height-tight);
	}

	/* Clamped: the full text is on the page the card links to (§11.13). */
	.dest-card-ui__desc {
		display: -webkit-box;
		margin: 0 0 14px;
		overflow: hidden;
		font-size: var(--font-size-body-md);
		line-height: var(--line-height-body-md);
		color: var(--color-text-secondary);
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}

	.dest-card-ui__attrs {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 0 0 14px;
		padding: 0;
		list-style: none;
	}

	.dest-card-ui__attrs li {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 9px;
		border-radius: var(--radius-pill);
		background: var(--color-background-secondary);
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}

	.dest-card-ui__attrs .ti {
		font-size: 13px;
	}

	.dest-card-ui__foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		margin: 0 14px;
		padding: 14px 0;
		border-top: 0.5px solid var(--color-border-tertiary);
	}

	.dest-card-ui__count {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-secondary);
	}

	.dest-card-ui__count .ti {
		font-size: 16px;
	}

	.dest-card-ui:hover .pill-link {
		background: var(--color-background-secondary);
	}

	.dest-card-ui:hover .pill-link .ti {
		transform: translateX(2px);
	}
}
</style>
