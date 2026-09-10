# ITDX v1.4 config-error and Earth Sim popup fix — 10 Sep 2026

Date: Thursday 10 Sep 2026  
Status: Complete  
Worktree: `WEBSITE/website-itdx-codex-v13`

## Bug

After the ITDX v1.4 packet, Fusarium printed a false **“ITDX backend is not configured”** / “not configured properly” state. The same ITDX dock also floated on **every** Fusarium dashboard route (SOC, devices, login-adjacent chrome, overview), not only Earth Simulator.

## Exact error

| String | File:line (before fix) |
|---|---|
| `ITDX backend is not configured` | `app/api/fusarium/itdx/bridge/[...path]/route.ts` (JSON dumped into the lab iframe) |
| `ITDX backend is not configured` | `app/api/fusarium/itdx/evidence/route.ts` |
| `ITDX service is not connected` | `components/itdx/ITDXApplication.tsx` treating optional 8765 as a hard fail |

## Root cause

1. **Global popup:** `FusariumLayoutClient` mounted `ITDXEvidenceConsumer` + `ITDXReplayDock` on all `/fusarium/*` dashboard pages. Evidence consumer IDs covered 40+ catalog apps, so a selected run produced a platform-wide strip. Replay dock CSS is `position: fixed`.
2. **False config:** Optional lab `127.0.0.1:8765` / `8766` being unset or rejecting a call was returned as a red “not configured” JSON body. The dedicated `/fusarium/itdx` iframe printed that JSON. Honest state is **NOT_SUPPLIED / UNQUALIFIED**. Owner MAS (`192.168.0.188:8001`) and MINDEX (`192.168.0.189:8000`) were already the cite path.

## Fix

- Removed both ITDX overlays from the Fusarium shell.
- Mounted a **collapsible** `ITDXEarthSimOverlay` only on `/fusarium/earth-simulator` (default collapsed; `sessionStorage` `itdx-earth-sim-overlay-open`).
- Intel Feed **ITDX** tab stays Fusarium Earth Sim only (`pathname` includes `/fusarium/earth-simulator`). Cite panels default compact (`itdx-earth-left-expanded`).
- `/fusarium/itdx` keeps in-page workspace chrome. No second global float.
- Bridge / evidence / application now emit **NOT_SUPPLIED** or **UNAVAILABLE** with cite, never “not configured properly.”
- **10 Sep 2026 restore:** packaged Algorithm Lab HTML always frames on `/fusarium/itdx`. Optional 8765/8766 compute stays NOT_SUPPLIED when unbound; that is no longer a reason to hide the iframe. See `ITDX_APP_RESTORED_IN_FUSARIUM_TABS_SEP10_2026.md`.

## Collapse behavior

- Overlay default: collapsed chip (“Expand ITDX”), ≥44×44 touch target, bottom sheet on small screens, desktop card at lower-right.
- Intel Feed ITDX: layers + replay stay visible; Weka / situation / insights stay collapsed until Expand.
- State persists in `sessionStorage` so React re-renders do not snap the panel open.

## Routes confirmed clean (no global dock)

- `/fusarium` overview, `/fusarium/itdx` (workspace only), `/fusarium/login` (outside this layout).
- Earth Sim only: overlay + Intel Feed ITDX tab.

## Verify

1. `http://localhost:3010/fusarium/earth-simulator` — collapsed ITDX chip; expand/collapse persists.
2. Other Fusarium apps — no fixed ITDX dock / evidence strip.
3. `/fusarium/itdx` — Algorithm Lab iframe mounts even if 8765 is unbound; optional-compute chip may read NOT_SUPPLIED; Weka/situation still cite MAS/MINDEX.

## NLM BFF (same day)

`app/api/fusarium/nlm/status/route.ts` now reads MAS `192.168.0.188:8001` `/api/nlm/health` + `/api/nlm/runtime`. It no longer probes standalone `:8200`. Archived checkpoint stays `forecast_qualified=false`.
