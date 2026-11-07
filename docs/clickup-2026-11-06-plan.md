# ClickUp batch, 6 Nov 2026 (afternoon): plan

Source: ClickUp "Hello Blue Cave / Team Board", read 6 Nov 2026, after Mare and
Ivan's 15:27–16:45 round. 33 tasks on the board.

Baseline: PR #27 (`fix/clickup-2026-11-05`, head 7bf9f12) is open and holds
the 5 Nov batch, the 2 Nov follow-up (9dcede2), the Blue Lagoon times
(929c4fa), and the private extras and pick-ups (7bf9f12). `main` is still
da4c0f2 (PR #26). This plan assumes PR #27 is merged first. The work then goes on a
new branch, `fix/clickup-2026-11-06`, cut from `main`.

## What changed on the board since PR #27

Assigned to Luka, In Development (all moved today):

| Task | What is new | Against PR #27 | Action |
| --- | --- | --- | --- |
| Blue Lagoon vrijeme polaska | Mare moved it to dev at 16:22. Ivan updated the design and the xlsx to 09:30–14:00 / 14:30–19:00 | Done in 929c4fa, same times | Nothing to build. Close it after merge |
| Extras for private | In dev at 16:19. Ivan: SUP +€35 and Seabob +€150 added, picnic removed | Done in 7bf9f12, same set and prices (champagne +€40 from the design) | Nothing to build |
| Pick up point za private | In dev at 16:22. Ivan lists the 10 points with fees and adds: **"The fees are placeholders until the PO confirms them."** Mare moved it to dev without confirming the fees | Done in 7bf9f12 with these fees. The labels differ slightly from Ivan's list | **A3**: align the labels. The fees stay flagged as unconfirmed |
| Weather update | New. Replace the current sentence with: "We'll contact you before departure if conditions change. If cancelled, you get a full refund or free rescheduling." The screenshot shows the payment success page, "What happens next" → "Weather update" | Not in PR #27. The site shows `CANCELLATION_WEATHER` (4-hour notice, 30-day refund) on the success page, in the confirmation email and in one FAQ answer | **A1** |
| Hero Banner texts | Mare approved Ivan's version at 16:24: "ok može i tako" | Not in PR #27. Today's slides: "Hello Blue Cave Croatia" / "Escape in style & comfort" / "All aboard, mateys!" | **A2** |
| Tour Review | Moved from In Testing to dev today, no comment. It links the "Tours — before vs after" page | Content built in abc664d from Ivan's xlsx, which Mare approved | **A4**: check the build against the AFTER boards |
| Terms & Privacy | Mare compared the operator's Terms and Privacy text with the site. The only difference she found is cookies. She asks whether Luka adapts that part to what Hello Blue Cave actually uses | Privacy §8 deliberately says only the necessary cookies (booking, admin) are used: no analytics and no banner | **A5**: a reply and one question. No code unless analytics is planned |

Still In Design or In Progress (not dev yet). Ready to build when moved:

| Task | What is new | Action |
| --- | --- | --- |
| Private experience (Ivan, In Design) | New card text: "The whole boat is yours. Choose your route, set your pace, and make the day entirely your own. Ideal for families, celebrations, and corporate groups." Food is dropped. Mare: remove "photography packages" from About. She still has to go over the page with Vedro | **B1**, held. The site card still says "bring your own food and music". Our About has no photography line |
| FAQ - general ones (Ivan, In Design; blocked by FAQs update Issues) | Mare's reply at 13:13 gives new answers for "Are the tours suitable for children?" ("under-3 years travel free …") and "What should I bring" (reef-safe sunscreen, light jacket). Her FAQ xlsx is attached in the task | **B2**, held until Ivan's 12b FAQ page is approved |
| FAQs update Issues (Ivan, In Design) | Mare's answers: 48 h free cancellation for both group and private; notify on time; refunds within 30 days; full refund or rebook. Still open: whether private pays a 30% deposit or the full amount | **B3**, held. This also unblocks Legal §3 and the private FAQ answer |
| Destination Review (Ivan, In Design) | Mare's travel times from Split: Milna 25–30 min, Blue Lagoon 25–30 min, Korčula ~2 h, Zlatni Rat ~1 h, Komiža ~1 h 30, Stiniva ~1 h 30, Blue Cave ~1 h 40. Her destination list (12) differs from the site's 9 | **B4**, held |
| Contact Details (In Development) | The status went round again today (13:18–13:58) with no comment. The thread is unchanged: footer +385 98 702 250, the 3 contact numbers | Done in abc664d. **A6**: re-check the contact board |
| IDEA: Popust KOD (Mare) | A digital discount code like the stand seller's. Mare: Darko gives it only for cash payment | No dev. Idea only |
| Kupit Font (Ivan, To Do) | Glorich is not bought yet | Affects A2 (ligatures) |
| Admin, Drugačiji pick up, Index page, Mail potvrde, Private booking ne radi, Kontakt forma, Instagram, Tour description, Video, the To Do questions | No new activity since PR #27 | Video is still waiting on the file |

## Status (6 Nov, evening)

PR #27 was merged as ba48947. The full e2e suite on `main` was green before starting
(386 passed, 7 video tests skipped). The work is on `fix/clickup-2026-11-06`.

Luka's answers to the questions below:
1. The fees are written down, so treat them as confirmed.
2. Use the latest design for slide 2.
3. Analytics: go with the recommendation (none, so no banner).
4. Under-3 means 0–2.
5. The rest stays open.

| Item | Result |
| --- | --- |
| A1 Weather update | Done: `WEATHER_UPDATE_NOTE` on the success page ("Weather update.") and in the confirmation email |
| A2 Hero | Done: slide 2 takes the private-boat subtitle (with `MAX_GUESTS`), slide 3 is "Lounge, cruise & relax" |
| A3 Pick-up labels | Done: Ivan's labels; "Other pickup location" says it must be arranged with the captain |
| A4 Tour Review | Checked the Blue Lagoon AFTER board (the one Ivan changed today): times, itinerary, inclusions and FAQ match. The others come from the same xlsx (abc664d), which Ivan didn't change today. The known differences remain (€1,200, 12 guests) |
| A5 Terms & Privacy | No code. Reply to Mare below |
| A6 Contact | Board 11 matches the build. The design's hours, season and "replies within the hour" stay hidden (not confirmed, C-7) |
| B2 note | Under-3 = 0–2 means `INFANT_MAX_AGE` should become 2. That changes what a 3-year-old pays, so it goes in with the FAQ task (B2), not before |

Checks:
- `pnpm check`: 0 errors. Unit tests: 527 passed. The build passes. Axe passes.
- Full e2e: 383 passed, 3 failed, then 1 failed on a second run, with different
  tests each time. The repeat offender is the long `charter.spec.ts` start-to-finish
  test: it hits the 30 s limit on the admin "Quote sent" step in Firefox and
  WebKit. It fails the same way on `main` with these changes stashed. With
  `--timeout=90000`, charter and private-booking pass in all 3 browsers (48/48).
- Likely cause: the local `playwright` Blobs store now holds about 330 test
  enquiries and 500 outbox mails, which the admin pages load one by one.
  On 7 Nov, with Luka's OK, the five `site:*--playwright` stores were cleared.
- Re-run on the clean store (7 Nov): 384 passed, 2 failed. The charter timeouts
  are gone. The 2 failures are `content.spec.ts` "legal pages: a clicked section
  is the one marked, the last one too" (the TOC marker after scrolling back up).
  It is flaky in all 3 browsers (5/9 passed on repeat) and also fails on `main`
  with these changes stashed (WebKit 2/3 failed), so it predates this branch.

Draft reply for Terms & Privacy (not posted):

> The cookie part differs on purpose. The site only sets the cookies it needs
> to work (the booking in progress and the admin login), with no Google
> Analytics or ad cookies, so the privacy page says that and there's no
> cookie banner. If you want analytics or Meta ads later, tell me and I'll add
> the banner and update the privacy page with it.

## Implementation (Phase A: tasks in dev)

### A1 Weather update

- `src/config/cancellation.ts`: add `WEATHER_UPDATE_NOTE` with Mare's exact
  sentence. Keep `CANCELLATION_WEATHER`: Legal §4 and the FAQ still need the
  4-hour and 30-day figures.
- `src/pages/booking/success.astro`: the "What happens next" item becomes
  **Weather update.** followed by `WEATHER_UPDATE_NOTE` (the design's heading).
- `src/lib/email/templates.ts`: the confirmation email's weather paragraph
  uses `WEATHER_UPDATE_NOTE`. The terms section below it still carries the full
  policy, so no figure is lost. Ivan changed the same sentence in his emails.
- **Not changed**:
  - Legal (contract text). On Ivan's legal board (his §3) the line reads "We will notify
    you before the scheduled departure…". Our §4 "When we cancel" already says
    this, with the 4-hour figure.
  - The FAQ answer, which waits for B2.
  - The day-before reminder emails (09f / 09f-b): the site has none. That would be new
    work (a scheduled send), so it is not part of this task.
- Tests: update `templates.test.ts` and the success-page e2e if either asserts
  the old sentence. Add one unit test that the success page and the email use
  the new note.

### A2 Hero banner (01 Homepage, main)

The approved design, in order:

1. **Hello / Blue Cave / Croatia** (hand photo): unchanged, the same as the site.
2. **Escape / in style / & comfort**: the title is unchanged, but the design's subtitle
   is now "Private boat tours from Split for up to 12 people. Your route, your
   pace — the Blue Cave, Hvar or a quiet bay." (today's slide 3 subtitle). The site's
   "Modern, comfortable speedboats …" subtitle is not in the design.
3. **Lounge, / cruise / & relax**, with "Swim in crystal-clear waters, visit hidden
   bays and enjoy the ultimate island getaway." This replaces "All aboard,
   mateys!".

- `src/data/marketing.ts`: change `HERO_SLIDES` to the above. Keep
  `MAX_GUESTS` in the subtitle (14), not the design's 12 (see the 5 Nov plan, decision 2).
- Photos: unchanged. The design's photos are still not cleared (C-17). Slide
  3 keeps the Pakleni aerial. Check the text contrast on it with the new, longer
  lines.
- Ligatures: Ivan picked "Lounge, cruise" for Glorich's LO/RU ligatures. The
  site uses Anton until the licence is bought ("Kupit Font", To Do;
  memory: Glorich swap pending), so there are no ligatures for now. The text is right
  either way.
- Tests: any unit or e2e test that checks the hero text (grep for "mateys" and
  "speedboats"); the axe check on `/`.

### A3 Pick-up labels (Ivan's 05 list)

`src/config/private.ts` labels to match Ivan's comment word for word:

| id | now | Ivan |
| --- | --- | --- |
| riva | Riva stand 14 (meeting point) | Riva Waterfront (Stand 14), Split |
| stomorska | Stomorska Waterfront, Šolta | Stomorska Waterfront, Šolta Island |
| sutivan | Sutivan Waterfront, Brač | Sutivan Waterfront, Brač Island |
| milna | Milna Marina, Brač | Milna Marina, Brač Island |
| hvar | Hvar Town Waterfront | Hvar Town Waterfront, Hvar Island |
| other | Other location | Other pickup location, with the note "Must be arranged with the captain beforehand" |

- The "Other" option's label and sub-line are in `PrivateBookingFlow.vue:123` (and
  the no-JS form in `src/pages/book/[slug]/private.astro`), not in the config.
- The ids stay the same, so stored bookings are unaffected. All labels stay ≤ `OTHER_PICKUP_MAX`.
- Update the comment in `private.ts`: Ivan himself marks the fees as
  placeholders until the PO confirms them.
- Tests: `private.test.ts` and the e2e tests that name the old labels.
- **Only build this if** Luka agrees to keep selling with placeholder fees. If
  not, the alternative is to hide the paid pick-ups (keep Riva and Other) until Mare confirms.
  That is a one-line config change.

### A4 Tour Review check (no code expected)

Go through each tour page against the "Tours — before vs after" AFTER
artboards (02c etc.):

- names, intro, itinerary times, inclusions, Good to know, FAQ
- the Blue Lagoon times Ivan changed today

Fix any text that differs. Report the known, deliberate differences
(€1,200 vs the doc, 12 vs 14 guests) rather than change them.

### A5 Terms & Privacy (reply to Mare, no code)

The cookie section differs on purpose. The operator's text describes Google
Analytics and marketing cookies, but the site sets only the booking and admin
cookies, so Privacy §8 says that and no consent banner is shown. Ivan has a "15
Cookie consent banner" board, though. Question for Mare: will the site use
analytics or ads (GA, Meta Pixel)? If yes, that is separate work: a consent
banner, scripts that load only after consent, a CSP change, and Privacy §2/6/7/8.

### A6 Contact board re-check

Compare `/contact/` and the footer with Ivan's contact board after today's
13:18–13:30 round, and fix any text that differs.

## Ready, waiting for status (Phase B)

- **B1** Private experience card text in `TYPE_CARDS`
  (`src/data/marketing.ts:136`), when the task reaches dev.
- **B2** FAQ: apply Mare's xlsx and her two answers. Check "under-3 years travel free"
  against `INFANT_MAX_AGE = 3`, which the site reads as "up to 3".
- **B3** Deposit vs full payment for private, then Legal §3 and the private FAQ
  answer.
- **B4** Destination travel times. Map them to the site's 9 destinations
  (Blue Lagoon ~45 min → 25–30 min, Zlatni Rat ~1–1.5 h → ~1 h, Blue Cave
  ~1.5–2 h → ~1 h 40). Milna, Stiniva, Komiža and Biševo-Porat are not
  site destinations yet.

## Questions for Mare

1. Pick-up fees and champagne €40: are they confirmed? Ivan calls them placeholders.
2. Hero slide 2: should the subtitle be the design's private-boat line (and not
   "Modern, comfortable speedboats …")?
3. Analytics or marketing cookies: yes or no (A5)?
4. "Under-3 travel free": does that mean ages 0–2, or 0–3 as the site has now?
5. Still open from before: €1,200 vs €1,500/€2,000, 12 vs 14 guests, the 09:15 /
   14:15 check-in, and the video file.

## Verification

- `pnpm check`, unit tests, a build with `PUBLIC_SITE_URL`, the full e2e suite
  (3 browsers, run with `RESEND_API_KEY=`), and axe.
- Screenshots of `/` (the 3 slides, desktop and phone) and `/booking/success`.
- The full e2e suite was not re-run after PR #27's last test-only fixes, so
  run it once on `main` after the merge, before starting.

## Review of this plan

- Every item maps to a task and a quote; nothing is invented. Any price
  or figure not given by the operator stays flagged rather than built.
- A1 keeps the legal figures and only changes the guest-facing summary. A2
  keeps `MAX_GUESTS` and the cleared photos. A3 keeps the ids.
- Order: A1, A2, A3 (if agreed), then A4 and A6 (checks), then A5 (a reply). About
  half a day, most of it A2 and the test updates.
