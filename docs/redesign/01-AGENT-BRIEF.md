# Agent brief — Hello Blue Cave redesign

## Your mission

Reimplement the Hello Blue Cave website from **Claude-generated designs**. The designs define pages, layout, and visual language. Your job is to translate them into a working **Astro 6 + Vue** site while wiring in the correct business data and preserving key interactive behaviors.

---

## Non-negotiable constraints

1. **Stack:** Astro 6 + Vue (`@astrojs/vue` as needed). Keep Netlify deployment (`@astrojs/netlify`).
2. **Design is authoritative for pages.** The current site has 10 routes; the redesign may have more, fewer, or differently named pages. Implement what the design shows.
3. **Tour data is authoritative in code.** Use `docs/redesign/03-TOUR-DATA.json` (mirrors `src/data/tour-catalog.ts`). Do not invent tour titles, prices, or itineraries.
4. **Images: placeholders first.** Use placeholder images from the design (or neutral placeholders). **Do not** import `src/assets/tours/*` in the initial redesign. Real asset mapping is in `04-IMAGE-ASSETS.md` for a later swap.
5. **Preserve functional behaviors** documented in `06-FUNCTIONAL-BEHAVIORS.md` unless the design explicitly removes a feature.

---

## Recommended workflow

```
1. Read this brief
2. Receive design (frames / HTML / screenshots)
3. List pages in the design → map to Astro routes under src/pages/
4. Identify which pages need tour data → pull from 03-TOUR-DATA.json
5. Build with design placeholders for all images
6. Wire booking + contact behaviors where design includes CTAs
7. (Later phase) Replace placeholders with real assets per 04-IMAGE-ASSETS.md
```

---

## Data wiring rules

### Tours

- **10 active tours** — slugs are stable IDs used in URLs, booking, and contact preselect.
- **5 retired slugs** — must keep 301 redirects to `/tours` (see `public/_redirects`).
- **Featured tours** (homepage): `blue-cave-hvar-5-islands`, `three-islands`, `hvar-pakleni`, `blue-lagoon-morning`, `create-perfect-day-private`.
- **Quote-only tour** (no instant book): `create-perfect-day-private` → contact form with `?tour=` preselect.

### Images during redesign

```ts
// ✅ Phase 1 — use design placeholder
const image = { src: '/placeholders/tour-card.jpg', alt: tour.title };

// ❌ Phase 1 — do not wire real assets yet
import blueCave from '../assets/tours/blue-cave.jpg';
```

Keep `image` and `gallery` fields in data as **photo IDs** (strings like `"blueCave"`). Render placeholders keyed by ID so the phase-2 swap is a one-file change in the photo registry.

### Copy

- Tour-specific copy → from `03-TOUR-DATA.json`
- Shared blocks (meeting point, weather, safety) → repeated per tour in JSON; also listed in `05-SITE-COPY.md`
- FAQ → `03-TOUR-DATA.json` → `faq` array
- Site name, email, phone → `03-TOUR-DATA.json` → `site` object

---

## What you may replace freely

- All visual components (`src/components/**`)
- CSS / design tokens (`src/styles/**`)
- Page markup and section order
- Component framework split (`.astro` vs `.vue`) — use Vue where interactivity or design component boundaries suggest it
- Homepage section composition

## What you should keep (logic, not markup)

| Concern | Location | Notes |
|---------|----------|-------|
| Tour catalog data | `src/data/tour-catalog.ts` | Update only if business data changes |
| Photo registry | `src/data/tour-photos.ts` | Defer wiring; keep structure |
| Tour accessors | `src/lib/tours.ts` | `getAllTours`, `getTourBySlug`, `getFeaturedTours` |
| Booking rules | `src/lib/booking.ts` | `supportsInstantBook`, `contactHrefForTour` |
| Contact validation | `src/lib/contact-validation.ts` | Shared client + server |
| Contact API | `src/pages/api/contact.ts` | POST `/api/contact` |
| Retired slug redirects | `public/_redirects` | 301 → `/tours` |

---

## Vue integration note

The **current** codebase is Astro-only (no Vue dependency yet). The redesign **must** add `@astrojs/vue`. Typical pattern:

- Static sections → `.astro`
- Interactive widgets (carousels, forms, mobile nav) → `.vue` islands with `client:load` / `client:visible`

---

## Design handoff expectations

When you receive a design, extract and document:

1. **Page list** — name, route, purpose
2. **Per-page sections** — hero, tour grid, FAQ, etc.
3. **Placeholder images** — which placeholders map to which data slots (tour hero, gallery item 1, etc.)
4. **CTAs** — which buttons trigger booking vs. contact vs. navigation

If a design page has no matching `[CURRENT]` page in `02-PAGES-AND-COMPONENTS.md`, create it as `[NEW]` — the inventory documents legacy only.

---

## Acceptance checklist

- [ ] All design pages implemented as Astro routes
- [ ] Tour cards/detail use data from `03-TOUR-DATA.json` (correct slugs, copy, prices)
- [ ] No real tour photos wired in phase 1
- [ ] Instant book works for 9 tours; private charter routes to contact
- [ ] Contact form POSTs to `/api/contact` with validation
- [ ] Retired tour URLs still 301 to `/tours`
- [ ] Astro 6 + Vue builds and deploys to Netlify
