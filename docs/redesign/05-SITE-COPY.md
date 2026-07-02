# Site copy & shared content

> Canonical values for global copy. Tour-specific copy is in `03-TOUR-DATA.json`.

---

## Site identity (`src/config/site.ts`)

| Key | Value |
|-----|-------|
| `SITE_NAME` | Hello Blue Cave |
| `SITE_EMAIL` | info@hellobluecave.com |
| `SITE_PHONE` | +385919888838 |
| `SITE_PHONE_DISPLAY` | +385 91 988 88 38 |
| `SITE_DEFAULT_DESCRIPTION` | Boat tours and private charters from Split — Blue Cave, islands, and the best of the Adriatic. |
| `HOME_PAGE_TITLE` | Hello Blue Cave — Split boat tours & private charters |
| `pageTitle(segment)` | `{segment} — Hello Blue Cave` |

---

## Meeting point (all tours)

> Meet at Split's Riva promenade, stand number 14. After booking you'll receive the exact location, map link, and what time to arrive.

---

## Weather policy (all tours)

> We track forecasts and sea state. If conditions are rough or a stop is closed, we adjust the route or timing and communicate changes clearly.

---

## Safety info (all tours)

> Follow crew instructions, wear a life jacket when asked, stay seated during manoeuvres, and tell us if you have conditions that affect swimming or sun exposure.

---

## What to bring (default list)

- Sunscreen & hat
- Swimwear & towel
- Light jacket
- Water
- Sea-sickness remedy if needed

---

## Standard disclaimers (all tours)

1. Routes, order of stops, and swim breaks may vary with weather, harbour traffic, and site regulations.
2. National park and cave entry fees may be charged separately on-site where applicable.

---

## Pricing templates

### Standard group tours

> Indicative pricing: infants 0–3 €0; children 4–10 from €139; adults from €159 — final price confirmed when you book.

### Private charter

> Private charters are quoted per boat and season. Request a quote via the contact form or by phone.

### Blue Cave ticket note

> Entrance to the Blue Cave may require a separate ticket payable on-site; availability depends on sea conditions and official cave opening hours.

---

## FAQ (`src/data/faq.ts`)

| # | Question | Answer | Link |
|---|----------|--------|------|
| 1 | Is the Blue Cave ticket included? | Cave entry is often billed separately on-site and depends on sea conditions and official opening hours. We show what's included before you confirm your booking. | — |
| 2 | What if the weather is bad? | We monitor forecasts. Routes may be shortened, reordered, or rescheduled so the day stays safe and enjoyable. | — |
| 3 | Private vs group tours? | Group tours follow a fixed timetable; private charters pick timing and pacing within operational limits — see | `/tours/create-perfect-day-private` ("Create your perfect day at sea") |
| 4 | Where do we meet? | Split's Riva promenade, stand 14. You'll receive the exact meeting time and any last-minute updates after booking. | — |

**Homepage teaser:** First 3 FAQ items only (`FAQ.astro`). Full list on `/faq`.

---

## Footer content (current)

| Block | Copy |
|-------|------|
| Address | Riva promenade, stand 14, Split |
| Operator note | Tours operated by licensed local skipper — details on request |
| Quick links | Home, Tours, FAQ, Contact |
| Legal links | Privacy (`/legal/privacy`), Terms (`/legal/terms`) |

---

## Typography (current — may be replaced by redesign)

| Token | Value |
|-------|-------|
| Display font | Glorich (self-hosted, `/public/fonts/glorich/`) |
| Body font | Playfair Display (Google Fonts) |
| Brand primary | `#003D84` (Adriatic Blue) |
| Surface | `#F6F1F2` (Linen White) |
| CTA accent | `#f97316` (orange) |

See `src/styles/tokens/` for full token set. Redesign may replace entirely.

---

## Long-form intro (Blue Cave tours)

Used in `overviewHighlights` for cave-focused tours:

> Step aboard our modern speedboat and discover the Adriatic in the most exciting yet comfortable way. Powerful, safe, and expertly handled by our experienced skipper, the boat offers the perfect balance of smooth cruising and dynamic performance. Glide across crystal-clear waters, feel the fresh sea breeze, and enjoy panoramic views of hidden bays and iconic islands.

Tours using this block: `blue-cave-hvar-5-islands`, `blue-cave-open-boat`, `blue-cave-6-islands`.
