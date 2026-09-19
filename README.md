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
- **Contact form** → validates with honeypot + min submit time; returns success (no email yet).
- **Before production:** wire email delivery, add Cloudflare Turnstile (or similar) + rate limiting — honeypot alone is not enough for a live public form.

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
