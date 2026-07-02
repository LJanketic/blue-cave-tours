# Tour catalog & photo mapping

Summary of the **strict photo-match** catalog trim (June 2026).  
Source photos: `~/Downloads/Materijali Vedran` → optimized copies in `public/assets/tours/`.

---

## What we kept (10 tours)

| Tour slug | Title | Photo-backed stops |
|-----------|-------|-------------------|
| `blue-cave-hvar-5-islands` | Blue Cave, Hvar & 5 islands | Modra špilja, Hvar, Pakleni |
| `three-islands` | Three islands | Pakleni, Blue Lagoon, Hvar, Stiniva |
| `hvar-pakleni` | Hvar & Pakleni islands | Hvar, Pakleni, Stiniva |
| `blue-lagoon-morning` | Blue Lagoon morning | Budikovac (Blue Lagoon) |
| `blue-lagoon-afternoon` | Blue Lagoon afternoon | Budikovac (Blue Lagoon) |
| `blue-cave-open-boat` | Blue Cave — open boat | Blue Cave, fleet |
| `blue-cave-luxury-cabin` | Blue Cave — luxury cabin | Blue Cave, fleet |
| `blue-cave-6-islands` | Blue Cave & 6 islands | Blue Cave, Pakleni, Hvar, Stiniva |
| `blue-lagoon-half-day` | Blue Lagoon half-day | Budikovac (Blue Lagoon) |
| `create-perfect-day-private` | Private charter | Fleet + any destination |

---

## What we removed (5 tours)

| Removed slug | Why removed | Missing photo folder |
|--------------|-------------|----------------------|
| `golden-horn-brac-hvar` | Primary stop Brač / Golden Horn | No Brač / Zlatni rat |
| `brac-golden-horn` | Brač-only route | No Brač / Zlatni rat |
| `blue-lagoon-trogir` | Named stop Trogir | No Trogir |
| `hvar-red-rocks-pakleni` | Named stop Red Rocks | No Red Rocks |
| `three-islands-trogir` | Named stop Trogir | No Trogir |

Retired URLs **301 → `/tours`** via `public/_redirects`.

---

## Where content came from

| Layer | Source | Notes |
|-------|--------|-------|
| **Original 15 tours** | FigJam board (MCP) | Agent-authored copy; not signed off as final routes |
| **Catalog trim** | Materijali Vedran folders | Strict rule: drop tours with named stops lacking photos |
| **Photos** | Materijali Vedran (Vedran) | 9 unique assets → 18 files (640px + 1280px JPEG) |
| **Copy (text)** | Existing `tour-catalog.ts` | Unchanged prose for kept tours |

---

## Photo asset map

### Unique files on disk (~5 MB total at 1280px tier)

| Asset ID | Croatian source folder | Source file (original) | Notes |
|----------|------------------------|------------------------|-------|
| `blue-cave` | Zelena spilja | Zelena spilja-002.jpeg | Cave interior, no people |
| `blue-lagoon` | BUDIKOVAC - Blue lagoon | Studio Ali (47 of 103).jpg | Aerial lagoon, no people |
| `blue-lagoon-alt` | BUDIKOVAC - Blue lagoon | Studio Ali (50 of 103).jpg | Aerial lagoon, no people |
| `hvar` | HVAR | WhatsApp Image 2026-06-03 at 17.01.15.jpeg | Town/harbour vista, no people |
| `pakleni` | BUDIKOVAC - Blue lagoon | Studio Ali (50 of 103).jpg | Pakleni folder had no people-free shots; lagoon aerial used |
| `stiniva` | Stiniva-2 | Stiniva-020.jpeg | Cliff & water, no people |
| `boat-speed` | Zelena spilja | Zelena spilja-003.jpeg | Boat at cave, no passengers visible |
| `boat-deck` | Zelena spilja | Zelena spilja-003.jpeg | Same as boat-speed (people-free fleet shot) |
| `hero` | BUDIKOVAC - Blue lagoon | Studio Ali (47 of 103).jpg | Homepage hero, no people |

Selection criteria: highest resolution where available; for duplicates, landscape orientation and file size as quality proxy. Original 5–22 MB Studio Ali RAW-sized files were **not** deployed — resized with `sips` at JPEG q≈80–82.

### Materijali folders **not** used (no matching kept tour)

| Folder | Reason |
|--------|--------|
| Komiža | No tour names Komiža |
| STINIVA (Studio Ali set) | Used Stiniva-2 instead (smaller, landscape) |
| Zelena spilja | No Green Cave tour in catalog |

---

## Tour → image assignment

| Tour | Hero image | Gallery (3, lazy-loaded) |
|------|------------|---------------------------|
| Blue Cave, Hvar & 5 islands | blue-cave | pakleni, hvar, stiniva |
| Three islands | pakleni | blue-lagoon, hvar, stiniva |
| Hvar & Pakleni | hvar | pakleni, stiniva, blue-lagoon |
| Blue Lagoon morning | blue-lagoon | blue-lagoon-alt, stiniva, pakleni |
| Blue Lagoon afternoon | blue-lagoon-alt | blue-lagoon, stiniva, pakleni |
| Blue Cave open boat | boat-speed | blue-cave, stiniva, pakleni |
| Blue Cave luxury cabin | boat-deck | blue-cave, hvar, stiniva |
| Blue Cave & 6 islands | blue-cave | pakleni, stiniva, hvar |
| Blue Lagoon half-day | blue-lagoon | stiniva, pakleni, blue-lagoon-alt |
| Private charter | boat-deck | hvar, blue-lagoon, pakleni |
| **Homepage hero** | hero | — |

Boat photos (people-free, cave entry) used as **hero only** on: open boat, luxury cabin, private charter. All **galleries** use destination scenery only.

### People-free swap (June 2026)

Earlier picks from Modra špilja, Brod, Brodovi WhatsApp, and Studio Ali lifestyle shots showed passengers. Replaced with scenery-first assets from Zelena spilja, HVAR WhatsApp vista, Budikovac aerials, and Stiniva-020.

---

## Performance / hosting

- **No Unsplash** on tour pages or hero — zero third-party image requests.
- **Two widths only** per asset: 640w + 1280w (cards/gallery use 640; hero uses 1280).
- **`loading="lazy"`** on cards and gallery; hero/detail LCP uses `eager` + `fetchpriority="high"`.
- **Netlify cache**: `Cache-Control: public, max-age=31536000, immutable` on `/assets/tours/*`.
- **18 image files** shared across 10 tours — no per-tour duplicate uploads.

---

## Code touchpoints

| File | Change |
|------|--------|
| `src/data/tour-catalog.ts` | 10 tours; `REMOVED_TOUR_SLUGS` export |
| `src/data/tour-photos.ts` | Central photo registry |
| `src/data/hero-image.ts` | Local hero path |
| `src/lib/responsive-image.ts` | Local + legacy remote srcset helper |
| `public/assets/tours/*` | Optimized JPEGs |
| `public/_redirects` | 301 retired slugs |

**Not committed** — ready for your review.
