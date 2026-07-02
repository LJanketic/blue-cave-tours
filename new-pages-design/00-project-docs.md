# Adriatic Sails — Website Project Documentation

> This document covers the full site architecture, page inventory, design decisions, content structure, and open questions for the Adriatic Sails boat tours website. Upload this to a Claude project so any future conversation can pick up exactly where this one left off.

---

## 1. Project overview

**Business:** Adriatic Sails — small-boat tours along the Dalmatian coast, based in Dubrovnik, Croatia.
**Brand name used in mockups:** Adriatic Sails (placeholder — replace with real brand name)
**Operation:** One group tour product with two daily departure slots. Private charters on both vessels.
**Fleet:** Two boats — Karaka Classic (up to 8 guests) and Dubrovnik Star (up to 12 guests).
**Season:** May – October. Off-season (November – March) by appointment.

**Tech stack (to be confirmed):** Tailwind CSS + Vue 3 frontend. 3rd party payment provider (Stripe assumed in mockups — confirm before build). No account/login system planned currently.

---

## 2. Full page inventory

All pages have been designed and mockups produced. Status column reflects design completion, not build status.

| Page | Type | Status | Notes |
|---|---|---|---|
| Homepage | Marketing | ✅ Designed | Full mockup including nav, hero, quick search, trust bar, featured tours, destinations strip, how it works, tour types, reviews, FAQ preview, CTA band, footer |
| Tours overview | Listing | ✅ Designed | Working filters (group, private, duration, activity), sort, featured section, tour cards |
| Tour detail | Detail | ✅ Designed | Gallery, tags, rating, description, highlights, timed itinerary, includes/excludes, good to know, reviews, sticky booking card |
| Destinations overview | Listing | ✅ Designed | Map strip, filters, featured destination (wide card), destination cards with tour count |
| Destination detail | Detail | ✅ Designed | Gallery, highlights, best-time bar chart, map, nearby stops, insider tips, tours that visit here, sidebar |
| Group tour booking | Flow | ✅ Designed | Date calendar, two time slots (09:00 pre-selected, 18:00 sunset), guest stepper, contact details, live summary. No extras section. |
| Private tour customisation | Flow | ✅ Designed | Boat selector, date/time/duration, guests, route picker, extras, special requests, live price summary |
| Booking summary & review | Flow | ✅ Designed | Progress bar, tour snapshot, guests & extras, guest details, price breakdown, cancellation policy, CTA to payment |
| Payment (3rd party) | External | — | Handled by payment provider. Only handoff and return URLs needed from our side. |
| Payment success | Post-flow | ✅ Designed | Check animation, booking reference + copy, booking details, meeting point card, map link, what happens next, browse more tours CTA |
| Payment error | Post-flow | ✅ Designed | Error state, "no money taken" message, hold timer warning, common reasons, contact fallback, retry CTA |
| FAQs | Info | ✅ Designed | Search, category nav (booking, weather, on board, guests, private charters), accordion items, contact band |
| About | Info | ✅ Designed | Hero image, intro + trust stats sidebar, founding story timeline, crew cards, values grid, press mentions, CTA band |
| Contact | Info | ✅ Designed | Four contact cards (phone, email, WhatsApp, location), response hours, contact form with subject dropdown, map stub, marina directions note |
| Terms & conditions | Legal | ✅ Designed | Sticky side nav, short version summary box, sections: bookings, payment, conduct, liability, safety, governing law |
| Privacy policy | Legal | ✅ Designed | GDPR compliant structure, third-party table, cookies table, rights section |
| Cancellation policy | Legal | ✅ Designed | Separate tables for group tours and private charters, weather cancellation section, refund timelines, how to cancel |

**Footer** is persistent across all pages and includes: logo, brand description, phone + WhatsApp + email + address inline, tours nav, destinations nav, info nav (with legal links).

---

## 3. Booking flow architecture

Two separate flows depending on tour type. Both merge at the booking summary step.

