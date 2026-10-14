# 03 — Design: booking and payment flows vs current implementation

Scope: redesign artboards 05 GroupBooking, 06 PrivateBooking, 07 BookingSummary, 08 PaymentSuccess, 09 PaymentError, plus the booking entry points in 03 TourDetail and 01 Homepage v4 (`Main-n19w-fhxd-j4z6.dc.html`).
Compared against branch `feat/email-map-link-overbooking` @ 882dbc3 (clean tree). Read-only research; nothing in the repo was changed.

Design source: `…/artifact-files/04d03f8c-…/project/*.dc.html` + `hbc.css`. These are prototypes: one artboard per screen, linked by `<a href>`. Each artboard keeps its own `state`, so **no data flows between screens**. 07, 08 and 09 are fully static mock content.

---

## 0. TL;DR

1. **The redesign of 05–09 is mostly the old `new-pages-design/05–09` drafts, rebranded** ("Adriatic Sails" → "Hello Blue Cave", "Stripe" → "Teya", 06 lost its boat picker). The current Astro/Vue flow was already built from those drafts, so for the **group flow this is mostly a restyle**. The visual tokens come from `hbc.css`.
2. **The design has no Payment screen.** Step 4 "Payment" exists in the step bar, but 07's "Continue to payment" links straight to 08 Success. There is no Teya/PayPal choice anywhere in the flow. The current `/booking/pay/` demo page (Card via Teya / PayPal radios + demo outcomes) must **stay**. Restyle it to the design language.
3. **The private charter (06) is the big new piece.** It is a full configurator: route, date, time, duration, guests, extras and a computed "Total". Today private charters go to `/contact/?tour=…` (free-text enquiry, "On request" price). The design implies instant pay for a charter whose availability "we'll confirm after booking". That breaks the plan (quote → Teya Pay-by-Link) and the design's own FAQ/Legal (30% deposit). **Recommendation:** build 06 as a **structured quote request** with an *estimate*, not a payable total.
4. **Hold timers are fiction today:** "Your spots are held for 12 minutes…" (05) and "still held for 8 minutes" (09). There are no seat holds; the server doesn't even check capacity. ⚠️ **The current `GroupBookingFlow.vue:383-386` already shows the false 12-minute hold claim.** Remove it now, independent of the redesign.
5. Other legal/safety flags: "Includes all taxes and fees" vs the cave ticket paid in cash on site. Health data is solicited in "Special requests" with no privacy notice. No terms/privacy acceptance before payment. PII still travels in the URL from step 2 to step 3 (GET query). "Children under 3 travel free" has no infant counter, so the passenger count is unsafe for capacity. Placeholder content isn't Split-accurate: "Marina Pier B, Gate 3", "Captain Marko", Elafiti islands (a Dubrovnik archipelago), €95/€55 and 09:00/18:00 slots.

---

## 1. How the .dc.html prototypes behave (relevant bits)

- `{{ }}` holes are bound to `renderVals()`; handlers via `onClick="{{ fn }}"`; `<sc-if>` and `<sc-for>` for control flow.
- Links between artboards (`href="BookingSummary.dc.html"`) are plain navigation in Play. **No validation gates them**: every CTA works with empty fields.
- All prices and rules live in each artboard's client JS. These are prototype constants, not data.
- Shared chrome in `hbc.css`:
  - `.mini-nav`: logo only, **no Exit link** in the design. The current `MiniNav` has `exitHref`/"Exit". Keep it.
  - `.step-bar`, `.trust-strip`.
  - `--flow-width: 628px` (current group page is `max-width: 560px`).
  - Global inputs: `outline: none` with only a border-color change on focus. This is an a11y regression (see §9).

---

## 2. Flow state machine

### 2a. As drawn in the design (prototype links)

```
Homepage (01)
 ├─ hero "Browse group tours" ───────────────► Tours (02) ─► TourDetail (03)
 ├─ hero "Plan a private charter" ───────────► PrivateBooking (06)
 ├─ hero "See the Blue Cave tour" ───────────► TourDetail (03)
 ├─ search band [Group|Private|Transfer]
 │     Group  → "Search tours"     ──────────► Tours (02)          (where/when NOT passed)
 │     Private→ "Plan my charter"  ──────────► PrivateBooking (06) (where/when NOT passed)
 │     Transfer→"Find a transfer"  ──────────► Contact (14)
 ├─ type cards / CTA band / footer ──────────► Tours (02) | PrivateBooking (06)
 └─ popular tour cards "View tour" ──────────► TourDetail (03)

TourDetail (03) sidebar / mobile bar
 ├─ "Book group tour" ───────────────────────► GroupBooking (05)
 └─ "Book as private charter" ───────────────► PrivateBooking (06)

GroupBooking (05)  [step 2 "Date & guests"]
 ├─ "Review booking" (always enabled) ───────► BookingSummary (07)
 └─ "← Back to tour type" ───────────────────► TourDetail (03)
PrivateBooking (06) [step 2 "Customise"]
 ├─ "Review booking" (always enabled) ───────► BookingSummary (07)
 └─ "← Back to tour type" ───────────────────► TourDetail (03)

BookingSummary (07) [step 3 "Review"]  (static; mixes private badge + per-person prices + extras)
 ├─ Edit (Tour details, Guests & extras) ────► PrivateBooking (06)
 ├─ Edit (Guest details) ────────────────────► GroupBooking (05)
 └─ "Continue to payment" ───────────────────► PaymentSuccess (08)   ← no step-4 screen

PaymentSuccess (08): "Browse more tours" ► Tours (02)
PaymentError (09):   "Try payment again" ► BookingSummary (07); "Back to tours" ► Tours (02); "Contact us" ► Contact (14)
                     (nothing in the design ever links TO 09)
```

### 2b. Current implementation (demo showcase)

