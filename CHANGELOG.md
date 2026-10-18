# Changelog

All notable changes, one section per phase. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Phase 4, part 1] Clock, weather, electricity — 2026-10-18

### Added
- **Clock (widget 1):** Danish 24h clock, weekday and dd.mm date, ISO week number on the home
  screen, rail and ambient screen.
- **Weather (widget 5):** live Open-Meteo forecast for Birkerød: now, high/low, rain summary,
  next 7 hours, and bike-commute chips for 07–09 and 15–17 (Fint / Ok / Dårligt).
- **Electricity (widget 6):** live DK2 spot prices from Energi Data Service (`DayAheadPrices`,
  fallback `Elspotprices`) as hourly bars, current price, and the cheapest charging window.
- `js/api.js`: polling, last good data kept in `localStorage`, "data fra hh:mm" stale marker.
- Icons: bike, snow, fog, storm. `MOCK=1` and `CHARGE_HOURS` env vars. 9 new tests (17 total).

### Changed
- Danish labels on the home screen, rail, ambient and night screens; 24h times everywhere.
- The page starts at the real time (the demo used to start at 15:18) and no longer shows the
  demo tip toast.
- Home screen: the chores tile is replaced by the electricity card.

### Removed
- Frontend weather mock data (weather now comes from `/api/weather`).

## [Phase 3] Backend — 2026-10-18

### Added
- `dashboard/server/`: zero-dependency Node server that serves the built frontend and
  `/api/<widget>` JSON for clock, kids, dropoff, calendar, weather, electricity, birthdays, photos.
- Secret URL token (`DASHBOARD_TOKEN`) checked server-side, remembered in an HttpOnly cookie;
  `/healthz` open for Railway.
- Last-known-good cache per widget with `stale` marking.
- Server-side mock data in the shapes planned for the real sources; Copenhagen-time helpers and
  ISO week numbers.
- `npm start`, `npm test` (8 tests), `.env.example`; the backend also runs inside `npm run dev`.

### Changed
- Requires Node.js 22+.

### Unchanged
- The UI still renders from `js/data.js`; widgets switch to the API one by one in phase 4.

## [Phase 2] Clean up — 2026-10-18

### Added
- `README.md` rewritten for the family dashboard: what it is, how to run it, project layout.
- `ROD.md` (record of decisions) and this `CHANGELOG.md`.
- `screenshots/phase2-poc.png`: the proof of concept at 1920×1200.

### Removed
- Wrangler (Cloudflare Workers) deploy script, dependency and `dashboard/wrangler.jsonc`.
- Photo-frame rooting material: `docs/`, `scripts/`, `dashboard/kiosk/`, `.github/` frame-report templates.
- Frame-specific entries in `.gitignore` (now ignores `node_modules/`, `dist/` and `.env` files).

### Unchanged
- The dashboard itself still runs on mock data with all its original views.

## [Phase 1] Explore — 2026-10-18

### Added
- `CLAUDE.md` with the family brief, requirements, widgets and phase plan.
