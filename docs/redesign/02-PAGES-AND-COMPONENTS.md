# Pages & components inventory

> **Status:** `[CURRENT]` — legacy site structure. The redesign may add, remove, or rename pages. Treat this as a **behavioral and data-consumption reference**, not a route spec.

---

## Pages

### `[CURRENT]` Route table

| Route | File | Role | Data consumed | Components used | Interactive |
|-------|------|------|---------------|-----------------|-------------|
| `/` | `src/pages/index.astro` | `[MARKETING]` Homepage | `HOME_PAGE_TITLE`, `HERO_IMAGE`, featured tours via `getFeaturedTours()` | `SiteLayout`, `Hero`, `TourSection`, `WhyUs`, `FAQ` | Booking script |
| `/tours` | `src/pages/tours/index.astro` | `[CATALOG]` Full tour list | `getAllTours()` | `SiteLayout`, `TourCarousel`, `TourCard` | Booking script |
| `/tours/[slug]` | `src/pages/tours/[slug].astro` | `[DETAIL]` Tour detail | `getTourBySlug(slug)`, OG image from tour | `SiteLayout`, `TourDetailView`, `NotFoundPanel` | Booking script |
| `/contact` | `src/pages/contact/index.astro` | `[FORM]` Enquiry / quote | `SITE_*`, `getAllTours()`, `?tour=` preselect | `SiteLayout`, inline form | `initContactForm()` |
| `/faq` | `src/pages/faq/index.astro` | `[MARKETING]` Full FAQ | `FAQ_ITEMS` | `SiteLayout` (inline) | — |
| `/booking/details` | `src/pages/booking/details.astro` | `[BOOKING]` Info page | `pageTitle()` | `SiteLayout` (prose) | — |
| `/booking/success` | `src/pages/booking/success.astro` | `[BOOKING]` Confirmation | `?tourId=`, `getTourBySlug` | `SiteLayout` | SSR (`prerender=false`) |
| `/legal/privacy` | `src/pages/legal/privacy.astro` | `[LEGAL]` Privacy policy | `SITE_NAME`, `SITE_EMAIL` | `SiteLayout` | — |
| `/legal/terms` | `src/pages/legal/terms.astro` | `[LEGAL]` Terms | `pageTitle()` | `SiteLayout` | — |
| `/404` | `src/pages/404.astro` | `[SHELL]` Not found | `pageTitle()` | `SiteLayout`, `NotFoundPanel` | — |
| `/api/contact` | `src/pages/api/contact.ts` | `[API]` Contact endpoint | Contact validation, tour slug check | — | POST only, SSR |

### Prerender flags

| Mode | Pages |
|------|-------|
| Static (`prerender=true`) | All except below |
| SSR (`prerender=false`) | `booking/success.astro`, `api/contact.ts` |

### `[DESIGN-DRIVEN]` guidance

When the design introduces new pages (e.g. About, Gallery, Blog, single landing pages):

1. Create `src/pages/<route>.astro` (or `.vue` wrapper) per design
2. Note in a comment at top of file: `// [NEW] from redesign — <design page name>`
3. Pull tour data only where the design shows tour content
4. Do not assume every `[CURRENT]` page survives — drop pages not in design unless asked

---

## Layouts

| File | Role | Responsibility |
|------|------|----------------|
| `src/layouts/BaseLayout.astro` | `[SHELL]` | HTML document, meta/SEO, OG tags, font preload, `global.css`, no chrome |
| `src/layouts/SiteLayout.astro` | `[SHELL]` | Wraps `BaseLayout` + `Header` + `<slot>` + `Footer` + optional `BookingScript` |

### SiteLayout props

| Prop | Type | Effect |
|------|------|--------|
| `title` | `string` | `<title>` and OG title |
| `description?` | `string` | Meta description |
| `booking?` | `boolean` | Loads `BookingScript` (book-now redirect) |
| `ogImage?` | `string` | Open Graph image URL |

---

## Components

### `[NAV]` — Navigation chrome

| Component | File | Role |
|-----------|------|------|
| `Header` | `src/components/Header.astro` | Sticky header: logo, nav links (Home, Tours, Why us, FAQ, Contact), mobile menu, "Book a tour" CTA |
| `Footer` | `src/components/Footer.astro` | Brand, Riva stand 14 address, contact info, quick links, legal links, operator disclaimer |

### `[BRAND]` — Identity

No monogram or wordmark component exists. `Logo.astro` (an "HBC" monogram) and
`Wordmark.astro` were part of an earlier brand direction (Adriatic Blue +
Glorich, see `05-SITE-COPY.md`) that never shipped. The header and hero render
"Hello Blue Cave" as plain text in the system font instead.

### `[MARKETING]` — Homepage sections

