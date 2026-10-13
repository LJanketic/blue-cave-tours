# Review D: plan quality and actionability of 07-IMPLEMENTATION-SPEC.md

Reviewer scope: contradictions, ambiguity, sequencing, estimates, missing work, structure. Read-only. Each finding was checked against the repo at 882dbc3 unless noted.

Severity: **major** = an implementer will build the wrong thing, get blocked, or break something. **minor** = friction or a small inconsistency.

---

## A. Sequencing and dependency errors (§15)

### 1. [major] §15 PR 3 vs §9.1/§9.2: the homepage needs data that only lands in PR 4 and PR 5
**Issue.** PR 3 (homepage) builds the slider with `TourCard`. Per §6.2, that card needs `durationShort`, a numeric `adultPrice`, `priceUnit` and `badge`. §6.1.6 needs `{minGroupPrice}` from the numeric prices. The bento (§6.1.7) needs `tagline`/`bentoOrder` (§9.2). All of that data migration is assigned to PR 4 (§9.1) and PR 5 (§9.2). PR 2's `TourCard.vue` also can't be finished without `durationShort`. As written, PR 2 and PR 3 either stub fields or do PR 4's migration early.
**Fix text** (insert a new row before PR 2 and renumber the dependencies):
> | **1b Data model** | §9.1 and §9.2 field migrations only (types, `tour-catalog.ts`, `destinations.ts`, `marketing.ts`, `season.ts`, `site.ts` additions: `FOUNDING_YEAR`, `REPLY_TIME`, `OFFICE_HOURS = null`), migration tests in `catalog.test.ts`/`price.test.ts`. No UI change, except that existing components read the new fields where the old ones are removed. | 0 | 1–1.5 d | `pnpm test` green; the old regex parsers survive only as migration tests |
>
> PR 2, 3, 4 and 5 then depend on 1b. Remove "data migration §9.1" from PR 4 and "§9.2" from PR 5.

### 2. [major] §12 / §15 PR 0, PR 1, PR 9, PR 10: the admin "freeze" doesn't actually freeze, and PR 9 breaks the admin before PR 10 re-skins it
**Issue.** `AdminLayout.astro` (807 lines, about 695 of them `<style is:global>`) references the tokens that PR 1 changes and PR 9 deletes: `--color-accent-teal` ×7, `--badge-*` ×8, `--color-text-warning` (amber-400 → amber-700), `--page-gutter` (20 → 24px), `--color-text-tertiary`, `--radius-md/-lg`. §12 only copies the public *classes* into `admin.css`. So:
- PR 1 recolours the admin (teal → blue) through the aliases, which contradicts "PR 0 freezes its current look".
- PR 9 removes the aliases and the teal palette while PR 10 hasn't run yet, so the admin loses its accent colours and badges.
**Fix text** (§12, PR 0 bullet; append):
> The freeze covers tokens too. `admin.css` declares its own `--a-*` custom properties with the **resolved current values** (e.g. `--a-accent: #1d9e75`, `--a-text-tertiary: #696969`, `--a-gutter: 20px`), scoped to `.admin`. Neither `AdminLayout.astro` nor `admin.css` references any public token afterwards. Acceptance: `grep -E 'var\(--(color|badge|radius|page|palette)-' src/layouts/AdminLayout.astro src/styles/admin.css src/pages/admin src/components/admin` returns nothing. PR 1's visual diff must show **zero** admin changes.

### 3. [major] §15 PR 2–6 vs PR 8: `/private-charter/` CTAs land four PRs before the route exists
**Issue.** The footer (PR 2), hero slide 2, TypeCards and CTA band (PR 3), the tour aside (PR 4), the destination aside (PR 5) and About (PR 6) all link to `/private-charter/`. The page and the `_redirects` change only arrive in PR 8, and PR 8 is blocked on D-7/D-8. Every deploy preview the owner reviews in between has 404s in its main CTAs. §8.2 also says to "update the … CTAs that link to `/contact/?tour=create-perfect-day-private`", which by then have already been rewritten.
**Fix text** (§9.3; add):
> `src/config/routes.ts`: `export const CHARTER_URL = '/contact/?tour=create-perfect-day-private'` (switched to `'/private-charter/'` in PR 8). Every charter CTA, including the `?tour=` variant via `charterUrl(slug)`, uses this helper. PR 8 changes only the constant and `_redirects`.

