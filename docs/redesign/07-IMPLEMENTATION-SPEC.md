# Redesign implementation spec: Hello Blue Cave (October 2026 design)

> **Status:** plan only. No code has been written. Revision 2 (after adversarial review), 2026-10-13.
> **Written against:** branch `feat/email-map-link-overbooking` @ 882dbc3. It contains `feat/booking-showcase-mock`.
> **Design source:** the claude.ai design canvas "Hello Blue Cave" (`https://claude.ai/artifact/1bUXBdz8gq6F7o3T9on2Be`): 14 page boards plus 4 homepage versions, exported 2026-10-11.
> **Supersedes:** `docs/redesign/00–06` (stale July-build docs) for anything visual. `docs/bookings-payments-email-backoffice-plan.md` stays the source for payments, fiscalization and the backoffice.

---

## Start here

**What this is.** Re-skin the whole public site to the October 2026 design:
- teal accent becomes blue, with orange only for buttons on photos
- body text goes from 14px to 16px
- an uppercase display face on photo heroes and homepage section titles
- photo-led homepage, Tours and Destinations pages
- a lightbox gallery

On top of the re-skin:
- add a **private charter request** page
- fix booking privacy (no personal data in URLs) and remove dishonest copy
- freeze the admin's look first, re-skin it last

**Rules you can't break:** §2. The short version: WCAG 2.2 AA, no invented facts, prices computed on the server, strict CSP, Netlify Free, design tokens only. Don't commit or push unless the owner asks. Run tests with `RESEND_API_KEY=` empty.

**Before coding:**
1. Ship the two **live-site hotfixes** (§15, PR 0a). Production is affected today.
2. Answer the **blocking** decisions in §1: D-4, D-7, D-8, D-21.
3. Turn on Netlify deploy previews for the redesign branch (§15).

**For each PR:** read its row in §15, then only the sections it cites. The Definition of done is in §14.4.

**Where facts live:** `src/data/*` and `src/config/*`. Never take them from the design boards: their copy and numbers come from an "Adriatic Sails" Dubrovnik template.

---

## 0. How to read this spec

### 0.1 What the design decides, and what it doesn't

| Layer | Source of truth |
|---|---|
| Look: colour, type, spacing, layout, section order, components, motion, responsive behaviour | **Design**. Homepage v4 for `/`. |
| Page inventory and routes | **Design**, mapped onto current routes (§0.2) |
| Business facts: tours, prices, times, meeting point, phone, email, season, policies | **Current code** (`src/data/*`, `src/config/*`) |
| Behaviour: validation, booking logic, server price recompute, anti-spam, rate limits | **Current code**, plus the changes in §8 |
| Accessibility | WCAG 2.2 AA (§11). Where the design falls short, we fix it and mark it [DEVIATE]. |
| Marketing claims: ratings, guest counts, years, press, crew, "best seller", licences | **Owner-confirmed facts only** (§17). Hidden until confirmed. |

### 0.2 Board → route map

| Board (canvas title) | Export file | Route | Current code |
|---|---|---|---|
| 01 Homepage v4 (target) | `Main-n19w-fhxd-j4z6.dc.html` | `/` | `src/pages/index.astro`, `HeroCarousel.vue`, `FAQAccordion.vue`, `TourCard.astro` |
| 01 Homepage v1–v3 | `Main*.dc.html` | reference only | – |
| 02 Tours overview | `Tours.dc.html` | `/tours/` | `tours/index.astro`, `ToursCatalog.vue`, `lib/tour-filters.ts` |
| 03 Tour detail | `TourDetail.dc.html` | `/tours/[slug]/` (7) | `tours/[slug].astro`, `tour/TourDetailView.astro`, `ImageGallery.vue` |
| 04 Destinations overview | `Destinations.dc.html` | `/destinations/` | `destinations/index.astro`, `DestinationsCatalog.vue` |
| 10 Destination detail (Hvar) | `DestinationDetail.dc.html` | `/destinations/[slug]/` (10) | `destinations/[slug].astro` |
| 05 Group booking | `GroupBooking.dc.html` | `/book/[slug]/group/` | `book/[slug]/group.astro`, `GroupBookingFlow.vue` |
| 06 Private charter | `PrivateBooking.dc.html` | **new** `/private-charter/` (§8.2) | none; today it goes to `/contact/?tour=…` |
| 07 Booking summary | `BookingSummary.dc.html` | `/book/[slug]/review/` | `book/[slug]/review.astro` |
| no board | – | `/booking/pay/` | `booking/pay.astro`, the demo checkout. Keep it. |
| 08 Payment success | `PaymentSuccess.dc.html` | `/booking/success/` | `booking/success.astro` |
| 09 Payment error | `PaymentError.dc.html` | `/booking/error/` | `booking/error.astro` |
| 11 FAQs | `Faqs.dc.html` | `/faq/` | `faq/index.astro`, `FAQPage.vue`, `data/faq.ts` |
| 12 Legal (3 tabs) | `Legal.dc.html` | `/legal/terms/`, `/legal/privacy/`, `/legal/cancellation/` | `legal/*.astro` |
| 13 About | `About.dc.html` | `/about/` | `about/index.astro`, `data/about.ts` |
| 14 Contact | `Contact.dc.html` | `/contact/` | `contact/index.astro`, `client/contact-form.ts`, `api/contact.ts` |
| Artboard 1 | `Artboard-qbg9.dc.html` | – | empty leftover; ignore |
| no board | – | `/404` (§7.6), `/admin/*` (§12) | restyled with the new tokens |
| no board | – | `/booking/details/` | deleted (D-20) |

**Reference copy.** PR 0b copies the design export into `design/2026-10/`: the boards, `hbc.css`, `canvas.json`, and the research and review notes. Blob images are left out. No `netlify.toml` change is needed. Its `ignore` rule lists the paths that **do** trigger a build (`src public scripts package.json …`), so `design/`, `tests/` and `playwright.config.ts` changes already skip builds. Don't add them to that list: that would make them trigger builds.

### 0.3 Labels used in this spec

| Label | Meaning |
|---|---|
| [KEEP] | Current behaviour or markup stays; only the styling changes. |
| [NEW] | New UI, data or code. |
| [CHANGE] | Behaviour or copy differs from today, or from the board, for a stated reason. |
| [DROP] | Removed. |
| [DEVIATE] | We knowingly differ from the design. The reason is always given and must be one of: business fact, accessibility, security/privacy, legal, or a technical defect in the board. Taste is not a reason. |
| D-n | The item is shaped by owner decision D-n (§1). |
| S-n | Security/privacy item S-n (§10). |
| C-n | Content item C-n (§17). |

---

## 1. Decisions

The columns are:
- **Default:** what gets built if nobody answers.
- **Blocks:** set only where a decision **must** be answered before that PR merges.
- **Decided by:** owner (Luka or the boss), agency (ST Agency), or lawyer.

| ID | Question | Default | Blocks | Decided by |
|---|---|---|---|---|
| D-1 | Which homepage version ships? | **v4** ("trust band below hero"). Every board's logo links to v3, but that's a stale link. | – | owner |
| D-2 | What goes in the header's right slot? | **As designed:** outline **"Contact"** → `/contact/` on overlay (photo-hero) pages: home, Tours, Destinations. Solid blue **"Book now"** → `/tours/` on all solid pages. | – | owner |
| D-3 | Language switcher (EN/HR/DE/IT/FR, homepage v2–v4 only) | Not rendered until translations exist. A switcher that does nothing is a broken control. The lawyer also checks whether terms, privacy, cancellation and the confirmation email must exist in Croatian (consumer protection law, ZZP); see D-18. | – | owner + lawyer |
| D-4 | **Glorich** display font: may it be embedded on the web (woff2 served from our domain)? | It came with the ST Agency brand kit (commit `eeef9ff`, Bold/Light/Medium TTF). Recover Bold with `git show eeef9ff:public/fonts/glorich/Glorich-Bold.ttf`. **If the licence isn't confirmed by the time PR 1 opens, ship Anton** (SIL OFL, self-hosted, Latin Ext-A subset). Second choice is Oswald 700. Switching later is a one-file change. **Answered 2026-10-14: ship Anton now; switch to Glorich once the agency confirms the web licence.** | – (answered) | agency |
| D-5 | Are ratings and reviews shown ("4.9 from 800+ reviews", review cards, "500+ happy guests", "4,200+ guests this season")? | Hidden until there is a source and the Omnibus disclosures in §6.1.9 are in place. Layouts work without them. | – | owner |
| D-6 | Preview video ("0:22 · A day on the water"): is it our footage, and may we use it? | Hidden until confirmed, and until the credit check in §3.4 passes. | – | owner |
| D-7 | Private charter flow | A **request with an optional estimate**, not a payment (§8.2). The design takes payment before availability is confirmed, and its "48h free cancellation" contradicts its own 30% deposit rule. | **PR 8** | owner |
| D-8 | Charter routes and durations (blocking); price table and extras (optional) | The owner supplies Split-accurate routes and the durations offered. Without a price table, no estimate is shown ("We'll send a quote"). Without extras, the extras card is hidden. | **PR 8** (routes and durations only) | owner |
| D-9 | Age bands and infants | Add an **"Infants (0–2), free"** counter that **counts toward the 12-seat cap** (safety). Adult and child bands come from the catalog. | – | owner |
| D-10 | Contact form fields | As designed: **first + last name**, joined into `name` on the client so the API doesn't change; a **Subject** select with the board's 6 options (new optional `topic` field); plus the Tour select, so `?tour=` deep links keep working. | – | owner |
| D-11 | Destination detail drops "Best time to visit" and "Also nearby" | Follow the design (drop both). "Best season" stays in the aside. | – | owner |
| D-12 | Tour detail drops Highlights, destination chips and "Please note" | Drop Highlights (also fixes the bug where it repeats `included`) and the chips. **[DEVIATE, legal] Keep "Please note"**: the operator-supplied caveats have legal weight. | – | owner |
| D-13 | Destination weather widget ("Sunny 28°C") | Remove it. Static weather is misleading. | – | owner |
| D-14 | Founding year | Copy computes years from `FOUNDING_YEAR`. The default is **2016** (current site); the design says 2015. | – | owner |
| D-15 | Season dates | **1 Apr – 30 Nov** (`tour-catalog.ts`), moved into `src/config/season.ts`. Calendar dates outside the season are disabled. | – | owner |
| D-16 | Departure slots per tour | Data-driven `departures[]`. One slot per tour today, and **none (time to be confirmed) for `blue-lagoon-afternoon`**. | – | owner |
| D-17 | Should the admin follow the new look? | Yes, last. PR 0b freezes its look; PR 10 re-skins it. It must keep looking like "the site's own back office". | – | owner |
| D-18 | Legal texts: imprint, controller, processors, legal bases, transfers, retention, complaints, jurisdiction, Croatian versions, accessibility statement under the European Accessibility Act (EAA) | Facts that need no legal judgement ship with PR 6. Everything that needs judgement goes through the lawyer in PR 11. **The privacy policy must name the controller and the real processors before PR 7b or PR 8 reach production** (S-10). | PR 7b and PR 8 go-live | lawyer + owner |
| D-19 | Footer "Tours" column | As designed, minus the product that doesn't exist: Group tours → `/tours/?type=group` · Private charters → charter URL (§9.3) · Day trips → `/tours/` · **[DROP] Sunset cruises** (no such product). | – | owner |
| D-20 | `/booking/details/`: an orphan page with no design | Delete it and 301 to `/faq/`. | – | owner |
| D-21 | Which branch does Netlify publish to production? | **Answered 2026-10-14: `main`.** The showcase and email work merged into `main` (PR #11, #12). `feat/redesign` is cut from `main` plus the PR 0a follow-up (`fix/security-hardening`). Hotfixes go to `main` first (§15). | – | owner |
| D-22 | Customer auto-reply for charter requests and contact messages | **No**, for now. Allowed only once Turnstile is live and a per-recipient limit exists (S-6). | – | owner |
| D-23 | What happens to `/tours/create-perfect-day-private/`? | **Keep it** as the indexable charter landing page. Its primary CTA becomes "Plan your charter" → `/private-charter/?tour=create-perfect-day-private`. `/private-charter/` itself is a noindex form page. | – | owner |
| D-24 | Show the destination "at a glance" aside on phones? The design hides it at ≤768px. | **[DEVIATE, business]** Show it after the main column, so phones keep the charter CTA. | – | owner |
| D-25 | FAQ h1 case | **[DEVIATE, consistency]** Sentence case. On the board, the FAQ h1 is uppercase only because of a stray global `.hero h1` rule. | – | owner |
| D-26 | Is the business a micro-enterprise under the European Accessibility Act (EAA)? | If not, PR 11 adds an `/accessibility/` statement, linked from the footer. | – | owner + lawyer |

---

## 2. Non-negotiables

Every PR is checked against these.

1. **WCAG 2.2 AA.** §11 is the checklist. Never port the design's `outline: none`.
2. **No invented facts.** Prices, times, places, contact details and policies are rendered from `src/data` and `src/config`. These appear only after owner confirmation (§17):
   - ratings, counts, press, crew, years, "best seller", licence claims
   - fees and inclusions
   
   Unconfirmed items are **hidden**. They are never shown as fact and never kept "for now".
3. **The server computes every price it stores or charges.** That covers group totals and charter estimates. Prices on the page are display only.
4. **No card data on our pages.** Payment is Teya Hosted Checkout or PayPal (later); today it's the demo `/booking/pay/`.
5. **No personal data in URLs, logs or redirects.** Booking state moves in a sealed HttpOnly cookie (§8.1.6). Redirects carry only opaque IDs and error codes.
6. **Strict CSP, no third-party origins:**
   - fonts, images and video are self-hosted
   - no analytics, no embedded maps, no Google Fonts
   - the only third-party origin allowed is Cloudflare Turnstile (already in the CSP)
   - every response carries the security headers, server-rendered ones included (S-7)
7. **Netlify Free (300 credits/month, the site pauses at zero), Resend free tier, Turnstile free.** Every new endpoint and media file states its credit or quota cost (§3.4, S-6). Image processing stays at build time.
8. **Design tokens.** These are always tokens (§4): colour, font-size, font-weight, line-height, radius, shadow, z-index, motion, and the section/page gaps.
   - **Component dimensions** taken from a board may be literal `px` in that component's scoped style, with a `/* board 0x */` comment. That covers widths, heights, image sizes and one-off paddings.
   - `pnpm check` runs `scripts/tokens-check.mjs` (§4.6). It fails on raw `#hex`, `rgb(`, or `rgba(` outside the allowed files.
9. **Repo rules stay in force:**
   - trailing-slash internal links (`links.test.ts`)
   - icons added through `pnpm icons` (`pnpm check` fails otherwise)
   - every `prerender = false` route under a `ROBOTS_DISALLOW` prefix (`noindex.test.ts` discovers them automatically)
   - public pages prerendered
10. **Script hooks survive.** These IDs and attributes are used by scripts. Keep them, or move them together with their script:
    - contact form: `#contact-form`, `#contact-status`, `#contact-started-at`, field IDs, `.cf-turnstile`
    - header: `#site-header`, `#menu-toggle`, `#menu-close`, `#primary-nav`, `.skip-link`
    - `data-scroll-region`
    - the pay page's `form[method=post]`
11. **Progressive enhancement.** Booking, charter and contact forms are real `<form method="post">` elements that work without JavaScript (§3.5).
12. **Analytics: none.** Adding any needs its own decision, a CSP change and a privacy-policy change.
13. **Browser support:**
    - last 2 versions of Safari (iOS and macOS), Chrome, Firefox and Samsung Internet
    - `<dialog>` is used
    - `:has()` is not required
    - `svh` units always come with a `vh` fallback

---

## 3. Architecture

### 3.1 CSS

Today one global stylesheet loads on every page, admin included: 8 modules, about 4,100 lines, 62.6 KB built. It uses generic class names and a cross-module override file, `_responsive.css`. Target structure:

```
src/styles/
  tokens/design.css     ← §4. Replaces tokens/redesign.css (which stays as an alias shim until PR 9)
  base.css              ← reset, body type, focus ring, .sr-only, .wrap, links, form controls, reduced-motion kill-switch
  global.css            ← layer order + imports (tokens, base, icons, and the legacy modules in layer(legacy))
  admin.css             ← PR 0b: frozen admin styles + its own --a-* tokens (§12)
```

**Cascade layers during migration:**

- Unlayered CSS beats every layered rule, so the legacy modules have to be put into a layer as well.
- `BaseLayout` emits `<style is:inline>@layer legacy, tokens, base, components, pages, utilities;</style>` as the **first** element in `<head>`, before any stylesheet. That fixes the layer order no matter which CSS chunk Astro emits first.
- `global.css`:

  ```css
  @import './tokens/design.css' layer(tokens);
  @import './base.css' layer(base);
  @import './icons.css' layer(base);
  @import './modules/_base.css' layer(legacy);
  /* …each remaining module… */
  ```

- New Astro component styles wrap their rules in `@layer components { … }`. Page styles use `@layer pages { … }`.
- Vue `<style scoped>` blocks wrap their rules in `@layer components { … }`.
- **PR 1 must confirm with a build** that Vue's scoped-CSS transform rewrites selectors inside `@layer`. If it doesn't, Vue islands import a plain `.css` file instead, wrapped in a layer and scoped by a root class.
- Legacy modules are deleted page by page as their pages are rebuilt. PR 9 deletes `_responsive.css` once it's empty.

**Breakpoints** (max-width queries; listed in a comment at the top of `tokens/design.css`):

| Width | Used for |
|---|---|
| 1024px | tablet |
| 768px | mobile layout, mobile nav |
| 480px | small phones |
| 640px | **one-off, as designed**: Destinations grid goes to one column |
| `(max-height: 480px)` | landscape and zoom safety (§11.14) |

The design's 1000px marquee breakpoint folds into 1024px. That's harmless (a 24px band) and avoids a breakpoint used once.

#### 3.1.1 Responsive behaviour per board

This table comes from the boards. Each page section links back to its row.

| Board | ≤1024 | ≤768 | ≤480 and other |
|---|---|---|---|
| Home | `--section-gap` 56; hero title and sub get text-shadow; trust band becomes a marquee; reviews become a scroller (`min(320px,82%)`, bleeding to the gutter) | hero text bottom-aligned with `padding-bottom` 168 and `object-position` 70%; dots at 70px, Explore at 16px; arrows hidden; trust text 14px; slider gutter 16, cards `min(300px,82%)`, arrow buttons hidden (pill stays); bento becomes a 280px scroll row at 3:2; steps 2 columns; types 1 column; video band 49%, play disc 64; CTA band padding `2rem 20px`, radius 16, buttons stacked (max 320) | `--section-gap` 44; hero panel max 375; bento items `min(280px,80%)`; steps 1 column; reviews bleed −12 |
| Tours | `--section-gap` 56 | hero 480, inner padding `0 16px 20px`; chips become one nowrap scroller bleeding right, sort chip `margin-left: 0`; types 1 column; steps 2 columns | steps 1 column |
| Tour detail | reviews scroller `min(340px,46%)` with edge masks | `--detail-gap` 28; thumbs `margin-bottom` 20; hero 3:2; single column ordered main → aside → reviews; aside not sticky; includes and info 1 column; lightbox arrows overlaid at 12px; mobile bar; page `padding-bottom` 72; reviews 82% | – |
| Destinations | – | hero 480; chips scroll | **≤640**: 1 column, gap 14, image 200 |
| Destination detail | – | `--detail-gap` 28; 1 column; geo 1 column; highlights marquee; aside after main (D-24); mobile bar | – |
| Group / charter | – | page padding 16; slots, guests, details and routes 1 column; date/time/duration grid 2 columns; calendar gap 2 | date/time/duration 1 column |
| Success | – | meet-up grid 1 column | – |
| FAQ / Legal | – | 1 column; category list and TOC static and stacked (as designed) | – |
| About | – | 2-column layout, trust grid and values all 1 column; crew becomes a scroller at 40% | crew 80% |
| Contact | – | contact grid and form fields 1 column | – |
| Footer | – | 2 equal columns | 1 column |

### 3.2 Component inventory

Use these names. If one is renamed in its PR, update this table.

| Component | File | PR | Replaces / used by | Spec |
|---|---|---|---|---|
| `Button` | `ui/Button.astro` (+ `.vue` twin) | 2 | `.btn-*`, `.cta-*`, `.type-cta`, `.also-btn`, `.hero-cta` | Variants: `primary` (blue fill), `secondary` (white, 0.5px border, grey hover), `on-image` (orange), `on-image-ghost` (glass), `tile` (grey → blue). Sizes: `sm` (padding 6px 14px, radius 8, 14px/500), `md` (40px, radius 10, 16px/600), `lg` (46px, radius 11, 16px/600). Renders `<a>` when it has an `href`, `<button>` otherwise. |
| `PillLink` | `ui/PillLink.astro` | 2 | `.slider-all`, `.dest-cta` | 36px tall, padding `0 14px 0 16px`, pill shape, 0.5px `--color-border-secondary`, white, 14px/500, 16px icon. Hover: grey background, arrow moves +2px. Variant `ghost`: transparent until hover. |
| `SectionHeader` | `ui/SectionHeader.astro` | 2 | `.section-header`, `.sec-title` | Variant `display` (home, Tours): h2 in the display face, `margin: var(--section-gap) 0 20px`, baseline-aligned. Optional `sub` (16/1.6, secondary, `margin-top` 8, max 520px; switches to flex-start with gap 16). `actions` slot. Variant `plain` (detail pages, About): 18px/500, `padding-bottom` 10, `margin-bottom` 14, 0.5px tertiary bottom hairline. |
| `PhotoHero` | `ui/PhotoHero.astro` | 2 | Tours and Destinations heroes | Spec in §6.2.1 |
| `Chip`, `ChipGroup` | `ui/Chip.vue` | 2 | `.filter-chip`, `.chip` | Spec in §6.2.1. `ChipGroup` is `role="group"` with an `aria-label`. |
| `Badge` | `ui/Badge.astro` (+ `.vue`) | 2 | `.tc-badge`, `.tag`, `.type-badge` | Tones: `brand`, `private`, `premium` (gold gradient), `tip`, `neutral` (white). `.tc-badge` is 13px/500, padding `4px 10px`, radius 6, `--shadow-badge`. `.tag` is 12px/500, padding `4px 10px`, radius 20, 11px icon. |
| `TourCard` | `vue/TourCard.vue` | 2 | `TourCard.astro`, the card markup in `ToursCatalog.vue`, **and** `destinations/[slug].astro:255-280` | Spec in §6.2.2. Rendered statically from Astro (no `client:` directive) and imported inside `ToursCatalog.vue`. |
| `DestinationCard` | `vue/DestinationCard.vue` | 2 | card markup in `DestinationsCatalog.vue` | Spec in §6.4 |
| `CtaBand` | `ui/CtaBand.astro` | 2 | home photo band; About and FAQ grey bands | Variants `photo` (§6.1.11) and `plain` (grey, radius 12, padding `1.25rem 1.5rem`, sans 17–20px/500 heading) |
| `EmptyState` | `ui/EmptyState.astro` (+ `.vue`) | 2 | catalog no-results | Centred, padding 2rem; 28px icon in `--color-border-secondary`; sentence; optional [NEW] "Clear filters" button |
| `ImageGallery` | `vue/ImageGallery.vue` (rebuilt) | 2 | tour and destination detail | Spec in §6.3.2 |
| `StickyAside` | `ui/StickyAside.astro` | 2 | tour booking card; destination at-a-glance | 1px `--color-border-card`, radius 12, padding 1.25rem, `position: sticky; top: calc(var(--site-header-height) + 16px)` |
| `MobileActionBar` | `ui/MobileActionBar.astro` | 2 | tour and destination mobile bars | Spec in §6.3.6 |
| `InfoTile` | `ui/InfoTile.astro` | 2 | Good to know, geo, stats | grey, padding `10px 12px`, radius 8; 12px uppercase tertiary label; 14px/500 value; rows equal height. **Never line-clamped on detail pages.** |
| `Breadcrumb` | `ui/Breadcrumb.astro` | 2 | tour and destination detail | `nav` > `ol`, 14px tertiary, `aria-current="page"` |
| `Notice` | `ui/Notice.astro` | 2 | `.warn-box`, `.highlight-box`, `.hold-warn`, error notes | Tones: `info` (`--color-background-highlight-soft`, 3px `--color-border-highlight` left bar, radius `0 8px 8px 0`, primary text 500), `warn` (amber-50, 3px amber-500 bar, text `--color-category-tip-text`), `danger` (red-100, red-900 text, radius 8, padding `10px 14px`), `neutral` (grey, lock icon) |
| `Marquee` | `ui/Marquee.astro` | 2 | trust band (≤1024), destination highlights (≤768) | Pause/play button placed before the track; duplicate set has `aria-hidden` and `inert`; real list kept for screen readers; static wrap under reduced motion (§11.4) |
| `Timeline` | `ui/Timeline.astro` | 2 | itinerary, About history | Variants in §6.3.3 and §7.4 |
| `StepBar` | `booking/StepBar.astro` | 2 | progress bar duplicated in group and review | §8.1.1 |
| `SummaryCard` | `booking/SummaryCard.astro` (+ `.vue`) | 2 | summaries in group, review, pay, success and charter | grey, padding `1.1rem 1.25rem`; label/value rows; total 17px/500 (20px/500 on review) |
| `FormField` | `ui/FormField.vue` (+ `.astro`) | 2 | every form | Label 13px/500 uppercase tertiary, letter-spacing .05em; optional hint; error text wired up with `aria-describedby`; required marker |
| `TrustBand`, `TypeCards`, `HowItWorks`, `DestinationTile`, `ReviewCard`, `ReviewSummary` | `home/*.astro` | 3 | homepage and Tours | §6.1 |
| `FAQAccordion` (restyled) | `vue/FAQAccordion.vue` | 3 | home FAQ, FAQ page groups | Separate trigger, `hidden` panel, `aria-controls` [KEEP] |
| `LegalLayout` | `layouts/LegalLayout.astro` | 6 | tab bar and TOC repeated in 3 legal pages | §7.2 |
| `BookingCalendar` | `vue/booking/BookingCalendar.vue` | 7b | extracted from `GroupBookingFlow.vue` (957 lines) | §8.1.2; reused by the charter page |
| `GuestSteppers` | `vue/booking/GuestSteppers.vue` | 7b | group and charter | 2-column grid of grey rows (padding `10px 12px`); 28px stepper buttons; prop for the seat cap |
| `ChoiceCards` | `vue/booking/ChoiceCards.vue` | 7b | slots, routes, pay methods | **Native** `<input type=radio>` inside `<label>` cards within `fieldset`/`legend`. Selected: 2px brand border + blue-100 fill. |
| `CharterRequest` | `vue/CharterRequest.vue` | 8 | charter page island | §8.2 |

### 3.3 Fonts

- **Body and UI:** the system stack, `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif`. **[DEVIATE, technical]** `Roboto, Arial` are added before `sans-serif` so Android and Linux render the same as today; the board's stack falls back to the platform default. Nothing to load.
- **Display face (D-4):** Glorich 700, or the fallback.
  - Build it with `scripts/fonts.mjs` (new). It reuses the existing `subset-font` devDependency (`targetFormat: 'woff2'`) and subsets to Basic Latin, Latin-1 and Latin Extended-A (č ć š ž đ), with ligatures kept (`liga`).
  - **Check the face has those glyphs**; if it doesn't, Croatian names fall back to the sans.
  - Output goes to `src/assets/fonts/display-700.woff2`, with the licence file next to it as `LICENSE-display.txt`.
  - `@font-face` with `font-display: swap`, plus a metric-matched local fallback (`size-adjust`, `ascent-override`) to keep layout shift down.
  - **Preload:** `BaseLayout` and `SiteLayout` get a pass-through `fontPreload` prop, set to true on home, Tours and Destinations only. It uses the same `?url` + `<link rel=preload crossorigin>` pattern as the icon font.
- **Where display type appears (as on the boards):**
  - home slide titles
  - Tours and Destinations hero h1s
  - home and Tours section titles, including the video h2
  - the home CTA band h2

  It's always uppercase, with `font-variant-ligatures: common-ligatures` and `font-feature-settings: "liga" 1, "kern" 1`.

  Every other heading uses the sans in sentence case: detail pages, booking, About, Contact, Legal and FAQ (D-25), and the grey CTA bands.
- **Icons:** stay self-hosted. Bump Tabler in `scripts/icons.mjs` from 3.44.0 to 3.48.x (§4.7).

### 3.4 Images and media

- **Use real photography.** Tour and destination photos stay the repo's own (`src/assets/destinations/**`, `tour-photos.ts`). The design's blob images are mock imagery reused for unrelated places.
- **Assets adopted from the design** (PR 0b downloads them once the owner confirms the rights, C-17):

  | Asset | Blob ID |
  |---|---|
  | Home hero slides | `6db22cf5…`, `017adfe4…`, `796f7f6b…` |
  | Tours hero | `6db22cf5…` |
  | Destinations hero | `32dfc7c5…` |
  | Video band and CTA band background | `85382a42…` |
  | Video poster | `3f803310…` |
  | Video | `db259683…` |
  | Brač tile | `4938740a…` |

  Store them in `src/assets/site/` with a provenance comment.
- **Hero images and the carousel island:**
  - `<Picture>` can't render inside the Vue island.
  - `index.astro` computes each slide's image set with `getImage()` and passes `{src, srcset, sizes, alt, position}[]` to `HeroCarousel` (the same pattern as today's `heroSrcset`).
  - Slide 1 renders as `<img fetchpriority="high">`, preloaded as today (`<link rel=preload imagesrcset>`).
  - Slides 2–3 render **without** `src`/`srcset`. The island sets them one slide before they show, or on `requestIdleCallback` after `onMounted`. `loading="lazy"` doesn't help here: stacked full-bleed images count as in the viewport.
