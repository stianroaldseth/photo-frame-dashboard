# Record of decisions

Newest first. Each entry: date, decision, why, and alternatives considered.

## 2026-10-18 — Calendar: one iCal fetch, four widgets, conventions in titles

**Decision:** `CALENDAR_URLS` (secret iCal addresses) is fetched once per 5 minutes and parsed
with `ical.js`; kids, drop-off, calendar and birthdays are computed from the same events.
People are found from names or `#name` in the title, else the calendar's prefix, else everyone.
Pictures, drop-off words and birthday rules live in `server/tags.js`. If one calendar fails,
the whole refresh fails so the wall keeps the last complete set (marked stale) instead of
silently losing someone's events. Without `CALENDAR_URLS` a sample `.ics` runs through the same
parser.
**Why:** iCal needs no Google API project or OAuth; writing "Aflevering Stian" or "#svømning" is
easy from any phone. **Alternative:** Google Calendar API (OAuth, more setup, no gain here).

## 2026-10-18 — `ical.js` is the first runtime dependency

**Decision:** use `ical.js` (Mozilla, zero dependencies) for parsing.
**Why:** recurring events, moved/cancelled instances, EXDATE and timezones are easy to get
wrong by hand; Google calendars are full of them.

## 2026-10-18 — Kids' day defaults to børnehave/vuggestue on weekdays

**Decision:** on weekdays the 5-year-old gets 🏫 Børnehave and the 2-year-old 🧸 Vuggestue
automatically, timed by the drop-off/pick-up events, unless the day is tagged `#fri`, `#ferie`,
`#syg` or `#lukket`. Weekends show 🏠 Weekend. Pictures are emoji.
**Why:** nobody has to enter the normal day; emoji are large, colourful and need no image files.
**Alternative:** custom drawn icons (nicer, more work; can replace the emoji later).

## 2026-10-18 — Home screen: Pilegården card and kids' strip replace demo tiles

**Decision:** the top-right "who's home" block (fake presence data) is now the Pilegården
drop-off/pick-up card; the shopping and smart-home tiles are now *Børnenes dag*. Birthdays have
an endpoint but no place on screen yet; that comes with the phase 5 layout.
**Why:** these are widgets 2 and 3 on the list; the demo tiles had no real data behind them.

## 2026-10-18 — Electricity: raw DK2 spot price, 15-minute data averaged to hours

**Decision:** use Energi Data Service `DayAheadPrices` (15-minute slots since 1 Oct 2025) for
DK2, averaged to hourly bars; fall back to the old hourly `Elspotprices` dataset. Show DKK/kWh
without VAT, taxes or grid tariffs, labelled as spot price. Cheapest charging window = cheapest
run of `CHARGE_HOURS` (default 3) consecutive hours from now on.
**Why:** free, no key; hourly bars stay readable from 3 m; spot alone is enough to pick *when* to
charge. **Later option:** add Radius grid tariffs + taxes + VAT for the real price per kWh.

## 2026-10-18 — Bike-commute verdicts computed on the server

**Decision:** for 07–09 and 15–17 the server rates Fint / Ok / Dårligt from rain amount and
chance, wind, gusts, temperature and snow (thresholds in `server/sources/weather.js`). Once a
window has passed, it shows tomorrow's.
**Why:** one place to tune the rules; the wall shows one short word per window.

## 2026-10-18 — Danish locale in the frontend; clock follows the tablet's timezone

**Decision:** 24h times, dd.mm dates, Danish day and month names, ISO week numbers, Danish UI
labels on the home screen, rail and night/ambient screens. The on-screen clock uses the
device's timezone (the tablet is set to Copenhagen); the server always computes in
Europe/Copenhagen. Views still to be reworked (calendar, chores, shopping, etc.) keep some
English labels until phase 5.
**Why:** simplest correct option for a tablet in Denmark. A desktop preview from another
timezone shows that timezone's clock.

