# Private charter booking: request → quote → pay (mock)

Branch `feat/private-charter` off `main` f6f9759. Uncommitted until asked.

Follows the implementation spec §8.2 (D-7: a request, not a payment on the page)
and the 20 Oct handoff for board 06 (route list and order, ages-only guest
counters). Payments stay the demo checkout; no Teya, no fiscalization.

## Flow

1. **Customer** opens "Plan a private experience" on any tour (or the Perfect Day
   card, footer, homepage) → `/private-charter/?tour=<slug>`.
2. Picks a route (the five tours + "Your own route"), date, preferred departure
   time, duration, guests, special requests, contact details → **Send request**.
3. `POST /api/charter-request` stores an `Enquiry` with `kind: 'charter'` and the
   structured charter fields, and emails the admin (capped, as contact messages
   are). No customer auto-reply (D-22). The page shows "Request received".
4. **Boss** sees it in Admin → Enquiries with the charter details and a
   **Send quote** form: price (€), departure time, valid for (days), note.
5. Sending the quote creates a `Booking` (`kind: 'private'`, unpaid, the quoted
   total, one line item) linked to the enquiry, and emails the customer a quote
   with a **Pay now** link to the existing demo pay page. The email lands in the
   outbox like every other email.
6. **Customer** pays on `/booking/pay/` → the same finalize step as group
   bookings: demo račun, confirmation email (private wording), admin email,
   booking shows as paid.
7. Admin bookings, dashboard and departure cards show it as its own private
   boat, never mixed into a group departure's seat count.

## Work items

| # | Item | Files |
|---|------|-------|
| 1 | Charter config: routes (handoff order + custom), durations (placeholder until D-8), guest cap, default time | `src/config/charter.ts` |
| 2 | Data: `Enquiry.charter` fields + `quoteBookingId`; `Booking.kind`, `enquiryId`, `quoteExpiresAt`; outbox kind `charter_quote` | `store.ts` |
| 3 | Validation for charter requests and quotes (+ unit tests) | `src/lib/charter.ts` |
| 4 | API `POST /api/charter-request`: JSON + plain form, body cap, rate limit failing closed, honeypot, time check, Turnstile when configured | `src/pages/api/charter-request.ts` |
| 5 | Public page + island + no-JS form + sent/problem pages | `src/pages/private-charter/*`, `CharterRequest.vue` |
| 6 | `charterUrl()` → `/private-charter/`; `/book/:slug/private` redirect; noindex prefixes | `routes.ts`, `_redirects`, `noindex.ts` |
| 7 | Quote service: create quote booking, email, expiry in `isPayable` | `service.ts` |
| 8 | Emails: admin charter request, customer quote, private wording in confirmation | `templates.ts` |
| 9 | Admin: charter block + Send quote on Enquiries; private badge in bookings list/detail; separate departure key in manifest; email kind label | `admin/*` |
| 10 | Pay/success pages: private wording, expired quote message | `booking/pay.astro`, `success.astro` |
| 11 | Demo data: one new charter request, one quoted (unpaid), one paid private booking | `sample-data.ts` |
| 12 | Tests: unit (validation, service, API, templates, manifest), e2e (request → quote → pay → admin) | `src/lib/*.test.ts`, `tests/e2e/charter.spec.ts` |

## Validation (subagent fleet, after the build)

- Code review of the diff (correctness, security of the new endpoint and admin action).
- Customer walk in Chromium, WebKit, Firefox, with and without JavaScript, phone and desktop widths.
- Admin walk: request arrives → quote → outbox → pay → booking/dashboard.
- Accessibility (axe) on the new pages.
- `pnpm check`, `pnpm test`, `pnpm build`, e2e suite. Email sending off (`RESEND_API_KEY=`).

## Open for the owner (not blocking the mock)

- **Prices:** no charter price table, so the page says "We'll send you a quote" (D-8).
- **Durations and extras:** placeholder durations, no extras card (spec: hidden without data).
- **Deposit:** the legal page says 30% deposit; the mock quote asks for the full amount. Decide deposit vs full (C-15).
- **Turnstile** must be on before go-live (spec S-6); the mock follows the contact form (enforced only when keys are set).
- **Availability:** a quote doesn't block the boat; the boss checks before quoting.

