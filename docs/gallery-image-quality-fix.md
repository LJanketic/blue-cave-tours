# Task: Fix blurry gallery/thumbnail images without raising serving cost

## Background

`https://hello-blue-cave.netlify.app/tours/blue-lagoon-morning/` renders visibly blurry, stretched images in its photo gallery. This was diagnosed by inspecting the live DOM and tracing it back to the image-optimization work in PR #4 (commits `49da7aa`, `1b1a97b`, merged as `8ebe662`). No implementation has been started — this file is the full brief for whoever picks it up.

Live repro measured on the Blue Lagoon Morning tour page: the gallery thumbnail `<img>` had `naturalWidth/naturalHeight` sourced from a max-160px-wide image, but was laid out at **919px × 59px** on screen — a ~6x upscale, hence the blur.

## Root causes (three, interacting)

1. **Undersized source vs. actual render size.** In `src/data/tour-photos.ts`, gallery photos (`tour.gallery` / destination galleries) are generated via `toGalleryView(photo, icon, GALLERY_THUMB_SIZE)`, where `GALLERY_THUMB_SIZE = { widths: [80, 160], sizes: '80px' }` — sized only for a small thumbnail square. But `src/components/vue/ImageGallery.vue`'s `activePhoto` computed property reuses that *exact same* optimized photo object as the large hero image once a thumbnail is clicked (the hero box renders up to 700px wide). A max-160px-wide source stretched to 700px is unavoidably blurry — this is a real bug independent of anything else below.

2. **Flex-grow stretch on sparse thumbnail rows.** In `src/styles/redesign.css:1799-1808`:
   ```css
   .img-thumbs {
   	display: flex;
   	gap: 8px;
   	margin-bottom: 20px;
   	min-width: 0;
   }
   .img-thumb {
   	height: 60px;
   	flex: 1 1 0;
   	min-width: 0;
   	...
   }
   ```
   `flex: 1 1 0` makes each thumbnail grow to fill the row equally. This was implicitly designed around exactly 4 thumbnails (~120-160px each). It backfires badly when a tour has fewer gallery photos: Blue Lagoon Morning has only 2 (`galleryFromDestinations('blue-lagoon', 'trogir')` in `src/data/tour-catalog.ts`), so a single thumbnail flex-grows to fill the entire row (measured: 919px wide). At least one other tour (`src/data/tour-catalog.ts` line ~235) also uses a 2-destination gallery and is equally affected. Even the "normal" 4-photo case only gets thumbs in the ~120-160px range, right at the edge of what an 80px-optimized image can support well.

3. **No `sizes` attribute anywhere.** None of `ImageGallery.vue`, `src/components/vue/ToursCatalog.vue`, or `src/components/vue/DestinationsCatalog.vue` set a `sizes` attribute on their `<img>` tags despite having `srcset`. Without `sizes`, browsers assume up-to-100vw rendering and default to fetching the *largest* available candidate. This isn't the cause of the blur (there's always a "biggest" candidate available), but it wastes bandwidth on card/thumb images that render much smaller than 100vw — the cost-side counterpart of this bug.

## Governing rule to apply (and to leave behind as a code comment)

> Every image variant set must include a candidate at or above the image's **largest real on-screen size across every context it can appear in** — this is the quality floor; never ship an object that gets asked to render bigger than its largest generated width. Every `<img srcset>` must carry an accurate, hand-matched `sizes` attribute reflecting that specific `<img>` tag's actual CSS-rendered width — this is the cost ceiling; it's what lets the browser fetch the *smallest* sufficient candidate instead of defaulting to the largest. Generating extra width variants is free (build-time-only, via Astro's Sharp-based image service — see `astro.config.mjs`'s `adapter: netlify({ imageCDN: false })` and the commit message on `49da7aa` for why that pipeline is deliberately build-time/free rather than a paid runtime CDN). Guessing wrong on `sizes`, or on the top of the width ladder, is not free — that's exactly where blur or bandwidth waste come from. **No `srcset` may ship without a matching `sizes`, and no image object may be reused in a visually larger display context than the one its width ladder was generated for.**

Write a condensed (3-4 line) version of this rule as a comment above `GalleryImageSize` / `toGalleryView` in `src/data/tour-photos.ts` so future additions follow it.

## Implementation steps

**1. Widen the width ladder for dual-purpose gallery photos**
Files: `src/data/tour-photos.ts`, `src/components/tour/TourDetailView.astro` (~line 40), `src/pages/destinations/[slug].astro` (~line 55).
Gallery photos are used both as small thumbnails *and*, once clicked, as the full hero image — they need hero-grade resolution available. Change these two call sites from `GALLERY_THUMB_SIZE` to a widened size covering both contexts. Either reuse/merge widths, or add a new constant, e.g.:
```ts
export const GALLERY_GALLERY_SIZE: GalleryImageSize = {
	widths: [80, 160, 400, 800, 1200],
	sizes: '80px', // unused directly — sizes is hardcoded per <img> in step 3, not derived from data
};
```
The always-static "first" hero photo (`tour.image` / destination hero, generated separately via `GALLERY_HERO_SIZE`) is unaffected — it never appears at thumbnail size, so leave its call site alone.

