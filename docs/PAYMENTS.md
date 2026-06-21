# Payments — PayPal & Teya integration guide

Blue Cave Tours supports three payment modes:

| Mode | When active | Customer flow |
|------|-------------|---------------|
| **demo** | No payment creds, or `PAYMENT_PROVIDER=demo` | Booking form → contact prefill |
| **paypal** | `PAYPAL_*` env set | Customer chooses PayPal (or PayPal if Teya not configured) |
| **teya** | `TEYA_*` env set | Customer chooses card/Teya (or Teya if PayPal not configured) |
| **both** | PayPal + Teya creds set | Customer picks **PayPal** or **Pay with card** on the booking form |

Set `PAYMENT_PROVIDER=demo` to force contact-only booking even when creds exist (useful for staging).

---

## Architecture

```
BookingForm (client)
    │
    ├─ demo ──────────────► /contact?prefill
    │
    ├─ POST /api/paypal/create-order
    │       └─ PayPal Orders v2 (intent: CAPTURE)
    │       └─ insert reservations (payment_provider=paypal)
    │       └─ client: PayPal Buttons → onApprove
    │       └─ POST /api/paypal/capture-order
    │               └─ finalizePaidReservation() → DB paid + emails
    │       └─ POST /api/paypal/webhook (backup)
    │               └─ PAYMENT.CAPTURE.COMPLETED only
    │
    └─ POST /api/teya/create-session
            └─ Teya POST /v2/checkout/sessions
            └─ insert reservations (payment_provider=teya)
            └─ redirect to session_url
            └─ return → POST /api/teya/confirm-session
                    └─ GET session → payment_status=SUCCESS
                    └─ finalizePaidReservation()
```

Shared finalization: `src/lib/payments/finalize.ts` — idempotent mark-paid + confirmation emails.

---

## PayPal setup

