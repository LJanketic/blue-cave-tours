# 04 — Design research: content pages, site chrome, sitemap and link graph

Scope: `Faqs.dc.html` (11), `Legal.dc.html` (12), `About.dc.html` (13), `Contact.dc.html` (14), `Artboard-qbg9.dc.html`, header/nav and footer (`hbc.css` plus how pages use it), `canvas.json`, a link graph across all 18 `.dc.html` files, and a comparison with the current Astro site and the older drafts in `new-pages-design/11–14`.

`DESIGN = design/2026-10/boards`
`REPO = the repo root`

---

## 0. Key findings (TL;DR)

1. **The content pages are a rebrand of a generic template.** The older drafts (`new-pages-design/11–14`) are an "Adriatic Sails" template set in Dubrovnik. The new designs mostly swap names and places in that template: Adriatic Sails → Hello Blue Cave, Stripe → Teya, Dubrovnik → Split, "Karaka Classic" → "Aliskaf 37", Dubrovnik-Neretva → Split-Dalmatia. Template leftovers that still don't fit a Split speedboat operator:
   - The founder is "born in Dubrovnik".
   - The 2017 "Elafiti island route" (the Elafiti islands are off Dubrovnik).
   - "Restored wooden vessel, sunset tours only". The catalog has no sunset tours.
   - "Marina Pier B, Gate 3" with a blue flag. The real meeting point is Riva promenade, stand 14.
   - Fake phone numbers `+385 20 123 456` and `+385 91 234 5678`.
   - Emails `hello@`, `privacy@` and `help@`. The real address is `info@hellobluecave.com`.
   - Fabricated press quotes attributed to Travel + Leisure, Condé Nast Traveller and The Guardian.

   **None of this copy can ship as-is.** The current site already replaced most of it with real data from `src/config/site.ts` and `src/data/*`.
2. **The current implementation is already a close port of these same layouts.** It has the same class names (`faq-q`, `cat-link`, `summary-box`, `contact-card`, `hours-card`, `trust-grid`, `crew-grid`…), the same section order and much of the same copy. The redesign of these four pages is mostly visual:
   - Body text goes up from 13px to 16px.
   - h1 uses `--font-size-hero`, a clamp from 28 to 40px.
   - Cards get 1px `#D6D5D1` outlines.
   - The palette is sea blue.

   The current site is ahead of the design on accessibility, behaviour and data wiring. Keep the current logic and restyle it.
3. **No mobile menu is designed.** The hamburger has no handler and no panel on any artboard. Keep the current `Header.astro` overlay (focus trap, Escape, `inert`, scroll lock, closes past 768px).
4. **The nav is inconsistent across artboards.**
   - The CTA is "Book now" → Tours on 6 pages, "Contact" → Contact on 3 pages, and absent on homepage v2–v4.
   - A language switcher (EN/HR/DE/IT/FR) appears only on homepage v2–v4.
   - There is no currency switcher anywhere.
   - Contact is missing from the nav (the current site has it).
   - The logo links to homepage **v3** (`Main-n19w-fhxd`), not the newest v4.
5. **Legal and compliance gaps exist in both the design and the current site.** Neither has:
   - a company imprint (legal name, OIB, address, court register),
   - GDPR controller identity or legal bases,
   - a terms-acceptance step in the booking flow.

   The privacy policy lists processors and cookies that don't exist (Google Analytics, Mailchimp, `session_id`/`csrf_token`/`cookie_consent`). It also leaves out processors that do exist: Resend, Netlify (hosting and Blobs), Cloudflare Turnstile, and PayPal (the design only). See §7.
6. **Policy facts conflict across copy.**
   - Children: the design FAQ says 3+ and under-3s free; the catalog prices children 0–17.
   - Drinks: the design says a welcome drink on every tour; the catalog lists bottled water only.
   - Private charters: the design has a 30% online deposit; the catalog is quote-only.
   - Weather notice: 4h on the policy pages, "24h" on the PaymentSuccess design, and a vaguer "may reschedule or refund" in the confirmation email.
7. `Artboard-qbg9.dc.html` is an **empty leftover** on its own canvas page ("Page 2"). Ignore it.

---

## 1. canvas.json

- Canvas `title`: **"Hello Blue Cave"**, format `v: 3`.
- `createdOnFiles.at`: 2026-10-11T21:06:04Z.
- `launch.view: "canvas"`.
- `designSystems: []` and `attachments: {}`.
- **Pages**: `page-1` is named **"Page 1"** and `page-ytpj3d` is named **"Page 2"**.
  - Every board without a `page` key is on page-1.
  - Only `Artboard-qbg9.dc.html` has `"page": "page-ytpj3d"`, so it sits alone on "Page 2".
- **Row labels** (`notes`, kind `title1`):
  - "Browse — tours & destinations" at y=-300
  - "Booking flow" at y=5490
  - "Info pages" at y=8090

| File | Board title | w×h | x,y | expand | interactive | page |
|---|---|---|---|---|---|---|
| Artboard-qbg9.dc.html | Artboard 1 | 800×600 | 0,0 | – | – | page-ytpj3d ("Page 2") |
| Main.dc.html | 01 Homepage | 1280×4120 | -4856,0 | fill | yes | page-1 |
| Main-n19w.dc.html | 01 Homepage v2 | 1280×5080 | -6285,-33 | fill | yes | page-1 |
| Main-n19w-fhxd.dc.html | 01 Homepage v3 | 1280×5190 | 0,0 | fill | yes | page-1 |
| Main-n19w-fhxd-j4z6.dc.html | 01 Homepage v4 — trust band below hero | 1280×5211 | -1610,0 | fill | yes | page-1 |
| Tours.dc.html | 02 Tours overview | 1280×2810 | 1360,0 | fill | yes | page-1 |
| TourDetail.dc.html | 03 Tour detail | 1280×2770 | 2720,0 | fill | yes | page-1 |
| Destinations.dc.html | 04 Destinations overview | 1280×2384 | 4080,0 | fill | yes | page-1 |
| DestinationDetail.dc.html | 10 Destination detail — Hvar | 1280×2660 | 5440,0 | fill | yes | page-1 |
| GroupBooking.dc.html | 05 Group booking | 1280×1770 | 0,5790 | fill | yes | page-1 |
| PrivateBooking.dc.html | 06 Private charter | 1280×2000 | 1360,5790 | fill | yes | page-1 |
| BookingSummary.dc.html | 07 Booking summary | 1280×1570 | 2720,5790 | fill | yes | page-1 |
| PaymentSuccess.dc.html | 08 Payment success | 1280×1560 | 4080,5790 | fill | yes | page-1 |
| PaymentError.dc.html | 09 Payment error | 1280×1170 | 5440,5790 | fill | yes | page-1 |
| Faqs.dc.html | 11 FAQs | 1280×1990 | 0,8390 | fill | yes | page-1 |
| Legal.dc.html | 12 Legal pages | 1280×2240 | 1360,8390 | fill | yes | page-1 |
| About.dc.html | 13 About | 1280×2710 | 2720,8390 | fill | yes | page-1 |
| Contact.dc.html | 14 Contact | 1280×1790 | 4080,8390 | fill | yes | page-1 |

Notes:
- Board v3 sits at the canvas origin (0,0), in the main row next to 02 Tours. All in-page logo links point to v3, so **v3 is the wired "home"**.
- v4 sits to the left. Its title says it is the newest iteration ("trust band below hero"). v1 and v2 sit further left as older explorations.
- The owner needs to pick v3 or v4 for `/`.
- `order` puts Artboard-qbg9 first, then the boards in number order, then the homepage variants v2, v3 and v4.

### Artboard-qbg9.dc.html — confirmed empty leftover
It contains only a `<section class="stage" style="width:100%;height:100vh">` on a white body. It has no `lang`, no `<title>`, no `hbc.css`, no logic script and no links, and nothing links to it. It is a default "new artboard" stub, so ignore or delete it.

---

## 2. Site-wide chrome (header, nav, footer)