In §8.2, replace "Update the homepage, tour-page … CTAs" with: "Switch `CHARTER_URL` (§9.3)."

### 4. [major] §0.2 / §15 PR 0: the `netlify.toml` instruction is backwards
**Issue.** The `ignore` command is an *allowlist of paths that trigger a build* (`git diff --quiet … -- src public scripts package.json …`). `design/` isn't in that list, so changes there already skip the build. Adding `design/` would make design edits **trigger** deploys, which is the opposite of the intent. The same logic applies to `tests/` and `playwright.config.ts`. They are correctly excluded today, but nobody should "add" them.
**Fix text** (§0.2 last paragraph):
> `design/` is outside the path list in `netlify.toml`'s `ignore` rule, so commits that only touch it don't build. Don't add it to that list: the list names the paths that *do* trigger builds. The same goes for `tests/` and `playwright.config.ts`. Note that adding `@playwright/test` to `package.json` does trigger one build.

### 5. [major] §15 Branching: merging the showcase to `main` puts the demo checkout on the live site
**Issue.** Step 1 merges `feat/booking-showcase-mock` and `feat/email-map-link-overbooking` (8 commits: demo pay page, demo račun, admin, Blobs) into `main`, which is the production branch. The live site would then take "bookings" through a demo checkout that charges nothing. Per the owner's own status, the showcase is a boss demo, and payments are deferred. The spec treats this step as housekeeping. Also, `feat/email-map-link-overbooking` already contains `feat/booking-showcase-mock`, so "merge A → B" is a no-op.
**Fix text** (§15 Branching; replace steps 1–2):
> 1. **Decision D-21 (blocking PR 0):** may the demo checkout go live? If not, branch `feat/redesign` from `feat/email-map-link-overbooking` (it already contains the showcase) and leave `main` untouched until the redesign and real payments are ready. If yes, the owner approves a production deploy of the showcase with `PAYMENTS_ARE_DEMO` banners and the "Book" CTAs pointing to `/contact/` first.
> 2. Hotfixes for the live site (e.g. S-1) go on a branch off `main`, merge to `main`, and then `main` is merged into `feat/redesign`. Note that on `main` the hold claim is at `GroupBookingFlow.vue:357`, not 383–386.

### 6. [major] §15 Rollout: deploy previews for PRs into `feat/redesign` aren't on by default; the rollback note ignores stored data
**Issue.** (a) Netlify builds Deploy Previews by default only for PRs against the production branch (and any branch-deploy branches). PRs into `feat/redesign` get no preview unless site settings change. The spec's per-PR preview review depends on this. (b) "No feature flags are needed because the site is prerendered" is only half true. Booking, review, pay, success, admin and the APIs are SSR functions writing to Blobs. After PR 7/8, records carry `infants`, `lineItems`, `termsVersion`, `kind: 'charter'` and drafts. An instant rollback to the old build will read those records: old manifest seat counts ignore infants, and old admin enquiries render charter requests without their fields.
**Fix text** (§15 Rollout):
> - Before PR 0: in Netlify → Site configuration → Build & deploy → Branches and deploy contexts, set Deploy Previews to "Any pull request" (or add `feat/redesign` as a branch deploy). Previews and branch deploys don't use production-deploy credits. Check the current credit rules in the Netlify dashboard before relying on that.
> - Rollback: publishing a previous deploy restores the code, not the data. PR 7 and PR 8 must keep new record fields optional and readable by the old code (additive only), and must note the behaviour of the old build on new records in the PR description. Don't publish a rollback across PR 7 while charter enquiries or infant bookings exist without checking `/admin/`.