**Docs:** [Orders v2](https://developer.paypal.com/docs/api/orders/v2/) · [Webhooks](https://developer.paypal.com/docs/api/webhooks/v1/) · [Verify signature](https://developer.paypal.com/api/rest/webhooks/rest/)

### 1. Developer Dashboard

1. Create app at [developer.paypal.com](https://developer.paypal.com/dashboard/)
2. Copy **Client ID** + **Secret** (sandbox first)
3. Create **Webhook** pointing to `https://<your-domain>/api/paypal/webhook`
4. Subscribe to: `PAYMENT.CAPTURE.COMPLETED` (required)
5. Copy **Webhook ID** → `PAYPAL_WEBHOOK_ID`

### 2. Environment variables

```env
PUBLIC_SITE_URL=https://bluecavetours.com
PUBLIC_PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox          # or live
PAYPAL_WEBHOOK_ID=...        # required in production
# Configure TEYA_* as well if offering card checkout alongside PayPal
```

### 3. Flow details

- **Create order:** server computes quote (`computeQuote`), creates PayPal order, saves `reservations` row
- **Capture:** client calls `/api/paypal/capture-order` after buyer approves
- **Webhook:** backup path; only processes verified events with `PAYMENT.CAPTURE.COMPLETED`
- **Amounts:** decimal strings in EUR (e.g. `"159.00"`)
- **ACDC / guest card:** PayPal Advanced Credit and Debit Card — test in sandbox for Croatia; if guest cards fail, use Teya (G1)

### 4. Sandbox testing

1. Use sandbox buyer account from PayPal dashboard
2. `pnpm dev` with sandbox creds in `.env`
3. Complete booking on a tour page → PayPal popup → approve
4. Check Supabase `reservations.status = paid`
5. Test webhook with [PayPal webhook simulator](https://developer.paypal.com/dashboard/) or ngrok locally

### 5. Production checklist

- [ ] `PAYPAL_MODE=live`
- [ ] `PAYPAL_WEBHOOK_ID` set (webhook rejects all events if missing)
- [ ] `PUBLIC_SITE_URL` matches live domain (return/cancel URLs)
- [ ] Supabase migration `001_reservations.sql` + `002_payment_providers.sql` applied
- [ ] SMTP configured for confirmation emails
- [ ] Run full checkout E2E before DNS cutover

---

## Teya setup

**Docs:** [Teya Developer Portal](https://docs.teya.com/) · [Hosted Checkout](https://www.teya.com/online-payments/hosted-checkout)

### 1. Account prerequisites

- Existing Teya merchant account (stakeholder already uses Teya POS)
- **Online Payments** subscription — contact Teya support to activate (may require 6+ months account history)
- API credentials from Business Portal → store → Integrations

### 2. Environment variables

```env
TEYA_CLIENT_ID=...
TEYA_CLIENT_SECRET=...
TEYA_MODE=sandbox          # api.teya.xyz + id.teya.xyz
                           # live: api.teya.com + id.teya.com
TEYA_STORE_ID=...          # optional, for future embedded card flow
# Both PAYPAL_* and TEYA_* can be set — customer chooses at checkout
```

### 3. API endpoints (implemented in `src/lib/teya.ts`)

| Action | Method | URL |
|--------|--------|-----|
| OAuth token | POST | `{id.teya}/oauth/v2/oauth-token` |
| Create session | POST | `{api.teya}/v2/checkout/sessions` |
| Get session | GET | `{api.teya}/v2/checkout/sessions/{id}` |

**Scopes:** `checkout/sessions/create`, `checkout/sessions/id/get`

**Amount format:** minor units — €159.00 → `15900` (unlike PayPal decimal strings)

### 4. Flow details

1. `POST /api/teya/create-session` — same booking payload as PayPal
2. Response: `{ sessionId, redirectUrl }` — redirect customer to `redirectUrl`
3. Customer pays on Teya Hosted Checkout (cards, Apple Pay, Google Pay, 3DS)
4. Teya redirects to `success_url` / `failure_url`
5. Client or success page calls `POST /api/teya/confirm-session` with `sessionId`
6. Server polls `payment_status`; on `SUCCESS` → `finalizePaidReservation()`

### 5. When to use Teya vs PayPal

| Criteria | PayPal | Teya |
|----------|--------|------|
| Stakeholder already has account | Maybe | **Yes (POS)** |
| Guest card without PayPal account | ACDC — test first | Hosted Checkout |
| Croatia / local cards | Test in sandbox | Native EU acquirer |
| Implementation status | **Ready to wire creds** | **API skeleton ready** |
| Client UI | Embedded PayPal buttons | Redirect (simpler PCI) |

**Decision gate G1:** Run PayPal sandbox with guest card first. If Croatian cards fail without PayPal login → switch `PAYMENT_PROVIDER=teya`.

### 6. Teya staging testing

1. Get sandbox creds from [business.teya.xyz](https://business.teya.xyz)
2. Set `TEYA_MODE=sandbox` in `.env`
3. `POST /api/teya/create-session` via booking form (client wiring TBD)
4. Complete payment on Teya hosted page
5. Confirm session → check DB + emails

### 7. Still TODO for Teya (client-side)

- [ ] `booking-form.ts` — branch on `PAYMENT_PROVIDER=teya` → create-session → `window.location = redirectUrl`
- [ ] `booking/success.astro` — read `?sessionId=` and call confirm-session
- [ ] Teya webhooks (if available on account) as backup to polling
- [ ] Pay-by-link flow for phone bookings (`Teya.PayByLink` — optional)

---

## Database

Run in Supabase SQL editor (EU Frankfurt):

1. `supabase/migrations/001_reservations.sql`
2. `supabase/migrations/002_payment_providers.sql`

Key columns:

| Column | PayPal | Teya |
|--------|--------|------|
| `order_id` | PayPal order ID | Teya session ID |
| `payment_provider` | `paypal` | `teya` |
| `paypal_capture_id` | capture ID | — |
| `teya_session_id` | — | session ID |
| `teya_transaction_id` | — | future: transaction ID from session |

---

## Security notes (from QA review)

| Issue | Status |
|-------|--------|
| Webhook without verification | **Fixed** — rejects if `PAYPAL_WEBHOOK_ID` unset |
| `CHECKOUT.ORDER.APPROVED` → paid | **Fixed** — only `PAYMENT.CAPTURE.COMPLETED` |
| Webhook without emails | **Fixed** — uses `finalizePaidReservation()` |
| DB insert failure still returns order | **Fixed** — returns 503 |
| Past date on create-order | **Fixed** |
| In-memory rate limit on Netlify | **Open** — upgrade to Netlify Blobs / Upstash before high traffic |
| `/booking/success` unverified | **Open** — cosmetic; does not mark paid |
| i18n footer links | **Open** — Phase 2 |

---

## What you need to provide

| For | Variables |
|-----|-----------|
| PayPal sandbox test | `PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE=sandbox` |
| PayPal production | above + `PAYPAL_WEBHOOK_ID`, `PAYPAL_MODE=live` |
| Teya test | `TEYA_CLIENT_ID`, `TEYA_CLIENT_SECRET`, `TEYA_MODE=sandbox` |
| Teya production | above + `TEYA_MODE=live`, Online Payments activated |
| Both | `SUPABASE_*`, `SMTP_*`, `PUBLIC_SITE_URL` |

Never commit `.env` or paste secrets in chat.
