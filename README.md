# Hello Blue Cave

Client showcase site for **Hello Blue Cave** — boat tours and private charters from Split, Croatia. Built with [Astro 6](https://astro.build), deployed to Netlify.

**Brand:** Adriatic Blue `#003D84`, Linen White `#F6F1F2`, Glorich + Playfair Display, H·B·C monogram, HELLO BLUE CAVE wordmark.

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
- **Contact form** → validates and returns success (wire email delivery before production use).

## Structure

```text
src/
  components/     Header, Hero, tours, booking CTAs
  config/         Site name, typography
  data/           Tour catalog, FAQ
  layouts/        Base + site shell
  client/         Booking redirect + contact form
  pages/          Routes + /api/contact
  styles/tokens/  Colors, typography, layout
```