### 2.1 Tokens and base (`hbc.css`)
- The header comment says the file was ported from `iLabura/HBC: assets/css/variables.css + nav-footer.css`.
- Icons come from a Tabler 3.48 webfont subset, served as `/_blob/…` (a canvas-internal URL). The current site already self-hosts icons in `src/styles/icons.css`. `ti-island` and `ti-cave` are remapped to `beach` and `\ed82`.
- Palette: blue brand `--palette-blue-500 #1a6fc4`. Orange is used **only** for CTAs on photos (`--color-cta-on-image`). Purple marks private charters and gold marks premium.
  - `--color-text-success` was remapped from teal to blue-900 ("site palette is blue + orange").
  - The current `SITE_THEME_COLOR` is still teal `#1d9e75`. That is a theme-color and manifest follow-up.
- Type scale:
  - micro 12, xs 13, sm 14, base 16, md 17, lg 18, xl 20, 2xl 22.
  - hero `clamp(1.75rem, 1.5rem + 1.25vw, 2.5rem)`.
  - body-md 16/1.6 and body-sm 14/1.5.
  - The font is the system stack. Glorich (display) is loaded only on the homepage artboards for `.hero h1`/`.font-display` (`text-transform: uppercase` plus forced ligatures).
- Radii are 8 and 12, and the booking-flow column is `--flow-width: 628px`.
- `.wrap` has a max width of 960px with 24px padding. Padding drops to 16px at ≤768px and 12px at ≤480px.
- **A11y regression in the base styles:** `.hbc input, select, button, textarea { outline: none }`, and the only focus cue is a border change from `#ccc` to `#aaa` on inputs. Buttons and links get no focus style at all; only `.tc-btn:focus-visible` has one. The current site's global `:focus-visible` (`src/styles/modules/_base.css:70`) must be kept, and the design's `outline:none` must not be ported. This fails WCAG 2.4.7.

### 2.2 Variant 1: full nav (all content and browse pages)
Markup (identical on Faqs, Legal, About, Contact, Tours, TourDetail, Destinations, DestinationDetail and Main v1):
```
.nav-bar (sticky top:0, z 100, white 92% + blur(10px), 0.5px bottom hairline)
  nav.nav (flex, space-between, max-width 960, padding 14px 24px)
    a.nav-logo  [ti-sailboat] Hello Blue Cave   → Main-n19w-fhxd.dc.html (v3)
    div.nav-links (gap 18px): Tours · Destinations · About · FAQ   (14px, #555; .current = #111 500)
    a.nav-cta  (14px, blue bg, white, radius 8, 6px 14px)
    button.nav-hamburger aria-label="Menu" [ti-menu-2]   (display:none ≥769)
```
- **CTA varies by page:**
  - "Book now" → Tours.dc.html on Faqs, Legal, About, Contact, TourDetail and DestinationDetail.
  - "Contact" → Contact.dc.html on Main v1, Tours and Destinations.
  - No CTA on homepage v2–v4.
  - The current site uses "Book now" → `/tours/` everywhere.
  - Recommendation: always use "Book now", keep Contact as a nav link, and drop the "Contact" CTA variant.
- **Links:** Tours, Destinations, About and FAQ. **Contact is not in the design nav**; the current nav has five links including Contact. Recommend keeping Contact, because the design only reaches the contact page through the footer and the FAQ band.
- **Active state:** the design uses `.current` only, with no `aria-current`. The current Header sets `aria-current="page"` on the page itself and `"location"` within its section, with `exact` handling for /about. Keep that.
- **Legal page override:** `Legal.dc.html` sets `.nav{max-width:680px}` as well as `.wrap{max-width:680px}`, so the header shrinks to 680px on that page only. That looks accidental; the header should stay at 960px.
- **Mobile (≤768px):** `.nav-links` and `.nav-cta` are hidden and the hamburger shows (22px). **No open state, panel or handler is designed on any artboard**, and the button has no `aria-expanded` or `aria-controls`. Reuse the current `Header.astro` behaviour:
  - full-screen panel with a close button,
  - focus trap and Escape to close,
  - `inert` on covered content and scroll lock,
  - auto-close when the viewport passes 768px,
  - hide on scroll down, show on scroll up, solid background after 40px.

### 2.3 Homepage nav (v2, v3, v4) for reference
- `.nav-bar.nav-overlay` is `position:fixed` and transparent over the hero.
  - `.on-photo` turns the logo, links and buttons white.
  - `.is-solid` is set after scrolling and gives white at 97% with a shadow.
  - At ≥769px the layout is a 3-column grid with centered links and the language switcher at the end.
  - No nav-cta element, although the CSS for an outline CTA style exists.
- **Language switcher**, the only one in the design:
  - A `button.lang-btn` with a globe SVG, the current code and a chevron, carrying `aria-haspopup="listbox"`, `aria-expanded` and `aria-label="Change language"`.
  - It opens a transparent full-screen `.lang-backdrop` that closes on click, plus a `ul.lang-menu role=listbox` of `button role=option aria-selected`: **EN English, HR Hrvatski, DE Deutsch, IT Italiano, FR Français**, with a check on the selected option.
  - At ≤768px it sits just left of the hamburger.
  - It only changes state; no translated content exists.
  - It is missing from all content pages, which makes it inconsistent. Multilingual support is a large scope item (i18n routing, hreflang, translated copy and legal texts), so treat it as a separate decision.
  - Keyboard gaps: no arrow-key navigation, and no Escape handling in the design.
- **No currency switcher** exists anywhere. Prices are € only.

### 2.4 Variant 2: minimal booking-flow nav (05–09)
- `.mini-nav` contains only the logo, linking to v3, with **no exit link** on any booking artboard. The current `MiniNav.astro` supports an optional `exitHref`/`exitLabel`.
- A `.trust-strip` sits at the bottom of the flow pages with three items: 🔒 "Secure payment", headset "Need help? help@hellobluecave.com", and "Licensed maritime operator · Croatia". The current `TrustStrip.astro` has the same three items with `SITE_EMAIL` (`info@…`). The design's `help@` address needs confirmation.
- The current `SiteLayout checkout` prop hides Header and Footer for these pages, which matches the design intent.

### 2.5 Footer (identical on all 13 full-chrome artboards)
```
footer.footer  (grid 2fr 1fr 1fr 1fr, gap 16, top hairline, margin-top 32; inside .wrap 960)
  .footer-brand: [logo] + "Small-boat tours along the Dalmatian coast since 2015. Licensed, insured, and obsessed with the sea."
  Tours (h4):  Group tours → Tours | Private charters → PrivateBooking | Day trips → Tours | Sunset cruises → Tours
  Info (h4):   About us → About | Destinations → Destinations | FAQs → Faqs | Contact → Contact
  Legal (h4):  Terms & conditions | Privacy policy | Cancellation policy  → all Legal.dc.html
.footer-bottom: "© 2025 Hello Blue Cave" | "Licensed maritime operator · Croatia"
```
- Responsive: 2 columns at ≤768px and 1 column at ≤480px. Column headings are 12px uppercase tertiary.
- Problems:
  - **All three legal links go to the same artboard**, which always opens on Terms. On `Legal.dc.html` itself they are `href="#"` plus `onClick` placeholders that switch the tab. Map them to the three real URLs (§5).
  - "Day trips" and "Sunset cruises" both point to the unfiltered Tours page. The catalog has **no sunset tour**, although `ToursCatalog.vue` accepts `?type=sunset`. "Day trips" has no matching filter (`group`, `private`, `short`, `sunset` exist). Either rework this column or map it to `/tours/?type=group`, `/tours/create-perfect-day-private/` and so on.
  - "Private charters" points to the PrivateBooking booking flow. The current footer points to `/tours/create-perfect-day-private/`.
  - `© 2025` is hard-coded; the current footer uses the current year.
  - The h4 column headings skip levels; the current footer uses h2.
  - The design footer has **no phone, email or address**. The current footer shows tel, mailto and "Riva promenade, stand 14, Split". Keep them.
  - No company imprint (legal name, OIB, address). See §7.
  - No social links, payment logos or language switcher.
  - The brand line "Small-boat tours along the Dalmatian coast **since 2015**" conflicts with the current "Speedboat tours and private charters from Split" and with the current About timeline, which starts in **2016**. It needs owner confirmation.

