# Review B: design fidelity of 07-IMPLEMENTATION-SPEC.md

Reviewer: adversarial, read-only. Baseline: the owner said the design is "how the website should finally look". A deviation counts as justified only if it rests on a business fact, accessibility, security or legal reason, and it should carry a [DEVIATE] label.

Evidence paths are relative to the design export `project/`. "Main v4" means `Main-n19w-fhxd-j4z6.dc.html`.

Severity: **major** means a visible or structural departure from the design, or a wrong value that changes the look across many pages. **minor** means a local value, copy or description error.

Summary: 41 findings (14 major, 27 minor). The biggest problems:
- the spec keeps the current site's chrome: Contact as a fifth nav link, hide-on-scroll, the footer contact block;
- it forces 44px controls where the design uses 28–38px and AA only needs 24px;
- the legal width token is misread;
- About page values are wrong;
- the destination highlights marquee is dropped;
- the gold gradient and several hbc.css tokens are missing.

One check came back clean. Removing Best time and Also nearby (D-11) is correct: `DestinationDetail.dc.html` has neither section, and the spec keeps the design's "Best season" stat (line 175).

---

## A. Site chrome (header, footer, booking chrome)

### 1. major: §1 D-2 and §5.1 add "Contact" as a fifth nav link the design doesn't have (not marked [DEVIATE])
- **Finding.** All 13 boards with a full nav show exactly four links: Tours, Destinations, About, FAQ. The Contact board itself has no `current` link, because Contact isn't in the nav. The spec keeps the current site's fifth link with no business, a11y or legal reason. Contact is still reachable from the footer Info column and, per the design, from the right-hand slot on photo-hero pages (see #2).
- **Evidence.**
  - Main v4:459-464, Tours.dc.html:101-106, Contact.dc.html (nav block, no `current`).
  - A grep over every board returns the same four links.
- **Proposed text (§5.1 Structure).** "Logo · links **Tours, Destinations, About, FAQ** (14px secondary, gap 18px; current page primary/500) · right slot per D-2. **[DROP]** Contact as a nav link (design); Contact stays in the footer Info column and in the overlay-page right slot."
- **Proposed text (D-2).** Replace "Keep Contact as the fifth nav link" with "Nav has four links, as designed."

### 2. major: §1 D-2 puts "Book now → /tours/" on every page, so the Tours page links to itself and the design's per-variant slot is lost
- **Finding.** The boards aren't random; they follow a rule:
  - Overlay (photo-hero) pages put an **outline "Contact"** button in the slot: Tours:107, Destinations:83, home v1 `Main.dc.html`.
  - Solid pages put a **solid "Book now"**: TourDetail:160, DestinationDetail:116, Faqs, Legal, About, Contact.
  - Home v2–v4 hold the language switcher there, which D-3 drops.

  With the spec's default, `/tours/` shows a "Book now" that points at `/tours/`.
- **Evidence.**
  - Tours.dc.html:19-22 and :107: outline CTA styles plus `href=Contact`.
  - Main v4:30-33: the same outline override is still present in v4.
- **Proposed text (D-2).** "**Overlay pages (home, Tours, Destinations):** outline 'Contact' → `/contact/` (white outline `rgba(255,255,255,.75)` on photo; once solid, 1px `--color-border-primary` outline with dark fill on hover; padding 5px 14px). **Solid pages:** solid blue 'Book now' → `/tours/` (padding 6px 14px, radius 8, hover opacity .88). Home uses the overlay rule, because the language switcher isn't rendered (D-3)."

### 3. major: §5.1 "Scroll behaviour [KEEP] hide on scroll-down" keeps the current site's behaviour against the design (not marked [DEVIATE])
- **Finding.** In the design:
  - the overlay nav is `position:fixed` and only changes to `is-solid` after 40px (Main v4:26, :54, :711);
  - the solid nav is `position:sticky; top:0` (hbc.css:193-194).

  Neither one ever hides. "Saves space on phones" is a preference, not a business, a11y or legal reason.

  It also breaks design measurements. The sticky asides and FAQ/legal TOCs use `top:76px`, which is header height plus 16 (TourDetail:53, DestinationDetail:69, Faqs:21, Legal side-nav). If the header hides, those leave a 60px empty gap, or they have to track the header state.
- **Proposed text.** "**Scroll behaviour [CHANGE]:** the header never hides. Overlay variant: fixed, transparent, `is-solid` after 40px (transition background/border/shadow .3s). Solid variant: `position:sticky; top:0`. Remove the hide-on-scroll script."
- If the owner wants hide-on-scroll anyway, make it decision D-21 and mark it [DEVIATE] with that reason.

### 4. major: §5.2 footer "[DEVIATE: keep contact block]" has no reason; the design footer has no contact block
- **Finding.**
  - The design's footer brand cell is logo plus one paragraph (max-width 240px), on every board.
  - The current site's tel, mailto and address block is kept with an empty justification.
  - EU e-commerce information duties are met by the Contact page and the imprint (D-18). They don't need the footer.
  - The spec also changes the Tours column: "Day trips" becomes "Half-day trips" and a fourth "All tours" link is added. Only dropping "Sunset cruises" has a business reason (no such product).
- **Evidence.** Main v4:694-695; hbc.css:219 (`.footer-brand p` max-width 240px, margin 6px 0 0).
- **Proposed text (§5.2).**
  - "Brand: logo + one-line blurb (≤240px). **No contact block** (design). If the owner wants one for trust, record it as D-21."
  - "Tours: Group tours → `/tours/?type=group` · Private charters → `/private-charter/` · Day trips → `/tours/` · ~~Sunset cruises~~ [DROP: no product]."

### 5. minor: §5.2 footer values missing or wrong
- **Finding.**
  - "≤768px: 2 columns (brand spans both)": the design doesn't span the brand; it's a plain `1fr 1fr` (hbc.css:230).
  - Missing values:
    - column h4: 12px/500, margin-bottom 10px;
    - links: 14px/1.5 secondary, margin-bottom 8px, hover primary;
    - footer-bottom: margin-top 16, padding-top 14, 0.5px top hairline, `space-between`, wrap, gap 8, 14px tertiary (hbc.css:220-223).
  - Footer top margin per page:
    - home: 0, after a CTA band that has margin-bottom 48 (Main v4:410, :693);
    - Tours: `--sec-gap` (Tours:175);
    - Destinations: 56px (Destinations:129);
    - detail pages: 0, after `.layout` margin-bottom `--td-sec` (TourDetail:56);
    - everything else: hbc default 32px (hbc.css:216).
- **Proposed text.** Add these values. Change the ≤768 rule to "2 equal columns (brand in the first cell)", or mark the brand-span as [DEVIATE] with a reason.

### 6. minor: §5.1 header details missing
- **Finding.** Missing values:
  - link gap 18px (hbc.css:203);
  - logo icon 18px (`--font-size-lg`), gap 7px (hbc.css:201-202);
  - on-photo link colour `rgba(255,255,255,.88)` → `#fff` on hover and current (Tours:17-18);
  - Book now hover `opacity:.88` (hbc.css:212);
  - overlay CTA hover: white fill with `#0a2a40` text (Main v4:33).

  If the Book now button stays on home, the v4 desktop grid `1fr auto 1fr` with centred links (Main v4:35) exists only for the language switcher. Say explicitly that home uses `space-between` like the other boards.
- **Proposed text.** Add these values to the §5.1 table.

### 7. minor: §5.3 MiniNav "Exit" deviation: correct but cite the design's own style
- **Finding.** The Exit link is justified, but it isn't foreign to the design. hbc.css:239-240 already defines `.exit-link` (14px secondary, gap 5px, hover primary) as part of "Variant 2: minimal booking-flow nav". Also missing: `.mini-nav` margin-bottom 20px (hbc.css:238).
- **Proposed text.** "MiniNav: logo + Exit link styled as hbc `.exit-link` (14px, secondary → primary on hover, `ti-x` or `ti-arrow-left` gap 5px); bar margin-bottom 20px. [DEVIATE: boards omit it; checkout needs an exit]."

---

## B. Tokens (§4) vs hbc.css

### 8. major: §4.2 is missing hbc.css semantic tokens the spec itself uses
- **Finding.** §5.1 says the logo icon is "in `--color-brand`", but §4.2 never defines `--color-brand`. Also missing:
  - `--color-brand-dark`;
  - `--color-text-highlight` (blue-900);
  - `--color-background-highlight` (blue-500) and `--color-background-highlight-soft` (blue-100);
  - `--color-border-highlight` (blue-500);
  - `--font-size-icon-hero: 3.5rem`.

  The boards use these: `.tc-btn:hover` uses the `-highlight` family (hbc.css:287), legal `.highlight-box` uses `-highlight-soft` (Legal:35), and `.lang-check` / `.hs-toggle` use `--color-brand-dark`. Without them, implementers will invent mappings.
- **Evidence.** hbc.css:83-95, :128.
- **Proposed text (§4.2, add rows).**
  - `--color-brand` / `--color-brand-dark` → blue-500 / blue-900;
  - `--color-text-highlight` → blue-900;
  - `--color-background-highlight` / `-highlight-soft` → blue-500 / blue-100;
  - `--color-border-highlight` → blue-500;
  - §4.3: `--font-size-icon-hero` → 3.5rem.

### 9. major: §4 has no tokens for the design's gold gradient, so §6.1.6 flattens it
- **Finding.** The private card's badge ("Just you on board") and its icon circle use `linear-gradient(135deg,#FBDD84 0%,#F2BC3A 100%)` (Main v4:335, :343; Tours:66, :74). §6.1.6 calls it a "gold gradient" but maps it to `--color-premium-solid`, which is flat `#F5C443`. Non-negotiable #8 (no raw hex) then forces the flat colour, so the most recognisable "premium" accent changes.

  Other design raw values with no token:
  - glass `rgba(8,28,48,.42)` / `.62` (chips, hero arrows);
  - photo overlays `rgba(6,24,40,…)`;
  - hero dot progress `#F2662B`;
  - lightbox backdrop `rgba(4,14,24,.94)`.
- **Proposed text (§4.1/§4.2).**
  - `--palette-gold-gradient-start: #fbdd84`, `--palette-gold-gradient-end: #f2bc3a`, and `--color-premium-gradient: linear-gradient(135deg, var(--palette-gold-gradient-start), var(--palette-gold-gradient-end))` (badge and icon circle; text `--color-premium-on-solid`).
  - `--color-glass-dark: rgba(8,28,48,.42)`, `--color-glass-dark-hover: rgba(8,28,48,.62)`, `--palette-orange-500: #f2662b` (`--color-progress`, decorative), `--color-lightbox-backdrop: rgba(4,14,24,.94)`.

### 10. minor: §4.3 display sizes don't match the design's mobile caps
- **Finding.**
  - Home hero: 80px above 768 and `clamp(44px,12vw,64px)` at ≤768 (Main v4:227, :434). The spec's `clamp(2.75rem,12vw,5rem)` allows 72px at 600px.
  - Tours and Destinations heroes: 72px above 768 and `clamp(44px,12vw,60px)` at ≤768 (Tours:32, :89). The spec allows up to 72px on phones and tablets.
  - Line heights: section titles use 1, not .94; the CTA band h2 uses .96 (Main v4:265, :412).
- **Proposed text.**
  - `--font-size-display-xl`: 5rem above 768px, `clamp(2.75rem, 12vw, 4rem)` at ≤768.
  - `--font-size-display-lg`: 4.5rem above 768px, `clamp(2.75rem, 12vw, 3.75rem)` at ≤768.
  - Line height: hero titles .94; section titles 1; CTA band h2 .96. Letter-spacing −.02em on heroes, −.01em on section titles.

### 11. minor: §4.4 shadows and radii missing values the boards use
- **Finding.** Missing values:
  - type-card hover `0 8px 28px rgba(0,0,0,.06)` (Main v4:337), which differs from `--shadow-card-hover`;
  - gallery count pill `0 2px 8px rgba(0,0,0,.15)` (TourDetail:21);
  - CTA-band buttons `0 8px 24px rgba(0,0,0,.2)` and radius **10px**, height 40 (Main v4:415-417);
  - play disc `0 8px 24px rgba(194,65,12,.35), 0 0 0 8px rgba(255,255,255,.18)` → hover `0 10px 28px …, 0 0 0 12px rgba(255,255,255,.22)` (Main v4:395-397);
  - pill-ish tags radius 20px (TourDetail:40).
- **Proposed text.** Add `--shadow-card-hover-lg`, `--shadow-pill`, `--radius-btn-sm: 10px`, and note the play-disc shadow pair.

### 12. minor: §3.3 / §4.3 font stack adds Roboto and Arial without [DEVIATE]
- **Finding.** hbc.css:147 is `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`. Adding Roboto changes rendering on Android and Linux. It's defensible (it matches the current site), but it should be labelled.
- **Proposed text.** "[DEVIATE] add `Roboto, Arial` before `sans-serif`: keeps Android rendering identical to today; the design's stack falls back to the platform default."

### 13. major: §2.1 and §11.12 force `--touch-min` (44px) on chips, steppers and booking controls; AA requires 24px, and the design uses 28–38px
- **Finding.** WCAG 2.2 AA 2.5.8 (Target Size, Minimum) is 24×24px; 44px is AAA (2.5.5). So the 44px rule isn't an AA requirement, and it isn't marked [DEVIATE]. It changes the look of many components.

  | Design control | Size | Evidence |
  |---|---|---|
  | Filter chips | 38px | Tours:35, Destinations:35 |
  | Steppers | 28px | GroupBooking:58, PrivateBooking:28 |
  | Calendar nav | 28px | GroupBooking:30 |
  | Calendar days | 36px | GroupBooking:34 |
  | Slider arrows | 36px | Main v4:274 |
  | Pill links | 36px | Main v4:277 |
  | Small FAQ/contact buttons | ~31px | Faqs |
- **Proposed text (§11.12).** "Target size: ≥24×24px everywhere (WCAG 2.5.8 AA). **Visual sizes follow the design** (chips 38, steppers 28, calendar nav 28, day cells 36, slider arrows and pills 36). Where a control sits closer than 24px to another, extend the hit area with padding or `::before` without changing its visual size. `--touch-min` (44px) applies only to the hamburger, the mobile menu links and the mobile action bar CTA."
- In §2.1, change "primary controls use `--touch-min` (44px)" to match.

---

## C. Homepage (§6.1, Main v4)

### 14. major: §6.1.5 / §3.2 TourCard: in the slider the design deliberately makes cards **not** links and turns off card hover
- **Finding.** Main v4:284-287 has the comment "Cards in the slider aren't links: only the buttons react; desktop can drag the row":
  - the hover border, shadow, image scale and blue `tc-btn` are all disabled inside `.slider-track`;
  - the only link is the "View tour" button.

  On Tours and destination detail the card is also a `div` with one `<a class="tc-btn">` (Tours:145-151, DestinationDetail:152-158), and card hover turns the button blue (hbc.css:287).

  The spec describes "the whole card is an `<a>`" as coming from the board. It doesn't. A whole-card link is defensible as a larger target, but it has to be labelled, and the slider variant must drop the hover states as the design does.
- **Proposed text (§3.2 TourCard).** "[DEVIATE] the design's card is a `div` whose only link is 'View tour'. We make the whole card one `<a>` (larger target, one tab stop) and render 'View tour' as a span. **Variant `slider`:** no card hover effects (no border or shadow change, no image zoom, button stays grey unless the card has `:focus-visible`), matching Main v4:285-287, so drag-to-scroll doesn't flash hover states."

### 15. minor: §6.1.2 hero type and motion details
- **Finding.**
  - The design sets explicit line breaks with `white-space:nowrap` / `pre-wrap` ("Escape / in style / & comfort"; "All aboard, / mateys!"; "Hello / Blue cave / Croatia"; Main v4:489-506). The spec says `text-wrap: balance`, which will break lines differently.
  - Missing:
    - ≤1024 text-shadow on the title (`0 1px 2px rgba(0,0,0,.35), 0 4px 24px rgba(0,0,0,.45)`) and on the sub (Main v4:214-217);
    - sub margin-bottom 24 (20 at ≤768);
    - ≤480 `.hero-panel` max-width 375 (Main v4:449);
    - dots bottom 80px (70 at ≤768); Explore bottom 22 (16 at ≤768);
    - dot colours on photo: inactive white .6, active track white .35;
    - dot hover scale 1.4 (1.25 active) (Main v4:171, :223-241, :437-438);
    - arrows left/right 20px; arrow bg `rgba(8,28,48,.42)` → .62 on hover; 1px `rgba(255,255,255,.28)` border; blur 12 (Main v4:242-245);
    - Explore pill: 36px tall, transparent, 14px/600, hover `rgba(255,255,255,.12)`, chevrons on **both** sides, bob 1.8s (Main v4:172-177, :513).
  - `100svh` vs the design's `100vh` is a reasonable improvement, but label it [DEVIATE].
- **Proposed text.**
  - "Title lines come from data as an array (`titleLines: string[]`) and render with `<br>` + `white-space:nowrap`, as on the board; no `text-wrap: balance`."
  - Add the values above to the Controls row and a new "≤1024" row.

### 16. minor: §6.1.2 Controls: the progress colour changes silently
- **Finding.** The design fill is `#F2662B` (Main v4:236). The spec maps it to `--color-cta-on-image`, which is `#C2410C`: a visibly darker orange, unlabelled.
- **Proposed text.** "Active-dot progress fill `--color-progress` (#f2662b, decorative)." Alternatively, label the substitution [DEVIATE] with a reason.

### 17. minor: §6.1.3 trust band copy and responsive values
- **Finding.**
  - The design's fourth item is `ti-certificate` "**10 years** on the water" (Main v4:530). The spec turns it into `ti-calendar` "Since {FOUNDING_YEAR} in Split". D-14 needs only the number computed, not new wording. The spec's "Licensed maritime operator" item is an added fill-in for the hidden rating.
  - Missing:
    - ≤768: items 14px, padding 16px 0, marquee item padding-right 40 (48 above 768) (Main v4:373-380);
    - item text 15px secondary with `strong` primary, as the spec has (✓);
    - stars `#F59E0B` (Main v4:369).
- **Proposed text.**
  - Items: 1 `ti-shield-check` "**Free cancellation** up to {window}"; 2 `ti-users` "**Max 12 guests** per departure"; 3 `ti-certificate` "**{years} years** on the water" (computed); 4 [rating slot, D-5] or, until then, `ti-certificate`/`ti-anchor` "**Licensed** maritime operator".
  - ≤768: 14px, padding 16px 0, item gap 40px.

### 18. minor: §6.1.4 video section placement and values
- **Finding.**
  - In v4 the video section sits **flush** under the trust band: `.trust-band ~ .vp{margin-top:0}` (Main v4:363).
  - Band image position `center 93%` (Main v4:386).
  - vp-inner padding `32px 24px 0` (24px 16px 0 at ≤768), centred text; eyebrow margin-bottom 8, letter-spacing .02em; title margin-bottom 28 (20 at ≤768).
  - Player: background #000; hover image scale 1.03 over .6s; bottom gradient `rgba(6,24,40,0→.55)` from 55%.
  - Play disc hover/focus: scale 1.08 with a larger ring (Main v4:385-408).
  - The design uses `preload="metadata"`; the spec's `none` is fine but should be labelled.
- **Proposed text.** Add "margin-top 0 after the trust band" and the values above.

### 19. minor: §6.1.5 / §6.1.6 / §6.1.7 / §6.1.8 missing component values
- **PillLink** (Main v4:277-282):
  - 36px tall, padding 0 14px 0 16px, pill, 0.5px `--color-border-secondary`, white, 14px/500, icon 16px;
  - hover grey background, icon nudges 2px;
  - ghost: transparent border and background, and on hover takes the outline style.
- **See-all card** (Main v4:292-298):
  - grey background, 1px **dashed** `--color-border-secondary`, padding 24, centred;
  - 56px white icon circle (0.5px border) with 24px arrow → on hover the circle turns blue and nudges 3px;
  - title 18/600, sub 14 secondary max 200px;
  - card hover background `--color-background-hover`.
  - The spec's sub "Group trips and private charters" changes the design copy ("…and sunset runs"); label it [CHANGE: no sunset product].
- **Section header** (Main v4:258-262):
  - margin `var(--sec-gap) 0 20px`, baseline aligned;
  - with a sub: flex-start, gap 16; sub 16/1.6 secondary, margin-top 8, max 520; pill `margin-top:-4px`.
- **TypeCards** (Main v4:330-352; Tours:61-62):
  - badge absolute top 16 / right 16, 13px/600, padding 4px 10px, radius 6, icon 1.2em;
  - icon circle 48px (22px glyph) margin-bottom 14;
  - title 17px/500 (not h3 default size); desc 16/1.6 margin-bottom 12;
  - features gap 4, margin-bottom 24, icon 1.2em accent;
  - CTA: outline 14px, padding 6px 14px, radius 8;
  - grid gap **12 on home, 16 on Tours**; Tours card padding `18px 20px 26px` and features margin-bottom 0.
- **Bento tile** (Main v4:307-324):
  - count pill sits **top-left** (12/12) with a `ti-sailboat` icon; 13px/500; `rgba(255,255,255,.18)` with a 0.5px `rgba(255,255,255,.35)` border; blur 6; padding 2px 9px;
  - tile padding 14px 16px; desc margin-top 2; image hover scale 1.04 over .4s;
  - blur band covers the bottom 42%.
- **How it works** (Main v4:325-329; Tours:54):
  - number circle 26px white with 0.5px border, 12px/500;
  - card padding 14, gap 8, radius 12;
  - grid gap 12 on home, **16 on Tours**.
- **§6.1.7 "Add a ≤1024 rule (3 columns) that the design lacks".** This is an unlabelled deviation, and with tile spans of 2 it breaks the bento in 3 columns. Remove it, or label it [DEVIATE] and define the spans.

### 20. minor: §6.1.11 CTA band uses the wrong button size, and "flush" is inaccurate
- **Finding.**
  - The CTA-band buttons are 40px tall, radius 10, padding 0 20px, 16px/600. The ghost button is `rgba(255,255,255,.08)` with a 1px `rgba(255,255,255,.7)` border, blur 8, and on hover .18 with a white border (Main v4:415-418).
  - The spec maps them to `Button on-image`, the 46px / radius-11 hero button.
  - h2: text-shadow `0 2px 24px rgba(0,0,0,.25)`, margin-bottom 10.
  - p: max 420px, white .9, margin-bottom 18.
  - The band has margin-bottom 48 before the footer, so it doesn't sit flush.
- **Proposed text.** "Buttons: `Button variant=on-image size=md` (40px, radius 10, shadow `0 8px 24px rgba(0,0,0,.2)`) + `on-image-ghost size=md`. Band margin `var(--sec-gap) 0 48px`; footer margin-top 0."

---

## D. Tours, Tour detail, Destinations, Destination detail

### 21. minor: §3.2 PhotoHero / §6.2 values missing
- **Finding** (Tours:24-41, :86-94; Destinations:26-38).
  - Content is **bottom-aligned**, padding `0 24px 28px` (0 16px 20px at ≤768); object-position 70% center (Tours) / center 79% (Destinations).
  - Eyebrow: 13px/600, uppercase, letter-spacing .08em, white .85, margin-bottom 12; optional icon 15px.
  - Title: margin-bottom 14, text-shadow `0 2px 24px rgba(0,0,0,.18)`.
  - Lead: 16/1.6, white .88, max 440, margin-bottom 22.
  - Glass chip: 38px, 14px/500, padding 0 14px, 1px `rgba(255,255,255,.26)` border, `rgba(8,28,48,.42)` + blur 14 saturate 140; hover .62; active white .96 with dark text; icon 16px.
  - The sort chip is right-aligned (`margin-left:auto`; 0 at ≤768).
  - Results area: padding-top 32 (Tours) / 28 (Destinations). Results bar: min-height 28, margin-bottom 16; "Clear filters" underlines on hover.
- **Proposed text.** Add a PhotoHero spec block with these values.

### 22. minor: §3.2 PhotoHero / §6.4 describe the Destinations subtitle problem wrongly
- **Finding.** The board **does** render the scrim; Destinations:28 is the same gradient as Tours:28, and §4.2 `--color-overlay-hero` copies it. The subtitle is unreadable because of a class-name collision: `.dest-desc` is defined for the hero (white .88, line 32) and redefined for the cards (secondary grey, 2-line clamp, line 45), so the hero lead renders grey on a dark photo. The scrim isn't a deviation on Tours or Destinations. It is a deviation only on the **home** hero, which has no scrim element (Main v4:219 defines one but never uses it).
- **Proposed text.** "PhotoHero scrim: as on the board (`--color-overlay-hero`). The Destinations lead is white .88 like Tours; the board's grey lead is a CSS class collision, not a design intent. Home hero: [DEVIATE] add the scrim."

### 23. minor: §6.2 empty state and card fallback
- **Finding.**
  - The design's no-results state is centred, padding 2rem (2.5rem on Destinations), with a 28px icon in `--color-border-secondary` and no button (Tours:85, :158). The spec's added "Clear filters" button is fine but should be labelled [NEW].
  - The design's fallback for card images is a **grey** box with a 40px icon in `--color-border-secondary` (hbc.css:266-267). The blue gradient fallback in §3.4 is the bento tile fallback only (Main v4:307).
- **Proposed text (§3.4).** "Fallback: bento and destination tiles → blue-500→blue-900 gradient + icon; tour and destination **cards** and About hero → grey `--color-background-secondary` box with a 40px (52px About) icon in `--color-border-secondary`, as on the boards."

### 24. minor: §6.3.2 gallery details
- **Finding.**
  - The "+N" overlay counts **n − 5** (hero + 4 thumbs), not n − 4 (TourDetail:317).
  - Tags are pills (radius 20, 12px/500, padding 4px 10px, 11px icon), top/left 10px, ordered "Private available" then "Group tour". The tour board has no "Best seller" tag (TourDetail:168-171).
  - Hero margin-bottom 10; thumbs margin-bottom 28 (20 at ≤768).
  - Count pill: `rgba(255,255,255,.95)`, radius 8, padding 6px 12px, 14px/500.
  - Lightbox: fade-in .2s; top bar padding 16px 20px; image radius 8; thumbs radius 6 with a 2px border, .5 opacity → .85 hover → 1 with a white border when active; at ≤768 prev/next overlay the image at 12px from each edge and the strip is left-aligned (TourDetail:26-39, :141-145).
- **Proposed text.** Correct to "+{n−5}" and add the values above.

### 25. minor: §6.3.3 / §6.3.4 tour detail values and copy
- **Finding.**
  - Section titles are not specified. They are 18px/500 with margin-bottom 14, padding-bottom 10 and a 0.5px tertiary bottom hairline (TourDetail:57); the same on destination detail (:52) and About (:22).
  - The itinerary time is its **own line above** the label: 13px tertiary, line-height 18 (TourDetail:71). The dot border is 0.5px; the dot margin-top is 6.
  - Includes: gap 6px, icon 1.25em.
  - Info tiles: equal-height rows (`grid-auto-rows:1fr`), padding 10px 12px, radius 8; the link is underlined with a −45° arrow.
  - Booking aside:
    - price unit 13px secondary;
    - CTA primary padding 12, 14px/500, radius 8;
    - secondary padding 10 with a 0.5px border and grey hover;
    - policy line 13px centred, margin-top 10.
  - Reviews:
    - card padding 12, radius 8, margin-bottom 8;
    - ≤1024 scroller `min(340px,46%)` with edge mask;
    - ≤768 82%.
  - Mobile heading copy: the design says "**Book now**" (TourDetail:236); the spec's "Book this tour" is an unlabelled copy change.
  - Mobile bar: transform and opacity .3s; price 16/500 + unit 13px; button padding 10px 22px; `#book` scroll-margin-top 72.
  - Good to know: the spec adds Departure / Return / Meeting point / Season tiles that the board doesn't show. Defensible as business facts, but label them [CHANGE].
- **Proposed text.** Add these values. Use "Book now" for the mobile heading.

### 26. major: §6.5 drops the destination highlights marquee; a11y doesn't require that
- **Finding.** At ≤768 the design swaps the highlights grid for an auto-scrolling marquee: 26s linear, 220px items, 24px edge masks (DestinationDetail:56-59, :99-100, :146). Its only problem is that it's `aria-hidden` while the grid is `display:none`. The spec's main instruction is "1 column ≤768; no marquee", with the faithful option only as an "if". Accessibility is fully met by keeping the marquee visually, putting the list in an sr-only grid, adding a pause button (which the current site already has), and showing a static wrap under reduced motion. Dropping the design's motion is therefore a taste choice.
- **Proposed text (§6.5 item 2).** "≤768: **[KEEP design]** horizontal marquee (26s linear, items `flex:0 0 220px`, gap 8, 24px edge masks, duplicated set `aria-hidden`). The real list stays in the accessibility tree as an `.sr-only` `<ul>` (not `display:none`). Add a 32px pause/play button (WCAG 2.2.2). Under `prefers-reduced-motion` show the 1-column grid instead. **[DEVIATE]** only for the sr-only list and the pause control."

### 27. minor: §6.5 destination detail values
- **Finding.**
  - Tags padding 4px 11px; the tag row wraps with `max-width: calc(100% - 90px)` (DestinationDetail:124).
  - h1 margin-bottom 12; intro margin-bottom `--td-sec`.
  - Tours grid gap **14** (:68).
  - Aside: padding 1.1rem 1.25rem; heading 17px/500; stat label 13px tertiary, value 14/500; stat padding 9px 11px; primary button padding 11, secondary 9 (:71-87).
  - `#tours` scroll-margin-top 72.
  - The ≤768 [DEVIATE] that renders the aside rather than hiding it rests on a conversion argument, not a11y. It's acceptable if the owner agrees: list it in §1 as a decision instead of a silent deviation.
- **Proposed text.** Add the values above, and add a D-row: "Destination aside on mobile: design hides it; we show it after the main column (keeps the charter CTA). Owner confirms."

### 28. minor: §3.1 / §6.4 the Destinations 640 → 768 fold is a convenience deviation
- **Finding.** Destinations:59-61 switches to 1 column at **640px** (gap 14, image 200). Folding it to 768 changes the 641–768 layout from 2 columns to 1, for breakpoint tidiness only. The other folds (1000 → 1024 for the marquee) are harmless.
- **Proposed text.** "Destinations grid: 1 column at ≤640px (gap 14, image 200px), as designed. A one-off breakpoint, commented in the component." Or keep the [DEVIATE] with an honest reason ("breakpoint consolidation") and owner sign-off.

### 29. minor: §6.4 card, chip and strip details
- **Finding.**
  - Card name margin-bottom 6; desc margin-bottom 14.
  - Chips: 13px with a 13px icon.
  - Footer: padding-top 14 with a 0.5px tertiary top border; count line 14/500 secondary with `ti-sailboat`.
  - "See tours" pill: same as PillLink (36px); on **card hover** it turns grey and its arrow nudges 2px (Destinations:48-53). Keep the card-hover coupling even though the pill is now a sibling link.
  - Section label: 12px/500, letter-spacing .06em, margin-bottom 12.
  - Grid margin-bottom 28.
  - Also-strip: padding 1rem 1.25rem, margin-top 8; t1 16/500; button padding 7px 14px, white, 0.5px border.
- **Proposed text.** Add these values.

---

## E. Booking flows (§8)

### 30. minor: §8.1.2 group booking: missing values and ≤768 behaviour
- **Finding** (GroupBooking:18-84).
  - Cards: 1px border-card, radius 12, padding 1.25rem, margin-bottom 14. Title 18/500 with a 16px accent icon; sub 16/1.6 secondary, margin-bottom 14.
  - Snapshot: grey, radius 12, padding 12px 14px, margin-bottom 20.
  - Calendar:
    - day cells 36px, radius 8, gap 4 (2 at ≤768);
    - hover grey with a border;
    - day-of-week labels 12px/500 tertiary.
  - Slots: 2 columns, gap 10, padding 14px 16px; icon tile 36px; time 17/500; radio 18px.
  - Guests: 2-column grid of grey rows (padding 10px 12px).
  - Field labels: 13px/500 uppercase tertiary, letter-spacing .05em.
  - Summary: padding 1.1rem 1.25rem; total 17/500; note 13px right-aligned.
  - CTA padding 13; back button padding 10, secondary text.
  - Policy line 14px success.
  - **≤768: slots, guests and details all go to 1 column** (:83). The spec doesn't state this.
  - The hold note was a grey box with a lock icon (:61-62). Reuse that box for the replacement line.
- **Proposed text.** Add a "Layout and values" row with the above, plus "≤768: slots, guests and details grids → 1 column; calendar gap 2px".

### 31. minor: §8.2 private charter departs from the board in unlabelled ways
- **Finding.**
  - Duration is a `<select>` on the board (PrivateBooking:99); the spec says "radio chips".
  - Time defaults to 10:00 (:98), not 09:00.
  - Date, time and duration sit in a 3-column field grid (2 at ≤768, 1 at ≤480; :22, :62, :66).
  - Special requests is its **own card** (`ti-message`).
  - Extras card title has "— optional" in 14px tertiary.
  - Route cards: 2 columns, gap 8, padding 11px 13px, 18px accent icon; selected 2px brand border + blue-100.
  - Extras rows: 34px icon tile, price right-aligned, 18px checkbox.
  - The calendar component in place of `type=date` is justified by season limits (D-15) but should be labelled. The added visible h1 and lead are [NEW].
- **Proposed text.** "Duration: native `<select>` (design). Departure time default 10:00. Date/time/duration in a 3-col field grid (2 ≤768, 1 ≤480). [DEVIATE: season] date uses the shared calendar. Special requests: separate card with `ti-message` (design), privacy helper below."

### 32. minor: §8.1.3 / §8.1.4 review and pay descriptions
- **Finding.**
  - Board 07's Tour details card has a **64px thumbnail** and a type badge pill (radius 20, 12px/500; "Private tour" in private tone, so a group booking should say "Group tour" in brand tone). Rows carry 13px icons.
  - Total is 20px/500 (`--font-size-xl`) (BookingSummary:54-57, :91).
  - Cards: margin-bottom 12; page top padding `calc(24px + 1.5rem)`.
  - The policy card has a `ti-shield-check` title icon in success colour and a grey 16/1.6 box.
  - §8.1.4 says pay uses "Board 07's visual language: summary card, **method radio cards**". Board 07 has no payment-method UI, so that description is wrong: the radio cards are new.
- **Proposed text.** Add the thumbnail and badge to card 1 and "Total 20px/500". In §8.1.4: "[NEW] method radio cards, styled like the step-2 slot cards (radius 8, selected = 2px brand border + blue-100)."

### 33. minor: §8.1.5 error page: the second hold box isn't dropped
- **Finding.** PaymentError:62 has a separate amber `hold-warn` ("held until the timer runs out") in addition to the red note with "8 minutes" (:54). The spec drops only the latter.
- **Proposed text.** "[DROP] both hold messages (red note text and the amber `hold-warn` box). The red note box (red-100, red-900 text, radius 8, padding 10px 14px) carries the new line."

---

## F. Content pages (§7)

### 34. major: §4.4 / §7.10 `--legal-width` is misread
- **Finding.** In the design, the **whole** legal wrap (and the nav) is 680px wide, *including* the 180px TOC and 24px gap, so the body column is about 428px (Legal:15-16, :20). The spec defines `--legal-width: 680px` as "body column only". Built that way, the page is 680 + 204 = 884px wide with long lines, which is a different page. Keeping the header at 960 is a defensible consistency deviation; the content width isn't.
- **Proposed text.** "`--legal-width: 680px`: the legal content wrap (TOC + body), as designed; body column ≈ 428px. **[DEVIATE]** the header keeps 960px (the board shrinks it too; a header that changes width between pages looks broken)."

### 35. minor: §7.10 legal callout colours and TOC state
- **Finding.**
  - `.warn-box` text is `--color-category-tip-text` (amber-900 `#633806`, ~9:1) in the design (Legal:38), which already passes AA. The spec's "amber-700 text" changes the design colour for no reason. The same applies to §6.3.3 "Please note".
  - The `.highlight-box` text is primary/500 (not secondary); background is `--color-background-highlight-soft`; bar is 3px `--color-border-highlight`; corner radius `0 8 8 0`.
  - The active TOC link also has a grey background and is 500 weight (:24); TOC link padding 6px 10px.
  - Summary-box label: 13px uppercase.
  - Section h2: margin-bottom 10, padding-bottom 8.
- **Proposed text.**
  - "`.warn-box` / Please note: amber-50 background, 3px amber-500 left bar, text `--color-category-tip-text` (amber-900), as designed."
  - "TOC active: 2px accent left border + `--color-background-secondary` + 500."

### 36. major: §7.12 About values are wrong
- **Finding.**
  - Trust tile number: the design uses **20px/500** (`--font-size-xl`; About:26). The spec says 22px/600. The tile label is 16px secondary and the icon 16px accent.
  - Timeline year: **13px/500 uppercase, letter-spacing .06em** (:36). The spec says 14px/600.
  - Timeline dots: 16px white with a 2px `--color-border-secondary` ring; active dots get an accent ring and a 6px accent centre. The rule is 0.5px at left 7px.
  - Crew card: grey card; the top is a **100px-tall full-width white band** with a 32px `ti-user-circle` (:41, :120). It isn't a "100px round photo". Role is **13px** (not 12) accent uppercase, letter-spacing .04em; body padding 12.
  - CTA band h2: 20px/500, grey band, padding 1.5rem (:59).
  - ≤768: the trust and values grids go to 1 column (:63). Not stated in the spec.
  - Hero fallback: the design's is a grey box with a 52px icon in `--color-border-secondary` (:16). The spec's gradient fallback isn't labelled.
- **Proposed text.** Replace the values in §7.12 with the above. "Crew card: grey card, 100px-tall photo band (`object-fit: cover`, real photo when consented; until then a white band with a 32px `ti-user-circle` in `--color-border-secondary`), name 16/500, role 13px accent uppercase."

### 37. minor: §7.11 FAQ details and an unlabelled ≤768 change
- **Finding.**
  - ≤768: the design shows the category list **stacked and static** (Faqs:54-56). The spec's "horizontal scrolling chip row" is an unlabelled deviation; label it or follow the design.
  - Answer padding is `14px 14px 16px` (:43); the spec says 0 16px 16px.
  - Category buttons: 14px, padding 7px 12px, radius 8; active grey with a 0.5px tertiary border and 500 weight; count pill 13px white with a 0.5px border and radius 10.
  - Group spacing: margin-bottom 28. Header: padding-bottom 10 with a hairline; 30px icon tile with radius 8.
  - Question text: 16/500, line-height 1.3; chevron 15px.
  - Contact band:
    - grey, padding 1.25rem 1.5rem;
    - heading 17px/500;
    - buttons 14px, padding 7px 14px, radius 8, with icons (`ti-mail`, `ti-phone`).
  - "Uppercase sans h1": the uppercase comes from the global hbc.css:291 `.hero h1` rule, because the FAQ wrapper is `.hero`. Choosing sentence case is a fair consistency call, but it's taste: list it in §1 or follow the board.
- **Proposed text.** Add the values above. ≤768: "Category list stacks (static), as designed", or label the chip row [DEVIATE] with a reason.

### 38. minor: §7.13 Contact copy and card style
- **Finding.**
  - The design label is "**Subject**", with options General enquiry · Group booking question · Private charter enquiry · Cancellation or rescheduling · Feedback or complaint · Press / media (Contact:123-130). The spec renames it "Topic", rewrites every option and drops Press / media, all unlabelled. Keep the design wording; the API enum can map to it.
  - Contact cards are **grey borderless tiles**: padding 16px 18px, radius 12, hover `--color-background-hover`; icon tile 36px radius 8; type label 13px uppercase tertiary; value 17/500; sub 16 secondary (:20-29). §7.1 says "Cards: 1px border-card" for all content cards, which is wrong here.
  - Icon tiles: Phone and WhatsApp use the success pair (blue-100 / blue-900); Email uses the info pair (blue-100 / blue-500); Find us uses the tip pair (amber-100 / amber-900).
  - Map stub 140px (:47), margin-bottom 16.
  - Send button: inline (not full width), padding 11px 22px, margin-top 16.
  - Hours card: two columns in a grey card; "Open now" pill 13px/500 blue-100 with a 6px accent dot.
- **Proposed text.** "Select label 'Subject', options as on the board (General enquiry …, Press / media); `topic` enum values `general|group|charter|change|feedback|press`." Add the card values above.

### 39. minor: §6.1.1 / §3.3 display-type rule is labelled [DEVIATE] but mostly matches the design
- **Finding.** On the boards:
  - display (Glorich, uppercase) is used on the home slides, the Tours and Destinations h1, the home and Tours section titles (including the video h2), and the home CTA-band h2;
  - detail, booking, About, Contact and Legal headings are sans in sentence case.

  That is the spec's rule. The only real difference is the FAQ h1 (uppercase sans through `.hero h1`, hbc.css:291). Calling the whole rule a deviation "from the inconsistent boards" overstates it and invites further drift. Also missing: the About and FAQ grey CTA-band headings are sans (20px / 17px), not display.
- **Proposed text.** "Display type as on the boards: (list). The only change: [DEVIATE] FAQ h1 sentence case instead of uppercase (hbc.css `.hero h1` side effect)."

---

## G. Responsive and motion gaps (cross-cutting)

### 40. major: the spec has no per-board responsive table; several board breakpoints are missing
The design breakpoints the spec omits, or states only partly:

| Board | ≤1024 | ≤768 | ≤480 / other |
|---|---|---|---|
| Home | `--sec-gap` 56; title/sub text-shadow; trust marquee (≤1000); reviews scroller `min(320px,82%)` with −24px bleed | hero bottom-aligned, padding-bottom 168, object-position 70%; dots 70, Explore 16; arrows hidden; trust 14px; video values; slider gutter 16, cards `min(300px,82%)`; bento → 280px scroll row 3:2; steps 2 col; types 1 col; CTA band padding 2rem 20px, radius 16, stacked buttons max 320 | `--sec-gap` 44; hero panel max 375; bento items `min(280px,80%)`; steps 1 col; reviews bleed −12 |
| Tours | `--sec-gap` 56 | hero 480, inner padding 0 16px 20px, title ≤60px; chips nowrap scroll, −16px right bleed, sort chip margin-left 0; types 1 col; steps 2 col | steps 1 col |
| Tour detail | reviews scroller `min(340px,46%)` with masks | `--td-sec` 28; thumbs mb 20; hero 3:2; single column order main → aside → reviews; aside not sticky; includes and info 1 col; lightbox arrows overlaid; mobile bar; page padding-bottom 72; reviews 82% | – |
| Destinations | – | hero 480; chips scroll | **≤640** 1 col, gap 14, image 200 |
| Destination detail | – | `--td-sec` 28; 1 col; geo 1 col; marquee; aside hidden (spec deviates); mobile bar | – |
| Group / Private | – | page padding 16; slots, guests, details, routes 1 col; dtd grid 2 col | dtd grid 1 col |
| Success | – | meetup grid 1 col | – |
| FAQ / Legal | – | 1 col; side lists static | – |
| About | – | 2-col layout, trust and values → 1 col; crew scroller 40% | crew 80% |
| Contact | – | contact grid and fields 1 col | – |

**Proposed text.** Add this table to §3.1 as "§3.1.1 Responsive behaviour per board (from the boards)", and point each page section to its row.

### 41. minor: hover and motion values are missing across components
Add a "§4.4.1 Motion catalogue (from the boards)":

| Element | Behaviour |
|---|---|
| Nav | background, border and shadow over .3s |
| Card | border and shadow .2s; image scale 1.04 over .4s (tour cards, bento tiles) |
| Gallery hero and thumbs | scale 1.03 over .4s |
| Video poster | scale 1.03 over .6s; play disc scale 1.08 + ring 8 → 12px over .25s |
| PillLink | arrow +2px |
| See-all icon | +3px and turns blue |
| Hero CTA | arrow +3px |
| Hero dot | scale 1.4 (active 1.25) |
| Hero crossfade | 1.2s |
| Text leave / swap | .45s / 450ms |
| Explore chevrons | bob 1.8s |
| Trust marquee | 40s linear |
| Highlights marquee | 26s linear |
| Lightbox | fade-in .2s |
| Mobile bar | transform and opacity .3s |
| FAQ chevron | rotate .15s |
| Type card hover | CTA turns blue |
| Contact card hover | `--color-background-hover` |
| Calendar day and slot hover | border `--color-border-primary` |
| Chip hover | `rgba(8,28,48,.62)` |

Everything is off under `prefers-reduced-motion`, except the colour changes.