- **Video (D-6):**
  - Self-hosted in `public/media/`: H.264 MP4, 720p, **≤ 2 MB**, **audio track stripped** at encode time, so it counts as video-only (§11.11).
  - `preload="none"`, poster image from `astro:assets`, video element inserted only on click. [CHANGE] The board uses `preload="metadata"`; `none` saves credits.
  - CSP: add `media-src 'self'` (S-8).
  - **Credit check before PR 3:** take the current Netlify credit price table, compute the cost of 1,000 plays, and record it in the PR. If it's over 10% of the 300 monthly credits, drop the video.
  - Set up a Netlify usage-alert email.
- **Missing photos (C-18):** Dubrovnik, Split, Zlatni Rat, Trogir and Korčula have no real image, and neither does any tour `image`. Fallbacks, as on the boards:
  - **Tiles** (home bento): `linear-gradient(blue-500, blue-900)` + icon.
  - **Cards** (tour and destination cards, About hero, crew): grey `--color-background-secondary` box with a 40px icon (52px on the About hero) in `--color-border-secondary`.
- **Tour detail gallery:** the hero is the first **real** photo when `tour.image.src` is missing. This fixes the live bug where slide 1 is a placeholder.

### 3.5 Islands, scripts, progressive enhancement

| Piece | How it's built | No-JS behaviour |
|---|---|---|
| `HeroCarousel.vue` | `client:load` | Slide 1 shows, static |
| Popular-tours slider | Astro markup + an inline module of ≤1 KB (arrows, drag) | Native horizontal scroll |
| `ToursCatalog.vue` | `client:visible`, takes a **slim DTO** (§6.2.3) | All tours, unfiltered |
| `DestinationsCatalog.vue` | `client:visible` | All destinations |
| `ImageGallery.vue` | `client:visible` | Hero links to the full-size first image; thumbnails are links |
| `FAQPage.vue`, `FAQAccordion.vue` | `client:visible` | Answers expanded (SSR renders them open, the island collapses them) |
| `GroupBookingFlow.vue` | `client:load` | Server form: `<form method="post" action="/api/bookings/draft">` with native date, number and select inputs |
| `CharterRequest.vue` | `client:load` | Server form posting to `/api/charter-request` |
| Contact form | `contact-form.ts` | `<form method="post" action="/api/contact">` [NEW]. The API accepts form-encoded bodies and answers with 303 to `/contact/?sent=1` or `?error=` |
| Video, mobile bar, copy-ref, open-now, legal scrollspy, header | inline modules | Video: poster links to the MP4. The rest degrade to static. |

Without JS, Turnstile can't run. The server then relies on the honeypot, `_startedAt`, the rate limit, and the global caps in S-11 (the contact form fails open; charter requests need Turnstile, S-6). Each form gets one end-to-end test with `javaScriptEnabled: false`.

**Form API contract** (draft, charter and contact):

| Request | Success | Failure |
|---|---|---|
| `Accept: application/json` (island `fetch`) | `200 {"redirect": "…"}` | `400 {"errors": {field: message}}` |
| Form-encoded post (no JS) | `303` to the next page | `303` back with `?error=<code>` |

- Other content types get `415`.
- Islands show `aria-busy` and a disabled button while sending, and a `role=alert` message on network errors.

---

## 4. Design tokens: `src/styles/tokens/design.css`

The file starts from `hbc.css` `:root`. Deviations are marked.

### 4.1 Palette

These raw values are referenced only by the semantic tokens.