### 7. [minor] §14 vs §15 PR 0: baseline screenshots of the current site have no stated use
**Issue.** PR 0 commits "baseline screenshots of the current site", but §14 says baselines are committed after each page PR is approved. PR 1 (blue + 16px) then invalidates every public baseline. The only lasting use is the admin freeze and PR 1's diff review.
**Fix text** (PR 0 acceptance):
> Baselines in PR 0 cover only `/admin/*` (kept until PR 10) and serve as PR 1's "before" set (attached to PR 1, not committed). Public-page baselines are committed per page PR, as §14 says.

### 8. [minor] §15 dependencies list non-blocking decisions as blockers
**Issue.** §1 says that only decisions marked **blocking** stop a merge (D-4, D-7, D-8). The §15 "Depends on" column mixes those with defaulted decisions (D-1, D-5, D-6, D-14, D-10, D-11, D-13, D-9, D-15, D-16, D-17), so a reader can't tell what actually blocks. D-8 is marked blocking, yet its default ("If no price table is given, show no estimate") makes it non-blocking. The real blocker is the list of **routes and durations**. PR 6 omits D-14 and D-18 (About years, privacy factual fixes).
**Fix text:** split the column into "Blocked by" (hard: D-4 → PR 1; D-7 and D-8 routes and durations → PR 8; lawyer → PR 11; D-21 → PR 0) and "Uses defaults of" (everything else). Change D-8's row to "**Blocking: routes + durations.** Price table and extras are optional; without them the page is quote-only."

---

## B. Internal contradictions

### 9. [major] §3.2 TourCard vs §6.2: a Vue SFC can't use `TourImage.astro`
**Issue.** §3.2 makes `TourCard` a single Vue SFC, but §6.2 says "Image 180px (`TourImage layout=card`, real photo via `getTourCardPhoto` …)". `TourImage.astro` uses `astro:assets` and can't render inside Vue. The repo already solves this: `tours/index.astro` passes a pre-optimised `cardPhotos` map (`{src, srcset, alt}`) into `ToursCatalog.vue`.
**Fix text** (§6.2 TourCard, image bullet):
> Image 180px: a plain `<img>` from a pre-built `photo: { src, srcset, sizes, width, height, alt } | null` field on the card DTO. The Astro page generates it with `getImage()`, as `cardPhotos` works today. `null` → gradient fallback. `TourImage.astro` is not used inside `TourCard.vue`.

### 10. [major] §2.8 "tokens only" vs the page specs' off-scale literals
**Issue.** Non-negotiable 8 requires tokens for type size, radius and spacing. The page specs then prescribe values off the §4 scales: 15px (trust band), 9px / 9px 11px / 13px 16px / 14px 24px / 6px 14px / 18px 20px paddings, 36px `--detail-gap`, 44px section gap, radius 14 (video ≤768), score 2.75rem, rows 190px, 168px padding-bottom. The implementer has to break rule 8, round the values (changing the look), or invent tokens. No check enforces rule 8 either: `tokens-check.mjs` only counts aliases.
**Fix text** (§2.8, append):
> Component-specific *dimensions* (widths, heights, image sizes, one-off paddings taken from a board) may be literal `px`/`rem` values in that component's scoped style, with a `/* board 0x */` comment. Colour, font-size, font-weight, radius, shadow and the section/page gaps must be tokens. Off-scale font sizes in the page specs map to the nearest token: 15px → `--font-size-base`, 2.75rem → `--font-size-display-md`… Off-scale radius 14 → `--radius-xl`. `scripts/tokens-check.mjs` also fails on any `#hex`/`rgb(` outside `tokens/design.css`, `admin.css` and `src/lib/email/`.

### 11. [major] §8.1.6: draft POST response contract is ambiguous (fetch vs form post)
**Issue.** "Responds 303 → review, or 400 with field errors (JSON for the island)". If the island submits with `fetch`, it follows the 303 silently and gets HTML. If it submits as a native form, a 400 JSON body replaces the page. Today the flow uses `window.location.href` with query params, so it requires JS.
**Fix text:**
> The island renders a real `<form method="post" action="/api/bookings/draft">` (works without JS). With JS, it submits with `fetch` and `Accept: application/json`. The server returns `200 {"redirect": "/book/{slug}/review/?draft={id}"}` or `400 {"errors": {field: message}}` for JSON requests, and `303` to review or `303` back to step 2 with `?error=` for form posts. The same contract applies to `/api/charter-request`.

