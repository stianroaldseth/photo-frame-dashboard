# Family wall dashboard

Our kitchen wall dashboard for the family in Birkerød. It runs full screen on a 10–11" Android
tablet (landscape, ~1920×1200) in Fully Kiosk Browser. The tablet only opens a URL; all logic
lives in this web app, which will be hosted on Railway.

Started as a fork of [wesbos/photo-frame-dashboard](https://github.com/wesbos/photo-frame-dashboard).
Project brief, requirements and phase plan: [CLAUDE.md](CLAUDE.md). Decisions: [ROD.md](ROD.md).
History: [CHANGELOG.md](CHANGELOG.md).

![Current state](screenshots/phase2-poc.png)

## Status

Proof of concept. The UI still renders the original **mock data** in `dashboard/js/data.js`.
A small backend now serves the page and one JSON endpoint per widget (also mock data for now),
behind a secret URL token. Real data sources, Danish locale and the Railway deploy come next.

## Run locally

Requires Node.js 22+.

```sh
cd dashboard
npm install
npm run dev        # → http://localhost:5173/?token=dev
npm test           # server tests
```

`npm run dev` runs Vite with the backend built in. Without a `.env` the token is `dev`.

Demo controls: press and hold the clock in the left rail, or press **D**. Keys **A** (ambient),
**N** (night) and **1–7** (views) also work.

To run exactly what production runs:

```sh
cp .env.example .env      # then set DASHBOARD_TOKEN (openssl rand -hex 24)
npm run build
npm start                 # → http://localhost:3000/?token=<your token>
```

## Access token

Every request except `/healthz` needs the secret token. The tablet opens
`https://<host>/?token=<DASHBOARD_TOKEN>`; the server checks it and stores it in an HttpOnly
cookie, so scripts, styles and API calls work without repeating it. Wrong or missing token →
`401 Ingen adgang`. Keep the token out of the repo and screenshots; to revoke it, change
`DASHBOARD_TOKEN` and update the tablet's start URL.

## API

All endpoints are `GET`, need the token, and return the same envelope:

```json
{ "widget": "weather", "data": { … }, "source": "mock", "updatedAt": "2026-10-18T06:53:16Z", "stale": false }
```

If a source fails, the last good `data` is returned with `"stale": true` and an `error` message.
If there has never been good data, `data` is `null` and the status is 503.

| Endpoint | Widget | Refresh |
| --- | --- | --- |
| `/api` | list of widgets | – |
| `/api/clock` | date, Danish weekday, ISO week number, server time | every request |
| `/api/kids` | icon plan for the kids today | 5 min |
| `/api/dropoff` | who does Pilegården drop-off / pick-up | 5 min |
| `/api/calendar` | people + today and the next 3 days | 5 min |
| `/api/weather` | Birkerød now, today, hourly, bike-commute verdicts | 15 min |
| `/api/electricity` | DK2 hourly prices today/tomorrow, cheapest charging window | 30 min |
| `/api/birthdays` | birthdays and family events this month | 60 min |
| `/api/photos` | slideshow photos | 60 min |
| `/healthz` | health check for Railway (no token) | – |

## Project layout

```
dashboard/
  index.html          single page: left rail, views, overlay layers
  js/main.js          loads the modules below in order
  js/data.js          ALL mock data (people, events, weather, photos, ...)
  js/app.js           router, time/format helpers, idle → ambient → night modes, scaling
  js/views/*.js       one file per view (home, calendar, photos, ambient, ...)
  css/tokens.css      colours, font sizes, spacing
  css/views/*.css     one stylesheet per view
  vite.config.js      build config; also mounts the backend into `npm run dev`
  server/index.js     production entry (`npm start`)
  server/app.js       request handler: health → token → /api → static files
  server/auth.js      token check + cookie
  server/cache.js     last-known-good cache, "stale" marking
  server/widgets.js   widget registry (name, refresh interval, data source)
  server/mock.js      mock data per widget, in the shapes the real sources will use
  server/family.js    people and colours
  server/time.js      Europe/Copenhagen date helpers, ISO week number
  test/               `npm test` (node:test, no extra dependencies)
screenshots/          a screenshot per phase, for comparing versions
```

## Environment variables

Template: [`dashboard/.env.example`](dashboard/.env.example). Never commit `.env`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DASHBOARD_TOKEN` | yes (production) | secret in the tablet's URL. `openssl rand -hex 24` |
| `KID1_NAME`, `KID2_NAME` | no | kids' names, kept out of the public repo |
| `PORT` | no | set by Railway; defaults to 3000 |

Data-source settings (calendar iCal URLs etc.) are added here in phase 4.
