# Redesign preparation — index

> **Audience:** Cursor agent implementing the Hello Blue Cave redesign from Claude-generated designs.  
> **Start here.** Read `01-AGENT-BRIEF.md` before writing any code.

---

## Document map

| File | Purpose | When to read |
|------|---------|--------------|
| [01-AGENT-BRIEF.md](./01-AGENT-BRIEF.md) | Rules, constraints, workflow, placeholder policy | **First — always** |
| [02-PAGES-AND-COMPONENTS.md](./02-PAGES-AND-COMPONENTS.md) | Current page & component inventory with roles | When mapping design frames to code |
| [03-TOUR-DATA.json](./03-TOUR-DATA.json) | Canonical tour catalog (machine-readable) | When filling tour cards, detail pages, forms |
| [04-IMAGE-ASSETS.md](./04-IMAGE-ASSETS.md) | Real image inventory + tour assignments | **Phase 2 only** — not for initial build |
| [05-SITE-COPY.md](./05-SITE-COPY.md) | Site config, FAQ, shared copy blocks | When wiring global copy |
| [06-FUNCTIONAL-BEHAVIORS.md](./06-FUNCTIONAL-BEHAVIORS.md) | Booking flow, contact API, redirects | When preserving interactive behavior |

---

## Quick reference

### Stack (required)

- **Astro 6** + **Vue** (islands/components as needed per design)
- **Netlify** adapter (`output: 'server'`, mostly prerendered pages)
- **pnpm** package manager, Node ≥ 22.12

### Source of truth

| Data type | Canonical location |
|-----------|-------------------|
| Tour catalog | `src/data/tour-catalog.ts` → mirrored in `03-TOUR-DATA.json` |
| Tour photos registry | `src/data/tour-photos.ts` → documented in `04-IMAGE-ASSETS.md` |
| FAQ | `src/data/faq.ts` → mirrored in `03-TOUR-DATA.json` |
| Site identity | `src/config/site.ts` → mirrored in `03-TOUR-DATA.json` |
| Tour types | `src/types/tour.ts` |

### Design vs. legacy

| Layer | Redesign phase 1 | Later |
|-------|------------------|-------|
| Layout & visual design | **Follow Claude designs** | — |
| Pages & routes | **Follow design** (may differ from current site) | — |
| Tour text/data | **Use `03-TOUR-DATA.json`** | — |
| Images | **Use design placeholders** | Swap to real assets per `04-IMAGE-ASSETS.md` |
| Booking/contact logic | **Preserve behavior** per `06-FUNCTIONAL-BEHAVIORS.md` | — |

### Role tag legend (used in doc 02)

| Tag | Meaning |
|-----|---------|
| `[SHELL]` | HTML wrapper, layout, SEO |
| `[NAV]` | Header, footer, navigation |
| `[MARKETING]` | Homepage promotional sections |
| `[CATALOG]` | Tour listing, cards, carousels |
| `[DETAIL]` | Single-tour content display |
| `[FORM]` | User input forms |
| `[BOOKING]` | Book-now / confirmation flow |
| `[LEGAL]` | Privacy, terms |
| `[BRAND]` | Logo, wordmark |
| `[DECOR]` | Non-content visuals |
| `[SCRIPT]` | Client-side behavior |
| `[API]` | Server endpoint |
| `[CURRENT]` | Exists in codebase today |
| `[DESIGN-DRIVEN]` | Page list comes from design, not this inventory |

---

## Existing codebase entry points

```
src/
  pages/          Routes (design may add/replace)
  components/     UI (will be largely replaced)
  layouts/        BaseLayout, SiteLayout
  data/           Tour catalog, FAQ, photos
  config/         Site name, email, phone
  lib/            tours, booking, validation helpers
  client/         booking-forms.ts, contact-form.ts
  types/          TourDetail schema
  styles/tokens/  Design tokens (may be replaced by redesign)
```

---

## Related legacy docs

- `docs/TOUR-CATALOG-AND-PHOTOS.md` — historical photo sourcing notes (June 2026 trim). Superseded for redesign by `04-IMAGE-ASSETS.md`.
