# SEO & Lighthouse Audit Report

**Site:** Hello Blue Cave (Astro + Vue islands, Netlify)  
**Date:** July 2, 2026  
**Method:** Static codebase analysis via parallel subagent audits + targeted fixes

---

## Executive summary

The site had a **solid SEO foundation** (unique titles/descriptions, canonical URLs, prerendered marketing pages, semantic landmarks) but was missing **critical discovery infrastructure** (sitemap, robots.txt), **incomplete social meta**, **no structured data**, and several **Lighthouse performance/accessibility gaps**.

This audit identified **22 prioritized items**. **P0 and high-value P1 fixes have been implemented** in this pass (see [Implemented fixes](#implemented-fixes)).

### Estimated Lighthouse impact (before → after)

| Category | Before (est.) | After fixes (est.) | Notes |
|----------|---------------|-------------------|-------|
| SEO | 75–85 | 92–98 | Sitemap, OG tags, JSON-LD, crawlable links |
| Performance | 70–80 | 82–90 | Non-blocking icons, deferred hydration |
| Accessibility | 80–88 | 90–95 | FAQ keyboard support, contrast fix |
| Best Practices | 90+ | 90+ | Already strong Netlify headers |

*Run `pnpm build && pnpm preview` then Lighthouse in Chrome DevTools for live scores.*

---

## What was already good

1. Centralized SEO copy in `src/config/site.ts`
2. Unique meta descriptions on all major pages
3. Canonical URL generation (when `PUBLIC_SITE_URL` is set)
4. Prerender on core content pages
5. Strong H1/H2 structure on home, tour/destination detail, about, legal
6. Skip link + `aria-labelledby` on sections
7. Internal linking hubs (header, footer, homepage, breadcrumbs)
8. 301 redirects for legacy tour URLs (`public/_redirects`)
9. Alt text registry in `src/data/tour-photos.ts`
10. Netlify security headers (HSTS, X-Frame-Options, etc.)

---

## Critical gaps found (P0)

| # | Issue | Status |
|---|-------|--------|
| 1 | No `sitemap.xml` | ✅ Fixed — `@astrojs/sitemap` |
| 2 | No `robots.txt` | ✅ Fixed — `public/robots.txt` |
| 3 | Incomplete OG/Twitter tags | ✅ Fixed — `BaseLayout.astro` |
| 4 | No default `og:image` | ✅ Fixed — `public/og-default.svg` |
| 5 | No JSON-LD structured data | ✅ Fixed — Organization, WebSite, TouristTrip, FAQPage, BreadcrumbList |
| 6 | Booking funnel indexed | ✅ Fixed — `noindex` on book/*, booking/success, booking/error |
| 7 | Destinations catalog not crawlable | ✅ Fixed — real `<a href>` in `DestinationsCatalog.vue` |
| 8 | Render-blocking Tabler CDN | ✅ Fixed — pinned version + async CSS load |
| 9 | FAQ accordions not keyboard-accessible | ✅ Fixed — `<button aria-expanded>` pattern |

---

## High-priority remaining (P1 — not yet done)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 1 | Wire real tour photos via `TourImage.astro` | 4–8 hrs | LCP, image SEO |
| 2 | Split/purge `redesign.css` (~61KB monolithic) | 4–8 hrs | Performance |
| 3 | Replace Tabler webfont with inline SVG icons | 8–16 hrs | Performance, CSP |
| 4 | Add Content-Security-Policy header | 2 hrs | Best practices |
| 5 | Tour detail → destination internal links | 2–4 hrs | SEO internal linking |
| 6 | Card titles as `<h2>`/`<h3>` in listings | 2–3 hrs | Accessibility/SEO |
| 7 | Enforce `PUBLIC_SITE_URL` in production CI | 30 min | Canonical accuracy |
| 8 | `noindex` on `/booking/details` (optional) | 15 min | Crawl budget |

---

## Polish backlog (P2)

- `twitter:site` handle when account exists
- WebSite SearchAction schema
- Review/AggregateRating schema (requires verified review source)
- Self-host Glorich fonts or remove unused font files
- `apple-touch-icon` + web manifest
- hreflang if Croatian version added
- Mobile nav Escape-to-close / focus trap
- Filter chips `aria-pressed`

---

## Implemented fixes

### SEO infrastructure
- **`@astrojs/sitemap`** in `astro.config.mjs` — excludes `/book/`, `/booking/success`, `/booking/error`, `/api/`
- **`public/robots.txt`** — disallows booking/API paths, references sitemap
- **`src/lib/seo.ts`** — JSON-LD helpers and default OG image constant

### Meta & social
- **`BaseLayout.astro`** — full Open Graph + Twitter Card tags on every page
- **`public/og-default.svg`** — 1200×630 branded fallback image

### Structured data
- **Homepage** — Organization, WebSite, FAQPage (preview items)
- **Tour detail** — TouristTrip + BreadcrumbList
- **FAQ page** — FAQPage (all items)

### Crawlability & indexing
- **`DestinationsCatalog.vue`** — destination cards use crawlable `<a href>`
- **Booking pages** — `robots="noindex, nofollow"`
- **404 page** — custom description + `noindex, follow`

### Performance
- Tabler Icons: **pinned to v3.31.0**, preconnect, non-blocking CSS pattern
- Vue hydration: **`client:idle`** (QuickSearch), **`client:visible`** (catalogs, FAQ, galleries)

### Accessibility
- **FAQAccordion.vue** + **FAQPage.vue** — button triggers with `aria-expanded` / `aria-controls`
- **TourDetailView.astro** — overview section uses proper `<h2>`
- **Contrast** — `--color-text-tertiary` updated from `#999` to `#767676` (WCAG AA)

---

## Action plan (recommended order)

### Phase 1 — Done ✅
Sitemap, robots, OG tags, JSON-LD, noindex funnel, crawlable links, FAQ a11y, hydration tuning.

### Phase 2 — Next sprint (1–2 days)
1. Wire real images through `TourImage.astro` with `priority` on hero/LCP
2. Audit and split CSS; remove dead legacy styles
3. Add CSP header in `netlify.toml`
4. Cross-link tour itineraries to destination pages

### Phase 3 — Pre-launch polish (0.5–1 day)
1. Verify `PUBLIC_SITE_URL=https://hellobluecave.com` in Netlify env
2. Run Lighthouse on all key page templates
3. Submit sitemap in Google Search Console
4. Add `apple-touch-icon` and web manifest

---

## Verification checklist

```bash
# Build with production site URL
PUBLIC_SITE_URL=https://hellobluecave.com pnpm build

# Preview locally
pnpm preview

# Check outputs
ls dist/sitemap*.xml   # sitemap generated when site URL set
curl -I http://localhost:4321/robots.txt
```

**Manual Lighthouse pages to test:**
- `/` (home)
- `/tours` (catalog + filters)
- `/tours/blue-cave-hvar-5-islands` (detail + JSON-LD)
- `/destinations` (crawlable cards)
- `/faq` (accordion a11y)
- `/contact` (form labels)

**Rich results test:** [Google Rich Results Test](https://search.google.com/test/rich-results) on tour and FAQ URLs.

---

## Key files reference

| Concern | Files |
|---------|-------|
| Meta / canonical / OG | `src/layouts/BaseLayout.astro`, `SiteLayout.astro` |
| JSON-LD | `src/lib/seo.ts`, page files |
| Sitemap | `astro.config.mjs` |
| Robots | `public/robots.txt` |
| Crawlable links | `src/components/vue/DestinationsCatalog.vue` |
| Accessibility | `FAQAccordion.vue`, `FAQPage.vue` |
| Performance | `BaseLayout.astro` (icons), `client:*` directives on pages |