```
Tour detail page
    │
    ├── "Book group tour" CTA
    │       └── Step 2: Date & guests (calendar → time slot → guest count → contact details)
    │
    └── "Book as private charter" CTA
            └── Step 2: Customise (boat → date/time/duration → guests → route → extras → special requests)
                │
                └── Step 3: Booking summary & review  ← both flows merge here
                        │
                        └── Step 4: 3rd party payment
                                │
                                ├── Payment success page
                                └── Payment error page
```

### Group tour booking — key decisions made
- Single tour product with **two fixed departure slots**: 09:00 (morning) and 18:00 (sunset)
- 09:00 is **pre-selected by default**; 18:00 shown as second option
- Time slots **revealed after date selection** (not shown upfront)
- **No extras section** on group tours (extras are private charter only)
- Guest pricing: Adults €95, Children (3–12) €55, Under 3 free
- Max 12 guests per departure
- Contact details collected on the same step (not a separate page)

### Private tour booking — key decisions made
- Boat selection comes first — sets guest capacity constraints for everything below
- Duration has a price multiplier applied to the base boat price
- Route options: Sunset coast, Elafiti islands, Blue Cave & Vis, Hidden coves + "design your own" (redirects to special requests)
- Extras are per-booking flat fees (not per-person): champagne €40, photo package €80, picnic lunch €65, snorkelling gear €30
- 30% deposit at booking, balance due 7 days before departure

### Open decisions — booking flow
- [ ] **Availability holds:** Does selecting a date trigger a backend slot hold? If yes, add a countdown timer on the summary page (mockup shows "held for 12 minutes"). If no, remove the timer.
- [ ] **Payment provider:** Stripe assumed throughout. Confirm and update payment page handoff URL and return URLs accordingly.
- [ ] **Sunset slot seasonality:** The 18:00 slot may only be viable May–September. Decide whether to hide it conditionally by date range or manage it manually.
- [ ] **Guest details — lead only vs all passengers:** Currently collecting lead guest only. If a passenger manifest is required (maritime safety), the guest details form needs to expand.
- [ ] **Account model:** Currently guest-only (no login). If guests need to manage/cancel bookings online, a "my bookings" area or email-based lookup will be needed post-launch.

---

## 4. Page-by-page design decisions

### Homepage
- Quick search bar (destination, tour type, date) sits directly below hero — highest-value element for ready-to-book users
- Trust bar numbers (guests, rating, years, tours) must be real — do not use placeholder values on launch
- "Group or private?" section mid-page addresses the most common user orientation question before they reach the tours page
- FAQ preview shows top 4 questions — answers should match the full FAQs page exactly
- Hero requires a real photograph — the single highest-ROI content investment on the whole site

### Tours overview
- Filters: All, Group, Private, Under 2h, Sunset, Swimming — chip style, not dropdown
- Featured section collapses when filters are active
- Sort options: most popular, price asc/desc, duration, top rated
- Sold-out/seasonal tours: decision needed — show greyed out with "notify me", or hide entirely
- Tour cards show: thumbnail, type badges, title, duration, tour type, 2-line description, price from, rating

### Tour detail
- Two separate CTAs on the sticky booking card: "Book group tour" and "Book as private charter"
- Availability dots on the card give a quick 14-day calendar overview
- Itinerary is timed and stop-by-stop — essential for setting expectations and reducing pre-tour anxiety
- "Good to know" grid surfaces: minimum age, group size, language, accessibility, difficulty, what to bring

### Destinations overview
- Map strip at top is decorative/lightweight — decision needed on whether to invest in a real interactive map
- "Not to miss" featured section + "More destinations" grid
- Each card shows: region pill, destination name, attribute tags, tour count with link to filtered tours page
- "Not sure where to go?" strip at bottom links to tours overview

### Destination detail
- Editorial in tone — "why go there", not just what's there
- Best time to visit: bar chart by month (peak / good / off season)
- Insider tips: 3 specific, opinionated tips written in the captain's voice — needs real content from the operator
- "Tours that visit here" list requires each tour to declare which destinations it covers in the data model
- Sidebar: at-a-glance stats, current weather (live data or seasonal averages), CTAs, nearby destinations

