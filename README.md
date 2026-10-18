# Family wall dashboard

Our kitchen wall dashboard for the family in Birkerød. It runs full screen on a 10–11" Android
tablet (landscape, ~1920×1200) in Fully Kiosk Browser. The tablet only opens a URL; all logic
lives in this web app, which will be hosted on Railway.

Started as a fork of [wesbos/photo-frame-dashboard](https://github.com/wesbos/photo-frame-dashboard).
Project brief, requirements and phase plan: [CLAUDE.md](CLAUDE.md). Decisions: [ROD.md](ROD.md).
History: [CHANGELOG.md](CHANGELOG.md).

![Current state](screenshots/phase2-poc.png)

## Status

Proof of concept: the original dashboard UI running on **mock data** (`dashboard/js/data.js`).
Real data sources, Danish locale, the backend and the Railway deploy come in later phases.

## Run locally

Requires Node.js 20+.

```sh
cd dashboard
npm install
npm run dev        # http://localhost:5173
```

`npm run build` writes a static bundle to `dashboard/dist/`; `npm run preview` serves it.

Demo controls: press and hold the clock in the left rail, or press **D**. Keys **A** (ambient),
**N** (night) and **1–7** (views) also work.

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
  vite.config.js      build config
screenshots/          a screenshot per phase, for comparing versions
```

## Environment variables

None yet. The backend (phase 3) and data sources (phase 4) will be listed here.
