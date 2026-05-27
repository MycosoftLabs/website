# MYCA / MAS / MINDEX Live Connection Audit

Date: May 27, 2026

## Objective

Audit the live-critical connections between the website, MYCA, MAS, MINDEX, Supabase, CREP, Eagle Eye, and Earth Simulator data routes. The audit must verify reachability, latency, public-response cleanliness, env contracts, and route/API coherence without exposing secrets, raw service URLs, DSNs, or internal response bodies.

## What Changed

- Added `scripts/audit-live-system-connections.mjs`, a repeatable redacted audit runner.
- Updated website MAS routing to use the canonical server-side MAS resolver in:
  - `app/api/mas/voice/orchestrator/route.ts`
  - `app/api/myca/connectivity/route.ts`
  - `app/api/mas/health/route.ts`
  - `app/api/mas-proxy/[[...path]]/route.ts`
  - `app/api/mas/world/[[...path]]/route.ts`
  - `lib/myca/scoped-mas-user.ts`
- Cleaned public diagnostics:
  - `/api/myca/connectivity` no longer returns a concrete MAS URL.
  - `/api/mas/health` no longer proxies raw upstream health metadata.
  - `/api/natureos/mindex/health` no longer returns the concrete MINDEX target on error.
- Removed hardcoded MINDEX DB/token fallbacks from active MINDEX ETL loaders:
  - `etl_inaturalist.py`
  - `etl_celltowers.py`
  - `etl_earth_loader.py`
  - `etl_osm_power.py`

## Latest Audit Run

Report files:

- JSON: `docs/reports/live-system-connections-audit-2026-05-27T06-30-39-227Z.json`
- Markdown: `docs/reports/LIVE_SYSTEM_CONNECTIONS_AUDIT_2026-05-27T06-30-39-227Z.md`

Result:

- 16 / 16 probes reachable.
- MYCA chat smoke returned 200 in 135 ms.
- MYCA smoke response exposed no provider/debug fields and no internal disclosure patterns.
- A hostile hardware/config prompt returned no internal disclosure flags in targeted validation.
- Supabase REST root was reachable; 401 at root is treated as expected unauthenticated behavior for this probe.
- San Diego fungal query returned 200 observations but took 26.4 s.

## Remaining Blockers

- `GET /api/crep/fungal` for a San Diego viewport is not fast enough for Earth Simulator/MYCA control; it returned data, but 26.4 s is far beyond the interactive target.
- `GET /api/myca/live-activity` took 6.8 s and `GET /api/myca/connectivity` took 4.5 s in the latest run.
- Source/documentation scans still show secret-like literals across website, MAS, and MINDEX repos. The report records paths and pattern labels only; these must be reviewed and real credentials rotated/removed before live deployment.
- Many files still reference loopback service defaults. Some are dev-only, but every live-critical route should use canonical resolvers or clearly bounded local-only code.
- Full repo typecheck is still not clean because of pre-existing unrelated TypeScript errors from prior work.

## Deployment Gate

Website blue-green release gate is open for the May 27 Earth Simulator/MYCA reliability deployment after the follow-up fixes and validation:

- `npm run build` completed successfully after isolating the production build from the local dev server.
- Earth Simulator local regression QA passed with no page errors, San Diego zoom at 11.5, 75 visible fungal observations, 441 stored fungal observations, and 62 camera sources in the tested viewport.
- The latest deploy should still treat MAS/MINDEX repo-level secret-like and loopback scan findings as follow-up hardening work outside this website cutover unless those repos are deployed in the same release train.