**2. Cap thumbnail width in CSS instead of letting it flex-fill**
File: `src/styles/redesign.css:1799-1808`.
Change `.img-thumb` from `flex: 1 1 0` (unbounded grow) to a bounded flex-basis with `max-width` around 160px (matching the largest thumb-appropriate srcset candidate — e.g. `flex: 0 1 160px; max-width: 160px;`), and switch `.img-thumbs` to `justify-content: flex-start` so 1-3 thumbnails sit at their natural size instead of stretching to fill the row. Note there's a second `.img-hero` / presumably a second `.img-thumb`-adjacent block around line 2065 in the same file (a media-query override) — check whether it needs the same treatment.

**3. Add accurate `sizes` to every `<img>` that has a `srcset`**
Hardcode `sizes` per template location to match each tag's real CSS box — do **not** try to derive it from the shared data layer, since the same photo object can render in two different boxes (thumb vs. hero) depending on template:
- `src/components/vue/ImageGallery.vue`, hero `<img class="img-hero__photo">`: add `sizes="(max-width: 700px) 100vw, 700px"` (matches existing `GALLERY_HERO_SIZE.sizes`)
- `src/components/vue/ImageGallery.vue`, thumb `<img class="img-thumb__photo">`: add `sizes="160px"` (matches the new CSS cap from step 2 — keep these two in sync)
- `src/components/vue/ToursCatalog.vue`, card `<img class="card-img__photo">`: add `sizes="(max-width: 700px) 88vw, 380px"` (matches existing `GALLERY_CARD_SIZE.sizes` — widths `[400, 800]` here are already generous, this is a pure bandwidth fix, no quality bug)
- `src/components/vue/DestinationsCatalog.vue`, both card `<img class="card-img__photo">` instances (there are two, ~line 124 and ~line 171): same `sizes` as above

**4. Document the rule**
Add the condensed governing-rule comment (see above) above `GalleryImageSize`/`toGalleryView` in `src/data/tour-photos.ts`.

## Files touched (expected)
- `src/data/tour-photos.ts` — widen gallery width ladder, add rule comment
- `src/components/tour/TourDetailView.astro` — pass widened size for `tour.gallery`
- `src/pages/destinations/[slug].astro` — pass widened size for destination gallery
- `src/components/vue/ImageGallery.vue` — add `sizes` to hero + thumb `<img>`
- `src/components/vue/ToursCatalog.vue`, `src/components/vue/DestinationsCatalog.vue` — add `sizes` to card `<img>`
- `src/styles/redesign.css` — cap `.img-thumb` width, `justify-content: flex-start` on `.img-thumbs` (check the ~line 2065 media-query block too)

## Verification
1. `pnpm build` — confirm new wider WebP variants are generated for gallery photos, no build errors, and the output HTML still has zero references to `/_image` or `/.netlify/images` (per the check already used in `1b1a97b`'s commit message).
2. Load `/tours/blue-lagoon-morning/` (2-photo gallery, the reproduction case). Confirm the thumbnail row no longer stretches full-width. Click a thumbnail to promote it into the hero slot and confirm `img.naturalWidth >= img.clientWidth` (no upscaling) — e.g. via a quick JS snippet against `document.querySelectorAll('img')` reading `currentSrc`/`naturalWidth`/`clientWidth`, the same technique used to diagnose this.
3. Load a tour with a 4-photo gallery to confirm no regression — thumbs still lay out sensibly.
4. Spot-check a tours/destinations catalog page: confirm `sizes` is present in the rendered HTML on card images, and that the requested variant (Network tab, filter by `.webp`) is the smaller 400w candidate at normal desktop width, not the 800w one — this is the cost check.
5. Compare total page weight for the tour detail page and a catalog page against the baseline noted in `1b1a97b`'s commit message (homepage: Lighthouse 77→99, LCP 4.1s→1.8s, total weight 856KB) to confirm no meaningful bandwidth regression from the widened ladder — a given visitor should still only ever download exactly one candidate per `<img>`, so total weight should be roughly flat or better (thumb/card images that were over-fetching due to missing `sizes` should now be smaller).

## Note on repo state
`main` had other in-flight work at the time this brief was written (see `git log` for latest). Rebase/merge-check before starting; this brief assumes the file line numbers as of commit `706109f`.
