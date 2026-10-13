# 05 — Visual walkthrough: "Hello Blue Cave" redesign vs live site

Date: 2026-10-13. Browser: Claude in Chrome, viewport 1440x654 (window resize had no effect; see Limits).
Design: https://claude.ai/artifact/1bUXBdz8gq6F7o3T9on2Be (design canvas, "Commenter" access, third-party content, treated as data).
Live: https://hello-blue-cave.netlify.app

## How the design was viewed

- The canvas has 14 boards plus 4 homepage versions. Each board has a "Play" control with **Play on canvas** and **Play full screen** options. Full screen opens the board as a live, interactive prototype with **Fill** and **Fit** modes.
- Prototype links work between boards: Tour detail "Book group tour" goes to 05 Group booking, "Review booking" to 07 Summary, "Continue to payment" to 08 Success, and a Destinations card to 10 Hvar.
- The boards run in a cross-origin iframe (`*.frame.claudeusercontent.com`), so **getComputedStyle could not be read for the design**. Font and colour values for the design below are visual estimates. Live-site values come from getComputedStyle.
- **Narrow view (390px):** I narrowed the play iframe to 390px from the parent page. The boards are genuinely responsive and reflow. I checked Homepage v4 and Tour detail this way.
- Canvas layout: column 1 holds v2 and v1. Column 2 holds v4 and v3. Then come row 02/03/04/10, row 05/06/07/08/09 and row 11/12/13/14.

## Design system as rendered (all boards)