---

## 3. Page specs

### 3.1 11 FAQs (`Faqs.dc.html`)
**Layout (desktop 1280, content 960):**
1. Full nav, with FAQ marked current.
2. **Hero**:
   - h1 "Frequently asked questions" at hero size, weight 500.
   - Paragraph: "Everything you need to know before you book. Can't find the answer? We're happy to help directly." (16px, secondary).
3. **Search bar** (flex, gap 8, margin-bottom 24):
   - `input type=text aria-label="Search FAQs"` with placeholder "Search — e.g. cancel, children, weather…".
   - A blue `button` (no `type`) with a search icon and the label "Search".
   - Filtering is live on every keystroke (`onChange`) and matches question **or** answer text, case-insensitive.
   - The button does nothing.
4. **Two-column layout**: `grid 200px | 1fr`, gap 24.
   - **Category nav** (`nav.cat-nav aria-label="FAQ categories"`, `position:sticky; top:76px`). It holds toggle buttons with `aria-pressed`: All (ti-list), Booking (calendar-check), Weather (cloud-storm), On board (sailboat), Guests (users), Private (crown).
     - Each button has a count pill.
     - The **All count shows the currently visible count** (after search and category filtering). Category counts are static totals, so the All count drops to 5 when you pick Booking, which is confusing. The current implementation does the same.
   - **Sections**, one per category with visible items:
     - Header: a 30px rounded icon tile (category colour) and an h2 18px.
     - Then `.faq-list`, a 1px card outline with 12px radius. Each item is a `button.faq-q aria-expanded`: question at 16px/500 plus a chevron that rotates 180° when open.
     - The answer is conditionally rendered: `.faq-a` 16px, secondary, line-height 1.6.
     - **Single-open accordion**: opening one item closes the others.
   - **No results**: a sad-face icon and "No questions match your search." Search does not reset the category, so a match in another category shows as "no results" when a category is selected.
5. **Contact band** (grey card, flex-wrap):
   - h3 "Still have a question?" with "We usually reply within a couple of hours during the season."
   - Buttons "Email us" (outline, mail icon) and "Call us" (blue, phone icon). **Both link to Contact.dc.html.**
6. Footer.

**Responsive:** at ≤768px the layout becomes one column and the category nav becomes static. It turns into a vertical stack of six full-width buttons above the questions, which is tall on phones; consider a horizontal scrolling chip row. No ≤480px rules (the current site stacks the search button at ≤480px).

**Content: 20 Qs (5 Booking, 3 Weather, 5 On board, 4 Guests, 3 Private).**