### FAQs
- 20 questions across 5 categories: booking & cancellation, weather, on board, guests & suitability, private charters
- Search filters both question text and answer text
- Category nav on left collapses on mobile
- "Contact band" at bottom links to contact page — not a full form, just phone and email CTAs

### About
- Founding story timeline is most trust-building element — needs real dates, real names, real detail
- Crew cards need real photos (currently using initials avatars as placeholders)
- Press mentions section — replace with guest pull-quotes if no press coverage yet
- Credentials sidebar: licensed maritime operator, fully insured, Croatian Maritime Authority certified — verify exact certifications

### Contact
- Four channels: phone, email, WhatsApp, physical location — all equal priority
- WhatsApp is a first-class channel, not an afterthought
- Contact form has subject dropdown for routing: general, group booking, private charter, existing booking change/cancel, weather cancellation, other
- "Open now" status badge on hours card — worth making dynamic based on current time
- Marina directions note (parking limited, Pile Gate drop-off, 10-min walk) reduces a class of pre-tour messages

### Legal pages
- All three have a "short version" summary box at top — plain language, 5 bullet points max
- Side nav for section jumping (sticky on desktop)
- **Important:** These are design templates, not legal documents. Review with a Croatian maritime/consumer law lawyer before launch.
- Privacy policy is GDPR structured — needs a real AZOP registration number and a dedicated privacy@ email address
- Cancellation policy wording must match exactly what is surfaced in: the FAQ, the booking summary page, and the payment success email

---

## 5. Content that still needs to be written

The following are placeholders in the mockups that require real content from the business:

| Content | Location | Notes |
|---|---|---|
| Real tour name | All pages | "Sunset Bay coastal cruise" is placeholder |
| Real pricing | All pages | Adult €95, Child €55 — confirm |
| Real boat names | Private flow, About | Karaka Classic, Dubrovnik Star — confirm |
| Founding story | About | Real dates, names, events |
| Crew bios + photos | About | Real names, roles, personal details |
| Press mentions | About | Replace with guest quotes if none |
| Insider tips | Destination detail | 3 per destination, written by captain |
| Destination descriptions | Destinations | Hvar, Dubrovnik, Elafiti, Blue Cave, Korčula, Vis |
| Real meeting point | Booking confirmation, success page | Marina Pier B, Gate 3 — confirm |
| Legal entity name | Legal pages | "Adriatic Sails d.o.o." — confirm |
| Contact details | Footer, Contact page | Phone, WhatsApp, email — confirm |
| AZOP registration | Privacy policy | Required for GDPR compliance |
| Maritime certifications | About, T&Cs | Exact certification names and numbers |
| FAQ answers | FAQs | Review all answers against actual policies |

---

## 6. Design system notes

All mockups use the claude.ai design system CSS variables. When building the actual frontend:

- `--color-text-primary` → main text
- `--color-text-secondary` → supporting text / labels
- `--color-text-tertiary` → hints / meta
- `--color-background-primary` → white cards
- `--color-background-secondary` → surface / panels
- `--color-border-tertiary` → default borders (0.5px)
- `--border-radius-md` → 8px (components)
- `--border-radius-lg` → 12px (cards)

**Brand green used throughout:** `#1D9E75` (teal-400 in the design system) — used for icons, CTAs, success states, and accent elements.

**Typography:** Two weights only — 400 regular, 500 medium. No 600 or 700.

**Icon library:** Tabler Icons (outline) — already used in all mockups. Import via `https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css`

**Badge colour conventions used:**
- Group tour: green (`#E1F5EE` bg / `#085041` text)
- Private tour: purple (`#EEEDFE` bg / `#3C3489` text)
- Best seller: amber (`#FAEEDA` bg / `#633806` text)
- New: green (`#E1F5EE` bg / `#085041` text)

---

## 7. Things to decide before build starts

