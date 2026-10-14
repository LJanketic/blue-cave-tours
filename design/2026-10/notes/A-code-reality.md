# Review A: spec vs code reality

Spec: `docs/redesign/07-IMPLEMENTATION-SPEC.md` @ 882dbc3. Read-only review. Every item was checked against the repo unless marked **(uncertain)**. Paths are relative to the repo root.

## Findings

1. **BLOCKER: §8.1.6 Cleanup / §10 S-12 (drafts cleanup uses "Clear all")**
   - **Problem.** The spec says expired drafts get deleted "lazily on read and by the existing admin tools ('Clear all')". "Clear all" is `clearAllData()`, which deletes every booking, enquiry and email: `src/pages/admin/tools.astro:15-22`, flash text "All bookings, enquiries and emails deleted." It can't be a routine cleanup. Drafts also hold PII (name, email, phone, notes), and a draft nobody reads again is never deleted. Netlify Blobs has no native TTL; the store only offers get/put/list/delete (`src/lib/bookings/store.ts`).
   - **Fix.** Replace the Cleanup row with: "Netlify Blobs has no TTL. Drafts carry `expiresAt`. A read after expiry deletes the draft and returns 404. Every `POST /api/bookings/draft` also lists the `drafts` store and deletes up to 20 expired drafts (opportunistic sweep). The admin Tools page gets a separate 'Delete expired drafts' action. 'Clear all' also empties `drafts`, but it is never the cleanup mechanism. Register `drafts` through `collection()` in `store.ts` so it gets `scopedName()` per deploy context."

2. **MAJOR: §8.1.6 / §8.1.2 (the draft endpoint returns both 303 and JSON)**
   - **Problem.** "Responds 303 → review … or 400 with field errors (JSON for the island)" mixes two transports. If the island calls `fetch()`, the browser follows the 303 itself: it GETs the server-rendered review page (an extra paid function call) and returns HTML the island doesn't use. The island would then have to read `response.url` to navigate.
   - **Fix.** Pick one: "The island `fetch`es JSON. Success is `201 {reviewUrl}` and the island sets `location.assign(reviewUrl)`. Failure is `400 {error, fields}`." Optionally add: "A form-encoded no-JS post gets a 303." Astro `checkOrigin` only checks form content types, so a JSON endpoint relies on its own validation and rate limit. That is fine because there is no auth.

3. **MAJOR: §8.1.6 `POST /api/bookings` (error path and draft lifetime)**
   - **Problem 1.** On a validation failure, today's endpoint redirects back to review with all PII in the query string: `src/pages/api/bookings.ts:38-40` (`bookingReviewPath(tour.slug, {...back, error})`). The `/booking/error/?tourId=` fallback is at line 44. The spec only covers the step-2 → review GET.
   - **Problem 2.** "then deletes the draft" breaks Back from `/booking/pay/`: the review page would 404.
   - **Fix.** "On error, redirect to `/book/{slug}/review/?draft={id}&error={code}`. Never echo form fields. Keep the draft until it expires. Mark it `consumedBy: bookingId` so a second submit redirects to the existing booking's pay page instead of creating a duplicate."

4. **MAJOR: §9.1 / D-16 (departures and "≥1 departure" test)**
   - **Problem.** `blue-lagoon-afternoon` is bookable (`fromPrice '€75'`, `types ['group']`), but its departure is "Afternoon departure, exact time confirmed at booking": `src/data/tour-catalog.ts:218`. So "populated from the catalog's real times (one slot each today)" is false. The planned test "every bookable tour has … ≥1 departure" plus server validation `slot ∈ departures` would force an invented time or make the tour unbookable.
   - **Context.** Today an empty slot is allowed (`service.ts:83` `slot: input.slot ?? ''`). Downstream code already handles TBC: `dates.ts:24-28` `departureHasLeft` and `templates.ts:145` "To be confirmed".
   - **Fix.** "`departures` may be empty, meaning time TBC. The server accepts `slot === ''` only when `departures` is empty, otherwise `slot ∈ departures`. The test asserts that every bookable tour has either ≥1 departure or an explicit `departureTbc: true`."

