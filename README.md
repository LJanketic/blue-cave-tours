# Hello Blue Cave

Client showcase site for **Hello Blue Cave** — boat tours and private charters from Split, Croatia. Built with [Astro 6](https://astro.build), deployed to Netlify.

**Brand:** teal accent `#1d9e75` (`--color-accent` in `src/styles/tokens/redesign.css`) on white/gray neutrals, system font stack (`--font-sans`), text wordmark "Hello Blue Cave" — no custom typeface or monogram.

## Commands

| Command | Action |
| -------- | ------ |
| `pnpm install` | Install dependencies (Node 22.12+ or 26) |
| `pnpm dev` | Dev server at `localhost:4321` |
| `pnpm build` | Production build |
| `pnpm preview` | Preview production build |

## Deploy

1. Build: `pnpm run build`, publish `dist` (see `netlify.toml`).
2. Set `PUBLIC_SITE_URL=https://hellobluecave.com` in Netlify environment.

## Booking flow (preview)

- **Book now** on tour cards → confirmation page (`/booking/success?tourId=…`). No payment — for client review.
- **Private charter** → contact / quote flow.
- **Contact form** → validates with honeypot + min submit time, then Cloudflare Turnstile + a per-IP rate limit (5 requests / 10 min, backed by Netlify Blobs); returns success (no email yet).
- **Before production:** set `PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in Netlify (see `.env.example`) — the widget and server-side verification are skipped until both are set. Email delivery still isn't wired.

## Structure

```text
src/
  components/     Header, Hero, tours, booking CTAs
  config/         Site name, cancellation copy, noindex rules
  data/           Tour catalog, FAQ
  layouts/        Base + site shell
  client/         Booking redirect + contact form
  pages/          Routes + /api/contact
  styles/tokens/  Colors, typography, layout
docs/
  redesign/       Redesign agent reference (start at 00-INDEX.md)
```
