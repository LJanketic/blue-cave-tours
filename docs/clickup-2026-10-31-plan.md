# ClickUp tasks, 31 Oct 2026: implementation plan

Source: ClickUp "Hello Blue Cave / Team Board", the six tasks assigned to Luka (status IN DEVELOPMENT).
Base: `main` 613cf77, which matches Netlify production. Branch: `fix/clickup-2026-10-31`. It stays uncommitted until the user asks.

**Ruling (user, 31 Oct):** these tasks are the latest operator input. Where they contradict earlier decisions (e.g. the 23 Oct "private pay-now only for Blue Cave" decision), the tasks win.
The no-invented-content rule still applies: no prices, times or extras that aren't in an operator source.

## Tasks

| ID | ClickUp task | What the operator asked | Decision |
|---|---|---|---|
| C1 | Cijene "from" nisu točne | Blue Cave from €149, Blue Lagoon from €70, Golden Horn from €129, plus an attached price table | Apply the **whole table**, not just the "from" values (see C1) |
| C2 | Mismatch with design: calendar | Remove the two sentences under the calendar | Remove the legend and the cut-off note under the calendar, in both flows |
| C3 | Mismatch with design: Booking screen | Remove "Fields marked…", "So the skipper…", "For example…", "We use detail…" | Match the "Your details" design (see C3) |
| C4 | Mismatch with Design: price card | Remove "Blue Cave entry optional…", "Private boat from…", "Something custom…", and replace everything to the bottom with "Free cancellation up to 48h before" | Rebuild the aside to match the design (see C4) |
| C5 | Private experience booking ne radi | Private booking works only on Blue Cave; going from a group tour to private doesn't work for the other tours | Every group+private tour gets the private booking flow. Pay-now where there is a boat price; a priced-later **request** in the same flow where there isn't (see C5) |
| C6 | Sekcija za video | Add the video section as in Labura's design | Build it to spec, hidden until the footage file exists (see C6) |

### C1: prices and age bands (`src/data/prices.ts`)
Operator table (low = 01.01–31.05 and 15.09–31.12, peak = 01.06–14.09):

| Tour | Child low / peak | Adult low / peak | Site today |
|---|---|---|---|
| Blue Cave | 129 / 139 | 149 / **159** | adult peak 169 |
| Golden Horn | 89 / 99 | 129 / 139 | matches |
| Blue Lagoon | **60 / 65** | **70** / 75 | child 59/69, adult low 65 |

- **Age bands:** infant 0–3 (free), child 4–11, adult 12+. The site has 0–2 / 3–17 / 18+. Set `INFANT_MAX_AGE = 3` and `CHILD_MAX_AGE = 11`; the labels, FAQ and steppers derive from them.
- **Season windows:** peak matches `season.ts`. The table's low season also covers the winter, which the site treats as closed (Nov–Feb), so there's no change.
- **Tests:** update `catalog.test.ts` (price sheet), `booking-api.test.ts` (2 × 70 = 140), `catalog-migration.test.ts` (frozen peak values, Blue Cave peak), plus anything pinning age labels or FAQ text.

### C2: calendar (`BookingCalendar.vue`, `GroupBookingFlow.vue`, `PrivateBookingFlow.vue`)
- Remove the `.cal__legend` paragraph (and its CSS). Greyed-out days keep their aria-labels, so screen readers still get the reason.
- Remove the `.flow__cutoff` paragraphs. Keep `BOOKING_CUTOFF_NOTE`, because the server error uses it.
- The private flow's "Requests need a day's notice." goes too, since it's the same slot. The calendar already closes today for requests.
- Update `tests/e2e/tours.spec.ts:140` and `private-booking.spec.ts:128`.

### C3: "Your details" (both flows, plus the no-JS fallbacks)
Design: subtitle "We'll send your confirmation and any updates here." Labels: First name / Last name / Email / Phone / Special requests. Placeholders: Ivan / Kovač / ivan@example.com / +385 91 234 5678 / "Accessibility needs, celebrations, anything we should know…".
- Remove the "Fields marked * are required." sentence, the phone hint, the notes hint and the privacy line.
- Keep the required semantics (`required` and `aria-required`). If FormField draws a visual asterisk, follow the design and hide it, but the field stays required.
- The privacy policy is still linked in the footer and on the review/pay step. Check that the review step mentions it; if it doesn't, add it there rather than drop it entirely.
- Phone in private request mode stays required. Its label then reads "Phone", with no "(optional)".