## 2026-10-18 — Electricity card replaces the chores tile on the home screen

**Decision:** the home screen's chores-progress tile is now the electricity card. The Chores
view itself is still in the rail.
**Why:** electricity is on the widget list, chores are not; the tile had the right size.

## 2026-10-18 — Last-known data also cached in the browser

**Decision:** `js/api.js` keeps each widget's last good response in `localStorage` and shows it
with a small "data fra hh:mm" marker when the server or network fails.
**Why:** covers Wi-Fi drops and server restarts (the server cache is in memory only).

## 2026-10-18 — Backend: plain Node, no framework, shared with the dev server

**Decision:** `dashboard/server/` uses only Node built-ins (`node:http`, `node:test`). The same
handler runs in production (`npm start`) and as Vite middleware in `npm run dev`.
**Why:** nothing to install or update on Railway; dev and production behave identically,
including the token check; one command to develop.
**Alternatives:** Express/Fastify (more dependencies for ~100 lines of routing); a separate API
process behind Vite's proxy (two processes in dev).

## 2026-10-18 — Token in URL, then an HttpOnly cookie

**Decision:** the token is accepted as `?token=` on any request; a valid one sets a one-year
HttpOnly, SameSite=Strict cookie (Secure on HTTPS). Every response sends
`Referrer-Policy: no-referrer`. Only `/healthz` is open. Production refuses to start without
`DASHBOARD_TOKEN`; only `npm run dev` falls back to `dev`.
**Why:** Fully Kiosk only knows a start URL. The cookie covers the JS/CSS/API requests the page
makes; no-referrer keeps the token from leaking to Google Fonts or photo hosts.
**Alternative:** HTTP basic auth (Fully Kiosk can do it, but it's clumsier and shows a prompt in browsers).

## 2026-10-18 — One endpoint per widget, last-known-good cache on the server

**Decision:** `/api/<widget>` returns `{ widget, data, source, updatedAt, stale, error? }`. Each
widget has its own refresh interval; a failed refresh returns the previous data with `stale: true`.
**Why:** the "never an error screen" rule; sources fail independently; the tablet never calls
third parties directly, so keys stay server-side. The cache is in memory, so it starts empty
after a redeploy. A client-side copy for when the tablet loses Wi-Fi comes with the widgets.

## 2026-10-18 — Kids' names from env vars

**Decision:** `KID1_NAME` and `KID2_NAME` env vars, defaulting to "Barn 1"/"Barn 2".
**Why:** the repo is a fork of a public repo, so it is likely public; keep children's names out of it.

## 2026-10-18 — Keep all existing views for the proof of concept

**Decision:** keep the Chores, Shopping, Home-control and Agents views (and their mock data) for now.
**Why:** Stian wants a working proof of concept to build on first; unused views are removed later.
**Alternative:** strip down to the widgets in CLAUDE.md immediately.

## 2026-10-18 — Build on the existing `dashboard/` web app

**Decision:** reuse the forked dashboard (plain JavaScript modules, Vite, no framework) as the frontend.
**Why:** it already has a 16:10 glanceable layout, calendar lanes, weather, slideshow, and
ambient/night modes, and it scales a 1280×800 stage to the screen, which maps to the tablet's
1920×1200 at exactly 1.5×.
**Alternative:** start a new app (e.g. React). More setup, no clear gain for a single wall screen.

## 2026-10-18 — Drop Cloudflare Workers / wrangler

**Decision:** remove the wrangler deploy script and dependency.
**Why:** hosting will be on Railway with our own server (phase 3 and 6).

## 2026-10-18 — Remove photo-frame rooting material

**Decision:** remove `docs/`, `scripts/`, `dashboard/kiosk/` and the frame-report GitHub templates.
**Why:** we run a normal Android tablet with Fully Kiosk Browser; nothing needs rooting or a
custom kiosk app. Everything stays available in git history and in the upstream repo.
