# Design handoff (Ivan, 20 Oct 2026): status and implementation plan

Source: `~/Downloads/Hello Blue Cave — Design & behaviour changes (handoff).docx`.
Baseline: `main` at `da19f16` (PR #19 merged). Status: draft for review. Nothing is implemented yet.

**User rulings (20 Oct, after the first review):**

1. **Latest operator data wins.** Where the handoff's facts differ from what's on main (capacity 14, 2016, Blue Lagoon and Red Rocks times, durations, prices), main stays, and the handoff is used for design and behaviour only.
2. **Every tour is bookable as both a group tour and a private tour.** This replaces the 18 Oct "Blue Lagoon stays group-only" decision and the private-only status of Red Rocks and Split–Dubrovnik. See PR 5.

**Your answers (20 Oct, after the second check):**

3. **Blue Lagoon stays as two tours** (morning and afternoon) for now. The handoff's 05b Morning/Afternoon screen is deferred.
4. **Keep the Group / Private / Half day filter chips.**
5. **Red Rocks and Split–Dubrovnik stay "Price on request"** for the group option until the operator sends prices and times.
6. **No language switcher for now.** The header keeps "Book now" / "Contact".
7. Still open: the two Excel sheets (D6), the founding year (D3) and the maps (D7).

Rules carried over from earlier work:

- Facts (prices, times, capacity, years, ratings) come from `src/data/*` and `src/config/*`, never from the canvas (`design/2026-10/README.md`). Where the handoff states a fact that differs from operator data, the operator data stays until you decide otherwise (section 2).
- Work in one branch per PR off `main`. Nothing is committed or pushed until you ask.
- Every PR must pass `pnpm check` (astro check, icon subset, thumbs, tokens), `pnpm test`, `pnpm test:e2e`, `pnpm test:a11y`, and the Lighthouse mobile spot check (home, tours, one tour page) before it's handed over.

---

## 1. What's already done, what isn't

Legend: **Done** = already on main. **Partial** = some of it exists. **Todo** = not started. **Blocked** = needs a decision or input (section 2). **N/A** = the site never had it.

### Global / shared

| # | Item | Status | Evidence |
|---|------|--------|----------|
| G1 | Header CTA → language dropdown (EN/HR/DE/IT/FR) on all pages | **Blocked** (D1) | `Header.astro` has "Book now"/"Contact". The site is English-only: no `i18n` config and no translated content. |
| G2 | Logo: sailboat icon and "Hello Blue Cave" in UI font | **Done** | `Header.astro` `.site-header__logo` |
| G3 | Whole tour card is one `<a>`, "View tour" is a `<span>` | **Done** | `TourCard.vue` |
| G3b | Card hover turns button blue, plus border, shadow, zoom | **Partial** | Works on `default` cards. The homepage slider uses `variant="slider"`, which has no hover because of drag-to-scroll. Hover can come back once drag is removed (H8). |
| G4 | "View tour" always blue at ≤768px or `(hover: none)` | **Todo** | No `hover: none` rule in `src/` |
| G5 | Cards without a CTA have no hover (Tours Group/Private cards) | **Todo** | `TypeCards.astro:89`: `:hover` applies even with `withCtas={false}` |
| G6 | How it works: light-blue cards, brand-blue number and title | **Todo** | `HowItWorks.astro` uses `--color-background-secondary` |
| G7 | Tour breadcrumb `Tours › <tour>` (drop the destination level) | **Todo** | `TourDetailView.astro:49-53` adds the primary destination |
| G8 | Custom inline-SVG crown on the "Private experience" button | **Todo** | Tabler `ti-crown` icon font today (`TourDetailView.astro:226`) |

### 01 Homepage

| # | Item | Status | Evidence |
|---|------|--------|----------|
| H1 | One visible H1 overline; slide headlines are `<p>` | **Partial** | The headlines are already `<p>` (`HeroCarousel.vue:232`). The H1 is `sr-only` with different text (`index.astro`). |
| H2 | Slide order: Hello Blue Cave → Escape → All aboard | **Todo** | `marketing.ts` order is Escape → All aboard → Hello |
| H3 | New subtitles | **Todo, conflicts** | Copy says "max 12 people" and "since 2015". The operator set 14 (`MAX_GUESTS = 14`) and the site says founded 2016 (`FOUNDING_YEAR`). See D2, D3. |
| H4 | Two CTAs per slide (orange group + glass private), stacked at ≤768px | **Todo** | One CTA per slide |
| H5 | Dots directly under the CTAs, left-aligned | **Todo** | `.home-hero__dots` sits at the bottom, centred |
| H6 | Vertical rhythm 28/20/28/28 (mobile 20/14/20/20) | **Todo** | |
| H7 | `<title>` "Boat Tours from Split — Blue Cave & Island Hopping \| Hello Blue Cave" | **Todo** | `HOME_PAGE_TITLE` in `site.ts:65` |
| H8 | Section order: Popular → Destinations → Group/private → How → Reviews → FAQ | **Todo** | Group/private currently comes before Destinations |
| H9 | Slider arrows on the cards (44px circles, centred, hidden on mobile), fade and leave tab order at the ends, no mouse drag | **Todo** | Arrows are in the section header with `aria-disabled` and stay focusable. Drag exists (`PopularTours.astro:82-121`). |
| H10 | 5 tours in the slider, no Sunset Bay | **Partial** | There never was a Sunset Bay. The slider shows `featured` tours (3) plus "See all". |
| H11 | Reviews card: dark brand blue, 4.9 light blue, amber stars | **Blocked** (D5) | The section is hidden until there's a real review source (Omnibus, D-5). The styles can still be done now. |
| H12 | Bottom CTA band unchanged | **Done** | |

### 02 Tours overview

| # | Item | Status | Evidence |
|---|------|--------|----------|
| T1 | 5 tours plus a "Build your own" private card last | **Decided**: 6 tours (Blue Lagoon stays two) + Perfect Day as the "Build your own" card (PR 5) | The site has 7: Blue Lagoon is two tours (morning and afternoon), and Perfect Day is a normal card. |
| T2 | Red Rocks 9 h | **Resolved: keep 8.5 h** (operator data wins). It becomes group + private (PR 5); group price and time are D4b. | `tour-catalog.ts:159-200` |
| T3 | Destination dropdown (8 options, "Blue Cave & Vis" grouped) | **Todo** | Only a removable chip when `?destination=` is set. The sort select is the only dropdown. |
| T4 | Whole pill opens the select ("All destinations", "Most popular") | **Todo** | Sort pill: needs a check that the `<select>` covers the pill and the icons use `pointer-events: none` |
| T5 | Group/Private info cards: no hover | **Todo** | = G5 |
| T6 | Blue-tinted How it works | **Todo** | = G6 |
| T7 | No "sunset runs" in the subtitle | **Done** | No match in `src/` |

### 03 Tour detail

| # | Item | Status | Evidence |
|---|------|--------|----------|
| D1 | H2s worded for search ("About the … tour", "Tour itinerary — from Split to …", "What's included in the tour", "Good to know before you go", "… tour reviews") | **Partial** | Real H2s exist (`SectionHeader` level 2) with generic wording. There's no "About" heading, and no reviews section (D5). |
| D2 | Breadcrumb `Tours › name` | **Todo** | = G7 |
| D3 | Crown button behaviour | **Todo** | = G8 |
| D4 | Content from the "batch 2" sheet | **Blocked** (D6) | `HBC_Tour_Content_Batch2.xlsx` isn't on this machine |
| D5 | Blue Cave "Read more" (4 lines, 3-line fade, centred toggle, text stays in the DOM) | **Todo** | |
| D6 | New second intro paragraph on Blue Cave (max 12, pre-season route, cave ticket on site) | **Blocked** (D2, D6) | Not in any sheet yet. Says 12. |

### 04 Destinations and 10 Destination detail

| # | Item | Status | Evidence |
|---|------|--------|----------|
| X1 | Grid 3 / 2 (≤1024) / 1 (≤640) columns, photo 180px | **Partial** | 2 columns, then 1 at ≤640 (`DestinationsCatalog.vue:54,73`) |
| X2 | 9 destinations (no Split; "Brač & Zlatni Rat"; no Šolta) | **Partial** | 10 on the site, including `split`. Šolta is already gone. `zlatni-rat` is named "Zlatni Rat (Golden Horn)". |
| X3 | Trogir and Korčula show an icon placeholder | **Check** | They exist. Their photos are placeholders (quality review, 20 Oct). |
| X4 | "Caves & nature" = Blue Cave and Brač & Zlatni Rat | **Todo** | `zlatni-rat` has `['swimming']` only. Vis is already excluded. |
| X5 | Tour counts Hvar 4, Pakleni 3, Brač 2, others 1 | **Todo** | Follows from `tourSlugs` once D4 is settled. A test will assert it. |
| X6 | Destination tour cards fully clickable | **Done** | `TourCard` |
| X7 | Destination detail "side panel" Private button with crown | **N/A?** (D9) | The destination page has no side panel or private CTA |
| X8 | Hvar static map with 80% scrim and "View on map" → Google Maps | **Todo** (D7) | Text link only (`destinations/[slug].astro:120`) |

### Booking flow

| # | Item | Status | Evidence |
|---|------|--------|----------|
| B1 | 05a: no departure picker; the single departure shows in the summary only | **Partial** | With one departure there's already no picker, but a "Check-in … · departure …" line sits under the calendar (`GroupBookingFlow.vue:248`). The summary already has a "Departure" row. |
| B2 | 05b (**deferred**, answer 3): Blue Lagoon Morning/Afternoon choice, always visible, morning preselected, summary "09:00 · Morning" | **Partial, conflicts** (D4) | The picker exists for tours with more than one departure (`ChoiceCards`, always visible, first preselected), but Blue Lagoon is split into two tours. Times differ: handoff 09:00/14:00, operator 09:30/14:30. Handoff prices "€[—]" are canvas placeholders: real prices are in `src/data/prices.ts`. |
| B3 | 06 Private experience routes, no per-person prices on counters | **N/A today** (D8) | The private booking page isn't built. `/book/:slug/private` redirects to `/contact/` and `CHARTER.routes` is empty (PR 8 waits on D-8). The handoff's route list partly answers D-8. |
| B4 | 07a/07b no changes | **Done** | |
| B5 | 08 success check circle green (teal tokens) | **Todo** | `success.astro:151` uses `--color-background-brand-soft` |

### 13 About and 14 Contact

| # | Item | Status | Evidence |
|---|------|--------|----------|
| A1 | Photo hero, transparent nav, overline "Since 2015 · Split", "About us", one-line intro | **Todo** (D3) | Solid header, text hero |
| A2 | Stats bar: Licensed operator · 10 years · 4.9 from 800+ reviews, marquee at ≤1000px | **Blocked** (D3, D5) | `LICENCE_CONFIRMED = false`, no review source, founding year 2016. The bar renders only confirmed items (`TrustBand` already does that). |
| A3 | H2s "Small-group boat tours from Split, by design", "Our story — ten years on the Adriatic", "How we run our boat tours" | **Todo** | Current: "How we got here", "Meet the crew", "What we believe in" |
| A4 | Timeline realigned, line dot to dot, max 680px, left-aligned | **Todo** | `Timeline.astro` variant `history` |
| A5 | Remove "Meet the crew" and "As featured in" | **Partial** | No press section exists. Crew is still there (`about/index.astro:66`). |
| A6 | Bottom CTA band as on the homepage (photo, overlay, display font, orange + glass) | **Todo** | Plain `CtaBand` |
| C1 | Contact: static Split map, red pin, 80% scrim, caption, whole block links to Maps | **Todo** (D7) | Text link `.contact__map` |

### Removed screens and open items in the handoff

| # | Item | Status |
|---|------|--------|
| R1 | Sunset Bay tour, slide, card, route | **N/A**: canvas-only placeholder, never on the site |
| R2 | Footer "Sunset cruises" | **Done**: removed under D-19 (`Footer.astro:10`) |
| R3 | Meta description and keyword-led title on every page | **Mostly done**: every public page already has a `description` and its own title. Only the homepage title changes (H7). Optional rewrite in PR 7. |
| R4 | Real map images instead of drawn snapshots | Covered by D7 |
| R5 | Group prices "€[—]" | **N/A**: real seasonal prices are in `prices.ts`. Never copy canvas prices. |
| R6 | Distances and times in the destination sheet (Hvar "~2.5 h") | **Blocked** (D6). The site says ~1–1.5 h from Split. |

**Totals:** about 60 handoff items. 9 are done, 12 partial, 27 todo, and 12 are blocked or conflict with operator data.

---

## 2. Decisions needed before building

My recommendation comes first in each.

| ID | Question | Recommendation | Blocks |
|----|----------|----------------|--------|
| **D1** ✅ Not now | Language switcher: the site is English-only. Do translations exist? | **Keep the current header CTA until translated content exists**, then do i18n as its own project (Astro `i18n` routing, `/hr/`, `/de/`… folders, sitemap `hreflang`, translated legal pages from the lawyer). A switcher that only offers English, or links to untranslated pages, misleads visitors. Fallback if you want the look now: build the dropdown with EN only and ship it hidden behind a `LANGUAGES` config of length 1. | G1 |
| **D2** | Capacity in new copy: handoff says 12, operator said 14 on 19 Oct (`MAX_GUESTS = 14`) | **Use `MAX_GUESTS` everywhere.** Never type the number into copy. | H3, D6 |
| **D3** | Founding year: handoff "since 2015 / 10 years", site `FOUNDING_YEAR = 2016` | Ask the operator. Copy derives from `FOUNDING_YEAR` either way ("10 years" = current year − founding year). | H3, A1, A2, A3 |
| **D4** ✅ No merge for now | Tour list. Partly answered: operator times win, and every tour is group + private. Still open: merge the two Blue Lagoon tours into one with a Morning/Afternoon choice (handoff 05b)? | **Merge** (the booking flow already supports several departures), keeping the operator's 09:30/14:30 and 4.5 h. Perfect Day becomes the "Build your own" card. | T1, B2, X5, H10 |
| **D4b** ✅ Stays "on request" | Group prices and fixed group departure times for **Red Rocks** and **Split–Dubrovnik**. Neither has a group price (`prices.ts`) or a fixed time (`departures: []`, both are "flexible / approx." today). | Ask the operator. Until then, both show "Price on request": the group button goes to the contact form (already how `prices: null` works), and the private button stays (needs PR 1 item 7). They become instantly bookable the moment the two numbers and a time are added. | PR 5 |
| **D4c** | Perfect Day ("Create your perfect day") is a custom private day by definition. Does "every tour" include it? | **No.** It's the private "Build your own" card, not a tour with a group departure. | PR 5 |
| **D5** | Reviews: the "4.9", "800+ reviews" and "… tour reviews" sections need a real source (Omnibus, spec D-5) | Build the new styles, but leave everything gated on `REVIEWS.source` as now. The stats bar drops the rating item until then. | H11, A2, D1 (reviews H2) |
| **D6** | Content sheets `HBC_Tour_Content_Batch2.xlsx` and `HBC_Destination_Content.xlsx` | Please put them in `~/Downloads`. The content PR waits for them. | D4, D6, R6, X2 copy |
| **D7** | Maps: real images or an embed | **A self-hosted static image** (CSP is `img-src 'self'`, and the privacy policy promises no third-party cookies, which a Google embed would break). Source: export from a provider whose terms allow a stored static image, with on-image attribution (e.g. © OpenStreetMap contributors via a licensed static-map provider). OSM's own tile servers forbid bulk downloading for this. Google's Static Maps terms limit storing images: confirm before using it. Until then, use the designer's snapshot with no false attribution. | X8, C1 |
| **D8** | Private experience page (06): build it now with the handoff's route list? | **Not in this round.** It's PR 8 of the redesign (needs durations and a price table, D-8). For now, update the contact form's tour options so the routes match the handoff. | B3 |
| **D9** | Destination detail: add a "Plan a private experience" CTA panel (it doesn't exist) | Skip unless you want it. If yes, add a small aside with the crown button that links to `charterUrl()`. | X7 |
| **D10** | Removing the header "Book now" also removes the main conversion CTA on solid pages | It only matters if D1 goes ahead. Keep "Book now" in the phone menu either way. | G1 |
| **D11** | "Licensed skipper" in the Escape subtitle | Fine if true. Gate it like the other licence claims (`LICENCE_CONFIRMED`) or reword to "experienced skipper". | H3 |

---

## 3. Implementation plan

Seven PRs, each shippable on its own. Estimates are focused working time.

**Build order: 1 → 5 → 2 → 3 → 4 → 6 (→ 7).**
- PR 5 (catalog) moves up to second: it's fully unblocked, and PR 2's slider and PR 3's headings should use the final group + private data.
- PR 1 must land before PR 5: its CTA change keeps the private button on tours with no group price.
- PR 6 waits for the sheets (D6).

### PR 1: Shared card and component behaviour (`design/handoff-1-shared`) · ~0.5 day

1. **Touch "View tour" blue** (G4). `TourCard.vue` `<style scoped>`: extend the active-state selector instead of copying it:
   ```css
   .tour-card-ui:focus-visible .tour-card-ui__cta,
   .tour-card-ui:hover .tour-card-ui__cta { … }
   @media (max-width: 768px), (hover: none) {
     .tour-card-ui__cta { /* same three declarations */ }
   }
   ```
   Gate the zoom, shadow and border hover effects behind `@media (hover: hover)` (MDN: hover-only effects should be gated, so a tap doesn't leave them stuck). The handoff says "rule lives in hbc.css". Our equivalent is the component's scoped CSS, so no global rule.
2. **Slider cards get hover** (G3b): done in PR 2, together with removing drag. Turning hover on while drag still exists would flash hover states during drags.
3. **No hover without a CTA** (G5): in `TypeCards.astro`, scope `:hover` to `.type-cards:not(.type-cards--plain) .type-cards__card:hover`.
4. **How it works tint** (G6): `HowItWorks.astro` cards use `--color-background-info` (exists). Number and title use `--color-text-brand` (exists). Use tokens only: `scripts/tokens-check.mjs` fails on raw hex.
5. **Breadcrumb** (G7): the visible breadcrumb (`TourDetailView.astro:49-53`) and the `BreadcrumbList` JSON-LD (`pages/tours/[slug].astro:29-36`) are built **separately**, and both add the destination level today. Add one helper `tourBreadcrumbs(tour)` in `src/lib/tour-display.ts` that returns `[Tours, tour]`, and use it for both, so they can't drift. Home stays the first JSON-LD item only. Add a unit test. `getPrimaryDestinationForTour` stays in use elsewhere, so don't delete it.
6. **Crown SVG** (G8):
   - New `src/components/ui/CrownIcon.astro`: inline `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">` with `stroke="currentColor"` for the default outline. The fill comes from a CSS custom property, so hover only changes CSS.
   - Get the path from the updated canvas export (I can't read the canvas: it renders client-side). Until then, draw a 24-px crown path (sharp joins, 1.5 stroke) to match the boards.
   - `Button.astro` gets an `iconSvg` slot (named slot `icon`) instead of hard-coding a crown. The secondary "Private experience" button passes `<CrownIcon slot="icon" />`.
   - Hover: the crown always sits in a fixed 30×30 box (`display: inline-grid; place-items: center; border-radius: 50%`), so hover never shifts the label. Only `background` changes (transparent → `var(--color-background-primary)`), and `color`/`fill` change to `var(--color-crown-hover)`. Respect `prefers-reduced-motion` for the transition. Also trigger it on `:focus-visible`. Add `--color-crown-hover: var(--palette-orange-500)` to `tokens/design.css`. Correction: the handoff's `#F97316` is Tailwind's orange-500, while the site's `--palette-orange-500` is `#f2662b`. We use the site's value and note the deviation on the token. The CTA token `--color-cta-on-image` is orange-600: don't reuse it.
   - Remove `crown` from the subset only if nothing else uses `ti-crown`. The Tours filter chip and badges still do, so it stays.
7. **Private button label and logic** (G8, user ruling 2): `tourCtas()` (`src/lib/tour-display.ts:33-45`) only offers the private button when the group tour is instantly bookable (`offersCharter = instant && …`). After PR 5, Red Rocks and Dubrovnik are group + private but have no group price yet, so they'd lose the private option. Change the rule:
   - `secondary` whenever `types` includes both, whatever the price.
   - Primary without a price: "Ask about the group tour" → `contact(slug)`.
   - Secondary label: "Plan a private experience" (the handoff wording, same as the hero) → `charter(slug)`.
   - Update the doc comment and `tour-display.test.ts`.
8. **Payment success green** (B5): watch out, `--color-background-success` currently maps to **blue-100**, so "success" is blue today. Add a green pair (as built: `--palette-green-100/800`, `--color-background-positive` / `--color-icon-positive`; not the `--color-accent-teal` migration alias). Use it in `success.astro` `.done__icon` only. Don't repoint `--color-background-success`: other success notices use it, and changing it would recolour them.

Tests: update visual baselines for cards (`tests/visual`). New e2e: emulate `hasTouch` + `(hover: none)` with Playwright `page.emulateMedia` and assert the CTA background colour. Axe: no new violations.

### PR 2: Homepage (`design/handoff-2-home`) · ~1 day

1. **H1** (H1): replace the `sr-only` H1 in `index.astro` with a visible overline H1 inside the hero. `HeroCarousel.vue` gets a `heading` prop (string). It renders `<h1 class="home-hero__overline">` once, outside the slide loop, so it stays put while the slides rotate. Text lives in `marketing.ts` as `HERO_OVERLINE`.
2. **Slides** (H2, H3, H11): reorder `HERO_SLIDES` to `blue-cave`, `group`, `charter` (ids stay, so `SLIDE_PHOTOS` keeps each photo). New `sub` strings use template literals with `MAX_GUESTS` and `FOUNDING_YEAR`. The licence wording follows D11. The LCP preload follows `heroSlides[0]`: the Blue Cave photo becomes the LCP image, so re-check its contrast (`tests/visual/home-contrast.spec.ts`) and Lighthouse.
3. **Two CTAs** (H4): replace `ctaLabel/ctaHref` with a shared `HERO_CTAS = { primary: {label:'Browse group tours', href:'/tours/?type=group'}, secondary: {label:'Plan a private experience', href: charterUrl()} }`. Every slide shows both, so they're slide-independent: render them once, outside the slide loop. Fewer DOM nodes, no duplicate tab stops. Primary `Button variant="on-image" iconEnd="arrow-right"`, secondary `variant="on-image-ghost"`. At ≤768px: `flex-direction: column; width: 100%`.
4. **Dots** (H5) move into the content column after the CTAs (`justify-content: flex-start`). Keep the 24px hit area (WCAG 2.5.8) and the existing pause button logic.
5. **Rhythm** (H6): spacing via `margin-block-start` on each element (28/20/28/28, mobile 20/14/20/20). The scale has `--space-1…10`, but `--space-7` is 32px, so 28 and 14 aren't on it. Use hero-local custom properties (`--hero-gap-lg: 28px` etc. at the top of the component's style), as the boards' other one-off measurements do. Don't change the shared scale.
6. **Title** (H7): `HOME_PAGE_TITLE = 'Boat Tours from Split — Blue Cave & Island Hopping | Hello Blue Cave'`. Update `seo.test.ts`/`config.test.ts` expectations.
7. **Section order** (H8): move the Destinations `<section>` above Group/private in `index.astro`.
8. **Slider** (H9, H10), `PopularTours.astro`:
   - Delete the mouse-drag code (pointerdown/move/up, `is-dragging`, `dragstart`). Native scrolling covers trackpad and touch.
   - Move the arrows into the track wrapper: `position: absolute; top: 50%; translate: 0 -50%`, 44×44 white circles with a shadow token, `display: none` at ≤768px.
   - At the ends, use `disabled` + `opacity: 0` + `pointer-events: none` instead of `aria-disabled`. `disabled` takes a button out of the tab order natively, which is what the handoff asks for. **Focus guard:** if the button being disabled has focus, move focus to the other arrow first, so focus isn't dropped to `<body>` (WCAG 2.4.3).
   - Card count: every tour except Perfect Day (the "Build your own" card), in the catalog's "recommended" order, plus "See all". That's 6 tours (Blue Lagoon stays two), not the handoff's 5. Replace `getFeaturedTours()` with `getSliderTours()` in `src/lib/tours.ts`. **Keep the `featured` flag**: the "recommended" sort uses it (`tour-filters.ts:63`), and so do `cards.ts:89` and the legacy `_catalog.css`. Update `catalog.test.ts`.
   - Remove the `slider` variant from `TourCard.vue` (its only user is `PopularTours.astro:40`) and use `default`, so the slider cards get the shared hover (G3b).
9. **Reviews styles** (H11): restyle `.reviews__summary` with `--color-brand-dark` (blue-900) as the background and `--palette-blue-300` via a new `--color-text-on-brand-score` for the score (4.46:1, large text only, hence the name). Stars: `--color-star` is `#f59e0b`, and the handoff's `#EF9F27` is a different amber. As built: `--palette-amber-500` already is `#ef9f27`, so `--color-star-on-dark` points at it; `--color-star` is unchanged. Check the contrast (WCAG 1.4.11 isn't needed for decorative `aria-hidden` stars, but the white and light-blue text must reach 4.5:1). Still gated (D5).

Tests: `home-contrast.spec.ts` for the new first slide and overline. e2e: one H1 on `/` (`page.locator('h1')` count 1). Slider arrow keyboard test: Tab skips a disabled arrow, and focus moves when an arrow disables. Lighthouse mobile ≥ 99.

### PR 3: Tours, tour detail, Read more (`design/handoff-3-tours`) · ~1 day

1. **Destination dropdown** (T3), `TourFilters.vue`:
   - Add a `<label class="tour-filters__select">` pill with a native `<select>`. Keep it native: it's accessible and touch-friendly, and its value binds to `catalogState.destination`.
   - Options come from a new `TOUR_DESTINATION_OPTIONS` in `src/lib/tour-filters.ts`: `{ id, label, slugs: string[] }`. "Blue Cave & Vis" → `['blue-cave','vis']`, "Brač" → `['zlatni-rat']`, and so on. The filter matches if a tour's destinations intersect `slugs`.
   - Existing `?destination=<slug>` links (from destination pages) still work: parse a slug into the option that contains it.
   - Remove the "Hvar ×" chip, since the select shows the state now. Keep the "Clear" link in results.
   - Island budget: `island-size.test.ts` caps props at 7 KB. Pass options as a const imported in the island, not as props.
2. **Whole pill clickable** (T4): the select fills the pill (`position: absolute; inset: 0; appearance: none; opacity…` or padding that covers the pill). Icons are positioned on top with `pointer-events: none`. Rename the sort's "Recommended" to "Most popular" only if the order really reflects popularity. If not, keep "Recommended" and tell Ivan.
3. **Tour detail H2s** (D1):
   - Add fields to `TourDetail` (`src/types/tour.ts`): `seoHeadings?: { about?: string; itinerary?: string }`.
   - Defaults are computed in `src/lib/tour-display.ts`:
     - `About the ${shortName} tour`
     - `Tour itinerary — from Split to ${placeList}`, with `placeList` built from the tour's destinations via `Intl.ListFormat('en-GB', { type: 'conjunction' })`
     - "What's included in the tour"
     - "What's not included"
     - "Good to know before you go"
   - Add an "About" `SectionHeader` (id `about-heading`) above the intro. "… tour reviews" waits on D5.
   - Unit-test the generated headings per tour.
4. **Read more** (D5), Blue Cave first, data-driven: `TourDetail.introCollapsible?: boolean`, so the other four tours are a one-line data change after approval. Today the intro is a single `<p>` from `tour.overviewHighlights` (`TourDetailView.astro:85`). The new second paragraph needs a field: add `introMore?: string[]`, rendered as extra `<p>`s inside the same container. Its text uses `MAX_GUESTS` (14), not the handoff's 12, and it's filled in PR 6 from the sheet. Until then the Read more works with the existing text, and it only renders when the text is longer than the 4-line clamp: the script compares `scrollHeight` with `clientHeight` and leaves the button hidden otherwise.
   - Markup (Astro, no Vue island):
     ```html
     <div class="tour__intro" id="intro-body" data-collapsed>…all paragraphs…</div>
     <button type="button" class="tour__more" aria-expanded="false" aria-controls="intro-body">
       <span class="tour__more-label">Read more</span> <svg class="chevron" aria-hidden="true">…</svg>
     </button>
     ```
   - Collapsed: `max-height: calc(4lh)` (`lh` unit, with a `4 * 1.6em` fallback) and `mask-image: linear-gradient(to bottom, #000 25%, transparent)` over the last 3 lines. The button is centred over the fade with negative margin.
   - Expanded: remove the attribute and set `max-height: none`. The button moves below, gets the label "Show less" and the rotated chevron.
   - Underline on the label only (`.tour__more:hover .tour__more-label`).
   - Text stays in the DOM, so search engines index it. Don't use `hidden="until-found"`: it can't show a 4-line preview.
   - Without JS: `data-collapsed` is added by the script, so no-JS visitors see the full text and no button (`<button hidden>` until the script runs).
   - `prefers-reduced-motion`: no height transition.
5. **Departure line** (B1): remove the `departures.length === 1` line under the calendar in `GroupBookingFlow.vue`. The summary's "Departure" row already shows the time. Keep the check-in time: move it to the summary as `07:20 (check-in 07:05)`, since guests need it.
6. *(Half-day Morning/Afternoon choice: deferred, answer 3.)*

Tests: tour-filters unit tests (grouped option, legacy `?destination=vis`). e2e: the select filters the list. e2e: Read more toggles `aria-expanded`, and the text is present in the HTML before clicking. Island size test.

### PR 4: Destinations, About, Contact (`design/handoff-4-pages`) · ~1–1.5 days

1. **Grid** (X1): `DestinationsCatalog.vue` gets 3 columns, `≤1024px` 2, `≤640px` 1. Card photo height 180px in `DestinationCard.vue`.
2. **Destination set** (X2, X4):
   - Rename `zlatni-rat` to "Brač & Zlatni Rat". Keep the slug: renaming it would break links and need redirects for no SEO gain.
   - Add `'cave-nature'`.
   - Remove `split` from the destinations list: add its slug to a `REMOVED_DESTINATION_SLUGS` list with a `public/_redirects` entry `/destinations/split /destinations/ 301`, plus a sync test, mirroring `REMOVED_TOUR_SLUGS`.
   - References checked: `split` appears as a `nearby` stop in three destinations (`destinations.ts:326,437,485`). `nearby` isn't rendered (D-11), but `catalog.test.ts:72` requires every nearby slug to exist. Remove those three entries; they'd be dead data. No page links to `/destinations/split/` or `?destination=split`. The Tours dropdown never lists Split. Split isn't in the bento (no `bentoOrder`).
3. **Placeholders** (X3): Trogir and Korčula without a photo show the existing icon fallback (`DestinationCard` already has `ti-*`). Make sure the placeholder photos are removed rather than shown.
4. **About** (A1–A6):
   - Hero: reuse `PhotoHero.astro` (Tours/Destinations already use it) with `solidNav={false}`. Overline `Since ${FOUNDING_YEAR} · Split`.
   - Stats bar: reuse `TrustBand`. It already drops unconfirmed items, and it turns into a `Marquee` at **≤1040px**, not the handoff's 1000px. Keep 1040 so the homepage and About behave the same, and tell Ivan. `ABOUT.trustStats` has a different shape (`{icon, value, label, confirmed}`) from `TrustItem` (`{icon, strong, text, confirmed}`): map it in the page, not by changing either type. Items: "Licensed maritime operator" (needs `LICENCE_CONFIRMED`), `${years} years on the water` from `FOUNDING_YEAR`, and rating (D5). Today only the years item would show: check that a single-item band looks right, or hide the band below 2 items.
   - H2s from A3. Remove the crew section and its CSS, plus `ABOUT.crew` if nothing else uses it.
   - Timeline: in `Timeline.astro` `history`, draw the line with a pseudo-element from the first dot's centre to the last dot's centre (`top: calc(dot/2); bottom: calc(lastItemHeight - dot/2)`, simplest via per-item segments `li:not(:last-child)::after`). Container `max-width: 680px; margin-inline: 0`.
   - CTA band: the homepage's `CtaBand variant="photo"` with `on-image` + `on-image-ghost` buttons.
5. **Maps** (X8, C1): new `src/components/ui/MapLink.astro`:
   ```astro
   <a class="map-link" href={href} target="_blank" rel="noopener">
     <Image src={image} alt="" widths={[480, 960]} sizes="…" />   <!-- decorative: the caption names the place -->
     <span class="map-link__caption">{caption}<span class="sr-only"> (opens Google Maps in a new tab)</span></span>
     {attribution && <small class="map-link__credit">{attribution}</small>}
   </a>
   ```
   - The 80% scrim is a `::after` with a new `--color-overlay-map` token (no existing overlay token is 80%; the closest are `--color-overlay-band` and `--color-overlay-tile`).
   - Images in `src/assets/maps/{split,hvar}.jpg`, optimised at build time through `astro:assets`. Contact, About and destination detail are all `prerender = true` (checked), so the disabled `/_image` endpoint doesn't matter.
   - Contact caption: `${MEETING_POINT_LABEL} — open in Google Maps`, built from `src/config/site.ts`. **Not** "Marina Pier B · Old port", which is canvas template copy: the meeting point is Riva stand 14.
   - Which image: D7.

Tests: destinations unit tests (count 9, category membership). Tour counts are computed from `tourSlugs`, so the test asserts the computed numbers after PR 5. If they differ from Ivan's "Hvar 4, Pakleni 3, Brač 2", the data wins and the handoff gets corrected. Perfect Day is listed under several destinations and may be what makes the numbers differ. Redirect sync test. e2e: About has one H1 and three H2s in order. Axe on About/Contact with the photo hero (contrast on the scrim). Visual baselines.

### PR 5: Every tour group + private (`content/handoff-catalog`) · ~0.5 day

1. *(Dropped: the Blue Lagoon merge, its Morning/Afternoon labels and the legacy-slug alias. Blue Lagoon stays as two tours; answer 3.)*
2. *(Dropped, see 1.)*
3. *(Dropped, see 1.)*
4. **Every tour is group + private** (user ruling 2). The code already supports both types on one tour (Blue Cave and Golden Horn work this way), so this is mostly data plus a few labels:
   - `tour-catalog.ts`:
     - `types: ['group', 'private']` on Red Rocks (`hvar-red-rocks-pakleni`), Split–Dubrovnik (`dubrovnik-one-way`) and both Blue Lagoon tours (`blue-lagoon-morning`, `blue-lagoon-afternoon`).
     - Perfect Day stays `['private']` (D4c).
     - Remove "private" from Red Rocks' description ("This private full-day…"). Fix any other copy that says private-only.
   - Group departures and prices for Red Rocks and Dubrovnik come from D4b. Until then `prices: null` and `departures: []`. The tour page shows "Price on request", the group button goes to the contact form (existing `supportsInstantBook` path), and the private button stays (PR 1 item 7 is a **prerequisite**: without it these two tours lose their private option). The group booking page isn't built for them (`group.astro` filters on `supportsInstantBook`), and `/book/<slug>/group/` stays a 404 until prices exist. Nothing links there, since the CTA logic is the same check.
   - Each tour's private meeting point and departure stay as in the operator data. `tour-display.ts:69-70` already shows Riva or Zenta for the private option.
   - **Tours filter: chips stay** (answer 4), and so does the filter logic. One label fix: the `private` filter matches `types.includes('private')`, so after this PR it shows **every** tour, and the label "Private only" becomes untrue. Rename it to "Private" in `TourFilters.vue:23` and `KitChips.vue:9`; the behaviour doesn't change. "Group" still hides only Perfect Day.
   - **Copy:**
     - FAQ "Do you offer private tours?" (`faq.ts:57`): "Most of our tours" → "Every tour can also be booked privately…".
     - Hero tag "Private available" now shows on every tour (`TourDetailView.astro:39`): fine as is.
     - JSON-LD `touristType` (`seo.ts:102`) becomes `['Group tour', 'Private tour']` when the tour has both.
   - **Tests:**
     - `catalog.test.ts`: every tour except Perfect Day has both types.
     - `prices.test.ts`: `PRICE_LIST` still names exactly the instant-book prices. It grows when D4b lands.
     - e2e: the Red Rocks page shows both the group and the private CTA.
5. Perfect Day: rendered as the "Build your own" card. `ToursCatalog.vue` puts it last regardless of sort, with private-card styling (reuse the gradient from `.type-cards__card--private` via a token, not a copied value).
6. Contact-form tour list and `DEFAULT_CHARTER_TOUR` (D8) follow the handoff's private route order.
7. Destination `tourSlugs`: unchanged (Blue Lagoon stays two tours). The counts are computed (see PR 4 tests). Ivan's numbers are a check, not a target.

### PR 6: Content from the sheets (`content/handoff-sheets`) · ~0.5–1 day, after D6

Itineraries, included and not-included lists, "Pre-season route" under Good to know, the Blue Cave second paragraph (with `MAX_GUESTS`), destination copy, SEO titles and descriptions, highlights, insider tips, and getting-there facts. Same process as the 18 Oct sheets:
- The sheet wins for wording, unless it contradicts operator facts. List each contradiction for you.
- Yellow (missing) cells keep the current text.
- Green (drafted) cells are applied and listed in the PR description for operator sign-off.
- Hvar distance: keep "~1–1.5 h" unless the operator confirms otherwise.

### PR 7 (optional): Titles and meta descriptions

Every page already has both. If you want keyword-led titles everywhere, change `pageTitle()` segments only. Add a unit test that every prerendered page has a title ≤ 60 characters and a description of 70–160, enforced in `seo.test.ts`.

### Language switcher (separate project, only after D1)

Outline for when translations exist:
- `i18n: { locales: ['en','hr','de','it','fr'], defaultLocale: 'en', routing: { prefixDefaultLocale: false } }` in `astro.config.mjs`.
- `src/pages/[locale]/…` or per-locale folders.
- `getRelativeLocaleUrl()` for the switcher links.
- `@astrojs/sitemap` `i18n: { defaultLocale, locales }` for `hreflang` alternates.
- `<link rel="alternate" hreflang>` in `BaseLayout`.
- The switcher follows the WAI-ARIA APG **disclosure** pattern, not `role="menu"`: a `<button aria-expanded aria-controls>` and a list of `<a lang hreflang>` links. It closes on Escape (focus returns to the button), on focus leaving, and on outside click.
- White on photo headers via the existing `.on-photo` class.
- The globe icon is an inline SVG or added to the Tabler subset (`pnpm icons` needs network).
- Legal pages need lawyer-approved translations.

---

## 4. Standards checked against official docs

- **Astro i18n** ([docs](https://docs.astro.build/en/guides/internationalization/)): option names `locales`, `defaultLocale`, `routing.prefixDefaultLocale` (default `false`), `fallback`, and helpers `getRelativeLocaleUrl()` and `Astro.currentLocale` (works on prerendered pages).
- **@astrojs/sitemap i18n** ([docs](https://docs.astro.build/en/guides/integrations-guide/sitemap/)): `i18n.defaultLocale` must be a key of `i18n.locales`. It emits `xhtml:link hreflang` per URL.
- **Disclosure pattern** ([WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/)): button with `aria-expanded` and `aria-controls`. Escape closes and returns focus. Closing when focus leaves is needed for WCAG 1.4.13. Don't use `role="menu"` for site navigation.
- **`(hover: none)` / `(hover: hover)`** ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover)): `hover` tests the primary input. Gate decorative hover effects behind `(hover: hover)`, and never put essential content behind hover.
- **`hidden="until-found"`** ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/hidden)): reveals on find-in-page or fragment navigation with `beforematch`. It can't show a partial preview, so Read more uses a max-height and mask instead. `base.css:18` already exempts `until-found` from the global `[hidden]` rule.
- **OSM tile policy** ([OSMF](https://operations.osmfoundation.org/policies/tiles/)): bulk or offline download from `tile.openstreetmap.org` isn't allowed, and attribution must be visible on the map. That's why D7 asks for a provider whose terms allow stored static images.
- **Google Maps Platform terms** ([service terms](https://cloud.google.com/maps-platform/terms/maps-service-terms/index-20240522)): caching rules are per service. I couldn't confirm that the Static Maps API allows storing an image. Treat it as not allowed until it's checked.
- **CSP** (`src/config/security-headers.ts`): `img-src 'self' data:` and `frame-src` Turnstile only. Map images must be self-hosted. An embed would need a CSP change and a privacy-policy change.
- **Repo conventions** (from the code): CSS in `@layer components|pages`; colours only via tokens (`pnpm tokens`); Tabler icons must be in the subset (`pnpm check`); island props budget 7 KB; retired slugs go in `REMOVED_*_SLUGS` + `public/_redirects` + a sync test; owner-unconfirmed claims are gated by flags (`LICENCE_CONFIRMED`, `REVIEWS.source`, `confirmed`).

---

## 5. Refinement pass (what changed after reviewing the first draft)

1. **Hero CTAs render once, outside the slide loop.** The first draft duplicated them per slide. Since both CTAs are the same on every slide, duplicates would add 4 hidden tab stops and extra DOM for nothing.
2. **Slider arrows use `disabled` plus a focus guard,** not `tabindex="-1"`. `disabled` is the native way to leave the tab order. The guard stops focus falling to `<body>` when an arrow disables itself while focused.
3. **Read more no longer uses `hidden="until-found"`.** It can't do a 4-line preview. A mask with `max-height` keeps the text in the DOM, and no-JS visitors see the full intro.
4. ~~Blue Lagoon merge~~: superseded. The merge is off (answer 3).
5. **`zlatni-rat` keeps its slug** (the first draft renamed it to `brac`): a display-name change needs no redirect.
6. **Token names checked against `src/styles/tokens/`.** Three handoff colours aren't the site's existing tokens: success is blue today, star amber differs, and the crown orange is 500 rather than the CTA's 600. Each gets a new token instead of an edited one, so nothing else changes colour. The 28/14px rhythm isn't on the spacing scale.
7. **Contact map caption comes from `MEETING_POINT_LABEL`.** The handoff's "Marina Pier B · Old port" is canvas template copy and wrong for this business.
8. **The language switcher is its own project.** The first draft folded it into PR 1. Without translations it would be a dead control, and it removes the header's main CTA (D10).
9. **Removed "remove Sunset Bay", footer and "sunset runs" work.** Already done or never existed (R1, R2, T7).
10. **Meta descriptions moved from "required" to optional PR 7,** after confirming every page already has a title and description.

### Second check (20 Oct, after the "every tour group + private" ruling)

I re-checked every claim in this plan against the code and found and fixed these:

1. **The private button would have disappeared** on Red Rocks and Dubrovnik. `tourCtas()` only offers it on instantly bookable group tours. Fixed as PR 1 item 7, a prerequisite for PR 5.
2. **The breadcrumb is built twice** (visible list + JSON-LD in `pages/tours/[slug].astro`). The first plan only updated one. Now one shared helper.
3. **`featured` can't be dropped**: the "recommended" sort uses it.
4. **Removing Split broke a test** (`catalog.test.ts` checks nearby slugs exist). The three dead nearby entries are now removed too.
5. ~~Blue Lagoon merge safety (legacy-slug alias)~~: no longer needed, since the merge is off (answer 3). Note for later: if the merge comes back, emails (`getTourBySlug`) and the admin manifest (`slug|slot` key) need the alias.
6. ~~"Browse group tours" → `/tours/`~~: reverted. The chips stay, so it keeps `?type=group`.
7. ~~Departure labels in PR 5~~: dropped with the merge.
12. **"Private only" label:** once every tour has a private option, that filter shows every tour, so the label is renamed to "Private" (no behaviour change).
8. **About stats breakpoint** is 1040px in the shared band, not 1000. Kept for consistency. The data shapes differ, so the page maps them, and a single-item band is checked.
9. **Read more** needs a data field for the second paragraph, and only shows when the text actually overflows.
10. **The crown hover** uses a fixed 30px box, so the label doesn't shift, and it works on keyboard focus too.
11. **Tour counts** are computed from the data, not forced to Ivan's numbers.

## 6. Out of scope

Astro 7 upgrade (separate, open from the 20 Oct review), payments, private booking page (PR 8 / D-8), Glorich font swap, location photos from FigJam, and archived homepage versions (handoff "Page 2").
