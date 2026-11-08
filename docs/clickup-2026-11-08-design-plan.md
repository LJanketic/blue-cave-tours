# ClickUp 8 Nov 2026 (second batch): booking flow to Ivan's design

Source: Mare's ClickUp comments of 8 Nov 2026, 15:21–15:33, and Ivan's
"Booking flow" boards (04a–08b) on the design board, read the same day.
Branch `fix/clickup-2026-11-08-design`, cut from `fix/clickup-2026-11-08`
(PR for the private €1,200 change, not merged yet).

## Mare's comments → what changed

| ClickUp task | Mare | Board | Change |
| --- | --- | --- | --- |
| Blue Lagoon vrijeme polaska | "I can't choose the departure time at all. It should look like this" | 04b | Both Blue Lagoon booking pages show "09:30 · Morning / Back in Split at 14:00" and "14:30 · Afternoon / Back in Split at 19:00". The booking goes to the tour of the time picked. **The two tours stay separate** (Luka, 8 Nov): own pages, prices, capacity. Config: `src/config/departure-choices.ts` |
| Group booking review | "This part isn't per design, it should be" | 06a | Guests as rows (Adults 2 × €149), "Special requests: Yes" plus the quote, "Price breakdown" with no season line, "Total" and "Includes all taxes and fees · …", the short cancellation box with **48 hours**, departure as "07:20 (back 18:00)" |
| Booking confirmation screen | "Not per design either"; arrive by 07:20 only on Blue Cave, 15 min before on all others | 07 | "Arrive by 07:05 (15 min early)" (Blue Cave: 07:20), "Captain" field, "View meeting point on map", the 3 "What happens next" cards, departure as "07:20 — Riva promenade…", no Duration / Paid with / Invoice rows (the invoice number is in the email) |
| Extras for private | One under another | 05 | Single column; icon, name, description, price, checkbox on the right; "Add extras — optional" |
| Pick up point za private | Should be a dropdown | 05 | Native `<select>` with each point and its fee ("Zenta Marina, Split · +€30"); the note under it says what it costs ("Meeting point included in the price.") |

## Deliberately not like the board

- **"Secure payment handled by Teya"** (06a) shows only once real payments are on
  (`PAYMENTS_ARE_DEMO` false). While the site is a demo nothing goes to Teya, and
  the checkout strip says "Demo checkout: no money is taken" instead.
- **The pre-contract paragraph** above "Continue to payment" (no 14-day withdrawal,
  "By continuing you agree to our Terms", privacy link) stays on the review page.
  It's not on the board, but it's the legal notice and the terms acceptance.
- **Private review** (06b) keeps its own cancellation link: the private terms
  (deposit vs full payment) are still open.
- Board 05's order (pick-up before guests) and its "Snorkelling gear" extra
  (Mare removed it on 6 Nov) are not followed. Mare asked for the layout of
  the two controls only.
- Without JavaScript, a Blue Lagoon page books its own time and links to the
  other one.

## Checks

See the PR description.