**Colour**
- Base: white page with near-black text and grey secondary text.
- Light-grey (~#f4f4f3) filled cards, plus white cards with ~1px light-grey borders. Radius is ~12–16px on cards and ~8–10px on buttons and inputs.
- Brand blue (~#1a6fc4) is used for the logo icon, links, check icons, the stepper's active step and **primary CTAs on every inner page**: "Book now" in the header, "Book group tour", "Review booking", "Continue to payment", "Send message" and "Try payment again".
- **Burnt orange (~#c2410c)** appears only on the homepage v2–v4 hero CTAs, the video play button, the "Browse all tours" CTA band and the carousel's active dot. v1 also uses orange for "Search tours".
- Deep navy/ocean photography fills the heroes.
- Accents:
  - Amber/yellow: private-charter card gradient, "Just you on board" pill, star ratings.
  - Pale blue: group-tour pill, rating card background.
  - Pale purple: "Private" badges and avatar initials.
  - Red tint: payment-error icon and hold banner.
  - Orange tint: "slot held" notice and the legal warning callout.

**Typography**
- Body and UI text: a neo-grotesque system sans that looks like Inter or SF. It sits around 16–17px with generous line height, which is larger than the live site's 13–14px.
- Display headings on v2–v4, 02 Tours and 04 Destinations: big **uppercase geometric display sans**, Futura/League-Spartan-like.
  - It has custom wave-like alternates: "ESCAPE" has a swash C, "HELLO BLUE CAVE CROATIA" uses wavy L/C/O, and "GROUP", "FROM" and "QUESTIONS" have looped O/U/Q.
  - It looks like a stylised brand display face or an SVG wordmark. **I could not verify the font family.**
- Other boards (03, 05–14 and v1) use **sentence-case sans headings** in the same family as the body, e.g. "Sunset Bay coastal cruise", "Contact us", "We're small by design". The exception is 11 FAQs, whose H1 is uppercase in the plain sans, not the display face.
- Section labels are small uppercase tracked grey text, e.g. "ALL DESTINATIONS (6)", "FIRST NAME", "WHAT TO BRING".

**Layout**
- Content container is about 912px wide (x 264–1176 at 1440).
- 12-column feel with these grids: 2-up for destinations, group/private and legal-adjacent sections; 3-up for tour cards and reviews; 4-up for How-it-works.
- Booking flow pages use a narrow ~580px single column (x 430–1010).
- The Legal board uses a narrower ~632px container, and **its header is also narrower**, which is inconsistent with the other boards.
- Sticky white header about 60px tall. Over heroes it is transparent with white text, then turns frosted white on scroll.
- Spacing rhythm: about 64–96px between sections.

**Card styles**
- **Tour card:** image on top (~180px), a white "Best seller", "Private" or "New" badge pill at top-left, then title, "From €X / person" with a duration icon, and a full-width grey "View tour" button. ~1px border, ~12px radius.
- **Destination tile (home):** full-bleed photo with a dark bottom gradient, white name and tagline, and a frosted "N tours" pill.
- **Destination card (overview):** image, region pill, title, description, icon tag chips, then a footer with "N tours visit here" and an outlined "See tours →" pill.

**Buttons**
- Primary: filled blue, or filled orange on the homepage.
- Secondary: white with a 1px border.
- Pill buttons with arrows, e.g. "See all tours →" and "All destinations →".

**Footer:** plain white, four columns (brand blurb / TOURS / INFO / LEGAL), and a bottom bar with "© 2025 Hello Blue Cave · Licensed maritime operator · Croatia". The booking pages use a minimal footer: Secure payment, Need help? email, Licensed maritime operator.

## Board by board

### 01 Homepage v4 — trust band below hero (newest)

**Hero**
- Full-bleed hero, about 100vh, with a 3-slide carousel. Each slide has a different headline, subtitle and CTA:
  - "ESCAPE IN STYLE & COMFORT" with "Browse group tours".
  - "ALL ABOARD, MATEYS!" with "Plan a private charter".
  - "HELLO BLUE CAVE CROATIA" with "See the Blue Cave tour".
- Left-aligned big white display caps, white subtitle and an orange CTA with an arrow.
- Round prev/next arrows sit at the edges, pill dots are at the bottom (the active one is orange), and an "⌄ Explore ⌄" cue sits below. The carousel auto-rotates.
- The header uses an outlined **"EN ⌄" language switcher** in place of a Contact or Book button.

**Sections in order**
1. **Trust band:** a white strip with "★★★★★ 4.9 from 800+ reviews · Free cancellation up to 48h · Max 12 guests per departure · 10 years on the water".
2. **"Experience it first-hand / PREVIEW FROM OUR TOURS":** a dark water-photo band with a large rounded video card that overlaps into the white section below. It has an orange play button and the label "0:22 · A day on the water".
3. **POPULAR TOURS:** a horizontal carousel with ‹ › buttons, a "See all tours →" pill and a 4th card faded at the right edge.
4. **GROUP OR PRIVATE?:** two cards. The Group card is white with a blue icon circle and an "Other people on board" pill. The Private card has a cream/amber gradient, a yellow crown circle and a "Just you on board" pill. Each card has check bullets and an outlined CTA.
5. **DESTINATIONS:** a heading with an intro line and an "All destinations →" pill. Below it is a bento photo grid: Blue Cave as the large tile, Hvar wide, Blue Lagoon and Dubrovnik small, and Brač and Vis half-width.
6. **HOW IT WORKS:** four grey cards, each with a numbered circle.
7. **WHAT GUESTS SAY:** a blue-tint rating card ("4.9", stars, "4,200+ guests this season", "14 tours and routes") plus two review cards with stars, quote, initials avatar and tour/date.
8. **COMMON QUESTIONS:** an accordion. It works: clicking expands a grey panel with the answer.
9. **CTA band:** a rounded dark wave-photo band, "READY TO GET ON THE WATER?", with an orange "Browse all tours" button and a frosted "Plan a private charter" button.
10. **Footer.**

**Issues seen**
- On slides 1 and 2, a ~105px dark-navy strip shows at the left edge where the hero image doesn't cover the full width. It looks like a bug.
- The video is a blurry placeholder.

**At 390px**
- The header becomes logo + "EN" + hamburger. I clicked the hamburger and no menu appeared.
- The carousel arrows are hidden and the headline overlays a busy photo.
- The trust band becomes a horizontal scroller with clipped items.
- Tours and reviews become horizontal swipe rows.
- Section header rows get cramped: "WHAT GUESTS SAY" wraps, and "All FAQs" and "Read all reviews" wrap beside the heading.
- Page gutter is about 12px.

### 01 Homepage v1–v3 (differences only)

**v1 "01 Homepage"**
- Hero with "ESCAPE IN STYLE & COMFORT" and a **search widget**: dark translucent card, Group/Private/Transfer tabs, WHERE and WHEN selects, and an orange "Search tours" button.
- Header has an outlined "Contact" button (no EN switcher). The trust band is inside the bottom of the hero.
- Sections, below the tour cards:
  - **Section headings are sentence-case sans**, e.g. "Destinations", "Group or private?", "What guests say", "Common questions", not the display caps.
  - Links are blue text, e.g. "All destinations →".
  - Hairline dividers separate sections.
  - The Private charter card has a blue border and a blue filled CTA.
  - Order: How it works comes before Group or private.

**v2**
- The hero carousel has an image-only slide (the hand / Blue Cave slide) with the trust band in the hero.
- Then a white section: "FIND YOUR DAY ON THE WATER" with the search widget (Group/Private/Transfer, Where/When, **blue** "Search tours", "Public tour — shared with up to 12 guests"). Beside it is a large circular boat photo with grey sun and wave line doodles.
- Display-caps headings start here.

**v3**
- Hero with prev/next arrows and the trust band overlaid at the bottom of the hero.
- POPULAR TOURS comes right after the hero, with a blue "See all tours →" link plus ‹ › buttons.
- Then the video band. The video card is black with "1:30 · A day on the water".
- Then destinations bento, GROUP OR PRIVATE?, and so on.

**v4 changes vs v3:** the trust band moves to its own white strip below the hero, the video moves above Popular tours, and the "See all tours" link becomes an outlined pill.

### 02 Tours overview

**Layout**
- Photo hero (boat from above) about 540px tall, with the eyebrow "SPLIT · DALMATIAN COAST", the display H1 "OUR TOURS" and a subtitle.
- The hero holds filter chips (Group, Private only, Under 4h, Sunset) and a "Most popular ⌄" sort pill.
- The header uses an outlined "Contact" button, **not the EN switcher**, which is inconsistent with v4.

**Content**
- "N tours match your filters" with "Clear filters".
- 3-column tour cards.
- Then GROUP OR PRIVATE? with **no CTA buttons in the cards** this time, HOW IT WORKS, and the footer.

**Interaction:** the "Group" chip toggles to white-filled and filters the list to 5 tours.

### 03 Tour detail (Sunset Bay coastal cruise)

**Layout**
- The header has a **blue filled "Book now"**.
- Blue breadcrumb.
- Large rounded hero photo with "Private available" and "Group tour" pills and a "View all 12 photos" button.
- A row of four thumbnails, the last with "+7".

**Content**
- H1 in sentence-case sans (~44px), "3 hours · 500+ happy guests", then the description.
- **Itinerary:** a vertical timeline with blue icon circles and times.
- Included and not-included lists use green ✓ and red ✕.
- **Good to know:** grey tiles with uppercase labels.
- **Reviews (128):** grey review cards with "Show all 128 reviews ›".

**Booking card**
- A sticky right card: "From €95 / adult", "Children from €55", "Next available: Today, 18:00".
- Blue "Book group tour →", an outlined "Book as private charter" with a crown icon, and "Free cancellation up to 48h before".

**At 390px:** single column, hamburger, and a **sticky bottom bar** with "€95 / adult" and a blue "Book now".

**Inconsistency:** the price is €55 on the homepage card but €95 here.

### 04 Destinations overview

**Layout**
- Full-bleed Pakleni aerial photo hero with the eyebrow "ISLANDS · CAVES · OLD TOWNS" and the display H1 "DESTINATIONS".
- Filter chips: All destinations (white, selected), Islands, Coastal towns, Caves & nature, Best for swimming.

**Content**
- "ALL DESTINATIONS (6)" then a 2-column grid of destination cards.
- A grey "Not sure where to go?" band with "Browse tours ↗", then the footer.

**Interaction:** the "Islands" chip filters the grid to 4 cards.

**Issues**
- The hero subtitle is grey text on a busy photo and is **nearly illegible**.
- The Korčula card has **no image** (grey placeholder).
- The label still says "ALL DESTINATIONS" after filtering.

### 10 Destination detail — Hvar

**Layout**
- Header with "Book now" (blue) and breadcrumb.
- Hero photo with pills "Swimming", "Island" and a "Sunniest island in Croatia" pill in an amber tint.
- Four thumbnails, the last with "+5".

**Content**
- H1 "Hvar island" and the intro text.
- **Highlights:** 2x2 grey tiles with blue icons.
- **Location & getting there:** a map placeholder box with "View on map — 60 km from Split by sea" plus four stat tiles.
- **Insider tips:** numbered grey rows.
- **"Tours that visit Hvar (4)":** **only 2 cards are shown**, which is inconsistent.

**Sidebar:** a sticky card, "Hvar at a glance": tours visiting, best season, time from Split, "Current conditions: Sunny 28°C, sea 24°C", a blue "Browse Hvar tours" and an outlined "Plan a private charter".

### 05 Group booking

**Layout:** narrow column. The header is only the logo. A 4-step stepper: ✓ Tour type, ② Date & guests (blue), 3 Review, 4 Payment.

**Content**
- Tour summary strip with a placeholder thumbnail, "3 hours · Marina Pier B · ★4.9 (128)".
- **Choose a date:** a calendar card for October 2026. Today is outlined and available days have blue dots. Clicking a date works.
- **Departure time:** two radio cards, "09:00 Morning departure" and "18:00 Sunset departure". The selected one has a blue border and pale blue fill.
- **How many guests?:** steppers for Adults (€95) and Children (€55), with the note "Your spots are held for 12 minutes once you proceed to review".
- **Your details:** first and last name, email, phone, special requests.
- A grey **Booking summary** that updates live (date, departure, guests, total).
- Blue "Review booking →", an outlined "← Back to tour type" and a cancellation note.

### 06 Private charter

**Stepper:** ✓ Tour type, ② **Customise**, 3 Review, 4 Payment.

**Content**
- **Choose your route:** 2x2 selectable cards (Sunset coast is selected, blue).
- **When and how long:** native date, time and duration inputs.
- **Guests:** steppers.
- **Add extras:** checkbox rows with icon and price, e.g. Champagne +€40, Photo +€80, Picnic +€65, Snorkelling +€30.
- **Special requests.**
- **Your charter** summary showing "Charter base price €336", then "Review booking →".

**Inconsistency:** €336 doesn't match the "From €280" and "€320" shown elsewhere.

### 07 Booking summary

**Stepper:** ✓ Tour type, ✓ Customise, ③ Review, 4 Payment.

**Content**
- Cards: Tour details with an "Edit ✎" link (a "Private tour" pill plus a date/departure/duration/meeting-point table), Guests & extras, Guest details, Price breakdown (Total €610, "Includes all taxes and fees"), and a Cancellation policy callout.
- Blue "Continue to payment →" and "🔒 Secure payment handled by Teya".

**Inconsistency:** the data is static. It does not reflect the group-booking choices: it shows Private, 12 Jul 2025, 4 adults + 2 children.

### 08 Payment success

**Content**
- Pale-blue circle with a check, the H1 "You're booked!" and "Confirmation sent to …".
- A grey booking reference bar, "HBC-20847", with a Copy button.
- **Your booking** card.
- **Where to meet us:** location, arrive by, what to bring, captain, and a "View meeting point on map" box.
- **What happens next:** three icon rows.
- An outlined "Browse more tours".

**Inconsistency:** the total paid is €245 (2 adults + 1 child), which doesn't match the €610 summary.

### 09 Payment error

**Content**
- Pink circle with a red ✕, the H1 "Payment unsuccessful" and "No money has been taken".
- Red-tint hold banner: "spots held for **8 minutes**".
- "Common reasons this happens" list.
- Orange-tint notice about the held slot.
- "Need help? … Contact us →".
- Blue "Try payment again" and an outlined "Back to tours".

### 11 FAQs

**Layout**
- H1 "FREQUENTLY ASKED QUESTIONS" in plain bold sans caps, not the display face.
- Search input with a blue "Search" button.
- **Left category sidebar** with counts: All 20, Booking 5, Weather 3, On board 5, Guests 4, Private 3.
- Grouped accordions on the right, each group with an icon chip header.
- A grey "Still have a question?" band with outlined "Email us" and blue "Call us".

**Interaction:** clicking Weather filters to that group. The "All" count then changes to 3, which is a bug.

### 12 Legal pages

**Layout**
- Three segmented tabs: Terms & conditions / Privacy policy / Cancellation policy. The tabs work.
- A left TOC with a blue active bar. It is not sticky.
- Body: H1, "Last updated" line, a grey "THE SHORT VERSION" box with check bullets, then numbered sections with blue icons and an amber left-bordered warning callout. Teya is mentioned as the payment processor.

**Issue:** the container and header are narrower (~632px) than on every other board.

### 13 About

**Content**
- **Hero image is a grey placeholder** with a boat icon.
- "We're small by design" with two paragraphs, and a 2x2 grid of stat tiles: 10 yrs, 4,200+, 4.9★, Licensed.
- **How we got here:** a vertical timeline (2015–2025) with blue years.
- **Meet the crew:** three cards with **placeholder avatar icons**, names and blue uppercase roles.
- **What we believe in:** 2x2 grey icon cards.
- **As featured in:** Travel + Leisure, Condé Nast Traveller and The Guardian quote cards. These look like invented placeholders; verify them before shipping.
- **"Come sailing with us"** grey CTA band with blue and outlined buttons.

### 14 Contact

**Content**
- H1 "Contact us" and the intro text.
- 2x2 grey info cards: Phone, WhatsApp, Email and Find us. Each has a tinted icon square; Find us uses an amber tint.
- Response hours with an "Open now" pill, plus season info.
- **Send us a message** form card: first and last name, email, phone, subject select, message and a blue "Send message →".
- A map placeholder box with "open in Google Maps", an info note and the footer.

**Content mismatch with live data:** "Marina Pier B, Gate 3", hello@hellobluecave.com and +385 20 123 456.

## Live site (hello-blue-cave.netlify.app): measured style

**Fonts**
- `body`, `h1`, `h2` and `h3` all use `-apple-system, system-ui, "Segoe UI", sans-serif`. No webfont is loaded.
- Body text is 14px with colour #111.
- Heading weights are 500, apart from the hero h2 at 26px/500 and a page h1 at 28px/700.

**Colour tokens (`:root`)**
- Black #111 and a grey scale (#555, #696969, #999, #ccc, #e5e5e3, #f5f5f4).
- teal-900 #085041, teal-500 #1d9e75, teal-100 #e1f5ee.
- blue-900 #0c447c, blue-500 #1a6fc4, blue-300 #7ab4e8, blue-100 #e6f1fb.
- amber-500 #ef9f27 and related shades, red, purple-500 #534ab7, and **coral-500 #e05c34** (already present as a token).

**Components**
- CTAs are **black (#111) filled**, with an 8px radius.
- Featured tour cards have a 2px #7ab4e8 border and a 12px radius.
- Container max-width is 960px.

## Live vs design, page by page

### Global
- The live site is monochrome black/white with teal icon accents.
  - The logo icon is teal; in the design it is blue.
  - Check icons and stat icons are teal; in the design they are blue.
  - CTAs are black; the design uses blue on inner pages and orange on the homepage.
- Live text is smaller and lighter: 13–14px body and ~22–28px headings at weight 500. The design uses ~16–17px body and large display caps.
- The live header has Tours, Destinations, About, FAQ and **Contact** as links plus a black "Book now". The v4 design drops Contact from the nav and uses an **EN language switcher**, while inner design boards use a blue "Book now" or outlined "Contact".
- Live footer: TOURS / EXPLORE / LEGAL, plus phone, email and address, "© 2026". Design footer: TOURS / INFO / LEGAL, no contact block, "© 2025".

### Homepage
**Live**
- Hero: centred sentence-case headline ("The Adriatic from the water, the way it should be"), black CTA, grey-white round arrows, a pause control and an "EXPLORE ⌄" cue.
- Sections in order:
  1. Popular tours: 3+2 grid, with blue borders on featured cards.
  2. "Where we go": six **image-less placeholder tiles** with a boat icon.
  3. How it works.
  4. Group or private: the Private card has a blue border and a black CTA.
  5. Stats trust-bar: 9 yrs / 12 max / 4.9 / Licensed.
  6. Common questions.
  7. A grey CTA band.

**Design v4 adds:**
- An uppercase left-aligned display hero with an orange CTA.
- A separate trust strip under the hero.
- The video preview band.
- A tours carousel.
- A **photo bento for destinations**.
- A Guests-say reviews section.
- A dark photo CTA band.

**Design v4 removes or moves:** the stats tiles, which become the trust strip and the rating card.

**Live at 390px**
- Hamburger header and centred hero.
- **The prev/next arrows overlap the subtitle text** (a live bug).
- Swipeable tour cards and destination tiles, still without images.

### /tours/
**Live**
- Plain white header area with H1 "Our tours" (sentence case), an intro and outlined filter chips (Group, Private only, Half day, Sunset, Most popular).
- "FEATURED (3)" in blue-bordered cards, then "ALL TOURS (4)".
- Cards show a description excerpt and multiple badges (Best seller + Group + Private).

**Design**
- A full photo hero with display caps, with the chips placed in the hero.
- A "N tours match" count and a single tour grid with no featured split.
- Adds Group-or-private and How-it-works sections.

### Tour detail
**Live (/tours/blue-cave-hvar-5-islands/)**
- The main gallery slide 1 shows a **teal placeholder box with a boat icon** on desktop and mobile; the thumbnails do load.
- H1 at ~22px, then Overview, Highlights (grey tiles), a Full-day itinerary timeline, Included/not included, Good to know tiles, "Destinations on this tour" chips and "Please note".
- Price card with seasonal price text, a black "Book group tour →" and an outlined "Enquire about a private charter". It is **not sticky** on desktop.
- At 390px there is a sticky bottom bar with "€169 / person" and a black "Book".

**Design adds**
- A larger H1 and "500+ happy guests".
- A **Reviews** section.
- A sticky booking card with "Children from" and "Next available".
- Blue CTAs.

**Design omits:** the seasonal price note, destination chips and "Please note".

### /destinations/
**Live**
- Plain H1 "Destinations" and a **dot "map" strip** of place names with "View full map ↗".
- Filter chips, with the active one in black.
- "NOT TO MISS (3)": a large horizontal Blue Cave card plus 2 cards.
- "MORE DESTINATIONS (7)": a 3-column grid with some placeholder images.

**Design**
- A full photo hero with display caps, with the chips in the hero.
- A single 2-column grid of 6 cards, no "Not to miss" split and no dot map.
- A "Not sure where to go?" band.

### /faq/
**Live**
- A grey hero band with a centred "Frequently asked questions" in sentence case at ~20px.
- Black Search button.
- The same sidebar and grouped-accordion structure as the design (counts: All 19).

**Design**
- A left-aligned big uppercase H1 and a blue Search button.
- Otherwise nearly identical in structure. **This is the page closest to live.**

### /about/
**Live**
- Grey image placeholder hero, then "Split locals, open-sea specialists" with stat tiles (9 yrs, 12 max, 4.9, Licensed).
- Timeline 2016–2025 with teal markers.
- Crew cards with **large initials** (MV, AK, LP) and teal roles.
- Values cards, "What guests say" with 3 italic quotes, and a CTA band.

**Design**
- Same skeleton, with blue accents.
- Crew as placeholder avatar icons with different invented names.
- Adds "As featured in" press quotes.
- Removes guest quotes in favour of press.

**Note:** the live crew and quotes are real or near-real content; the design's are dummy.

### /contact/
**Live**
- Same structure as the design: 4 info cards, hours/season, form, map box and note.
- Black "Send message", required asterisks, and real details (Riva promenade stand 14, info@hellobluecave.com, +385 91 988 88 38).
- **The intro paragraph is oddly indented or misaligned** under the H1, a live layout bug.

**Design:** blue button, larger type and different placeholder contact data.

**Booking flow (05–09):** I did not compare these against the live checkout. The live booking pages were not opened.

## Overall design direction

The redesign keeps the live site's structure: same section inventory, the same 912–960px centred grid, grey #f5f5f4-style filled cards, 12px radii, the FAQ sidebar, the contact card grid and similar booking-card patterns. It changes the brand voice, though.

- **Accent colour:** the live site's black CTAs and teal accents are replaced by **brand blue (#1a6fc4-ish)** for UI and CTAs. **Burnt orange** is reserved for homepage hero and marketing CTAs. Deep navy/ocean photography carries the mood.
- **Typography:** system sans at 13–14px moves to larger 16–17px body text plus a **bold uppercase geometric display face with playful wave/swash alternates**. This is a sans display face, not serif.
- **Imagery:** much more photography, with full-bleed photo heroes on home, tours and destinations, a destination bento, gallery thumbnails and a video band.

It is not the "navy/orange + serif" direction. It is closer to **blue/orange + display sans** over the current component system. The display style is applied inconsistently:
- Display caps: v2–v4, 02 Tours and 04 Destinations.
- Plain uppercase sans: 11 FAQs.
- Sentence-case sans with blue CTAs: 03, 05–10, 12–14 and v1.

The header CTA also varies between EN switcher, Contact and blue Book now. Implementation will need to pick one header and one heading style.

## Unfinished or inconsistent items in the design (to resolve before building)

1. **Header** differs across boards: EN switcher (v2–v4), outlined Contact (v1, 02, 04) or blue Book now (03, 10–14). The v4 nav drops "Contact".
2. **Heading style** varies: display caps, plain caps or sentence case. **CTA colour** varies: orange on the homepage, blue elsewhere.
3. **Missing imagery:** placeholders on the Korčula card, the About hero and crew, the booking thumbnails and map boxes. The video is a blurry placeholder.
4. **Inconsistent numbers across boards:** Sunset Bay price €55 vs €95; charter "From €280" / €320 / €336; summary €610 vs paid €245; Hvar "(4) tours" with 2 shown; FAQ count bug; "10 years" vs live "9 yrs".
5. **Dummy content conflicts with the real business:**
   - Design: Marina Pier B Gate 3, hello@ email, +385 20 number, dummy tours (Sunset Bay, Elafiti, Dubrovnik-based imagery), invented crew and press quotes.
   - Live: Riva stand 14 in Split, info@, real tour list.
   - Keep the live content.
6. **Hero issues:** ~105px left strip not covered by the hero image on v4 slides 1–2; illegible grey subtitle on the Destinations hero.
7. **Mobile issues:** the hamburger didn't open in the prototype; the trust band clips and scrolls horizontally; section header rows wrap awkwardly.
8. **Payments:** the design already names Teya, which matches the project memory.

## Limits: what I could NOT see or verify

- **Exact design font families and hex values:** the boards are in a cross-origin iframe, and network requests from it were not visible. All design colour and font values above are visual estimates. Live values are measured.
- **Window resizing did not work** (the viewport stayed 1440x654).
  - Design boards at 390px were checked by narrowing the play iframe; only v4 and Tour detail were checked narrow.
  - Live pages at 390px were checked by rendering fetched HTML into a 390px same-origin `srcdoc` iframe, because the site blocks framing. Only the homepage and tour detail were checked that way, so script-driven behaviour there may differ slightly from a real phone.
- v1–v3 were only skimmed. Hover states on cards and buttons were not systematically checked.
- The mobile menu contents were not seen; the hamburger did not open in the prototype.
- The live booking and checkout pages were not opened. No forms were submitted anywhere. Prototype navigation buttons inside the design mock were clicked; they only switch boards.
- The "Download" control on the design was not used.
