# Implementation log — Blue Cave Tours migration

Tracks which plan phase touched which files and why. Secrets live only in `.env` (local) / Netlify env (deployed).

## Locked decisions

| Decision | Value |
| -------- | ----- |
| App host | Netlify (free) |
| Database | Supabase EU (Frankfurt) |
| Email | Keep on cPanel (MX unchanged); SMTP via existing provider (G4) |
| G10 | No Node on cPanel — confirmed |
| Overbooking / capacity | Out of scope |
| Default locale | `hr` (confirm against live site before cutover) |

## Phase 0 — Ops (human; not in repo)

- G1–G9 gates, B1 backup, DNS/MX snapshot — **blocked on your cPanel/registrar access**

---

## Phase 1 — Foundation ✅ (local)

### A0 — Remove Stripe showcase ✅

| File | Action | Why |
| ---- | ------ | --- |
| `src/pages/api/create-checkout-session.ts` | Delete | Stripe showcase removed |
| `src/server/stripe-prices.ts` | Delete | Per-tour Stripe Price IDs |
| `src/server/checkout-mode.ts` | Delete | mock/stripe mode |
| `src/client/checkout-forms.ts` | Delete | Replaced by `booking-form.ts` |
| `src/components/CheckoutScript.astro` | Delete | Replaced by `BookingScript.astro` |
| `package.json` | Edit | Remove `stripe` |
| `.env.example` | Edit | PayPal, Supabase, SMTP vars |
| `src/env.d.ts` | Edit | Typed env for new stack |

### A1 — i18n skeleton ✅

| File | Action | Why |
| ---- | ------ | --- |
| `astro.config.mjs` | Edit | `i18n`, `site` |
| `src/i18n/locales.ts` | Add | Locale list + labels |
| `src/i18n/ui.ts` | Add | Shared UI strings (EN source; others placeholder) |
| `src/i18n/index.ts` | Add | `t()`, helpers |
| `src/layouts/BaseLayout.astro` | Edit | `lang`, `hreflang` |
| `src/components/Header.astro` | Edit | Localized nav + language switcher |
| `src/config/site.ts` | Edit | Central contact constants |

---

## Local demo polish ✅

| File | Action | Why |
| ---- | ------ | --- |
| `src/lib/dates.ts` | Add | Min booking date (Europe/Zagreb) |
| `src/client/booking-form.ts` | Edit | Quote on load, breakdown, contact prefill when PayPal off |
| `src/components/booking/BookingForm.astro` | Edit | Date min, line items, demo contact CTA |
| `src/client/contact-form.ts` | Edit | URL prefill, SMTP-aware success message |
| `src/pages/contact/index.astro` | Edit | Honeypot, updated copy |
| `src/pages/api/contact.ts` | Edit | Honeypot handling |
| `src/pages/api/booking/quote.ts` | Edit | Reject past dates |
| `src/components/CookieConsent.astro` | Add | Minimal consent banner |
| `src/i18n/ui.ts` | Edit | Booking demo strings (hr + en) |

**Local test:** `pnpm dev` → open a tour `#book`, change party size (quote updates), submit → contact link with prefilled message (no PayPal/Supabase/SMTP required).

---

## Phase 3 — Booking stack (skeleton ✅ locally; keys empty until you provide)

| File | Action | Why |
| ---- | ------ | --- |
| `src/lib/env.ts` | Add | Read secrets from `import.meta.env` only |
| `src/lib/pricing.ts` | Add | Server-side quote (G2 rules TBD) |
| `src/lib/db.ts` | Add | Supabase client + reservation types |
| `src/lib/paypal.ts` | Add | Orders v2 helpers (no creds = graceful error) |
| `src/lib/email.ts` | Add | nodemailer wrapper (no SMTP = skip send) |
| `src/lib/rate-limit.ts` | Add | Basic API rate limit |
| `src/pages/api/booking/quote.ts` | Add | POST quote |
| `src/pages/api/paypal/*.ts` | Add | create / capture / webhook stubs |
| `src/pages/api/contact.ts` | Edit | Wire to email when SMTP configured |
| `src/components/booking/BookingForm.astro` | Add | Tour booking UI |
| `src/client/booking-form.ts` | Add | Client submit → quote → PayPal flow |
| `src/components/BookingScript.astro` | Add | Load booking client script |
| `supabase/migrations/001_reservations.sql` | Add | DDL for manual run in Supabase |
| `TourCard.astro`, `TourDetailView.astro` | Edit | Booking form / contact CTA |
| `SiteLayout.astro` | Edit | BookingScript |
| `booking/success.astro`, `cancel.astro` | Edit | Remove Stripe copy |

