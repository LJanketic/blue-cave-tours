# Image assets — reference only (phase 2)

> **⚠️ DO NOT USE IN REDESIGN PHASE 1**  
> The redesign agent must use **design placeholders** for all images initially. This document exists so real assets can be swapped in later without re-researching assignments.

---

## Policy

| Phase | Image source | Action |
|-------|--------------|--------|
| **1 — Redesign build** | Design placeholders | Wire `PhotoRef`-shaped objects with placeholder `src` URLs; keep `id` and `alt` from this doc |
| **2 — Asset swap** | `src/assets/tours/*.jpg` | Update `src/data/tour-photos.ts` imports only |

---

## File inventory

All tour photos live in `src/assets/tours/`. Processed at build time via `astro:assets` → AVIF/WebP.

| Photo ID | File | Format | Dimensions | Orientation | Placeholder color |
|----------|------|--------|------------|-------------|-------------------|
| `blueCave` | `blue-cave.jpg` | JPEG | 960×1280 | Portrait | `#1a5c6e` |
| `blueLagoon` | `blue-lagoon.jpg` | JPEG | 1280×853 | Landscape | `#3a8fa8` |
| `blueLagoonAlt` | `blue-lagoon-alt.jpg` | JPEG | 1280×671 | Landscape | `#2d7a94` |
| `hvar` | `hvar.jpg` | JPEG | 960×1280 | Portrait | `#5a7a8a` |
| `pakleni` | `pakleni.jpg` | JPEG | 960×1280 | Portrait | `#3a8fa8` * |
| `stiniva` | `stiniva.jpg` | JPEG | 960×1280 | Portrait | `#3a6860` |
| `boatSpeed` | `boat-speed.jpg` | JPEG | 960×1280 | Portrait | `#2a5060` |
| `boatDeck` | `boat-speed.jpg` (same file) | JPEG | 960×1280 | Portrait | `#2a5060` |

\* `pakleni` registry color is `#2a8099` in code.

### Non-tour assets

| Asset | Path | Role |
|-------|------|------|
| Favicon | `public/favicon.svg` | Browser tab icon |
| Glorich Light | `public/fonts/glorich/Glorich-Light.ttf` | Display font 300 |
| Glorich Medium | `public/fonts/glorich/Glorich-Medium.ttf` | Display font 500 |
| Glorich Bold | `public/fonts/glorich/Glorich-Bold.ttf` | Display font 700 |

### Inline SVG (not raster)

| Component | Role |
|-----------|------|
| `Logo.astro` | HBC monogram |
| `Wordmark.astro` | HELLO BLUE CAVE text |
| `WaveDivider.astro` | Decorative waves |

---

## Photo registry (`src/data/tour-photos.ts`)

```ts
type PhotoRef = {
  src: ImageMetadata;  // → swap to placeholder in phase 1
  alt: string;         // → keep verbatim
  color: string;       // → use as CSS placeholder bg
};
```

### Alt text (canonical)

| Photo ID | Alt text |
|----------|----------|
| `blueCave` | Sea cave with turquoise water — Blue Cave area |
| `blueLagoon` | Aerial view of Blue Lagoon at Budikovac |
| `blueLagoonAlt` | Turquoise bays and anchored boats near Budikovac |
| `hvar` | Hvar town and harbour from the hillside |
| `pakleni` | Turquoise Adriatic water beneath limestone cliffs |
| `stiniva` | Layered cliffs and emerald water at Stiniva |
| `boatSpeed` | Tour boat entering a sea cave |
| `boatDeck` | Tour boat at a sea cave entrance |
| `hero` (homepage) | *(empty string in current code)* |

---

## Image roles on pages

| Role | Component / page | Layout | Loading | Sizes hint |
|------|------------------|--------|---------|------------|
| **Homepage hero** | `Hero.astro` | `hero` | eager, high priority | 100vw |
| **Tour card thumbnail** | `TourCard.astro` | `card` | lazy | 88vw → 380px |
| **Tour detail hero** | `TourDetailView.astro` | `hero` | eager | 100vw |
| **Tour detail gallery** | `TourDetailView.astro` | `gallery` | lazy | 100vw → 33vw |
| **OG / social share** | `[slug].astro`, `index.astro` | generated 1200×630 JPG | — | — |

---

## Tour → image assignment

### Hero image (`tour.image`)

| Tour slug | Photo ID |
|-----------|----------|
| `blue-cave-hvar-5-islands` | `blueCave` |
| `three-islands` | `pakleni` |
| `hvar-pakleni` | `hvar` |
| `blue-lagoon-morning` | `blueLagoon` |
| `blue-lagoon-afternoon` | `blueLagoonAlt` |
| `blue-cave-open-boat` | `boatSpeed` |
| `blue-cave-luxury-cabin` | `boatDeck` |
| `blue-cave-6-islands` | `blueCave` |
| `blue-lagoon-half-day` | `blueLagoon` |
| `create-perfect-day-private` | `boatDeck` |

### Gallery (`tour.gallery` — 3 images each, lazy-loaded)

| Tour slug | Gallery photo IDs |
|-----------|-------------------|
| `blue-cave-hvar-5-islands` | `pakleni`, `hvar`, `stiniva` |
| `three-islands` | `blueLagoon`, `hvar`, `stiniva` |
| `hvar-pakleni` | `pakleni`, `stiniva`, `blueLagoon` |
| `blue-lagoon-morning` | `blueLagoonAlt`, `stiniva`, `pakleni` |
| `blue-lagoon-afternoon` | `blueLagoon`, `stiniva`, `pakleni` |
| `blue-cave-open-boat` | `blueCave`, `stiniva`, `pakleni` |
| `blue-cave-luxury-cabin` | `blueCave`, `hvar`, `stiniva` |
| `blue-cave-6-islands` | `pakleni`, `stiniva`, `hvar` |
| `blue-lagoon-half-day` | `stiniva`, `pakleni`, `blueLagoonAlt` |
| `create-perfect-day-private` | `hvar`, `blueLagoon`, `pakleni` |

### Homepage hero

| Slot | Photo ID | Notes |
|------|----------|-------|
| Hero background | `blueLagoon` | Same file as `blueLagoon`; `HERO_IMAGE` in `tour-photos.ts` |

---

## Phase 2 swap checklist

1. Restore imports in `src/data/tour-photos.ts` from `src/assets/tours/`
2. Point `TourImage` (or replacement component) at `PhotoRef.src` again
3. Verify hero LCP uses `eager` + `fetchpriority="high"`
4. Verify gallery and cards use `loading="lazy"`
5. Confirm OG images generate at 1200×630

---

## Retired tours (no photos)

These slugs were removed from catalog — no image assignment. Redirects only.

| Slug | Reason |
|------|--------|
| `golden-horn-brac-hvar` | No Brač / Golden Horn photos |
| `brac-golden-horn` | No Brač photos |
| `blue-lagoon-trogir` | No Trogir photos |
| `hvar-red-rocks-pakleni` | No Red Rocks photos |
| `three-islands-trogir` | No Trogir photos |

See `public/_redirects` for 301 rules.
