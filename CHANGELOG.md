# Changelog

All notable changes, one section per phase. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