---

## Autonomous batch ✅ (no credentials required)

| File | Action | Why |
| ---- | ------ | --- |
| `@astrojs/sitemap` | Add | Sitemap with i18n + all tour URLs |
| `astro.config.mjs` | Edit | Sitemap integration |
| `src/lib/sitemap-pages.ts` | Add | Build locale × tour URL list |
| `public/robots.txt` | Add | Crawler + sitemap pointer |
| `public/_redirects` | Add | WP admin scaffold (paste Yoast before cutover) |
| `src/layouts/BaseLayout.astro` | Edit | Open Graph + Twitter meta |
| `src/lib/json-ld.ts` | Add | TouristTrip schema on tour pages |
| `src/lib/email-templates.ts` | Add | HTML email layouts |
| `src/lib/email.ts` | Edit | Use templates |
| `src/i18n/ui.ts` | Edit | Contact, cookie, 404, booking result strings |
| `src/pages/contact/index.astro` | Edit | Localized |
| `src/pages/404.astro`, `booking/*` | Edit | Localized |
| `src/pages/tours/[slug].astro` | Edit | JSON-LD + localized 404 |
| `src/pages/legal/*` | Edit | GDPR/terms drafts (review before launch) |
| `src/lib/pricing.test.ts`, `dates.test.ts` | Add | Unit tests |
| `package.json` | Edit | `pnpm test` script |

---

## Local dev — Node version ✅

| File | Action | Why |
| ---- | ------ | --- |
| `.nvmrc` | Edit | Pin `22.22.1` (Astro requires `>=22.12.0`; user had `22.1.0`) |
| `scripts/check-node.mjs` | Add | `predev` / `prebuild` fail fast with `nvm use` hint |
| `.vscode/settings.json` | Add | Login shell so integrated terminal loads nvm |

**Run locally:** `nvm use && pnpm dev` → http://localhost:4321/

---

## Payment integration prep ✅

| File | Action | Why |
| ---- | ------ | --- |
| `docs/PAYMENTS.md` | Add | PayPal + Teya setup guide, env vars, flows, checklists |
| `src/lib/payments/types.ts` | Add | Shared payment provider types |
| `src/lib/payments/finalize.ts` | Add | Idempotent mark-paid + emails (PayPal + Teya) |
| `src/lib/teya.ts` | Add | Teya Hosted Checkout OAuth + session API |
| `src/pages/api/teya/*.ts` | Add | create-session, confirm-session stubs |
| `src/pages/api/paypal/*.ts` | Edit | Security fixes, shared finalize, error handling |
| `supabase/migrations/002_payment_providers.sql` | Add | `payment_provider`, Teya columns |
| `.env.example`, `env.d.ts`, `env.ts` | Edit | Teya + `PAYMENT_PROVIDER` vars |

**PayPal fixes:** webhook requires verification; only `PAYMENT.CAPTURE.COMPLETED`; DB insert failure blocks order; past-date validation; try/catch on provider errors.

**Teya:** server + client redirect wired in `booking-form.ts`; enable via `PAYMENT_PROVIDER=teya` + creds.

---

## Ship-ready status ✅ (2026-06-13)

| Area | Status |
|------|--------|
| Build & tests | ✅ 21 tests, clean `pnpm build` |
| HR locale pages | ✅ All routes |
| Booking demo flow | ✅ Quote + contact prefill |
| PayPal integration | ✅ Ready for creds |
| Teya integration | ✅ Ready for creds |
| i18n UI strings | ✅ hr + partial de/es/it in code |
| Multi-locale URLs | ⏸ Deferred (`/en/` 404 — switcher disabled) |
| Secrets | ⏸ User provides at deploy |

**Deploy docs:** `docs/DEPLOY.md`, `docs/PAYMENTS.md`, `README.md`

---

## Blocked — needs your input

| Item | Gate / input |
| ---- | ------------- |
| PayPal sandbox/live creds | `PAYPAL_*` in `.env` |
| Supabase project URL + service role | `SUPABASE_*` in `.env` |
| SMTP host/user/pass | G4 / `SMTP_*` in `.env` |
| Pricing rules (adults/children/infants) | G2 |
| Form field parity | G3 |
| 5-language tour copy | Phase 2 / B2 export |
| PayPal ACDC vs Teya | G1 |
| Default locale confirmation | Live site check |
| Yoast redirects | Phase 2 / A3 |
| Multi-locale URL routing (`/en/*`) | Phase 2 — Astro i18n prefix routes |
