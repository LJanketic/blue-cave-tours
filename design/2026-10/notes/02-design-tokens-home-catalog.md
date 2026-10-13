# 02 — Design tokens (hbc.css), Homepage v1→v4, Tours, Tour detail, Destinations, Destination detail

Research only, nothing in the repo was edited.
Design source: `$DESIGN/project/*.dc.html` + `hbc.css` + `canvas.json` (downloaded design-canvas export, 2026-10-11).
Current site: the repo (branch `feat/email-map-link-overbooking`).

How to read the .dc.html files: each board is one HTML file. `<helmet><style>` holds page CSS, the markup sits inside `<x-dc>`, `{{ name }}` holes are filled by `renderVals()` in the `<script type="text/x-dc">` class, `<sc-if>`/`<sc-for>` are conditionals and loops, and `onClick="{{ fn }}"` binds handlers. `href="X.dc.html"` links one board to another. A board's `state` is local to that board. `data-props` holds editor "tweaks", such as hero image URLs. Every board links `./hbc.css`.

Canvas boards in scope (canvas.json, all `expand: fill`, `is_interactive: true`, width 1280):

| File | Title | Height |
|---|---|---|
| Main.dc.html | 01 Homepage (v1) | 4120 |
| Main-n19w.dc.html | 01 Homepage v2 | 5080 |
| Main-n19w-fhxd.dc.html | 01 Homepage v3 | 5190 |
| Main-n19w-fhxd-j4z6.dc.html | **01 Homepage v4 — trust band below hero** | 5211 |
| Tours.dc.html | 02 Tours overview | 2810 |
| TourDetail.dc.html | 03 Tour detail | 2770 |
| Destinations.dc.html | 04 Destinations overview | 2384 |
| DestinationDetail.dc.html | 10 Destination detail — Hvar | 2660 |

v4 is treated as the target homepage, and the evidence supports that: it has the newest title and is a superset of v3's refinements. One caveat: **every board's nav logo links to `Main-n19w-fhxd.dc.html` (v3), not v4**. This looks like a link that was never updated, not a signal that v3 is the target.

---

## A. hbc.css — shared tokens, base, icons, nav and footer

Header comment: *"Ported from iLabura/HBC: assets/css/variables.css + assets/css/nav-footer.css. Icons: Tabler Icons 3.48 webfont, subset to the glyphs the site uses."* The current repo's `src/styles/tokens/redesign.css` says it "mirrors the design handoff in assets/css/variables.css", so both come from the same source. The design is a later fork of it.

### A.1 Fonts

| Font | Where defined | Details |
|---|---|---|
| `tabler-icons` | hbc.css `@font-face` | woff2 `/_blob/4ee868969e6f51720130fbb10ce9f37b`, weight 400, `font-display: block`. Tabler 3.48 subset (current repo: 3.44.0 subset in `src/assets/fonts/tabler-icons-subset.woff2`). |
| `--font-sans` | `:root` | `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` (identical to current). |
| **Glorich** (display) | **Not in hbc.css.** Each page declares it in its own helmet. | Homepages declare 8 weights (`font-display: swap`): 200 `2db8744983e9a9bc881dcf4dbf33fb1c`, 300 `8d3259615f0bd33a7d8aba82fbfa432a`, 400 `c26a52ea8f3db58850c5ce6303d32a78`, 500 `e1f50f1c1f01410c502ac7e24ae58922`, 600 `1a3f0fccd4d55849603cc79714ae7ba6`, 700 `fe81462958ba52eeab1049987b005385`, 800 `ef3c7627cb702b4e0687dd07b54ca6fe`, 900 `aa69f48b412455c92155e50fb26c43c6`. Tours and Destinations declare **only 700**. **TourDetail and DestinationDetail do not load Glorich at all**: their h1 uses the system sans. |

There is no font-family token for Glorich. Pages use `font-family: "Glorich", var(--font-sans)` directly on `.hero h1, .font-display, .section-title, .cta-band h2, .sb-title, .tours-title, .dest-title`.

hbc.css adds a global ligature rule for display titles: `.hero h1, .font-display, .tours-title, .dest-title, .sb-title { text-transform: uppercase; font-variant-ligatures: common-ligatures; font-feature-settings: "liga" 1, "kern" 1 }`. The comment explains that Glorich is all caps, and `uppercase` lets mixed-case pairs such as "Ca" in "Cave" form their ligatures. The homepage `.section-title` and `.cta-band h2` rules repeat this uppercase/ligature treatment.

Current repo: `var(--font-display)` is referenced (NotFoundPanel.astro) but **never defined**, and there is no Glorich font file in `src/assets/fonts`. This matches the parked "--font-display" follow-up.

### A.2 Palette (`--palette-*`), all values as in hbc.css

| Token | Design | Current (redesign.css) | Status |
|---|---|---|---|
| --palette-black | #111 | #111 | same |
| --palette-gray-700 | #555 | #555 | same |
| --palette-gray-550 | — | #696969 | **removed** in design |
| --palette-gray-500 | **#6b6b6b** | #999 | **changed** |
| --palette-gray-400 | #ccc | #ccc | same |
| --palette-gray-300 | #aaa | #aaa | same |
| --palette-gray-200 | #e5e5e3 | #e5e5e3 | same |
| --palette-gray-150 | #ebebea | #ebebea | same |
| --palette-gray-100 | #f5f5f4 | #f5f5f4 | same |
| --palette-white | #fff | #fff | same |
| --palette-teal-900 / 500 / 100 | #085041 / #1D9E75 / #E1F5EE | same (lower-case) | same, but the design no longer points any semantic token at teal |
| --palette-blue-900 | #0C447C | #0c447c | same |
| --palette-blue-600 | **#155DA8** | — | **added** |
| --palette-blue-500 | #1a6fc4 | #1a6fc4 | same |
| --palette-blue-300 | #7ab4e8 | #7ab4e8 | same |
| --palette-blue-100 | #E6F1FB | #e6f1fb | same |
| --palette-amber-900 | #633806 | #633806 | same |
| --palette-amber-700 | — | #8f5a12 | **removed** (this was the current site's contrast fix) |
| --palette-amber-500 / 400 / 100 / 50 | #EF9F27 / #BA7517 / #FAEEDA / #FEF3E2 | same | same |
| --palette-orange-900 | **#7C2D12** | — | **added** |
| --palette-orange-600 | **#C2410C** | — | **added** |
| --palette-orange-100 | **#FFEDD5** | — | **added** (unused in the boards in scope) |
| --palette-red-900 / 100 | #8B1A15 / #FDECEA | same | same |
| --palette-purple-900 / 500 / 100 | #3C3489 / #534AB7 / #EEEDFE | same | same |
| --palette-coral-500 | #E05C34 | #e05c34 | same |
| --palette-gold-50 | **#FDF8EC** | — | **added** |
| --palette-gold-100 | **#F7EBCB** | — | **added** |
| --palette-gold-300 | **#E3C987** | — | **added** |
| --palette-gold-500 | **#B8892B** | — | **added** |
| --palette-gold-800 | **#6E4E0E** | — | **added** |
| --palette-yellow-400 | **#F5C443** | — | **added** |
| --palette-yellow-950 | **#2E2100** | — | **added** |

### A.3 Semantic tokens: precise diff

| Token | Design → value | Current → value | Status |
|---|---|---|---|
| --color-text-primary | black #111 | black | same |
| --color-text-secondary | gray-700 #555 | gray-700 | same |
| --color-text-tertiary | gray-500 = **#6b6b6b** | gray-550 = #696969 | changed (visually the same: 5.33:1 vs 5.49:1 on white) |
| --color-text-info | blue-500 | blue-500 | same |
| --color-text-success | **blue-900 #0C447C** ("was teal — site palette is blue + orange") | teal-900 #085041 | **changed** |
| --color-text-danger | red-900 | red-900 | same |
| --color-text-warning | **amber-400 #BA7517** | amber-700 #8f5a12 | **changed, contrast regression**: 3.72:1 on white, 3.24:1 on amber-100 |
| --color-text-accent | — | #137556 | **removed** |
| --color-background-primary / secondary / hover / info | white / gray-100 / gray-150 / blue-100 | same | same |
| --color-background-success | **blue-100** | teal-100 | **changed** |
| --color-background-warning / -warning-soft / -danger | amber-100 / amber-50 / red-100 | same | same |
| --color-border-primary / secondary / tertiary | gray-300 / gray-400 / gray-200 | same | same |
| --color-border-card | **#D6D5D1** (raw hex, "card outlines: a touch stronger than dividers") | — | **added** |
| --color-border-info / -warning | blue-300 / amber-500 | same | same |
| --color-accent | **blue-500 #1a6fc4** | teal-500 #1d9e75 | **changed (largest visual change: teal accent becomes blue)** |
| --color-accent-dark | **blue-900** | teal-900 | **changed** |
| --color-brand / -brand-dark | blue-500 / blue-900 | — | **added** |
| --color-text-brand | blue-900 | — | **added** |
| --color-background-brand / -brand-soft | blue-500 / blue-100 | — | **added** |
| --color-border-brand | blue-500 | — | **added** |
| --color-highlight / -highlight-dark | blue-500 / **blue-600** | — | **added** |
| --color-text-highlight | blue-900 | — | **added** |
| --color-background-highlight / -highlight-soft | blue-500 / blue-100 | — | **added** |
| --color-border-highlight | blue-500 | — | **added** |
| --color-cta-on-image / -on-image-dark | orange-600 #C2410C / orange-900 #7C2D12 ("Orange is kept only for CTAs that sit on photos (hero, bottom CTA band, video play)") | — | **added** |
| --color-category-private-bg / -text / -icon | purple-100 / 900 / 500 | same | same |
| --color-category-info-icon | blue-900 | same | same |
| --color-category-tip-bg / -tip-text | amber-100 / amber-900 | same | same |
| --color-category-warning-icon | amber-500 | same | same |
| --color-icon-sunset | coral-500 | same | same |
| --color-premium-bg | gold-50 | — | **added** |
| --color-premium-bg-strong | gold-100 | — | **added** |
| --color-premium-border | gold-300 | — | **added** |
| --color-premium-icon | gold-500 | — | **added** |
| --color-premium-text | gold-800 | — | **added** |
| --color-premium-solid | yellow-400 | — | **added** |
| --color-premium-on-solid | yellow-950 | — | **added** |
| Legacy aliases `--color-accent-teal`, `--badge-group-bg/-text`, `--badge-private-bg/-text`, `--badge-bestseller-bg/-text` | — | present | **removed**. Note that current `global.css` `:focus-visible { outline: 2px solid var(--color-accent-teal) }` would stay teal unless remapped. |

### A.4 Type scale, line heights, body styles (all new; the current site has no type tokens)

| Token | Value | px at 16px root |
|---|---|---|
| --font-size-micro | 0.75rem | 12 |
| --font-size-xs | 0.8125rem | 13 |
| --font-size-sm | 0.875rem | 14 |
| --font-size-base | 1rem | 16 |
| --font-size-md | 1.0625rem | 17 |
| --font-size-lg | 1.125rem | 18 |
| --font-size-xl | 1.25rem | 20 |
| --font-size-2xl | 1.375rem | 22 |
| --font-size-hero | clamp(1.75rem, 1.5rem + 1.25vw, 2.5rem) | 28–40 |
| --font-size-icon-hero | 3.5rem | 56 |
| --line-height-tight / normal / relaxed | 1.3 / 1.5 / 1.6 | |
| --font-size-body-md / --line-height-body-md | var(--font-size-base) / 1.6 | 16/1.6, "running text: descriptions, itinerary notes, tips, reviews" |
| --font-size-body-sm / --line-height-body-sm | var(--font-size-sm) / 1.5 | 14/1.5, "compact facts in tiles & lists: highlights, included, good to know, sidebar facts" |

Utility classes: `.body-md`, `.body-sm`.

Display sizes that are hard-coded in pages, not tokens: hero h1 **80px** (Glorich 700, line-height 0.94, letter-spacing −0.02em, nowrap; ≤768px `clamp(44px,12vw,64px)`); `.section-title` **28px** (Glorich 700, line-height 1, letter-spacing −0.01em, uppercase); `.sb-title` 56px (≤1024px `clamp(34px,10.5vw,52px)`); `.tours-title` / `.dest-title` **72px** (≤768px `clamp(44px,12vw,60px)`).

**Base body size changes from 14px (current `body { font-size: 14px }`) to 16px.** The current CSS uses many hard-coded px sizes (12, 13, 14, 17px). The design moves running text to 16px everywhere: step descriptions, FAQ, type cards, reviews.

### A.5 Radii, layout, spacing, shadows, breakpoints