```
/tours/[slug]/ (TourDetailView)
  instant-book tour  → "Book group tour"   → /book/[slug]/group/   (prerendered, Vue GroupBookingFlow)
  quote-only tour    → "Enquire now"       → /contact/?tour=slug
  group+private tour → "Enquire about a private charter" → /contact/?tour=slug
Homepage "Plan a private charter" → /contact/?tour=create-perfect-day-private

/book/[slug]/group/  ──GET with ALL fields in query (incl. name/email/phone/notes)──► /book/[slug]/review/
/book/[slug]/review/ (SSR; recomputes total; redirects back if required fields missing)
   └─ POST form → /api/bookings
         ├─ invalid → 303 /book/[slug]/review/?…&error=<code>   (role=alert message + "Edit")
         ├─ exception → 303 /booking/error/?tourId=slug          ("We couldn't save your booking")
         └─ ok → Booking{status: pending_payment, paymentStatus: unpaid} → 303 /booking/pay/?id=<uuid>
/booking/pay/?id  (DEMO: radios Card(Teya)/PayPal; buttons "Pay €X" | "Demo: simulate a declined payment")
   ├─ already paid → 303 /booking/success/?id
   ├─ not payable (cancelled/refunded/past) → "closed" notice + contact + Browse tours
   ├─ POST success → finalizePaidBooking (paid → confirmed → demo račun → customer + admin email, idempotent) → /booking/success/?id
   └─ POST decline → recordFailedPayment (paymentStatus=failed) → /booking/error/?id
/booking/error/?id → "Try payment again" → /booking/pay/?id  (pay page shows "last attempt declined")
/booking/success/?id → only if paid & not cancelled, else → /booking/pay/?id
```

### 2c. Target state machine (design mapped onto showcase → real)

```
Group (instant book):
  DRAFT(client) ─Review─► REVIEW(server-rendered from a server draft, no PII in URL)
     ─Continue to payment(POST)─► PENDING_PAYMENT [demo: no hold | real: HELD until hold_expires_at]
     ─► PAY (demo page | Teya Hosted Checkout redirect | PayPal button)
          ├─ success (webhook/return check) ─► CONFIRMED+PAID ─► račun ─► emails ─► SUCCESS(08)
          ├─ declined/cancelled ─► PAYMENT_FAILED ─► ERROR(09) ─retry─► PAY
          └─ hold expired (real only) ─► EXPIRED ─► ERROR(09, variant "hold expired, pick again")
Private (quote):
  CONFIGURE(06) ─► REVIEW REQUEST(07-private variant) ─Send request(POST)─► ENQUIRY{type: charter_request, status: new}
     ─► "Request received" page (NEW, 08 variant: no "You're booked!", no "Total paid")
     ─► admin quotes ─► Teya Pay-by-Link (deposit 30% or full per D7) ─► PAID ─► same confirmation + račun + admin mail
```

---

## 3. Entry points

### 3a. Homepage v4 (`Main-n19w-fhxd-j4z6.dc.html`)

| Element | Copy / behaviour | Target |
|---|---|---|
| Hero carousel, 3 panels (auto-rotate prop) | "Escape in style & comfort" → **Browse group tours**; "All aboard, mateys!" → **Plan a private charter**; "Hello Blue cave Croatia" → **See the Blue Cave tour** | Tours / PrivateBooking / TourDetail |
| Trust band (marquee) | ★ 4.9 from 800+ reviews · Free cancellation up to 48h · Max 12 guests per departure · 10 years on the water | – |
| **Search band** `form role="search"` | Toggle (aria-pressed buttons) **Group / Private / Transfer**. Title per mode: "Find your day on the water" / "Your privacy & your pace" / "Skip the wait, go by boat". Fields: **Where** (native `<select>`: Anywhere, Blue Cave Biševo, Hvar Island, Blue Lagoon, Dubrovnik, Brač Island, Vis Island) in Group/Private; **From/To** (Split, Split Airport, Trogir, Hvar Town, Bol Brač, Vis, Komiža) in Transfer; **When** (native `type=date`, shows "Any date" or "Tue 14 Oct", calls `showPicker()` on click). Button label: "Search tours" / "Plan my charter" / "Find a transfer". Note: "Public tour — shared with up to 12 guests" / "Fully private — the whole boat is yours" / "Private transfer — dock to dock, your time". State has `guests: 2` but **no guests field is rendered**. | Group → Tours; Private → PrivateBooking; Transfer → Contact. **The href is static, so where/when are dropped.** |
| Popular tours slider | price "From €X" + per; "View tour" | TourDetail |
| "Group or private?" cards | Group: "From €45 per person", "Fixed departures, daily" → Browse group tours. Private: "From €280 for the boat", "Flexible departure time" → Plan a private charter | Tours / PrivateBooking |
| How it works | 2 "Check **live availability**…"; 3 "Pay online via secure checkout. **Instant confirmation** to your inbox." | – |
| CTA band | "Tours depart daily. Most sell out 3–5 days ahead in summer — book early." Browse all tours / Plan a private charter | Tours / PrivateBooking |

Implications:
- **New:** search band → `/tours/?dest=…&date=…` (group) and private configurator prefill (`?date=&route=`). Transfer is a **new product**; not in `tour-catalog.ts`, so map it to a contact enquiry with from/to/date.
- "From €45 per person" doesn't match the data (cheapest €75 peak / €65 low). "From €280 for the boat" doesn't match either (private = "On request"). **Prices must come from catalog data, not copy.**
- "Live availability" and "sell out 3–5 days ahead" are unsupported claims (misleading-practice risk under EU UCPD). Soften them or back them with data.
- Current homepage: "Plan a private charter" → `/contact/?tour=create-perfect-day-private` (`src/pages/index.astro:209,244`).

### 3b. Tour detail booking widget (`TourDetail.dc.html`, `#td-book`)

- Sticky sidebar card (`position: sticky; top: 76px`; grid `1fr 322px`; spans the main column and reviews):
  - "From **€95** / adult"
  - "Children from €55" (baby-carriage icon)
  - "Next available: **Today, 18:00**"
  - CTAs: **Book group tour →** (GroupBooking) and **Book as private charter** (crown icon, PrivateBooking)
  - policy pill "Free cancellation up to 48h before"