## Validation (21 Oct) and what changed because of it

Four agents checked the build: a code review, a customer walk, an admin walk and a full regression run. Fixed afterwards:

- **Re-quote order:** the old quote is withdrawn first (stops if it was paid meanwhile), then the new one is saved, then the request is claimed; a lost claim deletes its orphan. Nobody can pay twice.
- **Global cap** (30/hour) counts only requests that passed every check, so junk can't use it up. `CHARTER_HOURLY_CAP` lifts it for Playwright only.
- **Retention:** a charter request's special requests are removed 30 days after the trip, like booking notes.
- **Admin:** replaced, withdrawn and expired quotes are left out of the day's boats, the dashboard and the bookings list (shown under "Cancelled" or a search). A private boat's capacity is its own party, so "seats free" isn't inflated, and its card says "Whole boat" instead of a seat bar. Booking detail links back to the request and shows the pay link while the quote is open. A replacing quote says so in its subject and text.
- **Customer:** the Blue Lagoon afternoon suggests its own 14:30 time; route cards no longer state a length that disagrees with the default; "usually the same day" everywhere; durations from 1 hour; last-name errors under Last name; Safari's duration select gets the field height; no "free" infants or "per departure" wording on a private boat; the no-JS problem page points to the browser's Back button and lists phone/email format.
- **Pay/error pages:** the demo "decline" button needs no terms; the decline page has charter wording.
- **Tests:** `home.spec.ts` expects the new charter link; the a11y routes include the charter pages; admin enquiries visual baselines updated (local, git-ignored) since the page intentionally changed. Demo charters sit outside the first week's strip so the frozen dashboard look holds.

Not changed, on purpose:
- The pay link uses the address the admin is on, not PUBLIC_SITE_URL: each deploy keeps its own bookings, so a preview's quote must be paid on that preview.
- The calendar's keyboard model (every day a Tab stop, no arrow keys) is the shared group-booking calendar; worth its own fix.
- Without JavaScript `?tour=` can't preselect a route (static page).
- Known flaky on main too: `tours.spec.ts` focus-under-header (chromium) and the legal TOC test (firefox).

## Second review round (21 Oct, evening)

A fresh code review, a code-quality review and a hands-on functionality check, after the fixes above. Fixed:

- **Blue Lagoon afternoon really suggests 14:30 now:** the first fix was overwritten by the route watcher on load. The e2e test now asserts the suggested time for both Blue Lagoon tours.
- **Rate limits are per deploy context** (`scopedName('rate-limits')`): deploy previews and test runs no longer count against production's limits. This was true before this branch for every limit, including the admin login. `CHARTER_HOURLY_CAP` is ignored in production.
- **Quote:** staff choose the duration (it can differ from what was asked; it is what's sold). Reply-to on the quote email is the site address, so "just reply" reaches us before `EMAIL_FROM` is set. The email no longer states availability as a fact the system checked.
- **Pay page:** a paid charter that was later cancelled says "This charter was cancelled", not "replaced".
- **Retention:** a charter request's phone goes 90 days after the trip, like a booking's.
- **Demo data:** the quoted demo charter stays valid 3 days from loading, so a demo the next day still works.
- **Smaller:** "on the boat" in the guest cap message; `?done=` flash lookup with `Object.hasOwn`; shared `PHONE_RE`, `EMAIL_RE`, time pattern and charter constants instead of copies; charter rows rendered by one helper; no position-based row edits in the admin email; an unused helper removed; more unit tests (season, start time, notes kept whole, too-fast, Turnstile, storage failure, quote duration, phone retention).

Not changed, on purpose:
- A refunded charter can't be re-quoted from the same request; the customer sends a new request (keeps one request = one sale).
- The Blue Cave ticket line still shows on charters of that route: the ticket applies to private visits too.
- The re-quote form doesn't carry over the previous note (staff write what's new).
- Page-level CSS for the sent/problem pages and the island's `.flow` cards follows the house pattern of scoped copies (as GroupBookingFlow and the contact pages do); a shared component would be its own refactor.
- The focused primary button's contrast (4.11:1 on hover blue) and the shared calendar's keyboard model are site-wide, not charter issues.