| Token | Value | Note |
|---|---|---|
| `--palette-black` | `#111` | |
| `--palette-gray-700` / `-500` / `-400` / `-300` / `-200` / `-150` / `-100` | `#555` / `#6b6b6b` / `#ccc` / `#aaa` / `#e5e5e3` / `#ebebea` / `#f5f5f4` | `-500` changes from `#999` |
| `--palette-gray-input` | `#8a8a8a` | **[DEVIATE, a11y]** form-control borders, 3.45:1 |
| `--palette-card-border` | `#d6d5d1` | |
| `--palette-white` | `#fff` | |
| `--palette-blue-900` / `-600` / `-500` / `-300` / `-100` | `#0c447c` / `#155da8` / `#1a6fc4` / `#7ab4e8` / `#e6f1fb` | `-600` new |
| `--palette-navy-950` | `#0a2a40` | hero, video and CTA band background |
| `--palette-orange-900` / `-600` / `-500` / `-100` | `#7c2d12` / `#c2410c` / `#f2662b` / `#ffedd5` | `-500` is the hero-dot progress fill |
| `--palette-amber-900` / `-700` / `-500` / `-400` / `-100` / `-50` | `#633806` / `#8f5a12` / `#ef9f27` / `#ba7517` / `#faeeda` / `#fef3e2` | `-700` is kept (the design drops it) |
| `--palette-gold-50` / `-100` / `-300` / `-500` / `-800` | `#fdf8ec` / `#f7ebcb` / `#e3c987` / `#b8892b` / `#6e4e0e` | |
| `--palette-gold-grad-start` / `-end` | `#fbdd84` / `#f2bc3a` | premium gradient |
| `--palette-yellow-400` / `-950` | `#f5c443` / `#2e2100` | |
| `--palette-star-on-white` / `-on-photo` | `#f59e0b` / `#fbbf24` | decorative only |
| `--palette-green-600` / `--palette-red-600` | `#1a9e5c` / `#d33a2c` | included/excluded icons (3:1 is enough for icons) |
| `--palette-red-900` / `-100` | `#8b1a15` / `#fdecea` | |
| `--palette-purple-900` / `-500` / `-100` | `#3c3489` / `#534ab7` / `#eeedfe` | |
| `--palette-coral-500` | `#e05c34` | |
| `--palette-teal-*` | – | removed in PR 9, once nothing uses them (the admin's frozen copy lives in `admin.css`) |

### 4.2 Semantic tokens

| Token | Maps to | Note |
|---|---|---|
| `--color-text-primary` / `-secondary` / `-tertiary` | black / gray-700 / gray-500 | tertiary is 5.33:1 on white, 4.89:1 on gray-100 |
| `--color-text-info` | blue-500 | links |
| `--color-text-brand` / `--color-text-highlight` / `--color-text-success` | blue-900 | |
| `--color-text-danger` | red-900 | |
| `--color-text-warning` | **amber-700** | **[DEVIATE, a11y]** the design's amber-400 is 3.72:1. Amber-400 is for icons only. |
| `--color-text-on-image` | white | |
| `--color-brand` / `--color-brand-dark` | blue-500 / blue-900 | |
| `--color-accent` / `--color-accent-dark` | blue-500 / blue-900 | the teal → blue change |
| `--color-highlight` / `--color-highlight-dark` | blue-500 / blue-600 | |
| `--color-background-primary` / `-secondary` / `-hover` | white / gray-100 / gray-150 | |
| `--color-background-info` / `-brand-soft` / `-highlight-soft` / `-success` | blue-100 | |
| `--color-background-brand` / `-highlight` | blue-500 | |
| `--color-background-warning` / `-warning-soft` / `-danger` | amber-100 / amber-50 / red-100 | |
| `--color-background-hero` | navy-950 | |
| `--color-border-primary` / `-secondary` / `-tertiary` | gray-300 / gray-400 / gray-200 | decorative |
| `--color-border-card` | card-border | decorative |
| `--color-border-input` | gray-input | form controls (§11.9) |
| `--color-border-info` / `-brand` / `-highlight` / `-warning` | blue-300 / blue-500 / blue-500 / amber-500 | |
| `--color-cta-on-image` / `-on-image-dark` | orange-600 / orange-900 | only for buttons on photos (hero, video play, photo CTA band). White text on it is 5.18:1. |
| `--color-progress` | orange-500 | hero-dot fill, decorative |
| `--color-premium-gradient` | `linear-gradient(135deg, var(--palette-gold-grad-start), var(--palette-gold-grad-end))` | private badge and icon circle |
| `--color-premium-bg` / `-bg-strong` / `-border` / `-icon` / `-text` / `-solid` / `-on-solid` | gold-50 / gold-100 / gold-300 / gold-500 / gold-800 / yellow-400 / yellow-950 | |
| `--color-category-private-bg` / `-text` / `-icon` | purple-100 / -900 / -500 | |
| `--color-category-tip-bg` / `-tip-text` | amber-100 / amber-900 | |
| `--color-category-info-icon` / `-warning-icon` | blue-900 / amber-500 | |
| `--color-icon-sunset` / `-included` / `-excluded` | coral-500 / green-600 / red-600 | |
| `--color-star` / `--color-star-on-photo` | star-on-white / star-on-photo | always `aria-hidden` |
| `--color-focus-ring` | blue-500 | white on photos, plus an outer navy ring (§4.5) |
| `--color-glass-dark` / `-dark-hover` | `rgba(8,28,48,.42)` / `rgba(8,28,48,.62)` | chips, hero arrows. Contrast is checked per §11.9. |
| `--color-glass-light` | `rgba(255,255,255,.18)` | count pills |
| `--color-overlay-hero` | `linear-gradient(90deg, rgba(6,24,40,.62) 0%, rgba(6,24,40,.28) 45%, rgba(6,24,40,0) 75%), linear-gradient(0deg, rgba(6,24,40,.55) 0%, rgba(6,24,40,0) 45%)` | as on the Tours and Destinations boards |
| `--color-overlay-header` | `linear-gradient(180deg, rgba(6,24,40,.55) 0, rgba(6,24,40,0) 120px)` | **[DEVIATE, a11y]** gives the overlay nav text contrast; the board uses a weaker 160px `.38` top fade |
| `--color-overlay-band` | `linear-gradient(rgba(6,24,40,.45), rgba(6,24,40,.6))` | CTA band |
| `--color-lightbox-backdrop` | `rgba(4,14,24,.94)` | |

### 4.3 Type

| Token | Value |
|---|---|
| `--font-sans` | §3.3 |
| `--font-display` | `'Display', var(--font-sans)`. "Display" is the `@font-face` family name (Glorich or the fallback). |
| `--font-size-micro` / `-xs` / `-sm` / `-base` / `-md` / `-lg` / `-xl` / `-2xl` | 0.75 / 0.8125 / 0.875 / 1 / 1.0625 / 1.125 / 1.25 / 1.375 rem |
| `--font-size-hero` | `clamp(1.75rem, 1.5rem + 1.25vw, 2.5rem)`: the sans h1 (28–40px) |
| `--font-size-icon-hero` | 3.5rem |
| `--font-size-display-xl` | 5rem; `clamp(2.75rem, 12vw, 4rem)` at ≤768 (home slides) |
| `--font-size-display-lg` | 4.5rem; `clamp(2.75rem, 12vw, 3.75rem)` at ≤768 (Tours and Destinations h1) |
| `--font-size-display-md` | 1.75rem (display section titles, CTA band h2) |
| `--font-size-score` | 2.75rem (review summary score) |
| `--line-height-display-hero` / `-display-section` / `-display-band` | .94 / 1 / .96 |
| `--letter-spacing-display-hero` / `-display-section` | −.02em / −.01em |
| `--line-height-tight` / `-normal` / `-relaxed` | 1.3 / 1.5 / 1.6 |
| `--font-size-body-md` + `--line-height-body-md` | base / 1.6: running text |
| `--font-size-body-sm` + `--line-height-body-sm` | sm / 1.5: compact facts |
| `--font-weight-regular` / `-medium` / `-semibold` / `-bold` | 400 / 500 / 600 / 700 |
| `--letter-spacing-label` / `-eyebrow` | .05em / .08em |

Body text becomes `var(--font-size-base)/var(--line-height-normal)`: 16px instead of 14px. Literal `font-size` declarations (474 today) are replaced by tokens as each page is rebuilt. Off-scale values from the boards map to the nearest token: 15px → base, 2.75rem → score.

### 4.4 Space, radius, shadow, layout, z-index, motion

- **Space:** `--space-1` 4px · `-2` 8 · `-3` 12 · `-4` 16 · `-5` 20 · `-6` 24 · `-7` 32 · `-8` 48 · `-9` 56 · `-10` 72.
- **Rhythm:**
  - `--section-gap`: 72px; 56 at ≤1024; 44 at ≤480 (the design's `--sec-gap`)
  - `--detail-gap`: 36px; 28 at ≤768 (`--td-sec`)
- **Radius:** `--radius-sm` 6 · `--radius-md` 8 · `--radius-btn-sm` 10 · `--radius-btn` 11 · `--radius-lg` 12 · `--radius-xl` 16 · `--radius-2xl` 20 · `--radius-pill` 999.
- **Shadow:**

  | Token | Value |
  |---|---|
  | `--shadow-card-hover` | `0 6px 24px rgba(0,0,0,.06)` |
  | `--shadow-card-hover-lg` | `0 8px 28px rgba(0,0,0,.06)` (type cards) |
  | `--shadow-panel` | `0 16px 40px rgba(10,42,64,.16)` |
  | `--shadow-media` | `0 18px 48px rgba(6,24,40,.28)` |
  | `--shadow-cta` | `0 8px 24px rgba(0,0,0,.18)` |
  | `--shadow-cta-band` | `0 8px 24px rgba(0,0,0,.2)` |
  | `--shadow-play` | `0 8px 24px rgba(194,65,12,.35), 0 0 0 8px rgba(255,255,255,.18)` |
  | `--shadow-play-hover` | `0 10px 28px rgba(194,65,12,.4), 0 0 0 12px rgba(255,255,255,.22)` |
  | `--shadow-nav` | `0 1px 16px rgba(0,0,0,.05)` |
  | `--shadow-bar` | `0 -2px 16px rgba(0,0,0,.06)` |
  | `--shadow-badge` | `0 2px 8px rgba(0,0,0,.12)` |
  | `--shadow-pill` | `0 2px 8px rgba(0,0,0,.15)` |
  | `--text-shadow-hero` | `0 1px 2px rgba(0,0,0,.35), 0 4px 24px rgba(0,0,0,.45)` |
  | `--text-shadow-hero-sub` | `0 1px 2px rgba(0,0,0,.45), 0 2px 12px rgba(0,0,0,.4)` |
  | `--text-shadow-title` | `0 2px 24px rgba(0,0,0,.18)` |

- **Layout:**
  - `--content-max: 960px`
  - `--page-gutter`: 24px; 16 at ≤768; 12 at ≤480
  - `--flow-width: 628px` (booking and charter)
  - `--legal-width: 680px`: the **whole** legal content wrap, TOC included (180 + 24 + ≈428 body), as designed
  - `--aside-width: 322px`
  - `--site-header-height`: the measured bar height (~60px; set in PR 2)
  - `--mobile-bar-height: 72px`
  - `--touch-min: 2.75rem`: used only where §11.12 calls for it
- **Borders:**
  - cards: `1px solid var(--color-border-card)`
  - dividers: `0.5px solid var(--color-border-tertiary)`
  - form controls: `1px solid var(--color-border-input)`
- **Z-index:** `--z-header` 100, `--z-mobile-bar` 90, `--z-menu` 200, `--z-dialog` 300.
- **Motion:** `--duration-fast` .15s, `--duration-base` .3s, `--duration-slow` .6s, `--ease-out: cubic-bezier(.2,.7,.2,1)`. The global `prefers-reduced-motion` kill-switch stays. Under reduced motion only colour changes remain.

#### 4.4.1 Motion catalogue (from the boards)

| Element | Behaviour |
|---|---|
| Nav | background, border and shadow over .3s |
| Card | border and shadow .2s; image scale 1.04 over .4s (tour cards, bento tiles) |
| Gallery hero and thumbnails | scale 1.03 over .4s |
| Video poster | scale 1.03 over .6s |
| Play disc | scale 1.08 + ring 8 → 12px over .25s |
| PillLink arrow | moves +2px |
| See-all icon | moves +3px and turns blue |
| Hero CTA arrow | moves +3px |
| Hero dot | hover scale 1.4 (active 1.25) |
| Hero crossfade | 1.2s |
| Hero text | leaves in .45s, swaps after 450ms; enters with title .7s (delay .1s, rises 28px), sub .6s (delay .25s), CTA .6s (delay .4s) |
| Explore chevrons | bob 1.8s |
| Trust marquee | 40s linear |
| Highlights marquee | 26s linear |
| Lightbox | fade-in .2s |
| Mobile bar | transform and opacity .3s |
| FAQ chevron | rotates over .15s |
| Type card hover | CTA turns blue |
| Contact card hover | `--color-background-hover` |
| Calendar day and slot hover | border `--color-border-primary` |
| Chip hover | `--color-glass-dark-hover` |

### 4.5 Focus ring

```css
:where(a, button, input, select, textarea, summary, [tabindex]):focus-visible {
  outline: 2px solid var(--color-focus-ring); outline-offset: 2px;
}
:where(.on-photo, .hero, .photo-hero, .cta-band--photo) :focus-visible {
  outline-color: #fff; box-shadow: 0 0 0 4px var(--palette-navy-950);
}
```

This replaces both `global.css:22-25` and `_base.css:71-74`, which conflict today. Form controls also keep a border-colour change on `:focus`.

### 4.6 Migration aliases and the token check

- PR 1 keeps the old names pointing at the new tokens, for pages not yet rebuilt:
  - `--color-accent-teal` → `var(--color-accent)` (30 uses; 8 of them in the admin, which is frozen separately, §12)
  - `--badge-*` → the Badge tones
  - `--color-text-accent` → `var(--color-text-brand)`
  - `--palette-gray-550` → gray-500
  - `--radius-md/-lg` stay
- Delete `--border-radius-md/-lg` now; nothing uses them.
- `scripts/tokens-check.mjs` (new; run inside `pnpm check`):
  1. Lists the remaining alias uses. From PR 9 on, it fails if any are left.
  2. Fails on `#hex`, `rgb(` or `rgba(` outside these files:
     - `tokens/design.css`
     - `admin.css`
     - `src/lib/email/*`
     - placeholder-colour data (`tour-photos.ts`, `destination-photos.ts`, `hero-image.ts`)
     - `src/config/site.ts`

### 4.7 Icons

- Bump Tabler to 3.48.x in `scripts/icons.mjs` and regenerate.
- **Add these glyphs** (check each against `scripts/tabler-icon-names.txt`): `baby-carriage, camera, fish, heart, message, moon, news, sparkles, tools-kitchen-2, tower, trees, user-circle, world, copy, check, x, arrows-sort, chevron-down, chevron-left, chevron-right, arrow-right, arrow-up-right, photo, clock, map-2, droplet, leaf, glass-full, beach, users, crown, shield-check, certificate, sailboat, lock, headset, mood-sad, compass-off, mail, phone, anchor, mountain, swimming`.
- **Don't port `ti-island` or `ti-cave`.** They aren't Tabler names, and the icons check would fail. Islands use `ti-beach`; caves use `ti-mountain` (or the owner picks another real glyph).
- **Keep** icons still in use: `circle-x`, `player-pause`/`player-play`, `building-lighthouse`, `mask`, `moon-stars`, `building-fortress`, `quote`, `ticket`. Drop each one only when its last use goes.

---

## 5. Site chrome

### 5.1 Header (`src/components/Header.astro`)

| Aspect | Spec |
|---|---|
| Structure | Logo (`ti-sailboat` 18px in `--color-brand`, gap 7, "Hello Blue Cave" 17px/500) · links **Tours, Destinations, About, FAQ** (14px secondary, gap 18; current page primary/500 with `aria-current`) · right slot per D-2 · hamburger at ≤768. **[DROP]** Contact as a nav link (design). Contact is reached through the overlay-page slot, the footer, the FAQ band and the booking help. |
| Layout | `display: flex; justify-content: space-between`, max 960, padding `14px 24px`. On home too: the board's 3-column grid exists only for the language switcher (D-3). |
| Solid variant | `position: sticky; top: 0`, `rgba(255,255,255,.92)` + `backdrop-filter: blur(10px)`, 0.5px tertiary bottom hairline. "Book now": blue fill, white text, padding `6px 14px`, radius 8, 14px/500, hover opacity .88. |
| Overlay variant (`solid={false}`; home, Tours, Destinations) | `position: fixed`, transparent, sitting over `--color-overlay-header`. `on-photo`: logo, links and hamburger white (links `rgba(255,255,255,.88)`, white on hover and when current). "Contact" outline: white text, 1px `rgba(255,255,255,.75)` border, padding `5px 14px`; hover is a white fill with navy-950 text. After 40px of scroll it becomes `is-solid`: white at .97, blur 10, hairline, `--shadow-nav`, outline goes to `--color-border-primary`, hover dark fill with white text. Transitions over .3s. |
| Scroll behaviour | **[CHANGE] It never hides** (design). Remove the current hide-on-scroll script. That also prevents the focus-obscuring problem in §11.15. |
| Class names | Keep `.nav-solid` for the solid state (the admin hard-codes it; §12). New code uses `.nav-solid` rather than the board's `is-solid`. |
| Mobile ≤768 | Links and CTA hidden; hamburger (`ti-menu-2` 22px, 44px hit area). **[KEEP]** the current full-screen menu panel: focus trap, Escape, `inert` on the rest of the page, scroll lock, auto-close above 768, `aria-expanded`/`aria-controls`. The design has no panel. Restyle it: white panel; links at 20px/500 with 0.5px dividers, now including **Contact** (in a menu it's just a link); "Book now" full width and blue at the bottom. |
| a11y | Skip link first in the DOM. `html { scroll-padding-top: calc(var(--site-header-height) + 8px) }`. |

### 5.2 Footer (`src/components/Footer.astro`)

As designed (hbc.css lines 213–230):

```
footer.footer   inside .wrap 960 · grid 2fr 1fr 1fr 1fr · gap 16 · 0.5px top hairline · padding-top 20
  Brand  logo (mb 6) + one-line blurb (14/1.5 secondary, max 240px). Owner-confirmed (C-20); default "Speedboat tours and private charters from Split."
  Tours  Group tours → /tours/?type=group · Private charters → charter URL (§9.3) · Day trips → /tours/        (D-19; Sunset cruises dropped)
  Info   About us → /about/ · Destinations → /destinations/ · FAQs → /faq/ · Contact → /contact/
  Legal  Terms & conditions → /legal/terms/ · Privacy policy → /legal/privacy/ · Cancellation policy → /legal/cancellation/
  bottom margin-top 16 · padding-top 14 · 0.5px hairline · space-between · wrap · gap 8 · 14px tertiary
         "© {current year} Hello Blue Cave" | imprint line (PR 6, C-6) | ["Licensed maritime operator · Croatia" only once C-7 is confirmed]
```

- Column headings are `h2` elements styled as 12px/500 uppercase, letter-spacing .05em, tertiary, margin-bottom 10. [DEVIATE, a11y] The board uses `h4`, which skips heading levels.
- Links: 14/1.5 secondary, margin-bottom 8, primary on hover.
- **[DROP]** the current phone/email/address block, as designed. **Exception:** the imprint line (legal name, address, OIB) ships in the bottom bar as soon as C-6 is answered. That's a legal requirement, not a style choice.
- Below 768px: 2 equal columns. Below 480px: 1 column.
- Page top margin:
  - home: 0, after the CTA band's 48px bottom margin
  - Tours: `--section-gap`
  - Destinations: 56px
  - detail pages: 0, after `.layout` with `margin-bottom: var(--detail-gap)`
  - other pages: 32px

### 5.3 Booking chrome: `MiniNav.astro` and `TrustStrip.astro`

- **`MiniNav`:** logo + "Exit" link, styled as the design's own `.exit-link` (14px secondary → primary on hover, icon gap 5). Bar margin-bottom 20. **[DEVIATE, usability]** The boards leave Exit out, but checkout pages need a way out. Exit goes to the tour page, or to `/tours/`.
- **`TrustStrip`:** top hairline, `margin-top: 24px`, `padding-top: 16px`, centred, wraps, gap 14, 13px tertiary. It is the **last block of `main`** on every checkout page (§11.16). Items:
  1. **"Secure payment"** (`ti-lock`). Only when `PAYMENTS_ARE_DEMO` is false. In demo mode: "Demo checkout: no money is taken".
  2. **"Need help?"** + phone link + email link, in that order (phone, then email), using `SITE_PHONE` and `SITE_EMAIL`. Don't introduce `help@` (C-21).
  3. **"Licensed maritime operator · Croatia"**, only once C-7 is confirmed.

### 5.4 Layouts

- **`BaseLayout.astro`:**
  - the layer-order `<style is:inline>` comes first (§3.1)
  - `fontPreload` prop
  - `styles: 'site' | 'admin'` prop: `admin` imports `admin.css` + `icons.css` and not `global.css` (§12)
  - `theme-color` `#1a6fc4`
- **`SiteLayout.astro`:** passes `fontPreload` through; otherwise unchanged (`solidNav`, `checkout`).
- **Favicon set** (§13).

---

## 6. Browse pages

### 6.1 Homepage `/` (board 01 v4)

**Files:**
- `src/pages/index.astro` (rewritten)
- `HeroCarousel.vue` (restyled, gains a third slide)
- `src/components/home/*`
- `src/data/marketing.ts` (§9.3)

**Section order:**
1. Header (overlay)
2. Hero carousel
3. Trust band
4. Video preview (D-6)
5. Popular tours
6. Group or private?
7. Destinations bento
8. How it works
9. What guests say (D-5)
10. Common questions
11. CTA band
12. Footer

**[DROP]** the Group/Private/Transfer search band. It's `display:none` on the board, and Transfer isn't a product.

Responsive behaviour: §3.1.1, row "Home".

#### 6.1.1 Heading

**[KEEP]** the `sr-only` h1: "Hello Blue Cave: speedboat tours and private charters from Split". Slide titles are `<p class="hero-title">` with display styling. [DEVIATE, a11y] On the board, the h1 is the slide title, so it changes every 6 seconds.

#### 6.1.2 Hero carousel

| Item | Spec |
|---|---|
| Box | `height: 100vh; height: 100svh; min-height: 580px; max-height: 1140px` ([CHANGE] `svh` stops the jump on mobile browsers when the address bar shows or hides). Background `--color-background-hero`. |
| Slides | 3, from `marketing.ts`. Images per §3.4. `object-fit: cover; inset: 0` absolute. `object-position` comes from data: `calc(70% + 180px) center` for slides 1–2, `right center` for slide 3, `70% center` at ≤768. **QA the left edge at 1280, 1440 and 1920**: the board shows a ~105px uncovered strip on slides 1–2. |
| Scrim | **[DEVIATE, a11y]** `--color-overlay-hero` + `--color-overlay-header`. The board defines a scrim but never renders it. At ≤1024, also add `--text-shadow-hero` and `--text-shadow-hero-sub` (as on the board). |
| Contrast | Hero text must reach ≥4.5:1, or ≥3:1 for display text at 24px and up. Measure against the **lightest** pixel of the scrimmed photo under the text box, for each slide at 390, 768, 1280 and 1920px. Record the values in the PR. |
| Copy (C-22) | 1. `titleLines: ["Escape", "in style", "& comfort"]` / "Group departures along the Dalmatian coast. Small boats, real skippers, no tourist conveyor belts." → **Browse group tours** `/tours/?type=group`. 2. `["All", "aboard,", "mateys!"]` / "Private charters for your group. Set the route, set the pace, skip the crowds." → **Plan a private charter** (charter URL). 3. `["Hello", "Blue Cave", "Croatia"]` / "Speedboat tours from Split since {FOUNDING_YEAR}. Licensed and insured." → **See the Blue Cave tour** `/tours/blue-cave-hvar-5-islands/`. [CHANGE, fact] "real guides" becomes "real skippers"; "for two or twenty" is dropped (the cap is 12); the year is computed. "Licensed and insured" stays only once C-7 is confirmed; otherwise the line ends at "since {year}". |
| Title type | Display face, `--font-size-display-xl`, line-height .94, letter-spacing −.02em, uppercase, white. Lines render from `titleLines` with `<br>` and `white-space: nowrap`, as on the board. |
| Sub and CTA | Sub: 16/1.6, white .9, max 375px, margin-bottom 24 (20 at ≤768). CTA: `Button on-image lg` (orange, 46px, radius 11, `--shadow-cta`, hover orange-900, arrow moves +3px). |
| Layout | Content max 960, left-aligned, vertically centred. At ≤768 it is bottom-aligned with `padding-bottom: 168px`. At ≤480 the panel is max 375. |
| Motion | §4.4.1. **Under reduced motion there is no auto-rotation** ([KEEP] the current behaviour; the board's script ignores reduced motion), no crossfade, and no text animation. |
| Rotation | Every 6000ms. **Pauses on hover and while focus is inside the carousel** ([KEEP]). |
| Dots | Bottom 80px (70 at ≤768), gap 8. Inactive: 8px dot in `rgba(255,255,255,.6)`. Active: 28px pill on a `rgba(255,255,255,.35)` track, filled by `--color-progress` over the interval. Hover scale 1.4 (active 1.25). **Hit area ≥24×24 px** through padding (WCAG 2.5.8). Each dot is a button labelled "Show slide n of 3". |
| Pause/play | **[DEVIATE, a11y]** A visible 32px glass button (`--color-glass-dark`) with `aria-pressed` and "Pause slideshow"/"Play slideshow" labels. It is the **first control in DOM order** inside the carousel region and sits visually to the right of the dots. The board hides pause behind a click on the active dot; that still works, but the button is the accessible control. |
| Arrows | 40px glass circles (`--color-glass-dark` → `-hover`; 1px `rgba(255,255,255,.28)` border; blur 12), 20px from the left and right edges. Visible on hover **and whenever any carousel control has focus** ([DEVIATE, a11y]: the board shows them on hover only). Hidden at ≤768, where touch swipe (≥40px horizontal) is used instead. |
| Explore | Pill button, 36px tall, transparent, white 14px/600, hover `rgba(255,255,255,.12)`, `ti-chevron-down` on **both** sides, bobbing every 1.8s. Bottom 22px (16 at ≤768). Smooth-scrolls to the trust band, offset by the header height. |
| Semantics | [KEEP] carousel region with `aria-roledescription="carousel"`; slides are `role=group` with `aria-roledescription="slide"` and `aria-label="n of 3"`; inactive slides are `inert`. The slide container is `aria-live="off"` while rotating and `"polite"` when paused or under reduced motion. |

#### 6.1.3 Trust band (`TrustBand.astro`)

- **Layout:** white; max 960; padding `20px 24px`; `justify-content: space-between`; gap 16; nowrap. Items are 15px (`--font-size-base` per the token mapping) in secondary, with `strong` in primary. Icons are 20px `--color-accent`.
- **Placement:** directly below the hero. The video section follows with `margin-top: 0`.
- **Items** come from `marketing.ts`, and each needs `confirmed: true` to render:
  1. `ti-shield-check` "**Free cancellation** up to 48h on group tours", linking to `/legal/cancellation/`.
  2. `ti-users` "**Max 12 guests** per departure".
  3. `ti-certificate` "**{years} years** on the water", with years computed from `FOUNDING_YEAR` (D-14; as on the board).
  4. The rating slot: "★★★★★ **4.9** from N reviews". Stars use `--color-star` and are `aria-hidden`; the text says "4.9 out of 5". It appears only once D-5 is answered. Until then this slot is `ti-anchor` "**Small boats**, real skippers".
- **≤1024:** `Marquee` (40s linear; item spacing 48px, 40 at ≤768; edge masks fade over 20 → 64px). Under reduced motion the items **wrap into a 2×2 grid** ([DEVIATE, a11y]: the board clips them).
- **≤768:** 14px text, padding `16px 0`.

#### 6.1.4 Video preview (D-6)

- **Container:** `section aria-labelledby="vp-title"`, `margin-top: 0`.
  - The band covers the top 54% (49% at ≤768): navy-950 + `85382a42` at `center 93% / cover` + `linear-gradient(rgba(6,24,40,.55), rgba(6,24,40,.35))`.
  - Inner padding `32px 24px 0` (`24px 16px 0` at ≤768), centred.
- **Text:**
  - eyebrow "Experience it first-hand": 14px/500, white .9, letter-spacing .02em, margin-bottom 8
  - display h2 "Preview from our tours": white, margin-bottom 28 (20 at ≤768)
- **Player:** 16:9, radius 20 (16 at ≤768: `--radius-xl`), black background, `--shadow-media`.
  - **Idle:** `<button aria-label="Play the tour preview video, 22 seconds, no sound">` showing the poster. On hover the poster scales 1.03 over .6s, with a bottom gradient `rgba(6,24,40,0 → .55)` from 55%.
  - **Play disc:** 84px (64 at ≤768), orange, white triangle, `--shadow-play` → `--shadow-play-hover` + scale 1.08 on hover and focus.
  - **Meta:** `ti-clock` "0:22 · A day on the water".
  - **On click:** swap in `<video controls playsinline preload="none" aria-describedby="vp-desc">`, start playback, and move focus to the video.
- **Description:** `#vp-desc`, one sentence under the player describing the footage (§11.11).

#### 6.1.5 Popular tours

- **Header:** `SectionHeader display` "Popular tours", with actions:
  - two 36px round arrow buttons ("Previous tours"/"Next tours"; `aria-disabled` at the ends; hidden at ≤768)
  - `PillLink` "See all tours →" `/tours/`
- **Track:**
  - full-bleed `<ul role="list">`
  - `--slider-gutter: max(24px, calc((100% - 912px)/2))` (16 at ≤768), used as `padding-inline` and `scroll-padding-inline`
  - flex, gap 16, `overflow-x: auto`, `scroll-snap-type: x mandatory`, hidden scrollbar
  - left edge fade: solid white across the gutter width; right edge fade: gradient through `rgba(255,255,255,.85)` at 35%
  - when the track overflows, it gets `tabindex="0"`, `role="region"` and `aria-label="Popular tours, scrollable"` (§11.13)
- **Cards:** `TourCard variant="slider"` for `getFeaturedTours()` (300px; `min(300px,82%)` at ≤768), then `TourCard variant="see-all"`.
- **Behaviour:**
  - arrows `scrollBy` one card width + 16px
  - **desktop drag-to-scroll** for mouse pointers only (5px threshold, suppress the click after a drag, `cursor: grab` only with `(hover:hover) and (pointer:fine)`)
  - text selection is not blocked outside a drag
  - the arrows and native scroll are the single-pointer alternative to dragging (WCAG 2.5.7)

#### 6.1.6 Group or private? (`TypeCards.astro`, `withCtas` prop)

- **Grid:** 2 columns; gap 12 on home and 16 on Tours; 1 column at ≤768.
- **Card:** flex column, 1px card border, radius 12, padding `18px 20px` (Tours: `18px 20px 26px`). Hover: border-primary, `--shadow-card-hover-lg`, and the CTA turns blue.
- **Inside the card:**
  - Badge at top 16 / right 16 (13px/600, padding `4px 10px`, radius 6, icon 1.2em).
  - Icon circle 48px (22px glyph), margin-bottom 14.
  - `h3` title 17px/500.
  - Description 16/1.6, margin-bottom 12.
  - Features with `ti-circle-check` (1.2em accent), gap 4, margin-bottom 24 (0 on Tours).
  - CTA: `Button secondary sm`, pinned to the bottom.
- **Group card:**
  - badge `ti-users` "Other people on board" (brand); blue-100 icon circle; "Group tour"; the design's description
  - features: "From **{minGroupPrice}** per person" (computed from the catalog: **€75** today, not €45) · "Fixed departures, daily in season" · "Licensed skipper on every route" (C-7)
  - CTA "Browse group tours" → `/tours/?type=group`
- **Private card:**
  - badge `ti-crown` "Just you on board" (`--color-premium-gradient`, text `--color-premium-on-solid`); icon circle in the same gradient
  - background `linear-gradient(180deg, var(--color-premium-bg), #fff 55%)`
  - features: `{charterFromLabel}` ("From €X for the boat" only with the D-8 price table, otherwise "Quoted per boat and season") · "Fully customisable route" · "Flexible departure time"
  - CTA "Plan a private charter" → charter URL

#### 6.1.7 Destinations bento

- **Header:** `SectionHeader display` "Destinations" + sub "Islands, sea caves and old towns along the Dalmatian coast, all within a boat ride of Split." + `PillLink` "All destinations →" (`margin-top: -4px`).
- **Grid:** `repeat(4, minmax(0,1fr))`, rows 190px, gap 12. No ≤1024 rule (as designed).
- **Tiles:** the destinations with `bentoOrder` set, sorted by it.
  - Default order: blue-cave 1 (tile a, spans 2×2), hvar 2 (b, spans 2 columns), blue-lagoon 3, pakleni 4, vis 5 (e, spans 2 columns).
  - That's a **5-tile layout** until a sixth destination has a real photo (C-18). [DEVIATE, fact] The board's Dubrovnik, Brač and "Elafiti" are placeholders.
- **`DestinationTile`:** the whole tile is an `<a>` to `/destinations/{slug}/`. Radius 12, padding `14px 16px`, content bottom-aligned, white text.
  - Image: `alt=""` (the name is in the text); hover scale 1.04 over .4s.
  - Gradient: `transparent 40% → rgba(0,0,0,.55)`.
  - Blur band over the bottom 42%: **[DEVIATE, performance]** a single `backdrop-filter: blur(4px)` band with a mask, replacing 8 stacked filters.
  - `h3` name 18px/600 (22px on tile a); `tagline` 16px, white .88, margin-top 2.
  - Count pill at top-left 12/12: `ti-sailboat` + "{n} tours", 13px/500, `--color-glass-light`, 0.5px `rgba(255,255,255,.35)` border, blur 6, padding `2px 9px`.

#### 6.1.8 How it works (`HowItWorks.astro`)

- 4 grey cards: radius 12, padding 14, gap 8. Grid gap 12 on home, 16 on Tours. Number circle 26px, white, 0.5px border, 12px/500. `h3` 16px/500; text 16/1.6 secondary.
- **[CHANGE, fact] Copy** (the board claims "live availability" and "instant confirmation", which don't exist):
  1. "Choose a tour": "Browse by destination or duration. Group or private, your call."
  2. "Pick your date": "Choose a day in the season and how many of you are coming."
  3. "Book securely": "Pay online by card or PayPal. Your confirmation comes by email."
  4. "Show up and sail": "Meet your skipper at Riva stand 14. We take care of the rest."

#### 6.1.9 What guests say (D-5)

- Renders only when `src/data/reviews.ts` has a `source` set and ≥2 reviews.
- **Layout:** 3 columns, gap 12.
  - **`ReviewSummary`:** `--color-background-info`, radius 12, padding 20; score `--font-size-score`/600 in blue-900; stars `aria-hidden` + sr text "4.9 out of 5"; "Average across N reviews"; meta pinned to the bottom (blue-900, 14px).
  - **`ReviewCard`** (`figure`, 1px card border, radius 12, padding 20, gap 12):
    - stars
    - `blockquote` (16/1.6)
    - `figcaption`: 36px initials avatar in the private tone, 13px/600; name 14px/600; "tour · month" 13px tertiary
- **≤1024:** scroller.
- **Omnibus disclosure, required** (verify with lawyer): next to the average, the text "Reviews from {source}, as of {date}. {source} doesn't check that reviewers took the tour. We show the most recent reviews and don't edit them." plus a link "All {N} reviews on {source}".
  - The average and N come from the source and cover **all** reviews.
  - The selection rule (most recent N, never picked by rating) is written in `reviews.ts`.
  - Names are first name + initial only.
- **No `AggregateRating` JSON-LD.**

#### 6.1.10 Common questions

- `SectionHeader display` "Common questions" + `PillLink ghost` "All FAQs →".
- `FAQAccordion` showing the **first 4 items of `faq.ts`**, worded exactly as on the FAQ page.
  - List: 1px card border, radius 12.
  - Rows: padding `13px 16px`, 0.5px dividers, grey on hover and when open.
  - Question 16px/500; chevron 14px tertiary, rotates when open; answer 16/1.6 secondary.
  - [KEEP] trigger and panel structure (the board puts the answer inside the button).

#### 6.1.11 CTA band (`CtaBand variant="photo"`)

- Inside `.wrap`; `margin: var(--section-gap) 0 48px`; radius 20 (16 at ≤768); padding 2rem (`2rem 20px` at ≤768); centred.
- Background: navy-950 + `85382a42` at `center 73% / cover` + `--color-overlay-band`.
- h2 in the display face: "Ready to get on the water?", white, line-height .96, `--text-shadow-title`, margin-bottom 10.
- Text: max 420px, white .9, margin-bottom 18. [CHANGE, UCPD] "Tours run daily from Split, {season}. Book early in July and August." The board's "Most sell out 3–5 days ahead" is an unbacked scarcity claim.
- Buttons, gap 10:
  - `Button on-image md` "Browse all tours" (40px, radius 10, `--shadow-cta-band`)
  - `Button on-image-ghost md` "Plan a private charter" (`rgba(255,255,255,.08)`, 1px `rgba(255,255,255,.7)` border, blur 8; on hover `.18` with a white border)
  - At ≤768 they stack full width (max 320).

#### 6.1.12 SEO

[KEEP] the TravelAgency organisation, WebSite and FAQPage JSON-LD.

**Acceptance criteria (home):**
- The section order and column counts match board v4 at 390, 768, 1280 and 1920px. The reviewer ticks off the §6.1 section list in the PR.
- Lighthouse mobile, median of 3 runs (CLI version recorded) on `npx netlify-cli serve --offline`: Perf ≥ 90, A11y 100, Best Practices 100, SEO 100. LCP is the slide-1 image, < 2.5s. CLS < 0.05.
- The carousel can be paused from the keyboard. The hero contrast table is in the PR.

### 6.2 Tours overview `/tours/` (board 02)

**Files:**
- `tours/index.astro`
- `ToursCatalog.vue` (gets its own styles)
- `TourCard.vue`
- `lib/tour-filters.ts` (retyped to the DTO)

**Section order:**
1. Header (overlay)
2. `PhotoHero` with chips
3. Results bar
4. Grid
5. Empty state
6. `TypeCards withCtas={false}`
7. `HowItWorks`
8. Footer (`margin-top: var(--section-gap)`)

Responsive behaviour: §3.1.1, row "Tours".

#### 6.2.1 PhotoHero and chips

**PhotoHero:**
- Height 540px (480 at ≤768). Image `6db22cf5` at `70% center` (Destinations: `32dfc7c5` at `center 79%`). `alt=""`.
- Overlays: `--color-overlay-header` + `--color-overlay-hero` (as on the board).
- Content is bottom-aligned, max 960, padding `0 24px 28px` (`0 16px 20px` at ≤768).
- Eyebrow "Split · Dalmatian coast": 13px/600 uppercase, letter-spacing .08em, white .85, margin-bottom 12.
- h1 "Our tours": display face, `--font-size-display-lg`, line-height .94, `--text-shadow-title`, margin-bottom 14.
- Lead: 16/1.6, white .88, max 440, margin-bottom 22. [CHANGE, fact] "Group departures and private charters, from half-day lagoon trips to full-day island hops." (The board says "short sunset runs".)

**Chips** (rendered by the island inside the hero):
- `ChipGroup aria-label="Filter tours"`.
- Glass chip: 38px, 14px/500, padding `0 14px`, 1px `rgba(255,255,255,.26)` border, `--color-glass-dark` + `backdrop-filter: blur(14px) saturate(140%)`, hover `--color-glass-dark-hover`, white text, 16px icon.
- Active: `rgba(255,255,255,.96)` with primary text and `aria-pressed="true"`.
- Contrast: chip text ≥4.5:1 and the chip boundary ≥3:1 against the scrimmed photo, measured. If a measurement fails, raise the glass to `.62` [DEVIATE, a11y].
- **Chips** (multi-select, OR logic):
  - **Group**
  - **Private only**
  - **Half day**: [DEVIATE, fact] the board's "Under 4h" matches none of the 7 tours. `durationHours ≤ 6` or tag `half-day`.
  - **Sunset**: shown only if some tour has the tag
- **Sort:** a glass pill wrapping a native `<select aria-label="Sort tours">`, pushed right (`margin-left: auto`; 0 at ≤768). Options:
  - **Recommended** (default: featured first, then catalog order) [CHANGE, UCPD]: the board's "Most popular" claims sales data
  - Price: low to high
  - Price: high to low
  - Duration
  - ~~Top rated~~, only with D-5
- **URL:** [KEEP] `?type=`, `?destination=`, `?q=`. [NEW] An active `?destination` shows first as a removable chip ("Hvar ×").
- **≤768:** one nowrap scroller.

#### 6.2.2 Results bar, grid and `TourCard`

- **Results bar:** padding-top 32; min-height 28; margin-bottom 16.
  - Count: `p[aria-live=polite]` "**7** tours" / "**N** tours match your filters".
  - "Clear filters": a text button that underlines on hover. It clears `?destination` too and updates the URL with `history.replaceState`.
- **Grid:** `repeat(auto-fill, minmax(240px,1fr))`, gap 16. [DROP] the Featured/All split.
- **Empty state:** `ti-mood-sad` "No tours match your filters." + [NEW] a "Clear filters" button.

**`TourCard.vue`:**
- **Props:** `tour: TourCardDTO`, `variant: 'default' | 'slider' | 'see-all'`. `photo: {src, srcset, sizes, width, height, alt} | null` is precomputed by the Astro page with `toGalleryView(getTourCardPhoto(t), 'sailboat', GALLERY_CARD_SIZE)`. `TourImage.astro` can't be used inside Vue.
- **Box:** white, 1px card border, radius 16, overflow hidden, flex column.
- **Image:** 180px tall; grey fallback per §3.4.
- **Badge** at top-left 12/12, at most one, in priority order:
  1. "Best seller": only with evidence, C-24
  2. "Our pick" (`badge: 'pick'`, brand tone)
  3. "New" (neutral)
  4. "Private" (private tone, private-only tours)
- **Body** (padding 14):
  - `h3` name: 18px/600, line-height 1.3, margin-bottom 14.
  - Foot row: "From" (13px tertiary) + price (22px/600) + unit (14px: "/ person" or "/ boat"), **or** "Price on request". Duration on the right (`ti-clock` + `durationShort`, 14px/500 secondary).
  - **[NEW, legal] Mandatory on-site fee line** under the price, 13px secondary: "+ Blue Cave ticket, paid on site" (from `additionalFees` with `mandatory: true`, §9.1).
  - "View tour" tile: 46px, radius 11, 16px/500, grey with a 0.5px border. It turns `--color-highlight` with white text on card hover or `:focus-visible`.
- **Link: [DEVIATE, a11y]** The board's card is a `div` whose only link is "View tour". We make the **whole card one `<a>`** (bigger target, one tab stop), and "View tour" is a `<span>`.
- **Hover:**
  - `default`: border-primary + `--shadow-card-hover` + image scale 1.04.
  - `slider`: **no card hover effects**, as designed (Main v4 lines 284–287), so dragging doesn't flash hover states. Only focus-visible turns the tile blue.
- **`see-all` variant:**
  - grey, 1px **dashed** `--color-border-secondary`, padding 24, centred
  - 56px white circle (0.5px border) with a 24px `ti-arrow-right`; on hover it turns blue and moves +3px
  - title "See all tours" 18/600
  - sub "Group trips and private charters" (14px secondary, max 200px) [CHANGE, fact: no sunset product]
  - card hover `--color-background-hover`

#### 6.2.3 Catalog DTO

```ts
type TourCardDTO = {
  slug, title, adultPrice: number|null, priceUnit, priceLabel, durationShort, durationHours,
  badge, types, tags, destinationSlugs, mandatoryFeeLabel?: string,
  searchText /* title + tagline + shortDescription, lower-cased */, photo
}
```

`tour-filters.ts` is retyped to this DTO.

**Acceptance criteria:**
- The `props` attribute of the `ToursCatalog` `<astro-island>` in `dist/tours/index.html` is ≤ 6 KB (unit test).
- Filters, sort, `?q` and `?destination` all work.
- The result count is announced.
- No duplicate card markup is left in the repo.

### 6.3 Tour detail `/tours/[slug]/` (board 03)

**Files:**
- `TourDetailView.astro` (rewritten)
- `ImageGallery.vue` (rebuilt)
- `MobileActionBar.astro`

**Data:** §9.1.

**Layout:**
- Solid header; `.wrap`; `Breadcrumb`; gallery.
- Grid `1fr var(--aside-width)`, column gap 32. Main content in row 1; the aside spans rows 1–2 and is sticky; reviews sit in row 2 of column 1.
- `overflow-x: clip` (so `position: sticky` works); `.layout` margin-bottom `--detail-gap`.

Responsive behaviour: §3.1.1, row "Tour detail".

#### 6.3.1 Breadcrumb

[KEEP] Tours › {primary destination} › {title}.

#### 6.3.2 Gallery (`ImageGallery.vue`)

**Hero image:**
- `<button aria-label="Open photo gallery, {n} photos">`, 16:9 (3:2 at ≤768), max-height 540, radius 12, margin-bottom 10, `cursor: zoom-in`. On hover the image scales 1.03 over .4s.
- Tags at top/left 10px (in this order, as on the board):
  - "Private available" (private tone, `ti-crown`)
  - "Group tour" (brand tone, `ti-users`)
- Count pill at bottom-right: `rgba(255,255,255,.95)`, radius 8, padding `6px 12px`, 14px/500, `--shadow-pill`, `ti-photo` "View all {n} photos".
- The hero is the first **real** photo.

**Thumbnails:**
- 4 columns, gap 8, 16:10, radius 8, margin-bottom 28 (20 at ≤768). Each is labelled "Open photo {i}".
- The 4th thumbnail shows **"+{n − 5}"** over a navy .55 overlay when `n > 5`.

**Lightbox:** a native `<dialog>` opened with `showModal()`. [DEVIATE, a11y] The board's version has no focus management.
- Backdrop `--color-lightbox-backdrop`, fade-in .2s.
- Top bar (padding `16px 20px`): "{i} / {n}" (`aria-live=polite`) + a 44px close button.
- Stage:
  - prev/next 44px glass buttons (overlaid 12px from the edges at ≤768)
  - image `object-fit: contain`, radius 8, real alt text
- Thumbnail strip: 72×52, radius 6, 2px border. Opacity .5 → .85 on hover → 1 with a white border when active. Centred (left-aligned at ≤768).
- Keyboard and pointer:
  - ←/→ keys and touch swipe
  - Escape (the `cancel` event)
  - clicking the backdrop closes; clicking the image doesn't
- Restore focus to the trigger manually on close. Lock body scroll while open.
- Full-size images load lazily.

#### 6.3.3 Main column (section titles: `SectionHeader plain`, h2)

1. **h1:** sans `--font-size-hero`/500, line-height 1.3.
2. **Meta row:** 14px secondary. `ti-clock` duration · `ti-users` "Small group, max 12" or "Private charter". [CHANGE, fact] The board's "500+ happy guests" isn't confirmed (C-3).
3. **Intro:** `p` (body-md, secondary) with **no heading**, as designed. Text comes from `shortDescription`.
4. **Itinerary:** `Timeline variant="itinerary"`.
   - Each stop: a 32px dot (blue-100 with a 0.5px blue-300 border, 16px info icon, margin-top 6) and a 0.5px connector line.
   - Time on its **own line above** the label: 13px tertiary, line-height 18. Shown only when known.
   - Label: 16px/500. Description: body-md, optional.
   - Icons come from the data, one per stop.
5. **What's included:** 2 columns (1 at ≤768), gap 6, body-sm, `ti-circle-check` 1.25em in `--color-icon-included`.
6. **What's not included:** `ti-x` in `--color-icon-excluded`. Mandatory fees are listed first and include an amount when known (C-23).
7. **Good to know:** `InfoTile` grid, 2 columns (1 at ≤768).
   - As on the board: Additional fees · Languages (only if data exists) · What to bring.
   - **[CHANGE, fact]** Added: Departure · Return · Meeting point (link) · Season.
   - Min age, group size and accessibility appear only when data exists.
   - **No clamping.**
   - The Additional fees link appears only when the owner supplies an official URL. The link text is underlined with a `ti-arrow-up-right` icon and sr-only "(opens in a new tab)". **Never `example.com`.**
8. **Please note:** [DEVIATE, legal; D-12] `tour.disclaimers` in a `Notice warn`.
9. **[DROP]** Highlights, the destination chips, and the "Overview" heading.
10. **Reviews ({n}):** D-5.
    - Grey cards: padding 12, radius 8, margin-bottom 8. Meta row: 30px avatar, name 14/500, stars, month on the right.
    - At ≤1024 they become a scroller (`min(340px,46%)`; 82% at ≤768) with edge masks.
    - Omnibus line per §6.1.9. "Show all" links to the source.

#### 6.3.4 Booking aside (`#book`, `StickyAside`)

- **Price:** "From" (13px tertiary) **{adultPrice}** (22px/600) "/ adult" (13px secondary). For private-only tours: "/ boat". For quote-only tours: "Price on request".
- **Fees:** the mandatory fee line (§6.2.2), directly under the price.
- **Children:** `ti-baby-carriage` "Children from {childPrice}" (body-sm), only when a numeric child price exists.
- **Rows:**
  - `ti-calendar` "Next departure" … `departures[0].time`. If there are several departures: "Several departures daily". If there are none: "Time confirmed at booking". [CHANGE] The board's "Next available: Today, 18:00" needs availability data (§16).
  - `ti-sun` "Season" … `seasonLabel()`.
- **Notes:** `priceNotes` (season prices) in 13px tertiary. [DEVIATE, legal] Season-dependent pricing must be disclosed.
- **Divider**, then the CTAs:
  - **Primary** (padding 12, 14px/500, radius 8, full width): "Book group tour →" `/book/{slug}/group/` for instant-book tours, or "Enquire about this tour" `/contact/?tour={slug}` for quote-only tours.
  - **Secondary** (padding 10, 0.5px border, grey hover): `ti-crown` "Book as private charter" → `charterUrl(slug)`. Shown for group+private and private-only tours, **except `dubrovnik-one-way`**: it's a one-way transfer, so it uses "Enquire" instead.
  - On `create-perfect-day-private` (D-23), the primary CTA is "Plan your charter" → `charterUrl(slug)`.
- **Policy:** 13px centred, margin-top 10, `--color-text-success`, `ti-shield-check` + `CANCELLATION_SHORT`.

#### 6.3.5 Mobile (≤768)

- Single column: main → aside (preceded by an h2 "**Book now**", as designed) → reviews.
- Page `padding-bottom: var(--mobile-bar-height)`.

#### 6.3.6 `MobileActionBar`

- **Look:** fixed bottom, z `--z-mobile-bar`, `rgba(255,255,255,.97)`, top hairline, `--shadow-bar`, padding `12px 16px`.
- **Content:** price (16/500) + unit (13px) + the fee line, and a **single `<a href="#book">`** "Book now" (brand, padding `10px 22px`, ≥44px tall). [DEVIATE, a11y] The board wraps this link in a `div role=button`.
- **Behaviour:**
  - smooth scroll to `#book` (instant under reduced motion); `#book` has `scroll-margin-top: 72px` and `scroll-margin-bottom: 88px`
  - hides while `#book` is ≥15% in view (`IntersectionObserver`) using `translateY(110%)` + opacity over .3s, then gets `visibility: hidden` so it leaves the tab order
- **Spacing:** pages with the bar set `--mobile-bar-height` and `html { scroll-padding-bottom: calc(var(--mobile-bar-height) + 8px) }` (§11.15).

#### 6.3.7 SEO

[KEEP] TouristTrip + Offer (numeric prices only) + BreadcrumbList. The OG image comes from the first real photo.

**Acceptance criteria:**
- The Highlights bug is gone.
- Gallery slide 1 is a real photo on all 7 tours.
- Lightbox keyboard test passes.
- The aside never overlaps the footer.
- The mobile bar never covers a focused element (Playwright check, §11.15).

### 6.4 Destinations overview `/destinations/` (board 04)

**Files:**
- `destinations/index.astro`
- `DestinationsCatalog.vue`
- `DestinationCard.vue`

Responsive behaviour: §3.1.1, row "Destinations".

1. **Header:** overlay.
2. **`PhotoHero`** (§6.2.1 values):
   - eyebrow "Islands · Caves · Old towns"
   - h1 "Destinations"
   - lead [CHANGE, fact] "From Split's Riva to the outer islands, here's where our boats take you."
   - The lead is **white .88**. The board's grey lead comes from a CSS class collision (`.dest-desc`), not a design choice.
3. **Chips** (single-select, glass): All destinations · Islands (`ti-beach`) · Coastal towns (`ti-anchor`) · Caves & nature (`ti-mountain`) · Best for swimming (`ti-swimming`). Matching uses `categories[]` (§9.2).
4. **Section label** `h2`: 12px/500 uppercase, letter-spacing .06em, tertiary, margin-bottom 12. Text "{filter label} ({n})" [CHANGE] (the board keeps saying "All destinations" after filtering). Results area padding-top 28.
5. **Grid:** 2 columns, gap 20, margin-bottom 28. **1 column at ≤640** (gap 14, image 200), as designed. All 10 destinations, using `DestinationCard`.
6. **`DestinationCard`:**
   - **Card link:** `<a>` to `/destinations/{slug}/`, wrapping the body:
     - image 220px with a white region badge (neutral tone) at top-left
     - `h3` name (margin-bottom 6)
     - description: body-md, 2-line clamp allowed (the full text is on the linked page), margin-bottom 14
     - attribute chips: grey pills, 13px, 13px icon
   - **Footer** (padding-top 14, 0.5px hairline):
     - `ti-sailboat` "{n} tours visit here" (14/500 secondary)
     - a **separate sibling** `PillLink` "See tours →" `/tours/?destination={slug}`
     - On card hover the pill turns grey and its arrow moves +2px.
     - [DEVIATE, a11y + fact] On the board only Hvar links anywhere, and the other cards have dead buttons.
7. **[DROP]** the map dot strip and the "Not to miss" grouping.
8. **Empty state:** `ti-compass-off` "No destinations match this filter.", padding 2.5rem.
9. **Also strip:**
   - grey, radius 12, padding `1rem 1.25rem`, margin-top 8, flex wrap
   - "Not sure where to go?" (16/500)
   - "Browse all tours and filter by type or duration instead."
   - `Button secondary sm` "Browse tours →" (white, 0.5px border, padding `7px 14px`) [CHANGE] (the board's ↗ arrow suggests an external link)
10. **Footer:** margin-top 56px.

### 6.5 Destination detail `/destinations/[slug]/` (board 10)

**Files:** `destinations/[slug].astro`, today 707 lines, split into components. Data: §9.2.

Responsive behaviour: §3.1.1, row "Destination detail".

**Header and gallery:**
- Solid header, `Breadcrumb` (Destinations › {name}).
- Gallery (§6.3.2): tags from `tags` (brand, padding `4px 11px`) + `tipTag` (tip tone). The tag row wraps at `max-width: calc(100% - 90px)`.
- Grid `1fr var(--aside-width)`.

**Main column:**
1. **h1** (margin-bottom 12) + intro (body-md, margin-bottom `--detail-gap`).
2. **Highlights:** 2-column grey tiles (padding `9px 11px`, radius 8, body-sm, icon 1.2em `--color-highlight`), icons from the data.
   - **≤768: [KEEP design]** the `Marquee` (26s linear; items `flex: 0 0 220px`, gap 8; 24px edge masks).
   - [DEVIATE, a11y] only in how it's built: the real list stays as an `.sr-only` `<ul>` (never `display:none`); a pause button sits before the track; the duplicate set has `aria-hidden` and `inert`; under reduced motion, a 1-column grid replaces the marquee.
3. **Location & getting there:**
   - Map stub: a **real `<a>`** to `mapUrl` (new tab, sr "opens in a new tab"). 100px tall, grey, 1px card border, radius 12, `ti-map-2` in accent + "View on map: {distance} from Split by sea".
   - Geo `InfoTile` grid: 2 columns, 1 at ≤768.
4. **Insider tips:** numbered grey rows, number in accent, body-sm.
5. **Tours that visit {name} ({n})** (`#tours`, `scroll-margin-top: 72px`): grid `repeat(auto-fill, minmax(250px,1fr))`, gap 14, of `TourCard`. **`n` equals the number of cards rendered.**
6. **[DROP]** Best time to visit and Also nearby (D-11).

**Aside "{name} at a glance":**
- Padding `1.1rem 1.25rem`; heading 17px/500.
- Stat tiles (label 13px tertiary, value 14/500, padding `9px 11px`): Tours visiting · Best season (the months where `bestTimeMonths` is 3, e.g. "Jun – Sep") · From Split.
- [DROP] Current conditions (D-13).
- `Button primary` (padding 11, full width) `ti-sailboat` "Browse {name} tours" → `/tours/?destination={slug}`.
- `Button secondary` (padding 9) `ti-crown` "Plan a private charter" → charter URL.
- At ≤768 it renders after the main column (D-24).

**Mobile bar:** "{n} tours visit {name}" + `<a href="#tours">See tours</a>`. It hides while `#tours` is in view.

**SEO:** [KEEP] TouristDestination + BreadcrumbList.

---

## 7. Content pages

### 7.1 Shared

- Solid header; `.wrap` 960; page top padding `calc(24px + 1.5rem)`.
- h1: sans, `--font-size-hero`/500.
- Body text 16/1.6.
- **Card styles differ by page.** Use the values in each page's section, not one global card style.

### 7.2 Legal `/legal/{terms,privacy,cancellation}/` (board 12)

**[KEEP] three URLs.** A new `LegalLayout.astro` replaces the three copies. Props:
- `doc: 'terms' | 'privacy' | 'cancellation'`
- `updated`
- `summary[]`
- `sections[{id, icon, title}]`

**Layout:**
- Content wrap `--legal-width` (680px, TOC included), as designed. [DEVIATE, consistency] The header stays 960px; the board narrows it on this page only.
- **Document switcher:** `nav aria-label="Legal documents"` with 3 links styled as a segmented control (flex 1, padding 9px, 0.5px border; active: grey background, stronger border, `aria-current="page"`). At ≤768 the three stack ([DEVIATE, a11y]: at 360px three equal tabs wrap their labels).
- **Columns:** `180px | 1fr`, gap 24; 1 column at ≤768.
- **TOC:** `nav aria-label="On this page"`.
  - Real anchor links, padding `6px 10px`.
  - Active link: 2px accent left border + `--color-background-secondary` + weight 500, with `aria-current="true"`, set by an `IntersectionObserver` scrollspy [NEW].
  - Sticky from 769px up. At ≤768 it's static and stacked, as designed.

**Body:**
- h1 + meta (14px tertiary: "Last updated {LEGAL_UPDATED}"). [DROP] "GDPR compliant": an unsupported claim.
- "The short version" grey box: 13px uppercase label, `ti-circle-check` bullets.
- Sections: h2 18px with a blue icon, margin-bottom 10, padding-bottom 8, hairline. Paragraphs 16/1.6 secondary.
- Callouts use `Notice` tones `info` and `warn` (warn text `--color-category-tip-text`, amber-900, as designed).
- Tables: `.table-wrap` with overflow-x; th 13px uppercase; the first td bold.

**Numbers from config:**
- `CANCELLATION_HOURS = 48` and `WEATHER_NOTICE_HOURS = 4` (new numeric constants in `src/config/cancellation.ts`).
- Every cancellation string is derived from them, so the legal pages stop drifting from the rest of the site.

**Content fixes in PR 6** (facts that need no legal judgement):
- **Privacy, processors:** Teya, PayPal, **Resend** (email), **Netlify** (hosting, Blobs storage), **Cloudflare Turnstile** (once enabled).
  - Remove Google Analytics and Mailchimp: neither is used.
  - Each processor gets its role and country.
  - Transfer mechanisms are flagged "verify" for the lawyer.
- **Privacy, storage on your device** (wording confirmed by the lawyer): "We set no tracking or analytics cookies. We use `hbc_booking`, which is strictly necessary: it keeps your booking between steps for 2 hours. Cloudflare Turnstile runs on the contact and charter forms as a security check. `hbc_admin` is for staff login only."
- **Imprint and controller:** shown as soon as C-6 is answered.
- **Complaints:** "Email {SITE_EMAIL} or write to {address}. We confirm receipt and reply within 15 days" (lawyer verifies). **No EU ODR link**: the platform closed on 20 July 2025.

**For the lawyer (PR 11, D-18):**
- legal bases per purpose
- transfers
- the retention table (S-13)
- consumer complaint and alternative dispute resolution (ADR) wording
- jurisdiction clause (EU 1215/2012 Arts. 17–19)
- private charter deposit terms
- Croatian-language versions (D-3)
- accessibility statement (D-26)

### 7.3 FAQ `/faq/` (board 11)

**[KEEP]** the `FAQPage.vue` logic, `faq.ts`, and the FAQPage JSON-LD.

- **Hero:** h1 "Frequently asked questions" (sentence case, D-25) + lead.
- **Search:**
  - a `role=search` form, margin-bottom 24
  - `input type=search`, labelled "Search the FAQ" (label may be sr-only); placeholder "Search, e.g. cancel, children, weather…"
  - **blue** "Search" button with `type=submit`, which moves focus to the results heading
  - results still filter live as the user types
- **Layout:** `200px | 1fr`, gap 24.
- **Category filter:** a `div role=group aria-label="FAQ categories"`.
  - Buttons: 14px, padding `7px 12px`, radius 8, icon. Active: grey, 0.5px tertiary border, weight 500, `aria-pressed`.
  - Count pill: 13px, white, 0.5px border, radius 10.
  - Sticky at `top: calc(var(--site-header-height) + 16px)` from 769px up. At ≤768 it's **static and stacked**, as designed.
- **[CHANGE] Counts follow the search.** Each category shows its match count; "All" shows the total matches. This fixes the bug where "All" equals the selected category's count.
- **Groups:**
  - margin-bottom 28
  - header with padding-bottom 10 and a hairline; 30px icon tile (radius 8, category colour) + h2 18px
  - list: 1px card border, radius 12
  - question: a button, 16/500, line-height 1.3, 15px chevron
  - answer: 16/1.6 secondary, padding `14px 14px 16px`, links allowed
  - only one item open per group
- **No results:** `ti-mood-sad` "No questions match your search." + "Show all questions", which clears the search **and** the category.
- **Contact band:** `CtaBand plain` (grey, padding `1.25rem 1.5rem`).
  - h2 17px/500 "Still have a question?" + `REPLY_TIME` line
  - `mailto:` "Email us" (`ti-mail`, secondary) + `tel:` "Call us" (`ti-phone`, primary); 14px, padding `7px 14px`
  - [KEEP] real `mailto:`/`tel:` links (on the board both buttons go to `/contact/`)
- **New questions from the board** (pay in full, pets, accessibility, welcome drink, under-3s) are added only after owner confirmation (C-11 to C-15).

### 7.4 About `/about/` (board 13)

**[KEEP]** `about.ts` as the data source, h2 sections, `blockquote`, and `data-scroll-region`.

1. **Hero image:** 200px tall, radius 12. A real photo (C-17), otherwise the grey fallback with a 52px icon.
2. **Two columns**, `1fr 280px` (1 at ≤768):
   - **Left:** h1 + intro paragraphs (owner copy).
   - **Right:** trust grid, 2×2 (1 column at ≤768), of grey tiles, each with:
     - 16px accent icon
     - number 20px/500 (`--font-size-xl`)
     - label 16px secondary
     
     **Confirmed stats only** (C-1 to C-3, C-7). Years come from `FOUNDING_YEAR`.
3. **"How we got here":** `Timeline variant="history"`.
   - Line: 0.5px at left 7px.
   - Dots: 16px white with a 2px `--color-border-secondary` ring. First and last are active: accent ring + 6px accent centre.
   - Year: 13px/500 uppercase, letter-spacing .06em, accent.
   - Entries come from `about.ts` (C-5).
4. **"Meet the crew":** 3 columns.
   - **Card:** grey, with a **100px-tall full-width band** on top. The band shows the real photo (`object-fit: cover`) once consent is given; until then it's white with a 32px `ti-user-circle` in `--color-border-secondary`.
   - **Body** (padding 12): name 16/500; role 13px accent uppercase, letter-spacing .04em; bio.
   - **≤768:** scroll-snap row (40%; 80% at ≤480) with `data-scroll-region`.
5. **"What we believe in":** 2×2 value tiles (1 column at ≤768).
6. **"As featured in": [DROP]** unless real press exists (C-4). If guest quotes are approved under D-5 rules, show "What guests say" instead.
7. **`CtaBand plain`:** h2 20px/500 "Come sailing with us"; padding 1.5rem; text "Group tours depart daily in season. Private charters for up to 12 guests."; "Browse tours" (primary) + "Plan a private charter" (secondary).

### 7.5 Contact `/contact/` (board 14)

**[KEEP]** the whole pipeline: `contact-form.ts`, `/api/contact`, validation, honeypot, `_startedAt`, Turnstile slot, rate limit, status region, `?tour=` preselect. [NEW] Progressive enhancement per §3.5.

1. **Heading:** h1 "Contact us" + lead (with `REPLY_TIME`). Fix the live bug where the intro is misaligned.
2. **Contact cards** (2×2; 1 column at ≤768): **grey, borderless tiles**, padding `16px 18px`, radius 12, hover `--color-background-hover`.
   - Each card has a 36px icon tile (radius 8), a type label (13px uppercase tertiary), a value (17/500) and a sub-line (16 secondary).
   - Every card is an `<a>` ([KEEP]; the board uses `div`s). Icon tile colours:

   | Card | Icon tile | Link |
   |---|---|---|
   | Phone | blue-100 / blue-900 | `tel:` |
   | WhatsApp | blue-100 / blue-900 | `wa.me`, opens in a new tab |
   | Email | blue-100 / blue-500 | `mailto:` |
   | Find us | amber-100 / amber-900 | `MEETING_POINT_MAP_URL`, "Riva promenade, stand 14, Split" |

   All values come from `site.ts`.
3. **Hours card:** grey, two columns.
   - "Response hours" from `OFFICE_HOURS`. The default is `null`: no hours line and no badge until C-8 is answered.
   - **[CHANGE]** "Open now" is computed client-side in Europe/Zagreb time and always shown as text ("Open now, until 18:00" or "Closed, opens 09:00"). Without JS it shows nothing. Pill: 13px/500, blue-100, 6px accent dot.
   - "Season": `seasonLabel()` + the owner-confirmed note.
4. **Form card:** white, 1px card border, radius 12.
   - `h2` "Send us a message".
   - `FormField` grid, 2 columns (1 at ≤768):
     - **First name\***, **Last name\*** (D-10; `autocomplete=given-name` / `family-name`)
     - **Email\***
     - **Phone (optional)**
   - **Subject** select, with the board's options and wording:

     | Option | Stored `topic` |
     |---|---|
     | General enquiry | `general` |
     | Group booking question | `group` |
     | Private charter enquiry | `charter` |
     | Cancellation or rescheduling | `change` |
     | Feedback or complaint | `feedback` |
     | Press / media | `press` |

     **Tour** select: shown for `group`, `charter` or `change`, or when `?tour` is set.
   - For `change`, a **Booking reference** field. The admin help text says changes are confirmed only by email to the address on the booking.
   - **Message\***. Required marker legend: "Fields marked * are required".
   - Privacy line [NEW]: "We use your details only to answer your message. See our Privacy policy."
   - Button "Send message →": inline, padding `11px 22px`, margin-top 16.
5. **Map stub:** 140px tall, a real link to the meeting point on the map. **No embedded map.**
6. **Meeting note:** current real copy.
7. **API changes:**
   - optional `topic` enum and `bookingRef` in `contact-validation.ts`, with tests
   - stored on `Enquiry`
   - shown in the admin enquiries list and the admin email
   - form-encoded bodies accepted (§3.5)

### 7.6 404 and NotFoundPanel

- **`404.astro`:** SiteLayout (solid header). A centred panel:
  - 56px blue-100 circle with `ti-compass-off`
  - h1 "Page not found"
  - a short line of text
  - "Browse all tours" (primary) + "Back to home" (secondary)
  
  Keep the `.nf-icon` class: the admin uses it too (§12).
- **`NotFoundPanel.astro`:** delete it, together with its unreachable branch in `tours/[slug].astro`. It references 8 undefined tokens.

---

## 8. Booking flows

### 8.1 Group booking (boards 05 → 07 → pay → 08 / 09)

#### 8.1.1 Shared

- **Chrome:** `checkout` layout, `MiniNav` (with Exit), `TrustStrip` (§5.3). Column `--flow-width`, padding 24 (16 at ≤768), top padding `calc(24px + 1.5rem)`.
- **`StepBar`:** `<ol aria-label="Booking progress">` with Tour type ✓ · Date & guests · Review · Payment.
  - Dots are 22px, joined by lines.
  - Done: blue-100 with a blue-900 check and sr text "completed".
  - Active: brand fill, white number, `aria-current="step"`.
  - Next: grey with a border.
  - At ≤420px, the labels of non-current steps are visually hidden.
  - Used on group, review and pay (pay shows step 4 active).
- **Headings:** sr-only `h1` on each page; card titles are `h2`.
- **Cards:** 1px card border, radius 12, padding 1.25rem, margin-bottom 14 (12 on review). Title 18/500 with a 16px accent icon; sub 16/1.6 secondary, margin-bottom 14.

#### 8.1.2 Step 2: `/book/[slug]/group/` (`GroupBookingFlow.vue` → composed of the §3.2 booking components)

| Element | Spec |
|---|---|
| Tour snapshot | Grey, radius 12, padding `12px 14px`, margin-bottom 20. 56px thumbnail (real photo), name, "{duration} · {meetingPointShort}". No rating unless D-5. |
| `BookingCalendar` "Choose a date" | [KEEP] Monday-first grid; `aria-pressed`; `aria-current="date"`; month change announced with `aria-live`. Day cells 36px, radius 8, gap 4 (2 at ≤768). Hover grey with a border. Weekday headers 12px/500 tertiary. Today outlined in info blue; selected day brand-filled. Day names read like "Tuesday 14 April 2027", with ", selected" or ", outside the season" appended. **[CHANGE]** Days outside the season (D-15) are `aria-disabled`, explained by a **visible legend** under the grid (not a tooltip). "Today" uses Europe/Zagreb (`businessDate`), and so does `renderedOn` in `group.astro`. **[DROP]** availability dots until real availability data exists (§16). Can't navigate before the current month. |
| Departure time | Data-driven (D-16). **None:** the line "Departure time confirmed at booking" (as today). **One:** a read-only line "Check-in {checkIn} · departure {time}". **Several:** `ChoiceCards`, 2 columns, gap 10, padding `14px 16px`, 36px icon tile, time 17/500. The server accepts `slot === ''` only when `departures` is empty; otherwise the slot must be one of `departures`. |
| `GuestSteppers` "How many guests?" | Adults "{adult band} · €{adult}" (min 1) · Children "{child band} · €{child}" (min 0) · **[NEW] Infants** "Under {infantMaxAge + 1} · free" (min 0, D-9). **The cap of 12 counts all three.** Steppers are 28px with a ≥24px hit area. At a bound they get `aria-disabled`. One `role=status` region announces "3 adults" and the cap warning. |
| Hold note | **[DROP]** "Your spots are held for 12 minutes" (PR 0a hotfix, S-1). In its place, the board's grey lock box: "We confirm your seats as soon as you pay." |
| Your details | `FormField`s: First\*, Last\*, Email\*, Phone (label "Phone, so the skipper can reach you on the day"), and **"Anything the crew should know? (optional)"** with the hint "For example, a child seat or a late arrival. Please tell us about health matters (allergies, mobility) by phone or in person, not here." **[CHANGE, GDPR Art. 9; lawyer verifies, S-5]** The field doesn't invite health data. Notes are capped at 500 characters. `autocomplete` tokens [KEEP]. |
| `SummaryCard` | Tour · Date · Departure · Guests ("2 adults, 1 child, 1 infant") · Adults n × €a · Children n × €c (only when > 0) · **Total** (17/500). Note [CHANGE, legal]: replace the board's "Includes all taxes and fees" with "+ {mandatory fees} paid on site" plus a 13px `priceNotes` summary. |
| CTAs | **Review booking →** (primary, padding 13, full width): [KEEP] gated with `aria-disabled` plus a hint · "← Back to tour" (secondary, padding 10) · policy line (14px success colour) `CANCELLATION_SHORT`. |
| Submit [CHANGE] | A real `<form method="post" action="/api/bookings/draft">`. With JS it's sent by `fetch` (§3.5). **Nothing goes in the URL. No `sessionStorage`.** |
| Prefill [NEW] | On mount, the island calls `GET /api/bookings/draft` (same origin; reads the booking cookie). If a valid draft exists for this tour, every field is restored, so **Edit** from the review page needs no retyping (WCAG 3.3.7). |

#### 8.1.3 Step 3: `/book/[slug]/review/` (`review.astro`)

- **Input:** reads the sealed `hbc_booking` cookie (§8.1.6). No cookie, an expired cookie, or a cookie for a different tour slug → 303 to step 2 with `?error=session-expired`. No personal data is rendered in that case.
- **Headers:** `Cache-Control: no-store`, `Referrer-Policy: no-referrer`.
- **Server:** recomputes the price [KEEP].
- **Cards:**
  1. **Tour details** (Edit): 64px thumbnail, a type badge (radius 20, 12px/500; "Group tour" in brand tone), date, departure, duration, meeting point. Row icons are 13px.
  2. **Guests** (Edit): line items.
  3. **Guest details** (Edit).
  4. **Price breakdown:** total 20px/500, then the mandatory on-site fees with amounts (C-23).
  5. **Cancellation policy:** `ti-shield-check` in success colour; grey box with `CANCELLATION_FULL`.
- **Edit links:** labelled with context (`aria-label="Edit guest details"`); they go to `/book/{slug}/group/`, which prefills from the cookie.
- **Pre-contract text** directly above the button (lawyer confirms the wording and whether this is a leisure service or passenger transport):

  > "This booking is for a leisure service on a fixed date, so the 14-day right of withdrawal for online purchases does not apply. You can still cancel under our [cancellation policy](/legal/cancellation/): {CANCELLATION_SHORT}. By continuing you agree to our [Terms](/legal/terms/). How we use your data: [Privacy policy](/legal/privacy/)."
- **Submit:** "Continue to payment →" POSTs to `/api/bookings` with a hidden `termsVersion`.
- **Errors:** `?error=` shows an alert [KEEP] (`role=alert`), with codes only.

#### 8.1.4 Step 4: `/booking/pay/` [KEEP, restyle]

- **Layout:** `SummaryCard`, then [NEW] payment-method cards. Board 07 has no payment UI; these are `ChoiceCards` styled like the slot cards: Card via Teya (default) and PayPal.
- **Above the button:**
  - the mandatory fee line
  - the withdrawal-exemption sentence repeated (short form)
- **Button:** names the amount ("Pay €{total}"), as consumer law requires for the final order button.
- **Demo mode:** the banner stays prominent (`PAYMENTS_ARE_DEMO`). "Demo: simulate a declined payment" stays as a secondary text button.
- **Headers:** `Referrer-Policy: no-referrer`.

#### 8.1.5 Success and error pages

**`/booking/success/?id=`** (board 08):
- **Hero:** 72px blue-100 circle with `ti-check`, h1 "You're booked!".
- **Email line:** "Confirmation sent to {masked email}" only when it was really sent; otherwise the demo wording [KEEP].
- **Reference:** grey bar "Booking ref **{ref}**" + [NEW] a Copy button (`navigator.clipboard.writeText`; `role=status` says "Copied" for 1.5s; falls back to selecting the text).
- **Your booking:** tour, date, departure + meeting point, guests, total paid, payment method, invoice number (demo label).
- **[CHANGE, privacy, S-3]** No name, phone or notes on this page, and the email is masked.
- **"Where to meet us"** (grey, 2 columns; 1 at ≤768):
  - location
  - [NEW] "Arrive by {checkIn ?? departure − 15 min}"
  - what to bring
  - "Our crew will meet you at the stand" (no captain name)
  - map **link**
- **"What happens next":** 3 rows. Weather wording comes from `CANCELLATION_WEATHER` (4h). **Don't** port the board's "24h".
- **Bottom:** "Browse more tours" (secondary).
- **Headers:** `Referrer-Policy: no-referrer`, `Cache-Control: no-store`.
- **Print stylesheet:** hides the header, footer and buttons.
- **Cookie:** the page clears `hbc_booking`.

**`/booking/error/`** (board 09):
- **Hero:** red-100 circle with `ti-x`, h1 "Payment unsuccessful", text [CHANGE] "You haven't been charged."
- **Note:** `Notice danger`, `role=alert`, "We don't hold seats until you pay. You can try again now, or call us and we'll book it for you." **[DROP]** both of the board's hold messages (the red "8 minutes" note and the amber `hold-warn` box).
- **Body:** reasons list (grey rows); help strip with a Contact link.
- **Buttons:** "Try payment again" → `/booking/pay/?id` [KEEP]; "Back to tours".
- **Variants:** [KEEP] the "We couldn't save your booking" variant.

#### 8.1.6 Booking session and API (PR 7a)

**Booking session: a sealed cookie, not a server draft store.** This means:
- no shareable link to someone's personal data
- no Blobs writes per draft, so no credit cost
- nothing stored that would need deleting later

| Item | Spec |
|---|---|
| Cookie | `hbc_booking` = AES-256-GCM sealed JSON `{v, tourSlug, date, slot, adults, children, infants, firstName, lastName, email, phone, notes, createdAt, bookingId?}`. Key from the `BOOKING_COOKIE_SECRET` env var (32 bytes, base64; added to `.env.example` and the Netlify env). Attributes `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=7200`. The total stays under 4 KB because notes are capped at 500 characters. Implemented in `src/lib/bookings/session.ts` with `node:crypto`, plus unit tests for seal/open, tampering, expiry and a wrong key. |
| `POST /api/bookings/draft` [NEW] | Parses with the existing `parseGroupBookingParams` (extended with infants). Enforces the 16 KB body cap from `api/contact.ts`. Rate limit `draft` 30 per 10 min, **fails closed** (S-11). Validates; then sets the cookie and returns 200 JSON `{redirect: "/book/{slug}/review/"}` or 303 (§3.5). On failure: 400 JSON with field errors, or 303 to step 2 with `?error=`. |
| `GET /api/bookings/draft` [NEW] | Returns the opened cookie's fields as JSON (`Cache-Control: no-store`), or 204. Used for the step-2 prefill. |
| `GET /book/[slug]/review/` | Reads the cookie (§8.1.3). **Old query-string personal-data parameters are rejected**: 303 to step 2, ignoring the parameters. |
| `POST /api/bookings` | Reads the cookie, re-validates, recomputes. **`termsVersion` must equal `TERMS_VERSION`**; otherwise 303 back with `?error=terms-changed`. The server stores its own constant and server time as `termsAcceptedAt`. Creates the booking (§9.4), re-seals the cookie with `bookingId`, then 303 → `/booking/pay/?id=`. **If the cookie already has a `bookingId`, it redirects to that booking's pay page** instead of creating a duplicate. **On failure it redirects to `/book/{slug}/review/?error={code}` only. The current `bookingReviewPath(slug, {...fields, error})` redirect (`api/bookings.ts:38-40`) is deleted.** |
| Tests | No `Location` header from any booking route contains `@`, `firstName`, `email`, `phone` or `notes`. Cross-site `Origin` gets 403 on every POST (S-9). Content types other than form or JSON get 415. |

### 8.2 Private charter request (board 06) [NEW] (D-7, D-8, D-23)

**Route:** `/private-charter/`.
- Prerendered, **noindex** (the landing page is `/tours/create-perfect-day-private/`, D-23).
- `?tour=` is read client-side in `onMounted` (as `ToursCatalog` does). An unknown `tour` value falls back to "Your own route".
- `_redirects`: `/book/:slug/private` → `/private-charter/?tour=:slug 301` (the rule format is valid; the current rule uses it).

**Charter URL constant** (§9.3): every charter CTA uses `charterUrl()`. It points to `/contact/?tour=create-perfect-day-private` until PR 8 switches it, so earlier PRs never link to a page that doesn't exist yet.

**Layout** (board 06, `--flow-width`, checkout chrome): `MiniNav` (Exit → `/tours/{tour}/` or `/tours/`), then:

1. [NEW] Visible h1 "Plan your private charter" + lead: "Tell us what you have in mind. We'll confirm availability and reply with a quote and a secure payment link, usually within {REPLY_TIME}. No contract is made and nothing is charged until you accept our quote."
   - **[DEVIATE, honesty] No StepBar.** The board's steps end in "Payment", and there is none here.
2. **Card "Choose your route":** `ChoiceCards`, 2 columns (1 at ≤768), gap 8, padding `11px 13px`, 18px accent icon. Selected: 2px brand border + blue-100. **Routes come from `charter.ts`** (D-8). Prefilled from `?tour`.
3. **Card "When and how long":** a 3-column field grid (2 at ≤768, 1 at ≤480).
   - **Date:** the shared `BookingCalendar` [DEVIATE, season limits D-15]; the board uses a bare `type=date`.
   - **Preferred departure time:** `type=time`, default **10:00** (as designed).
   - **Duration:** a native `<select>` (as designed) from `charter.durations`.
4. **Card "Guests":** `GuestSteppers` with the cap from the data.
5. **Card "Add extras: optional":** the "optional" part is 14px tertiary. Native checkboxes in rows: 34px icon tile, price on the right, 18px checkbox. **Rendered only if `charter.extras` is non-empty.**
6. **Card "Special requests"** (`ti-message`): a textarea with a visible label and the same hint as §8.1.2. Capped at 500 characters.
7. **Card "Your details":** first, last, email, phone (required for charters). Hidden honeypot, `_startedAt`, and the Turnstile widget.
8. **`SummaryCard` "Your charter":** route · date · time · duration · guests · extras · either "**Estimated from €X**" (only with a `charter.priceTable`) or "We'll send you a quote". Note: "Final price is in your quote. Nothing is charged now."
9. **CTA "Send request →"** (primary) + privacy line + a link to the charter cancellation terms.
10. `TrustStrip`.

**Submit:** `POST /api/charter-request` (§3.5 contract).
- Same pipeline as `/api/contact`: 16 KB body cap, rate limit `charter` 5 per 10 min **failing closed**, global cap 30 per hour, honeypot, `_startedAt`, validation in `src/lib/charter-validation.ts` (+ tests).
- **Turnstile is required.** The endpoint returns 503 ("Charter requests are temporarily unavailable, please email us") unless both Turnstile keys are set (S-6). Turnstile setup is therefore a go-live blocker for PR 8, not a build blocker.
- The server recomputes the estimate. It stores an `Enquiry` with `kind: 'charter'` and admin-notifies through the capped notifier (S-6).
- **No customer auto-reply** (D-22).

**After submit:** the island swaps to a "Request received" state with focus on its h2. The page shows a check icon, "We've sent your request. You'll get a quote at {email} within {REPLY_TIME}.", a summary, and "Browse group tours". Without JS: 303 to `/private-charter/?sent=1`, which shows the same state.

**Admin:** `/admin/enquiries/` shows the charter fields in a structured block. Quote and payment-link actions belong to payments-plan Phase 5.

---

## 9. Data model

### 9.1 `TourDetail` (`src/types/tour.ts`, `src/data/tour-catalog.ts`): PR 1b

| Field | Type | Purpose / source |
|---|---|---|
| `adultPrice` / `childPrice` | `number \| null` | Numeric prices. Migrated from `fromPrice` and `priceNotes`. `fromPrice` is **deleted**; its label is derived with `formatFromPrice(adultPrice, priceUnit)`. |
| `priceUnit` | `'person' \| 'boat'` | explicit |
| `durationShort` / `durationHours` | `string` / `number` | card label; Half-day filter; sort |
| `departures` | `{ time: string; checkIn?: string; label?: string }[]` | Migrated from the `departure` string. **May be empty** (time to be confirmed: `blue-lagoon-afternoon`). |
| `itinerary` | `{ time?: string; label: string; description?: string; icon: string }[]` | Migrated from `string[]`. The owner adds times and descriptions (C-19). Only `TourDetailView` reads it. |
| `tags` | `('sunset' \| 'swim' \| 'snorkel' \| 'cave' \| 'half-day' \| 'family')[]` | Filters. Replaces text inference. |
| `featured` | `boolean` | **Stays.** Used for slider order and the "Recommended" sort. |
| `badge` | `'bestseller' \| 'pick' \| 'new' \| null` | Display only. `'bestseller'` needs `BESTSELLER_EVIDENCE` in config (C-24). |
| `additionalFees` | `{ text: string; amountLabel?: string; mandatory: boolean; url?: string }[]` | From `caveTicketNote`. C-23. |
| `languages` / `ageBands` | `string[]?` / `{ adult: string; child: string; infantMaxAge: number }` | Owner-supplied. Defaults come from the catalog. |

**Code that reads these fields** (migrate in PR 1b):
- `src/lib/price.ts` + `price.test.ts:32-33`
- `src/lib/seo.ts:89`
- `src/lib/tour-filters.ts:51-71,85-94`
- `src/lib/booking.ts:17-28` (`supportsInstantBook`, `tourPriceUnit`) + `booking.test.ts:78-87`
- `src/lib/tours.ts:22`
- `src/lib/admin/sample-data.ts:135-136`
- `GroupBookingFlow.vue:41,126-151`
- `review.astro:56-80`
- `TourDetailView.astro:31`
- `destinations/[slug].astro:275`
- `index.astro`

**Migration tests:**
- The old regex parsers survive only as a test that proves the new numbers equal the old strings.
- `catalog.test.ts` checks two things:
  - every bookable tour has numeric prices, plus either ≥1 departure or `departures: []` with a comment
  - every icon used exists in the icon subset

**Out of scope:** seasonal pricing (payments plan D8).

### 9.2 `Destination` (`src/data/destinations.ts`): PR 1b

- `highlights: { icon: string; text: string }[]` (was `string[]`)
- `categories: ('island' | 'coastal-town' | 'cave-nature' | 'swimming')[]`
- `tagline: string` (one line, for the bento)
- `bentoOrder?: number`
- `mapUrl: string` (same format as `MEETING_POINT_MAP_URL`)

### 9.3 New data and config: PR 1b

| File | Contents |
|---|---|
| `src/data/marketing.ts` | hero slides (`titleLines`, sub, CTA, image key, position) · trust items (`confirmed` flag) · how-it-works steps · type-card copy · CTA band copy |
| `src/data/reviews.ts` | `{ source: null, …, items: [] }` by default (D-5) |
| `src/data/charter.ts` | `routes`, `durations`, `priceTable?`, `extras?`, `maxGuests` (D-8) |
| `src/config/season.ts` | `SEASON_START = '04-01'`, `SEASON_END = '11-30'`, `isInSeason()`, `seasonLabel()` |
| `src/config/site.ts` (additions) | `FOUNDING_YEAR = 2016`, `OFFICE_HOURS = null`, `REPLY_TIME = 'the same day'`, `BESTSELLER_EVIDENCE = null`, `SITE_THEME_COLOR = '#1a6fc4'` |
| `src/config/legal.ts` | `TERMS_VERSION`, `LEGAL_UPDATED`, `IMPRINT = null` |
| `src/config/cancellation.ts` | `CANCELLATION_HOURS = 48`, `WEATHER_NOTICE_HOURS = 4`; every string derived from these |
| `src/config/routes.ts` | `charterUrl(slug?)`. Until PR 8 it returns `/contact/?tour={slug ?? 'create-perfect-day-private'}`; from PR 8, `/private-charter/` (+ `?tour=`). Every charter CTA uses it, including the `contactHrefForTour` uses in `index.astro:64,209,244`, `destinations/[slug].astro:335`, `about/index.astro:120`, `faq.ts:124,131`, `Footer.astro:27` and `TourDetailView.astro:228`. |
| `src/config/security-headers.ts` | the header set and CSP string shared by middleware and a `netlify.toml` comparison test (S-7) |

### 9.4 Stored records (`src/lib/bookings/store.ts`)

- **Reading old records:** add `normalizeBooking()` and `normalizeEnquiry()` to the store's `get`/`list` paths (`infants ?? 0`, `kind ?? 'contact'`, `lineItems ??` derived). **All new fields are optional and additive**, so rolling back one deploy can still read new records (§15.3).
- **`Booking`:**
  - `+ infants`
  - `+ lineItems: {label, unit, qty, amount}[]`
  - `+ termsAcceptedAt`, `termsVersion`
  - `+ personalDataRemovedAt?` (S-13)
- **`seatCount(b) = adults + children + infants`** replaces every `adults + children` sum. Files to update:
  - `manifest.ts:54,88-89`
  - `admin/bookings/index.astro:71`
  - `sample-data.ts:84`
  - `bookings/[id].astro:123`
  - `csv.ts:24` (add an Infants column)
  - `guestSummaryFromCounts`
  - every `MAX_GUESTS` check (`hasRequiredBookingDetails`, `createPendingBooking`, `parseGroupBookingParams`, `bump`)
- **`Enquiry`:**
  - `+ kind: 'contact' | 'charter'` (optional on read)
  - `+ topic?`, `bookingRef?`
  - `+ charter?: { routeId, date, time, durationH, adults, children, infants, extras[], estimate? }`
- **Sample data** (`sample-data.ts`), updated in the PR that adds each field:
  - PR 6: `topic`
  - PR 7a: infants on 2 bookings, including the deliberately overbooked departure; `lineItems`; `termsVersion`
  - PR 8: 2 charter enquiries, one with an estimate

  `admin.test.ts` asserts that seat totals include infants.
- **Emails** (`templates.ts`), PR 7a:
  - **Accent colour** `#1d9e75` → `#1a6fc4` / `#0c447c`.
  - **The customer confirmation contains, as text** (a link is not a durable medium, CJEU C-49/11; lawyer verifies):
    - trader identity (from `IMPRINT`, once set)
    - tour, date, departure, meeting point
    - guests incl. infants, line items, total paid
    - **mandatory on-site fees with amounts**
    - full `CANCELLATION_FULL` + `CANCELLATION_WEATHER`
    - the withdrawal-exemption sentence
    - how to complain
    - `termsVersion`
    
    Links are extras.
  - **Admin booking email:** includes infants. **Notes are not put into any email body.** The admin email says "Has notes, see admin".
  - **Admin enquiry email:** shows topic and charter fields.

---

## 10. Security and privacy

| # | Item | Where | PR |
|---|---|---|---|
| S-1 | Remove the false "held for 12 minutes" claim. On the production branch it's around `GroupBookingFlow.vue:357` on `main`, `:383-386` on the showcase branch. | hotfix | **0a** |
| S-2 | No personal data in URLs: sealed cookie, code-only error redirects, old query parameters rejected | §8.1.6 | 7a |
| S-3 | Success page: no name, phone or notes; email masked; `no-store` + `no-referrer` | §8.1.5 | 7b |
| S-4 | Pre-contract text on review and pay; server-side `termsVersion` and `termsAcceptedAt`; durable-medium confirmation email | §8.1.3–8.1.4, §9.4 | 7a/7b |
| S-5 | Health data (GDPR Art. 9): the notes field doesn't invite it; notes are kept out of emails and logs, capped at 500 characters, and deleted 30 days after the trip (S-13). Lawyer verifies the basis and wording. | §8.1.2, §8.2 | 7b, 8 |
| S-6 | Abuse and quota limits: charter needs Turnstile (503 without it); admin notifications for contact and charter **capped at 40/day** (Blobs counter; over the cap, stored and shown in admin only); booking confirmations never capped; no customer auto-reply (D-22) | §8.2, `send.ts` | 6, 8 |
| S-7 | **Security headers on server-rendered responses: confirmed missing in production today** (`/admin/login/` and `/booking/pay/` have no CSP, X-Frame-Options or Referrer-Policy, so the admin can be framed and clickjacked). `src/middleware.ts` sets them from `src/config/security-headers.ts` on every non-prerendered response, redirects included: CSP (same as `netlify.toml`), `X-Frame-Options: DENY`, `Referrer-Policy` (`strict-origin-when-cross-origin`; `no-referrer` on `/booking/*`, `/book/*/review/`, `/admin/*`), `X-Content-Type-Options`, `Permissions-Policy`. A Vitest test calls the middleware for `/admin/login/`, `/booking/pay/`, `/book/x/review/` and `/api/contact` and asserts the headers. Another test checks that `netlify.toml`'s CSP matches the constant. Check with `curl -sI` after deploy. | middleware | **0a** |
| S-8 | CSP additions: `media-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`. PR 9 evaluates Astro's hash-based `security.csp` to drop `'unsafe-inline'` from `script-src`. `style-src 'unsafe-inline'` stays. Templates that render customer text get an XSS escaping test (`<img src=x onerror=…>`), covering pages and `templates.ts`. | `netlify.toml`, constant | 0a (additions), 9 |
| S-9 | CSRF: `security: { checkOrigin: true }` set explicitly in `astro.config.mjs`. Every POST endpoint accepts only form-encoded or JSON bodies (415 otherwise). A test sends a cross-site `Origin` and expects 403 on `/api/bookings`, `/api/bookings/draft`, `/api/charter-request`, `/api/contact`, `/booking/pay/`. | config, endpoints | 0a (config), 7a, 8 |
| S-10 | Privacy policy factual fixes (processors and roles, storage on the device, controller once known). **The policy must name the controller and the real processors before PR 7b or PR 8 reach production.** | §7.2 | 6 |
| S-11 | Rate limiting. Keys are `HMAC-SHA256(RATE_LIMIT_SALT, ip)` truncated to 16 bytes, with IPv6 cut to its /64 first; never the raw IP. Bucket keys carry the UTC date, and writes sweep the previous days' keys. `/api/contact` stays fail-open; the draft and charter endpoints **fail closed** (503). Global caps: draft 300 per 10 min, charter 30 per hour. | `rate-limit.ts` | 7a |
| S-12 | Booking state never touches `sessionStorage` or `localStorage`. The cookie is cleared on success. | §8.1.6 | 7a |
| S-13 | **Retention** (figures confirmed in PR 11): booking cookie 2h; rate-limit buckets 24h; enquiries 12 months after the last activity; booking `notes` 30 days after the trip; `phone` 90 days after the trip; invoice-relevant fields (ref, date, amounts, invoice numbers, name) for the statutory period, which the accountant confirms (often 11 years). Outbox emails: `html`/`text` dropped after 90 days, metadata kept. A sweep runs when the admin dashboard loads (and as a scheduled function if one fits within free credits; check the cost first). Swept records show "Personal data removed on {date}". | store, admin | 7a |
| S-14 | Content guard: a test over `src/**` and the built HTML fails on `example.com`, `Marina Pier B`, `help@`, `hello@`, `privacy@`, `+385 20 123 456`, `Elafiti`, `GDPR compliant`, and on "Best seller" unless `BESTSELLER_EVIDENCE` is set | `src/lib/content-guard.test.ts` | 3 |
| S-15 | The admin login keeps its label, `autocomplete="current-password"`, paste allowed, no CAPTCHA puzzle (WCAG 3.3.8), and its existing rate limit (5 per 10 min). | admin | 10 |

---

## 11. Accessibility (WCAG 2.2 AA)

1. **Focus visible** everywhere (§4.5). Never `outline: none` without a replacement.
2. **Headings:** one static `h1` per page; sections are `h2`; cards are `h3`. No `p` or `div` used as a heading.
3. **Carousel:**
   - a pause control comes first in DOM order
   - pauses on hover and focus
   - no auto-rotation under reduced motion
   - inactive slides `inert`
   - live region `off` while rotating, `polite` when paused
   - controls have a ≥24px hit area
4. **Marquees:**
   - a pause button before the track
   - duplicates `aria-hidden` and `inert`
   - the real list stays in the accessibility tree
   - static wrapped layout under reduced motion
5. **No nested interactive elements:** card links contain no buttons; mobile bars are a single link.
6. **Dialog:** native `<dialog>`, focus trapped and returned, Escape closes, labelled.
7. **Real controls only:**
   - contact cards, map stubs and the legal TOC are links
   - FAQ filters are buttons inside `role=group`
   - choices are **native** radios and checkboxes inside `fieldset`/`legend`; no ARIA radio or checkbox roles
8. **Forms:**
   - visible labels and `autocomplete`
   - required markers with a legend
   - errors linked with `aria-describedby`
   - one status region per form
   - gated CTAs use `aria-disabled` plus a hint
   - after a server error, entered values are kept
9. **Contrast:**
   - text ≥4.5:1; display text ≥24px needs ≥3:1. Text on photos is measured against the **lightest** pixel under it, and the result is recorded.
   - Form-control borders `--color-border-input` (3.45:1).
   - Glass chips and pills on photos are measured. The pressed state is never conveyed by colour alone: white fill vs glass, plus `aria-pressed`.
   - Warning text uses amber-700 or amber-900.
10. **Stars:** decorative glyphs are `aria-hidden`; the text reads "4.9 out of 5".
11. **Video:** the audio is stripped (video-only), so a text description linked with `aria-describedby` meets 1.2.1. If audio is ever kept, the video needs captions **and** audio description, or it doesn't ship.
12. **Target size:**
    - ≥24×24px everywhere (2.5.8, AA). **Visible sizes follow the design** (chips 38, steppers 28, calendar navigation 28, day cells 36, slider arrows and pills 36); hit areas are extended with padding where controls sit within 24px of each other.
    - `--touch-min` (44px) only for the hamburger, mobile menu links, mobile action bar CTA, lightbox controls and the hero pause button.
13. **Reflow at 320px:**
    - no horizontal page scroll
    - intentional horizontal scrollers become focusable labelled regions when they overflow (`data-scroll-region` pattern)
    - line clamps only on cards whose link leads to the full text
14. **Short viewports, `@media (max-height: 480px)`:**
    - header `position: static`
    - `MobileActionBar` not rendered
    - sticky asides and TOCs static
    - hero `height: auto; min-height: 0` with `padding-bottom: var(--space-7)`
    - Acceptance: 320×256 screenshots of home, tour detail and step 2 show the primary CTA with no horizontal scroll.
15. **Focus not obscured (2.4.11):**
    - `scroll-padding-top` = header + 8; `scroll-padding-bottom` = mobile bar + 8 on pages that have the bar
    - the header never hides (§5.1)
    - Playwright test: tab through tour detail and step 2 at 390×844 and assert that no focused element's box intersects the header or the bar.
16. **Consistent help (3.2.6):** help (phone, then email) sits in the same place on every checkout page: the `TrustStrip`, last in `main`. On site pages it lives in the footer Info → Contact.
17. **Redundant entry (3.3.7):** step 2 prefills from the booking cookie when the user comes back to edit.
18. **Status shown with text:** the open-now badge, step states and admin statuses always pair colour with words.
19. **European Accessibility Act:** see D-26.

**Tooling and manual checks:**
- axe-core in Playwright on every route, including the booking steps: 0 serious or critical issues.
- Manual keyboard and VoiceOver passes (iOS Safari and macOS Safari) on home, tour detail, group booking end to end, charter, contact and FAQ.

---

## 12. Admin (D-17)

**PR 0b: freeze.**
- **Done (PR 0b):** `BaseLayout` no longer imports `global.css`. `SiteLayout` imports it; `AdminLayout` imports `admin.css` (BaseLayout still brings `icons.css`). Astro bundles every static import, so a `styles` prop on BaseLayout couldn't have kept `global.css` out of admin pages.
- `admin.css` contains:
  - the `--a-*` custom properties with **today's resolved values**, scoped to `.admin`: `--a-accent: #1d9e75`, `--a-text-tertiary: #696969`, `--a-gutter: 20px`, `--a-badge-*`, `--a-warning-text: #8f5a12`, and so on
  - copies of every public class the admin uses: `.nav`, `.nav-solid`, `.nav-logo`, `.nav-link`, `.btn-*`, `.filter-chip`, `.trust-item`, `.next-item`, `.warn-box`, `.highlight-box`, `.hold-warn`, `.exit-link`, `.nf-icon`, `.section-label`, and the checkout card/row classes
  - the base styles the admin relies on (reset, 14px body, focus ring in today's colours)
- **Acceptance:**
  - this command returns nothing:
    ```
    grep -RE 'var\(--(color|badge|radius|page|palette|font|space)-' src/layouts/AdminLayout.astro src/styles/admin.css src/pages/admin src/components/admin
    ```
  - the admin looks identical before and after PR 0b, and stays identical through PRs 1–9: dashboard, bookings list, booking detail, emails, enquiries, tools, login. **Checked by `tests/visual/admin.spec.ts`**: every element's computed style at 390 and 1280px in Chromium and WebKit. Exact pixels can't be compared because sample bookings get random refs. Baselines depend on the day, so take them from the base commit and compare on the same day (instructions in the spec file).

**PR 10: re-skin.**
- Move `admin.css` onto the new tokens: blue accent, new buttons, badges and the Notice component.
- Keep the dense tables at 14px where 16px would break the layout.
- Keep the status tones (`--a-ok`, `--a-warn`, `--a-danger`, `--a-info`).
- Add the charter enquiry block and the infants column.
- It must keep looking like "the site's own back office".

---

## 13. SEO and metadata

- [KEEP] titles, descriptions, canonical URLs, Open Graph/Twitter tags, the JSON-LD builders, the sitemap and robots.txt.
- `SITE_THEME_COLOR` `#1a6fc4`, and in the manifest.
- **Favicon set:** replace the navy "HBC" monogram (left over from the abandoned brand) with a sailboat mark in brand blue on white. Files: `favicon.svg`, `favicon.ico` (32px), `apple-touch-icon.png` (180px). The owner approves.
- `og-default.jpg`: regenerated from hero slide 1 (1200×630) with the logo.
- `/private-charter/` is `noindex` (D-23). `/tours/create-perfect-day-private/` stays the indexed charter page. The robots, noindex and sitemap config get `/private-charter` (`NOINDEX_PATH_PREFIXES`).
- `/booking/details/` is deleted and 301-redirected (D-20).
- **Internal links:**
  - add `private-charter` to the `ROUTES` regex in `links.test.ts`
  - [NEW] a build-output test: every internal `href` in `dist/**/*.html` must resolve to a built page or a `_redirects` rule
  - every destination page must be linked from at least 2 pages

---

## 14. Testing and QA

### 14.1 Test layers

| Layer | What | New or existing |
|---|---|---|
| Unit (Vitest) | Numeric prices and migration equality; departures (including empty); infants in `seatCount`; booking cookie seal/open/tamper/expiry; draft and booking endpoints (no personal data in `Location` headers, Origin 403, 415, terms version, duplicate submit); charter validation and server estimate; contact `topic`/`bookingRef`; season helper; open-now helper; rate-limit hashing and sweeping; retention sweep; security headers (S-7); content guard (S-14); XSS escaping (S-8); token check; island payload size | extends the existing **94** tests |
| Links | trailing slashes [KEEP] + `private-charter` + build-output link check | extends |
| Visual [NEW] | `@playwright/test`; `tests/visual/*.spec.ts`; every page at 390, 768, 1280 and 1920 (home) in **Chromium and WebKit**; `toHaveScreenshot` with a 0.2% threshold; baselines committed **after** each page PR is approved; run locally (`pnpm test:visual`), not in CI (fonts differ on CI runners) | new |
| Accessibility [NEW] | `@axe-core/playwright` on every route, booking steps included | new |
| End to end [NEW] | Group booking: happy path, decline, retry, edit and prefill. Charter request. Contact form. One no-JS run per form. Focus-obscured check (§11.15). Short-viewport screenshots (§11.14). Runs in **Chromium, WebKit and Firefox** with `RESEND_API_KEY=` empty and `EMAIL_SENDING` unset. Fill contact fields by `id` (Playwright treats the honeypot as visible). Based on the scratchpad `e2e.mjs` from the admin work. | new |
| Performance | Lighthouse mobile, median of 3 runs, CLI version pinned in `package.json`, on `npx netlify-cli serve --offline`. Budgets per page: CSS ≤ 35 KB, JS ≤ 60 KB (home), display font ≤ 30 KB, LCP < 2.5 s, CLS < 0.05. | new |
| Manual | Keyboard and VoiceOver (§11). Real phones: iOS Safari and Android Chrome. Proofread content against §17. | – |

### 14.2 Scripts (PR 0b)

`package.json` gets:
- `"test:e2e": "playwright test tests/e2e"`
- `"test:visual": "playwright test tests/visual"`
- `"tokens": "node scripts/tokens-check.mjs"`

`check` also runs `tokens`. CI already runs check, test and build, so it picks up the token check automatically; Playwright stays out of CI. Adding these devDependencies triggers one Netlify build.

### 14.3 Dev kit page

`src/dev/kit.astro` is registered by an inline integration in `astro.config.mjs`:

```js
injectRoute({ pattern: '/dev/kit', entrypoint: './src/dev/kit.astro', prerender: true })
```

It's injected only when `command === 'dev'` or `process.env.CONTEXT === 'deploy-preview'`. The page is `noindex`. A test asserts that `dist/dev/` doesn't exist after `CONTEXT=production pnpm build`.

### 14.4 Definition of done (every PR)

- `pnpm check`, `pnpm test` and `pnpm build` pass.
- The PR's visual, axe and e2e specs pass.
- Lighthouse budgets are met for every touched page.
- The PR includes screenshots at 390 and 1280.
- Hero and chip contrast measurements are recorded where they apply.
- No raw colour values outside the allowed files.
- The content guard passes.
- Sample data is updated for any new fields.
- Docs are updated where behaviour changed: README sections on tokens, cascade layers, the kit page and the Playwright commands.

---

## 15. Delivery plan

### 15.1 Branching (D-21)

1. **Hotfixes (PR 0a)** branch from the **Netlify production branch**, merge there, and get deployed. They are then merged forward into `feat/redesign`.
2. **`feat/redesign`** is cut from `main` (which contains the showcase and email work) plus `fix/security-hardening`. Each PR below is its own branch off `feat/redesign`.
3. **Deploy previews:** in Netlify → Site configuration → Build & deploy → Branches and deploy contexts, enable Deploy Previews for "Any pull request", or add `feat/redesign` as a branch deploy. Check in the Netlify dashboard how previews are counted against credits before relying on them.
4. `feat/redesign` → production when PRs 0–9 are done and signed off. Real payments stay a separate track (payments plan).

### 15.2 Pull requests

| PR | Scope | Blocked by | Uses defaults of | Est. | Acceptance |
|---|---|---|---|---|---|
| **0a Hotfixes** (to production) | S-1 (remove the hold claim); S-7 (security headers in middleware + tests); S-8 CSP additions; S-9 explicit `checkOrigin` | D-21 | – | 0.5–1 d | the `curl -sI` check shows the full header set on `/admin/login/` and `/booking/pay/`; the hold claim is gone |
| **0b Prep** | Copy the design reference into the repo (§0.2); download approved assets; **admin freeze** (§12); Playwright + axe + scripts (§14.2); admin baselines; public "before" screenshots (attached to PR 1, not committed) | – | D-17 | 2–3 d | admin pixel-identical; the §12 grep returns nothing |
| **1 Foundation** | `tokens/design.css`, `base.css`, cascade layers (§3.1, including the Vue `@layer` check), focus ring, 16px body, display font (D-4 or Anton), aliases, Tabler 3.48 + new icons, `tokens-check.mjs` | **D-4** | – | 2 d | site renders blue at 16px; no layout breakage from 320 to 1920 (visual diff reviewed); axe serious/critical count per page ≤ the PR 0b baseline; admin unchanged |
| **1b Data model** | §9.1–9.3 migrations and config files, migration tests, `charterUrl()`; the existing UI reads the new fields where old ones are removed | – | D-9, D-14, D-15, D-16 | 1.5 d | `pnpm test` passes; regex parsers survive only as migration tests |
| **2 Chrome + kit** | Header, Footer, MiniNav, TrustStrip; PR-2 components from §3.2 (including TourCard, ImageGallery with `<dialog>`, Marquee, Notice, Timeline, StepBar, SummaryCard, FormField); kit page | 1, 1b | D-2, D-19 | 4–5 d | every component on `/dev/kit`; keyboard + axe clean |
| **3 Homepage** | §6.1 + PR-3 components; content guard (S-14) | 2 | D-1, D-5, D-6, D-14 | 3 d | §6.1 acceptance; video credit check recorded |
| **4 Tours** | §6.2 + §6.3 | 2 | D-12 | 3 d | §6.2/§6.3 acceptance |
| **5 Destinations** | §6.4 + §6.5; split `[slug].astro` into components | 2 | D-11, D-13, D-24 | 3 d | `n` equals rendered cards; all 10 pages pass axe |
| **6 Content pages** | FAQ, Legal (layout + factual fixes + numeric cancellation config), About, Contact (+ `topic`, `bookingRef`, form-encoded bodies), 404, delete NotFoundPanel; S-6 notification cap; imprint once C-6 is answered | 2 | D-10, D-14, D-25 | 4 d | FAQ count bug fixed; legal figures come from config; contact pipeline tests pass; no-JS contact e2e passes |
| **7a Booking server** | Sealed cookie + draft endpoints (§8.1.6); `/api/bookings` changes; infants through price, manifest, overbooking, CSV, emails and sample data; departures validation; season; email content and colour (§9.4); S-11; S-13 | 1b | D-9, D-15, D-16 | 3 d | unit tests above; no personal data in any `Location` |
| **7b Booking UI** | §8.1 UI: `BookingCalendar`, `GuestSteppers`, `ChoiceCards` extracted; group/review/pay/success/error restyled; prefill; pre-contract text | 2, 7a | – | 3 d | e2e (happy, decline, retry, edit, no-JS) in 3 browsers; focus-obscured test |
| **8 Private charter** | §8.2; switch `charterUrl()`; `_redirects`; admin block; sample data | 7b, **D-7, D-8** (go-live: Turnstile keys, S-10) | D-22, D-23 | 3 d | e2e request, with and without JS; rate-limit, honeypot and Turnstile tests; estimate recomputed on the server |
| **9 Cleanup** | Delete page modules, `_responsive.css`, `redesign.css`; token check fails on any alias; remove teal from the public palette; theme colour, favicon, OG image; delete `/booking/details/` + 301; evaluate `security.csp`; README; mark `docs/redesign/00–06` superseded | 3–8 | D-20 | 1.5 d | shared CSS on every page (built, excluding fonts) ≤ 12 KB; per-page CSS budgets met |
| **10 Admin re-skin** | §12 second half | 9 | D-17 | 2 d | admin e2e passes; screenshots approved |
| **11 Legal content** | Lawyer-reviewed texts, Croatian versions if required, accessibility statement if required, retention figures | lawyer (D-18, D-3, D-26) | – | 1 d dev | lawyer's checklist signed off |

**Total:** about **36–40 developer days**, plus content gathering (§17) in parallel. The 474 literal font sizes are absorbed by PRs 3–8; each estimate includes its page's share.

**Critical path:** D-4 → PR 1. D-7/D-8 → PR 8. Lawyer → PR 11 and the go-live of PRs 7b and 8.

### 15.3 Rollout and rollback

- Deploy previews of `feat/redesign` go to the owner and the boss for sign-off page by page. Production switches with one merge.
- **Rollback** means publishing a previous deploy in the Netlify UI: no build and no credits. **It restores code, not data.** Because PRs 7a and 8 add only optional fields (§9.4), the old build can still read new records. But after a rollback, infants aren't counted in the old manifest, and charter enquiries show without their fields. Every PR 7a/8 description states this, and before rolling back across PR 7a the owner checks `/admin/` for infant bookings.

---

## 16. Out of scope (later)

| Item | Why later | Pointer |
|---|---|---|
| Language switcher and site-wide i18n | Translated copy, legal texts, `hreflang`, routing. Croatian legal texts may be required sooner (D-3). | D-3 |
| Availability: calendar dots, "Next available", seat holds with a real timer, a "hold expired" error variant | Needs departures and transactional seat counts (payments plan Phase 1) | `docs/bookings-payments-email-backoffice-plan.md` |
| Real Teya/PayPal, deposits, Pay-by-Link for charter quotes, fiscal receipt (račun) | Payments plan Phases 2–6 | same |
| Seasonal pricing | Payments plan D8 | same |
| Live weather on destination pages | Needs a free source and a CSP `connect-src` + privacy note | D-13 |
| Homepage search band (Group / Private / Transfer) | Hidden on the board itself; Transfer isn't a product | §6.1 |
| Reviews integration | D-5 and the Omnibus rules | D-5 |
| Add-to-calendar `.ics` | Nice to have; must contain no personal data | – |

---

## 17. Content checklist

Each row has a default that ships if the item isn't answered by the time its PR is reviewed.

| # | Item | Design | Site today | Default | Owner | Needed by |
|---|---|---|---|---|---|---|
| C-1 | Founding year / years on the water | 2015 / "10 years" | 2016 / "9 yrs" | computed from 2016 | owner | PR 3 |
| C-2 | Rating and review count | 4.9 from 800+ | 4.9 ★ | hidden | owner | PR 3 |
| C-3 | Guests served | 4,200+, 20,000th, 500+ | – | hidden | owner | PR 3 |
| C-4 | Press mentions | T+L, Condé Nast, Guardian | – | never without proof | owner | PR 6 |
| C-5 | Crew names, bios, photos (with consent) | Marko Blažević… | Marko Vuković… | current data, flagged unconfirmed in `about.ts` | owner | PR 6 |
| C-6 | Trader identity: imprint, controller, who operates the boats | "Hello Blue Cave d.o.o." | contracted operators named in Terms | hidden; **blocker before real payments**. If third parties operate the trips, tour and review pages say "Operated by {operator}. Booked through {legal name}." | owner + lawyer | PR 6 |
| C-7 | "Licensed maritime operator" (licence holder, authority, number) | yes | yes | **hidden until confirmed** | owner | PR 2 |
| C-8 | Contact hours (one statement) | contradicts itself | contradicts itself | no hours, no badge | owner | PR 6 |
| C-9 | Season | May–Oct | Apr–Nov | Apr–Nov | owner | PR 1b |
| C-10 | Reply time | "a couple of hours" | same | "the same day" | owner | PR 6 |
| C-11 | Age bands, infants | 13+ / 3–12 / under 3 free | 18+ / 0–17 | catalog bands + infants 0–2 free | owner | PR 7a |
| C-12 | Welcome drink, drinks on board | yes | water only | water only | owner | PR 6 |
| C-13 | Wheelchair access | "accessible" | – | not claimed | owner | PR 6 |
| C-14 | Pets | private only | – | not claimed | owner | PR 6 |
| C-15 | Charter deposit and cancellation | 30% + tiers / "48h free" | 30% in Terms | request flow, no payment | owner + lawyer | PR 8 |
| C-16 | Charter routes, durations, prices, extras | placeholders | "On request" | quote only | owner | PR 8 |
| C-17 | Rights to the hero, Tours, Destinations, About, CTA images and the video | design blobs | – | use repo photos; video hidden | owner | PR 0b |
| C-18 | Missing destination and tour photos | – | – | design fallbacks | owner | ongoing |
| C-19 | Itinerary times and descriptions | invented | labels only | labels only | owner | PR 4 |
| C-20 | Footer brand line | "Small-boat tours… since 2015…" | "Speedboat tours and private charters from Split" | current line | owner | PR 2 |
| C-21 | `help@`, `hello@`, `privacy@` mailboxes | used | `info@` | `info@` | owner | – |
| C-22 | Hero slide copy | as designed | – | as designed, adjusted per §6.1.2 | owner | PR 3 |
| C-23 | Blue Cave ticket price (range + "as of" date + official source URL) | cash on site | `caveTicketNote` | "paid on site (cash)" with no amount | owner | PR 4 |
| C-24 | "Best seller" evidence (bookings data, season) | badges | `featured` | "Our pick" | owner | PR 2 |

---

## 18. Appendix

### 18.1 Research and review notes

PR 0b commits these to `design/2026-10/research/`:
- codebase inventory
- token diff and homepage/catalog specs
- booking flows
- content pages and link graph
- visual walkthrough
- four adversarial reviews: code reality, design fidelity, security/privacy/a11y/legal, plan quality

**Key facts:**
- Current CSS: 62.6 KB global, 474 literal font sizes.
- **94** unit tests; no visual tests.
- 7 tours (4 bookable online), 10 destinations (5 with real photos).
- The production site serves the showcase branch, and its server-rendered pages are missing security headers (S-7).

### 18.2 Things on the boards not to copy

- `outline: none` with no replacement
- `p`/`div` headings
- an h1 that changes every 6 s
- 8px dot targets
- arrows visible only on hover
- no hero scrim on home
- FAQ answer inside the button
- a `div role=button` wrapping an `<a>`
- a lightbox with no focus management
- marquee content hidden from screen readers
- dead buttons ("See tours" on non-Hvar cards, the FAQ Search button, "Show all reviews")
- the `example.com` ticket link
- static fake weather
- a hard-coded `© 2025`
- the header narrowing on Legal
- the FAQ "All" count bug
- the Destinations lead colour collision
- a "(4)" heading over 2 cards
- conflicting prices between boards (€55 vs €95; €610 vs €245)
- Dubrovnik and Elafiti content for a Split business
- "Includes all taxes and fees" alongside a cash-on-site ticket
- "live availability", "sell out 3–5 days ahead", "Most popular", unverified "Best seller"
- "spots held for N minutes"
- the 24h weather notice (the policy says 4h)
- Contact cards and map stubs that aren't links
