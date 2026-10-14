# Review C: security, privacy, accessibility, EU consumer law

Target: `docs/redesign/07-IMPLEMENTATION-SPEC.md` (uncommitted), checked against the code on `feat/email-map-link-overbooking` @ 882dbc3 and the live site (`curl -sI`, 2026-10-13).
Reviewer stance: adversarial, read-only. Legal points are flags, not advice. Anything marked **verify with lawyer** needs a qualified opinion before the wording ships.

Severity: **blocker** = must change before the affected PR merges (or before real payments go live, where noted). **major** = real risk or a likely WCAG/legal failure. **minor** = hardening or a gap in the spec text.

---

## Evidence gathered

- `curl -sI https://hello-blue-cave.netlify.app/admin/login/` → only `cache-control`, `strict-transport-security`, `x-content-type-options`, `x-robots-tag`. **No CSP, no `frame-ancestors`, no `X-Frame-Options`, no `Referrer-Policy`.** `/booking/pay/` is the same. The prerendered `/contact/` gets the full `netlify.toml` set. So the S-7 suspicion is confirmed today, in production.
- `src/pages/api/bookings.ts:42-45`: when booking creation fails, it redirects back with **every form field (name, email, phone, notes) in the query string** via `bookingReviewPath(tour.slug, {...back, error})`.
- `src/lib/rate-limit.ts`: keys are `contact:<raw IP>`, `booking:<raw IP>`, `pay:<raw IP>`. Buckets are overwritten but never deleted. The limiter fails open on any Blobs error.
- `src/lib/bookings/store.ts` `OutboxEmail.html/text`: the full rendered email (with customer PII and notes) is stored in Blobs indefinitely. `templates.ts:220` puts `Special requests` into the admin email.
- `src/lib/email/send.ts` `mayDeliverTo`: while `PAYMENTS_ARE_DEMO`, delivery is limited to the admin address and the allowlist. That guard disappears when payments go live.
- `src/pages/legal/privacy.astro`: lists Google Analytics and a `cookie_consent` cookie (both fictional). The spec already plans to fix these.
- `src/config/cancellation.ts`: the 48h/4h copy is still hand-synced with the legal pages. The spec plans to fix this.
- `astro.config.mjs`: `security.checkOrigin` isn't set, so Astro's default (on) applies. No test pins it.

---

## Findings

### 1. SSR responses lack CSP, frame-ancestors, XFO and Referrer-Policy today, but the fix is scheduled for PR 7. **blocker**
- **Section:** §10 S-7, §15 PR 0 / PR 7
- **Issue:** S-7 treats this as "check in PR 0, fix in PR 7". The check is already done (see Evidence): the admin login, the admin back office (refund, status change and resend actions) and the pay page are frameable in production. That makes them open to clickjacking (for example, framing `/admin/bookings/<id>/` and tricking a logged-in staff member into clicking "Refund" or "Cancel"). These pages also run without CSP, so `unsafe-inline` isn't even the weakest point.
- **Why:** OWASP clickjacking guidance. `netlify.toml` `[[headers]]` don't reach function responses, as `middleware.ts` itself notes.
- **Proposed spec text (replace S-7):**
  > **S-7 (PR 0, ship alone to production):** `src/middleware.ts` sets the full security header set on **every non-prerendered response**, including redirects where the headers are mutable: `Content-Security-Policy` (same value as `netlify.toml`, from one shared constant in `src/config/security-headers.ts` that a build script also writes into `netlify.toml`, or that a test compares to it), `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` (`no-referrer` on `/booking/*`, `/book/*/review/` and `/admin/*`), `X-Content-Type-Options: nosniff`, `Permissions-Policy`. Acceptance: a Vitest test calls the middleware for `/admin/login/`, `/booking/pay/`, `/book/x/review/` and `/api/contact` and asserts every header. Post-deploy `curl -sI` check in the PR description.

