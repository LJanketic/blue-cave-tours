# ClickUp follow-up, 8 Nov 2026: private booking on every tour

Source: Mare, 8 Nov 2026, 15:08. Golden Horn "Private experience" ended in
"Send request". It should be the same flow as Blue Cave (pay now). Her answers
to the open questions:

1. and 2. Every private tour is "od 1200" (€1,200) for now. Change it when Vedro
   confirms the price list.
3. Red Rocks and Dubrovnik need payment too.
4. Latest private departure: 11:00 for now (Vedro hasn't confirmed it).
5. Create Your Perfect Day stays a request.

## What changed

| Area | Before | Now |
| --- | --- | --- |
| `src/config/private.ts` | Blue Cave only, €1,500 / €2,000, no latest departure | All 6 fixed-route tours at €1,200 in both seasons, latest departure 11:00 |
| Blue Lagoon afternoon | Quote request | Pays now at its own 14:30. It leaves after 11:00, so it gets no later times |
| Red Rocks, Dubrovnik | `departures: []`, free time 06:00–20:00, quote request | Fixed start 09:00 / 08:00 (their "typically" time), steps up to 11:00, pay now |
| Tour page and cards, private-only tours | "On request" | "From €1,200 / boat" (as on Ivan's AFTER boards), via `privateOnlyFromPrice` |
| "Private experience" button, group tours | €1,500 on Blue Cave, no price on the rest | €1,200 on all |
| FAQ pricing answer | "A private Blue Cave boat is €1,500 … or €2,000 …; others quoted" | "A private boat is €1,200 on every fixed-route tour, in any season; Create Your Perfect Day is quoted on request." |
| "Other pickup location" | A request on Blue Cave | A request on every tour (unchanged logic) |

The quote-only mode stays in the code (`quoteOnly`). It is unused now, and a
tour falls back to it if it is removed from `PRIVATE_TOURS`.

## Still open (for Vedro / Mare)

- The real price list per tour and season. €1,200 is a placeholder, and it is
  one line per tour in `src/config/private.ts`.
- Latest departures per tour. 11:00 is a placeholder; the Blue Lagoon afternoon
  has none.
- Deposit (30%) or full payment for private bookings ("FAQs update Issues").
  The site charges the full amount, as Blue Cave already did.

## Also in this PR (Mare's ClickUp comments, 8 Nov 2026, 15:09–15:33)

- "Booking confirmation screen": arrive by 07:20 only on Blue Cave (`arriveOnTime`
  on its departure); every other tour gets its check-in, or 15 minutes before.
- The confirmation page's "Total paid", and the admin booking list and detail,
  print amounts as "€1,200" (`formatEuro`) instead of "€1200".

## Not in this PR: Mare's other 8 Nov comments (next batch)

- "Group booking review": the review page doesn't match the design ("Price
  breakdown" card, short cancellation box, "Secure payment handled by Teya").
- "Booking confirmation screen": the rest of the layout, per Ivan's board.
- "Extras for private": stack them one under another.
- "Pick up point za private": a dropdown, not a radio list.
- "Blue Lagoon vrijeme polaska": one Blue Lagoon booking with a choice between
  09:30 Morning (back 14:00) and 14:30 Afternoon (back 19:00). The site has two
  tours, so this needs a decision first.
- "Choose payment method" is Ivan's (In Design): Mare asks if that screen is intended.

## Checks

- `pnpm check`: 0 errors. Unit tests: 537 passed (new `src/lib/clickup-2026-11-08.test.ts`).
- Build with `PUBLIC_SITE_URL`: passes.
- Lighthouse (mobile, built static pages served locally): `/` 98/100/100/100,
  `/tours/` 91/100/100/100, Red Rocks 95/100/100/100, Golden Horn 96/100/100/100
  (performance/accessibility/best practices/SEO).
- Console: no errors or warnings on `/`, `/tours/`, two tour pages, `/faq/`,
  two full private bookings (Golden Horn at 10:15, Blue Cave at 07:20) through
  the demo payment to the confirmation page, and the admin bookings list.