- Hero tags: "Private available", "Group tour".
- "Good to know" says: *Additional fees: Cave ticket, paid in cash on site* (with a link). Min age / group size / accessibility rows are hidden (`hidden` + `display:none`).
- ≤768px:
  - single column; booking card after the main content and before reviews; "Book now" heading appears
  - **fixed bottom bar** "€95 / adult  [Book now]" hides itself via IntersectionObserver (threshold 0.15) when `#td-book` is visible
  - tapping scrolls smoothly to the card (`scroll-margin-bottom: 88px`; page bottom padding 72px)
- Current (`src/components/tour/TourDetailView.astro:203-252`) already has:
  - `sticky-card`, price row + `priceNotes`
  - "Next departure" (the `tour.departure` string) and "Season" rows
  - "Book group tour" or "Enquire now" (quote-only)
  - "**Enquire about a private charter**" → contact
  - policy pill and mobile book bar ("Book"/"Enquire")
- Gaps:
  - **"Next available: Today, 18:00"** needs a departures/availability source. Today there is only static copy. Keep "Next departure" from data until departures exist.
  - **Private CTA** → design's configurator (or quote form, §5).
  - The design's mobile bar is `div role="button"` wrapping an `<a>`: nested interactive controls, an a11y bug. Don't copy it; keep a single link/button.
  - Add the "hide bar when card is in view" behaviour if it isn't present (restyle).

---

## 4. 05 Group booking — exhaustive spec

Layout: `.page` max 628px centred, padding 24 (16 on ≤768). Order: mini-nav → step bar (✓ Tour type · **2 Date & guests** · 3 Review · 4 Payment) → tour snapshot → 3 cards → summary → CTAs → policy → trust strip.

| # | Element | Spec in design | Notes |
|---|---|---|---|
| 1 | Tour snapshot | 56px icon tile (sunset), name "Sunset Bay coastal cruise", tags: 3 hours · Marina Pier B · ★ 4.9 (128) | Rating has no data source in the current catalog. Meeting point must be `meetingPointShort()` (Riva stand 14). |
| 2 | **Calendar** card "Choose a date" / "Tours run daily. Select your preferred day." | Month header with ‹ › (`aria-label` Previous/Next month); grid Mo–Su (Monday start); cells are `<button>` with `aria-label="14 October 2026"`; past days `disabled` + tertiary colour; today outlined (info colour); selected = brand fill; **availability dot on every non-past day** (no real availability); prev-month nav not blocked (you can browse past months); no max horizon, no season limits (business runs 1 Apr–30 Nov). Initial: current month, no selection. | Current Vue is the same plus better a11y (`aria-pressed`, `aria-current="date"`, weekday in label, `aria-live` month) and a build-date hydration guard. **The dot must mean something**: driven by departures (open / few left / full / closed), or dropped. Use Split time (`businessDate`) for "today"; the plan notes the calendar uses visitor TZ. |
| 3 | **Departure time** (appears after a date is picked) "Choose a departure time" | Two radio-like buttons: **09:00 Morning departure** (sun icon) and **18:00 Sunset departure** (sunset icon); default 09:00, reset to 09:00 on every date change; the summary shows 09:00 even before a date is chosen | Current: a single slot parsed from `tour.departure` ("07:20"), or "Exact departure time confirmed at booking". Multi-slot needs **per-tour slot data** (`slots: [{time,label}]`) + server validation that `slot ∈ tour.slots`. Today `slot` is only regex-checked (`/^\d{2}:\d{2}$/`), so any time is accepted. |
| 4 | **Guests** card "How many guests?" / "Max 12 guests per departure. Children under 3 travel free." | Two steppers: **Adults** "Age 13+ · €95" (min 1), **Children** "Age 3–12 · €55" (min 0); combined cap 12; defaults 2/0; warning row "⚠ Maximum 12 guests per departure reached." when a+c ≥ 12; −/+ have aria-labels, **no disabled state at bounds**, no live announcement | Current: same mechanics, labels from data ("Age 18+ · €169", "Age 0–17 · €139"), `aria-disabled`, `role=status` summary. **Ages conflict with the data** (13+/3–12/under-3 free vs 18+/0–17). Business decision; the label must come from data. **No infant counter**: under-3s aren't counted, so a boat at 12 could carry 12 + infants (see §10 safety). |
| 5 | Hold note (under guests) | 🔒 "Your spots are held for 12 minutes once you proceed to review." | **False today** (no holds). Already present verbatim in `GroupBookingFlow.vue:383-386`. Remove now. Show only when real holds exist, with the duration from config (D10 says 20 min). |
| 6 | **Your details** card / "We'll send your confirmation and any updates here." | 2-col grid (1-col ≤768): First name (`gb-first`, text, ph "Ivan"), Last name ("Kovač"), Email (`type=email`, "ivan@example.com"), Phone (`type=tel`, "+385 91 234 5678"), Special requests (textarea, full width, ph "Allergies, accessibility needs, anything we should know…"). Uppercase micro labels. **No required markers, no autocomplete, no inline errors, no consent text.** | Current: same fields + `*` required for first/last/email, `autocomplete` tokens, `required`. Phone optional (the admin plan wants call/WhatsApp → consider making phone required, or "recommended"). |
| 7 | **Booking summary** (grey card) | Tour · Date ("— select a date" or "14 Oct 2026") · Departure · Guests ("2 adults, 1 child") · Adults (n × €95) · Children row only if >0 · **Total** · note "Includes all taxes and fees" | Current: same, but the note shows `tour.priceNotes` (season prices + "Final price confirmed at booking"). Price logic: `total = 95·a + 55·c` (design) vs `computeBookingTotal(fromPrice, priceNotes)` = always peak (D8 open). |
| 8 | CTAs | **Review booking →** (link, always active) · "← Back to tour type" · ✓ "Free cancellation up to 48h before departure" | Current gates the CTA (`aria-disabled` + hint "To continue, add a date, your first name…"). Keep the gating. |
| 9 | Trust strip | 🔒 Secure payment · 🎧 Need help? help@hellobluecave.com · Licensed maritime operator · Croatia | Current uses `SITE_EMAIL` = info@hellobluecave.com. Don't introduce a new help@ address without a real inbox. |

