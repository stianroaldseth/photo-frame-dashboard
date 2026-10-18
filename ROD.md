# Record of decisions

Newest first. Each entry: date, decision, why, and alternatives considered.

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