5. **MAJOR: §9.1 (migration list misses several consumers of `fromPrice`, `priceNotes`, `featured` and `departure`)**
   - **Problem.** These consumers are not in the spec's list:
     - `src/lib/seo.ts:89` (`tourJsonLd` offer price via `parseAdultPrice(tour.fromPrice)`)
     - `src/lib/tour-filters.ts:51-52,71` (price sort; `featured` sort)
     - `src/lib/booking.ts:17-28` (`supportsInstantBook` and `tourPriceUnit` take `fromPrice`) and `booking.test.ts:78-87`
     - `src/lib/admin/sample-data.ts:135-136` (regex on `tour.departure`; `computeBookingTotal(tour.fromPrice, tour.priceNotes…)`)
     - `GroupBookingFlow.vue:41` (departure regex) and `:126-151`
     - `review.astro:56-80`
     - `price.test.ts:32-33`
     - `featured` in `tours.ts:22`, `TourDetailView.astro:31`, `destinations/[slug].astro:275`, `index.astro` (`TourCard featured={tour.featured}`)
   - **Context.** Itinerary is low risk: `tour.itinerary` is used only in `TourDetailView.astro:114`. Emails, admin and JSON-LD don't use it.
   - **Fix.** Add a "Consumers to migrate" list with the files above. Define `getFeaturedTours()` and the "Most popular" sort in terms of the new `badge === 'bestseller'` (or keep a separate `featured: boolean` for ordering and use `badge` only for display). Also note that `featured: true` sits on `create-perfect-day-private` (`tour-catalog.ts:316`), so a "Best seller" badge on a quote-only charter is an unverified claim (§2.2).

6. **MAJOR: §12 / PR 0 (admin freeze is not achievable as described)**
   - **Problem 1.** `AdminLayout.astro` renders through `BaseLayout.astro`, which always imports `global.css` (`BaseLayout.astro:2-3`). The admin will keep receiving public CSS whatever `admin.css` contains.
   - **Problem 2.** The admin reads public **tokens** that PR 1 changes:
     - `--color-accent-teal`: 8 uses in admin files (`AdminLayout.astro:269,511,546,640`, `admin/index.astro:398,411`, `bookings/[id].astro:496`, `DepartureCard.astro:182`)
     - `--badge-*` (`AdminLayout.astro:197,469`)
     - `--color-text-tertiary`, which changes from gray-550 to gray-500
     - `--page-gutter`, the body font size, and the `:focus-visible` colour
     - `.nav.nav-solid`, `.nav-logo`, `.nav-link`, `.filter-chip`, `.btn-*`, `.nf-icon`, `.section-label`, `.highlight-box`, `.warn-box`
   - **Consequence.** "Teal → blue everywhere through aliases" in PR 1 recolours the admin and breaks the "admin pixel-identical" acceptance.
   - **Fix.** "PR 0: add an `AdminBaseLayout` (or a `BaseLayout` prop `styles: 'site' | 'admin'`) that imports `admin.css` + `icons.css` instead of `global.css`. `admin.css` carries a frozen copy of the current `redesign.css` token values under `.admin { … }` plus the public classes it uses."