### 12. [minor] §0.2 last table row contradicts D-20, and the section pointers are wrong
**Issue.** The row says `/booking/details/` is "restyle(d) with the new tokens (§7.12, §12)", but D-20 deletes it. §7.12 is About; 404 is §7.14. §0.1 says routes are mapped in "§3", but the map is §0.2. D-4 says the fallback face is "chosen in PR 1 (§4.4)", but fonts are §3.3.
**Fix text:** row → "`/404`, `/admin/*` | restyle (§7.14, §12). `/booking/details/` is deleted (D-20)". §0.1 "(§3)" → "(§0.2)". D-4 "(§4.4)" → "(§3.3)".

### 13. [minor] §8.2 "[Optional, D-14-dependent] customer auto-reply email"
**Issue.** D-14 is the founding year. The auto-reply has no decision, and with `RESEND_API_KEY` empty in tests it also needs a test note.
**Fix text:** "[Optional, decision D-22: send a customer auto-reply?] Default: no. If yes, it uses `src/lib/email/send.ts` and is off when `RESEND_API_KEY` is empty (tests)." Add D-22 to §1.

### 14. [minor] §5.1 uses an undefined token `--color-brand`
**Fix text:** "`ti-sailboat` in `--color-accent`". Alternatively, define `--color-brand: var(--palette-blue-500)` in §4.2.

### 15. [minor] §6.1.7 bento tile list contradicts its own rule
**Issue.** The list sets "f: Split", but §3.4 says Split has no real photo, and the paragraph after the list says to choose from destinations with real photos, f = Zlatni Rat *or* 5 tiles. §6.1.7 also says the tile uses `shortDescription` as the tagline, while §9.2 adds `tagline`. `bentoOrder` is in §9.2, yet the tiles are hard-coded a–f.
**Fix text:**
> Tiles are the destinations with `bentoOrder` set, sorted by it. Default `bentoOrder`: blue-cave 1 (tile a, 2×2), hvar 2, blue-lagoon 3, pakleni 4, vis 5, then a **5-tile layout** (e spans 2 columns) until a sixth destination has a real photo. The tile text is `tagline` (§9.2), not `shortDescription`.

### 16. [minor] §6.3.4 uses `tour.departure` while §9.1 migrates it to `departures[]`
**Fix text:** "Next departure … `tour.departures[0].time` (or 'Several departures daily' when `departures.length > 1`)".

### 17. [minor] §3.2 says "build all components in PR 2", but several belong to page PRs
**Issue.** `DestinationTile`, `TypeCards`, `HowItWorks` and `TrustBand` are listed under `home/` and in PR 3's file list. `LegalLayout` is PR 6, and `Accordion` is restyled in PR 3/6.
**Fix text:** add a "PR" column to §3.2: PR 2 = Button, PillLink, SectionHeader, PhotoHero, Chip/ChipGroup, Badge, TourCard, DestinationCard, CtaBand, EmptyState, Gallery, StickyAside, MobileActionBar, InfoTile, StepBar. PR 3 = TrustBand, TypeCards, HowItWorks, DestinationTile, Accordion. PR 6 = LegalLayout.

### 18. [minor] §14 vs PR 7 acceptance: "3 browsers" vs "Chromium + WebKit"
**Fix text** (§14): "E2E: Chromium, WebKit and Firefox. Visual: Chromium + WebKit only."

---

## C. Ambiguities (implementer must guess)

### 19. [major] D-4 / §3.3: the fallback display face is unnamed, and there's no decision criterion
**Fix text** (D-4 default):
> If the licence isn't confirmed **by the time PR 1 opens**, use **Anton** (SIL OFL, self-hosted woff2, weight 400, Latin Ext-A subset). Second choice: Oswald 700. Swapping later to Glorich is a one-file change in `tokens/design.css` (`@font-face` + `size-adjust`). The PR records the licence file under `src/assets/fonts/LICENSE-*.txt`.