| # | Design question | Current site (`src/data/faq.ts`, 19 Qs) | Conflict / owner check |
|---|---|---|---|
| B1 | How do I book a tour? | same idea plus a "Browse tours" link | – |
| B2 | Can I cancel or reschedule my booking? 48h free; within 48h non-refundable | built from `CANCELLATION_FULL` (48h, weather refund or reschedule) plus a link to the policy | consistent |
| B3 | **Do I need to pay in full?** Group paid in full; **private 30% deposit, balance 7 days before** | not on the current site | Private charters are **quote-based** in the catalog (`PRICE_PRIVATE`) with no online deposit flow. Owner must confirm. |
| B4 | Will I receive a confirmation? Includes ref, meeting point, time, what to bring | same | – |
| B5 | Is my payment secure? **"All payments are processed by Teya"** plus 3DS | "Teya **or PayPal**" | The design omits PayPal; memory says Teya primary and PayPal secondary. |
| – | (missing) | **Where do we meet?** Riva stand 14 | keep |
| W1–W3 | Bad weather (≥4h notice, refund or rebook) · How you decide · Rain but calm sea | equivalent; W1 uses `CANCELLATION_WEATHER` | consistent with the policy |
| O1 | What should I bring? "…**Drinks are provided** — no need to bring food" | different list, no drinks claim | The catalog includes "Bottled water on board" only. |
| O2 | Food & drink: "**A welcome drink is included on all tours.** …Additional drinks can be purchased on board" | "Water is available on board…" | Owner must confirm the welcome drink and on-board sales. |
| O3 | Life jackets, all sizes, briefing | same | – |
| O4 | Do I need to know how to swim? | merged into "suitable for non-swimmers" | – |
| O5 | **Wheelchair accessible? "Our Aliskaf 37 vessels are accessible for guests with limited mobility"** | not on the current site | The boat model name is a template swap (draft: "Karaka Classic"). Speedboats are rarely wheelchair accessible. **Owner must confirm before publishing an accessibility claim.** |
| – | (missing) | Is the Blue Cave ticket included? | keep (it's in the catalog `CAVE_NOTE`) |
| G1 | Young children: "**aged 3 and above**… **Children under 3 travel free.** Private: no minimum age" | "child pricing for ages 0–17" | **Conflicts with the catalog**, which prices children 0–17 with no free under-3s. |
| G2 | Elderly or non-swimmers | equivalent | – |
| G3 | **Dogs/pets**: allowed on private, not on group | not on the current site | owner must confirm |
| G4 | Food allergy: mention in special requests | equivalent, reworded | – |
| – | (missing) | What if I get seasick? | keep |
| P1 | What's included in a private charter: "licensed captain, fuel, life jackets, **welcome drink**… choose the **boat**… add-ons during booking" | "Private vs group tours?" | Add-ons and boat choice assume the PrivateBooking flow, which doesn't exist (§6). |
| P2 | Choose my own route | same, with "Request a quote" link | – |
| P3 | How far ahead: 2 weeks July–Aug, 1 week shoulder | same | – |

**Design vs current, FAQ:**
- Visual: 16px body (current 13px), the search button in brand blue (current near-black `--color-text-primary`), the 1px card outline (current 0.5px tertiary), and answer padding `14px 14px 16px` (current `0 16px 14px`).
- The current version is better on:
  - `aria-controls` plus `hidden` answers (searchable by find-in-page if switched to `hidden="until-found"`),
  - an sr-only `role=status` result count,
  - `role="search"`,
  - links inside answers,
  - `mailto:`/`tel:` in the contact band with `aria-label`s,
  - FAQPage JSON-LD (`faqPageJsonLd`),
  - `--touch-min` on category buttons.
- Keep all of that. Restyle only.
- The homepage FAQ preview (4 Qs in v2–v4 `faqData`) uses different wording from the FAQ page answers, for example "How do I cancel or reschedule?" vs "Can I cancel or reschedule my booking?". The old project docs require a match, so generate both from `src/data/faq.ts`.

**A11y notes (design):**
- Category toggles live inside `<nav>`, but they are filters, not navigation. Use a `div role=group aria-label` instead, or keep it as the current site does.
- The search button does nothing. Remove it or give it `type=button` and make it focus the results.
- Use `type="search"`.
- No live result count.
- The answer is not linked to its question (no `aria-controls`/`id`).

### 3.2 12 Legal pages (`Legal.dc.html`): one artboard, three tabs
**Layout:**
- `.wrap` max width 680px (narrow reading column). The nav is also narrowed to 680px; see §2.2.
- **Tab bar** (`role=tablist`): three `button role=tab aria-selected`, each `flex:1`, 9px padding, 0.5px border. The active tab gets a grey background and a stronger border.
  - Labels: "Terms & conditions", "Privacy policy", "Cancellation policy".
  - The `startTab` prop (enum terms/privacy/cancel) sets the initial tab.
  - No `aria-controls`, no `tabpanel`, no arrow keys.
  - **No responsive rule**: three equal tabs at 360px wrap to two lines. The current site stacks them vertically at ≤768px.
- **legal-layout**: `grid 180px | 1fr`, gap 24. It becomes one column at ≤768px, and the side nav goes static (a vertical list above the content).
  - **Side nav** (`nav aria-label="Sections"`, sticky top 76px): six **non-interactive `<div class="side-link">`** with no hrefs. The first is always `.active` (blue left border). These are placeholders. The current site uses anchor links (`#bookings` and so on) but also hard-codes the first as active (no scrollspy).
  - **Hero**: h1 plus `.legal-meta` (14px, tertiary).
  - **Summary box** ("The short version", grey card, 5 check-circle bullets).
  - **Sections**: each has an h2 (18px, bottom hairline, blue icon) and paragraphs at 16px secondary/1.6. Optional extras:
    - `.highlight-box` (blue left bar on blue-100, bold),
    - `.warn-box` (amber bar on amber-50),
    - `.table-wrap` (overflow-x auto; th 13px uppercase; first td bold),
    - `.contact-note` (grey card with icon).
- Footer: the Legal column links are `href="#"` and switch the tab in place.

**Terms content (meta: "Last updated: 1 June 2025 · Hello Blue Cave d.o.o.").**
- Side nav: Bookings, Payment, Conduct, Liability, Safety, Governing law.
- Summary:
  - Book online, pay securely, get instant confirmation.
  - Free cancellation up to 48h.
  - Weather cancellations always get a full refund or rebook.
  - We can remove guests who endanger safety, without refund.
  - Croatian law applies.
- Sections:
  1. **Bookings**: confirmed on full payment (group) or deposit (private) plus a confirmation email; you must be 18+; changes are subject to availability and must be requested ≥48h before.
  2. **Payment**: group paid in full; private 30% non-refundable deposit with the balance 7 days before. Warn box: balance not received → the deposit is kept and the booking cancelled. "All payments are processed securely via Teya. Prices are quoted in Euros and include all applicable taxes."
  3. **Guest conduct**: crew instructions; the captain may refuse or remove guests. Warn box: no refund.
  4. **Liability**: "full public liability insurance covering all passengers"; not liable for belongings; liability for death or injury from negligence is not limited.
  5. **Safety**: "All vessels are inspected and certified in accordance with Croatian Maritime Authority requirements". The captain's decision is final.
  6. **Governing law**: Croatian law; "exclusive jurisdiction of the courts of Split-Dalmatia County". Contact note: `hello@hellobluecave.com`.

**Privacy content (meta: "Last updated: 1 June 2025 · GDPR compliant").**
- Side nav: What we collect, How we use it, Third parties, Cookies, Your rights, Contact.
- Summary:
  - We collect only what we need.
  - We never sell data.
  - "Payment details go directly to Teya".
  - Deletion on request.
  - "Essential cookies only — no ad tracking".
- Sections:
  1. **What we collect**: name, email, phone, booking details, correspondence; no card data.
  2. **How we use it**: bookings, confirmations, weather contact, enquiries. Highlight: no marketing without consent.
  3. **Third-party table**: Teya (payments) · **Google Analytics** ("anonymised, no personal data") · **Mailchimp** (confirmation emails).
  4. **Cookies table**: `session_id` (session), `csrf_token` (session), `cookie_consent` (1 year).
  5. **Rights**: access, correct and delete; complaint to AZOP; **booking data kept 5 years**.
  6. **Contact**: `privacy@hellobluecave.com`, response within 30 days.

**Cancellation content (meta: "Last updated: 1 June 2025 · Applies to all bookings via hellobluecave.com").**
- Side nav: Overview, Group tours, Private charters, Weather, Refunds, How to cancel. **"Overview" has no matching section** in the design; the current site added one.
- Summary:
  - 48h+ full refund.
  - Within 48h non-refundable.
  - Weather → refund or free rebook.
  - Private deposits non-refundable.
  - Refunds in 5–10 business days.
- Sections:
  1. **Group table**: >48h 100%; <48h 0%; no-show 0%. Highlight: medical emergency → discretionary credit or rebook.
  2. **Private table** (Notice / Deposit 30% / Balance): >14 days: non-refundable / full refund; 7–14 days: non-refundable / 50%; <7 days: non-refundable / non-refundable; no-show: same.
  3. **Weather**: refund within 5–10 business days, or a free rebook within the same season, guest's choice. Highlight: ≥4h notice.
  4. **Refunds**: to the original payment method in EUR; no FX liability.
  5. **How to cancel**: email `hello@…`, WhatsApp `+385 91 234 5678`, phone `+385 20 123 456` (**placeholder numbers**). Contact note: use email for a timestamp.

**Design vs current, Legal:**
- The current site splits the artboard into **three URLs** (`/legal/terms/`, `/legal/privacy/`, `/legal/cancellation/`) with a link-based tab bar (`nav aria-label="Legal documents"`, `aria-current="page"`). That is better for SEO, deep links from the footer, FAQ and booking pages, and screen readers. **Keep three URLs.**
- Current text differences, all improvements:
  - Terms add contracted operators (Misericordia d.o.o., Aliskaf d.o.o., Per Mare d.o.o.) and on-site fees (cave entry).
  - Payment says Teya **and PayPal**.
  - Privacy lists PayPal, "Email provider" (not Mailchimp) and Netlify, and uses `SITE_EMAIL` instead of `privacy@`.
  - Cancellation adds an Overview (partner and voucher bookings) and uses the real phone number.
  - The legal entity is `{SITE_NAME}` with no "d.o.o.".
- Shared `.legal-*` styles live in `src/styles/modules/_legal-about.css`. Tab styles are duplicated in each of the three pages; extract them to a component when restyling.

### 3.3 13 About (`About.dc.html`)
**Sections, top to bottom:**
1. Full nav, with About marked current.
2. `.hero-img`: a 200px grey placeholder with a sailboat icon (needs a real photo).
3. **Two columns**, `grid 1fr | 280px` (one column at ≤768px):
   - Left:
     - h1 "**We're small by design**".
     - Paragraph 1: "Hello Blue Cave started in **2015 with one boat, one captain**…".
     - Paragraph 2: "**Ten years later, we still cap our group tours at 12 guests. We still turn down the big agencies.** And we still take every charter ourselves, with our own captains, on our own boats…".
   - Right: a **trust grid** (2×2, one column at ≤768px) of grey tiles, each with an icon, a number and a label:
     - "**10 yrs** on the Adriatic coast"
     - "**4,200+** guests this season"
     - "**4.9 ★** avg across **800+ reviews**"
     - "**Licensed** Croatian Maritime Authority"
4. **"How we got here"**: a vertical timeline with a 0.5px rule and dots; the first and last dots are active (blue).
   - **2015** "First charter, first season": "**Marko Blažević** launches… single **restored wooden vessel**… **Sunset tours only, 8 guests max**."
   - **2017** "Second boat, island routes": "**Elafiti island route**".
   - **2019** "Private charter programme": catering and photography packages.
   - **2021** "Through the quiet years": pandemic, waitlist for 2022.
   - **2025** "Ten years on the water": "Still independent… **This year we welcomed our 20,000th guest.**"
5. **"Meet the crew"**: 3 columns of cards. Each has a 100px avatar placeholder (user-circle icon), name, an uppercase blue role and a bio.
   - **Marko Blažević**, Founder & Captain: "**Born in Dubrovnik.** Licensed… **18 years**…"
   - **Ivan Kovačević**, Captain & Guide: "Marine biologist turned sea captain."
   - **Ana Blažević**, Operations & Bookings.
6. **"What we believe in"**: 2×2 value tiles:
   - Small groups, always ("cap every tour at 12")
   - Low-impact on the sea ("**Reef-safe sunscreen required. We don't anchor on coral.** We take rubbish back to port.")
   - Local all the way ("The money stays in Split")
   - No compromise on safety
7. **"As featured in"**: 3 press cards (publication name, italic quote, date):
   - **Travel + Leisure** (Summer 2024)
   - **Condé Nast Traveller** (June 2024)
   - **The Guardian** (May 2025)
8. **CTA band** (grey, centered):
   - h2 "Come sailing with us".
   - "Group tours depart daily. Private charters available for **2–12 guests**."
   - Buttons "Browse tours" (blue → Tours) and "Plan a private charter" (outline → PrivateBooking).
9. Footer.

**Responsive:**
- ≤768px: the 2-column layout, trust grid and values all go to one column. **Crew and press become horizontal scroll-snap rows** (`flex 0 0 40%`, hidden scrollbar).
- ≤480px: cards become `flex 0 0 80%`.
- Section titles are `<p class="sec-title">`, **not headings**.

**Design vs current, About:**
- The current page (`src/pages/about/index.astro`, data `src/data/about.ts`) uses the same structure. Differences:
  - h1 "Split locals, open-sea specialists" with one intro paragraph.
  - Timeline 2016, 2019, 2022 and 2025 ("Seven tours, one harbour").
  - Crew Marko Vuković, Ana Kovač and Luka Perić (initials avatars).
  - Values: weather-first routing and local knowledge.
  - **"What guests say" guest quotes instead of press**.
  - Stats: "9 yrs", "12 max", "4.9 ★ average guest rating", "Licensed".
  - CTA "Ready to get on the water?" → `/tours/` and `/contact/?tour=create-perfect-day-private`.
- The current version is better on:
  - h2 section headings with `aria-labelledby`,
  - `blockquote` for quotes,
  - keyboard-scrollable regions on narrow screens (`data-scroll-region` plus ResizeObserver; WCAG 2.1.1).
- **Both versions' names, years and figures are unverified** (§8).
- Time-relative copy ("10 yrs", "Ten years later", "this season") goes stale; it is already wrong in 2026. Compute it from a founding year constant or avoid it.

### 3.4 14 Contact (`Contact.dc.html`)
**Sections:**
1. Full nav (no item marked current, because Contact isn't in the nav).
2. h1 "Contact us" and `.hero-sub` "Questions, special requests, or just not sure which tour is right for you — get in touch. We usually reply within a couple of hours during the season."
3. **Contact grid** (2×2, one column at ≤768px). Each card is a grey `div` with `cursor:pointer` (**not a link, not focusable**) holding a 36px icon tile, a type label, a value and a sub-line.
   - Phone (blue-100 tile): `+385 20 123 456`, "Office line — Mon to Sun, 08:00–20:00 during season".
   - WhatsApp: `+385 91 234 5678`, "Fastest response — typically within the hour".
   - Email: `hello@hellobluecave.com`, "For bookings, invoices, and detailed requests".
   - Find us (amber tile): "**Marina Pier B, Gate 3**", "Old port of Split — 5 min walk from the Riva promenade".
4. **Hours card** (grey, two flex-wrap columns, min 160px):
   - "Response hours": a static green "● **Open now**" badge; Mon–Fri 08:00–20:00; Sat–Sun 08:00–18:00. This **contradicts the phone card**, which says "Mon to Sun 08:00–20:00".
   - "Season": **May–October**, daily departures; off-season, email only. Note: "Private charters available year-round by request, weather permitting."
5. **Form card** (white, 1px outline, radius 12):
   - p "Send us a message".
   - Fields in a 2-column grid (one column at ≤768px). Labels are 13px uppercase tertiary with `for`/`id` pairs:
     - First name (`ct-first`, text, placeholder "Ivan")
     - Last name (`ct-last`, placeholder "Kovač")
     - Email (`ct-email`, `type=email`, placeholder "ivan@example.com")
     - Phone (`ct-phone`, `type=tel`, placeholder "+385…")
     - **Subject** select (full width, `ct-subject`): General enquiry, Group booking question, Private charter enquiry, Cancellation or rescheduling, Feedback or complaint, Press / media
     - Message (full-width textarea, `ct-msg`, min-height 80, vertical resize, placeholder "Tell us what you have in mind — dates, group size, any special requests…")
   - Button: "Send message →" (blue).
   - **No `<form>`, no required fields or markers, no validation, no error or success states, no privacy notice, no anti-spam, and no `name` attributes.** The logic class returns `{}`, so the form is purely static.
6. **Map stub**: a 140px grey box with a map icon and "Marina Pier B · Old port of Split — open in Google Maps" (a `div`, not a link).
7. **Marina note** (grey, info icon): "Enter the old port from the Riva promenade and follow signs for the marina. We're at Pier B, Gate 3 — look for the blue Hello Blue Cave flag. Parking is available at the nearby Riva garage, a 10-minute walk." (Template copy; Dubrovnik's version said Pile Gate and Ilijina Glavica.)
8. Footer.

**Current implementation** (`src/pages/contact/index.astro`, `src/client/contact-form.ts`, `src/pages/api/contact.ts`, `src/lib/contact-validation.ts`, `src/lib/turnstile.ts`, `src/lib/rate-limit.ts`):
- **Cards are real links**:
  - `tel:+385919888838`
  - `https://wa.me/385919888838` (new tab, `noopener`)
  - `mailto:info@hellobluecave.com`
  - `MEETING_POINT_MAP_URL` (Google Maps coordinates for Riva stand 14)
- Values come from `src/config/site.ts`. The map stub is a link and the marina note is real stand 14 copy.
- Season is **Apr–Nov**, matching the catalog low season of 1 Apr–30 Nov. The design says May–Oct, so the owner needs to confirm.
- "Open now" is **also static** on the current site, so it shows "Open now" at 03:00. Make it dynamic in Europe/Zagreb time or remove it.
- **Form**:
  - `<form id="contact-form" novalidate>` with fields `name` (single field, required, min 2 characters), `email` (required, regex `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$`, max 254), `phone` (optional, `^[\d\s+().-]{7,30}$`), `tourSlug` select ("General enquiry" plus the 7 catalog tours, validated against the catalog on the server; `?tour=` is preselected client-side because the page is prerendered), and `message` (required, 10–5000 characters).
  - "Fields marked * are required", plus `aria-required`.
  - Hidden `_startedAt` timestamp: rejects submissions in under 2s (429) or older than 24h.
  - **Honeypot** `company` (hidden, `tabindex=-1`): a silent 200 OK.
  - **Turnstile** widget plus script, rendered only when `PUBLIC_TURNSTILE_SITE_KEY` is set. The server verifies only when **both** keys are set (fail-open otherwise). The CSP already allows `challenges.cloudflare.com` (memory note: Turnstile setup is pending).
  - **Rate limit**: 5 requests per 10 minutes per IP (`x-nf-client-connection-ip`) in Netlify Blobs `rate-limits`, compare-and-swap, fail-open.
  - Body limit of 16KB, streamed. JSON only.
  - Stored with `recordEnquiry` in Blobs, which sends an admin email via Resend linking to `/admin/enquiries/`. Returns 503 on failure.
  - Client: a `role=status aria-live=polite` message; on errors it sets `aria-invalid` and `aria-describedby` and focuses the first invalid field; `aria-disabled` while sending; the Turnstile token resets after a submit; preselection is reapplied after reset.

**Gaps to adopt the design form:**
- **First and last name**: the API has a single `name` field. Either keep one "Full name" field (simpler, fewer fields) or concatenate on the client. The admin enquiry view and the email template use `name`.
- **Subject categories**: the API has only `tourSlug`. Adopting the six-topic select needs:
  - a new `topic` enum field, validated on both sides in `contact-validation.ts` plus tests,
  - storage on `Enquiry`,
  - display in `admin/enquiries.astro` and the admin email.
  
  Recommended: topic select plus an optional "Tour" select shown for group and private topics, so the `?tour=` deep links still work. Those links come from the FAQ "Request a quote", the About CTA and the tour pages.
- Keep from the current site and add to the restyle: required markers, the honeypot, the Turnstile slot, the status region, the `novalidate` client flow, and **a short privacy notice under the button** ("We use your details only to answer your message — see our Privacy policy"; GDPR Art. 13 information at the point of collection). Neither version has this notice today.
- An embedded Google map would need `frame-src` in the CSP (`netlify.toml`) plus a privacy-policy entry. Keep the link, or use a static image.

---

## 4. Cross-page link graph (all 18 artboards)

Abbreviations:
- H1 = Main (homepage v1), H2 = Main-n19w (v2), H3 = Main-n19w-fhxd (v3), H4 = Main-n19w-fhxd-j4z6 (v4)
- TO = Tours, TD = TourDetail, DE = Destinations, DD = DestinationDetail
- GB = GroupBooking, PB = PrivateBooking, BS = BookingSummary, PS = PaymentSuccess, PE = PaymentError
- FQ = Faqs, LG = Legal, AB = About, CT = Contact, AR = Artboard-qbg9

Counts include `href`s **and** artboard names inside logic data. The homepage tour cards carry `href:'GroupBooking.dc.html'`/`'PrivateBooking.dc.html'`, the destination cards point to Destinations/DestinationDetail, and the hero search `searchHref` maps group → Tours, private → PrivateBooking, transfer → Contact.

| from \ to | H1 | H2 | H3 | H4 | TO | TD | DE | DD | GB | PB | BS | PS | PE | FQ | LG | AB | CT | AR |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| H1 | · | · | 1 | · | 8 | 2 | 8 | 1 | 4 | 6 | · | · | · | 3 | 3 | 2 | 3 | · |
| H2 | · | · | 1 | · | 9 | 2 | 8 | 1 | 4 | 7 | · | · | · | 3 | 3 | 3 | 2 | · |
| H3 | · | · | 1 | · | 9 | 3 | 8 | 1 | 4 | 7 | · | · | · | 3 | 3 | 2 | 2 | · |
| H4 | · | · | 1 | · | 10 | 3 | 8 | 1 | 4 | 7 | · | · | · | 3 | 3 | 2 | 2 | · |
| TO | · | · | 1 | · | 4 | 1 | 2 | · | · | 1 | · | · | · | 2 | 3 | 2 | 2 | · |
| TD | · | · | 1 | · | 7 | · | 2 | · | 1 | 2 | · | · | · | 2 | 3 | 2 | 1 | · |
| DE | · | · | 1 | · | 5 | · | 2 | 1 | · | 1 | · | · | · | 2 | 3 | 2 | 2 | · |
| DD | · | · | 1 | · | 6 | 2 | 3 | · | · | 2 | · | · | · | 2 | 3 | 2 | 1 | · |
| GB | · | · | 1 | · | · | 1 | · | · | · | · | 1 | · | · | · | · | · | · | · |
| PB | · | · | 1 | · | · | 1 | · | · | · | · | 1 | · | · | · | · | · | · | · |
| BS | · | · | 1 | · | · | · | · | · | 1 | 2 | · | 1 | · | · | · | · | · | · |
| PS | · | · | 1 | · | 1 | · | · | · | · | · | · | · | · | · | · | · | · | · |
| PE | · | · | 1 | · | 1 | · | · | · | · | · | 1 | · | · | · | · | · | 1 | · |
| FQ | · | · | 1 | · | 5 | · | 2 | · | · | 1 | · | · | · | 2 | 3 | 2 | 3 | · |
| LG | · | · | 1 | · | 5 | · | 2 | · | · | 1 | · | · | · | 2 | ·¹ | 2 | 1 | · |
| AB | · | · | 1 | · | 6 | · | 2 | · | · | 2 | · | · | · | 2 | 3 | 2 | 1 | · |
| CT | · | · | 1 | · | 5 | · | 2 | · | · | 1 | · | · | · | 2 | 3 | 2 | 1 | · |
| AR | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · | · |

¹ On Legal, the three footer legal links are `href="#"` with `onClick` that switches the tab.

**Inbound (orphans in bold):**
- H1, H2, H4: **none.** They are alternative explorations; every logo links to H3.
- H3: linked from every other artboard (logo).
- TO: 13 sources. TD: H1–4, TO, DD, GB, PB. DE: 11. **DD: only H1–4 (the Hvar card) and DE (every card goes to Hvar).**
- GB: H1–4 (tour cards), TD, BS. PB: 13 sources (footer "Private charters"). BS: GB, PB, PE. PS: BS only.
- **PE: none.** Payment error is unreachable in the prototype; it would be reached from the payment provider redirect.
- FQ, LG, AB, CT: reached from the nav and footer.
- **AR: none.**

**Non-artboard links and placeholders:**
- `#` × 3: Legal footer (tab-switch placeholders).
- `#td-book` (TourDetail mobile "Book now" scroll) and `#dd-tours` (DestinationDetail "See tours" scroll): in-page anchors, OK.
- `https://example.com/blue-cave-tickets`: TourDetail "Ticket prices (opens in a new tab)". **Placeholder external URL.**
- `mailto:help@hellobluecave.com` (GB, PB, BS, PS, PE trust strip), `mailto:hello@hellobluecave.com` and `mailto:privacy@hellobluecave.com` (Legal). **Three different unconfirmed addresses**; the site uses `info@`.
- **Clickable-looking elements that are not links:**
  - Contact: the four contact cards and the map stub (`cursor:pointer` divs).
  - Legal: the six side-nav `div`s per tab.
  - FAQ: the search button (does nothing).
  - Every page: the hamburger (no handler).
  - FAQ contact band: "Email us" and "Call us" both go to Contact instead of `mailto:`/`tel:`.
- **Imprecise targets:**
  - Every tour card goes to the same TourDetail.
  - Every destination card except Hvar goes to the Destinations overview, not a detail page.
  - Footer "Day trips" and "Sunset cruises" go to the unfiltered Tours.
  - Footer legal links don't pick a tab.
  - The homepage hero search "transfer" type goes to Contact.

---

## 5. Sitemap: design artboard → proposed URL (keep the current routes)

| Design artboard | Proposed URL | Current file | Notes |
|---|---|---|---|
| H3 or H4 (01 Homepage; owner picks; H1 and H2 are superseded) | `/` | `src/pages/index.astro` | The logo targets H3, but H4 is the newest title. |
| 02 Tours overview | `/tours/` (+ `?type=group\|private\|short\|sunset`, `?destination=`, `?q=`) | `tours/index.astro` + `ToursCatalog.vue` | The footer "Day trips" and "Sunset cruises" links can use query filters (no sunset tours exist). |
| 03 Tour detail | `/tours/[slug]/` (7 slugs) | `tours/[slug].astro`, `components/tour/TourDetailView.astro` | Replace the `example.com` ticket link. |
| 04 Destinations overview | `/destinations/` | `destinations/index.astro` + `DestinationsCatalog.vue` | – |
| 10 Destination detail (Hvar) | `/destinations/[slug]/` (10 slugs: blue-cave, vis, hvar, pakleni, blue-lagoon, split, zlatni-rat, trogir, korcula, dubrovnik) | `destinations/[slug].astro` | The design shows Hvar only; the template applies to all. |
| 05 Group booking | `/book/[slug]/group/` | `book/[slug]/group.astro` + `GroupBookingFlow.vue` | – |
| **06 Private charter** | **`/book/[slug]/private/`** (new; the old docs suggested this path) | **none**. Private charters currently go through `/contact/?tour=create-perfect-day-private` | **New page.** It needs owner decisions on deposits and add-ons (§8). |
| 07 Booking summary | `/book/[slug]/review/` | `book/[slug]/review.astro` | – |
| (no design) | `/booking/pay/` | `booking/pay.astro` (showcase mock checkout, `PAYMENTS_ARE_DEMO=true`) | Real Teya/PayPal later. |
| 08 Payment success | `/booking/success/` | `booking/success.astro` | – |
| 09 Payment error | `/booking/error/` | `booking/error.astro` | – |
| 11 FAQs | `/faq/` | `faq/index.astro` + `vue/FAQPage.vue` + `data/faq.ts` | – |
| 12 Legal (3 tabs) | `/legal/terms/`, `/legal/privacy/`, `/legal/cancellation/` | `legal/*.astro` | **Keep three URLs.** Don't move them to `/terms` and similar as the 2025 docs suggested; the current URLs are live and linked from the FAQ and footer. |
| 13 About | `/about/` | `about/index.astro` + `data/about.ts` | – |
| 14 Contact | `/contact/` (+ `?tour=<slug>`) | `contact/index.astro` | – |
| Artboard-qbg9 | – | – | Empty leftover. |

**Current pages with no design:**
- `404.astro`: compass-off icon, "Page not found", "Browse all tours" and "Return home", `noindex`.
- `NotFoundPanel.astro`: inline not-found panel used by `tours/[slug].astro` for unknown slugs.

  Restyle both with the new tokens. The design has no 404, so the full chrome plus a centered panel is enough.
- `booking/details.astro`: noindex info page, "What we need to book your tour", using the legal-page styles. It has no design; apply the legal template.
- `booking/pay.astro`: the demo checkout.
- `admin/*`: login, index, bookings list and detail, emails list and detail, enquiries, tools, `export.csv`, logout. Uses `AdminLayout`. Out of scope for the public redesign.
- `api/bookings.ts`, `api/contact.ts`, `robots.txt.ts`, `site.webmanifest.ts`: no UI.
- Destination detail pages for nine destinations other than Hvar, and tour detail pages for seven tours. They share one template each, so the design covers them by template.

**Design pages or features that don't exist yet:**
- `/book/[slug]/private/` (06 Private charter flow).
- Language versions (HR, DE, IT, FR), from the switcher on homepage v2–v4.
- Homepage hero search "Transfer" trip type (points to Contact; there is no transfer product page; "Dubrovnik One Way" is the closest).
- A press section on About ("As featured in"); the current site uses guest quotes.
- A dynamic "Open now" badge (static in both).

---

## 6. Comparison with the older drafts (`new-pages-design/11–14`)

- The drafts are the same layouts **without the nav or footer** (the drafts have no `.nav-bar` or `<footer>`), with "Adriatic Sails" branding in Dubrovnik. `00-project-docs.md` (June 2025) lists the fleet as "Karaka Classic (8) / Dubrovnik Star (12)", pricing at Adult €95 / Child (3–12) €55 / under 3 free, and a content-to-write table in §5.
- Changes in the new artboards are mostly find and replace:
  - Brand → Hello Blue Cave; Stripe → Teya; `adriaticsails.com` → `hellobluecave.com`.
  - Dubrovnik → Split (contact directions, "money stays in Split", and Split-Dalmatia courts in place of Dubrovnik-Neretva).
  - "Karaka Classic" → "Aliskaf 37".
  - FAQ, Legal and nav are now data or state driven in the DC logic.
  - Shared `hbc.css` chrome was added.
- **Unchanged template content that is still wrong for HBC:**
  - "Born in Dubrovnik" in Marko's bio.
  - The 2017 "Elafiti island route".
  - "Restored wooden vessel / sunset tours only".
  - The press quotes.
  - "Marina Pier B, Gate 3".
  - The placeholder phone numbers.
  - The FAQ "children under 3 travel free" (it matches the old template pricing, not the HBC catalog).
- The docs' contact subject list (general, group booking, private charter, existing booking change/cancel, weather cancellation, other) differs from the artboard's six options (…feedback or complaint, press / media).
- The docs say legal pages are "design templates, not legal documents. Review with a Croatian maritime/consumer law lawyer before launch", and that "Cancellation policy wording must match exactly… the FAQ, the booking summary page, and the payment success email". Both still apply (§7).

---

## 7. Legal and compliance issues (design **and** current site unless noted)

**Company and imprint**
- No legal entity details anywhere: full company name and form, OIB, registered address, court register (Trgovački sud / MBS), and share capital and director if it's a d.o.o.
  - The Croatian e-commerce law (Zakon o elektroničkoj trgovini) and the Companies Act require these on the website. Business letters and invoices also need them.
  - Add an imprint to the footer or Terms and to the confirmation email.
- The design says "**Hello Blue Cave d.o.o.**". The current Terms instead name contracted operators (**Misericordia d.o.o., Aliskaf d.o.o., Per Mare d.o.o.**) "depending on boat and season". The owner must confirm who the contracting party and data controller are.
- "Licensed maritime operator · Croatia" (footer and trust strip) and "inspected and certified in accordance with Croatian Maritime Authority requirements": confirm the exact licence, the authority (e.g. Lučka kapetanija Split / Ministry of the Sea) and the numbers.

**Terms**
- **Payment methods:** the design says Teya only. Memory and the current site say Teya plus PayPal. Use the current text.
- "Prices… include all applicable taxes": the catalog disclaimer says VAT was "under review by the operator". Confirm.
- Private charter 30% non-refundable deposit and the 7-day balance: there is no such flow today (private is quote-only), so confirm the policy before publishing it.
- "Full public liability insurance covering all passengers": confirm the insurer and cover.
- "Exclusive jurisdiction of the courts of Split-Dalmatia County": consumer jurisdiction rules (EU 1215/2012 Arts. 17–19) generally prevent a forced forum for EU consumers. The text also lacks consumer complaint handling (ZZP: written complaints, reply deadline) and ADR information. The EU ODR platform was shut down in July 2025, so don't add an ODR link. **Lawyer review needed.**
- **No terms acceptance or pre-contract info step** in the booking flow. The designs (GroupBooking, BookingSummary) and the current `book/[slug]/review.astro` have no "I agree to the Terms & Cancellation policy" text or links before payment. Add at least a line with links next to the pay button (lawyer to confirm the exact form).
- "Last updated: 1 June 2025": stale. Update it when the texts change.

**Privacy (GDPR)**
- **The controller is never identified** (name, address, OIB, contact). GDPR Art. 13 also requires legal bases (Art. 6: contract, legal obligation, legitimate interest for anti-spam and rate limiting), recipients, international transfers (Resend and Netlify are US-based: SCCs or the DPF), retention per category, and the rights to object, portability and withdrawal of consent. None of these are present.
- **"GDPR compliant"** in the meta line is an unsupported claim. Remove it.
- **The processor list is wrong:**
  - Google Analytics: listed but **not used**. No gtag exists, and the CSP `script-src 'self' … challenges.cloudflare.com` would block it. Its description ("anonymised, no personal data") is also inaccurate.
  - **Mailchimp** (design): not used. Email goes through **Resend** (`src/lib/email/send.ts`).
  - Missing in the design: **PayPal**, **Netlify** (hosting plus Blobs storage of bookings, enquiries and rate-limit IP keys) and **Resend**.
  - Missing in both: **Cloudflare Turnstile**, which processes IP and device signals once enabled. **WhatsApp/Meta** applies if guests use it, and Google Maps is only a link.
- **The cookie table is fictional**: `session_id`, `csrf_token` and `cookie_consent` don't exist, and there is no cookie banner. The only cookie in the code is `hbc_admin` (admin login, staff only). Turnstile may use its own challenge storage. Rewrite this as "no cookies for visitors; one strictly necessary cookie for staff login". No consent banner is needed unless analytics are added.
- **"Booking data kept 5 years for Croatian financial record-keeping"**: Croatian accounting law generally requires accounting documents to be kept longer (commonly 11 years). Confirm with the accountant, and separate booking/invoice data from contact-form enquiries, which should have a short retention.
- Privacy contact: the design uses `privacy@hellobluecave.com`, the current site uses `SITE_EMAIL` (info@). The 2025 docs say "needs a real AZOP registration number and a dedicated privacy@ email". Croatian controllers don't register with AZOP, so drop the "AZOP registration" idea. A privacy@ mailbox is optional; confirm it exists before using it.
- The contact form lacks a privacy notice at the point of collection (§3.4).

**Cancellation consistency (source of truth: `src/config/cancellation.ts`)**
- The **48h / non-refundable within 48h / weather ≥4h notice → full refund or rebook within the season** wording matches between the design legal page, the current legal pages, `CANCELLATION_*`, the FAQ, `review.astro` and `success.astro`.
- **Mismatches:**
  - The PaymentSuccess design says "We'll email you **24h** before departure if conditions change". The policy says ≥4h. The current success page uses `CANCELLATION_WEATHER` (4h), which is correct, so don't port the design copy.
  - The booking confirmation email (`src/lib/email/templates.ts:150`) says "In case of bad weather we **may** reschedule or refund — we'll contact you directly". That is weaker than the policy ("your choice" of full refund or rebook). The email also has **no cancellation terms or link**. Consider linking `/legal/cancellation/` and reusing `CANCELLATION_SHORT`/`CANCELLATION_WEATHER`.
  - The legal pages still hard-code 48h and 4h (`cancellation.ts` admits it isn't wired to them). If the pages are rebuilt, render the figures from the config.
- The design's "How to cancel" uses placeholder phone numbers and `hello@`; the current page uses real ones. Its WhatsApp line has no number (implied to be the same as the phone). Fine.
- With `PAYMENTS_ARE_DEMO=true`, the refund and payment statements describe a system that isn't live. That's acceptable for the showcase, but publish real payment terms only with real payments.

---

## 8. Needs owner confirmation (claims and facts in the designed copy)

| Claim | Where | Current site says |
|---|---|---|
| "since 2015" / "10 yrs on the Adriatic coast" / "Ten years later" / "Ten years on the water" | Footer brand (all pages), About | 2016 founding, "9 yrs operating from Split" |
| "4,200+ guests this season" | About trust grid | – |
| "**20,000th guest**" this year | About timeline 2025 | – |
| "**4.9 ★** avg across **800+ reviews**" | About; also homepage "from 800+ reviews", per-tour ratings like "4.9 (128)" | "4.9 ★ average guest rating" (no count). Needs a verifiable source (Google, TripAdvisor) or removal. |
| Press quotes: **Travel + Leisure (Summer 2024), Condé Nast Traveller (June 2024), The Guardian (May 2025)** | About "As featured in" | Not present. **Template fabrications. Never publish without proof** (misleading commercial practice). |
| Guest quotes "Sarah & James", "Elena M.", "Thomas R." | current About only | also unverified placeholders |
| Founder **Marko Blažević**, "born in Dubrovnik", "licensed captain 18 years"; **Ivan Kovačević** (marine biologist); **Ana Blažević** | About crew and timeline | Marko Vuković, Ana Kovač, Luka Perić (also unverified). Real names, bios and photos need consent. |
| Timeline: restored wooden vessel, sunset tours only, 8 max (2015); second boat plus **Elafiti** route (2017); private programme with catering and photography (2019); pandemic waitlist (2021) | About | different 2016/2019/2022/2025 story |
| "Cap every tour at 12 guests"; "Private charters for 2–12 guests"; "Group tours depart daily" | About, homepage "Max 12 guests" | "12 max guests per group tour" |
| "We still turn down the big agencies" / "take every charter ourselves, own captains, own boats" | About intro | Current Terms mention contracted operators (Misericordia, Aliskaf, Per Mare) and partner/voucher bookings, which **contradicts this** |
| "Reef-safe sunscreen required. We don't anchor on coral." | About values | – |
| "Licensed / insured / Croatian Maritime Authority" | About, footer, Terms | same |
| "Aliskaf 37 vessels are accessible for guests with limited mobility" | FAQ | not claimed |
| Welcome drink on every tour; drinks for sale on board | FAQ | water only (catalog) |
| Children 3+ only on group tours; under 3 free | FAQ | child price 0–17 (catalog) |
| Small dogs allowed on private charters, not on group tours | FAQ | – |
| 30% deposit, balance 7 days before (private) | FAQ, Terms, Cancellation | Same in the current Terms and Cancellation, but no deposit flow exists |
| Phone `+385 20 123 456`, WhatsApp `+385 91 234 5678`, `hello@`/`privacy@`/`help@` | Contact, Legal, booking trust strip | `+385 91 988 88 38`, `info@hellobluecave.com` |
| "Marina Pier B, Gate 3, blue flag, Riva garage parking" | Contact, PaymentSuccess, BookingSummary | Riva promenade, stand 14 (owner's map pin) |
| Response hours Mon–Fri 08–20, Sat–Sun 08–18 vs "Mon to Sun 08:00–20:00" | Contact (self-contradictory) | same contradiction |
| Season May–October vs Apr–Nov | Contact | Apr–Nov |
| "We usually reply within a couple of hours" / WhatsApp "within the hour" | FAQ band, Contact | same |
| Legal entity "Hello Blue Cave d.o.o." | Terms meta | not stated |
| Courts of Split-Dalmatia County; 5-year retention; refunds in 5–10 business days | Legal | same |

---

## 9. Accessibility summary for the design (fix during the port)

- **Focus:** `outline:none` on form controls and buttons in `hbc.css`, with no `:focus-visible` replacement. Keep the site's global focus ring.
- **Non-semantic clickables:** contact cards, the map stub and the legal side-nav items are `div`s. Make them `a` with real hrefs.
- **Hamburger:** no `aria-expanded`/`aria-controls` and no menu. Use the current Header pattern.
- **Active nav item:** class only. Add `aria-current`.
- **Headings:**
  - About section titles are `<p>`; use h2.
  - Footer column headings are h4 after h1/h2; use h2 (as now) or a styled `p`.
  - The FAQ contact band uses h3 directly after h2 sections. OK.
- **Legal tabs:** ARIA tabs without panels or arrow keys. Replace them with a link nav to three URLs (current approach).
- **FAQ:**
  - Filters sit inside `<nav>`.
  - No `aria-controls`.
  - No live result count.
  - A no-op button.
  - Use `type=search`.
- **Contact form:**
  - No `<form>`, no `name`s, no required semantics, no error association, no status region, no autocomplete tokens. The current site has `autocomplete="name|email|tel"`.
  - Uppercase 13px labels at tertiary `#6b6b6b` are about 5.3:1 contrast, which passes.
- **Horizontal scroll rows** (About crew and press at ≤768px): hidden scrollbar and not keyboard-reachable. The current site's `data-scroll-region` script fixes this.
- **Decorative icons:** correctly `aria-hidden` throughout. The "4.9 ★" glyph is read aloud, so prefer "4.9 out of 5" text or `aria-label`.
- **Static "Open now":** wrong information outside hours, which is also a trust issue.
- **Typography:** the 16px body (vs the current 13px) is a clear readability win; adopt it.

---

## 10. Recommendations for the build (content pages and chrome)

1. Port the **visual layer only** (tokens, 16px body, hero-size h1, 1px card outlines, blue CTAs) into the existing components:
   - `Header.astro`, `Footer.astro`, `MiniNav.astro`, `TrustStrip.astro`, `FAQPage.vue`, `legal/*.astro`, `about/index.astro`, `contact/index.astro`, `404.astro`, `NotFoundPanel.astro`.
   - Keep all current behaviour, a11y, JSON-LD, config-driven contact data and the anti-spam stack.
2. **Header:** use "Book now" → `/tours/` as the single CTA, keep the Contact link, keep the mobile overlay, and ignore the per-page CTA variants. Decide on the language switcher separately; if deferred, don't render a non-functional switcher.
3. **Footer:**
   - Use design structure and headings: Tours, Info, Legal.
   - Legal links go to the three real URLs.
   - Tours column uses real targets (`/tours/?type=group`, `/tours/create-perfect-day-private/`, `/tours/?type=short`, or specific tours). Drop "Sunset cruises" unless a sunset product exists.
   - Keep the contact line and add a company imprint once confirmed.
   - Use a dynamic year.
4. **FAQ:** keep `src/data/faq.ts` as the source and also generate the homepage preview from it. Decide which design-only questions to add (pay in full, swimming, accessibility, pets, private inclusions) only after the owner confirms the facts in §8.
5. **Legal:** keep three URLs and extract a shared `LegalTabs` component. Rewrite Privacy (controller, legal bases, the real processors Teya, PayPal, Resend, Netlify and Turnstile, real cookies, retention) and add the imprint and consumer complaint/ADR text. **Lawyer review before launch.** Wire the 48h/4h figures to `src/config/cancellation.ts`.
6. **About:** keep the current data-driven page, swap in the visual style, and replace all figures and names with owner-confirmed facts. Use guest quotes, or nothing, instead of press. Derive "years" from a founding-year constant.
7. **Contact:**
   - Adopt the design layout but keep the current form pipeline.
   - Add a `topic` field to the API, validation and admin only if the owner wants routing.
   - Keep the single name field, or combine first and last name on the client.
   - Add a privacy notice.
   - Make "Open now" dynamic or drop it.
   - Fix the hours contradiction.
   - Turnstile is still pending (see the memory note: fix the CSP first, then set the keys; the CSP already allows `challenges.cloudflare.com`).
