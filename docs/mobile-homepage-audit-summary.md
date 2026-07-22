# Mobile audit & homepage fixes — conversation summary

Condensed record of two related chat sessions (Jul 2026). Use this instead of re-reading full transcripts.

---

## Design source of truth

- **No Figma** in repo. Reference: `new-pages-design/*.html` + `docs/redesign/`.
- **Breakpoints:** `768px` (tablet), `480px` (small mobile).
- **Gutters:** `--page-gutter`: `1.25rem` → `1rem` (≤768) → `0.75rem` (≤480).
- **Content max:** `960px` (`src/styles/tokens/redesign.css`).

---

## Session 1 — Full mobile audit (all pages)

### Scope
19 routes audited vs HTML mockups. Subagents mapped pages, tokens, and overlap risks.

### Main issues found
| Area | Problem |
|------|---------|
| Homepage hero | `hero-badge` + `quick-search` both absolute; trust-bar used `margin-top: 90px/190px` hacks |
| Booking flow | Step bar clipped on ~375px; `policy-note` overflow; double vertical padding |
| FAQ | Cancellation answer generic — didn't mention 48h policy (design requires alignment) |
| Destinations catalog | Global `.dest-grid` carousel rules broke listing grid |
| Detail pages | Sticky card `top: 16px` ignored sticky nav |
| Catalogs | `minmax(290px)` overflow at 320px; filter chips below 44px touch target |

### Fixes applied (11 files)
- **Hero mobile:** Reflow quick-search + badge in document flow; reset trust-bar margin.
- **Booking:** Step bar scroll + hide inactive labels at 480px; policy/lock note wrap; safe-area padding; 16px inputs (iOS zoom).
- **Global CSS:** `--site-header-height`, sticky card offset, exclude `.dest-grid--listing` from carousel, footer/map mobile tweaks.
- **FAQ data:** 48h cancellation copy aligned with legal/booking surfaces.
- **Catalogs:** Single-column at 480px; card footer wrap; restore touch targets.

### Validation
- `pnpm run check` — pass  
- `pnpm run build` — pass  
- **Not committed** (user did not request commit).

---

## Session 2 — Homepage mobile only (no desktop changes)

### User-reported issues
1. Missing icons in horizontal sliders  
2. Icon/text overlap in destination cards  
3. Large empty gap in hero banner above “48h cancellation” badge  
4. Quick-search: search button size and spacing vs dropdowns  

### Root causes
- Hero used `min-height: 100dvh` + `min-height: 55dvh` on content → huge whitespace before badge/search.
- **`ti-island` is not a valid Tabler Icons 3.44 glyph** → empty placeholders in tour cards and destination sliders. Valid replacements used: `sailboat`, `building-lighthouse`.

### Fixes applied
**CSS (`src/styles/redesign.css`, mobile ≤768 only for hero):**
- Removed forced full-viewport hero height.
- Tighter hero content padding; badge margin `0.75rem` above search.
- Quick-search: destination field spans full width; search button full width, centered, `padding: 11px 18px`.

**Icon renames (live `src/` only):**
| Was | Now | Where |
|-----|-----|--------|
| `island` | `building-lighthouse` | `destinations.ts`, dest detail, catalog filter chip |
| `island` | `sailboat` | `TourCard.astro`, `ToursCatalog.vue`, homepage review, tour detail gallery |

**Files touched in session 2:**  
`redesign.css`, `TourCard.astro`, `destinations.ts`, `ToursCatalog.vue`, `DestinationsCatalog.vue`, `PrivateBookingFlow.vue`, `destinations/[slug].astro`, `TourDetailView.astro`, `index.astro`.

### Verified via static build screenshots (390px)
- Hero gap closed; badge sits directly above search card.
- Popular tours show sailboat on teal placeholder.
- “Where we go” cards show droplet / lighthouse background icons.

---

## 48h cancellation — copy surfaces (must stay aligned)

Per `new-pages-design/00-project-docs.md`: FAQ, booking summary, and success email must match.

| Surface | Status after fixes |
|---------|-------------------|
| Homepage hero badge | “Free cancellation up to 48h” |
| Tour detail `policy-pill` | ✓ |
| Group/private booking `policy-note` | ✓ |
| Review page `policy-box` | ✓ |
| Legal cancellation/terms | ✓ |
| FAQ (`src/data/faq.ts`) | Updated in session 1 |

---

## Still open (low priority, not done)

- Nested `<a>` inside destination cards (`DestinationsCatalog.vue`) — invalid HTML.
- Duplicate step-bar CSS in booking Astro pages vs global `redesign.css`.
- Mobile nav Escape / focus trap (noted in `docs/seo-lighthouse-audit.md`).
- Mockup HTML still uses invalid `ti-island` (reference only, not live app).

---

## Quick validation checklist (mobile)

1. `/` — hero compact; badge → search → trust bar; slider icons visible.  
2. `/tours` — filter chips ≥44px; grid single column at 480px.  
3. `/destinations` — listing grid (not horizontal carousel).  
4. `/book/.../group` — step bar scrolls; policy note wraps.  
5. `/faq` — cancellation answer mentions 48 hours.

---

## Commit readiness (as of session 2 end)

All automated checks passed after session 2 rebuild. Changes span both sessions; user has not requested a commit yet.

Suggested message if committing:

```
Fix mobile homepage layout and replace invalid Tabler island icon.

Reflow hero on mobile to remove banner gap, improve quick-search spacing,
and use sailboat/building-lighthouse where ti-island did not render.
```