These are the open architectural questions that will affect development scope. Resolve these before writing any backend code.

### High priority
- [ ] **Payment provider:** Confirm Stripe or alternative. This affects the booking flow handoff, return URLs, webhook setup for confirmation emails, and the deposit vs. full payment logic for private charters.
- [ ] **Availability system:** Will tour capacity be managed in a backend database with real-time availability? Or is it manual/external? This affects the calendar on the group booking flow and the "spots left" indicator on tour cards.
- [ ] **Slot holds:** When a user starts the booking flow, are seats reserved? For how long? This affects the countdown timer on the summary page.
- [ ] **Confirmation emails:** Who sends them — Stripe, Mailchimp, a custom mailer? The success page references an email arriving immediately. The infrastructure needs to exist.

### Medium priority
- [ ] **CMS or static content:** Will tour descriptions, pricing, and destination content be editable by the operator without a developer? If yes, a headless CMS (e.g. Sanity, Contentful) should be scoped in.
- [ ] **Destination-to-tour tagging:** Each tour needs to declare which destinations it visits so the destination detail page can auto-populate the "tours that visit here" list. This is a data model decision.
- [ ] **Sold-out handling:** Group tours at capacity — show greyed-out card with "notify me", or hide from listing entirely?
- [ ] **Sunset slot seasonality:** Show/hide the 18:00 slot based on date range (e.g. only May–September)?
- [ ] **Weather widget:** Destination detail sidebar shows current conditions. Decide between: live API (OpenWeatherMap etc.), seasonal averages (static), or remove entirely.

### Lower priority (can be post-launch)
- [ ] **Guest accounts:** Currently no login. If guests want to view or manage bookings, this adds significant scope. Recommend: post-launch, email-based booking lookup first.
- [ ] **Review collection:** How are reviews collected and displayed? TripAdvisor/Google embed, or a custom review system?
- [ ] **Interactive map:** The destination pages and homepage have map stubs. A real embedded map (Google Maps, Mapbox) adds polish but also complexity and API cost.
- [ ] **Blog / travel guides:** Mentioned as an SEO option but not designed. Add post-launch if needed.
- [ ] **Multi-language:** Croatian, English, German are the likely languages given the market. Not scoped in current design.

---

## 8. How to use this document in a Claude project

Upload this file to a Claude project as a knowledge document. In future conversations you can reference it with prompts like:

- "Based on the project docs, help me write the copy for the Hvar destination detail page"
- "Looking at the booking flow architecture, help me spec out the backend API endpoints needed"
- "Draft the confirmation email that gets sent after a successful group tour booking"
- "Help me write the real founding story for the About page using this structure"
- "Based on the open decisions list, help me think through the availability system options"
- "Build the Vue component for the group tour booking calendar step"
- "Write the Montenegrin/Croatian copy for the homepage hero section"

The mockups themselves were built as interactive HTML widgets in the conversation. If you need to reference or modify a specific page mockup, describe which page and what change you want — Claude can rebuild or modify any section from this documentation.

---

## 9. Page URL structure (suggested)

```
/                          → Homepage
/tours                     → Tours overview
/tours/[slug]              → Tour detail (e.g. /tours/sunset-bay-coastal-cruise)
/destinations              → Destinations overview
/destinations/[slug]       → Destination detail (e.g. /destinations/hvar-island)
/book/[tour-slug]          → Booking flow entry (group or private choice)
/book/[tour-slug]/group    → Group tour booking step
/book/[tour-slug]/private  → Private charter customisation step
/book/[tour-slug]/review   → Booking summary & review
/booking/success           → Payment success (receives booking ref from payment provider)
/booking/error             → Payment error (receives error code from payment provider)
/faq                       → FAQs
/about                     → About
/contact                   → Contact
/terms                     → Terms & conditions
/privacy                   → Privacy policy
/cancellation-policy       → Cancellation policy
```

---

*Document version: 1.0 — covers full design phase, June 2025. Update this document as architectural decisions are resolved and build begins.*
