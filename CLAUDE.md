# CLAUDE.md — Family wall dashboard

This repo is being turned into our family wall dashboard. It runs on a 10–11" Android tablet
(landscape, ~1920×1200) in the kitchen, using Fully Kiosk Browser. The tablet only opens a URL;
all logic lives in this web app, hosted on Railway.

## About us

- Family in Birkerød (3460), Rudersdal Kommune, Denmark. Electricity price area **DK2**.
- Adults: **Stian** and **Ulrika**.
- Kids: **[daughter's name]**, age 5 (can't read much yet), and **[youngest's name]**, age 2.
  (Names to be filled in by Stian.)
- Daily logistics: drop-off/pick-up at **Pilegården**; Stian commutes ~8 km by cargo bike/car.
- House has solar PV, a home EV charger and a plug-in hybrid car.

## Project conventions (always follow)

- Create and maintain a `README.md`, a `ROD.md` (record of decisions) and a `CHANGELOG.md`.
- GitHub integration set up early; **commit after every approved phase** so versions can be compared.
- Work in phases. **Stop after each phase**, report what was done and how to test it, and wait
  for Stian's OK before starting the next one.

## Requirements

- Readable from ~3 metres: large text, high contrast.
- Danish UI language and locale: 24h clock, dd.mm dates, Danish weekday names, `Europe/Copenhagen`.
- Dimmed night mode **20:00–06:00** (kids' bedtime).
- If a data source fails, show last known data with a small "stale" marker — never an error screen.
- API keys server-side in env vars only. Access protected by a secret URL token checked server-side.

## Widgets (priority order)

1. Clock and date, plus week number.
2. "Today" for the kids: a picture/icon-based view the 5-year-old can follow without reading
   (e.g. børnehave/vuggestue, swimming, grandparents, weekend). Events tagged in our calendar with
   a keyword get an icon.
3. Who does Pilegården drop-off and pick-up today (Stian/Ulrika), from calendar events.
4. Family calendar: today and the next 3 days, colour-coded per person, from our shared Google
   Calendar(s) via their secret iCal addresses.
5. Weather for Birkerød (Open-Meteo, no key): now, today, and a clear "bike commute" hint for
   07–09 and 15–17 (rain, wind, temperature).
6. Electricity spot price for DK2 today/tomorrow from Energi Data Service (energidataservice.dk,
   free), highlighting the cheapest hours to charge the car.
7. Upcoming birthdays and family events this month.
8. Later/optional: our solar production (inverter API TBD) and Rudersdal waste collection days.
9. Photo slideshow in one corner.

## Phases

1. **Explore**: read the README and `dashboard/`, explain the structure and where the mock data is.
   Change nothing.
2. **Clean up**: remove the photo-frame rooting material (`docs/`, `scripts/`, `dashboard/kiosk/`).
   Keep the dashboard running locally with mock data. Set up README, ROD, CHANGELOG and GitHub.
3. **Backend**: a small server in the same project that serves the frontend, exposes one JSON
   endpoint per widget, and checks the URL token.
4. **Widgets**: replace mock data with real sources one at a time in the priority order above.
   Before coding each one, say what credentials or settings are needed and where to find them.
5. **Layout**: optimise for the tablet and the readability rules, including night mode; explain
   how to preview at 1920×1200 in a desktop browser.
6. **Deploy to Railway**: start command, env vars listed in README, walk-through.
7. **Tablet**: a short checklist for Fully Kiosk Browser (start URL with token, kiosk mode,
   auto-start, keep screen on, periodic reload, screen off at night).

## Phase status

- [x] Phase 1 — Explore
- [x] Phase 2 — Clean up. Decision: keep all existing views for now (see ROD.md).
- [ ] Phase 3 — Backend
