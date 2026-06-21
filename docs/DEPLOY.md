# Deploy checklist — Blue Cave Tours

Ship-ready for **Croatian (hr) default locale** on Netlify. Multi-locale URL prefixes (`/en/`, etc.) are deferred — UI strings exist but routes are not live yet.

---

## Pre-deploy (local)

```bash
nvm use
pnpm install
pnpm test    # expect 21 passing
pnpm build   # expect clean build
```

---

## 1. Supabase (EU Frankfurt)

1. Create project in **Frankfurt** region
2. SQL editor → run:
   - `supabase/migrations/001_reservations.sql`
   - `supabase/migrations/002_payment_providers.sql`
3. Copy **Project URL** + **service_role** key (never expose service role to client)

---

## 2. Netlify

1. Connect GitHub repo
2. Build settings (from `netlify.toml`):
   - Build: `pnpm run build`
   - Publish: `dist`
   - Node: `22`
3. Environment variables (Site settings → Environment):

| Variable | Required | Notes |
|----------|----------|-------|
| `PUBLIC_SITE_URL` | Yes | `https://bluecavetours.com` |
| `SUPABASE_URL` | For payments | |
| `SUPABASE_SERVICE_ROLE_KEY` | For payments | Server only |
| `PUBLIC_PAYPAL_CLIENT_ID` | For PayPal | |
| `PAYPAL_CLIENT_SECRET` | For PayPal | |
| `PAYPAL_MODE` | For PayPal | `sandbox` then `live` |
| `PAYPAL_WEBHOOK_ID` | Production PayPal | Webhook URL below |
| `PAYMENT_PROVIDER` | Optional | Set `demo` to force contact-only booking on staging |
| `SMTP_HOST` | For emails | cPanel mail host |
| `SMTP_PORT` | For emails | Usually `587` |
| `SMTP_USER` | For emails | |
| `SMTP_PASS` | For emails | |
| `SMTP_FROM` | For emails | e.g. `info@bluecavetours.com` |
| `SMTP_TO` | For emails | Ops inbox |

4. Deploy → note Netlify URL for testing before DNS cutover

---

## 3. PayPal (when creds ready)

1. [developer.paypal.com](https://developer.paypal.com) → create app
2. Webhook URL: `https://<domain>/api/paypal/webhook`
3. Event: `PAYMENT.CAPTURE.COMPLETED`
4. Set `PAYPAL_WEBHOOK_ID` in Netlify

See [PAYMENTS.md](./PAYMENTS.md) for full flow.

---

## 4. DNS cutover (web only — keep email on cPanel)

1. **Do not change MX records**
2. Point apex + `www` A/CNAME to Netlify
3. Import Yoast 301 redirects into `public/_redirects` before go-live
4. Current scaffold only redirects `/wp-admin/*` and `/wp-login.php`

---

## 5. Post-deploy smoke test

| Check | URL / action |
|-------|----------------|
| Home | `/` → 200 |
| Tours | `/tours` → 15 tours |
| Tour booking | `/tours/blue-cave-hvar-5-islands#book` → quote updates |
| Contact | Submit form → 200 API |
| PayPal off | Booking shows contact fallback |
| PayPal on | Full checkout sandbox |
| Email | Booking + contact emails arrive |
| Supabase | Row in `reservations` after test payment |

---

## 6. Security notes

- API routes return `Cache-Control: no-store`
- Security headers in `netlify.toml` (HSTS, nosniff, etc.)
- Rate limiting is **best-effort** per serverless instance — enable [Netlify rate limiting](https://docs.netlify.com/security/secure-access-to-sites/rate-limiting/) for production traffic
- Secrets only in Netlify env, never in git

---

## 7. Known limitations (acceptable for v1)

| Item | Status |
|------|--------|
| Multi-locale URLs (`/en/`) | Deferred — site ships in Croatian |
| Pricing | Catalog “from” prices (G2 rules TBD) |
| Capacity / overbooking | Not handled — ops confirms offline |
| Yoast full redirect map | Paste before cutover |
| Tour copy in 5 languages | Phase 2 content work |
| Teya client redirect | Wired — customer selects card when both providers configured |

---

## Rollback

1. Revert DNS to cPanel (WordPress still there until decommissioned)
2. MX unchanged throughout — email unaffected