Responsive: ≤768 slots/guests/details become 1 column; calendar gap 2px; page padding 16. **No rule for the step bar.** Four labels plus lines at 360px will be cramped; the current app has the same markup, so check that before restyling.

---

## 5. 06 Private charter — exhaustive spec

Step bar: ✓ Tour type · **2 Customise** · 3 Review · 4 Payment. No tour snapshot (no tour context at all, so it's unclear which boat/tour is being chartered).

| # | Card | Fields / options | Logic |
|---|---|---|---|
| 1 | **Choose your route** / "Pick a suggested route or describe your own in special requests." | 4 `aria-pressed` buttons (2-col, 1-col ≤768): **Sunset coast** "Sea caves, old town walls, golden hour views"; **Elafiti islands** "Three car-free islands, swimming, village lunch"; **Blue Cave & Vis** "The full outer-island bucket list"; **Hidden coves** "Snorkelling and swimming stops only locals know". Default: index 0. | Route does **not** affect price. ⚠ Elafiti is the Dubrovnik archipelago and can't be done from Split. Routes must come from the catalog/destinations (e.g. Blue Cave + Hvar, Blue Lagoon/Šolta, Brač, Pakleni). |
| 2 | **When and how long** / "Private charters depart at any time — we'll confirm availability after booking." | 3-col grid (2 ≤768, 1 ≤480): **Date** `type=date` (no min/max, empty), **Departure time** `type=time` default 10:00, **Duration** `<select>` 2h / 3h / 4h / 6h / Full day (8h), default 3h | Date and time are **not in state and not in the summary**. |
| 3 | **Guests** / "Maximum 12 guests per charter." | Adults "Age 13+" (min 1), Children "Age 3–12" (min 0); cap 12; default 2/0; **no price per guest, no cap warning** | Guests don't affect price. The old draft had a boat choice (Karaka Classic 8 pax €280 / Dubrovnik Star 12 pax €420); it was removed, so the cap is fixed at 12. |
| 4 | **Add extras — optional** / "Per-booking add-ons — all prepared before you arrive." | Toggle buttons (`aria-pressed`, checkbox look): **Champagne welcome** +€40 · **Professional photo package** +€80 "edited gallery within 24h" · **Chef-prepared picnic lunch** +€65 · **Snorkelling gear** +€30 "for all guests" | Flat per booking regardless of guest count. Each is a new product needing a supplier and a price. |
| 5 | **Special requests** | textarea (`aria-label` only, no visible label), ph "e.g. It's our anniversary — can you have flowers on board?" | – |
| 6 | **Your charter** summary | Duration · Guests · Route · Charter base price · Extras (if >0) · **Total** · "Includes all taxes and fees" | `base = round(280 × mult[duration])`, `mult = {2:1, 3:1.2, 4:1.4, 6:1.7, 8:2.2}` → **€280 / €336 / €392 / €476 / €616**; `total = base + Σextras`. |
| 7 | CTAs | **Review booking →** (to 07), "← Back to tour type", ✓ "Free cancellation up to 48h before departure", trust strip | – |

**Missing in 06:** contact details (name/email/phone). 07 shows "Guest details" whose Edit link points to **GroupBooking**, so the private path has no place to enter them. There's also no tour/boat context, no date in the summary, and no validation.

**Conflicts:**
- "We'll confirm availability after booking" + "Total" + a pay CTA means taking money before availability is confirmed.
- Design FAQ: "Private charters require a **30% deposit**… balance 7 days before". Design Legal: "deposits are **non-refundable**" plus a 14/7-day tiered table. 06/07 instead say "**Free cancellation up to 48h**" and charge the full total. These can't all be true.
- Current `terms.astro` also says 30% deposit (plan D7).

**Recommendation (fits plan §2 "Private charters go through a different path"):**
- Build 06 as a **charter request form**. Keep the configurator UX (route, date, time, duration, guests, extras, requests), add contact fields, and show "**Estimated from €X**". Don't show "Total" or "Includes all taxes".
- Put the CTA "Send request" (or "Review request") on it.
- POST to the server, which stores a structured enquiry (`type: 'charter_request'`, fields below) and emails the admin (reuse `recordEnquiry` + `adminEnquiryEmail`, extended).
- Show a "Request received — we'll reply within X hours with a quote and payment link" page.
- Admin quotes → Teya Pay-by-Link (Phase 5) → same `finalizePaidBooking` path, with `type: 'private'`.
- In the showcase, an optional admin button "Mark quote accepted → create pending booking → /booking/pay/?id" can demo the end-to-end path without real money.

---

## 6. 07 Booking summary (Review) — spec

Static. Step bar: ✓ Tour type · ✓ Customise · **3 Review** · 4 Payment. Cards:

1. **Tour details** [Edit → 06]: thumb, "Sunset Bay coastal cruise", **"Private tour"** badge, Date "Sat, 12 Jul 2025", Departure 18:00, Duration 3 hours, Meeting point "Marina Pier B, Gate 3".
2. **Guests & extras** [Edit → 06]: Adults 4 × €95, Children (under 12) 2 × €55, Add-ons: Champagne €40, Photo package €80.
3. **Guest details** [Edit → 05]: Name, Email, Phone, Special requests ("Nut allergy, one guest uses a wheelchair").
4. **Price breakdown**: Adults €380, Children €110, Champagne €40, Photo €80 → **Total €610**, "Includes all taxes and fees".
5. **Cancellation policy** box: same text as the current `CANCELLATION_FULL` (48h; weather → full refund or free rescheduling).
6. CTA **Continue to payment →** (to 08), lock note "**Secure payment handled by Teya**", trust strip.

Observations:
- It mixes the two pricing models (a private badge with per-person prices + extras). Implement **two variants**: group review (per-person lines) and private request review (base + extras + "estimate").
- The current `review.astro` already matches the group variant (Tour details / Guests / Guest details / Price breakdown / Cancellation / error alert / POST form). Restyle only.
- Lock note: the design says "Teya" only. Current: "Pay by card (through Teya) or with PayPal". Keep the current text (PayPal is secondary but offered).
- **Missing before payment (legal):**
  - a terms + privacy acceptance line ("By continuing you agree to the Terms and Cancellation policy; see Privacy policy")
  - the pre-contract information required by EU CRD Art. 6/8: total price incl. taxes **and** any extra on-site costs (the cave ticket)
  - a note that the right of withdrawal doesn't apply to date-specific leisure services (Art. 16(l))
- Accessibility: Edit links say just "Edit". Give them context (`aria-label="Edit guest details"`).

---

## 7. 08 Payment success — spec

- Hero: green check, **"You're booked!"**, "Confirmation sent to **ivan@example.com**. Check your inbox — including spam just in case."
- Ref pill: "Booking ref: **HBC-20847**" + **Copy** button (label → "Copied!" for 1.5 s; the prototype doesn't actually write to the clipboard).
- **Your booking**: Tour, Date ("Saturday, 12 Jul 2025"), Departure ("18:00 — Marina Pier B, Gate 3"), Guests, **Total paid €245**.
- **Where to meet us** (grey card, 2-col, 1-col ≤768): Location; Arrive by "17:45 (15 min early)" (computed); What to bring; **Captain "Marko will meet you"**; map stub "View meeting point on map". The stub is a `div` with cursor pointer, not a link.
- **What happens next**: Check your email · Weather update "We'll email you **24h** before departure if conditions change. If cancelled, full refund or free rescheduling." · Show up and enjoy "Arrive at … by 17:45 … no need to print anything."
- **Browse more tours** (secondary) → Tours; trust strip.

Vs current `/booking/success/` (already more complete and safer):
- Current also shows "Paid with", Invoice (račun) number with the demo label, the **demo notice**, and an honest email-delivery line ("Demo: saved in the admin, not sent" unless actually sent). Keep these; the design's unconditional "Confirmation sent to" is only true when `confirmationEmail.delivery === 'sent'`.
- Current shows **Name, Email, Phone, Special requests** on a public-by-link page (plan §0 lists this as a known limit). **The design shows none of them except the email. Follow the design and drop phone and notes.** Consider masking the email (`iv***@example.com`).
- Ref format: the design's numeric `HBC-20847` is display-only. Keep the random `HBC-7K3QXM` (`ids.ts`).
- **New:** the copy-ref button (real `navigator.clipboard.writeText` + `aria-live` "Copied") and "Arrive by HH:MM" computed from slot − 15 min. The current text is "15 minutes before departure"; compute it when the slot is known, and use the check-in time from `tour.departure` when present (e.g. "07:10 check-in").
- Captain name: no data. Keep "Our crew will meet you on the Riva".
- **Weather copy conflict:** the design says 24h email, but `CANCELLATION_WEATHER` and the legal pages say "at least 4 hours before". Keep the config value.
- Map: current `map-stub` is a real `<a target=_blank>` to `MEETING_POINT_MAP_URL`. Keep it.
- Nice to have (not in the design): an add-to-calendar `.ics`.

---

## 8. 09 Payment error — spec

- Red ✕ hero **"Payment unsuccessful"** / "Your booking hasn't been confirmed yet. No money has been taken from your account."
- Error note (danger box): "Your spots are still held for **8 minutes**. Try again before the hold expires or your selection may be released." This is a static number, not a live timer.
- **Common reasons**: incorrect card number/expiry/CVV · bank declined · connection dropped · 3-D Secure timed out/declined.
- Hold warning (amber): "Your date and time slot are held until the timer runs out…"
- Help strip: "Need help? If the problem persists, we can take your booking manually. **Contact us →**"
- **Try payment again** (primary → 07 Summary), **Back to tours**.

Vs current `/booking/error/`:
- Current is the same structure with a `role="alert"` note, an honest "We don't hold seats until you pay. Try again soon so your tour doesn't fill up." and a second variant (booking couldn't be saved → "Start booking again").
- Retry goes to `/booking/pay/?id` (better than the design's back-to-Summary: no re-entry, and the method can be switched).
- **Keep the current copy until holds exist.** When real holds arrive, render the remaining time from `hold_expires_at` server-side (plus an optional countdown with `aria-live="polite"` at minute granularity), and add a third variant, "Hold expired — your seats were released", that links to the group form prefilled.
- "No money has been taken": with real Teya, a declined 3DS can still leave an **authorisation hold** on some cards. Soften to "You haven't been charged".
- The reasons list mentions card fields. That's fine: they are entered on Teya's hosted page, not ours.

---

## 9. Accessibility observations (design)

| Issue | Where | Fix / current status |
|---|---|---|
| `outline: none` on all inputs/buttons; focus = 0.5px border colour change | `hbc.css:165-174` | Must add a visible `:focus-visible` ring (WCAG 2.4.7). Check the current global CSS when restyling. |
| No `<h1>` on 05/06/07; card titles are `<p>` | 05–07 | Current has an sr-only `h1` + `h2.card-title`. Keep. |
| Step bar: no list semantics, no `aria-current="step"` | all flow pages | Current has `role=group` + `aria-current`. Keep; add a narrow-screen rule. |
| Calendar day buttons lack selected state (`aria-pressed`), month change not announced, DOW headers not hidden, availability dot conveyed by colour only | 05 | Current fixes all but the dot meaning. |
| Slot buttons look like radios but are plain buttons | 05 | Use `role=radiogroup`/`radio` + `aria-checked`, or real radio inputs. Current lacks this too. |
| Steppers: no disabled state at min/max, value not announced | 05/06 | Current: `aria-disabled` + `role=status` summary. Keep. |
| Cap warning not in a live region | 05 | Current wraps it in `role=status`. |
| CTA "Review booking" is an always-active link | 05/06 | Current: gated button + `aria-describedby` hint. |
| Special-requests textarea has only `aria-label`, no visible label | 06 | Add a visible label. |
| Uppercase micro labels (`--font-size-xs`, tertiary colour) | forms | Check contrast ≥ 4.5:1. |
| Copy button: no clipboard write, no live feedback | 08 | `aria-live` "Copied". |
| Map "link" is a non-focusable `div` | 08 | Current uses `<a>`. Keep. |
| Error note lacks `role=alert` | 09 | Current has it. |
| Mobile book bar: `div role=button` containing `<a>` (nested interactive) | 03 | Single control. |
| Native `type=date/time` inputs (06, homepage) | – | Accessible by default, but the homepage hides the real input behind a fake display span (`aria-hidden` display + transparent input). Make sure the input stays focusable and labelled. |

---

## 10. Safety / legal / security flags

| # | Flag | Severity | Detail → mapping |
|---|---|---|---|
| 1 | **Hold timers that don't exist** (05 "held for 12 minutes", 09 "still held for 8 minutes", 09 timer warning) | High (misleading; consumer law) | No holds, no capacity check at booking time (`service.ts:50` "Seats are not held"). **The current Vue still shows the 12-minute claim.** Showcase: remove the hold copy, keep "We don't hold seats until you pay". Real: the duration comes from config (D10 = 20 min) and the timer from server `hold_expires_at`. |
| 2 | **No server-side capacity check** | High for live | Showcase: admin-only overbooking warnings (`DepartureCard.astro`). Design's "Max 12 per departure" and "Next available" imply enforcement. Needs Phase 1 (departures + transactional seat count). |
| 3 | **Infants not counted** ("Children under 3 travel free", no counter) | Safety | Passenger limits on licensed vessels count **every person**, and life jackets must be sized for infants. Add an "Infants (0–2), free" stepper counted toward capacity (current data: children 0–17, priced). |
| 4 | **Price shown client-side** | Medium | Design totals are JS constants. The current server already recomputes (`createPendingBooking` → `computeBookingTotal`) and pay/success read `booking.total`. Keep it that way. Extras/durations for charters must also be priced server-side from catalog data, and the booking must store a **line-item snapshot** (today only `total`). |
| 5 | **Peak price always charged** (D8) | Medium | Design shows one price per tour. Seasonal pricing needs date-aware numeric price data. Also, the catalog's season copy overlaps (low "1 Sep–30 Nov" vs peak "15 Jun–30 Sep", `tour-catalog.ts:49-56`). Fix that when D8 is answered. |
| 6 | **"Includes all taxes and fees"** while the cave ticket is cash on site (03 "Good to know") | Medium (CRD Art. 6(1)(e), price transparency) | Replace with "Excludes Blue Cave entry ticket, paid on site" from tour data (current shows `priceNotes`; better). VAT wording depends on D1/D2. |
| 7 | **No card data on our pages** | OK | The design never shows card fields (good). Keep Teya **Hosted Checkout redirect** / Pay-by-Link (PCI SAQ-A) and PayPal buttons. Never build a card form. The demo pay page must keep its "Demo checkout" banner. |
| 8 | **Payment method choice missing** in the design | Medium | Business = Teya primary, PayPal secondary. Keep the current `/booking/pay/` radios (Card via Teya default; PayPal). With real Teya, Apple/Google Pay show inside Teya's page. |
| 9 | **PII in URLs** | High (GDPR minimisation) | The design prototype passes nothing. **Current group → review is a GET with firstName/lastName/email/phone/notes in the query** (`GroupBookingFlow.vue:goToReview`, `bookingReviewPath`), so it ends up in history, Netlify logs and analytics. Fix: POST step 2 to the server, store a short-lived **draft** (or create the `pending_payment` booking right there), and render review by opaque id. Post-review pages already use `?id=<uuid>`. |
| 10 | **Health data solicited** ("Allergies, accessibility needs", "one guest uses a wheelchair") | Medium (GDPR Art. 9 special-category data) | Needs a privacy-notice line at the field ("Only tell us what the crew needs to know; we use it only for your trip and delete it after N months", D19). Keep notes off public pages (success). Restrict them to the admin. |
| 11 | **No terms/privacy acknowledgement or links** in the booking flow (design or current) | Medium | Add a sentence with links on the review step before "Continue to payment". The final pay button should name the amount ("Pay €X", current) to satisfy the CRD Art. 8(2) "obligation to pay" button rule. |
| 12 | **Private charter: pay before availability confirmed, plus contradictory policies** (48h free vs 30% non-refundable deposit) | High (contract/consumer) | Quote flow (§5). Pick one policy (D7/D9) and source all copy from `config/cancellation.ts`. |
| 13 | **Success page exposes PII** to anyone with the link | Medium | Follow the design (email only, ideally masked). Drop phone and notes from `success.astro`. |
| 14 | **Unverified marketing/trust claims**: "Licensed maritime operator", "4.9 from 800+ reviews", "500+ happy guests", "10 years", "sell out 3–5 days ahead", "Next available Today 18:00", "live availability" | Low–Medium (UCPD) | Use only verifiable numbers. The current trust strip already says "Licensed maritime operator · Croatia"; confirm it's true. |
| 15 | **Placeholder facts**: Marina Pier B Gate 3, Captain Marko, help@ address, 09:00/18:00 slots, €95/€55, Elafiti route, ages 13+/3–12 | Content | Replace with catalog/config values (Riva stand 14 via `MEETING_POINT_LABEL`, `SITE_EMAIL`, tour slots/prices). |
| 16 | Design Legal page lists **Google Analytics + Mailchimp** as processors and "session_id / csrf_token / cookie_consent" cookies | Medium (privacy policy accuracy) | Real processors: Teya, PayPal, Resend, Netlify (Blobs), Cloudflare Turnstile (when on). Out of my scope; flag to the legal-pages researcher. |
| 17 | Rate limiting / bot protection on booking POST | OK / note | `/api/bookings` has an IP rate limit (20). If the charter request becomes a form, reuse the contact pipeline (honeypot, `_startedAt`, Turnstile once the CSP is fixed; see the memory note). |

---

## 11. Gap table: design element → current → change → implications

Change types: **keep** (exists, fine), **restyle** (exists, apply new visual system), **new**, **remove**, **change** (behaviour/copy differs).

| Design element | Current equivalent (file) | Change | Data / backend implications |
|---|---|---|---|
| Booking-flow mini-nav (logo only) | `components/MiniNav.astro` (logo + Exit) | restyle (keep Exit) | – |
| Step bar 4 steps | inline in `book/[slug]/group.astro`, `review.astro` | restyle; add a step-bar component; label step 2 "Customise" for private | Add a narrow-width CSS rule. |
| Flow width 628px | `.group-booking-page` 560px | restyle | – |
| Tour snapshot w/ rating | `group.astro` `.tour-snap` (no rating) | restyle; rating only if real | Needs a review-count data source, or omit. |
| Calendar (Mon-first, past disabled, dots) | `GroupBookingFlow.vue` calendar | restyle; **change** dot semantics | Dots need **departures/availability** (Phase 1: departures table, closed dates, seats left). Showcase: hide the dots, or show season bounds (disable outside 1 Apr–30 Nov) + admin-closed dates. Use Split TZ for "today". |
| Two departure slots 09:00 / 18:00 | single parsed slot or "confirmed at booking" | change (data-driven N slots) | Add `slots[]` to the tour catalog. Server validates `slot ∈ slots`. Departures keyed (tour, date, slot). |
| Adults / Children steppers, cap 12, default 2/0 | same in Vue (`bump`, `MAX_GUESTS`) | restyle; labels from data | Age bands are a business decision (13+/3–12 vs 18+/0–17). |
| "Children under 3 travel free" | none | **new**: infants stepper | Booking record gets `infants`. Count toward capacity (safety), price €0. Manifest/admin shows infants. |
| Cap warning | `.cap-warn` in `role=status` | keep/restyle | – |
| "Spots held for 12 minutes" note | **present** in `GroupBookingFlow.vue:383-386` | **remove now** (showcase); re-add later from config | Real: `hold_expires_at`, scheduled release job (plan Phase 1, D10). |
| Your details (first, last, email, phone, requests) | same fields in Vue (with required/autocomplete) | restyle; add a privacy micro-notice under requests; consider phone required | Notes retention (D19). Optional `language` field (plan D14). |
| Booking summary card + "Includes all taxes and fees" | summary + `priceNotes` | restyle; **change** the note to the real inclusions/exclusions | Per-tour `excludes`/on-site fees field (cave ticket) shown in summary, review and email. |
| "Review booking" link (ungated) | gated button + missing-fields hint | keep gating; **change transport to POST** | New `POST /api/bookings/draft` (or create the pending booking at step 2). Review loads by id. Removes PII from the query string. |
| Back / policy note / trust strip | same (`CANCELLATION_SHORT`, `TrustStrip.astro`) | restyle | Keep `SITE_EMAIL`, not help@. |
| **06 Private configurator** (route, date/time/duration, guests, extras, requests, estimated total) | none; `/contact/?tour=…` free text (`pages/contact/index.astro`, `api/contact.ts`) | **new** (as a quote request) | New charter catalog data: routes (Split-accurate), durations + price multipliers or a price table, extras with prices, capacity per boat. New enquiry type with structured fields: `type, date, time, durationH, adults, children, infants, routeId, extras[], estimate, notes, contact`. Admin enquiry view shows them, with a "Create quote / payment link" action (Phase 5). Server recomputes the estimate. Price copy reads "Estimated from"/"Quote", never "Total". |
| 06 contact details | missing in design | **new** (add to 06 or the review step) | Same validation as group (`EMAIL_RE`, names). |
| 07 Review, group variant | `book/[slug]/review.astro` | restyle | Already server-rendered, recomputed total, error alert, POST. Add a terms/privacy line and on-site fee disclosure. |
| 07 Review, private variant (badge, base + extras) | none | **new** (as "Review your request") | Shows the estimate, not a payable total. CTA "Send request". |
| 07 "Edit" links | `editHref` back to the group form (query) | restyle; aria-labels | With drafts: edit = reopen the draft by id. |
| 07 "Secure payment handled by Teya" | "Pay by card (through Teya) or with PayPal" | keep current copy | – |
| **Step 4 Payment screen** | `booking/pay.astro` (demo, method radios, simulate decline) | **keep + restyle** (the design lacks it) | Real: Teya Hosted Checkout session + return check + webhook; PayPal Orders v2 (Phases 2/6). Booking needs `paymentAttempts[]` / provider session ids. |
| 08 Success hero + "Confirmation sent to" | `booking/success.astro` (truthful delivery line) | restyle; keep truthful conditional | – |
| 08 Ref + Copy button | ref shown, no copy | **new** copy button | – |
| 08 Your booking (tour, date, departure+meeting, guests, total paid) | same + Name/Email/Phone/Notes/Paid with/Invoice | restyle; **remove** phone and notes (and name) from the public page; keep paid-with + demo invoice label | Privacy improvement (plan §0 known limit). |
| 08 Where to meet: Arrive by (computed), What to bring, Captain, map | meetup card (static "15 minutes before", crew text, real map link) | restyle; **new** computed arrive-by / check-in time | Parse the check-in time from `tour.departure`, or add `checkIn` to tour data. No captain data, so keep the generic text. |
| 08 What happens next (24h weather email) | same 3 items, weather copy from `CANCELLATION_WEATHER` (4h) | restyle; keep config copy | If a 24h weather/reminder email is wanted, that's a new scheduled job (plan D14 reminder). |
| 08 Browse more tours | same | restyle | – |
| 09 Error hero + "No money has been taken" | `booking/error.astro` (2 variants) | restyle; soften to "You haven't been charged" | – |
| 09 "Held for 8 minutes" + hold timer warning | "We don't hold seats until you pay…" | **keep current copy** (showcase); timer later from server | Holds: Phase 1. |
| 09 Reasons list, help strip, Try again, Back to tours | same; retry → pay page | restyle; keep retry → `/booking/pay/?id` | – |
| 09 hold-expired variant | none | **new** (real phase only) | `status: expired`. |
| "Request received" page (private) | contact form success state | **new** | – |
| TourDetail sticky widget: From €X / adult, child price, Next available | `TourDetailView.astro` (price + priceNotes, Next departure, Season) | restyle; child-price line from data; "Next available" only with departures data | Departures (Phase 1). Showcase: keep the "Next departure" static copy. |
| TourDetail "Book as private charter" | "Enquire about a private charter" → contact | change target → the new charter request (prefilled tour) | Charter request must accept `tourSlug`. |
| TourDetail mobile bar (auto-hides when card visible) | `.mobile-book-bar` | restyle; add the IntersectionObserver hide; avoid nested interactive | – |
| Homepage hero CTAs (3) | `HeroCarousel.vue` + `index.astro` (charter → contact) | restyle; charter → the new charter request | – |
| Homepage search band (Group/Private/Transfer, where, when) | none | **new** | `/tours/` must accept `?dest=&date=` filters (`ToursCatalog.vue`). Private → charter request prefill. Transfer → contact enquiry with from/to/date (new enquiry fields), or hide until the product exists. |
| Homepage "From €45 / From €280" | `index.astro` type cards | change: compute from catalog | Min price helper over the catalog. Private "From" needs a charter price table. |
| Emails | `lib/email/templates.ts` (confirmation with map link, admin booking, admin enquiry) | keep; extend | Add infants, slot/check-in, on-site fees, line items. New: charter-request admin email (structured), customer "request received" auto-reply (D14), quote/payment-link email (Phase 5). |
| Booking record | `lib/bookings/store.ts` `Booking` | extend | `type: 'group'|'private'`, `infants`, `lineItems[]` (label, unit, qty, amount), `priceSeason`, `extras[]`, `durationH`, `routeId`, `quoteId`, `deposit`/`balance` (if D7=b), `holdExpiresAt`, `language`, `termsAcceptedAt` + terms version, `paymentAttempts[]`. |

---

## 12. Mapping the design onto the demo showcase (what to build now vs later)

**Now (showcase-safe):**
1. Restyle 05/07/08/09 and the pay page to `hbc.css` tokens (cards, steppers, slot/radio styles, summary card, success/error heroes), keeping the current behaviour, gating and a11y.
2. Remove the 12-minute hold note. Keep "We don't hold seats until you pay."
3. Keep `/booking/pay/` (Card via Teya / PayPal + demo banner + simulate decline) as step 4.
4. Trim `success.astro` PII (phone, notes) per the design. Add the copy-ref button and computed arrive-by.
5. Replace "Includes all taxes and fees" with real inclusion/exclusion copy. Add the terms/privacy line on review.
6. Private charter: build 06 as a **request** with an estimate → stored enquiry → admin email. No payment.
7. Move step 2 → 3 from a GET query to a POST/draft (removes PII from URLs). This is moderate work but has the biggest privacy gain.

**Later (needs Phase 1/2/5 decisions):** departures + availability dots + "Next available", multi-slot, seat holds with a real timer (D10), seasonal pricing (D8), deposits (D7), Teya Hosted Checkout + PayPal, Pay-by-Link for charters, a hold-expired state, fiscal račun.

**Open business questions the design raises** (add to the plan's decision list):
- age bands and infants
- whether group tours really have two daily slots
- charter route list, duration price table, extras and suppliers
- a deposit vs 48h-free policy for charters
- whether "Transfer" is a product
- whether "help@" exists

---

## 13. File index

Design:
- `…/project/GroupBooking.dc.html`, `PrivateBooking.dc.html`, `BookingSummary.dc.html`, `PaymentSuccess.dc.html`, `PaymentError.dc.html`, `TourDetail.dc.html` (widget lines ~186-199, mobile bar ~220)
- `Main-n19w-fhxd-j4z6.dc.html` (hero ~477-510, search band ~537-590, types ~633-638, CTA band ~688)
- `hbc.css` (inputs 165-174, step bar 252-261, trust strip 241-249, `--flow-width` 146)
- Design FAQ/Legal deposit copy: `Faqs.dc.html:125`, `Legal.dc.html:108-115`

Current:
- `src/components/vue/GroupBookingFlow.vue`
- `src/pages/book/[slug]/group.astro`, `src/pages/book/[slug]/review.astro`
- `src/pages/api/bookings.ts`, `src/pages/api/contact.ts`
- `src/pages/booking/pay.astro`, `src/pages/booking/success.astro`, `src/pages/booking/error.astro`, `src/pages/booking/details.astro`
- `src/lib/booking.ts`, `src/lib/price.ts`, `src/lib/bookings/{service,store,ids,dates}.ts`
- `src/lib/email/{send,templates}.ts`
- `src/config/payments.ts`, `src/config/cancellation.ts`, `src/config/site.ts`
- `src/components/tour/TourDetailView.astro`, `src/components/TrustStrip.astro`, `src/components/admin/DepartureCard.astro`
- `src/data/tour-catalog.ts`
- `docs/bookings-payments-email-backoffice-plan.md`
- Old drafts: `new-pages-design/05-…09-*.html`