### C4: price card (`TourDetailView.astro`, `tour-display.ts`)
Design, top to bottom:
- From €X / adult
- Children from €X
- Next departure
- divider
- **Book group tour tickets →**
- **[crown] Private experience  €1,500 / boat**
- [shield] **Free cancellation up to 48h before**

To do:
- Remove from the aside: the fee line, "Private boat from…", the "Something custom?" link, both policy lines.
- The secondary button is labelled "Private experience", with the low-season boat price on the right when one is configured and no price otherwise.
- The primary label becomes "Book group tour tickets". Fix the `MobileActionBar` label mapping that compares against "Book group tour".
- The fee line stays in the mobile bar and on the tour page's "Cave entry" fact. The operator only asked about the card.

### C5: private booking for every tour (wave 2, after C2–C4)
Today only `PRIVATE_TOURS` (Blue Cave) gets `/book/<slug>/private/`. Every other tour goes to the generic charter form, which is what the operator sees as "doesn't work".

- `/book/<slug>/private/` is built for **every tour that is both group and private**: Blue Cave, Golden Horn, Blue Lagoon morning and afternoon, Red Rocks, Dubrovnik.
  - **Priced** (in `PRIVATE_TOURS`): pay-now, as today.
  - **Not priced:** the same flow in *quote* mode. Pick a date, departure (the catalog time, or a free time picker within the charter window when the tour has none), guests, details, then "Send request". It posts to `/api/charter-request` with the tour's route, as the off-list pick-up request does now. The summary shows "Price: we'll send you a quote".
  - Perfect Day stays the charter landing.
- The tour aside's "Private experience" button goes to `/book/<slug>/private/` for all of them.
- Remove the matching 301s from `public/_redirects` (the sync test in `private.test.ts` enforces this).
- Small related fix: Blue Lagoon afternoon requests are filed under the morning tour (`charter.ts` route `tourSlug`). Send the actual tour slug.
- **Not invented:** no boat prices, latest departures or extras for the other tours. Adding a `PRIVATE_TOURS` entry later turns a tour into pay-now with no code change.

### C6: video section (homepage, between TrustBand and PopularTours)
Spec §6.1.4 / board `Main-n19w…:587-601`:
- navy band with a photo
- eyebrow "Experience it first-hand"
- display h2 "Preview from our tours"
- 16:9 poster button with an orange play disc and the meta "0:22 · A day on the water"
- on click, swap in `<video controls playsinline preload="none">` and focus it
- `#vp-desc` description

Setup:
- Self-hosted in `public/media/`; CSP already allows `media-src 'self'`.
- **The footage and poster are not in the repo**, so the section is driven by config (`HOME_VIDEO` = null) and renders nothing until the files are added.
- The component is fully built and tested with a fixture so it can be switched on by adding the files.

## Execution (subagent fleet)

The waves are split by file ownership, so parallel agents never edit the same file.

| Wave | Agent | Task | Files owned |
|---|---|---|---|
| 1 | A | C1 | `src/data/prices.ts`, `src/data/tour-catalog.ts` (age comment only), price/age tests |
| 1 | B | C2 + C3 | `BookingCalendar.vue`, `GroupBookingFlow.vue`, `PrivateBookingFlow.vue`, `book/[slug]/group.astro`, `book/[slug]/private.astro`, `FormField*`, related tests |
| 1 | C | C4 | `TourDetailView.astro`, `tour-display.ts`, `MobileActionBar.astro` (if needed), `cancellation.ts`, related tests |
| 1 | D | C6 | new `src/components/home/VideoPreview.astro`, `src/pages/index.astro`, video config, tests |
| 2 | E | C5 | `booking.ts`, `private.ts`, `book/[slug]/private.astro`, `PrivateBookingFlow.vue`, `tour-display.ts`, `charter*.ts`, `_redirects`, related tests |
| 3 | me | verification | `pnpm check`, `pnpm test`, `pnpm test:e2e`, `pnpm test:a11y`, plus a manual pass in the browser |

During waves 1–2 the agents run only `vitest` and `astro check`; e2e runs once, in wave 3, so dev servers don't collide.

## Open questions for the operator (don't block the work)
1. Private boat prices (low/peak) for Golden Horn, Blue Lagoon, Red Rocks and Dubrovnik. Until then those tours are private on request.
2. The video file (MP4, ≤2 MB, no audio) and a poster image, plus confirmation of the rights.
3. "Free cancellation up to 48h before" now shows on the card for private tours too. The legal page gives private experiences their own terms. Is that OK, or should it say "Group tours: …"?
4. The homepage "Group or private?" card says "Book online" but links to the request form. Should it link to Blue Cave private?
