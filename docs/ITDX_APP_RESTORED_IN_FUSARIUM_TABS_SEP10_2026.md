# ITDX Application Restored in Fusarium Tabs — September 10, 2026

**Date:** September 10, 2026  
**Status:** Complete  
**Worktree:** `WEBSITE/website-itdx-codex-v13`  
**Route:** `/fusarium/itdx`  
**RJ Ricasata = CFO.** Briefing is SYNTHETIC EXERCISE `live: false`. No invented p. No mock COP.

## Root cause

Stacked honesty-pass from **`98979511`** (Earth Sim-only overlay / PR-era v1.4 config fix):

| File | Condition that hid the app |
|---|---|
| `components/itdx/ITDXApplication.tsx` | Iframe rendered only when `backend.status === 'CONNECTED'`. Unbound 8765 set `NOT_SUPPLIED` and left tabs as a wall + briefing/Weka. |
| `app/api/fusarium/itdx/bridge/[...path]/route.ts` | Unset or failed `ITDX_BACKEND_URL` / token returned stub HTML titled `ITDX lab NOT_SUPPLIED` and bootstrap JSON without `version` / documents. |
| `.dockerignore` | Excludes the entire `itdx/` tree, so live Docker never had `itdx/app/web` even if the bridge later read disk. |

Platform ITDX dock removal from all Fusarium routes was intentional and stays. `/fusarium/soc` still redirects to situational-awareness — not the product. Product is `/fusarium/itdx` → `<ITDXApplication/>`.

## What was restored

- Packaged Algorithm Lab under `lib/itdx/lab-web/` + catalog under `lib/itdx/lab-catalog/` (Docker-safe; not the excluded `itdx/` tree).
- Bridge always serves packaged HTML/JS. Optional 8765/8766 still proxies `/api/*` when bound; otherwise static catalog APIs (`version: 1.4.0`, `lab_ui: SUPPLIED`, `optional_compute: NOT_SUPPLIED`). POST compute stays honest NOT_SUPPLIED.
- `ITDXApplication` always mounts the iframe for lab / walkthrough / documents / Borda / Form Space / tests / exports / services. Replay stays `ITDXWorkspace`. Briefing is a collapsed workspace chip (`defaultOpenSections('workspace') === []`).
- v1.4 chrome stays visible if Earth-2 249 is down or AirNow is missing. Google Maps BFF remains SUPPLIED.
- Standalone trace includes `lib/itdx/lab-web/**` and `lib/itdx/lab-catalog/**`.

## Verify

1. `http://localhost:3010/fusarium/itdx` — owner session required (307 to login without cookie).
2. Every tab mounts real UI. Iframe title ITDX Algorithm lab / workspace / workbench / formspace. Bridge `/index.html` contains `ITDX26 Algorithm Lab`, not `ITDX lab NOT_SUPPLIED`.
3. Live: same route after blue-green on `ba8c5a83` + this restore. NAS mount required. Candidate HTTP 200 before cutover.

## Do not revert

Earth Sim Live Data / ERA5 / aerosol work on this worktree (`5eebc6ea`) is out of scope and must not be reset.
