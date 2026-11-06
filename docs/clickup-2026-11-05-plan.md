# ClickUp batch, 5 Nov 2026: plan and status

Source: ClickUp "Hello Blue Cave / Team Board", read on 5–6 Nov 2026. Branch
`fix/clickup-2026-11-05`, cut from `fix/clickup-followup-2026-11-02` (9dcede2,
pushed but never merged), so it includes the 2 Nov follow-up as well.
Nothing is committed.

## Where we left off (2 Nov)

- PR #26 (31 Oct tasks) is merged to main and live.
- The 2 Nov follow-up (9dcede2) is pushed on `fix/clickup-followup-2026-11-02`
  but has no PR and is not merged: "Next available" date, phone bar fee line,
  "Group Tour enquiry", footer MB/Djelatnost/e-mail, formatEuro in emails.
- We were waiting on the operator for: private prices, latest departures,
  video file, and Ivan's hero, phone and FAQ handoff.

## What changed on the board

| Task | Status / who | What it asks | Decision |
| --- | --- | --- | --- |
| Tour description and Itinerary | In dev, Luka. Mare: "provjerila ture, sve ok … možeš krenit u dev" | Ivan's `HBC_Tour_Content_Updated.xlsx` + "Tours — before vs after" board | **Done**: names, descriptions, times, itineraries, inclusions, Good to know, tour FAQs |
| Instagram | In dev, Luka. Mare: "može u dev" | @hellobluecave in the footer and on the contact page | **Done** |
| Contact Details mobile and whatsapp | In progress, Mare; Ivan's design updated | 3 numbers for phone and WhatsApp; footer gets +385 98 702 250 | **Done** |
| Company details (footer) | Done. Mare: "ovo je isto ok na svim stranicama, može dev" | Ivan's footer layout | **Done**: split bottom line as designed; kept "Djelatnost" from Mare's task text |
| Kontakt forma u sekciji Contact | In dev. Mare: "može dev" | "Group Tour enquiry" | Already in 9dcede2 |
| Mail potvrde gostu za grupnu turu | In dev, reassigned to Luka 5 Nov | Mare's sentence for all tours; no "15 min early" at Blue Cave (07:20) | Email already has the sentence and shows 07:20. "Arrive by 07:05 (15 min early)" exists only in Ivan's mock. Blue Cave's 07:05 check-in removed site-wide |
| Private experience booking ne radi | In dev (27 Oct) | Private booking for every tour | Done in PR #26; Red Rocks and Dubrovnik keep their private step now they're private only |
| Sekcija za video | In dev | Video section | Still blocked: no video file |
| FAQs update Issues / FAQ – general ones / Hero Banner texts | In design, Ivan | Deposit vs full payment, private refunds, weather wording, hero texts | Not dev yet: Ivan and Mare are still deciding |
| To do (Vedro, Mare) | To do | Guest limit 12 vs 14, season start, Red Rocks, sunset, latest departures, custom destinations | Questions for the operator, no dev |

## Update, 6 Nov

Mare's new task "Blue Lagoon vrijeme polaska" (6 Nov, In design) sets the
Blue Lagoon times to depart 09:30 / 14:30 and return 14:00 / 19:00. That is
newer than the sheet, so it replaces the sheet's 09:00–13:30 / 14:00–18:30.
The task names no check-in time, so the usual 15 minutes before applies
(09:15 / 14:15), and the duration stays 4.5 h. The other two new tasks, "Pick up point za private" and "Extras for
private", are built from Ivan's design board ("05 Private experience"),
because the tasks give no pick-up prices and no champagne price. Luka
approved using the design prices on 6 Nov. Mare should still confirm them,
since guests pay these amounts.

- Pick-ups, per booking: Riva included, Zenta +€30, Radisson +€40,
  Le Méridien +€60, San Antonio +€60, Trogir +€80, Stomorska +€100,
  Sutivan +€100, Milna +€120, Hvar +€150. "Other location" stays a request.
  Zenta reverses the 23 Oct "no Zenta" decision; the newer task wins.
- Extras, per booking: Champagne welcome +€40, SUP +€35, Seabob +€150. The
  design's photo package, picnic lunch and snorkelling gear are left out,
  as the task says.
- Pay-now (Blue Cave) adds them to the boat price. On a quote request, the
  listed pick-up now goes into the enquiry by name. Before this it was sent
  empty, which went unnoticed while the Riva was the only choice.
- Layout: the design shows pick-ups as a dropdown. The site keeps its radio
  cards (11 options, with descriptions), which work without JavaScript.

## Decisions taken while implementing

1. **The sheet wins on content.** The user's rule is that ClickUp tasks override
   older decisions, and Mare approved these pages.
2. **Guest limit.** The sheet says "maximum of 12 people". The booking limit is
   14 (done task "Max 12 guests per departure: dogovoreno 14 osoba"), and
   "Limit gostiju" is still open. The copy prints `MAX_GUESTS`, so it reads 14
   today and follows the setting if it moves back to 12.
3. **Private boat price.** The sheet and Ivan's pages show €1,200 / boat; the
   operator's private doc says Blue Cave €1,500 low / €2,000 peak. **Not
   changed**: money needs an explicit answer. The sheet itself calls €1,200 a
   "minimum" to confirm.
4. **Red Rocks and Dubrovnik are private only** (sheet: Group N). They keep a
   real private booking step (quote request, free time picker) with "Plan your
   private tour", as on Ivan's AFTER pages, instead of falling back to the
   contact form.
5. **Blue Lagoon stays two tours** (morning and afternoon slugs). The sheet's
   single "Morning / Afternoon" page would change slugs and bookings, so the
   titles are "Blue Lagoon Tour, Drvenik — Morning/Afternoon".
6. **Itinerary times.** Durations like "~1.5–2 h" go in a new `timeLabel`, so
   `time` stays a clock time.
7. **Tour FAQ cancellation answer** ("free up to 48 hours … full refund or a
   free new date") is the sheet's text. On the private-only tours it disagrees
   with Legal §3 (deposit terms) until Ivan's "FAQs update Issues" is settled.
   Mare's comment of 5 Nov says 48h free cancellation for private too.

## Not done, and why

- Video section: no file yet.
- €1,200 private price: needs Mare's or Vedro's confirmation (see 3).
- Contact page hours (Mon–Fri 08–20, Sat–Sun 08–18) and "May – October" season
  on Ivan's contact board: not from the operator. Our season is Mar–Oct (22 Oct
  feedback) and office hours are still unconfirmed (C-7), so they stay hidden.
- Footer tour list (one link per tour, on Ivan's board): layout, not part of
  any task; left as is.
- Destination pages still say "Golden Horn, Brač and Hvar tour" and "around two
  hours" at Zlatni Rat. They belong to Mare's "Destination Review" (in testing).
- Legal pages: deposit and refund wording waits on "FAQs update Issues".
