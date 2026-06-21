# Blue Cave Tours

Astro 6 tour-booking site replacing the legacy WordPress site. Hosted on **Netlify**; email stays on **cPanel**; reservations in **Supabase EU**.

## Quick start

```bash
nvm use          # Node >= 22.12 (see .nvmrc)
pnpm install
cp .env.example .env   # fill when ready — demo works without secrets
pnpm dev           # http://localhost:4321
```

**Node:** If `pnpm dev` fails with an old Node version, run `nvm use` first or use the script runner in `package.json` (wraps `scripts/run-with-node.sh`).

## Commands

| Command | Action |
|---------|--------|
| `pnpm dev` | Local dev server |
| `pnpm build` | Production build → `dist/` |
| `pnpm test` | Unit tests (21 tests) |

## What works without secrets (demo mode)

- All pages in **Croatian** (`/`, `/tours`, `/tours/[slug]`, `/contact`, `/faq`, legal)
- Booking form with live price quotes
- Contact form (success UI; email not sent until SMTP configured)
- Cookie consent, mobile nav, tour carousel

## Production setup

See **[docs/DEPLOY.md](docs/DEPLOY.md)** for the full Netlify deploy checklist and **[docs/PAYMENTS.md](docs/PAYMENTS.md)** for PayPal / Teya.

Minimum env vars for live bookings:

```env
PUBLIC_SITE_URL=https://yourdomain.com
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
PUBLIC_PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
```

## Stack

- Astro 6 + Netlify adapter (SSR)
- PayPal Orders v2 + Teya Hosted Checkout (skeleton)
- Supabase (reservations)
- nodemailer (SMTP via cPanel)
- Vitest

## Docs

- [IMPLEMENTATION_LOG.md](IMPLEMENTATION_LOG.md) — phase history
- [docs/DEPLOY.md](docs/DEPLOY.md) — deploy checklist
- [docs/PAYMENTS.md](docs/PAYMENTS.md) — payment providers