### 2. The draft review URL is a bearer token for PII: anyone holding the link sees name, email, phone and notes. **major**
- **Section:** §8.1.3, §8.1.6, §2.5
- **Issue:** Moving PII from the URL to `?draft=<id>` keeps the same exposure model. The URL lands in browser history, sync, screenshots, "share link" and support emails ("here's my booking page"), and anyone who opens it within 2 h sees all the guest's details on the review page. Non-negotiable 5 is met in letter, not in effect. The spec also doesn't specify the id format, a slug binding, or that the draft can only be read by the browser that created it.
- **Why:** GDPR Art. 5(1)(f) and Art. 32 (confidentiality); OWASP "Insecure Direct Object Reference" / capability-URL guidance (W3C TAG "Good practices for capability URLs": short-lived, not shared, `Referrer-Policy`).
- **Proposed spec text (§8.1.6, draft row):**
  > Draft id: `randomUUID()` validated with `isRecordId`. On creation the server also sets a cookie `hbc_draft=<id>.<HMAC(id, DRAFT_SECRET)>`: `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=7200`. `review.astro` renders the draft **only** if the cookie's HMAC is valid and its id equals `?draft=`, and only if `draft.tourSlug === Astro.params.slug`. Otherwise it redirects to step 2 with "Your booking session expired", and no PII is rendered. `POST /api/bookings` checks the same binding. The cookie is cleared when the draft is consumed. Response headers on the review page: `Cache-Control: no-store`, `Referrer-Policy: no-referrer`.
  >
  > *Alternative, preferred if it fits:* a **stateless sealed draft**: AES-256-GCM-encrypt the validated draft into that same cookie, with no Blobs write at all. That removes the IDOR, retention (#4) and storage cost (#6). Cap `notes` so the cookie stays under 4 KB.
- Note: either way, the privacy policy line "No cookies for visitors" (§7.10) becomes false. See #17.

### 3. The booking error path still puts PII in the URL. **blocker** (for PR 7)
- **Section:** §8.1.6 (`POST /api/bookings` row), §2.5
- **Issue:** Today `api/bookings.ts` redirects failures to `bookingReviewPath(slug, {...all form fields, error})`. The spec changes the request body to `draftId` but never says what the error redirect becomes. The obvious port keeps the PII redirect. The PR 7 acceptance check ("no PII in any URL") would catch it only if the E2E covers a server-side rejection.
- **Why:** Non-negotiable 5. URLs are logged by Netlify's function logs and stored in browser history.
- **Proposed spec text (add to the `POST /api/bookings` row):**
  > On a validation failure it redirects to `/book/{slug}/review/?draft={id}&error={code}` (`code` ∈ `BOOKING_ERRORS` keys), **never** with form fields. `bookingReviewPath()` with contact fields is deleted. A unit test asserts that no redirect `Location` from `/api/bookings` or `/api/bookings/draft` contains `@`, `firstName`, `email`, `phone` or `notes`.

### 4. Draft retention is unbounded: "lazy delete on read" never deletes abandoned drafts. **major**
- **Section:** §8.1.6 Cleanup
- **Issue:** Abandoned checkouts are exactly the drafts that are never read again, so their PII (including health notes, #9) stays in Blobs indefinitely. "Clear all" is a demo admin tool, not a retention control. The premise "no scheduled function is needed (Netlify Free)" also looks wrong: scheduled functions are, as far as I know, available on the Free plan (**verify** against current Netlify docs/credits).
- **Why:** GDPR Art. 5(1)(e) storage limitation; Art. 25 data protection by default.
- **Proposed spec text:**
  > Draft keys are `YYYY-MM-DDTHH/<uuid>` (UTC hour prefix). Every draft write also deletes, best-effort, all keys under hour prefixes older than 3 h (`store.list({ prefix })`; a sweep is capped at 50 deletes). Additionally, a Netlify **scheduled function** (`@hourly`, if available on the plan; verify the credit cost) sweeps the store. Expired drafts are never rendered (TTL is checked on read). If the sealed-cookie option (#2) is chosen, there's nothing to delete.

### 5. The rate limiter stores raw IP addresses forever and fails open. That's fine for contact, not for the new write endpoints. **major**
- **Section:** §10 S-11, §8.1.6, §8.2
- **Issue:** (a) The `rate-limits` store accumulates one blob per IP per route with no deletion, which is personal data with no retention period (CJEU C-582/14 *Breyer*: dynamic IPs are personal data). (b) The new draft endpoint stores PII per request; when the limiter fails open (Blobs hiccup, or the CAS race exhausted after 3 attempts) there's no second gate (no honeypot, no Turnstile, no body cap stated). (c) Per-IP keys are trivially bypassed with IPv6 rotation: one /64 holds 2^64 addresses.
- **Why:** GDPR Art. 5(1)(c)/(e); abuse economics on a capped Free plan (#6).
- **Proposed spec text (replace S-11):**
  > **S-11:** Rate-limit keys use `HMAC-SHA256(RATE_LIMIT_SALT, ip)` truncated to 16 bytes, never the raw IP. IPv6 addresses are truncated to their /64 before hashing. Bucket keys are prefixed with the window's UTC date, and any write sweeps keys from previous days (same pattern as #4). Fail-open stays for `/api/contact`. **`/api/bookings/draft` and `/api/charter-request` fail *closed*** (HTTP 503 "Please try again in a minute") when the limiter throws, because they write PII and send email. A global per-endpoint cap applies as well (`draft:global` 300/10 min, `charter:global` 30/hour). The draft endpoint gets the 16 KB streaming body cap from `api/contact.ts`.

### 6. Cost and abuse math on Netlify Free is based on the wrong plan model. **major** (verify)
- **Section:** §3.4 Video ("Netlify Free bandwidth (100 GB/mo) easily covers…"), §8.1.6, §8.2
- **Issue:** `netlify.toml` itself says the account is on the **credit-based** Free plan (300 credits/month, 15 per production deploy). On that model, bandwidth, web requests and function compute all draw from the same 300 credits, and the site is **paused** when they run out. A 3 MB self-hosted video replayed by a scraper, or a bot hitting `/api/bookings/draft` (each call = function invocation + 2 Blobs ops for the limiter + 1 Blobs write), can take the whole site offline for the rest of the month. That's an availability attack, not just a cost.
- **Why:** Availability (GDPR Art. 32(1)(b) "resilience"; also plain business risk).
- **Proposed spec text (§3.4 Video, replace the last bullet):**
  > The account is on Netlify's credit-based Free plan: bandwidth, requests and compute share 300 credits/month, and the site pauses at zero. Before PR 3, compute the credit cost of (a) 1,000 video plays and (b) 10,000 draft POSTs from the current Netlify price table, and record it here. The video ships at ≤ 2 MB and is fetched only on click (no `preload`). Set up a Netlify usage-alert email. If the plays budget exceeds 10% of monthly credits, host the clip elsewhere or drop it (D-6).

### 7. The charter request endpoint can exhaust Resend's free quota and block booking confirmations; the planned auto-reply is an email-bombing vector. **major**
- **Section:** §8.2 Submit, "[Optional] customer auto-reply email", §2.7
- **Issue:** Resend Free allows about 100 emails/day on one account, shared by booking confirmations, admin booking notices, contact notices and charter notices. Spam on `/api/charter-request` across IPs (5/10 min per IP, Turnstile still "pending") burns the daily quota, and then **paid customers get no confirmation**. A customer auto-reply to a user-supplied address lets anyone make the site mail a victim repeatedly. Today's `mayDeliverTo` allowlist hides this only while `PAYMENTS_ARE_DEMO` is true.
- **Why:** Abuse resistance; sender-domain reputation; CRD Art. 8(7) (the confirmation must arrive; see #14).
- **Proposed spec text (§8.2, add after Submit):**
  > **Turnstile is required for `/api/charter-request`**: the endpoint returns 503 "Charter requests are temporarily unavailable, please email us" unless both Turnstile keys are set. This makes Turnstile setup a blocker for PR 8 in production. Admin notifications for contact and charter enquiries are capped at **40/day** (counter in Blobs). Above the cap they are stored and shown in the admin only. Booking confirmations are never capped. **No customer auto-reply** until (a) Turnstile is on and (b) a per-recipient limit (1 auto-reply per address per 24 h, keyed by an HMAC of the address) exists.

### 8. checkOrigin/CSRF coverage of the new POST endpoints isn't pinned. **minor**
- **Section:** §8.1.6, §8.2, §14
- **Issue:** Astro's default `security.checkOrigin` protects form-encoded/multipart/`text/plain` POSTs on on-demand routes. JSON bodies rely on the CORS preflight. Both new endpoints are fine **only while the default stays on** and while handlers reject non-JSON content types. `api/contact.ts` calls `JSON.parse` on any body regardless of `Content-Type`, so a cross-site `text/plain` POST would depend entirely on checkOrigin. The draft endpoint is specified as both "303 redirect" (form) and "400 JSON for the island" (fetch), and the mixed handling is under-specified.
- **Proposed spec text (§8.1.6, add):**
  > Both new endpoints accept exactly one content type: the draft endpoint `application/x-www-form-urlencoded` (also usable without JS) **or** `application/json`, chosen once and documented. Other types → 415. `astro.config.mjs` sets `security: { checkOrigin: true }` explicitly. A test posts with `Origin: https://evil.example` and expects 403 for `/api/bookings`, `/api/bookings/draft`, `/api/charter-request` and `/booking/pay/`.

### 9. The "special requests" helper actively solicits health data (Art. 9) with no valid condition. **major** (verify with lawyer)
- **Section:** §8.1.2 Your details, §8.2 card 6, §10 S-5
- **Issue:** The new helper "Only tell us what the crew needs to know (allergies, mobility)" **invites** special-category data by example. "We use it for your trip only" is a purpose statement, not the explicit consent Art. 9(2)(a) requires. Those notes then go (a) into the admin email via Resend (a US processor; `templates.ts:220`), (b) into the outbox blob indefinitely, (c) into `sessionStorage`, and (d) into the draft store.
- **Why:** GDPR Art. 9(1), 9(2)(a), Art. 5(1)(c), Art. 13.
- **Proposed spec text (replace the §8.1.2 helper):**
  > Label: "Anything the crew should know? (optional)". Helper: "For example, a child seat or a late arrival. If it's about health (allergies, mobility, pregnancy), you can tell the skipper in person or call us, or tick the box below to share it here." When the field is non-empty, show an unticked checkbox: "I agree that Hello Blue Cave uses this information only to look after me on this trip, and deletes it within 30 days after the trip." Without the tick, the server stores the booking but **drops `notes`**, and the review page says so. Notes are **not** included in email bodies (the admin email says "Has special requests, see admin"). They are not written to `sessionStorage`. They are deleted 30 days after the trip date (see #12). Lawful-basis wording to be confirmed by the lawyer (D-18).

### 10. Privacy information at collection is incomplete while new collection points ship. **major** (verify with lawyer)
- **Section:** §7.10 "waits for the lawyer", §7.13 privacy line, §17 C-6
- **Issue:** PR 6/7/8 add or change three collection points (contact + topic, booking draft, charter request). Art. 13 information (controller **identity and contact details**, purposes **and legal basis**, recipients, **transfers** outside the EEA, retention, rights, and the right to complain to AZOP) must be available **at collection**. The spec defers the controller identity (C-6: "not shown"), legal bases, transfers and retention to PR 11, so the new forms launch pointing to a policy that can't name the controller. The processor list adds Resend, Netlify and Cloudflare (all US-headquartered) without transfer mechanisms (EU-US DPF certification / SCCs). Teya's entity and location aren't stated.
- **Why:** GDPR Art. 12–13, Art. 44–46.
- **Proposed spec text (§7.10, "Content fixes now", add):**
  > Before PR 7 or 8 reaches production, the privacy policy must name the controller (legal name, OIB, address, email), list for each processor its role, location and transfer mechanism (Netlify Inc., US: DPF/SCCs; Resend Inc., US: verify; Cloudflare Inc., US: DPF; PayPal (Europe) S.à r.l., LU; Teya: entity and country to confirm), state the legal basis per purpose (booking: Art. 6(1)(b); enquiries: 6(1)(b)/(f); anti-abuse incl. IP hashing and Turnstile: 6(1)(f); health notes: 9(2)(a)), give retention per record type (#12), and give AZOP (azop.hr) as the supervisory authority. **PR 7 and PR 8 are blocked from production until this text is live**; the lawyer review in PR 11 refines it.

### 11. Turnstile, sessionStorage and the new cookie need disclosure. "No cookies for visitors" becomes false. **minor** (verify with lawyer)
- **Section:** §7.10 cookies line, §10 S-12, #2
- **Issue:** The planned privacy text ("No cookies for visitors. One strictly necessary cookie (`hbc_admin`)…") is already incomplete once the draft cookie (#2) lands. Turnstile reads device signals and can set its own storage. `sessionStorage` holds booking form PII. ePrivacy Art. 5(3) (ZEK in Croatia) covers any storage or access on the terminal, not just cookies. These are likely "strictly necessary" or security exemptions, but they must be disclosed.
- **Proposed spec text (§7.10, replace the cookies bullet):**
  > "Storage on your device: we set no tracking or analytics cookies. We use: `hbc_draft` (strictly necessary, keeps your booking between steps, 2 hours); your browser's session storage for the booking form you're filling in (cleared when you finish or close the tab); Cloudflare Turnstile on the contact and charter forms (security check, see Processors); `hbc_admin` for staff login only." The exemption from consent is confirmed by the lawyer.

### 12. No retention periods for bookings, enquiries, outbox emails, rate-limit keys or logs. **major**
- **Section:** §9.4, §10
- **Issue:** The data model adds fields but never says when anything is deleted. The outbox duplicates the full PII of every booking and enquiry as rendered HTML. Croatian accounting/fiscal law requires keeping invoice data (usually 11 years under the *Zakon o računovodstvu*; **verify**), but that doesn't justify keeping phone numbers, notes or enquiry messages.
- **Why:** GDPR Art. 5(1)(e), Art. 13(2)(a), Art. 30.
- **Proposed spec text (new §10 row S-13):**
  > **S-13 Retention (PR 7, with figures confirmed in PR 11):** drafts 3 h; rate-limit buckets 24 h; enquiries 12 months after last activity; booking contact fields (`phone`, `customerNotes`, and `email` once no longer needed) are blanked 90 days after the trip date (notes after 30 days, #9); invoice-relevant fields (ref, date, amounts, invoice numbers, name) are kept for the statutory period; outbox emails 90 days, after which `html/text` are dropped and the metadata stays. Implemented as a sweep that runs on admin dashboard load (and a scheduled function if available, #4). The admin shows "Personal data removed on {date}" on swept records.

### 13. Health notes and PII in `sessionStorage`; the clear-on-success point is unspecified. **minor**
- **Section:** §8.1.2 Transport, §10 S-12
- **Issue:** The success page is a separate SSR page. "Cleared on booking success" needs a script on `/booking/success/` (and the pay page, since the payment provider may return later). Abandoned flows keep PII until the tab closes, and with `script-src 'unsafe-inline'` any XSS can read it.
- **Proposed spec text (S-12):**
  > Key `hbc:group:{slug}` stores date, slot, counts, first name, last name, email and phone, **never notes** (#9), with a `savedAt` timestamp. Entries older than 2 h are ignored and removed on read. The key is removed when `POST /api/bookings` succeeds (the island listens for `pagehide` after submit), and by a small script on `/booking/pay/` and `/booking/success/`. If `sessionStorage` throws, the flow still works (see #27, server-side prefill).

### 14. The confirmation email links to the cancellation policy, but a link isn't a durable medium. **major** (verify with lawyer)
- **Section:** §9.4 Emails, §8.1.3
- **Issue:** CRD Art. 8(7) requires confirmation of the contract **on a durable medium**, including all Art. 6(1) information (trader identity, total price, additional charges, cancellation terms, the statement that no withdrawal right applies). The CJEU (C-49/11 *Content Services*) held that a hyperlink to a website isn't a durable medium. The spec only adds "a cancellation policy link".
- **Proposed spec text (§9.4 Emails):**
  > The customer confirmation email contains, **as text**: trader identity (legal name, address, OIB, email, phone), tour, date, departure and meeting point, guests, line items, total paid, on-site fees with amounts (#16), the full cancellation and weather policy (`CANCELLATION_FULL` + `CANCELLATION_WEATHER`), the sentence on the withdrawal exemption (#15), and how to complain (#18). The terms version accepted (`termsVersion`) is printed. Optional: attach the terms as PDF. Links are extra, not a replacement.

### 15. The withdrawal-exemption wording is likely right for group tours, but it's asserted for every flow and lacks the required counter-information. **major** (verify with lawyer)
- **Section:** §8.1.3 pre-contract line, §8.2
- **Issue:** CRD Art. 16(l) (Croatian ZZP equivalent, art. 79; **verify the article**) exempts "services related to leisure activities if the contract provides for a specific date or period of performance". A dated group tour fits that well. But: (a) some boat services may be classed as **passenger transport** (CRD Art. 3(3)(k)), which changes which CRD articles apply at all; the lawyer must classify. (b) The trader must inform the consumer *before* the contract that they won't benefit from a withdrawal right (Art. 6(1)(k)). The line on the review page does that, but it must be repeated directly above the binding "Pay €X" button and in the confirmation (#14). (c) For charters the contract is concluded later (quote + payment link), so the exemption text belongs in the quote, not on the request page. (d) Calling it "the 14-day right of withdrawal" without naming the voluntary policy invites the misreading that no cancellation is possible.
- **Proposed spec text (§8.1.3 and §8.1.4):**
  > Pre-contract line (review **and** pay page, directly above the button): "This booking is for a leisure service on a fixed date, so the statutory 14-day right of withdrawal for online purchases does not apply (EU Directive 2011/83/EU, Art. 16(l)). You can still cancel under our [cancellation policy](/legal/cancellation/): {CANCELLATION_SHORT}." Lawyer confirms the classification (leisure vs passenger transport) and the Croatian-law citation. The charter request page states only "No contract is made and nothing is charged until you accept our quote."

### 16. The mandatory on-site cave ticket is hidden behind "From" prices and a 2-line clamp. **major** (verify with lawyer)
- **Section:** §6.2 TourCard, §6.3.3 item 7 (InfoTile 2-line clamp), §6.3.4, §8.1.4
- **Issue:** For tours that visit the Blue Cave, the cave ticket is unavoidable and paid in cash on site. Consumer law requires the total price including all unavoidable charges, or, when they can't be calculated in advance, the fact that they apply and how they're calculated, in the invitation to purchase and before the contract (UCPD Art. 7(4)(c); CRD Art. 6(1)(e); drip-pricing case law, e.g. CJEU C-476/14 *Citroën*). The spec shows it only in a "Good to know" tile **that is line-clamped to 2 lines**, in the step-2 summary, and in the review card. It isn't on tour cards or the aside price, and the pay page isn't required to repeat it. Since the ticket price is published by the public institution, it *can* be stated.
- **Proposed spec text:**
  > `additionalFees: { text, amountLabel?: string, mandatory: boolean, url? }`. Wherever a price for a tour with a mandatory fee is shown (TourCard, aside, mobile bar, step-2 summary, review, **pay page directly above the button**, confirmation email), add the line "+ {amountLabel or 'Blue Cave entrance ticket'} paid on site (cash)". On cards this is a 13px line under the price, **not** a tooltip. InfoTiles for **Additional fees**, **Meeting point** and **What to bring** are **never clamped**. The owner supplies the current ticket price range with an "as of {date}" source (§17 new item C-23).

### 17. "Best seller" derived from `featured`, and "Most popular" sort = catalog order. **major**
- **Section:** §6.2 TourCard badge, sort; §9.1 `badge`
- **Issue:** The badge priority is "Best seller (featured)", and the sort labelled "Most popular" is "featured first, then catalog order". Both claim a sales fact that is actually an editorial choice. That's a misleading claim about a main characteristic and about the product's results (UCPD Art. 6(1)(b)), and Art. 12 puts the burden of proof on the trader. The §1 D-5 discipline (no unverified claims) isn't applied here.
- **Proposed spec text (§6.2 and §9.1):**
  > `badge: 'bestseller'` may be set only when the owner can show it's the top seller by bookings for the current or previous season (recorded in `tour-catalog.ts` with a comment naming the source and date). Otherwise use `'pick'` → label "Our pick". The sort option is labelled **"Recommended"** (featured first, then catalog order), not "Most popular". The content guard (S-10) fails on "Best seller" in built HTML unless `BESTSELLER_EVIDENCE` is set in config.

### 18. Reviews plan breaks the Omnibus review rules; complaint/ADR info is wrong or missing. **major** (verify with lawyer)
- **Section:** §1 D-5, §6.1.9, §6.3.3 item 10, §7.10
- **Issue:** (a) The UCPD as amended by Omnibus (Art. 7(6); Annex I points 23b and 23c) makes it material to state **whether and how** the trader checks that reviews come from people who actually used the service. Curating "≥2 approved reviews" into `reviews.ts` and showing an average next to them risks presenting only positive reviews (23c), and Google/TripAdvisor don't verify purchases. (b) Reviewer names are personal data, and quoting them needs a basis. (c) The legal-content list says "consumer complaint/ADR wording" but not the concrete duties: ZZP's written-complaint procedure (acknowledge, reply within 15 days; **verify**) and ADR-body information. The **EU ODR platform was shut down on 20 July 2025** (Regulation (EU) 2024/3228), so any ODR link must be removed, not added.
- **Proposed spec text (§6.1.9, add):**
  > Every reviews block shows, next to the average: "Reviews from {source}, as of {date}. {source} does not check that reviewers took the tour; we show a selection and don't edit them. [All {N} reviews on {source}]". The average and N come from the source, covering all reviews, not the selection. Selection rule documented in `reviews.ts`: most recent N, not hand-picked by rating. Use first name + initial only, with the reviewer's consent or under the platform's terms (lawyer confirms).
  >
  > (§7.10) "Complaints: email {SITE_EMAIL} or write to {address}; we confirm receipt and reply within 15 days. ADR body: {name}, if applicable (lawyer). **Do not** link the EU ODR platform (discontinued 20 July 2025)."

### 19. Trader identity and "Licensed maritime operator" while bookings may be fulfilled by third-party operators. **blocker for real payments**, major now (verify with lawyer)
- **Section:** §17 C-6, C-7; §5.3 TrustStrip; §6.1.3 trust item 3; §5.2 footer
- **Issue:** C-6 records that the site names contracted operators (Misericordia, Aliskaf, Per Mare), yet the TrustStrip, footer and trust band say "Licensed maritime operator · Croatia" by default (C-7 "keep"). If Hello Blue Cave resells other operators' trips, that claim misstates the nature of the trader (UCPD Art. 6(1)(f)), and the consumer must be told who the contracting party is before booking (CRD Art. 6(1)(b)–(d)). The e-Commerce Directive Art. 5 (ZEK) and company law require the trader's name, address, register and OIB on the site **now**, not after a later lawyer PR. If several traders' products are ranked, UCPD Art. 7(4a) (disclosing ranking parameters) may also apply.
- **Proposed spec text (§17 C-7, default):**
  > **Hidden** until the owner confirms who holds the licence (Hello Blue Cave itself vs the contracted operator) and supplies the licence/authority reference. If the trips are operated by third parties, the tour page and review step state "Operated by {operator}. Booked through {legal name}." Imprint (legal name, address, OIB, court register entry, email, phone) ships in the footer in **PR 6** (factual, not legal judgement), and is a blocker before `PAYMENTS_ARE_DEMO=false`.

### 20. `termsVersion` and `termsAcceptedAt` are trusted from the client. **minor**
- **Section:** §8.1.3, §9.4
- **Issue:** "POSTs with `draftId` + `termsVersion`" lets the client assert which terms it agreed to. As evidence of acceptance this is weak, and a stale tab could submit an old version silently.
- **Proposed spec text:**
  > The server stores `termsVersion = TERMS_VERSION` (its own constant). If the posted value differs, it redirects back to review with `error=terms_changed` ("Our terms changed while you were booking; please review them again"). `termsAcceptedAt` is server time.

### 21. Double submit from one draft creates duplicate pending bookings. **minor**
- **Section:** §8.1.6
- **Issue:** "Create the booking, then delete the draft" isn't atomic. Double clicks, or Back + resubmit, create two pending bookings with the same PII (data minimisation, and noise for overbooking warnings).
- **Proposed spec text:**
  > Consuming a draft is a compare-and-swap that sets `draft.bookingId`. A repeated POST with the same draft redirects to `/booking/pay/?id={draft.bookingId}`. The draft is deleted after 3 h by the sweep (#4), not immediately.

### 22. Success page and ref: masked email is good, but the ref becomes a weak identity proof for "Change or cancel a booking". **minor**
- **Section:** §8.1.5, §7.13 Topic
- **Issue:** The success URL is another bearer link (tour, date, total, masked email, ref). The new contact topic "Change or cancel a booking" invites "Here's my ref, change the phone/email/date" requests. Staff need a verification rule, or a leaked screenshot lets a stranger cancel or redirect a booking.
- **Proposed spec text (§7.13):**
  > For the topic "Change or cancel a booking", the form asks for the booking ref. Admin shows "Verify: the reply goes only to the email on the booking". The policy, written in the admin help text, is that changes are made only after confirmation from the booking's email address. The success and pay pages send `Referrer-Policy: no-referrer` (#1). The `.ics` download (if built) contains no name, email or phone.

### 23. CSP: inline scripts multiply; consider Astro's hashed CSP. **minor** (verify)
- **Section:** §3.5, §10 S-8
- **Issue:** The spec adds more inline modules (slider, scrollspy, open-now, video, copy, mobile bar) under `script-src 'unsafe-inline'`. With customer-controlled strings rendered in the admin (notes, enquiry messages, charter fields), any escaping slip is directly exploitable. Astro's built-in CSP support (hash-based, `security.csp`; stable in Astro 6, **verify**) could remove `'unsafe-inline'` from `script-src` without nonces. Also, the S-8 premise that there are "no third-party origins" breaks once the Turnstile keys are set (the CSP already allows `challenges.cloudflare.com`; memory notes say this is the pending item), and the S-7 middleware CSP must include the same Turnstile origins or SSR pages that embed it will break.
- **Proposed spec text (S-8):**
  > PR 9 evaluates `security.csp` (hashes for Astro's inlined scripts and island bootstraps). If it works with the Netlify adapter, drop `'unsafe-inline'` from `script-src` on all pages; `style-src 'unsafe-inline'` may stay. Add `media-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` now (they cost nothing). Any admin template rendering customer text has a test feeding `<img src=x onerror=alert(1)>` and asserting it's escaped (pages and `templates.ts`).

### 24. Focus Not Obscured (2.4.11): the sticky/hide-on-scroll header plus fixed bottom bars aren't accounted for. **major**
- **Section:** §5.1 Scroll behaviour, §6.3.6, §6.5 mobile bar, §6.3 sticky aside, §7.10 sticky TOC
- **Issue:** The header reappears on scroll-up. Shift+Tab scrolls the page up, the header comes back, and the newly focused element sits under the 60px bar. The fixed 72px `MobileActionBar` covers focused fields and links near the bottom. Only `#book` gets a `scroll-margin-bottom`. In the booking flow on mobile, the step-2 form plus any fixed element repeats the problem.
- **Proposed spec text (§11, new item 15):**
  > **Focus not obscured (2.4.11):** `html { scroll-padding-top: calc(var(--site-header-height) + 8px); scroll-padding-bottom: var(--mobile-bar-height, 0px) }`, where pages with a `MobileActionBar` set `--mobile-bar-height: 88px` at ≤768. The header's hide-on-scroll ignores scrolls caused by focus changes (no hiding within 500 ms of a `focusin`), and on `focusin` it checks `getBoundingClientRect()` and scrolls the target clear if it's covered. Playwright test: tab through tour detail and step 2 at 390×844 and assert every focused element's rect doesn't intersect the header or bar rects.

### 25. Reflow and zoom: sticky header plus fixed bar at 400% zoom leave almost no viewport. **major**
- **Section:** §5.1, §6.3.6, §6.1.2 (`min-height: 580px`), §11.13
- **Issue:** At 1280×1024 with 400% zoom (a 320×256 CSS viewport), a 60px sticky header plus a 72px fixed bar cover over half the height. WCAG 1.4.10 tolerates sticky parts but not ones that make content unusable, and 2.4.11 fails as above. The hero's `min-height: 580px` with bottom padding of 168px pushes the CTA two screens down in landscape zoom.
- **Proposed spec text (§11.13, append):**
  > `@media (max-height: 480px)`: the header is `position: static`, `MobileActionBar` is not rendered (the `#book` aside is in flow), sticky asides and TOCs are static, and the hero uses `min-height: auto; height: auto` with `padding-bottom: var(--space-7)`. Acceptance: screenshots at 320×256 for home, tour detail and step 2 show the primary CTA without horizontal scroll.

### 26. Overlay header and glass chips/pills on photos have no contrast guarantee; the hero rule checks the wrong point. **major** ("things the spec claims are fine")
- **Section:** §6.1.2 Scrim ("≥4.5:1 against the **darkest** overlay point under the text"), §5.1 Overlay variant, §6.2 glass chips, §6.3.2 count pill
- **Issue:** (a) Contrast must hold against the **lightest** background pixel under the text, not the darkest. As written, the check passes trivially. (b) `--color-overlay-hero` darkens the left edge and the bottom only, so the top-right, where the overlay header's links and "Book now" outline sit, gets ~0% scrim. White 14px nav text over sky fails 1.4.3, and the outline button fails 1.4.11. (c) Glass chips (translucent white) over the hero photo carry the filter state, so text and pressed state need 4.5:1 / 3:1, and pressed must not be colour-only (1.4.1). (d) The gallery "View all n photos" glass pill sits on an unscrimmed photo.
- **Proposed spec text (§6.1.2 Scrim):**
  > Hero text must reach ≥ 4.5:1 (large display text ≥ 3:1) against the **lightest** pixel of the scrimmed photo under its bounding box, measured per slide at 390, 768, 1280 and 1920 and recorded in the PR. Add a third scrim layer for the overlay header: `linear-gradient(180deg, rgba(6,24,40,.55) 0, rgba(6,24,40,0) 120px)`. Glass chips, the sort pill and the photo count pill use a solid-enough fill (`rgba(10,42,64,.62)` + `backdrop-filter`, white text), the pressed state adds a `ti-check` glyph and a white 2px border, and the focus ring on photos is a white outline plus `0 0 0 4px var(--palette-navy-950)` (two-tone).

### 27. Redundant entry (3.3.7) depends entirely on `sessionStorage`. **minor**
- **Section:** §8.1.3 Edit links, §8.2
- **Issue:** If `sessionStorage` is blocked or throws, or the user edits from a different tab, "Edit" returns to an empty step 2 and they must retype everything, while the server already holds the draft.
- **Proposed spec text (§8.1.3):**
  > Edit links go to `/book/{slug}/group/?draft={id}`. Step 2 (SSR shell or island fetch from `GET /api/bookings/draft/{id}`, protected by the same cookie binding as #2) prefills from the draft when `sessionStorage` has nothing. Charter: after a server validation error the island keeps all entered values.

### 28. Consistent Help (3.2.6) across site and checkout layouts. **minor**
- **Section:** §5.2 Footer, §5.3 TrustStrip, §8.2 item 9, §8.1.5 error help strip
- **Issue:** Help appears as tel + mailto in the footer (site pages), email only in the TrustStrip (checkout), and phone text on the error page. 3.2.6 requires help mechanisms that repeat across pages to appear in the same relative order.
- **Proposed spec text (§5.3):**
  > TrustStrip help item: "Need help? {phone link} · {email link}", in the same order as the footer (phone, then email), and it's the last block before the end of `main` on every checkout page (group, review, pay, success, error, charter).

### 29. Native controls preferred for radio cards, checkboxes and the calendar; the tooltip for out-of-season dates is risky. **minor**
- **Section:** §8.1.2 Departure / Calendar, §8.2 routes and extras, §8.1.4
- **Issue:** `role=radiogroup` "radio cards" need roving tabindex and arrow keys. Ad-hoc implementations usually break this, and `role=checkbox` rows need Space handling. A "tooltip" for disabled dates must meet 1.4.13 (dismissible, hoverable, persistent) and is unreachable on touch. Day buttons need full-date accessible names.
- **Proposed spec text (§11, item 7, append):**
  > Radio cards and extras are **native** `<input type=radio|checkbox>` inside `<label>` cards in a `<fieldset><legend>` (as `pay.astro` already does). No ARIA radio/checkbox roles. Calendar day buttons have accessible names like "Tuesday 14 April 2027" plus ", outside the season" / ", selected". Disabled-date explanation is a visible legend under the grid, not a tooltip. The stepper count changes are announced through a single `role=status` region ("3 adults").

### 30. Carousel, slider and marquee details still under-specified. **minor**
- **Section:** §6.1.2, §6.1.5, §6.1.3, §6.5 item 2
- **Issue:** (a) The APG carousel pattern needs `aria-live="off"` while rotating and `"polite"` when paused or stopped; otherwise screen readers either miss changes or get interrupted every 6 s. (b) The pause buttons must come **before** the moving content in DOM order. (c) The popular-tours slider at ≤768 hides the arrows. Native scrolling is fine for 2.5.7, but the drag-to-scroll on desktop must not trap text selection, and the track (`overflow-x: auto`) needs to be a focusable labelled region per §11.13. (d) Marquee duplicates must be `inert` as well as `aria-hidden`, if they ever contain links.
- **Proposed spec text (§6.1.2 Semantics, append):**
  > Slides container `aria-live="off"` while auto-rotating, `"polite"` when paused or under reduced motion. Pause/play is the first control in DOM order inside the carousel region. (§6.1.3 / §6.5) The marquee pause button precedes the track; the duplicate set is `aria-hidden="true" inert`. (§6.1.5) The track gets `tabindex="0"` + `role="region"` + `aria-label="Popular tours, scrollable"` only when it overflows.

### 31. Video: "captions if it has audio" falls short of AA. **minor**
- **Section:** §3.4 Video, §6.1.4, §11.11
- **Issue:** For prerecorded synchronized media, AA needs captions (1.2.2) **and** audio description (1.2.5), not only a text alternative. A 22-second scenic clip with a music track counts as synchronized media.
- **Proposed spec text (§3.4):**
  > The clip ships **without an audio track** (strip it at encode time), making it video-only: a text description under the player satisfies 1.2.1. If audio is ever kept, it needs captions plus an audio description or extended text, or it doesn't ship. The `<video>` gets `aria-label` and the description is linked by `aria-describedby`.

### 32. Line clamps cause loss of content under text spacing (1.4.12) and hide legal info. **minor** (major for fees, see #16)
- **Section:** §6.3.3 item 7 (InfoTile 2-line clamp), §6.4 card description, §6.1.7 tagline
- **Issue:** "Full text in the DOM, clamp only visual" doesn't help sighted users. With 1.4.12 overrides, clamped text is cut with no way to reveal it. Fine on cards that link to the full text; not on the detail page, which is the full text.
- **Proposed spec text:**
  > Line clamps are allowed only on cards whose link target shows the full text. Detail-page InfoTiles are never clamped.

### 33. Contact "Open now" badge and status colours must carry text. **minor**
- **Section:** §7.13 item 3, §12 status tones, §8.1.1 StepBar
- **Proposed spec text:**
  > The open-now badge always renders text ("Open now, until 18:00" / "Closed, opens 09:00"); green/grey is decoration. With JS off it renders nothing (not a stale build-time state). StepBar "done" steps carry a visually hidden "completed". Admin status tones always pair colour with the status label.

### 34. Admin re-skin must keep login accessible (3.3.8). **minor**
- **Section:** §12 PR 10
- **Proposed spec text:**
  > The admin login keeps `<label>`, `autocomplete="current-password"`, paste allowed and no CAPTCHA puzzle (3.3.8). Rate-limit login attempts (`login:<hashed ip>` 10/10 min) and log failures without the password. Today there's no limit on `checkAdminPassword` attempts (**verify**: I didn't read `admin/login.astro`).

### 35. Scarcity, urgency and other claims still in the spec. **minor**
- **Section:** §8.1.5 error note, §5.3 TrustStrip, §6.1.3, §6.1.8
- **Issue:** (a) "Try again soon so your tour doesn't fill up" is pressure based on no availability data (UCPD Art. 6; Annex I pt 7 targets false limited-availability claims; low risk but unneeded). (b) "Secure payment" with a lock on the **demo** checkout implies a real payment is secured. (c) "Free cancellation up to {CANCELLATION_WINDOW}" in the trust band must link to the conditions (bad-weather vs customer cancellation, and private charters excluded: 30% deposit).
- **Proposed spec text:**
  > Error note: "We don't hold seats until you pay. You can try again now, or call us and we'll book it for you." TrustStrip shows "Secure payment" only when `PAYMENTS_ARE_DEMO` is false. The trust-band cancellation item reads "Free cancellation up to 48 h before group tours" and links to `/legal/cancellation/`.

### 36. European Accessibility Act applicability isn't assessed. **minor** (verify with lawyer)
- **Section:** §11
- **Issue:** Since 28 June 2025, consumer e-commerce services fall under the EAA (Directive 2019/882, transposed in Croatia). Microenterprises providing services (fewer than 10 staff **and** ≤ €2 M turnover/balance sheet) are exempt. If the business isn't one, an accessibility statement with the Annex V information is required, and the WCAG 2.2 AA target in §11 is the practical route.
- **Proposed spec text (§11, append):**
  > The owner confirms whether the business is a microenterprise under the EAA. If not, PR 11 adds `/accessibility/` (conformance status, known issues, contact for accessibility feedback, enforcement body) and links it from the footer.

### 37. Croatian-language requirement for consumer information. **minor** (verify with lawyer)
- **Section:** §1 D-3, §16 i18n
- **Issue:** ZZP requires certain consumer information (prices, pre-contract and contract information) in Croatian for consumers in Croatia; other languages may be added. An English-only booking flow and English-only terms may not meet that for Croatian customers.
- **Proposed spec text (D-3 note):**
  > Language switcher deferred, but the lawyer confirms whether the terms, cancellation policy, privacy policy and confirmation email must also exist in Croatian (ZZP). If so, those four ship in HR in PR 11, independently of site-wide i18n.

---

## Things the spec claims are fine that aren't (cross-reference)

| Spec claim | Reality | Finding |
|---|---|---|
| S-7 "check, then fix in PR 7" | Already confirmed missing in production: admin is frameable now | #1 |
| §8.1.6 "No scheduled function is needed (Netlify Free)" | Lazy delete never removes abandoned drafts; scheduled functions are likely available on Free | #4 |
| §3.4 "Netlify Free bandwidth (100 GB/mo) easily covers…" | The account is on 300 credits/month; bandwidth and compute draw on it; the site pauses at zero | #6 |
| S-11 "fails open… acceptable" | Not for endpoints that write PII and send email; raw IPs kept forever | #5 |
| §6.1.2 "≥4.5:1 against the darkest overlay point" | Must be the lightest point; overlay header area has no scrim | #26 |
| §7.10 "No cookies for visitors" | False once the draft cookie, Turnstile and sessionStorage exist | #11 |
| §8.1.2 helper "allergies, mobility… for your trip only" | Solicits Art. 9 data without explicit consent; it's emailed via a US processor | #9 |
| §9.4 "cancellation policy link" in email | A link isn't a durable medium (C-49/11) | #14 |
| §6.2 "Best seller (featured)" / "Most popular" sort | Editorial pick presented as a sales fact | #17 |
| §17 C-7 default "keep" licensed-operator claim | Contradicts non-negotiable 2 while C-6 says third parties operate trips | #19 |
| §2.5 "no personal data in URLs" | The `/api/bookings` failure redirect isn't covered | #3 |
