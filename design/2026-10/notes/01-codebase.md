# 01 — Codebase inventory (for the redesign plan)

Repo: the repo · branch `feat/email-map-link-overbooking` (clean tree) · researched 2026-10-13, read-only.
All paths are relative to the repo root. Line numbers are from the current branch.

Branch state: `main..HEAD` = 8 commits (0c4b648 CI/Vitest/Netlify config → 86b6332 self-hosted Tabler subset → cc3e218 contact hardening → 6d933cf SEO → 35e9298 booking/a11y/trailing-slash → c5499a0 docs → 74d6685 booking showcase + admin → 882dbc3 overbooking + Resend email). `git diff --stat main...HEAD`: 120 files, +15,793 / −3,320. So **main is far behind this branch**: the redesign should be based on this branch (or on main once these are merged).

Stack facts: Astro `^6.4.8`, `@astrojs/vue ^6.0.1` (Vue `^3.5.43`), `@astrojs/netlify ^7.0.13`, `@astrojs/sitemap`, `@netlify/blobs ^10.7.13`, `sharp ^0.34.5`; dev: `@astrojs/check`, `typescript ^6`, `vitest ^3.2.7`, `subset-font` (icon subsetting). pnpm 10.32.1, Node ≥22.12 (`.nvmrc` = 22). No CSS framework, no Tailwind, no PostCSS config, no linter/formatter config, no Playwright/visual tests.

---

## 1. Routes

`astro.config.mjs`: `output: 'server'`, `adapter: netlify({ imageCDN: false })`, `image.layout: 'constrained'`, `vite.ssr.external: ['sharp']`. **No `trailingSlash` or `build.format` set** (defaults: `trailingSlash: 'ignore'`, `build.format: 'directory'`). Integrations: custom `require-site-url-on-build` (throws on a production `astro build` without `PUBLIC_SITE_URL`, skipped for Netlify non-production contexts), custom `load-dotenv-in-dev` (copies `.env` into `process.env` in `astro dev` only, never under Vitest), `vue()`, and `sitemap()` only when `PUBLIC_SITE_URL` is set (filtered by `NOINDEX_PATH_PREFIXES`).

**Trailing-slash policy:** every hand-written internal link ends in `/` (before `?`/`#`). Enforced by `src/lib/links.test.ts` (regex over all `.astro/.vue/.ts` for `/tours|destinations|about|faq|contact|legal|book|booking`). Netlify serves directory URLs, so unslashed links would 301. `Header.astro:12` strips trailing slashes for active-link matching (dev vs prod difference).

### Public pages (all `prerender = true`)