7. **MAJOR: §3.1 (cascade layers during migration)**
   - **Problem.** Unlayered CSS beats every layered rule regardless of specificity. While `modules/_*.css` stay unlayered (they're only deleted page by page), every new rule in `@layer components/pages` loses to legacy rules on shared generic classes (`.card`, `.section-title`, `.btn-primary`, `.page`, `.tour-card`…). Existing Vue `<style scoped>` blocks (5 SFCs) are unlayered too.
   - **Ordering risk (uncertain).** Astro may emit component CSS chunks before `global.css` on some pages. The layer order is fixed by the first `@layer` statement the browser sees, so a component chunk that arrives first silently reorders the layers.
   - **Fix.** "PR 1 imports every legacy module as `@import './modules/_x.css' layer(legacy);` with order `@layer legacy, tokens, base, components, pages, utilities;`. The order statement is emitted first in `<head>` (an inline `<style is:inline>@layer …;</style>` in `BaseLayout` before any stylesheet). Vue `<style scoped>` wraps its rules in `@layer components {}`. Verify with a build that Vue's scoped transform rewrites selectors inside `@layer` (uncertain; test it in PR 1)."

8. **MAJOR: §6.1.2 / §3.4 (`<Picture>` inside `HeroCarousel.vue`)**
   - **Problem 1.** "Each slide has its own photo (`<Picture>`; slide 1 eager + preload, slides 2–3 lazy)". `<Picture>` is an Astro component and cannot render inside a Vue island. Today the single hero image is rendered by Astro outside the island (`index.astro:84-103`), and `HeroCarousel.vue` has no images.
   - **Problem 2.** `loading="lazy"` does not defer full-bleed stacked slides that sit inside the viewport at opacity 0. The browser loads them straight away.
   - **Fix.** "`index.astro` computes each slide's srcset with `getImage()` (as it already does for `heroSrcset`) and passes `{src, srcset, alt, position}` to the island. Slide 1 renders `<img fetchpriority=high>`. Slides 2–3 render without `src`/`srcset` and the island sets them on `onMounted` + `requestIdleCallback`, or one slide before display."

9. **MAJOR: §3.2 / §6.1 / §6.5 (`TourCard.vue` and images)**
   - **Feasibility.** Rendering a Vue SFC without a `client:` directive from Astro, and importing it in `ToursCatalog.vue`, works.
   - **Problem 1.** Today's `TourCard.astro` uses `TourImage.astro`, which uses `astro:assets` `<Image>` (`TourImage.astro:2,31`). A Vue component can't use that. Every page that uses `TourCard.vue` must pass a precomputed photo DTO, as `tours/index.astro:17` does with `toGalleryView`.
   - **Problem 2.** The spec misses the third copy of tour-card markup in `destinations/[slug].astro:255-280` (`tc-head`/`tc-thumb`/`tc-tag--featured`).
   - **Fix.** Add: "`TourCard.vue` takes `photo: {src?, srcset?, alt, color}`. Callers precompute it with `toGalleryView(getTourCardPhoto(t), 'sailboat', GALLERY_CARD_SIZE)`. Replace the card markup in `destinations/[slug].astro:255-280` too."

10. **MAJOR: §6.2 row 3 / §3.5 (slim DTO breaks `?q=` and filters)**
    - **Problem.** The DTO (slug, title, price, unit, duration, badge, types, tags, destinationSlugs, photo) lacks fields the filter code reads:
      - `searchTours` needs `shortDescription` and `tagline` (`tour-filters.ts:85-94`)
      - `isShortTour` needs `itineraryKind`, `slug` and `tagline`
      - `isSunsetTour` needs `shortDescription`
      - all of `tour-filters.ts` is typed on `TourDetail`
    - **Fix.** "Add `searchText` (title + tagline + shortDescription, lower-cased) and `durationHours` to the DTO. Retype `tour-filters.ts` on the DTO. Half day = `durationHours ≤ 6` or `tags` contains `half-day`."

11. **MAJOR: §8.2 (`/private-charter/` vs the existing tour `create-perfect-day-private`)**
    - **Problem 1.** The spec doesn't say what happens to `/tours/create-perfect-day-private/`, a live, indexed private-charter tour page:
      - the Footer links to it (`Footer.astro:27`)
      - FAQ links to it (`faq.ts:124`)
      - five destinations list it in `tourSlugs` (`destinations.ts:104,151,203,255,357`)
      - `featured: true`
    - Two charter landing pages compete for the same query, and the tour page's primary CTA will still be "Enquire" → `/contact/`.
    - **Problem 2.** The CTA rewiring list is incomplete. Uses of `/contact/?tour=create-perfect-day-private` that the spec doesn't name:
      - `index.astro:64,209,244`
      - `destinations/[slug].astro:335`
      - `about/index.astro:120`
      - `faq.ts:131`
      - `TourDetailView.astro:228` (`contactHrefForTour` secondary CTA)
      - `contactHrefForTour` in `TourCard.astro:18`, `review.astro:35` and `booking.test.ts:71`
    - **Fix.** "Decision: either (a) 301 `/tours/create-perfect-day-private/` → `/private-charter/`, drop it from `tours`, `destinations.tourSlugs`, `REMOVED_TOUR_SLUGS` and `_redirects` (`catalog.test.ts` keeps them in sync) and the sitemap; or (b) keep it and make its primary CTA `/private-charter/?tour=…`. Rewire every reference listed above."

12. **MAJOR: §0.2 (`netlify.toml` ignore rule)**
    - **Problem.** "Add `design/` to the `ignore` rule … so edits there don't trigger deploys" is backwards. The ignore command is an **allow-list** of paths that DO trigger a build (`netlify.toml:13`: `-- src public scripts package.json …`). `design/` is already ignored; adding it would make design edits trigger paid builds.
    - **Fix.** "No `netlify.toml` change is needed: `design/` is outside the build allow-list."

13. **MAJOR: §9.4 (record back-compat beyond `Booking.infants`)**
    - **Problem 1.** `Enquiry.kind` is declared required, but stored enquiries have none (`store.ts:72-82`).
    - **Problem 2.** `infants` and line items must be added in many places:
      - seat sums: `manifest.ts:54,88-89`, `admin/bookings/index.astro:71`, `sample-data.ts:84`, `bookings/[id].astro:123`
      - the CSV export (`csv.ts:24`)
      - `guestSummaryFromCounts` (emails, admin, `DepartureCard`)
      - `MAX_GUESTS` checks in `hasRequiredBookingDetails`, `createPendingBooking`, `parseGroupBookingParams` and `bump`
    - **Problem 3.** The store is generic: there's no per-type read hook to do "derived on read".
    - **Fix.** "Add `normalizeBooking()` / `normalizeEnquiry()` applied in `bookings()` / `enquiries()` get and list (`infants ?? 0`, `kind ?? 'contact'`). Add a helper `seatCount(b) = adults + children + infants` and replace every `adults + children` sum (list the files). Add a CSV 'Infants' column."

14. **MINOR: §10 S-1 / §8.1.2 (hold note location).** Verified: `GroupBookingFlow.vue:383-386` is the "held for 12 minutes" note. `/booking/error` already says "We don't hold seats until you pay" (`booking/error.astro:87`). No "8 minutes" text exists in the code; that is design-only. **Fix:** none needed. Optionally state that the error-page line already exists.

15. **MINOR: §7.14 (NotFoundPanel).** The claim is correct (only use is `tours/[slug].astro:57`, unreachable because `getStaticPaths` only emits real slugs), but it references **8** undefined tokens, not 7: `--content-form`, `--page-padding-y`, `--page-padding-x`, `--font-display`, `--text-2xl`, `--font-weight-bold`, `--color-nav`, `--color-muted`. Also, `.nf-icon` (404 and 4 admin pages) is a separate `_base.css:527` class, not part of NotFoundPanel. It must survive the cleanup (admin freeze). **Fix:** "8 undefined tokens. Keep `.nf-icon` (used by `404.astro:16` and admin empty states) or move it into `admin.css`."

16. **MINOR: §14 / §18.1 (test count).** `vitest run` gives **94 tests in 10 files**, not 83. **Fix:** "extend the existing 94 tests".

17. **MINOR: §14 Robots / §2.9 (robots test).** `noindex.test.ts` discovers `prerender = false` routes automatically (`noindex.test.ts:9-17`) and `/api/` already covers both new endpoints, so "Add a test for the draft route" needs no new test. `links.test.ts` ROUTES (`links.test.ts:9`) doesn't include `private-charter`, so a slash-less `/private-charter` link wouldn't be caught. **Fix:** "Add `private-charter` to `ROUTES` in `links.test.ts`."

18. **MINOR: §4.6 (aliases).**
    - `--border-radius-md/-lg` have 0 uses outside the token file. Delete them now instead of aliasing.
    - `--color-accent-teal` has 30 uses (not 29), 8 of them in admin (see #6).
    - `--palette-gray-500 #999` is unused (correct).
    - `--color-brand` (used in §5.1 "`ti-sailboat` in `--color-brand`") is not defined in §4.2. **Fix:** use `--color-text-brand` or `--color-accent`, or add `--color-brand`.

19. **MINOR: §4.5 (line references).** The focus rule is at `global.css:22-25` (not :21). The `_base.css` rule is at `:71-74` (not 72-75). It uses `--color-border-info`, not teal, so the two current rules conflict.

20. **MINOR: §5.1 (header class name).** The spec says `is-solid`. The code uses `.nav-solid` (`Header.astro:170`), and admin hard-codes `class="nav nav-solid admin-header"` (`AdminLayout.astro`). Renaming breaks admin unless #6 is done first. Hide-on-scroll applies to **all** headers including solid ones (`Header.astro:174`) and is neutralised under reduced motion via CSS (`_base.css:233-240`). That part is correct.

21. **MINOR: §5.4 (`fontPreload`).** "`SiteLayout.astro`: unchanged API" contradicts adding `fontPreload` to `BaseLayout`. Pages render through `SiteLayout`, which must pass the prop through (`SiteLayout.astro:34-42`). Preloading the woff2 itself is feasible: same pattern as the icon font (`?url` import + `<link rel=preload … crossorigin>`, `BaseLayout.astro:4,73`). **Fix:** "`SiteLayout` gains a pass-through `fontPreload` prop."

22. **MINOR: §3.3 / D-4 (Glorich).** Verified: commit `eeef9ff` added only `Glorich-Bold/Light/Medium.ttf` under `public/fonts/glorich/`, and `2ec4cab` removed them. Only Bold exists for 700, which is fine. `subset-font` is already a devDependency (`package.json`) and is used by `scripts/icons.mjs:89-102`, so woff2 subsetting is feasible with no new dependency. **Fix:** "Recover with `git show eeef9ff:public/fonts/glorich/Glorich-Bold.ttf`; add `scripts/fonts.mjs` reusing `subset-font` (`targetFormat: 'woff2'`)."

23. **MINOR: §7.10 / §1 (legal figures from config).** `src/config/cancellation.ts` holds only prose strings: `CANCELLATION_WINDOW = '48 hours'`, and "4 hours" is embedded inside `CANCELLATION_WEATHER`. No numeric constants exist, and the file's own header admits legal pages aren't wired to it. **Fix:** "Add `CANCELLATION_HOURS = 48` and `WEATHER_NOTICE_HOURS = 4` and derive all strings from them."

24. **MINOR: §7.10 (privacy fixes).** Verified that `legal/privacy.astro:100` lists "Google Analytics" and `:53` says "essential cookies only". The spec's content fix is warranted.

25. **MINOR: §2.8 / §13 (email brand colour).** Email templates hard-code teal `#1d9e75` (e.g. `templates.ts:254`), and `SITE_THEME_COLOR = '#1d9e75'` (`site.ts:26`). The spec allows hex in emails but never says to re-brand them. Emails will stay teal after PR 9. **Fix:** add to PR 7 or PR 9: "update email template accent hex to `#1a6fc4` / `#0c447c`".

26. **MINOR: §8.1.2 (calendar "today").** `GroupBookingFlow` builds days from local `Date` objects (`:56`, `:71-104`), and `group.astro:27` sets `renderedOn = toIsoDate(new Date())` at **build** time. `businessDate()` (`dates.ts:5`) is client-safe (Intl only). The sessionStorage restore fits the existing pattern: the restore runs in `onMounted` after `syncToday()` (`:285-288`), so the hydration guard is unaffected. Feasible as specified. Note that `renderedOn` should also use `businessDate()`.

27. **MINOR: §8.2 (`?tour` prefill on a prerendered page).** `/private-charter/` is prerendered, so `?tour` can only be read client-side in the island's `onMounted` (the `ToursCatalog` `readUrlParams` pattern, `ToursCatalog.vue:130-146`). The spec should say so. The `_redirects` target `/private-charter/?tour=:slug 301` is valid: the current rule already uses the same placeholder-in-query form (`public/_redirects:15`). Private-only `dubrovnik-one-way` would get the "Book as private charter" CTA (§6.3.4), but it's a one-way transfer with no matching charter route. **Fix:** "Unknown `?tour` values fall back to 'Your own route'. Exclude `dubrovnik-one-way` from the charter CTA, or map it."

28. **MINOR: §8.2 (indexable page with checkout chrome).** The page is "prerendered, indexable: it doubles as the charter landing page", but it uses `MiniNav` + `TrustStrip`, i.e. `SiteLayout checkout` with no header or footer (`SiteLayout.astro:44-47`). An SEO landing page without site navigation is weak. "Exit → previous page" needs JS or a referrer. **Fix:** "Use the normal solid header and footer, or make the page noindex and keep a separate landing section."

29. **MINOR: PR 2 (dev-only `/dev/kit/` page).** Astro has no dev-only page flag. Any file in `src/pages` is built. **Fix:** "Inject the route with `injectRoute` from an integration only when `command === 'dev'`, or keep the kit in `src/pages/dev/kit.astro` guarded by `if (import.meta.env.PROD) return new Response(null, {status: 404})` with `prerender = false`, then add `/dev` to `ROBOTS_DISALLOW` and `NOINDEX_PATH_PREFIXES`." The injected-route option is cleaner.

30. **MINOR: §15 (branching).** `feat/booking-showcase-mock` is already fully contained in `feat/email-map-link-overbooking`: `git log HEAD..feat/booking-showcase-mock` is empty, and HEAD is 1 commit ahead. HEAD is 8 commits ahead of `main` (correct). **Fix:** "Step 1: merge `feat/email-map-link-overbooking` into `main`."

31. **MINOR: §6.3.2 / §11.6 (native `<dialog>` in a Vue island).** Feasible. SSR emits a closed `<dialog>`, `showModal()` runs only on interaction, and it doesn't cause hydration mismatch. Watch two points:
    - Vue `<Transition>` on `<dialog>` needs `showModal()`/`close()` driven manually.
    - The legacy `html { overflow-x: hidden }` (`_base.css:10`) and the `scroll-padding-top` interplay with body scroll lock.

    No change needed beyond "close on `cancel` event and restore focus manually (Safari < 17 doesn't always restore focus)". The Safari detail is uncertain.

32. **MINOR: §3.4 (hero LCP).** "as today": today's preload uses `getImage` + `<link rel=preload imagesrcset>` (`index.astro:33-43,69-77`). Keep that mechanism with the island approach in #8.

## Verified correct (no action)

- These functions and constants all exist as named: `parseGroupBookingParams` (`booking.ts:93`), `createPendingBooking` (`service.ts:52`), `computeBookingTotal` (`price.ts:25`), `getFeaturedTours` (`tours.ts:21`), `toGalleryView` (`tour-photos.ts:130`), `businessDate` (`dates.ts:5`), `meetingPointShort` (`booking.ts:148`), `CANCELLATION_SHORT/WINDOW/FULL/WEATHER`, `recordEnquiry` (`service.ts:267`), `supportsInstantBook` (`booking.ts:17`).
- `ToursCatalog` accepts `?type=half-day` (`ToursCatalog.vue:138`), plus `?destination=` and `?q=`.
- `ToursCatalog.vue` and `HeroCarousel.vue` have no `<style>`.
- Highlights repeats `included` (`TourDetailView.astro:94-98`).
- CSP matches §10 S-8 (`netlify.toml:33`, including Turnstile).
- The `middleware.ts` comment about `netlify.toml` headers not reaching function responses exists. The middleware sets only Cache-Control/X-Robots-Tag, so S-7 is a real gap to check.
- `about` `data-scroll-region` exists (`about/index.astro:62,99`).
- 7 tours, 4 instantly bookable.
- Tabler is pinned at 3.44.0 (`icons.mjs:20`).
- About year is 2016 (`about.ts:38`).