- **Radii:** `--border-radius-md: 8px`, `--border-radius-lg: 12px` (same as current). Current also has the `--radius-md/-lg` aliases, which the design drops. The pages also hard-code: 999px (pills), 16px (tour-card, search panel), 20px (video player, CTA band), 11px (big buttons, search fields), 10px (CTA-band buttons, toggle), 7px, 6px (badges, lightbox thumbs), 50% (round icons).
- **Layout tokens:** only **`--flow-width: 628px`** ("Booking-flow column width (05–09), padding included"). The design has no content-width token. `.wrap { max-width: 960px; margin: 0 auto; padding: 24px }` and `.nav { max-width: 960px; padding: 14px 24px }` hard-code 960px. Inner content width is therefore 912px, which is why the slider gutter uses `(100% - 912px)/2`.
  - Current-only tokens: `--content-max: 960px`, `--page-gutter: 1.25rem` (20px; the design uses 24/16/12px), `--touch-min: 2.75rem`, `--site-header-height: 3.5rem`, `--font-ui`.
- **Spacing:** no tokens. De facto scale: 2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 48, 56px. Section rhythm is set per page:
  - `--sec-gap`: 72px, 56px at ≤1024px, 44px at ≤480px (home, Tours). It is the margin-top of each `.section-header`.
  - `--td-sec`: 36px, 28px at ≤768px (TourDetail, DestinationDetail).
- **Shadows:** no tokens. Values in use:
  - Card hover: `0 6px 24px rgba(0,0,0,.06)`. Type-card hover: `0 8px 28px rgba(0,0,0,.06)`.
  - Navy-tinted panels: `0 16px 40px rgba(10,42,64,.16)` (language menu) and `rgba(10,42,64,.10)` (light search panel).
  - Glass panel: `0 12px 32px rgba(0,0,0,.22)`.
  - Video: `0 18px 48px rgba(6,24,40,.28)`.
  - Orange play disc: `0 8px 24px rgba(194,65,12,.35), 0 0 0 8px rgba(255,255,255,.18)`.
  - Solid nav: `0 1px 16px rgba(0,0,0,.05)`. Mobile book bar: `0 -2px 16px rgba(0,0,0,.06)`.
  - Badge on image: `0 2px 8px rgba(0,0,0,.12)`.
- **Breakpoints:** no tokens. In use: `max-width: 1024px` (tablet: reviews become a scroller, search band stacks, sec-gap 56), `1000px` (trust band becomes a marquee), `960px` (legacy overlay trust-line marquee), `768px` / `min-width: 769px` (mobile nav, most stacking), `640px` (Destinations grid goes to 1 column), `480px`. Also `(hover:hover) and (pointer:fine)` and `prefers-reduced-motion: reduce`. The current site uses 768 / 480 / 769 / 1024, so the design adds 1000, 960 and 640.
- **Hard-coded colours outside tokens:**
  - Navy hero/band background `#0a2a40` (current hero uses `#0a3a6e`).
  - Glass fill `rgba(8,28,48,.42)` and overlays `rgba(6,24,40,…)`.
  - Stars: `#FBBF24` on photo, `#F59E0B` on white.
  - Hero-dot progress fill `#F2662B`.
  - Gold gradient `linear-gradient(135deg,#FBDD84,#F2BC3A)`.
  - Include check `#1a9e5c`, exclude cross `#d33a2c`.
  - Decorative grey `#c7ccd1`.

### A.6 Base styles (hbc.css)