| Route | File | Renders | Islands / scripts | Notes |
|---|---|---|---|---|
| `/` | `src/pages/index.astro` (295 l) | Full-bleed hero (`<Picture>` of `src/assets/hero-banner.jpg`, 3840×2160, webp 800–1920w, preloaded LCP) + `HeroCarousel` (2 panels: tours / private charter); "Popular tours" (`TourCard` ×5 from `getFeaturedTours()`); "Where we go" (6 hard-coded destination slugs, icon-only cards, no photos); "How it works" 4 steps; "Group or private?" 2 type cards (hard-coded "From €75 per person"); trust bar (`ABOUT.trustStats`); FAQ preview (first 4 FAQ items) via `FAQAccordion`; CTA band. `<h1>` is sr-only. JSON-LD: Organization(TravelAgency) + WebSite + FAQPage. `SiteLayout solidNav={false}` → floating transparent header. | `HeroCarousel client:load`, `FAQAccordion client:visible` | Own `<style>` 44 lines |
| `/tours/` | `src/pages/tours/index.astro` | `ToursCatalog` with all 7 tours, `toursByDestination` map, pre-optimized card photos (`toGalleryView`, `GALLERY_CARD_SIZE`) | `ToursCatalog client:visible` | **Query params read client-side** (`ToursCatalog.vue:130-146`): `type`/`filter` = `group|private|short|half-day|sunset`, `destination=<dest-slug>`, `q`/`search`. Passes the **entire TourDetail[]** as island props (large serialized payload). |
| `/tours/[slug]/` | `src/pages/tours/[slug].astro` → `components/tour/TourDetailView.astro` | `getStaticPaths` over 7 tours. Breadcrumb, `ImageGallery`, title + meta row, Overview, Highlights (**bug, §11**), itinerary timeline, What's included/not, Good to know grid, Destinations-on-this-tour chips, Please note (disclaimers), sticky booking aside (price, notes, next departure, season, CTA, private-charter CTA if group+private, cancellation pill), mobile bottom book bar. JSON-LD TouristTrip + BreadcrumbList; OG image = 1200×630 JPG crop of card photo. | `ImageGallery client:visible` | `NotFoundPanel` branch is unreachable (static paths only cover valid slugs). |
| `/destinations/` | `src/pages/destinations/index.astro` | Header, decorative "map strip" (dots per destination, links to Google Maps meeting point), `DestinationsCatalog` (filter chips, featured + grid cards with photos), "Not sure where to go?" strip | `DestinationsCatalog client:visible` | style 59 l |
| `/destinations/[slug]/` | `src/pages/destinations/[slug].astro` (707 l; 332 l of scoped CSS) | `getStaticPaths` over 10 destinations. Breadcrumb, `ImageGallery` with tag pills, intro, Highlights + CSS marquee (pause button, inline script `:364-374`), Best-time bar chart (inline `style` heights/colours from `bestTimeBarStyle`), Location (map stub link + geo facts), Also nearby, 3 Insider tips, Tours visiting (cards with `TourImage` thumbs), sticky sidebar (at-a-glance stats, **fake "Current conditions" with "—" temp**, CTA `/tours/?destination=<slug>`, private-charter CTA, nearby links). JSON-LD TouristDestination + Breadcrumb. | `ImageGallery client:visible` | |
| `/about/` | `src/pages/about/index.astro` | Placeholder hero block (icon, no image), headline/intro, trust stats, timeline, crew cards (initials avatars), values, "What guests say" (3 quotes), inline script making horizontal scrollers focusable (`:127-146`). Data: `src/data/about.ts`. | inline script | style 128 l |
| `/faq/` | `src/pages/faq/index.astro` | `FAQPage` (search, category nav, accordion per category, contact band). JSON-LD FAQPage (all 20). | `FAQPage client:visible` | **Whole FAQ content is client-rendered island** (SSR'd HTML exists, but island). |
| `/contact/` | `src/pages/contact/index.astro` | 4 contact cards (tel, WhatsApp `wa.me`, mailto, Maps), hours card (**static "Open now" badge**), form (honeypot `company`, `_startedAt`, name/email/phone/subject-select-of-tours/message, optional Turnstile div), map stub, marina note. | `<script>` imports `src/client/contact-form.ts`; Turnstile `api.js` inline script only when `PUBLIC_TURNSTILE_SITE_KEY` set at build | `?tour=<slug>` preselect works **client-side only** (page is prerendered, so `Astro.url.searchParams` at `:16` is empty at build). |
| `/legal/terms/`, `/legal/privacy/`, `/legal/cancellation/` | `src/pages/legal/*.astro` | Each repeats the same tab bar (3 links, hard-coded active) + left section nav (hard-coded `active` on first link, no scroll-spy) + "short version" summary box + sections with icon h2s. "Last updated: 1 June 2025". | — | ~41-46 l scoped style each, near-identical |
| `/booking/details/` | `src/pages/booking/details.astro` | Static "What we need to book your tour" info page. `robots="noindex, follow"`. **Not linked from anywhere** (orphan). | — | hard-codes `#1d9e75` (`:145`) |
| `/404` | `src/pages/404.astro` | `.nf-page` block (icon, h1, 2 buttons). `noindex, follow`, `canonical={false}`. | — | Uses `_base.css` `.nf-*`, not `NotFoundPanel` |
| `/robots.txt` | `src/pages/robots.txt.ts` | `Allow: /`, `Disallow` from `ROBOTS_DISALLOW`, `Sitemap:` when `site` set | — | |
| `/site.webmanifest` | `src/pages/site.webmanifest.ts` | name, `theme_color = SITE_THEME_COLOR (#1d9e75)`, `background_color '#ffffff'`, favicon.svg + apple-touch-icon | — | |

### Booking pages

| Route | File | Mode | Behaviour |
|---|---|---|---|
| `/book/[slug]/group/` | `src/pages/book/[slug]/group.astro` | **prerender** (`getStaticPaths` filtered by `supportsInstantBook` → only 4 tours: blue-cave-hvar-5-islands, golden-horn-brac-hvar, blue-lagoon-morning, blue-lagoon-afternoon) | `checkout` layout (no Header/Footer), `MiniNav` + hand-written 4-step progress bar (Tour type ✓ / Date & guests / Review / Payment) + tour snapshot + `GroupBookingFlow client:load` + `TrustStrip`. `robots noindex,nofollow`. Passes `renderedOn` (build date) to avoid hydration mismatch. |
| `/book/[slug]/review/` | `src/pages/book/[slug]/review.astro` (510 l, 239 l CSS) | **server** | Unknown slug → `redirect('/404')`; quote-only → `/contact/?tour=`; missing details → back to group page. Reads all booking details **from the query string** (PII in URL). Re-computes price breakdown server-side. Shows `?error=` message from `BOOKING_ERRORS`. Form `POST /api/bookings` with hidden fields. Duplicates the step-bar markup. |
| `/booking/pay/?id=<uuid>` | `src/pages/booking/pay.astro` | server | **Demo checkout**: GET shows summary + method radios (Card/Teya, PayPal) + "Pay €X" + "Demo: simulate a declined payment". POST (rate-limited 20/10 min/IP) → `finalizePaidBooking` → 303 `/booking/success/?id=` or `recordFailedPayment` → `/booking/error/?id=`. Already paid → success; closed (cancelled/refunded/past) → message. Inline script disables buttons on submit. |
| `/booking/success/?id=<uuid>` | `src/pages/booking/success.astro` (380 l) | server | Only paid & not cancelled bookings; otherwise → pay page. "You're booked!", email-sent vs demo-outbox wording, demo note, booking ref, booking card, meeting-point card + map link, what-to-bring, next steps. |
| `/booking/error/?id=<uuid>` or `?tourId=<slug>` | `src/pages/booking/error.astro` | server | Declined payment (retry → pay page) or "couldn't save booking" (retry → group page). Common reasons list. |
| `/book/:slug/private` | — | redirect | `public/_redirects`: 301 → `/contact/?tour=:slug` (no private flow exists, although July drafts design one). |

### API

| Route | File | Behaviour |
|---|---|---|
| `POST /api/bookings` | `src/pages/api/bookings.ts` | Rate limit `booking:<ip>` 20/10 min (429 text). FormData → `parseGroupBookingParams` → `createPendingBooking`. Invalid → 303 back to review with `?error=`; ok → 303 `/booking/pay/?id=`; exception → `/booking/error/?tourId=`. |
| `POST /api/contact` | `src/pages/api/contact.ts` | JSON body ≤16 KB (content-length check + streaming cap), rate limit `contact:<ip>` 5/10 min, `validateContactSubmission` (honeypot → silent `{ok:true}`), tour slug must exist, Turnstile verify, `recordEnquiry` (stores + emails admin). JSON `{ok:true}` / `{error, fields?}` 400/413/429/503. |

### Admin (all `prerender = false`, behind middleware)

`AdminLayout` (`src/layouts/AdminLayout.astro`, 807 l, ~696 l `<style is:global>`). Sections: Dashboard `/admin/` (week strip `?from=&day=`, departures manifest via `DepartureCard`, overbooking warnings, `?flash=`), Bookings `/admin/bookings/` (filters, grouped by day, Export button) and `/admin/bookings/[id]/` (status changes, refund, notes, resend confirmation; `?done=`), Enquiries `/admin/enquiries/` (`?show=`, POST status), Emails `/admin/emails/` + `/admin/emails/[id]/` (sandboxed `srcdoc` iframe preview, `?view=`), More `/admin/tools/` (load sample data / clear all), `/admin/login/` (`?next=`, cookie `hbc_admin`, SameSite Lax), `POST /admin/logout`, `GET /admin/export.csv`. Components: `src/components/admin/DepartureCard.astro` (313 l), `TourThumb.astro` (41 l). Mobile bottom tab bar + desktop header nav.

### Redirects
- `public/_redirects`: 8 retired tour slugs (`three-islands`, `blue-cave-open-boat`, `blue-cave-luxury-cabin`, `blue-cave-6-islands`, `blue-lagoon-half-day`, `blue-lagoon-trogir`, `three-islands-trogir`, `brac-golden-horn`) → `/tours/` 301; `/book/:slug/private` → `/contact/?tour=:slug` 301. Kept in sync with `REMOVED_TOUR_SLUGS` by `src/data/catalog.test.ts`.
- `netlify.toml`: no redirects; only headers + build `ignore` rule (skips builds when only docs/design files change — `new-pages-design/` and `docs/` changes don't deploy).
- In-page redirects: review → `/404`, contact, group; pay/success/error ↔ each other; middleware → `/admin/login/?next=`.

---

## 2. Layouts and components

### Layouts
| File | Props | Role |
|---|---|---|
| `src/layouts/BaseLayout.astro` (90 l) | `title`, `description?` (default `SITE_DEFAULT_DESCRIPTION`), `ogImage?` (default `/og-default.jpg`), `ogImageAlt?`, `canonical?` (bool, default true), `robots?`, `jsonLd?` (object or array) | `<html lang="en">`, imports `global.css` + `icons.css`, favicon/apple-touch/manifest links, theme-color, canonical from `Astro.url.pathname` + `Astro.site`, OG (type website, locale en_GB, 1200×630 jpeg) + Twitter summary_large_image, **preloads the icon woff2**, JSON-LD `<script is:inline type="application/ld+json">`, `<slot name="head">`. No web fonts. |
| `src/layouts/SiteLayout.astro` (50 l) | same as Base + `checkout?` (hides Header/Footer), `solidNav?` (default true; false = floating header over hero) | `.site-shell` wrapper, skip link `#main`, `Header`, slot, `Footer`. Every public page uses it. |
| `src/layouts/AdminLayout.astro` | `title`, `heading?`, `section?` (`today|bookings|enquiries|emails|more`), `back?`, `bare?`, `wide?` | Wraps BaseLayout (`noindex,nofollow`, no canonical). Reads enquiries count for badge. **Reuses public classes** (`.nav`, `.nav-solid`, `.nav-inner`, `.nav-logo`, `.nav-link`, `.exit-link`, `.btn-primary/.btn-secondary`, `.filter-chip`, `.trust-item`, `.warn-box`, `.highlight-box` …) — see comment at `:113-118`. |

### Astro components
| Component | Props | Used in |
|---|---|---|
| `Header.astro` (197 l) | `solid?` | SiteLayout. Logo = `ti-sailboat` + text "Hello Blue Cave". Links Tours/Destinations/About/FAQ/Contact (`aria-current` page/location), "Book now" → `/tours/`. Inline script: mobile full-screen menu (focus trap, Escape, `inert` on covered elements, body scroll lock, closes on resize >768px), scroll behaviour (solid after 40px, hide on scroll-down after 80px). |
| `Footer.astro` (49 l) | — | SiteLayout. Brand blurb, phone/email/address, Tours col (4 hard-coded links), Explore col, Legal col, © year, "Licensed maritime operator · Croatia". |
| `MiniNav.astro` | `exitHref?`, `exitLabel?` | group, review, pay, success, error (checkout chrome) |
| `TrustStrip.astro` | — | same checkout pages |
| `TourCard.astro` (59 l) | `tour`, `featured?` | **homepage only** (catalog uses its own markup in `ToursCatalog.vue`) |
| `TourImage.astro` (50 l) | `photo: PhotoRef`, `layout?: hero|card|thumb|gallery|dest`, `icon?`, `class?` | `<Image>` (webp q70, per-layout widths/sizes) or colour-block placeholder (`style="--placeholder-color"`, `role="img"`). Used by TourCard, destinations/[slug] tour cards, admin TourThumb. |
| `tour/TourDetailView.astro` (340 l) | `tour` | tours/[slug] |
| `NotFoundPanel.astro` (47 l) | `title`, `description`, slot | tours/[slug] unreachable branch only (§11) |
| `admin/DepartureCard.astro`, `admin/TourThumb.astro` | — | admin |

### Vue islands (`src/components/vue/`)
| Island | Props | Directive / page | Styles |
|---|---|---|---|
| `HeroCarousel.vue` (210 l) | `panels: HeroPanel[]`, `intervalMs?=6000` | `client:load` on `/` | **none in file** → relies on `_home.css` globals. Reduced-motion aware, pause button, `aria-roledescription` carousel/slide. |
| `FAQAccordion.vue` (99 l) | `items`, `singleOpen?=true` | `client:visible` on `/` | scoped |
| `FAQPage.vue` (552 l) | `siteEmail`, `sitePhone`, `sitePhoneDisplay` | `client:visible` on `/faq/` | scoped (323 l); inline `:style` for category icon colours (var() strings) |
| `ToursCatalog.vue` (276 l) | `tours`, `toursByDestination?`, `cardPhotos` | `client:visible` on `/tours/` | **none** → `_catalog.css` globals |
| `DestinationsCatalog.vue` (481 l) | `destinations`, `cardPhotos` | `client:visible` on `/destinations/` | scoped (254 l) |
| `ImageGallery.vue` (320 l) | `hero`, `gallery`, `tags?` | `client:visible` on tour + destination detail | scoped (164 l); parent pages override it via `:global(...)` |
| `GroupBookingFlow.vue` (957 l) | `tourSlug`, `tourTitle`, `duration`, `departure`, `fromPrice`, `priceNotes`, `maxGuests?=12`, `renderedOn` | `client:load` on `/book/[slug]/group/` | scoped (481 l) |

Other client JS: `src/client/contact-form.ts` (contact page), inline scripts in Header, about, destinations/[slug], booking/pay.

---

## 3. Styling system

**Entry:** `src/styles/global.css` (25 l) imports, in order: `tokens/redesign.css`, `modules/_base.css` (712), `_home.css` (694), `_catalog.css` (474), `_tour-detail.css` (508), `_destination-detail.css` (353), `_booking.css` (523), `_legal-about.css` (500), `_responsive.css` (350, **must stay last** — it overrides selectors from every module). Then `:focus-visible { outline: 2px solid var(--color-accent-teal) }` (duplicates `_base.css:72-75`, which uses `--color-border-info`; global wins). Imported once in `BaseLayout.astro:2` → **all modules load on every page including admin**: built `dist/_astro/BaseLayout.*.css` = **62.6 KB** (identical file emitted for SiteLayout). Phase B (page-scoped imports) from `docs/post-mobile-implementation-plan.md` §3.4 was never done.

Plus per-file scoped CSS: ~3,500 lines across pages/components (largest: AdminLayout 696 global, GroupBookingFlow 481, destinations/[slug] 332, FAQPage 323, DestinationsCatalog 254, review 239, admin/index 239, DepartureCard 194, admin bookings 177/179, booking/pay 175, ImageGallery 164, success 156, contact 132, about 128, error 116).

**Icons:** `src/styles/icons.css` is **generated** by `scripts/icons.mjs` from Tabler Icons **3.44.0** (MIT): `@font-face tabler-icons` → `src/assets/fonts/tabler-icons-subset.woff2` (~13 KB, `font-display: block`) + one `.ti-<name>:before` rule per used icon (78 icons). Adding an icon: write `ti-<name>` in source (or a quoted name on a line containing "icon", or inside an object/array literal opened on such a line, e.g. `TAG_ICONS`), then `pnpm icons` (needs network, fetches the full font from jsDelivr, subsets with `subset-font`, rewrites icons.css + woff2). `pnpm check` runs `node scripts/icons.mjs --check`, which fails CI if source uses an icon missing from the subset or an unknown `ti-*` name (`scripts/tabler-icon-names.txt`, 5,147 valid names). `.ti` base rule also repeated in `_base.css:77-81`.

**Fonts:** none loaded. `--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` (no Roboto/Arial fallback). `body` 14px / 1.6, weight 400. Weights used: 500 ×163, 400 ×10, 600 ×3 (design rule from July drafts: 400/500 only). **No type-scale tokens**: 470 literal `font-size` declarations (13px ×127, 12px ×95, 14px ×60, 11px ×59, 15px ×28, 20px ×22, … up to 56px). Spacing/padding are also literal px; no spacing tokens. Hairline borders `0.5px solid` ×104.

**Breakpoints:** `max-width: 768px` (16 uses, tablet/mobile; mobile nav switches here, matched in Header JS) and `max-width: 480px` (7). Also `min-width: 769px` / `1024px` in admin only; image `sizes` use `700px`. Gutter: `--page-gutter` 1.25rem → 1rem (≤768) → 0.75rem (≤480) in `_responsive.css`. Content max 960px. No container queries, no dark mode, no `prefers-color-scheme`.

**Naming conventions:** mixed. Mostly flat, short, global class names from the July HTML mockups (`.page`, `.layout`, `.section`, `.section-title`, `.sec-title`, `.card`, `.row`, `.label`, `.value`, `.highlights`, `.hl-item`, `.info-grid`, `.sticky-card`, `.tc-*`, `.cc-*`, `.snap-*`, `.also-strip`, `.t1/.t2`), some BEM (`.tour-card__link`, `.photo-frame--card`, `.nf__title`, `.image-gallery__arrow--prev`), state classes (`.nav-solid`, `.nav--open`, `.nav-hidden`, `.featured`, `.wide`, `.active`, `.done`, `.next`). Same class names mean different things in different files (`.card-title` defined in `_catalog.css:135`, `GroupBookingFlow.vue:503`, success/error pages; `.section-title` in `_home.css:440` and review page; `.cta-btn` in review page and GroupBookingFlow; `.dest-title` global and in destinations/index).

### All CSS custom properties defined

From `src/styles/tokens/redesign.css` (single `:root`) unless noted.

| Token | Value |
|---|---|
| `--palette-black` | `#111` |
| `--palette-gray-700` | `#555` |
| `--palette-gray-550` | `#696969` |
| `--palette-gray-500` | `#999` (unused) |
| `--palette-gray-400` | `#ccc` |
| `--palette-gray-300` | `#aaa` |
| `--palette-gray-200` | `#e5e5e3` |
| `--palette-gray-150` | `#ebebea` |
| `--palette-gray-100` | `#f5f5f4` |
| `--palette-white` | `#fff` |
| `--palette-teal-900` | `#085041` |
| `--palette-teal-500` | `#1d9e75` |
| `--palette-teal-100` | `#e1f5ee` |
| `--palette-blue-900` | `#0c447c` |
| `--palette-blue-500` | `#1a6fc4` |
| `--palette-blue-300` | `#7ab4e8` |
| `--palette-blue-100` | `#e6f1fb` |
| `--palette-amber-900` | `#633806` |
| `--palette-amber-700` | `#8f5a12` |
| `--palette-amber-500` | `#ef9f27` |
| `--palette-amber-400` | `#ba7517` (unused) |
| `--palette-amber-100` | `#faeeda` |
| `--palette-amber-50` | `#fef3e2` |
| `--palette-red-900` | `#8b1a15` |
| `--palette-red-100` | `#fdecea` |
| `--palette-purple-900` | `#3c3489` |
| `--palette-purple-500` | `#534ab7` |
| `--palette-purple-100` | `#eeedfe` |
| `--palette-coral-500` | `#e05c34` |
| `--color-text-primary` | `var(--palette-black)` |
| `--color-text-secondary` | `var(--palette-gray-700)` |
| `--color-text-tertiary` | `var(--palette-gray-550)` |
| `--color-text-info` | `var(--palette-blue-500)` |
| `--color-text-success` | `var(--palette-teal-900)` |
| `--color-text-danger` | `var(--palette-red-900)` |
| `--color-text-warning` | `var(--palette-amber-700)` |
| `--color-text-accent` | `#137556` (literal) |
| `--color-background-primary` | `var(--palette-white)` |
| `--color-background-secondary` | `var(--palette-gray-100)` |
| `--color-background-hover` | `var(--palette-gray-150)` |
| `--color-background-info` | `var(--palette-blue-100)` |
| `--color-background-success` | `var(--palette-teal-100)` |
| `--color-background-warning` | `var(--palette-amber-100)` |
| `--color-background-warning-soft` | `var(--palette-amber-50)` (unused) |
| `--color-background-danger` | `var(--palette-red-100)` |
| `--color-border-primary` | `var(--palette-gray-300)` |
| `--color-border-secondary` | `var(--palette-gray-400)` |
| `--color-border-tertiary` | `var(--palette-gray-200)` |
| `--color-border-info` | `var(--palette-blue-300)` |
| `--color-border-warning` | `var(--palette-amber-500)` |
| `--color-accent` | `var(--palette-teal-500)` |
| `--color-accent-dark` | `var(--palette-teal-900)` (unused) |
| `--color-category-private-bg` | `var(--palette-purple-100)` |
| `--color-category-private-text` | `var(--palette-purple-900)` |
| `--color-category-private-icon` | `var(--palette-purple-500)` |
| `--color-category-info-icon` | `var(--palette-blue-900)` |
| `--color-category-tip-bg` | `var(--palette-amber-100)` |
| `--color-category-tip-text` | `var(--palette-amber-900)` |
| `--color-category-warning-icon` | `var(--palette-amber-500)` |
| `--color-icon-sunset` | `var(--palette-coral-500)` (unused) |
| `--color-accent-teal` | `var(--color-accent)` (legacy alias, 29 uses) |
| `--badge-group-bg` / `--badge-group-text` | `var(--color-background-success)` / `var(--color-text-success)` |
| `--badge-private-bg` / `--badge-private-text` | `var(--color-category-private-bg)` / `var(--color-category-private-text)` |
| `--badge-bestseller-bg` / `--badge-bestseller-text` | `var(--color-category-tip-bg)` / `var(--color-category-tip-text)` |
| `--radius-md` | `8px` (81 uses) |
| `--radius-lg` | `12px` (38 uses) |
| `--border-radius-md` / `--border-radius-lg` | `8px` / `12px` (unused duplicates) |
| `--font-sans` | `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| `--font-ui` | `var(--font-sans)` |
| `--content-max` | `960px` |
| `--page-gutter` | `1.25rem`; `1rem` @≤768px, `0.75rem` @≤480px (`_responsive.css:5,283`) |
| `--touch-min` | `2.75rem` |
| `--site-header-height` | `3.5rem` (used for `scroll-padding-top` and sticky offsets) |
| `--admin-width` / `--admin-width-wide` / `--admin-tabs` | `760px` / `1120px` / `60px` (`AdminLayout.astro:122-124`) |
| `--placeholder-color` | set inline per image (`TourImage.astro:43`, `ToursCatalog.vue:219`) |
| `--thumb` | set inline (`admin/TourThumb.astro:15`) |

**Used but never defined** (all in `NotFoundPanel.astro:20-36`): `--content-form`, `--page-padding-y`, `--page-padding-x`, `--font-display`, `--text-2xl`, `--font-weight-bold`, `--color-nav`, `--color-muted`.

Most-used tokens: `--color-text-secondary` 127, `--color-background-secondary` 83, `--radius-md` 81, `--color-border-tertiary` 72, `--color-text-primary` 68, `--color-background-primary` 67, `--color-text-tertiary` 60, `--color-border-secondary` 51. Components reference `--palette-*` directly in a few places (12× `--palette-white`, nav floating state, etc.) despite the "never reference palette" rule in the token file header.

---

## 4. Data

### Types
`src/types/tour.ts` — `TourDetail`: `slug, title, tagline, shortDescription, availability, scheduleLabel, departure, duration, returnTime, itineraryKind ('morning'|'afternoon'|'full'|'flexible'), itineraryLabel, itinerary: string[], overviewHighlights: string, meetingPoint, weather, importantInfo, whatToBring: string[], included: string[], notIncluded: string[], priceNotes, caveTicketNote, groupSale?, disclaimers: string[], gallery: PhotoRef[], image: PhotoRef, fromPrice: string, featured?, types: ('group'|'private')[], badge?: 'new', primaryDestinationSlug?`. **No `highlights` field.** Prices are display strings (`'€169'`, `'On request'`), parsed by regex in `src/lib/price.ts`.

`Destination` (`src/data/destinations.ts:28-56`): `slug, name, region, icon, shortDescription, intro, tags[], tipTag?, attrs: {icon,label}[], highlights: string[], bestTimeMonths: 12-tuple 0–3, bestTimeNote, geo: {label,value}[], nearby: {slug,name,distance,icon}[], insiderTips: [3 strings], imagePhotoId: keyof PHOTO, featured, tourSlugs[], isDepartureHub?`. Tour↔destination relation lives on the destination (`tourSlugs`); tour has only `primaryDestinationSlug`.

`PhotoRef` (`src/data/tour-photos.ts:5`): `{ id, alt, color (hex placeholder), src?: ImageMetadata }`. `GalleryViewPhoto`: `{ color, alt, icon, src?, srcset? }` (serializable for Vue).

### Catalog (`src/data/tour-catalog.ts`, 338 l) — **7 tours**
| slug | types | fromPrice | featured | instant book |
|---|---|---|---|---|
| `blue-cave-hvar-5-islands` | group, private | €169 | yes | yes |
| `golden-horn-brac-hvar` | group | €139 | no | yes |
| `hvar-red-rocks-pakleni` | group | Price on request | no | no → contact |
| `blue-lagoon-morning` | group | €75 | yes | yes |
| `blue-lagoon-afternoon` | group | €75 | no | yes |
| `dubrovnik-one-way` | private | On request | no | no |
| `create-perfect-day-private` | private | On request | yes | no |

Shared copy constants at top of file (MEETING_POINT, WEATHER_COPY, SAFETY_COPY, BRING_DEFAULT, INCLUDED_DEFAULT, NOT_INCLUDED_DEFAULT, DISCLAIMERS, price notes with low/peak season adult/child prices). **Booking always charges the peak-season price** (the `fromPrice` number and the last "€X … child" match in `priceNotes`), regardless of date. `REMOVED_TOUR_SLUGS` (8). `getFeaturedTours()` returns max 5 (featured first, then catalog order).

### Destinations (`src/data/destinations.ts`, 540 l) — **10**: blue-cave, vis, hvar, pakleni, blue-lagoon, split (`isDepartureHub`), zlatni-rat, trogir, korcula, dubrovnik. Featured: blue-cave, hvar, blue-lagoon.

### Other data
- `src/data/faq.ts`: 5 categories (`booking, weather, onboard, guests, private`, each with icon) and **20** `FAQ_ITEMS` `{category, question, answer, link?}`; cancellation answers pull from `src/config/cancellation.ts`.
- `src/data/about.ts`: `ABOUT` = headline, intro, `foundingTimeline` (2016/2019/2022/2025), `crew` (named people with initials, e.g. "Marko Vuković"), `values`, `pressMentions` (3 guest quotes), `trustStats` ("9 yrs", "12 max", **"4.9 ★"**, "Licensed"). Content appears to be placeholder copy presented as fact (July docs say these must be real before launch).
- `src/data/hero-image.ts`: `HERO_IMAGE` (`src/assets/hero-banner.jpg`, alt, colour `#0a3a6e`).
- `src/data/destination-photos.ts`: `import.meta.glob('../assets/destinations/**/*.jpg', {eager:true})` → galleries keyed by folder; hand-written alts `DEST_ALTS`; placeholder colours `DEST_COLOR`. Real photos exist for **5 destinations only** (blue-cave 3, blue-lagoon 6, hvar 4, pakleni 7, vis 8 = 28 JPGs, 13 MB). split/zlatni-rat/trogir/korcula/dubrovnik fall back to colour-block placeholders.
- `src/data/tour-photos.ts`: `PHOTO` registry of 12 **placeholder-only** entries (no `src`), size ladders `GALLERY_HERO_SIZE` (400/800/1200), `GALLERY_PHOTO_SIZE` (80–1200), `GALLERY_CARD_SIZE` (400/600/800), `toGalleryView()` (runs `getImage` → webp q70 srcset).

Consequence: every tour's `image` is a placeholder, so **the main gallery image on every tour detail page is a colour block with a sailboat icon** until a thumbnail is clicked; cards use the first real gallery photo (`getTourCardPhoto`).

### Config (`src/config/`)
- `site.ts`: `SITE_NAME 'Hello Blue Cave'`, `SITE_EMAIL info@hellobluecave.com`, `SITE_PHONE +385919888838` / display, `MEETING_POINT_LABEL`, `MEETING_POINT_MAP_URL` (Google Maps coords), `EMAIL_SIGN_OFF`, `SITE_DEFAULT_DESCRIPTION`, `SITE_THEME_COLOR '#1d9e75'`, `FAVICON_PATH`, `APPLE_TOUCH_ICON_PATH`, `HOME_PAGE_TITLE`, `pageTitle(segment)` → `"Segment — Hello Blue Cave"`.
- `payments.ts`: `PAYMENTS_ARE_DEMO = true`.
- `cancellation.ts`: `CANCELLATION_SHORT`, `_WINDOW` (48 hours), `_FULL_PREFIX/_SUFFIX`, `_FULL`, `_WEATHER`. Legal pages keep their own hand-written copies of the 48h/4h numbers.
- `noindex.ts`: `NOINDEX_PATH_PREFIXES = ['/book/', '/booking/', '/api/', '/admin']`, `ROBOTS_DISALLOW = ['/api/', '/admin', '/book/*/review', '/booking/pay', '/booking/success', '/booking/error']`.

### Images pipeline
`astro:assets` with Astro's built-in **Sharp** service at build time (Netlify Image CDN disabled for cost). All image-bearing pages are prerendered, so sharp never runs at request time (`vite.ssr.external: ['sharp']`). Patterns: `<Picture>` for the home hero; `<Image>` in `TourImage.astro`; `getImage()` in `toGalleryView` (for Vue islands, which receive `src`/`srcset` strings); `socialImageFor()` crops 1200×630 JPG share images. Format webp q70 everywhere. Hand-written `sizes` per context (`docs/gallery-image-quality-fix.md` documents the rule).

---

## 5. Booking flow end to end

```
Tour card / tour page CTA
  ├─ supportsInstantBook(tour)  (types includes 'group' AND fromPrice has €number)
  │    → /book/<slug>/group/            prerendered; GroupBookingFlow (client:load)
  │         calendar (Mon-first, past days disabled, build-date hydration fix),
  │         single departure slot parsed from "HH:MM check-in · HH:MM departure" copy,
  │         adults (≥1) + children steppers, cap MAX_GUESTS = 12 combined,
  │         first/last/email required, phone/notes optional, live price summary
  │    → window.location = /book/<slug>/review/?date=&slot=&adults=&children=&firstName=&lastName=&email=&phone=&notes=&total=&guests=
  │         (all PII in the query string; Edit links go back with the same query)
  │    → review.astro (server): re-parses + clips params, recomputes total from tour data, hidden-field form
  │    → POST /api/bookings: rate limit 20/10min/IP; createPendingBooking validates again
  │         (quote/guests/date/past-in-Europe/Zagreb/name/email) and recomputes total server-side;
  │         stores Booking {status: pending_payment, paymentStatus: unpaid, ref HBC-XXXXXX, id uuid}
  │    → /booking/pay/?id=<uuid>   DEMO: Card (Teya) or PayPal radio, "Pay" or "simulate decline"
  │         success → finalizePaidBooking (CAS: only the request that flips to paid continues)
  │                   → demo invoice (counter "N/HBC1/1", fake JIR/ZKI) → customer confirmation email
  │                   → admin booking email → /booking/success/?id=
  │         decline → recordFailedPayment → /booking/error/?id=  (retry → pay)
  └─ else (private-only, or "on request")
       → /contact/?tour=<slug>   (contact form preselects the tour client-side)
```

- **Group vs private:** `isGroupTour` = types includes `group`. Private-only charters show "/ boat" price unit only if numeric (none are). Tour pages with group+private show an extra "Enquire about a private charter" CTA to contact. No private booking flow (July draft `06-private-booking.html` designed one with boats/routes/extras/deposit; not built; `/book/*/private` 301 → contact).
- **Price model:** `src/lib/price.ts` `parseAdultPrice` (`/€(\d+)/` on fromPrice), `parseChildPrice` (last `€N … child` in priceNotes), `computeBookingTotal`. Used identically client (GroupBookingFlow), review page, server (`service.ts:66`), SEO offers and sort.
- **Validation:** `src/lib/booking.ts` (`parseGroupBookingParams` with per-field clipping, ISO date validation, `hasRequiredBookingDetails`), `src/lib/bookings/service.ts` (`createPendingBooking`, `isPayable`, `finalizePaidBooking`, `recordFailedPayment`, `applyAdminAction`, `recordEnquiry`, `takesSeats`, `BOOKING_ERRORS`, `STATUS_LABELS`), `src/lib/bookings/dates.ts` (Europe/Zagreb business dates), `ids.ts` (refs without 0/O/1/I, uuid ids, `isRecordId`).
- **Storage:** `src/lib/bookings/store.ts` — Netlify Blobs stores (bookings, enquiries, email outbox, counters) with compare-and-swap updates; falls back to in-memory where Blobs is unavailable (Vitest / plain server). Seat holds: **none** (overbooking only warned about in admin, `src/lib/admin/manifest.ts`).
- **Emails:** `src/lib/email/send.ts` (Resend API; real sending only when `RESEND_API_KEY` AND `EMAIL_SENDING=on`; while `PAYMENTS_ARE_DEMO`, only to `ADMIN_EMAIL` + `EMAIL_DEMO_ALLOWLIST`; every email saved in the outbox and viewable in `/admin/emails/`), `src/lib/email/templates.ts` (table-based inline-styled HTML + text: `bookingConfirmationEmail`, `adminBookingEmail`, `adminEnquiryEmail`; **hard-coded colours** `#1d9e75`, `#0f6e56`, `#f5f5f4`, `#111`, `#555`, `#333`, `#767676`, `#e5e5e3`, system font stack).
- **Rate limiting:** `src/lib/rate-limit.ts` fixed window 10 min, default 5, Blobs CAS, **fails open** if Blobs unavailable. Keys: `contact:` (5), `booking:` (20), `pay:` (20). IP from `x-nf-client-connection-ip`.
- **Turnstile:** `src/lib/turnstile.ts` — enforced only if both `TURNSTILE_SECRET_KEY` and `PUBLIC_TURNSTILE_SITE_KEY` are set; widget rendered on contact page only when the site key exists at build time (`contact/index.astro:19,175`). CSP already allows `challenges.cloudflare.com` for script-src and frame-src.
- **Contact form:** `src/lib/contact-validation.ts` shared by client (`src/client/contact-form.ts`) and API: limits (name 200, email 254, message 5000, phone 30, tourSlug 80), min name 2, min message 10, phone regex, honeypot `company` → silent success, `_startedAt` min 2 s / max 24 h. Client marks `aria-invalid` + `aria-describedby="contact-status"` on failing fields, uses `aria-disabled` while sending, resets Turnstile after a server round-trip. Enquiries are stored and emailed to the admin (README still says "does not send email yet" — outdated).

---

## 6. Security

- **`src/middleware.ts`:** skips prerendered requests; `/admin` + `/admin/*` (except `/admin/login/`) require a valid signed session cookie, else 303 to login with `?next=` (GET only); admin responses get `Cache-Control: no-store` + `X-Robots-Tag: noindex, nofollow`; `/booking/*`, `/book/*`, `/api/*` get `no-store`. Comment (`:11-13`) notes netlify.toml header rules don't reliably reach server-function responses — so **CSP/HSTS/XFO from netlify.toml probably only cover static files**; SSR pages (review, pay, success, error, admin, API) may lack them (verify on the live site).
- **Admin auth:** `src/lib/admin/auth.ts` — single shared `ADMIN_PASSWORD` (dev default `demo`; locked if unset in prod), HMAC-SHA256 token `expires.signature`, 12 h, key = `ADMIN_SESSION_SECRET` or derived from the password; timing-safe comparisons over SHA-256 hashes. Cookie `hbc_admin`, SameSite=Lax (so email links work). Astro `checkOrigin` (default for server output) blocks cross-site form POSTs. Email preview iframe `sandbox="allow-popups allow-popups-to-escape-sandbox"`. `escapeHtml` in email templates.
- **Headers (`netlify.toml`, `/*`):** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, HSTS 1 y + preload, CSP `default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'`. `/_astro/*` immutable 1 y cache. **A redesign that adds Google Fonts, external images, map embeds, analytics or a CDN must update this CSP** (`font-src 'self'` would block Google Fonts; `img-src` blocks remote images; `frame-src` blocks map iframes).
- **noindex:** BaseLayout `robots` prop; booking pages `noindex, nofollow` (`booking/details` and 404 `noindex, follow`); admin `noindex,nofollow`; sitemap excludes `NOINDEX_PATH_PREFIXES`; robots.txt disallows server-rendered routes only (prerendered noindex pages stay crawlable so the tag is seen). `src/config/noindex.test.ts` fails if a new `prerender = false` route is missing from `ROBOTS_DISALLOW`.
- **Env vars** (`.env.example`): `PUBLIC_SITE_URL`, `PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `ADMIN_EMAIL`, `RESEND_API_KEY`, `EMAIL_SENDING`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `EMAIL_DEMO_ALLOWLIST`. Typed in `src/env.d.ts` (PUBLIC_* + `CONTEXT`). `.env*` gitignored. `src/test-setup.ts` deletes email env vars and stubs `fetch` to reject before every test.
- **Honeypot:** hidden `company` field (`contact/index.astro:96-99`, `aria-hidden`, `tabindex=-1`).
- **PII:** booking details travel in GET query strings (group → review → edit links), so they appear in browser history and server logs. Pay/success/error only take the opaque booking UUID.

---

## 7. SEO

- `src/lib/seo.ts`: `DEFAULT_OG_IMAGE '/og-default.jpg'` (1200×630), `socialImageFor(photo)` (build-time 1200×630 JPG crop), `absoluteUrl`, JSON-LD builders `organizationJsonLd` (TravelAgency with address/areaServed, stable `@id`), `websiteJsonLd`, `tourJsonLd` (TouristTrip + Offer when priced, provider `@id`), `destinationJsonLd` (TouristDestination), `faqPageJsonLd`, `breadcrumbJsonLd`. Used on `/`, `/faq/`, `/tours/[slug]/`, `/destinations/[slug]/`.
- Meta handled entirely in `BaseLayout` (title, description, canonical, OG, Twitter). Titles via `pageTitle()`. No `twitter:site`, no hreflang, single language (en, `og:locale en_GB`).
- Sitemap: `@astrojs/sitemap` → `sitemap-index.xml` (only when `PUBLIC_SITE_URL` set). robots.txt generated.
- Share images: tour/destination pages use their own photo crop; placeholders fall back to the default.
- Favicon: `public/favicon.svg` is the **abandoned navy `#003D84` "HBC" monogram (Glorich font)** — inconsistent with the teal brand; `apple-touch-icon.png` 180×180; `favicon.ico`. `SITE_THEME_COLOR` teal.
- Docs: `docs/seo-lighthouse-audit.md`.

---

## 8. Accessibility patterns in place

- Skip link "Skip to content" → `#main` (`SiteLayout.astro:45`, AdminLayout); every page's `<main id="main">`; admin main `tabindex=-1`.
- Focus: `:focus-visible` 2px teal outline offset 2px (`global.css:21`); form controls have `outline: none` and rely on border colour on `:focus` (`_base.css:41-56`) plus the focus-visible rule.
- `.sr-only` utility; sr-only `<h1>` on home and checkout pages.
- Header: `aria-current="page"|"location"`, `aria-expanded`/`aria-controls` toggle, focus trap, Escape, `inert` on covered content, focus restore.
- Reduced motion: global `prefers-reduced-motion` kill-switch for animations/transitions (`_base.css:15-27`), nav hide disabled, HeroCarousel stops autoplay, destination marquee has a Pause/Play button (WCAG 2.2.2).
- Touch targets: `--touch-min: 2.75rem` (44px) on buttons, chips, nav close.
- `aria-disabled` instead of `disabled` for submit/stepper buttons (keeps focus); `aria-live` regions for calendar month, CTA hint, catalog result counts, gallery position, contact status (`role="status"`); `role="alert"` for booking/payment errors.
- Calendar days: full date `aria-label`, `aria-pressed` selection, `aria-current="date"` for today.
- Filter/category chips: `aria-pressed`. FAQ: `aria-expanded` + `aria-controls`. Carousel: `aria-roledescription` carousel/slide, `aria-hidden` on inactive slides. ImageGallery buttons kept outside the `role="img"` hero.
- Headings: page h1 → section h2 → card h3 (fixed in PR #1). Decorative icons `aria-hidden="true"` throughout.
- About page: horizontally scrolling rows become focusable `role="region"` only when they overflow.
- Text contrast tuned (`--palette-gray-550 #696969`, `--color-text-accent #137556` because teal-500 on white is only 3.4:1 — teal is for icons, not body text).

---

## 9. Tests, CI, scripts

`pnpm test` = `vitest run` (config `vitest.config.ts` uses `getViteConfig` so `astro:assets` imports work; `include: src/**/*.test.ts`; setup `src/test-setup.ts`). **83 tests, all unit/logic — no component, DOM, e2e or visual tests:**
- `src/lib/booking.test.ts` (12): ISO dates, param parsing, required details, paths, instant-book/price unit, meeting point.
- `src/lib/price.test.ts` (4): parsing + every catalog price parses.
- `src/lib/contact-validation.test.ts` (4), `src/lib/contact-api.test.ts` (5): POST /api/contact.
- `src/lib/seo.test.ts` (3), `src/lib/links.test.ts` (1, trailing slashes).
- `src/data/catalog.test.ts` (7): unique slugs, booking types, destination refs, `_redirects` ↔ `REMOVED_TOUR_SLUGS`.
- `src/config/noindex.test.ts` (3): robots/sitemap cover server routes.
- `src/lib/bookings/service.test.ts` (19), `src/lib/admin/admin.test.ts` (25): booking service, admin actions/guards, manifest/overbooking, schedule, CSV, demo email delivery, sample data.

`pnpm check` = `astro check && node scripts/icons.mjs --check`. Other scripts: `dev`, `build`, `icons`, `astro`. No `preview` (Netlify adapter). CI `.github/workflows/ci.yml`: on PR and push to main → pnpm install (frozen) → `pnpm check` → `pnpm test` → `pnpm build` with `PUBLIC_SITE_URL`. Netlify build `ignore` skips deploys when only non-site paths change (each prod deploy costs 15 of 300 free credits).

---

## 10. Existing redesign prep material

### `docs/redesign/` (written for a "Cursor agent"; mostly **stale**)
- **00-INDEX:** map of docs; "design is authoritative for layout/pages, tour data from 03-TOUR-DATA.json, images placeholder first, preserve booking/contact behaviour".
- **01-AGENT-BRIEF rules:** (1) Astro 6 + Vue, keep Netlify; (2) design is authoritative for pages (may add/remove/rename); (3) tour data authoritative in code — don't invent titles/prices/itineraries; (4) placeholders first, don't wire real photos in phase 1; (5) preserve functional behaviours in doc 06. "Replace freely": components, CSS/tokens, page markup/section order, Astro-vs-Vue split. "Keep (logic)": tour-catalog.ts, tour-photos.ts structure, lib/tours.ts, lib/booking.ts (`supportsInstantBook`, `contactHrefForTour`), contact-validation, `/api/contact`, `_redirects`. **Stale facts in it:** "10 active tours" (now 7), "5 retired slugs" (now 8), featured list includes retired `three-islands`/`hvar-pakleni`, "codebase is Astro-only, no Vue yet" (Vue is in), "instant book works for 9 tours" (now 4), `src/assets/tours/*` (doesn't exist; photos are in `src/assets/destinations/`), placeholder-first rule (real photos already wired).
- **02-PAGES-AND-COMPONENTS:** legacy inventory listing components that no longer exist (Hero, WhyUs, FAQ.astro, WaveDivider, TourSection, TourCarousel, `config/typography.ts`), only 11 routes, Header nav "Home, Tours, Why us…". Useful only for the role-tag legend and the "design → data" cheat sheet; **do not trust as current**.
- **03-TOUR-DATA.json:** historical snapshot; live catalog is `tour-catalog.ts`.
- **04-IMAGE-ASSETS / 05-SITE-COPY:** photo registry and site copy references (04 references removed files).
- **06-FUNCTIONAL-BEHAVIORS key points:** instant-book vs contact routing decided by data; contact form fields/limits/honeypot/timing/body cap/response shapes (still accurate); tour preselect via `?tour=`; retired-slug 301s must survive; a11y patterns to preserve (skip link, mobile nav inert, focus rings, 44px targets, sr-only). Its booking section is outdated (header admits it): it describes `review → /booking/success`, `?tourId=` success page, "email not implemented" — superseded by `/api/bookings` → `/booking/pay` → success/error and Resend.

### `new-pages-design/` (July 2026)
15 files: `00-project-docs.md` + 14 standalone HTML mockups (01-homepage … 14-contact, incl. 05-group-booking, **06-private-booking**, 07-booking-summary, 08/09 payment success/error, 10-destination-detail, 11-faqs, 12-legal-pages, 13-about). They are **Claude-chat design mockups for a placeholder brand "Adriatic Sails" (Dubrovnik, two boats, €95/€55 pricing, Stripe assumed)**, using claude.ai design-system variables (`--color-text-*`, `--border-radius-md/lg`, `#1D9E75` brand green, Tabler from CDN, two font weights). **The current site was ported from these** (same class names: `.step-bar`, `.tour-snap`, `.also-strip`, `.cal-grid`, `.hold-note` …; token names match). So this folder is the *origin of the current look*, not the new redesign. The doc lists page inventory, booking-flow architecture (group + private flows merging at summary), page decisions, content still needed (real crew, press, trust numbers, insider tips, legal review, AZOP number), and open decisions (holds, payment provider, availability, sold-out, weather widget, CMS, i18n).

### Branch `feat/design-canvas-port`
Fully merged into main as PR #2 (merge `2c2bb02`; branch tip `8176cae`, 2026-09-12; 0 commits ahead of main, 26 behind). It ran 10 commits (2026-09-11/12) that wired real destination photography, rebuilt the catalog/destinations from the "verified FigJam" board, fixed quote-only routing, group-booking departure times and pricing, and copy cleanup (51 files, +963/−417). The earlier commit `b764c9f` "Align site to final redesign with checkout chrome and homepage hero" (Cursor co-authored) is where the July mockups were ported. **Not relevant as a base**; historical only. Safe to ignore/delete.

### `docs/post-mobile-implementation-plan.md` (summary)
A 3-PR plan from July 2026 covering everything except real photos: PR1 a11y/markup (nested anchors in destination cards, `aria-pressed`, FAQ nav, mobile-nav keyboard, card titles as h3, duplicate "Also nearby"), PR2 copy consistency + booking-CSS dedup (single cancellation copy source), PR3 SEO/infra + CSS modularisation (PUBLIC_SITE_URL guard, noindex `/booking/details`, tour→destination links, split the 64 KB `redesign.css` into modules — Phase A file split only, Phase B page-scoped imports "if time", CSP, PWA basics, robots sitemap URL). Deferred: real photos, Tabler → inline SVG, booking product decisions, interactive map, hero photo, email templates. All three PRs have since merged (PR #1, #5, #6); **Phase B CSS scoping was not done** and inline-SVG icons remain deferred.

### `docs/mobile-homepage-audit-summary.md` (summary)
Record of two July 2026 sessions auditing 19 routes on mobile against the HTML mockups: breakpoints 768/480, gutter tokens, 960px max; fixed hero overlap hacks (absolute badge/quick-search, trust-bar margin hacks), booking step bar clipping, policy-note overflow, 16px inputs for iOS, FAQ 48h copy, destinations grid vs carousel rules, sticky-card offset vs sticky nav, catalog min-width overflow at 320px, touch targets. Lists the six surfaces where the 48h cancellation copy must stay aligned. Its "still open" items (nested `<a>`, mobile nav Escape/focus trap) are now fixed; the quick-search and hero badge it mentions no longer exist in markup.

### Other docs
`docs/bookings-payments-email-backoffice-plan.md` (502 l, 2026-10-11): showcase scope §0, target real flow (Teya primary, PayPal secondary, fiscalization blocker, Resend, Postgres data model sketch, phased to-do). `docs/seo-lighthouse-audit.md`, `docs/gallery-image-quality-fix.md`, `docs/TOUR-CATALOG-AND-PHOTOS.md`. `README.md` booking-flow and contact-email sections are outdated (pre-showcase).

---

## 11. Known open issues — verified

1. **Highlights bug — STILL TRUE.** `src/components/tour/TourDetailView.astro:94-109`: the "Highlights" section maps `tour.included` (lines 97-98) with decorative icons, so it repeats "Fuel and boat expenses / Snorkelling equipment / Bottled water / Safety equipment" — the same list shown again under "What's included" (`:136-144`). `TourDetail` has no `highlights` field (destinations do). Fix needs a data decision (add `highlights: string[]` per tour, or derive from itinerary/`overviewHighlights`) — note also the icon list is arbitrary (`sunset-2, swimming, bottle, binoculars…` by index).
2. **`--font-display` undefined in NotFoundPanel — STILL TRUE**, and worse: `src/components/NotFoundPanel.astro:20-36` uses 7 undefined tokens (`--content-form`, `--page-padding-y/x`, `--font-display`, `--text-2xl`, `--font-weight-bold`, `--color-nav`, `--color-muted`) left over from an earlier design system. Practical impact is nil today because the only usage (`tours/[slug].astro:57`, tour-not-found branch) is unreachable with `getStaticPaths` (unknown slugs hit `404.astro`). Candidates: delete the component or restyle it with current tokens.

Other verified issues found while reading:
- `/booking/details/` is orphaned (no inbound links).
- Destination sidebar "Current conditions" shows a hard-coded "—" temperature and generic note; contact "Open now" badge is static.
- `src/lib/destinations.ts:22-27` `bestTimeBarStyle` returns inline hex colours `#5DCAA5`, `#9FE1CB`; legend repeats `#9fe1cb` at `destinations/[slug].astro:530`.
- `README.md` and `docs/redesign/*` describe an older flow.
- Favicon is the off-brand navy monogram.
- Dead CSS: `.private-booking-page` rules in `_responsive.css` (no such page); `--border-radius-*`, `--color-accent-dark`, `--color-icon-sunset`, `--color-background-warning-soft`, `--palette-gray-500`, `--palette-amber-400` unused.
- Tour detail hero image is always a placeholder colour block (tour `image` has no `src`).
- Booking charges peak-season prices year-round (copy says "Final price confirmed at booking").
- About/trust content (crew names, "4.9 ★", quotes) looks fabricated placeholder copy.

---

## 12. Redesign risk factors

1. **One global stylesheet for everything.** All 8 modules (~4,100 lines, 62.6 KB built) load on every page, including admin. Generic, unprefixed class names (`.page`, `.layout`, `.section`, `.card`, `.row`, `.label`, `.value`, `.highlights`, `.info-grid`, `.sticky-card`, `.card-title`, `.section-title`) are styled globally and then re-styled per page with scoped CSS and `:global()` overrides — changing a global rule ripples across unrelated pages.
2. **`_responsive.css` is a cross-module override file** that must load last; it holds ≤768/≤480 overrides for selectors from home, catalog, tour detail, destination detail, booking, legal/about, footer and nav (~70 selectors). Any module rewrite has to be mirrored there or the file has to be dissolved into per-component media queries.
3. **Admin depends on public styles.** `AdminLayout.astro` explicitly reuses `.nav*`, `.btn-*`, `.filter-chip`, `.trust-item`, `.next-item`, `.warn-box`, `.highlight-box`, `.exit-link`, checkout card/row classes, plus a 696-line `is:global` block. A public-site restyle will visibly change the admin unless the admin gets its own namespace or keeps the old styles.
4. **Islands without their own styles:** `ToursCatalog.vue` and `HeroCarousel.vue` have no `<style>`; they depend on `_catalog.css`/`_home.css`. `ToursCatalog.vue` duplicates `TourCard.astro` markup, so card redesign must be done twice (or unified).
5. **Duplicated markup/styles:** 4-step progress bar hand-written in `group.astro` and `review.astro`; legal tab bar + side nav repeated in 3 legal pages with near-identical scoped CSS; `.card-title`/`.cta-btn`/`.section-title` defined in several places; booking pages each carry 100–240 lines of scoped CSS.
6. **No type/spacing scale:** 470 literal `font-size` values (10–56px), literal paddings/margins/gaps, `0.5px` hairlines ×104, `border-radius: 20px` pills ×10 and `50%` ×21 not tokenised. A new token file will not take effect without touching nearly every rule.
7. **Hard-coded colours outside tokens:** `_home.css` `#0a3a6e` hero fallback ×2 and ~11 `rgb()` overlays/shadows/text-shadows; `_base.css` nav rgba backgrounds/shadows; `_booking.css:364,463` `#fdecea`; `_legal-about.css:23` `#ebebea`; `#1d9e75` in `booking/details.astro:145`, `booking/error.astro:141`, `booking/success.astro:244,341`; `GroupBookingFlow.vue:47` `'#EF9F27'` slot icon; `lib/destinations.ts` bar colours; ImageGallery/admin rgba overlays; placeholder colours in `tour-photos.ts`, `destination-photos.ts`, `hero-image.ts`; email templates (16 hex values, must be restyled separately — email can't use CSS vars); `SITE_THEME_COLOR`, manifest `background_color`, `favicon.svg` (navy), `og-default.jpg`, `apple-touch-icon.png`.
8. **Inline styles:** `TourImage.astro:43` / `ToursCatalog.vue:219` (`--placeholder-color`), `ImageGallery.vue:73,128` (placeholder background), `destinations/[slug].astro:175` (bar height/background), `FAQPage.vue:157` (category icon colours via var strings), `GroupBookingFlow.vue:324` (slot colour), admin seat bars and thumbs. CSP must keep `style-src 'unsafe-inline'` unless these are removed.
9. **Brand/legacy alias tokens:** `--color-accent-teal` (29 uses) and `--badge-*` aliases, plus `--palette-*` referenced directly from components, so a palette swap needs alias cleanup to avoid half-migrated colours.
10. **Font changes touch CSP and performance:** no web fonts today; `font-src 'self'` means self-hosting (e.g. via `@fontsource` or files in `src/assets/fonts`) is the CSP-friendly path; Google Fonts would need `style-src`/`font-src` changes. Icon font uses `font-display: block` and is preloaded.
11. **Icon pipeline:** any new Tabler icon requires `pnpm icons` (network) and regenerated files committed, else `pnpm check` fails CI. Icons referenced dynamically must sit in an "icon context" line for detection. A switch to inline SVG was deferred (8–16 h estimate).
12. **Hydration-sensitive islands:** `GroupBookingFlow` relies on `renderedOn` to match the prerendered calendar; HeroCarousel/ImageGallery/catalog islands render SSR HTML that Vue hydrates — markup changes must stay identical between server and client.
13. **Behaviour coupled to markup IDs/classes:** `contact-form.ts` (`#contact-form`, `#contact-status`, `#contact-started-at`, `#tourSlug`, field ids = `ContactFieldName`), Header script (`#site-header`, `#menu-toggle`, `#menu-close`, `#primary-nav`, `.nav-logo`, `.nav-cta`, `main`, `.footer-shell`, `.skip-link`), about scroll regions (`data-scroll-region`), destination marquee (`.marquee-toggle`, `.highlights-marquee`), pay page `form[method="post"]`, `.cf-turnstile`.
14. **Tests guard behaviour, not visuals:** trailing-slash links, robots/sitemap coverage, redirects, prices. Nothing catches visual regressions; no screenshot baseline exists.
15. **Placeholders vs real content:** only 5 of 10 destinations have photos; tour heroes are placeholders; about/trust numbers unverified — a photo-led redesign will expose these gaps.
