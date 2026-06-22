# Blue Cave Tours

Marketing site and booking flow for Blue Cave Tours (Split, Croatia). Built with [Astro 6](https://astro.build) and deployed to Netlify with SSR for API routes.

## Commands

| Command        | Action                          |
| -------------- | ------------------------------- |
| `pnpm install` | Install dependencies (Node 22.12+ or 26) |
| `pnpm dev`     | Dev server at `localhost:4321`  |
| `pnpm build`   | Production build                |
| `pnpm preview` | Preview production build        |

## Deploy to Netlify

1. **Connect repo** — build command `pnpm run build`, publish directory `dist` (see `netlify.toml`).
2. **Node** — local dev: 22.12+ or 26 (see `.nvmrc`). Netlify build uses Node 22 via `netlify.toml`.
3. **Environment variables** (Site settings → Environment):

   | Variable | Required | Notes |
   | -------- | -------- | ----- |
   | `PUBLIC_SITE_URL` | Yes (prod) | Canonical URL, e.g. `https://bluecavetours.com` |
   | `STRIPE_SECRET_KEY` | For live checkout | Stripe secret key |
   | `CHECKOUT_MODE` | Optional | `stripe` for live; `mock` for staging demo only |
   | `STRIPE_PRICE_*` | Per tour | One Price ID per slug — see `.env.example` |

4. **Without Stripe** — production defaults to **quote-only**: “Book now” becomes “Request a quote” linking to `/contact`. No fake payment success.

5. **With Stripe** — set `CHECKOUT_MODE=stripe`, `STRIPE_SECRET_KEY`, and each `STRIPE_PRICE_<SLUG>` env var. Success page verifies `session_id` with Stripe.

## Local development

Copy `.env.example` to `.env`:

```sh
cp .env.example .env
```

- No Stripe keys → mock checkout redirects to `/booking/success?demo=1`.
- Contact form validates input and returns success; wire an email provider later for production delivery.

## Project structure

```text
src/
  components/     UI (Header, tours, booking CTAs)
  config/         Site + brand tokens (typography, colors)
  data/           Tour catalog
  layouts/        Base + site shell
  lib/            Booking helpers, Stripe session verify
  pages/          Routes + API (`/api/contact`, `/api/create-checkout-session`)
  server/         Checkout mode resolution
  styles/         Global CSS + design tokens
```

## Checkout modes

| Mode | When | Behavior |
| ---- | ---- | -------- |
| `mock` | Dev default, or `CHECKOUT_MODE=mock` | Demo redirect, no charge |
| `stripe` | Secret key + `CHECKOUT_MODE=stripe` (or key only in dev) | Stripe Checkout |
| `off` | Production without Stripe | Quote/contact only |

Private charter (`create-perfect-day-private`) always uses the contact flow.