### 20. [major] §3.2 inventory is missing components the page specs require
**Issue.** §8.2 says to reuse "the same calendar component as group booking". The calendar lives inside the 957-line `GroupBookingFlow.vue`. Other shared pieces have no home either: guest steppers (group + charter), radio cards (slots, routes, durations, pay methods), the summary card (group, review, pay, success, charter), form field + error wiring, notice boxes (`warn-box`/`highlight-box`), Breadcrumb, the marquee pause button (trust band + destination highlights), the timeline (itinerary + About), the review card (D-5), and the copy-ref button.
**Fix text** (§3.2, add rows):
> `BookingCalendar.vue` (extracted from `GroupBookingFlow.vue` in PR 7; reused by `CharterRequest.vue`) · `GuestSteppers.vue` (adults/children/infants, cap prop) · `ChoiceCards.vue` (`role=radiogroup`, used for slots, routes, durations, pay methods) · `SummaryCard` (.astro + .vue) · `FormField.vue` (label, hint, error, `aria-describedby`) · `Notice.astro` (`info`/`warn`/`danger`) · `Breadcrumb.astro` · `Marquee.astro` (pause button, reduced-motion wrap) · `Timeline.astro` · `ReviewCard.astro` (built, unused until D-5). Each row also gets its PR.

### 21. [major] §15 PR 2: the "dev only, not built for production" kit page has no mechanism, and it's invisible on previews
**Issue.** Any `src/pages/dev/kit.astro` is built and deployed. An `_`-prefixed file isn't routed at all, not even in dev. The owner reviews deploy previews, which are production builds, so they won't see the kit either.
**Fix text:**
> Put the kit at `src/dev/kit.astro` and register it with an inline integration in `astro.config.mjs`: `injectRoute({ pattern: '/dev/kit', entrypoint: './src/dev/kit.astro', prerender: true })` only when `command === 'dev' || process.env.CONTEXT === 'deploy-preview'`. The page sets `noindex`. A test asserts that `dist/dev/` doesn't exist after `CONTEXT=production pnpm build`.

