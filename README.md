# Hello Blue Cave

Client showcase site for **Hello Blue Cave**: boat tours and private charters from Split, Croatia. Built with [Astro 6](https://astro.build) and Vue islands, deployed to Netlify at https://hello-blue-cave.netlify.app.

**Brand:** teal accent `#1d9e75` (`--color-accent` in `src/styles/tokens/redesign.css`) on white/gray neutrals, system font stack (`--font-sans`), text wordmark "Hello Blue Cave". No custom typeface or monogram.

## Commands

| Command | Action |
| -------- | ------ |
| `pnpm install` | Install dependencies (Node 22, see `.nvmrc`) |
| `pnpm dev` | Dev server at `localhost:4321` |
| `pnpm build` | Production build into `dist/` |
| `pnpm check` | Type-check, plus a check that the icon font covers every icon used |
| `pnpm test` | Unit tests (Vitest): booking, pricing, contact validation, catalog data, contact API |
| `pnpm icons` | Rebuild the icon font subset after adding a new `ti-*` icon (needs network) |
| `pnpm test:a11y` | axe on every public page; fails if a page gets more serious/critical violations than `tests/a11y/axe-baseline.json` |
| `pnpm test:visual admin` | Admin look check: every element's computed style must match the baselines (see `tests/visual/admin.spec.ts`) |
| `CAPTURE=<label> pnpm test:visual capture --project=chromium` | Full-page screenshots of every public page into `screenshots/<label>/` (not committed) |
| `pnpm test:e2e` | End-to-end flows (Chromium, WebKit, Firefox) |

CI (`.github/workflows/ci.yml`) runs check, test and build on every pull request. The Playwright suites run locally only (first time: `pnpm exec playwright install chromium webkit firefox`). They start their own dev server with email off and `CONTEXT=playwright`, which gives them separate Blobs stores, so they never touch your local dev bookings.

**Styles:** public pages load `src/styles/global.css` (through `SiteLayout`); the admin loads only `src/styles/admin.css` (through `AdminLayout`), its look frozen with its own `--a-*` tokens until it's re-skinned. The October 2026 redesign plan is `docs/redesign/07-IMPLEMENTATION-SPEC.md`, with the design reference in `design/2026-10/`.

## Deploy

- Netlify builds `pnpm run build` and publishes `dist` (see `netlify.toml`).
- Set `PUBLIC_SITE_URL=https://hello-blue-cave.netlify.app` in the Netlify production environment. Canonical URLs, the sitemap and share tags are baked in at build time.
- Pushes that only touch docs or design files skip the Netlify build (`ignore` rule in `netlify.toml`); each production deploy costs Free-plan credits.

## Booking flow (preview, no payment)

1. Tour page → **Book group tour** → `/book/<tour>/group/`: pick a date, guests and contact details.
2. `/book/<tour>/review/` shows the summary; **Continue to payment** goes to `/booking/success/` (a demo confirmation, nothing is charged). `/booking/error/` is the failed-payment page.
3. Tours without a fixed per-person price (private charters, "price on request") go to the contact form instead (`/contact/?tour=<tour>`). `supportsInstantBook` in `src/lib/booking.ts` decides this from the tour's `types` and `fromPrice`.

**Contact form:** honeypot + minimum submit time, then Cloudflare Turnstile and a per-IP rate limit (5 requests / 10 min, Netlify Blobs). It returns success but **does not send email yet**. Turnstile turns on once `PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` are both set in Netlify (see `.env.example`); redeploy after adding them, because the page reads the site key at build time.

## Structure

```text
src/
  assets/         Photos and the generated icon font subset
  client/         Contact form script
  components/     Header, footer, cards, tour detail view
    vue/          Interactive islands: catalogs, booking flow, gallery, FAQ, hero carousel
  config/         Site name/contact, cancellation copy, noindex rules
  data/           Tour catalog, destinations, FAQ, photos
  layouts/        Base + site shell
  lib/            Booking, pricing, SEO, validation helpers (+ *.test.ts)
  pages/          Routes + /api/contact
  styles/         Tokens, global CSS modules, generated icons.css
scripts/          icons.mjs (icon font subset)
tests/            Playwright: a11y (axe), visual (admin look, screenshots), e2e
design/2026-10/   The October 2026 design boards and research notes (reference only)
docs/             Audits and the redesign plan (docs/redesign/07-IMPLEMENTATION-SPEC.md)
```
