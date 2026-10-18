# Record of decisions

Newest first. Each entry: date, decision, why, and alternatives considered.

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