- `.hbc` is the page root: border-box sizing, `font-family: var(--font-sans)`, 16px, line-height 1.5, white background, primary text, `min-height: 100%`, `overflow-x: hidden`. TourDetail and DestinationDetail override this to `overflow-x: clip` so sticky positioning works.
- `.hbc input, select, button, textarea`: padding 8px 10px, **0.5px** border in border-secondary, radius 8, white background, **`outline: none`**. On focus, inputs only change border colour to border-primary (#aaa, 2.32:1). **There is no focus-visible style for buttons or links anywhere in hbc.css.** That is an accessibility gap the build must close; the current site has a global `:focus-visible` outline.
- Anchor-button classes are reset (`text-decoration: none; display: inline-block; text-align: center`): `.btn-primary, .btn-secondary, .cta-btn, .cta-primary, .cta-secondary, .back-btn, .also-btn, .type-cta, .btn-sm, .tc-cta, .card-cta`.
- Pages set `a { color: var(--color-text-info) } a:hover { color: var(--color-accent-dark) }`.
- `.wrap { max-width: 960px; margin: 0 auto; padding: 24px }`; 16px at ≤768px, 12px at ≤480px.

### A.7 Icons

hbc.css maps 76 classes, including the 2 aliases below. Compared with the current `src/styles/icons.css`:

- **Design only (new glyphs to add):** `ti-baby-carriage, ti-camera, ti-fish, ti-heart, ti-message, ti-moon, ti-news, ti-sparkles, ti-tools-kitchen-2, ti-tower, ti-trees, ti-user-circle`, plus the two aliases `ti-island` (maps to the beach glyph `\ef3d`) and `ti-cave` (maps to `\ed82`). The comment says: *"ti-island and ti-cave are not Tabler icons (they render blank in the repo); mapped to the closest real glyphs"*.
- **Current only (would be dropped):** `ti-building-fortress, ti-building-lighthouse, ti-circle-x, ti-mask, ti-moon-stars, ti-plane, ti-player-pause, ti-player-play, ti-quote, ti-tags, ti-ticket`. Several are used by current code: `circle-x` (not-included list), `player-pause/play` (hero pause button), `building-lighthouse` (destinations filter and nearby), `mask` (snorkelling tag), `moon-stars` and `building-fortress` (highlight icons). Keep them when merging.
- Not every icon on the boards is a font glyph. The language switcher's globe and the video play triangle are inline SVGs. The homepage search band's sun and waves are inline SVGs (decorative, `aria-hidden`).

### A.8 Nav

**hbc.css variant 1, the full nav** (the canvas uses `position: sticky` where production would use `fixed`):

- `.nav-bar`: sticky, top 0, z-index 100, background `rgba(255,255,255,.92)` with 10px backdrop blur, 0.5px bottom border in border-tertiary.
- `.nav`: flex, space-between, max-width 960, padding 14px 24px.
- `.nav-logo`: 17px (md), weight 500, gap 7, sailboat icon 18px in brand blue. Text: "Hello Blue Cave".
- `.nav-links`: gap 18px. `.nav-link`: 14px, secondary colour. Hover is primary; `.current` is primary at weight 500.
- `.nav-cta`: 14px, padding 6px 14px, brand blue background, white text, radius 8, weight 500. Hover sets opacity .88.
- `.nav-hamburger`: hidden on desktop, 22px icon.
- **≤768px:** hamburger shown, links and CTA hidden. **No mobile menu panel is designed:** the hamburger button has no handler and no `aria-expanded` or `aria-controls`. The current Header.astro overlay menu (focus trap, inert, Escape, auto-close on resize) must be kept and restyled.

**Overlay variant**, set in each page helmet (home, Tours, Destinations):

- `.nav-bar.nav-overlay`: `position: fixed`, transparent, no border, no blur. Transitions .3s.
- `.on-photo`: logo, links and hamburger turn white (links at .88 alpha).
- `.is-solid`: applied when scrollY > 40. Background `rgba(255,255,255,.97)`, border, shadow `0 1px 16px rgba(0,0,0,.05)`, 10px blur.
- On these pages the nav CTA becomes an **outline button**: transparent, 1px border in border-primary, padding 5px 14px. Hover inverts to dark background and white text. On a photo the button is white with a `rgba(255,255,255,.75)` border, and hover becomes a white fill with `#0a2a40` text.
- The current site already has the same pattern: `nav--floating`, `nav-solid` at 40px, plus hide-on-scroll-down. The design does **not** include hide-on-scroll.

**Language switcher** (homepage v2–v4 only; replaces the CTA):

- ≥769px: `.nav` becomes `grid-template-columns: 1fr auto 1fr`, with links centred and the switcher right-aligned.
- `.lang-btn`: height 32px, padding 0 10px 0 11px, radius 8, 1px border in border-primary, transparent, 14px, weight 600, letter-spacing .02em. Contents: 16px globe SVG, the code (`EN`), and a 14px chevron that rotates 180° when `aria-expanded="true"`. On a photo: white with a `.75` white border.
- `.lang-menu`: absolute, right 0, top calc(100% + 8px), min-width 190, padding 6, radius 12, 0.5px border, shadow `0 16px 40px rgba(10,42,64,.16)`, entry animation `langIn` .16s (fade plus 4px rise).
- Options are buttons with `role="option"` in an `li` inside `ul role="listbox" aria-label="Language"`. Each row is code (24px wide, 13px/600, tertiary) + name + a check icon that shows on the selected option (brand-dark).
- Languages: **EN English, HR Hrvatski, DE Deutsch, IT Italiano, FR Français**. Default `en`.
- A full-screen transparent backdrop closes the menu on click. There is no Escape handling and no arrow-key navigation.
- ≤768px: `.lang-switch { margin-left: auto; margin-right: 10px }`, so it sits next to the hamburger.
- The site has no i18n today, so the switcher is UI only.

**Nav per board (inconsistent in the design):**

| Board | Nav mode | Right-hand element |
|---|---|---|
| Home v1 | overlay | "Contact" outline CTA → Contact |
| Home v2/v3/v4 | overlay | language switcher (no CTA) |
| Tours, Destinations | overlay, on-photo | "Contact" outline CTA → Contact.dc.html; `.current` on its own link |
| TourDetail, DestinationDetail | plain sticky `.nav-bar` (not overlay) | "Book now" solid blue CTA → Tours.dc.html; TourDetail has no `.current`, DestinationDetail marks Destinations |

Links on every board: Tours, Destinations, About, FAQ. **"Contact" is no longer a nav link** (the current site has 5 links incl. Contact, plus a "Book now" `btn-primary` → `/tours/`).

hbc.css also has **variant 2, the minimal booking-flow nav**: `.mini-nav` (flex, space-between, mb 20) and `.exit-link` (14px secondary, icon gap 5). It is out of scope here, but the current repo's `MiniNav.astro` corresponds to it.

### A.9 Footer

- `.footer`: 0.5px top border, padding-top 20, margin-top 32 (pages override this: home 0, Tours `var(--sec-gap)`, Destinations 56px), `grid-template-columns: 2fr 1fr 1fr 1fr`, gap 16. It sits **inside `.wrap`** (960px).
- `.footer-brand`: nav-logo (mb 6) + `p` (14/1.5, secondary, max-width 240).
- `.footer-col h4`: 12px, weight 500, uppercase, letter-spacing .05em, tertiary, mb 10. Links: block, 14/1.5, secondary, mb 8, hover primary.
- `.footer-bottom`: mt 16, pt 14, top border, flex space-between, wrap, gap 8, 14px tertiary.
- ≤768px: 2 columns. ≤480px: 1 column.

Copy (identical on all boards):

- Brand: "Small-boat tours along the Dalmatian coast since 2015. Licensed, insured, and obsessed with the sea."
- Tours: Group tours → Tours, Private charters → PrivateBooking, Day trips → Tours, Sunset cruises → Tours.
- Info: About us → About, Destinations → Destinations, FAQs → Faqs, Contact → Contact.
- Legal: Terms & conditions, Privacy policy, Cancellation policy (all → Legal.dc.html).
- Bottom: "© 2025 Hello Blue Cave" | "Licensed maritime operator · Croatia".

Compared with the current `Footer.astro`:

- The current brand line is "Speedboat tours and private charters from Split…".
- **The current footer has phone, email and "Riva promenade, stand 14, Split"; the design has no contact details.** Keep them.
- The current column headings are `h2` "Tours / Explore / Legal"; the design uses `h4` (a heading-level skip).
- The current Tours column links real slugs: All tours, Private charter, Blue Cave & islands, Blue Lagoon.
- The current year is dynamic.

### A.10 Other shared blocks in hbc.css

- **`.trust-strip`** (booking flow): top border, mt 24, pt 16, centred, wrapping, gap 14, 13px tertiary.
- **`.step-bar` / `.step` / `.step-dot` / `.step-line`** (booking steps 05–07): 22px dots. Done: blue-100 background with blue-900 text. Active: brand background with white text. Next: grey with a border.
- **`.tour-card`** (used on the homepage slider, Tours, and DestinationDetail; see C.1):
  - Card: white, 1px `--color-border-card`, radius 16, overflow hidden, flex column. Hover: border-primary plus a `0 6px 24px rgba(0,0,0,.06)` shadow.
  - `.tc-img`: 180px, grey placeholder with a 40px icon fallback. The image is cover and scales 1.04 on card hover.
  - `.tc-badge` on the image: absolute at top 12, left 12, 13px/500, padding 4px 10px, radius 6, shadow. `.b-best` and `.b-new` use blue-100/blue-900 (**"Best seller" and "New" look identical**). `.b-priv` uses purple.
  - `.tc-body`: padding 14. `.tc-name`: 18px/600, line-height 1.3, mb 14.
  - `.tc-foot`: flex, space-between, align-end. It contains `.tc-from` (13px tertiary "From"), `.tc-price` (22px/600), `.tc-per` (14px secondary), and on the right `.tc-duration` (clock icon + "3h", 14px/500 secondary).
  - `.tc-btn`: "View tour", full width, 46px, 16px/500, grey background, 0.5px border, radius 11. On hover, card hover or focus-visible it fills highlight blue with white text.
  - Also defined but not rendered in the boards in scope: `.tc-chips/.tc-chip` (Destinations uses them), `.tc-rating`, `.tour-card.featured` (2px blue-300 border).

---

## B. Homepage

### B.1 v4 (Main-n19w-fhxd-j4z6.dc.html): final section order

1. Nav (overlay, language switcher)
2. Hero carousel (3 slides, 100vh)
3. **Trust band** (white, directly under the hero; new in v4)
4. Hidden search band (`style="display: none"`; kept in the markup, not rendered)
5. Video preview ("Preview from our tours")
6. Popular tours (full-bleed slider)
7. Group or private?
8. Destinations (bento grid)
9. How it works
10. What guests say
11. Common questions
12. CTA band
13. Footer

Global page values: `.hbc { --sec-gap: 72px }`, 56px at ≤1024px, 44px at ≤480px. `.section-header { display: flex; justify-content: space-between; align-items: baseline; margin: var(--sec-gap) 0 20px }`. Rows whose header has a pill link use `align-items: center`. `.section-title` is Glorich 28px/700, line-height 1, uppercase.

#### B.1.1 Hero

**Container.** `.hero` is `position: relative`, background `#0a2a40`, `height: 100vh; min-height: 580px; max-height: 1140px`, left-aligned. It gets the class `has-photo` when the active slide has an image.

**Background.** Three `<img class="hero-bg">` elements are stacked (`alt=""`) and crossfade on `opacity` over 1.2s. `object-position: calc(70% + 180px) center` (slide 3: `right center`); at ≤768px, `70% center`.

| Slide image | Blob |
|---|---|
| tours | `/_blob/6db22cf5a8d634b0343f7323ec5796a6` |
| charter | `/_blob/017adfe4e2ef7be5d0d94d4957daa087` |
| hello | `/_blob/796f7f6baf909bac630a446041e4b831` |

These are editable props under "Hero photos".

**No scrim is rendered.** `.hero-scrim` (a 90° black gradient) and `.hero-topfade` are defined in CSS but appear in **no** homepage version's markup. Text legibility relies on the photos. Only at ≤1024px do h1 and sub get text-shadows: `0 1px 2px rgba(0,0,0,.35), 0 4px 24px rgba(0,0,0,.45)` and `0 1px 2px rgba(0,0,0,.45), 0 2px 12px rgba(0,0,0,.4)`. Contrast risk; see B.4.

**Content.** `.hero-content` has max-width 960, a flex column, is vertically centred, with padding 0 24px. At ≤768px it uses `justify-content: flex-end` and `padding: 0 16px 168px` (text sits low). At ≤480px, `.hero-panel` is `width: 100%; max-width: 375px`.

Exactly one `.hero-panel` renders at a time (`sc-if`):

| # | h1 (white, Glorich 80px, white-space: pre-wrap lines) | `.hero-sub` (16px/1.6, max 375px, white .9) | CTA (`.hero-cta`) → target |
|---|---|---|---|
| 0 | "Escape / in style / & comfort" | "Group departures along the Dalmatian coast. Small boats, real guides, no tourist conveyor belts." | "Browse group tours →" → Tours.dc.html |
| 1 | "All / aboard," + `<br>` + "mateys!" | "Private charters for two or twenty. Set the route, set the pace, skip the crowds entirely." | "Plan a private charter →" → PrivateBooking.dc.html |
| 2 | "Hello / Blue cave / Croatia" (`<br>`s) | "Small-boat tours from Split since 2015. Licensed, insured and sea-obsessed." | "See the Blue Cave tour →" → TourDetail.dc.html |

Slides 0 and 1 contain two empty `<span></span>` elements inside the h1 (editor artefacts).

**`.hero-cta`:** inline-flex, height 46px, padding 0 20px, radius 11, `--color-cta-on-image` (orange #C2410C) background, white 16px/600 text, shadow `0 8px 24px rgba(0,0,0,.18)`. Hover uses `#7C2D12`, and the arrow icon nudges 3px right.

**Slide transitions.**

- Leaving: `.hero-panel.leaving`. The h1 fades and moves down 28px over .4–.45s; the sub fades over .4s; the CTA fades over .3s.
- The content swaps after **450ms**.
- Entering: h1 `heroTitleIn` (.7s, delay .1s, rises 28px); sub fades in (.6s, delay .25s); CTA fades in (.6s, delay .4s).

**Rotation.**

- Automatic every **6000ms** (`autoRotate` prop, default true).
- Prev and next arrows (`.hero-arrow`): 40px glass circles at left and right 20px, vertically centred. **They are visible only while the hero is hovered** (opacity 0 → 1) and hidden at ≤768px. Labels: "Previous banner" / "Next banner". Any manual navigation restarts the timer.

**Dots** (`.hero-dots`): centred at bottom 80px (70px at ≤768px), gap 8, three 8px buttons.

- Inactive dots are `rgba(255,255,255,.6)`.
- The active dot becomes a 28px pill whose `::after` fills left to right in **#F2662B** over `--hero-interval` (6000ms), as a progress bar.
- Clicking an inactive dot jumps to that slide. **Clicking the active dot toggles pause/play.** On pause the fill animation stops and the elapsed time is stored; on resume the timer continues from where it stopped.
- Labels: the active dot reads "Pause slideshow" or "Play slideshow". Inactive dots read "Show all tours", "Show private charter", "Show Hello Blue Cave".
- Class `.is-paused` pauses the fill; `.no-rotate` (when autoRotate is false) removes it.

**"Explore" button.** Centred at bottom 22px (16px at ≤768px). Pill, 36px tall, transparent, white 14px/600, with chevron-down icons on both sides that bob (1.8s loop). Clicking smooth-scrolls to the **trust band**, offset by the nav height.

**Reduced motion** disables the h1/sub/CTA animations, the background crossfade, the explore bob, the marquee and the dot fill. Note that it does **not** stop auto-rotation itself; the JS has no reduced-motion check. The current `HeroCarousel.vue` does disable rotation under reduced motion.

#### B.1.2 Trust band (v4)

`<section class="trust-band" aria-label="Why book with us">`, white, `ref` used as the target of "Explore".

| # | Item (icon) | Text |
|---|---|---|
| 1 | `★★★★★` (span, `aria-hidden`, `#F59E0B`) | "**4.9** from 800+ reviews" |
| 2 | `ti-shield-check` | "**Free cancellation** up to 48h" |
| 3 | `ti-users` | "**Max 12 guests** per departure" |
| 4 | `ti-certificate` | "**10 years** on the water" |

Each item is duplicated with class `tl-dup` and `aria-hidden` for the marquee.

- **Desktop (>1000px):** a single row inside the 960px container. `justify-content: space-between`, padding 20px 24px, gap 16, nowrap. Items are 15px (0.9375rem) secondary, `strong` is primary, icons are 20px in `--color-accent` (blue).
- **≤1000px:** `.trust-line-mask` gets `overflow: hidden` and a horizontal mask (fades at the edges: transparent → 20px → solid from 64px). The inner row becomes `width: max-content` and runs `trustMarquee` (translateX 0 → −50%) over **40s linear infinite**. Items get `padding-right: 48px`, and the duplicates are shown.
- **≤768px:** padding 16px 0, items 14px with padding-right 40px.
- **Reduced motion** stops the animation. The row stays `max-content` with overflow hidden, so on narrow screens the items are **clipped, not wrapped**. Build should fall back to wrapping.

The `.trust-line` base styles from v1–v3 (dark glass overlay at the hero bottom, white text, `#FBBF24` stars) are still in the CSS, but `.trust-band .trust-line` overrides them to static white.

#### B.1.3 Search band (present but `display: none` since v3)

Kept for reference; it was the v2 design. `<section class="search-band" aria-label="Book a trip">` contains:

- **Left column** (max 375px):
  - h2 `.sb-title`, Glorich 56px, line-height .94. Text changes with the trip type, with a 3-line desktop version and a 2-line version at ≤1024px:
    - Group: "Find your / day on / the water"
    - Private: "Your / privacy & / your pace"
    - Transfer: "Skip the / wait, go / by boat"
  - `.sb-text`:
    - Group: "Pick a destination and a date — we'll show every small-group departure that fits."
    - Private: "Choose where and when, then make the route your own on the next step."
    - Transfer: "Skip the ferry queues. A private boat between Split, the airport and the islands."
- **Search card** (`form role="search" aria-label="Find a tour"`; light variant: white, 1px border, radius 16, padding 14):
  - Segmented toggle (`role="group" aria-label="Trip type"`): Group (users), Private (crown), Transfer (ship). Buttons carry `aria-pressed`. A sliding white indicator moves between them (.55s cubic-bezier).
  - "Where" select (map-pin): Anywhere, Blue Cave, Biševo, Hvar Island, Blue Lagoon, Dubrovnik, Brač Island, Vis Island.
  - For Transfer, "From" (anchor) and "To" (map-pin) selects side by side: Split, Split Airport, Trogir, Hvar Town, Bol, Brač, Vis, Komiža. Defaults: Split → Hvar Town.
  - "When" (calendar): a native date input stretched invisibly over a styled display. `showPicker()` opens on click. The label reads "Any date" or e.g. "Sat 14 Jun" (`en-GB`).
  - Primary button `.hs-btn` (46px, highlight blue, search icon):
    - Group: "Search tours" → Tours
    - Private: "Plan my charter" → PrivateBooking
    - Transfer: "Find a transfer" → Contact
  - Note line (`.hs-note`, 13px):
    - Group (info-circle): "Public tour — shared with up to 12 guests"
    - Private (lock): "Fully private — the whole boat is yours"
    - Transfer (clock): "Private transfer — dock to dock, your time"
  - The JS also has a guests stepper (1–12), but it is not in the markup.
- **Right side:** a 420px circular "orbit" photo, right 40px, vertically centred (280px and stacked on top at ≤1024px). The photo is a 3-image strip that pans with a blur/opacity keyframe on each trip-type change:
  - group `dadcccc0c42934ae83b1191097c704a0`
  - private `459a535dd66c6c77cf28944102b4ba05`
  - transfer `17620d6f1eda545b4894db6053b21de2`
  
  Decorative SVG "waves" (bottom-left) and "sun" (top-right) in `#c7ccd1`.

#### B.1.4 Video preview (`section.vp`, `aria-labelledby="vp-title"`)

- `.vp-band`: a full-width background covering the **top 54%** of the section (49% at ≤768px). `#0a2a40` with `url(/_blob/85382a42d38b04ccac1ac10f45ce36bf)` at `center 93% / cover`, plus a navy overlay `linear-gradient(rgba(6,24,40,.55) → .35)`. The player overlaps the band and the white area below it.
- `.vp-inner`: max 960, padding 32px 24px 0 (24px 16px 0 at ≤768px), centred.
  - Eyebrow `p.vp-eyebrow`: "Experience it first-hand" (14px/500, white .9).
  - `h2#vp-title.section-title`: "Preview from our tours" (white, mb 28; 20 at ≤768px).
- **Idle state:** `button.vp-player` (`aria-label="Play tour preview video"`): 16:9, radius 20 (14 at ≤768px), black, shadow `0 18px 48px rgba(6,24,40,.28)`.
  - Poster `<img alt="">` = `/_blob/3f803310f4622fcbe40a7c38a88c2af9` (it replaces the older posters `643ee092…` and `d24aa8a8…`). It scales 1.03 on hover, with a bottom gradient.
  - Centred play disc: 84px (64px at ≤768px), orange `--color-cta-on-image`, white triangle SVG, ring shadow. Scales 1.08 on hover/focus.
  - Meta at bottom-left: clock icon + "**0:22 · A day on the water**".
- **On click:** the state changes to `vpPlay: true` and a `<video class="vp-video" src="/_blob/db2596839bbcddeaadbe13b889cdc17b" poster=… controls autoplay playsinline preload="metadata">` replaces the button. There are no captions or transcript.
- In v4, `.trust-band ~ .vp { margin-top: 0 }`, so the video section sits flush under the trust band.

#### B.1.5 Popular tours

**Header** (inside `.wrap`, align center): h2 "Popular tours". On the right, `.slider-arrows` holds two 36px circular buttons ("Previous tours" / "Next tours", chevrons) and the `.slider-all` pill **"See all tours →"** → Tours.dc.html (36px tall, radius 999, 0.5px border, 14px/500; the arrow nudges 2px on hover). At ≤768px only the arrow buttons hide; the pill stays.

**Track** (`.slider-track`): full bleed, outside `.wrap`.

- `--slider-gutter: max(24px, calc((100% - 912px)/2))` (16px at ≤768px), applied as padding and `scroll-padding-inline`, so card 1 lines up with the 960px column.
- Flex, gap 16, `overflow-x: auto`, `scroll-snap-type: x mandatory`, smooth scrolling, scrollbar hidden, padding 4px gutter 8px.
- Cards are `flex: 0 0 300px` (`min(300px, 82%)` at ≤768px), snap start.

**Edge fades:**

- Left: `.slider-fade-left` is a **solid white** strip the width of the gutter. It masks cards scrolled past the column edge.
- Right: a gradient from white through `rgba(255,255,255,.85)` at 35% to transparent.

**Interaction:**

- Arrow buttons `scrollBy` one card width + 16px, smoothly.
- **Mouse drag-to-scroll on desktop:** pointer type mouse, 5px threshold. While dragging, the track gets `.is-dragging` (grabbing cursor, no snap, no pointer events on links), clicks are suppressed after a drag, and native image drag is prevented. `cursor: grab` only applies on `(hover:hover) and (pointer:fine)`.
- Slider cards **are not links**. Card hover effects are switched off inside the slider; only the "View tour" button reacts.

**Cards:** 6 tour cards plus a final **"See all tours" card** (`a.tour-card.tc-all` → Tours.dc.html):

- Grey background, 1px dashed border, centred content, padding 24.
- 56px white circle with an arrow icon; it turns blue and moves 3px on hover.
- Title "See all tours" (18px/600). Sub "Group trips, private charters and sunset runs" (body-sm, max 200px).

| # | Name | Image blob | Badge | Duration | Price | Per | Rating data (not displayed) |
|---|---|---|---|---|---|---|---|
| 1 | Sunset Bay coastal cruise | 4f05356ebee03f5016b43a559bc34c5b | Best seller | 3h | €55 | / person | 4.9 (128) |
| 2 | Island hopping — Elafiti day trip | b5535f758995bdf694c8c2468734b0c5 | Best seller | 7h | €89 | / person | 4.8 (94) |
| 3 | Private sunset charter | cbc2b610fa31e9081789057f1607038a | Private | 2h | €320 | / boat | 5.0 (41) |
| 4 | Blue Cave & Hvar full day | 5207d5d0f4d27c542bd2802443a85c29 | Best seller | 10h | €110 | / person | 4.9 (203) |
| 5 | Morning snorkel tour | cde84cb92d3381b507a1c6f1a012a9c6 | New | 2h | €45 | / person | 4.7 (67) |
| 6 | Romantic private dinner cruise | 07056f2593f867a3e97043cc9ea27185 | Private | 3h | €280 | / boat | 4.9 (29) |

Every "View tour" goes to TourDetail.dc.html. The JS builds an unused 3× `loopTours` copy and has an unused `centerSlider()`; an infinite loop was considered and dropped.

#### B.1.6 Group or private?

h2 "Group or private?". `.types-grid` is 2 columns, gap 12 (1 column at ≤768px).

Each `.type-card` is a flex column: 1px border-card, radius 12, padding 18px 20px. Hover: border-primary, shadow `0 8px 28px rgba(0,0,0,.06)`, and **the CTA fills blue with white text**.

| | Group card | Private card (`.featured`) |
|---|---|---|
| Badge (top-right, 13px/600, radius 6) | users "Other people on board" (blue-100 / blue-900) | crown "Just you on board" (gold gradient #FBDD84→#F2BC3A, #2E2100 text) |
| Icon circle 48px | blue-100 background, users icon in accent | gold gradient background, crown in #2E2100 |
| Card background | white | `linear-gradient(180deg, --color-premium-bg 0%, white 55%)` |
| Title (17px/500) | Group tour | Private charter |
| Description (16/1.6 secondary) | "Join a small shared departure — max 12 guests. Great for solo travellers, couples, and anyone who likes meeting people on the water." | "The whole boat is yours. Choose your route, set your pace, bring your own food and music. Ideal for families, celebrations, and corporate groups." |
| Features (circle-check, accent, 16px) | "From €45 per person" · "Fixed departures, daily" · "Guided commentary included" | "From €280 for the boat" · "Fully customisable route" · "Flexible departure time" |
| CTA (`.type-cta`, 14px/500 outline, pinned to bottom) | "Browse group tours" → Tours.dc.html | "Plan a private charter" → PrivateBooking.dc.html |

#### B.1.7 Destinations (bento)

**Header** (`.has-sub`, align flex-start, gap 16): h2 "Destinations" + `p.section-sub` "Islands, sea caves and old towns along the Dalmatian coast, all within a boat ride of Split." (16/1.6 secondary, max 520). Pill **"All destinations →"** → Destinations.dc.html.

**`.dest-grid`:** `grid-template-columns: repeat(4, minmax(0,1fr)); grid-auto-rows: 190px; gap: 12px`.

- Card a spans 2 columns and 2 rows. Cards b, e and f span 2 columns.
- Desktop layout:
  - Rows 1–2, left half: **a**.
  - Row 1, right half: **b**.
  - Row 2, right half: **c** and **d** side by side.
  - Row 3: **e** and **f**, half width each.

**Card** (`a.dest-card`, radius 12, flex column, end-aligned, padding 14px 16px, white text, isolated stacking context):

- Image layer `.dest-img` (`alt=""`, scales 1.04 on hover). Fallback is a blue-500→blue-900 gradient.
- `::after` gradient: transparent 40% → `rgba(0,0,0,.55)`.
- `.dest-blur`: 8 stacked spans with `backdrop-filter` blur 0.25→4px, each masked to a band, so the bottom 42% gets progressively blurrier.
- `.dest-name`: 18px/600 (22px for card a).
- `.dest-desc`: 16px, white .88.
- `.dest-count` pill at top-left: sailboat icon + "N tours", glass (white .18 background, .35 border, 6px blur), 13px/500.

| Slot | Name | Desc | Count | Link | Image blob |
|---|---|---|---|---|---|
| a | Blue Cave, Biševo | Sea cave that glows electric blue | 2 tours | Destinations.dc.html | 5207d5d0… |
| b | Hvar Island | Croatia's sunniest island & Pakleni island | 4 tours | **DestinationDetail.dc.html** | f80742f9… |
| c | Blue Lagoon | Turquoise shallows off Drvenik Veli | 3 tours | Destinations.dc.html | b5535f75… |
| d | Dubrovnik | UNESCO-listed walled old town | 8 tours | Destinations.dc.html | 4f05356e… |
| e | Brač Island | Home of Zlatni Rat, the shifting beach | 2 tours | Destinations.dc.html | 4938740a… |
| f | Vis Island | Outer island with untouched bays | 3 tours | Destinations.dc.html | cde84cb9… |

- **≤768px:** the grid becomes a horizontal scroll-snap row. Cards are `flex: 0 0 280px` (`min(280px, 80%)` at ≤480px) with `aspect-ratio: 3/2`.
- No ≤1024px rule: the bento keeps 4 columns on tablet.

#### B.1.8 How it works

h2 "How it works". `.steps` is 4 columns, gap 12 (2 columns at ≤768px, 1 at ≤480px).

`.step-card`: grey background, radius 12, padding 14, gap 8. `.step-num`: 26px white circle with a 0.5px border, 12px/500. Title 16px/500 (`p`). Description 16/1.6 secondary.

1. "Choose a tour": "Browse by destination, activity, or duration. Group or private — your call."
2. "Pick your date": "Check live availability and choose a departure that suits your schedule."
3. "Book securely": "Pay online via secure checkout. Instant confirmation to your inbox."
4. "Show up and sail": "Meet your captain at the marina. Everything else is taken care of."

#### B.1.9 What guests say

**Header:** h2 "What guests say" + **ghost pill** "Read all reviews →" (`.slider-all.is-ghost`: transparent until hover) → TourDetail.dc.html.

**`.reviews-grid`:** 3 columns, gap 12.

**Summary tile** (`.rv-summary`, blue-100 background, radius 12, padding 20):

- `.rv-score` "4.9" (2.75rem/600, blue-900).
- `.rv-stars` "★★★★★" (amber #BA7517, 18px, letter-spacing 2px, `aria-label="4.9 out of 5"`).
- "Average across 800+ reviews".
- `.rv-meta` (pinned to bottom, blue-900, 14px): users icon "4,200+ guests this season", sailboat icon "14 tours and routes".

**Review cards** (`figure.rv-card`, 1px border-card, radius 12, padding 20, gap 12): stars, `blockquote.rv-quote` (16/1.6), and `figcaption` with a 36px initials avatar (purple-100 / purple-900, 13px/600), name (14px/600) and "tour · date" (13px tertiary).

1. ★★★★★ (`aria-label` "5 out of 5"): "“Absolutely magical. The sea cave was the highlight — we were the only boat there at that time of day. Captain was knowledgeable and funny. Book this.”" — **MK, Maja K.**, Sunset Bay coastal cruise · Jun 2025
2. ★★★★☆ ("4 out of 5"): "“Great tour. Swimming stop was a bit short for my taste but the sunset views more than made up for it. Very smooth booking process too.”" — **TR, Thomas R.**, Sunset Bay coastal cruise · May 2025

**≤1024px:** horizontal scroll-snap row. Children are `flex: 0 0 min(320px, 82%)`. The row bleeds to the edges: margin −24/−16/−12px with matching padding and scroll-padding at >768, ≤768 and ≤480px.

#### B.1.10 Common questions

**Header:** h2 "Common questions" + ghost pill "All FAQs →" → Faqs.dc.html.

**`.faq-list`:** 1px border-card, radius 12, overflow hidden. Each item is **one `<button>`** containing both the question and, when open, the answer. Padding 13px 16px, 0.5px bottom divider (none on the last item), hover/open grey background. Chevron 14px tertiary, rotates 180° when open. `aria-expanded` is set. Only one item can be open (`openFaq` index; −1 means none).

| Q (16px/500) | A (16/1.6 secondary) |
|---|---|
| What happens if the weather is bad? | We monitor conditions closely. If a tour is cancelled due to weather, you'll receive a full refund or the option to rebook at no extra cost. We'll notify you at least 4 hours before departure. |
| Do I need to know how to swim? | Not at all. Life jackets are provided on all tours. Swimming stops are optional — you're welcome to stay on the boat. |
| Can I bring young children? | Yes — children aged 3 and above are welcome on all group tours. Life jackets are available in children's sizes. Private charters have no minimum age. |
| How do I cancel or reschedule? | Free cancellation up to 48 hours before departure. Inside 48 hours, bookings are non-refundable. To reschedule, contact us and we'll do our best to find an alternative date. |

#### B.1.11 CTA band

`.cta-band`: inside `.wrap`, radius 20 (16 at ≤768px), padding 2rem (2rem 20px at ≤768px), centred, `margin: var(--sec-gap) 0 48px`. Background `#0a2a40 url(/_blob/85382a42d38b04ccac1ac10f45ce36bf) center 73% / cover` with overlay `rgba(6,24,40,.45 → .6)`.

- h2 "Ready to get on the water?" (Glorich 28px, line-height .96, white, text-shadow).
- p "Tours depart daily. Most sell out 3–5 days ahead in summer — book early." (16/1.6, white .9, max 420).
- Buttons (gap 10):
  - `.btn-primary` "Browse all tours" → Tours.dc.html. Orange, 40px, radius 10, 16px/600, shadow; hover orange-900.
  - `.btn-secondary` "Plan a private charter" → PrivateBooking.dc.html. Glass: white .08 background, 1px white .7 border, 8px blur.
  - ≤768px: stacked, full width, max 320px.

Footer follows with `margin-top: 0` (see A.9).

### B.2 v4 state and handlers

State: `{ hero, img, leaving, paused, openFaq, scrolled, tripType, panSeq, guests, when, where, fromPort, toPort, lang, langOpen, vpPlay }`.

- `scrolled`: a window scroll listener (capture, passive) sets it when y > 40. It drives the nav classes:
  - `is-solid` when scrolled.
  - Otherwise `on-photo` if the slide has a photo.
- Carousel: `img` is the visible background and `hero` is the visible text panel. Text lags by 450ms for the leave animation. The timer is a `setInterval` of 6000ms. Pause stores the elapsed time and resume uses a `setTimeout(6000 - elapsed)`.
- Language: `lang` and `langOpen`.
- Video: `vpPlay`.
- Search (hidden): `tripType`, `where`, `when`, `fromPort`, `toPort`, `guests`, `panSeq` (alternates the pan animation class).
- FAQ: `openFaq`.

### B.3 Responsive summary (v4)

| Breakpoint | Changes |
|---|---|
| ≤1024px | sec-gap 56; reviews become a horizontal scroller; hero text shadows on |
| ≤1000px | trust band becomes a marquee |
| ≤768px | hamburger shown, links hidden, language switcher beside the hamburger; hero text bottom-aligned with 168px bottom padding, h1 `clamp(44px,12vw,64px)`, arrows hidden, dots at 70px, explore at 16px; slider gutter 16, cards `min(300px,82%)`, arrow buttons hidden; destinations become a 280px scroller; steps 2 columns; types 1 column; video band 49%, smaller play button; CTA buttons stacked; footer 2 columns |
| ≤480px | sec-gap 44; `.wrap` padding 12; hero panel max 375; destination cards `min(280px,80%)`; steps 1 column; footer 1 column |

### B.4 Accessibility observations (homepage)

- **Heading order:**
  - The h1 is the active slide's text, so **it changes every 6s**. Slides 0 and 1 contain empty spans. The h1 has no stable descriptive text such as the current site's `sr-only` "Hello Blue Cave: speedboat tours and private charters from Split". Keep the current approach: a static sr-only h1, with slide headings as `h2`/`p`.
  - Order after the h1: h2 Preview from our tours → Popular tours → Group or private? → Destinations → How it works → What guests say → Common questions → CTA h2 → footer **h4** (skips h3).
  - Card titles, step titles and type titles are `<p>`, not headings. The current site uses `h3` for cards.
- **Images:** all decorative `alt=""`, including the hero photos, tour images and destination images. Acceptable when the names are in text, but hero photos carry meaning. The current site gives the hero real alt text.
- **Carousel:**
  - No `aria-roledescription`, region or live labels.
  - Pause is hidden behind "tap the active dot" (its label does say Pause/Play). No pause on hover or focus.
  - **Dots are 8×8px**, below the WCAG 2.5.8 24px minimum target size.
  - **Arrows are invisible until hover** (opacity 0, no `:focus-visible` rule), so keyboard users focus invisible buttons.
  - Auto-rotation ignores `prefers-reduced-motion`.
  - The current `HeroCarousel.vue` handles most of this better: carousel roles, a visible pause button, pause on focus/hover, reduced-motion support, inert inactive slides.
- **Focus:** hbc.css sets `outline: none` on all `.hbc` buttons and inputs, and no `:focus-visible` replacement is defined (except `.tc-btn`, `.vp-player`, `.hs-date`).
- **Contrast** (computed):
  - White hero text on photos has **no scrim** above 1024px, so it is unverifiable and at risk.
  - Amber stars `#BA7517` on blue-100: 3.25:1. The trust-band star `#F59E0B` on white is 2.15:1, but it is decorative and `aria-hidden`; the "4.9" text carries the meaning.
  - White on orange `#C2410C`: 5.18:1. White on brand blue: 5.10:1. Text-tertiary on grey: 4.89:1. All OK.
  - Card borders (`#D6D5D1`, 1.47:1) are fine for non-essential decoration.
- **FAQ:** the answer is rendered **inside the `<button>`**. Screen readers read the whole answer as the button's name, and it cannot contain links. There is no `aria-controls` or region. The current `FAQAccordion.vue` (separate trigger + `hidden` panel + `aria-controls`) is better; keep its structure and restyle it.
- **Stars:** `aria-label` sits on a plain `<span>` with no role, which is unreliable. Use visually hidden text instead.
- **Language menu:** listbox semantics without arrow-key handling or Escape, and focus does not move into the menu.
- **Video:** no captions or transcript.
- **Marquee:** the duplicates are correctly `aria-hidden`. It moves for 40s loops with no pause control (WCAG 2.2.2 requires one for auto-moving content over 5s); reduced motion is honoured.
- The hidden search band uses good patterns (labels via `for`, `aria-pressed`), but a native select is overlaid by a styled `aria-hidden` display. Fine.

### B.5 Changelog v1 → v4

**v1, `Main.dc.html` ("01 Homepage", 4120px tall)**

- Nav: overlay with a **"Contact"** outline CTA. No language switcher.
- Hero: 100vh, 3 photo slides. The panels have **no CTA buttons**.
- The **dark glass search widget is inside the hero**, below the slide text: Group/Private/Transfer toggle (no sliding indicator), Where (or From/To), When, a search button and a note. It is the same widget as B.1.3 in its dark glass variant.
- **The trust line is overlaid on the hero bottom** (dark glass). Dots at bottom 76px. No Explore button.
- Popular tours: header with a "See all tours →" **text link** plus arrows.
- Destinations bento.
- Only the first two section titles use Glorich. "How it works", "Group or private?", "What guests say" and "Common questions" are **18px/500 plain titles**. There is no `--sec-gap`; spacing is margin-bottom 14px and 32px.
- Group or private: private card in purple.
- Grey `.cta-band` (`background: --color-background-secondary`, radius 12) with no photo.
- Slide 3 h1 reads "Hello / Blue **Cave** / Croatia".
- No video, no section subtitles.
- Data props: hero photos only.

**v2, `Main-n19w` (5080px)**

- **Language switcher** replaces the Contact CTA. The desktop nav becomes a 3-column grid.
- Every hero slide gets an **orange `.hero-cta`**. Slide 3 CTA: "Meet the crew" → About. The slide 3 h1 lowercases to "Blue cave".
- **"Explore" button** added. Dots at bottom 128px, Explore at bottom 70px (the trust line is still overlaid on the hero bottom).
- **Search moved out of the hero** into a white **search band** below it:
  - Glorich 56px headline per trip type.
  - Light card with a **sliding tab indicator**.
  - **Orbit photo** that pans between 3 photos, plus decorative sun and waves SVGs.
  - New data props: `groupBg`, `privateBg`, `transferBg`.
- **All section titles become Glorich 28px uppercase.** `--sec-gap` 72/56/44 introduced.
- **Photo CTA band** (image `f155a16b9e88c1741a9e475ada1cbbdf`, center 60%) with orange and glass buttons.
- Reviews summary uses `--color-background-brand-soft`. Text in steps, FAQ, type features and destination descriptions is still 14px.

**v3, `Main-n19w-fhxd` (5190px)**

- **Search band hidden** (`display: none`).
- **Video preview section added** after Popular tours. Meta "1:30 · A day on the water". No default video or poster: the play button does nothing until the props are set.
- Slide 3 CTA becomes "See the Blue Cave tour" → TourDetail.
- **Private card restyled in gold/premium**: gradient badge and icon, gradient card background. Type cards gain a hover shadow, and the CTA fills blue on card hover. Features and text move to 16px.
- Step title, FAQ question and destination descriptions move to 16px.
- Reviews summary background changes to `--color-background-info`.
- CTA band image changes to `85382a42d38b04ccac1ac10f45ce36bf` (center 73%) with a stronger overlay.

**v4, `Main-n19w-fhxd-j4z6` (5211px), "trust band below hero"**

- **Trust line moved out of the hero** into a white band directly below it: 15px text, blue 20px icons, `#F59E0B` stars, marquee at ≤1000px.
- Explore scrolls to the trust band. Dots move to 80px and Explore to 22px (70 and 16 at mobile).
- **Video section moved up**, directly after the trust band and before Popular tours, with margin-top 0. Default video `db2596839bbcddeaadbe13b889cdc17b` and poster `3f803310f4622fcbe40a7c38a88c2af9` are wired in. Meta is now "0:22". `preload="metadata"` and a poster are added to `<video>`. The band is shorter (54%), with padding 32.
- **"Group or private?" moved above Destinations.**
- Destinations header gains the **subtitle**.
- Text links ("See all tours →", "All destinations →", "Read all reviews →", "All FAQs →") are replaced by **pill buttons** (`.slider-all`; ghost variant for reviews and FAQ). The pill sits after the slider arrows. At ≤768px only the arrows hide.
- **"See all tours" end card** added to the slider.
- **Desktop mouse drag-scroll** on the slider. Slider cards lose their hover effects.

### B.6 Homepage vs current site (`src/pages/index.astro`)

**Current order:**

1. `sr-only` h1
2. Hero (one static photo `src/assets/hero-banner.jpg` with overlay; `HeroCarousel.vue` with **2 text panels**: "The Adriatic from the water, the way it should be" → /tours/, and "Your own boat, your own itinerary" → `/contact/?tour=create-perfect-day-private`; dots + pause button + "Explore")
3. Popular tours (`.cards-scroll` of `TourCard.astro`, `getFeaturedTours()`)
4. **"Where we go"** (6 icon-only dest cards, 110px, no photos: blue-cave, hvar, zlatni-rat, pakleni, blue-lagoon, vis)
5. How it works
6. Group or private?
7. **Trust bar** (4 grey tiles from `ABOUT.trustStats`: 9 yrs / 12 max / 4.9 ★ / Licensed)
8. Common questions (`FAQAccordion.vue`, `FAQ_ITEMS.slice(0,4)`)
9. Grey CTA band
10. Footer

**New in the design:**

- A third hero slide and **one photo per slide** (3 images instead of 1).
- Orange on-photo CTAs; Glorich display type; language switcher.
- Trust **band** with marquee, instead of the tiles lower on the page.
- **Video preview** section (needs a video asset, poster and duration).
- Slider with arrows, drag and an end card.
- **Photo bento** destinations with subtitle and tour counts.
- **"What guests say" reviews section** (the current home has none; the July draft did).
- Photo CTA band; ghost and pill "see all" buttons.

**Changed copy:**

| Item | Current | Design |
|---|---|---|
| Destinations heading | "Where we go" | "Destinations" |
| Group features | "From €75 per person" / "Licensed skipper on every route" | "From €45 per person" / "Guided commentary included" |
| Private features | "Quoted per boat and season" | "From €280 for the boat" |
| Step 4 | "Meet your captain at Riva stand 14. We take care of everything else." | "Meet your captain at the marina. Everything else is taken care of." |
| CTA band | "Tours run daily from Split, 1 April to 30 November. Book early in July and August. Popular routes fill 3–5 days ahead." | "Tours depart daily. Most sell out 3–5 days ahead in summer — book early." |
| Experience | "9 yrs" | "since 2015" / "10 years" |
| Hero subtitle | "real skippers" | "real guides" |

**Removed or weakened:**

- The static sr-only h1.
- The visible pause button.
- Carousel ARIA.
- The "Contact" nav link and "Book now" nav CTA (home).
- Footer phone, email and address.
- The "Licensed — Croatian Maritime Authority" trust stat. Not in the band; only the footer has "Licensed maritime operator".
- Structured data is unaffected (build concern only).

**Data the homepage needs that the repo lacks:**

- Aggregate rating (4.9), review count (800+), guests this season (4,200+), tour/route count ("14 tours and routes"; the repo has 7 tours).
- Featured reviews: name, initials, stars, quote, tour, month.
- Video file, poster and duration.
- 3 hero photos with per-slide copy.
- Destination photos for **Dubrovnik** and **Brač** (the repo has photos only for blue-cave, blue-lagoon, hvar, pakleni and vis in `src/assets/destinations`).
- Short per-destination tagline (`shortDescription` exists but is longer).
- Per-tour short duration ("3h") and a numeric price. `fromPrice` is a string, and three tours are "On request" or "Price on request".
- An explicit "best seller" badge (currently derived from `featured`).
- Language list and i18n strings, if the switcher ships.

---

## C. Catalog pages

### C.1 Tours overview (`Tours.dc.html`, "02 Tours overview")

**Order:**

1. Nav (overlay, on-photo; links mark Tours `.current`; "Contact" outline CTA)
2. Photo hero with filters
3. Results bar
4. Tour grid
5. Empty state
6. "Group or private?"
7. "How it works"
8. Footer

`--sec-gap` 72/56/44.

**Hero** (`section.tours-hero`):

- Height 540px (480 at ≤768px), `#0a2a40`. Image `/_blob/6db22cf5a8d634b0343f7323ec5796a6` (`heroImage` prop), `object-position: 70% center`, `alt=""`.
- `.page-topfade`: a 160px black .38 → 0 gradient behind the nav.
- `::after` scrim: a horizontal gradient `rgba(6,24,40,.62)` 0% → .28 45% → 0 75%, plus a bottom-up gradient `.55` → 0 at 45%.
- Inner: max 960, padding 0 24px 28px (0 16px 20px at ≤768px), content bottom-aligned.
  - Eyebrow "Split · Dalmatian coast" (13px/600, letter-spacing .08em, uppercase, white .85).
  - **h1 "Our tours"** (Glorich 72px, line-height .94, white, text-shadow; `clamp(44px,12vw,60px)` at ≤768px).
  - Description "Group departures and private charters, from short sunset runs to full-day island hops." (16/1.6, white .88, max 440).

**Filter bar** (in the hero): flex, wrap, gap 8. At ≤768px it becomes a single nowrap horizontal scroller with hidden scrollbar that bleeds to the right edge.

- Glass chips `.filter-chip`: 38px pill, 14px/500, glass (`rgba(8,28,48,.42)`, 1px white .26 border, 14px blur), white text.
  - `.active`: white .96 background, primary text. Buttons carry `aria-pressed`.
  - Chips (multi-select, **OR logic**): Group (users), Private only (crown), **Under 4h** (clock; `parseInt(duration) < 4`), Sunset (sunset; tag).
- **Sort chip**: `label.filter-chip.sort-chip`, pushed right with `margin-left: auto` (0 at ≤768px). It contains the arrows-sort icon, a transparent `<select aria-label="Sort tours">` and a chevron.
  - Options: Most popular (default: review count descending), Price: low to high, Price: high to low, Duration, **Top rated** (rating descending).
  - The select's value is not bound to state, which is fine.

**Results bar:** `.wrap.tours-results` with padding-top 32. Flex, space-between, min-height 28, mb 16.

- `p.results-count[aria-live=polite]`: "**8** tours", or "**N** tour(s) match your filters".
- When any filter is active, a "Clear filters" text button (14px/500, info blue, underline on hover) resets the filters.

**Grid:** `.tour-grid { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px }`, so 3 columns at 960px. There is no explicit breakpoint; it reflows down to 1 column. Cards are `.tour-card` (A.10): image + optional badge, name, From/price/per, duration, "View tour" → **TourDetail.dc.html for every card**.

- The whole card is not a link, only the button. Card hover still lifts the card and turns the button blue.
- The design no longer splits out "Featured" (`showFeatured = false`): one flat list.
- The rating is computed (`ratingLabel`) but not displayed.

Tours data (8):

| id | Title | Image | Duration | Type | Tags | Price | Rating (reviews) | Badge |
|---|---|---|---|---|---|---|---|---|
| 1 | Sunset Bay coastal cruise | 4f05356e… | 3h | group+private | sunset, swim | €55 / person | 4.9 (128) | Best seller |
| 2 | Island hopping — Elafiti day trip | b5535f75… | 7h | group | swim | €89 | 4.8 (94) | — |
| 3 | Private sunset charter | cbc2b610… | 2h | private | sunset | €320 / boat | 5.0 (41) | Private |
| 4 | Morning snorkel tour | cde84cb9… | 2h | group | swim | €45 | 4.7 (67) | New |
| 5 | Blue Cave & Hvar full day | 5207d5d0… | 10h | group | swim | €110 | 4.9 (203) | Best seller |
| 6 | Romantic private dinner cruise | 07056f25… | 3h | private | sunset | €280 / boat | 4.9 (29) | Private |
| 7 | Pakleni islands swim day | 32dfc7c5… | 6h | group+private | swim | €75 | 4.8 (52) | — |
| 8 | Private Hvar & Pakleni charter | f80742f9… | 8h | private | swim | €650 / boat | 5.0 (18) | Private |

"/ boat" is shown only when the type is private only. Each tour also has a long description that the cards do not render.

**Empty state:** `.no-results`, centred, padding 2rem: a 28px `ti-mood-sad` icon in border-secondary grey and "No tours match your filters."

**Below the grid:**

- "Group or private?": identical to the homepage, **without the CTA buttons**. Padding-bottom 26, `.type-features` with mb 0, gap 16.
- "How it works": identical 4 steps, gap 16.
- Footer `margin-top: var(--sec-gap)`.

**State:** `{ filters: [], sort: 'popular', scrolled }`. The scroll listener toggles the nav between `on-photo` and `is-solid`.

**Accessibility:**

- One h1, then h2s; footer h4s skip h3.
- Card names are `<p>`. All images have `alt=""`.
- The filter bar has no group role or label (the current site has `role="group" aria-label="Filter tours"`).
- `aria-live` on the count is good.
- Glass chips over a photo: white text on a .42 navy glass is likely ≥4.5:1, but it depends on the photo.
- No visible focus style (A.6).
- Every "View tour" link goes to the same place.

**vs current (`src/pages/tours/index.astro` + `ToursCatalog.vue`):**

| Aspect | Current | Design |
|---|---|---|
| Header | Plain h1 "Our tours" + "{N} experiences from Split — …" on white | 540px photo hero, eyebrow, Glorich h1, glass chips **inside the hero** |
| Filters | Group / Private only / **Half day** / Sunset; OR logic; also `?type=`, `?destination=`, `?q=` URL params (no visible search field) | Group / Private only / **Under 4h** / Sunset. "Under 4h" would match **none** of the real tours (all ≥5h), so keep "Half day" semantics. No destination or search params in the design. |
| Sort | Most popular / Price ↑ / Price ↓ / Duration | + **Top rated** (needs ratings) |
| Results UI | sr-only status only; "Featured (n)" + "All tours (n)" section labels | Visible count + "Clear filters"; single list |
| Card | `<a>` card: badges (Best seller, New, Group, Private), h3, duration + type meta, short description, price; "Details" + "Book now/Enquire" buttons | Single badge, name, From price + per, duration, one "View tour" button; no description, no type meta, no direct Book button |
| Extra sections | none | Group or private? + How it works |

The design needs data the repo lacks: numeric price (for sort and "From €X") for on-request tours, rating and review count, short duration, explicit tags (sunset is currently inferred from text), and a badge enum including bestseller and private.

### C.2 Tour detail (`TourDetail.dc.html`, "03 Tour detail")

**Order:**

1. Nav (plain sticky, "Book now" → Tours)
2. Breadcrumb
3. Gallery (hero + 4 thumbs)
4. Two-column layout: main (h1, meta, intro, Itinerary, What's included, What's not included, Good to know) + sticky booking sidebar spanning 2 rows; Reviews in row 2 under main
5. Lightbox (conditional)
6. Mobile book bar
7. Footer

`--td-sec: 36px` (28 at ≤768px). `.hbc { overflow-x: clip }`.

**Breadcrumb:** `div` (not `nav`), 14px tertiary: "Tours › Coastal cruises › Sunset Bay coastal cruise". The first two crumbs link to Tours.dc.html; "Coastal cruises" is a category the repo does not have.

**Gallery:**

- `button.img-hero` (`aria-label="Open photo gallery"`): 16:9, max-height 540 (3:2 at ≤768px), radius 12, `cursor: zoom-in`. Image `alt="Sunset Bay coastal cruise"`, scales 1.03 on hover.
- Top-left tags (`.tag`: 12px/500, padding 4px 10px, radius 20):
  - "Private available" (crown, purple)
  - "Group tour" (users, `.tag-grp` = background-success/text-success, which is **now blue-100/blue-900**)
- Bottom-right `.img-count` pill (white .95, 14px/500, shadow): photo icon + "View all 12 photos".
- `.img-thumbs`: 4 columns, gap 8, mb 28 (20 at ≤768px). Buttons with 16:10 radius-8 images, labelled "Open photo N". The 4th thumb has a navy .55 overlay "+7" and the label "View all 12 photos". Each opens the lightbox at its index.

12 photos in `PHOTOS`, in order: 4f05356e, cbc2b610, 07056f25, cde84cb9, 5207d5d0, b5535f75, 32dfc7c5, 796f7f6b, 6db22cf5, f80742f9, 85382a42, dadcccc0.

**Lightbox:**

- `div.lb[role=dialog][aria-modal=true][aria-label="Photo gallery"]`: fixed, full screen, `rgba(4,14,24,.94)`, fade in .2s.
- Top bar: "{n} / 12" and a close button (44px round, `aria-label="Close gallery"`).
- Stage: prev and next 44px buttons ("Previous photo" / "Next photo"; overlaid on the image at ≤768px). The image is `contain` with `alt="Photo n of 12"`. Clicking the backdrop closes; clicking the image does not.
- Thumbnail strip: 72×52 buttons, labelled "Show photo n"; inactive at .5 opacity, active with a white border. Centred, or left-aligned on mobile.
- Keyboard: **Escape** closes, **←/→** step (window keydown).
- **No focus move or trap**, and focus is not returned to the trigger. Add these.

**Main column:**

- **h1** "Sunset Bay coastal cruise": `--font-size-hero` (28–40px), weight 500, line-height 1.3, system sans (no Glorich on this board).
- `.rating-row` (14px secondary): clock "3 hours" · users "500+ happy guests". Despite the class name, it shows no star rating.
- Intro `p.prose` (16/1.6 secondary), no heading: "Sail along the dramatic Adriatic coastline as the sun dips below the horizon. This three-hour voyage takes you past sea caves, hidden coves, and the old town walls — ending with a golden-hour view that's hard to forget. Available as a shared group departure or as a fully private charter."
- **Itinerary.** `.section-title` is a **`div`** (18px/500, 0.5px bottom border, padding-bottom 10). Timeline items: a 32px round dot (blue-100, blue-300 border, 16px info-blue icon), with a 0.5px vertical connector line between items.

  | Time | Label (16px/500) | Description (body-md) | Icon |
  |---|---|---|---|
  | 18:00 | Departure — Marina Pier B, Gate 3 | Meet your captain. Life jackets and safety briefing on board. | map-pin |
  | 18:30 | Sea cave passage | Enter the Blue Grotto by dinghy. Best light in the late afternoon. | cave |
  | 19:10 | Swimming stop — Sveti Nikola cove | 30 minutes at anchor. Snorkelling gear available on request. | swimming |
  | 20:00 | Sunset sail past the old town walls | Drinks served. Prime photo moment. | sunset |
  | 21:00 | Return to Marina Pier B | — | anchor |

- **What's included:** 2-column grid (1 column at ≤768px), body-sm, green `#1a9e5c` circle-check icons: Welcome drink · Life jackets · Guided narration.
- **What's not included:** a separate section with a red `#d33a2c` `ti-x` icon: Cave entrance ticket · Dinghy for cave entry.
- **Good to know:** `.info-grid`, 2 columns (1 at ≤768px), equal-height rows. Tiles are grey, radius 8, padding 10px 12px, with a 12px uppercase tertiary label and a 14px/500 value clamped to 2 lines.
  - Additional fees: "Cave ticket, paid in cash on site." + external link "Ticket prices ↗" (`https://example.com/blue-cave-tickets`, `target=_blank`, with sr-only "(opens in a new tab)"; the arrow icon is rotated −45°). Placeholder URL.
  - Language: "EN, HR"
  - What to bring: "Swimwear, sunscreen, camera"
  - **Hidden** tiles (`hidden` + `display: none`): Minimum age "3 years", Group size "Max 12 guests", Accessibility "Wheelchair friendly". These look deliberately parked.
- **No "Highlights" section in the markup.** The `.highlights`, `.hl-item` and `.highlights-marquee` CSS is present but unused, so Highlights was dropped from this board. There is also **no weather or safety section** on tour detail.

**Reviews** (`.reviews-col`, row 2, column 1): title "Reviews (128)", where "(128)" is 400 weight, tertiary, 14px.

- Cards: grey, padding 12, radius 8. Meta row: 30px initials avatar (purple), name 14px/500, stars (amber, 13px), date (13px tertiary, right).
  - MK Maja K. ★★★★★ Jun 2025: "Absolutely magical. The sea cave was the highlight — we were the only boat there at that time of day. Captain was knowledgeable and funny. Book this."
  - TR Thomas R. ★★★★☆ May 2025: "Great tour. Swimming stop was a bit short for my taste but the sunset views more than made up for it. Very smooth booking process too."
  - LS Lena S. ★★★★★ Aug 2025: "Small boat, relaxed pace and a captain who clearly loves the coast. The cove swim was the best part of our trip."
- Button "Show all 128 reviews ›" (14px info blue) has **no handler**.
- ≤1024px: the list becomes a horizontal scroll-snap row with edge masks. Cards are `min(340px, 46%)` (82% at ≤768px).

**Sidebar** (`#td-book`): `grid-column: 2; grid-row: 1 / span 2`, sticky at top 76px, column width **322px**, column gap 32.

`.sticky-card`: 1px border-card, radius 12, padding 1.25rem.

- Price row: "From" (13px tertiary) **€95** (22px/600) "/ adult" (13px).
- Child price: baby-carriage icon + "Children from €55" (body-sm secondary).
- Card row: calendar "Next available" … "**Today, 18:00**". Then a divider.
- `a.cta-primary` "Book group tour →" → GroupBooking.dc.html: full width, padding 12, brand blue, white 14px/500, radius 8.
- `a.cta-secondary` crown "Book as private charter" → PrivateBooking.dc.html: outline, padding 10, mt 8.
- `.policy-pill` (13px, text-success = blue-900, centred): shield-check "Free cancellation up to 48h before".

**Mobile (≤768px):**

- Grid becomes 1 column, in the order main → **sidebar** (static, preceded by a mobile-only title "Book now") → reviews.
- `.hbc` gets padding-bottom 72.
- **Mobile book bar** (`.mobile-book-bar`): fixed at the bottom, white .97, top border, shadow, padding 12px 16px.
  - Content: "€95 / adult" plus a link "Book now" (brand blue button) to `#td-book`.
  - The whole bar is `role="button" tabindex="0" aria-label="Go to booking options"` and smooth-scrolls to the booking card (`block: end`).
  - It **hides** (translateY 110%, opacity 0) while `#td-book` is ≥15% in view, via IntersectionObserver.
  - `#td-book` has `scroll-margin-top: 72px` and `scroll-margin-bottom: 88px`.

**State:** `{ lb: -1, bookInView }`.

**Accessibility:**

- Only one heading (h1). **Every section title is a `div`**: Itinerary, Included, Not included, Good to know, Reviews, Book now. Use h2s (the current site has them).
- The breadcrumb is not a `nav` and has no `aria-current`.
- The mobile bar is a `role=button` that **contains an `<a>`**: nested interactive elements. There is also no keyboard (Enter/Space) handler on the role=button div.
- Lightbox focus management is missing.
- The hero is a `<button>` containing visible tags. Acceptable, since the name comes from `aria-label`.
- Thumbs: `alt=""` plus button labels. Good.
- Stars are plain text glyphs with no accessible rating.
- `#1a9e5c` checks are 3.45:1, which is OK for icons (3:1).
- "Show all reviews" does nothing.

**vs current (`src/components/tour/TourDetailView.astro`, `ImageGallery.vue`):**

| Area | Current | Design |
|---|---|---|
| Gallery | `ImageGallery.vue`: hero swaps in place with prev/next arrows, thumb strip, live region, tags (Group / Private available or Private charter / Best seller) | Hero + 4 thumbs ("+N") opening a **full-screen lightbox** with keyboard support and a thumbnail strip; tags Private available / Group tour |
| Breadcrumb | `nav` with `aria-current`; middle crumb = primary destination | `div`; middle crumb = category "Coastal cruises" |
| h1 | 20px/500 | `--font-size-hero` 28–40px/500 |
| Meta row | duration (≈) · "Small group" or "Private charter" | duration · "500+ happy guests" (needs a guests-served count) |
| Overview | h2 "Overview" + `overviewHighlights` | Unheaded intro paragraph |
| Highlights | h2 Highlights rendering **`tour.included`** (the known Highlights bug) | **Removed** (CSS only) |
| Itinerary | `string[]` steps; time only on the first (`scheduleLabel`) and last (`returnTime`) step; cycled icons | Time + label + description + specific icon per step |
| Included | One grid: included (circle-check) + not included (circle-x) | Two sections; check (green) and x (red) |
| Good to know | Duration, Departure, Return, Season, Meeting point, What to bring, Cave entry + `importantInfo` paragraph | Additional fees (with external link), Language, What to bring; hidden: Min age, Group size, Accessibility |
| Destinations on this tour (chips) | Yes | **Removed** |
| Please note (disclaimers) | Yes | **Removed** (must stay for operator-supplied caveats) |
| Reviews | None | Reviews (128) with 3 cards + "Show all" |
| Sidebar | From price + `priceNotes`, Next departure, Season, Book group tour / Enquire, "Enquire about a private charter" (contact), policy from `CANCELLATION_SHORT` | From €95 / adult, **Children from €55**, **Next available: Today, 18:00**, Book group tour → GroupBooking, **Book as private charter** → PrivateBooking (not an enquiry), policy pill |
| Mobile bar | Always visible: price + Book/Enquire | Hides while the booking card is visible; scrolls to the card instead of linking to checkout |

Data the design needs that `TourDetail` lacks:

- `rating`, `reviewCount`, `reviews[]` (name, initials, stars, month/year, text)
- `guestsServed` ("500+")
- **Structured itinerary** `{ time, label, description, icon }[]`
- `childPrice`
- `nextAvailable` (would come from the availability store)
- `languages`
- `additionalFees` `{ text, link }`
- `minAge`, `groupSize`, `accessibility` (hidden for now)
- Breadcrumb `category`
- Per-tour hero `tags`
- **Real highlights** (separate from `included`), if Highlights comes back
- Numeric adult price for "/ adult"

The design data contradicts itself: €95 / adult here vs **€55 / person on the homepage and Tours cards** for the same tour. "Marina Pier B, Gate 3" vs the real meeting point "Riva stand 14".

### C.3 Destinations overview (`Destinations.dc.html`, "04 Destinations overview")

**Order:**

1. Nav (overlay, on-photo; Destinations `.current`; "Contact" CTA)
2. Photo hero with filter chips
3. Section label + 2-column card grid
4. Empty state
5. "Not sure where to go?" strip
6. Footer (margin-top 56)

**Hero** (`section.dest-hero`): 540px (480 at ≤768px). Image default `/_blob/32dfc7c5ccd7f71a00ac9e2c4b28646f`; an old default `017adfe4…` is mapped to it. `object-position: center 79%`. Same scrims, top fade, inner layout and type as the Tours hero (72px Glorich h1).

- Eyebrow "Islands · Caves · Old towns".
- **h1 "Destinations"**.
- Description "From the walled city of Dubrovnik to the remote outer islands — here's where our boats take you."

**Filter chips** (`.chip`, same glass style as Tours): **single-select**, `aria-pressed`.

- All destinations (no icon)
- Islands (`ti-island`, which is the beach glyph)
- Coastal towns (anchor)
- Caves & nature (mountain)
- Best for swimming (swimming)

At ≤768px the row becomes a nowrap horizontal scroller.

**Results:**

- `p.section-label` "All destinations (N)" (12px/500 uppercase tertiary, letter-spacing .06em).
- `.dest-grid`: **2 columns, gap 20**, mb 28 (1 column with gap 14 at ≤640px).
- Cards reuse `.tour-card` styling:
  - `.tc-img` 220px (200 at ≤640px), photo or an icon fallback.
  - Region badge `.tc-badge.dest-region` (white background, primary text) at the top-left of the image.
  - `.tc-name` (mb 6).
  - `.dest-desc` (body-md secondary, **2-line clamp**).
  - `.tc-chips` attribute chips (icon 13px + label, grey pill 13px).
  - `.dest-foot`: top border, padding-top 14, centred. Left: sailboat "N tours visit here". Right: `.dest-cta` pill "See tours →" (36px, 0.5px border).
- **Only Hvar renders as a link card** (`a.tour-card` → DestinationDetail.dc.html). The others render as a `div` whose "See tours" is a `<button>` with **no handler**.

| Name | Region | Image | Description | Attributes | Tags (filter) | Tours |
|---|---|---|---|---|---|---|
| Dubrovnik old town | Dalmatia coast | 4f05356e… | The jewel of the Adriatic — medieval city walls, marble streets, and sea views that stop you mid-sentence. | ship "Main departure point", swimming "Sea swimming", castle "UNESCO old town" | coast, swim | 8 |
| Hvar island | Central Dalmatia | f80742f9… | Croatia's sunniest island — lavender fields, a hilltop fortress, and some of the clearest water on the coast. | swimming "Crystal water", sunset "Sunset views" | island, swim | 4 (detail page) |
| Elafiti islands | Near Dubrovnik | b5535f75… | Three car-free islands just 30 minutes from Dubrovnik. Quiet, lush, and largely untouched. | trees "Car-free", fish "Snorkelling" | island, swim | 3 |
| Blue Cave, Biševo | Island of Vis | 5207d5d0… | One of the most photographed natural phenomena on the Adriatic. Electric blue between 11am and noon. | clock "Best 11:00–12:00", users "Entry by dinghy" | cave | 2 |
| Korčula old town | Korčula island | **none (tower icon fallback)** | A miniature Dubrovnik on its own island — cobbled streets, stone towers, and a claim to being Marco Polo's birthplace. | building "Medieval centre", glass-full "Good local wine" | island, coast | 2 |
| Vis island | Outer archipelago | cde84cb9… | Croatia's most remote inhabited island. Pristine bays, no crowds, and the best anchovies you'll eat anywhere. | fish "Fishing village", droplet "Blue Cave nearby" | island, swim, cave | 3 |

`featured` and `wide` fields exist but are unused: no "Not to miss" split.

**Empty state:** compass-off icon + "No destinations match this filter."

**Also strip** (`.also-strip`, grey, radius 12, padding 1rem 1.25rem, flex wrap):

- t1 "Not sure where to go?" (16px/500).
- t2 "Browse all tours and filter by activity, duration, or price instead."
- `a.also-btn` "Browse tours ↗" → Tours.dc.html (14px/500 outline, radius 8). The ↗ suggests an external link, but the target is internal.

**State:** `{ filter: 'all', scrolled }`.

**Accessibility:**

- h1 only. The section label is a `p`, card names are `p`, so **there are no h2/h3 at all**.
- Non-link cards contain dead buttons. The filter row has no group label.
- Images `alt=""`.
- Hero glass chips: same caveat as Tours.

**vs current (`src/pages/destinations/index.astro` + `DestinationsCatalog.vue`):**

- **Header:** current is a plain h1 (28px/500) + description "From Split's Riva to the outer islands, our tours cover the central Dalmatian coast." The design has a photo hero with chips in it.
- **Map strip:** current has a clickable strip of destination dots linking to Google Maps. **Removed in the design.**
- **Grouping:** current has "Not to miss (n)" (featured, first card wide) + "More destinations (n)". The design has a single "All destinations (n)".
- **Cards:** current `article` with a link body (image + region pill, h3 name, region line with map-pin, description, attribute tags) and a footer with "N tours visit here" + **"See tours →" → `/tours/?destination={slug}`**. Every card links to its detail page. The design is visually close, but:
  - Region appears only as the badge.
  - The description is clamped.
  - Attributes are grey chips.
  - The CTA is a pill.
  - Only one card is wired in the mock. Production should link every card, and keep "See tours" → `/tours/?destination=`.
- **Filter icons:** current uses `building-lighthouse` for Islands (the design uses `island`, which is the beach glyph). Current matching is tag-text heuristics; the design uses explicit tag arrays.
- **Copy:** the also-strip copy is identical.
- **Data:** the current repo has 10 destinations (blue-cave, vis, hvar, pakleni, blue-lagoon, split, zlatni-rat, trogir, korcula, dubrovnik) with `region`, `shortDescription`, `tags`, `attrs`, `highlights`, `geo`, `insiderTips`, `tourSlugs`, `featured`, `bestTimeMonths`, `nearby`.
  - The design's 6 include **Elafiti**, which is not in the repo and is near Dubrovnik, not Split.
  - The design treats **Dubrovnik as the "Main departure point"**, which contradicts the Split-based business and the repo's `split` hub.
  - The design omits Split, Pakleni, Blue Lagoon (on this page), Zlatni Rat and Trogir.
  - Treat the design data as placeholder and keep the repo's content.

### C.4 Destination detail — Hvar (`DestinationDetail.dc.html`, "10")

**Order:**

1. Nav (plain sticky; Destinations `.current`; "Book now" → Tours)
2. Breadcrumb "Destinations › Hvar island"
3. Gallery
4. Layout 1fr / 322px: main (h1, intro, Highlights, Location & getting there, Insider tips, Tours that visit Hvar) + sticky sidebar "Hvar at a glance"
5. Lightbox
6. Mobile bar
7. Footer

`--td-sec` 36/28.

**Gallery:** same component as Tour detail.

- Image `alt="Hvar island"`.
- Tags (flex wrap, max-width calc(100% − 90px)): swimming "Swimming" and `ti-island` "Island" (`.tag-feat` = blue-100/blue-900), and sun "Sunniest island in Croatia" (`.tag-tip` = amber-100/amber-900).
- "View all 10 photos", "+5".
- PHOTOS: f80742f9, 32dfc7c5, 017adfe4, 5207d5d0, b5535f75, 796f7f6b, cbc2b610, 85382a42, f155a16b, 6db22cf5.

**Main column:**

- **h1 "Hvar island"** (`--font-size-hero`, 500, system sans).
- Intro `p.intro` (body-md): "Croatia's sunniest island — lavender fields running down to the sea, a hilltop fortress you can walk to in twenty minutes, and water so clear you can see the bottom from the boat. It's busy in July and August, but arrive by tender from the water and you sidestep the crowds entirely."
- **Highlights** (`p.sec-title`): 2-column grid of grey tiles (`.hl`: padding 9px 11px, radius 8, body-sm, highlight-blue icon 1.2em):
  - droplet "Some of the clearest water on the Adriatic"
  - tower "Venetian fortress with panoramic views"
  - leaf "Lavender fields in June and early July"
  - glass-full "Local plavac mali wine worth tasting"
  - beach "Hidden coves only reachable by boat"
  - moon "Lively old town squares in the evening"
  
  ≤768px: the grid is hidden and replaced by an `aria-hidden` **marquee** (items duplicated, 220px each, 26s linear loop, 24px edge masks). Reduced motion is not handled here.
- **Location & getting there:**
  - `.map-stub`: a `div` (cursor pointer, **not a link**), 100px tall, grey, 1px border-card, radius 12, map-2 icon in accent + "View on map — 60 km from Split by sea".
  - `.geo-grid`, 2 columns (1 at ≤768px): Distance from Split "~60 km by sea"; Travel time by boat "~2.5 hours"; Island size "68 km long"; How we get there "Direct charter or day trip".
- **Insider tips:** numbered grey rows (number in accent, body-sm):
  1. "The fortress walk takes about 20 minutes from the main square and the view from the top is worth every step. Go in the late afternoon for the best light."
  2. "The Pakleni islands just offshore are where the good swimming is — the main town beach is pretty but crowded. We always anchor off Palmižana."
  3. "Arriving by boat means you dock right in the heart of the old town. Guests coming by ferry land a short walk away — another reason the water approach wins."
- **Tours that visit Hvar (4)** (`#dd-tours`, scroll-margin-top 72): `.dd-tours` grid `repeat(auto-fill, minmax(250px, 1fr))`, gap 14, of standard `.tour-card`s:
  - "Island hopping — Elafiti day trip" €89 / person, 7h, no badge, image b5535f75
  - "Blue Cave & Hvar full day" €110 / person, 10h, **Best seller**, image 5207d5d0
  - Both "View tour" → TourDetail.
  - **The heading says (4) but only 2 cards render**, and Elafiti does not visit Hvar.

**Sidebar** (sticky, top 76; **hidden entirely at ≤768px**). `.sticky-card` (padding 1.1rem 1.25rem):

- `p.sc-heading` "Hvar at a glance" (17px/500).
- Stat tiles: Tours visiting "4 tours"; Best season "May – Oct"; From Split "~2.5h by boat". Divider.
- "Current conditions" (14px/500 secondary). Row: sun icon (warning amber) "Sunny" … "**28°C**". Then "Sea temp 24°C · Light winds" (13px tertiary). Divider.
- `a.btn-primary` sailboat "Browse Hvar tours" → Tours.dc.html (full width, padding 11, brand blue).
- `a.btn-secondary` crown "Plan a private charter" → PrivateBooking.dc.html.

**Mobile bar:**

- Content: "**4 tours** visit Hvar" plus a link "See tours" (`#dd-tours`).
- `role=button` with `aria-label="Go to tours that visit Hvar"`; smooth-scrolls to the tours section (`block: start`).
- Hides while `#dd-tours` is in view.

**Accessibility:**

- Section titles are `p`, so there is no heading below h1.
- Map stub is a fake link.
- At ≤768px the highlights grid is `display: none` and the marquee is `aria-hidden`, so **mobile screen-reader users get no highlights at all**. Bug. Keep the grid in the accessibility tree, e.g. visually hidden instead of `display: none`.
- The sidebar, including the private-charter CTA, is unavailable on mobile.
- Same mobile-bar nesting and lightbox focus issues as Tour detail.

**vs current (`src/pages/destinations/[slug].astro`):**

- Same: breadcrumb, `ImageGallery` with tags (from `destination.tags` + `tipTag`), h1, Highlights (grid + marquee), Location (the current map stub is a **real link** to the Google Maps URL) + geo grid, Insider tips, Tours that visit, sticky "at a glance" card (tours visiting, best season, from Split, current conditions, Browse {X} tours → `/tours/?destination=`, Plan a private charter → contact).
- **Removed in the design:**
  - **Best time to visit** (12-month seasonality chart + note).
  - **Also nearby** (main section and sidebar list with tour counts).
- **Changed:**
  - "Tours that visit": current uses compact horizontal **link cards** (thumbnail, h3 title, duration/type/"Stops at X"/Best seller tags, price, "View tour"). The design uses the full `.tour-card` grid.
  - Current conditions: current shows the honest placeholder "Check forecast" / "—" / "Sea temp varies · Light winds typical in season". The design shows **static fake live weather** ("Sunny 28°C, Sea temp 24°C · Light winds"). Shipping it needs a weather data source, or keep the placeholder.
- The data is already there: `highlights`, `geo`, `insiderTips`, `tags`/`tipTag`, `tourSlugs`, `bestTimeMonths`. Missing pieces:
  - **Weather feed** for the conditions widget.
  - Per-destination **intro** (exists as `intro`).
  - Highlight **icons** (current cycles a fixed `HIGHLIGHT_ICONS` list; the design pairs icon and text, so store icons per highlight).

---

## D. Reusable components across pages, with variants

| Component | Where | Variants and notes |
|---|---|---|
| **Nav** | all | (1) overlay transparent → `on-photo` → `is-solid` after 40px (home, Tours, Destinations); (2) plain sticky white (TourDetail, DestinationDetail); (3) mini booking-flow nav (hbc.css). Right slot: language switcher (home v2+), outline "Contact" CTA, or solid "Book now". Hamburger at ≤768px with no designed panel. |
| **Footer** | all | One variant; margin-top differs per page. |
| **Photo page hero** | Tours, Destinations | 540/480px, eyebrow + Glorich 72px h1 + description + glass chip row, top fade + double scrim. |
| **Home hero carousel** | Home | 100vh, 3 slides, crossfading images, progress-pill dots, hover-only arrows, Explore button. |
| **Section header** | Home, Tours | h2 `.section-title` (Glorich 28 uppercase) + optional `.section-sub` + right slot: pill `.slider-all` (default outline / `.is-ghost`) and/or slider arrows. Detail pages use a different plain `.section-title` / `.sec-title` (18px/500, bottom rule). |
| **Pill link `.slider-all`** | Home | Outline (border-secondary) / ghost (transparent until hover); arrow icon nudges right. Same look as `.dest-cta` on Destinations. |
| **Buttons** | all | `.hero-cta` (orange, 46px, radius 11); `.tc-btn` (grey → blue on hover, 46px, radius 11); `.hs-btn` (blue, 46px); `.btn-primary` / `.btn-secondary` (base: blue / outline, padding 10px 22px, radius 8; CTA band: orange solid / glass outline, 40px, radius 10; destination sidebar: full width blue / outline); `.cta-primary` / `.cta-secondary` (tour sidebar, full width); `.type-cta` (small outline, fills blue on card hover); `.nav-cta` (solid / outline / on-photo); `.also-btn`; `.lb-btn` (44px round glass); `.slider-arrow` (36px round); `.hero-arrow` (40px glass); `.mobile-book-bar a`. |
| **Chips** | Tours, Destinations, Home search | Glass filter chip on photo (38px, inactive glass / active white); `.tc-chip` (grey pill 13px, optional icon); `.tag` on gallery (`tag-priv` purple, `tag-grp` / `tag-feat` blue, `tag-tip` amber; 12px, radius 20); segmented trip-type toggle with sliding indicator. |
| **Badges** | cards | `.tc-badge` on image: `b-best` "Best seller" and `b-new` "New" (same blue), `b-priv` "Private" (purple), `dest-region` (white). `.type-badge`: `tb-group` (blue), `tb-private` (gold gradient). `.dest-count` glass pill. |
| **Tour card `.tour-card`** | Home slider, Tours grid, DestinationDetail | Default (image 180, badge, name, From/price/per, duration, "View tour"). Slider variant: no hover lift, 300px. `.tc-all` "See all" dashed end card. Destinations variant (image 220, region badge, 2-line description, attribute chips, footer with count + pill CTA; whole card is a link). `.featured` (2px blue border, unused). |
| **Destination tile `.dest-card`** | Home | Photo bento tile with progressive blur and count pill; large variant (bento-a). |
| **Type card** | Home, Tours | Group / featured private (premium gold); with CTA (home) or without (Tours). |
| **Step card** | Home, Tours | Numbered grey tile. |
| **Trust items** | Home | Trust band (white, marquee ≤1000px) and the legacy dark glass `.trust-line` on the hero. Booking-flow `.trust-strip` in hbc.css. The current site's `.trust-bar` tiles are **not** in the design. |
| **Reviews** | Home, TourDetail | Summary tile (`rv-summary`); bordered review card with figure/blockquote (home); grey compact review card with meta row (tour detail); both become horizontal scrollers ≤1024px. |
| **FAQ accordion** | Home (Faqs page out of scope) | Bordered list, single-open, answer inside the button. |
| **CTA band** | Home | Photo band, orange + glass buttons (v2+); grey flat variant (v1, and current site). |
| **Video preview** | Home | Poster button → native video. |
| **Gallery + lightbox** | TourDetail, DestinationDetail | Hero button + 4 thumbs (+N) → full-screen lightbox with strip, Esc/←/→. |
| **Sticky sidebar card** | TourDetail (booking), DestinationDetail (at a glance) | 322px, sticky top 76; booking hidden/reordered on mobile, destination hidden on mobile. |
| **Mobile bottom bar** | TourDetail, DestinationDetail | Fixed; hides while its target is in view (IntersectionObserver 0.15). |
| **Info / geo / stat tiles** | detail pages | Grey label/value tiles (uppercase 12px label). |
| **Timeline** | TourDetail | Itinerary dots + connector. |
| **Highlight tiles + marquee** | DestinationDetail (CSS also on TourDetail) | Grid on desktop, marquee on mobile. |
| **Empty state** | Tours, Destinations | Icon + sentence. |
| **"Also" strip** | Destinations | Grey strip with text + outline button. |
| **Language switcher** | Home v2+ | Button + listbox menu. |

---

## E. Image and asset map (`/_blob/<hash>`)

| Hash | Used for |
|---|---|
| 6db22cf5a8d634b0343f7323ec5796a6 | Home hero slide 1 "tours" (all versions); Tours hero (default); TourDetail gallery #9; DestinationDetail gallery #10 |
| 017adfe4e2ef7be5d0d94d4957daa087 | Home hero slide 2 "charter"; old Destinations hero default (remapped); DestinationDetail gallery #3 |
| 796f7f6baf909bac630a446041e4b831 | Home hero slide 3 "Hello Blue Cave" (right-aligned crop); TourDetail #8; DestinationDetail #6 |
| dadcccc0c42934ae83b1191097c704a0 | Search band "group" orbit photo (v2; hidden v3+); TourDetail #12 |
| 459a535dd66c6c77cf28944102b4ba05 | Search band "private" photo |
| 17620d6f1eda545b4894db6053b21de2 | Search band "transfer" photo |
| 85382a42d38b04ccac1ac10f45ce36bf | Video band background + CTA band background (v3+); TourDetail #11; DestinationDetail #8 |
| f155a16b9e88c1741a9e475ada1cbbdf | CTA band background (v2 only); DestinationDetail #9 |
| 3f803310f4622fcbe40a7c38a88c2af9 | Video poster (v4) |
| db2596839bbcddeaadbe13b889cdc17b | Preview video file (v4) |
| 643ee09205cf07cb93314e736ce00fc4, d24aa8a80d7a3907fea83e274a4d2fdd | Old posters, only referenced to be replaced |
| 4f05356ebee03f5016b43a559bc34c5b | "Sunset Bay coastal cruise" card; Dubrovnik (home bento, Destinations); TourDetail hero #1 |
| b5535f758995bdf694c8c2468734b0c5 | "Island hopping — Elafiti" card; Blue Lagoon (home bento); Elafiti (Destinations); DestinationDetail tour card; TD #6; DD #5 |
| cbc2b610fa31e9081789057f1607038a | "Private sunset charter" card; TD #2; DD #7 |
| 5207d5d0f4d27c542bd2802443a85c29 | "Blue Cave & Hvar full day" card; Blue Cave, Biševo (home bento a, Destinations); DD tour card; TD #5; DD #4 |
| cde84cb92d3381b507a1c6f1a012a9c6 | "Morning snorkel tour" card; Vis (home bento, Destinations); TD #4 |
| 07056f2593f867a3e97043cc9ea27185 | "Romantic private dinner cruise" card; TD #3 |
| f80742f991078a1db049ece637c4a2b9 | Hvar (home bento b, Destinations); "Private Hvar & Pakleni charter" (Tours); DestinationDetail hero #1; TD #10 |
| 4938740a436087e6009c764ff1a83168 | Brač Island (home bento e) |
| 32dfc7c5ccd7f71a00ac9e2c4b28646f | Destinations hero; "Pakleni islands swim day" (Tours); TD #7; DD #2 |
| 4ee868969e6f51720130fbb10ce9f37b | Tabler icon subset woff2 |
| 2db87…, 8d325…, c26a5…, e1f50…, 1a3f0…, fe814…, ef3c7…, aa69f… | Glorich woff2, weights 200–900 (A.1) |

The same photo stands in for unrelated places (e.g. 4f05… is both a "sunset cruise" and "Dubrovnik"; b553… is both Elafiti and Blue Lagoon). The blobs are mock imagery. Production should keep the repo's real per-tour and per-destination photos (`src/data/tour-photos.ts`, `destination-photos.ts`) and only adopt new hero, video and CTA-band assets, once those are downloaded from the artifact.

---

## F. Cross-cutting gaps and decisions for the build

1. **Accent colour swap, teal → blue.** `--color-accent`, `-accent-dark`, `-text-success` and `-background-success` all move to blue. Orange appears only on photo CTAs. This is the "navy/orange redesign" parked in memory, so the user's go-ahead is needed before shipping.
2. **Type scale tokens and 16px body.** A large but mechanical change from the current hard-coded 12–17px values.
3. **Glorich font:** files need licensing confirmation and self-hosting; also define `--font-display`. The detail pages in the design do not use it, so decide whether detail-page h1s should.
4. **Contrast regression:** do not adopt `--color-text-warning: amber-400` (3.72:1). Keep amber-700 for text and use amber-400 for icons only.
5. **Focus styles:** the design removes outlines. Keep the current global `:focus-visible` and recolour it to blue.
6. **Keep the current accessibility behaviour** where the design is weaker: hero carousel semantics and pause button, static sr-only h1, FAQ trigger/panel structure, mobile menu panel and focus trap, h2 section headings on detail pages, `nav` breadcrumb, a real map link.
7. **Placeholder data in the design that must not ship as-is:** Dubrovnik/Elafiti/Korčula-centric destinations, "Marina Pier B", prices (€45/€55/€95/€280…), "since 2015 / 10 years" (repo says 9 yrs), ratings and review counts, the example.com ticket link, static weather, "Tours that visit Hvar (4)" with 2 cards.
8. **New data to source:** ratings, reviews, guests served, structured itinerary, child price, next availability (from the bookings store), languages, video, extra hero photos, Dubrovnik/Brač photos, i18n (if the switcher ships).
9. **Content dropped by the design that the current site has** (decide explicitly): Best time to visit chart, Also nearby, Destinations-on-this-tour chips, Please-note disclaimers, priceNotes, Season row, destinations map strip, footer contact info, Contact nav link, featured/"Not to miss" grouping, the `?destination=` filter on Tours.
10. **Homepage target is v4**, but the logo links on every board point to v3. The search band (Group/Private/Transfer) is parked (`display: none`). "Transfer" is a new product concept with no repo equivalent.