| Component | File | Role | Data |
|-----------|------|------|------|
| `Hero` | `src/components/Hero.astro` | Full-viewport hero with image, wordmark, headline, CTAs | `HERO_IMAGE`, links to `/tours`, `/contact` |
| `WhyUs` | `src/components/WhyUs.astro` | 3-column value props | Static copy; links to `/booking/details` |
| `FAQ` | `src/components/FAQ.astro` | FAQ teaser (first 3 items) | `FAQ_ITEMS` slice; link to `/faq` |
| `WaveDivider` | `src/components/WaveDivider.astro` | `[DECOR]` Triple-wave SVG divider | — |

### `[CATALOG]` — Tour listing

| Component | File | Role | Data |
|-----------|------|------|------|
| `TourSection` | `src/components/TourSection.astro` | Homepage "Featured tours" section | `getFeaturedTours()` (max 5) |
| `TourCarousel` | `src/components/TourCarousel.astro` | Horizontal scroll carousel with prev/next | Children: `TourCard` |
| `TourCard` | `src/components/TourCard.astro` | Tour card: image, meta, title, tagline, description, price, CTAs | Single `TourDetail`; uses `supportsInstantBook()` |

### `[DETAIL]` — Tour detail

| Component | File | Role | Data |
|-----------|------|------|------|
| `TourDetailView` | `src/components/tour/TourDetailView.astro` | Full detail: hero, overview, schedule grid, itinerary, meeting/weather/safety, bring/included/excluded, pricing, gallery, disclaimers, CTA bar | Full `TourDetail` |

### `[FORM]` / `[BOOKING]` — Interactivity

| Component | File | Role |
|-----------|------|------|
| `BookingScript` | `src/components/BookingScript.astro` | `[SCRIPT]` Loader for `src/client/booking-forms.ts` |
| `NotFoundPanel` | `src/components/NotFoundPanel.astro` | Reusable 404 content block with action links |

### Shared media

| Component | File | Role | Notes |
|-----------|------|------|-------|
| `TourImage` | `src/components/TourImage.astro` | Responsive `Picture` (AVIF/WebP) for tour photos | Layouts: `hero`, `card`, `gallery`. **Replace with placeholder strategy in redesign.** |

---

## Client scripts

| File | Loaded from | Role |
|------|-------------|------|
| `src/client/booking-forms.ts` | `BookingScript.astro` | Intercepts `.booking-form` submit → redirect `/booking/success?tourId={slug}` |
| `src/client/contact-form.ts` | `contact/index.astro` inline script | `initContactForm()`: timestamp, tour preselect, client validation, POST `/api/contact` |

### Inline component scripts (not in `src/client/`)

| Component | Behavior |
|-----------|----------|
| `Header.astro` | Mobile nav toggle, `inert` on backdrop |
| `TourCarousel.astro` | Scroll prev/next buttons |
| `TourImage.astro` | Optional fade-in on load |

---

## Lib utilities

| File | Role | Key exports |
|------|------|-------------|
| `src/lib/tours.ts` | Tour data access | `getAllTours()`, `getTourBySlug(slug)`, `getFeaturedTours()` |
| `src/lib/booking.ts` | Booking CTA logic | `supportsInstantBook(tour)`, `contactHrefForTour(tour)` |
| `src/lib/contact-validation.ts` | Form validation (shared) | `validateContactSubmission()`, limits, honeypot field name |
| `src/lib/json-response.ts` | API helper | `jsonResponse(body, status)` |

---

## Data modules

| File | Role | Exports |
|------|------|---------|
| `src/data/tour-catalog.ts` | **Canonical tour content** | `tours[]`, `REMOVED_TOUR_SLUGS` |
| `src/data/tour-photos.ts` | Photo registry (deferred in redesign) | `PHOTO`, `HERO_IMAGE`, `galleryFrom()` |
| `src/data/hero-image.ts` | Homepage hero re-export | `HERO_IMAGE` |
| `src/data/faq.ts` | FAQ content | `FAQ_ITEMS` |
| `src/config/site.ts` | Site identity | `SITE_NAME`, email, phone, `pageTitle()` |
| `src/config/typography.ts` | Google Fonts URL | `GOOGLE_FONTS_HREF` |
| `src/types/tour.ts` | TypeScript schema | `TourDetail`, `ItineraryKind` |

---

## Mapping design → code (cheat sheet)

| If design shows… | Wire data from… | Behavior from… |
|------------------|-----------------|----------------|
| Tour card / grid | `03-TOUR-DATA.json` → `tours[]` | `supportsInstantBook` for CTA type |
| Tour detail page | `tours[]` matched by `slug` | Same + gallery photo IDs |
| "Book now" button | `slug` in `data-tour-id` on form | `06-FUNCTIONAL-BEHAVIORS.md` |
| "Request quote" / private | `create-perfect-day-private` | Contact link with `?tour=` |
| Contact form | `site` + `tours[]` for dropdown | `06-FUNCTIONAL-BEHAVIORS.md` |
| FAQ section | `faq` array | — |
| Phone / email in footer | `site.SITE_PHONE_DISPLAY`, `site.SITE_EMAIL` | — |
| Hero image | Placeholder in phase 1 | `heroImagePhotoId` in JSON for later |
