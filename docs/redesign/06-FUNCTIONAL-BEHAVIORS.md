# Functional behaviors

> **Partly outdated (September 2026).** The booking flow no longer uses `?tourId=` hand-offs from
> cards: it runs `/book/<tour>/group/` → `/book/<tour>/review/` → `/booking/success/`. See
> README.md "Booking flow" for the current behaviour.

> Preserve these behaviors in the redesign unless the design explicitly removes a feature. Markup and component structure may change freely.

---

## Booking flow (preview — no payment)

### Overview

```
TourCard / TourDetailView
        │
        ├─ supportsInstantBook(tour) === true   (group tour with a per-person price)
        │       └─ link → /book/{slug}/group/ → /book/{slug}/review/ → /booking/success/
        │
        └─ supportsInstantBook(tour) === false  (private-only, or "price on request")
                └─ link → /contact/?tour={slug}
```

### Rules (`src/lib/booking.ts`)

Decided from data, not a list: `supportsInstantBook(tour)` is true when the tour's
`types` include `'group'` and `fromPrice` has a number (see `src/lib/booking.ts`).
Private-only charters and "price on request" tours link to the contact form.

### Implementation

**Client:** ~~`src/client/booking-forms.ts`~~ (removed Sept 2026)

```ts
// Listens for submit on .booking-form
// Reads data-tour-id attribute
// Redirects to /booking/success?tourId={slug}
```

**Script loading:** removed Sept 2026 along with `BookingScript.astro`.

**Pages that need booking script today:**

- `/` (homepage tour cards)
- `/tours` (catalog cards)
- `/tours/[slug]` (detail CTA)

Redesign: load booking script on **any page that renders a "Book now" form**.

### Success page (`/booking/success`)

| Aspect | Detail |
|--------|--------|
| Query param | `tourId` (not `tour`) |
| Rendering | SSR — `prerender = false` |
| Invalid slug | Redirect to `/404` |
| Valid slug | Thank-you message + tour title |

### Booking details page (`/booking/details`)

Informational only — explains what data is collected. No form, no API. Include if design has an equivalent info section.

---

## Contact flow

### Page (`/contact`)

| Feature | Detail |
|---------|--------|
| Tour preselect | URL `?tour={slug}` → pre-fills tour dropdown |
| Client init | `initContactForm()` from `src/client/contact-form.ts` |
| Timestamp | Hidden `_startedAt` set on page load |

### Form fields

| Field | Required | Max length |
|-------|----------|------------|
| `name` | Yes | 200 |
| `email` | Yes | 254 |
| `message` | Yes (min 10 chars) | 5000 |
| `phone` | No | 30 |
| `tourSlug` | No | 80 |
| `company` | Honeypot — must be empty | — |
| `_startedAt` | Required (timestamp) | — |

### Validation (`src/lib/contact-validation.ts`)

| Check | Rule |
|-------|------|
| Honeypot (`company`) | If filled → silent success (no error shown) |
| Name | Min 2 characters |
| Email | Basic format regex |
| Message | Min 10 characters |
| Phone | Optional; if present, `^[\d\s+().-]{7,30}$` |
| Submit timing | Min 2 seconds after `_startedAt` |
| Form age | Max 24 hours |

### API (`POST /api/contact`)

| Aspect | Detail |
|--------|--------|
| File | `src/pages/api/contact.ts` |
| Prerender | `false` (SSR) |
| Max body | 16 KB |
| Tour slug | Validated against catalog if provided |
| Success response | `{ ok: true }` |
| Error response | `{ error: "..." }` with 400/413/429 |
| Email delivery | **Not implemented** — showcase only |

### Production TODO (not redesign scope, but note for later)

- Wire email delivery (still open)
- ~~Add Cloudflare Turnstile or similar~~ done (activates once both keys are set in Netlify)
- ~~Add rate limiting~~ done (5 requests / 10 min per IP, Netlify Blobs)

---

## Tour data access

```ts
import { getAllTours, getTourBySlug, getFeaturedTours } from '../lib/tours';

getAllTours()        // → TourDetail[] (10 tours)
getTourBySlug(slug)  // → TourDetail | undefined
getFeaturedTours()   // → max 5: featured first, then catalog order
```

### Static paths

`src/pages/tours/[slug].astro` generates paths from `getAllTours()` at build time.

---

## Retired tour redirects

**File:** `public/_redirects`

```
/tours/golden-horn-brac-hvar    /tours    301
/tours/brac-golden-horn         /tours    301
/tours/blue-lagoon-trogir       /tours    301
/tours/hvar-red-rocks-pakleni   /tours    301
/tours/three-islands-trogir     /tours    301
```

Must survive redesign. Slugs listed in `REMOVED_TOUR_SLUGS` in tour catalog.

---

## Environment

| Variable | Purpose |
|----------|---------|
| `PUBLIC_SITE_URL` | Canonical URLs, OG tags (optional locally) |

Set to `https://hello-blue-cave.netlify.app` in Netlify production.

---

## Accessibility patterns (preserve intent)

| Pattern | Where |
|---------|-------|
| Skip link | `SiteLayout` → `#main` |
| Mobile nav `inert` | `Header.astro` |
| Focus rings | `global.css` |
| Touch targets ≥ 44px | `--touch-min: 2.75rem` on CTAs |
| `sr-only` utility | `global.css` |

Redesign should maintain equivalent a11y — exact markup may differ.

---

## Form CSS hooks (if reusing client scripts)

| Hook | Used by |
|------|---------|
| Contact form IDs/classes | `contact-form.ts` — read `src/pages/contact/index.astro` and `src/client/contact-form.ts` when wiring |

If redesign changes form markup, update client scripts to match selectors.
