# Hello Blue Cave

Client showcase site for **Hello Blue Cave**: boat tours and private charters from Split, Croatia. Built with [Astro 6](https://astro.build) and Vue islands, deployed to Netlify at https://hello-blue-cave.netlify.app.

**Brand:** sea-blue accent `#1a6fc4` (`--color-accent` in `src/styles/tokens/design.css`) on white/gray neutrals, orange only for buttons on photos, system font stack (`--font-sans`) at 16px, and an uppercase display face (`--font-display`: Anton for now, Glorich once licensed; built by `pnpm fonts`). Text wordmark "Hello Blue Cave".

## Commands

| Command | Action |
| -------- | ------ |
| `pnpm install` | Install dependencies (Node 22, see `.nvmrc`) |
| `pnpm dev` | Dev server at `localhost:4321` |
| `pnpm build` | Production build into `dist/` |
| `pnpm check` | Type-check, the icon font covers every icon used, and the token check (`pnpm tokens`: no new raw colours outside the token files) |
| `pnpm test` | Unit tests (Vitest): booking, pricing, contact validation, catalog data, contact API |
| `pnpm icons` | Rebuild the icon font subset after adding a new `ti-*` icon (needs network) |
| `pnpm fonts` | Rebuild the display font subset (needs network) |
| `pnpm test:a11y` | axe on every public page; fails if a page gets more serious/critical violations than `tests/a11y/axe-baseline.json` |
| `pnpm test:visual admin` | Admin look check: every element's computed style must match the baselines (see `tests/visual/admin.spec.ts`) |
| `CAPTURE=<label> pnpm test:visual capture --project=chromium` | Full-page screenshots of every public page into `screenshots/<label>/` (not committed) |
| `pnpm test:e2e` | End-to-end flows (Chromium, WebKit, Firefox) |

CI (`.github/workflows/ci.yml`) runs check, test and build on every pull request. The Playwright suites run locally only (first time: `pnpm exec playwright install chromium webkit firefox`). They start their own dev server with email off and `CONTEXT=playwright`, which gives them separate Blobs stores, so they never touch your local dev bookings.

**Styles:** public pages load `src/styles/global.css` (through `SiteLayout`), which puts everything in cascade layers: `tokens < legacy < base < components < pages < utilities`. The old modules sit in `legacy`, so new component and page styles (in `@layer components` / `@layer pages`, Vue `<style scoped>` included) override them whatever their specificity. `STYLES=<label> pnpm test:visual public-styles --project=chromium` dumps every element's computed style, and `node tests/visual/compare-styles.mjs <a> <b>` diffs two dumps, for refactors that mustn't change the look. the admin loads only `src/styles/admin.css` (through `AdminLayout`), its look frozen with its own `--a-*` tokens until it's re-skinned. The October 2026 redesign plan is `docs/redesign/07-IMPLEMENTATION-SPEC.md`, with the design reference in `design/2026-10/`.

**Component kit:** the redesign's shared components live in `src/components/ui/`, `src/components/booking/` and `src/components/vue/` (TourCard, DestinationCard, ImageGallery). Every one is shown on `/dev/kit/`, which exists only in `pnpm dev` and Netlify deploy previews, never in production. Components that have an `.astro` and a `.vue` version share one stylesheet in `src/styles/components/`.

## Deploy

- Netlify builds `pnpm run build` and publishes `dist` (see `netlify.toml`).
- Set `PUBLIC_SITE_URL=https://hello-blue-cave.netlify.app` in the Netlify production environment. Canonical URLs, the sitemap and share tags are baked in at build time.
- Pushes that only touch docs or design files skip the Netlify build (`ignore` rule in `netlify.toml`); each production deploy costs Free-plan credits.

## Booking flow (preview, no payment)

1. Tour page → **Book group tour** → `/book/<tour>/group/`: pick a date, guests and contact details.
2. `/book/<tour>/review/` shows the summary; **Continue to payment** goes to `/booking/success/` (a demo confirmation, nothing is charged). `/booking/error/` is the failed-payment page.
3. Tours without a fixed per-person price (private charters, "price on request") go to the contact form instead (`/contact/?tour=<tour>`). `supportsInstantBook` in `src/lib/booking.ts` decides this from the tour's `types` and `adultPrice`.

**Contact form:** honeypot + minimum submit time, then Cloudflare Turnstile and a per-IP rate limit (5 requests / 10 min, Netlify Blobs). It returns success but **does not send email yet**. Turnstile turns on once `PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` are both set in Netlify (see `.env.example`); redeploy after adding them, because the page reads the site key at build time.

## Structure

```text
src/
  assets/         Photos and the generated icon font subset
  client/         Contact form script
  components/     Header, footer, booking chrome, tour detail view
    ui/           Shared components (Button, Badge, Notice, Marquee, PhotoHero…)
    booking/      StepBar, SummaryCard
    vue/          Islands and Vue components: cards, gallery, catalogs, booking flow, FAQ, hero carousel
  dev/            The /dev/kit/ component page (dev and deploy previews only)
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