### 22. [minor] Open "or" choices with no criteria
These need a single answer:
- §6.1.11 "Keep the current, softer line, **or** drop the '3–5 days' part" → pick: "Tours run daily from Split, {season}. Book early in July and August."
- §6.5 item 2 "If the marquee is kept visually…" → pick: "No marquee. A 1-column grid ≤768."
- §8.1.4 "`role=radiogroup` (**or** native radios)" → "native `<input type=radio>` in a `<fieldset>` with a `<legend>`" (it's a form post).
- §8.1.5 / §16: `.ics` "Optional" in PR 7 vs "later" → "Out of scope (§16); don't build in PR 7."
- §9.1 `fromPrice`: "keep as the display label **or** derive it" → "derive it with `formatFromPrice(adultPrice, priceUnit)`; delete the field".
- §9.1 `badge` replaces "`featured`-as-bestseller": state whether `featured` stays. §6.1.5 still calls `getFeaturedTours()` → "`featured` stays (slider order); `badge` is display only".
- §7.13 hours card: "computed … **or** removed if the owner gives no fixed hours" → "`OFFICE_HOURS = null` by default ⇒ no badge, no hours line".
- §8.2 MiniNav "exit → previous page **or** `/tours/`" → "`/tours/{slug}/` when `?tour` is set, else `/tours/`" (no referrer logic).
- §3.2 "Names are proposals" → "Use these names. Rename only in PR 2 and update this table."

### 23. [minor] Untestable or unmeasurable acceptance criteria
- §6.1 "screenshots match the board structure" → "section order and column counts at each width match board 01 v4; the reviewer ticks the §6.1 section list on the PR".
- §6.2 "island payload ≤ 6 KB" → "the `props` attribute of the `ToursCatalog` `<astro-island>` in `dist/tours/index.html` is ≤ 6 KB (checked by a test)".
- PR 9 "`global.css` ≤ 8 KB": say whether that's source or built, and whether `icons.css` (3.4 KB) and `base.css` count → "built CSS shared by every page (excluding the font) ≤ 12 KB gzip-less".
- §6.1 "Perf ≥ 90 mobile": name the runs (median of 3, Lighthouse CLI version) so it's repeatable.
- PR 1 "a11y unchanged or better" → "axe serious/critical count ≤ PR 0 baseline count per page".

### 24. [minor] §6.5 map link has no data source
**Issue.** `Destination` has `distance` but no coordinates or map URL.
**Fix text** (§9.2, add): "`mapUrl: string` (Google Maps search URL by coordinates, same format as `MEETING_POINT_MAP_URL`)".

### 25. [minor] §8.1.3 `termsVersion` is client-supplied
**Fix text:** "The server rejects a `termsVersion` ≠ `TERMS_VERSION` (redirect back to review with `?error=terms-changed`) and stores the server constant, never the client value."

---

## D. Estimate realism

### 26. [major] §15 estimates are 30–50% low for the heaviest PRs
| PR | Spec | Scope evidence | Suggested |
|---|---|---|---|
| 0 | 1–1.5 d | Admin freeze of about 695 lines of global CSS that use public classes (31+ usages) **and** tokens (finding 2); Playwright + axe setup; baselines; design copy; S-7 curl checks | 2–3 d |
| 2 | 2.5–3 d | Header + mobile panel, Footer, MiniNav, TrustStrip, ~15 components incl. Gallery rebuild with `<dialog>` (ImageGallery is 320 lines), unified TourCard, kit page | 4–5 d |
| 5 | 2 d | `destinations/[slug].astro` is 707 lines → components, `DestinationsCatalog.vue` 481 lines, data for 10 destinations | 3 d |
| 6 | 2.5 d | `FAQPage.vue` 552 lines, LegalLayout + scrollspy + 3 pages + factual fixes, About, Contact + `topic` through validation/store/admin/email + tests, 404 | 4 d |
| 7 | 3–3.5 d | `GroupBookingFlow.vue` 957 lines + calendar extraction, draft API + Blobs store + TTL, infants through price/manifest/overbooking/emails/admin/sample data, season, departures, success/error, S-7 middleware, E2E ×3 browsers | 5–6 d, **split into 7a (server: drafts, infants, departures, season, emails, S-7) and 7b (UI)** |

The 474 literal `font-size` declarations (the spec says 470) are spread across page PRs with no time allocated. **Fix text:** replace the total with "about 32–38 developer days" and split PR 7 into 7a/7b.

---

## E. Missing work items

### 27. [major] No-JS behaviour of the islands isn't specified
**Issue.** Today group booking (`window.location.href`) and the contact form (no `action`) are JS-only, and there's no `<noscript>` anywhere in `src`. The new charter page is a `client:load` island on a prerendered page.
**Fix text** (§3.5, append):
> **Progressive enhancement.** Booking, charter and contact forms render a real `<form method="post" action="/api/…">` server-side, so they submit without JS (finding 11). Turnstile is skipped when JS is off; the server then relies on the honeypot, `_startedAt` and the rate limit. HeroCarousel shows slide 1 statically; the catalog islands show all items unfiltered; the gallery hero links to the first full-size image. One E2E test per form runs with `javaScriptEnabled: false`.

### 28. [major] Admin sample data and seed fixtures aren't updated for the new fields
**Issue.** `src/lib/admin/sample-data.ts` ("Load demo data", the deliberately overbooked boat) and the E2E seeding don't know `infants`, `lineItems`, `termsVersion`, `kind: 'charter'`, `topic` or `slot ∈ departures`.
**Fix text** (§9.4, add):
> Update `sample-data.ts` in the PR that adds each field: PR 6 (`topic`), PR 7a (infants on 2 bookings including the overbooked departure, `lineItems`, `termsVersion`), PR 8 (2 charter enquiries, one with an estimate). `admin.test.ts` asserts that seat totals include infants.

### 29. [minor] Email templates: the visual change is undefined
**Issue.** §9.4 lists the content changes, but not whether the templates' hard-coded teal changes to blue, or when.
**Fix text:** "PR 7a changes the email accent colour from `#1d9e75` to `#1a6fc4` in `src/lib/email/templates.ts` and refreshes the admin email preview screenshots."

### 30. [minor] `links.test.ts` won't cover the new route
**Issue.** Its `ROUTES` regex is `(tours|destinations|about|faq|contact|legal|book|booking)`, and it checks only the trailing slash, not that the target exists.
**Fix text** (§14 Links row): "Add `private-charter` to `ROUTES` in `links.test.ts`. Add a build-output test that every internal `href` in `dist/**/*.html` resolves to a built page or a `_redirects` rule."

### 31. [minor] Missing states and docs
Add to §14 / DoD:
- loading and error states for every fetch in the islands (draft POST, charter POST: disabled button + `aria-busy`, network error message in `role=alert`);
- hydration-mismatch guard for `sessionStorage` restore on the prerendered `group.astro` (restore in `onMounted` only);
- print stylesheet for `/booking/success/` (hide header, footer and buttons; the booking ref and meeting point print);
- browser support matrix: "Last 2 Safari iOS / macOS, Chrome, Firefox, Samsung Internet; `<dialog>`, `:has()` not required; `svh` with `vh` fallback";
- an explicit "Analytics: none (CSP)" line in §2;
- docs: README sections on tokens/cascade layers, the kit page, and the Playwright commands (`pnpm test:e2e`, `pnpm test:visual`, with `RESEND_API_KEY=` and `EMAIL_SENDING` unset).

### 32. [minor] Content ownership has no owner or deadline
**Issue.** §17 lists 22 items but not who collects each one or by which PR. The photo collection (§3.4) "runs in parallel" with no owner.
**Fix text** (§17): add "Owner" (Luka / boss / agency / lawyer) and "Needed by PR" columns, plus "Default ships if not answered by the PR's review."

### 33. [minor] Scripts missing from `package.json`
**Fix text** (PR 0): add `"test:e2e": "playwright test tests/e2e"`, `"test:visual": "playwright test tests/visual"` and `"tokens": "node scripts/tokens-check.mjs"`, and chain the tokens check into `check`. CI (`ci.yml` runs check/test/build) gets the tokens check automatically; Playwright stays out of CI (§14).

---

## F. Structure and readability

### 34. [major] No executive summary and no "start here" for an implementer who hasn't seen the conversation
**Fix text** (insert after the status block, before §0):
> ## Start here
> **What:** re-skin the whole public site to the October 2026 design (teal → blue, 16px body, display font on photo heroes), add a private-charter request page, and fix booking privacy issues (no personal data in URLs, honest copy). The admin is frozen, then re-skinned last.
> **Rules you can't break:** §2 (a11y, no invented facts, server prices, strict CSP, Netlify Free, tokens only). Don't commit or push unless asked. Run tests with `RESEND_API_KEY=` empty.
> **Before coding:** (1) answer the blocking decisions D-4, D-7, D-8 and D-21 (§1); (2) set up Netlify deploy previews for `feat/redesign` (§15); (3) do PR 0.
> **Per PR:** read its row in §15, then only the sections it cites. The Definition of done is §14.
> **Where the facts live:** `src/data/*`, `src/config/*`, never the design boards.

### 35. [minor] Section numbering and length
- "§7.1–7.9 Shared rules" followed by §7.10 is confusing → renumber to §7.1 Shared, §7.2 Legal … §7.6 404, and update cross-references.
- §6.1.2 and §6.2 pack whole specs into table cells (row 3 of §6.2 is about 120 words). Turn those rows into bullet lists so they diff and review cleanly.
- §18.1 "Research notes kept outside the repo… re-read the design export" isn't reproducible → either commit the notes under `design/2026-10/research/` in PR 0 or drop the section.
