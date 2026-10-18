# Changelog

All notable changes, one section per phase. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
