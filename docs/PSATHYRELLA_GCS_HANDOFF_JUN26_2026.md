# Psathyrella GCS — Front-end Handoff → Cursor
**Date: 2026-06-26 · Front-end: Claude Code → Back-end: Cursor**

Front-end GCS is **complete and contract-aligned**. This hands the baton back to Cursor for the remaining backend/deploy items. Pairs with the interface contract: [`PSATHYRELLA_FRONTEND_BACKEND_CONTRACT_JUN25_2026.md`](./PSATHYRELLA_FRONTEND_BACKEND_CONTRACT_JUN25_2026.md).

## Front-end state — DONE
- **GCS** at `/natureos/psathyrella` (full-bleed console). All 16+ UI files type-clean (`tsc` 0 errors in `lib/psathyrella`, `components/psathyrella`, `app/natureos/psathyrella`).
- **Telemetry wired to the contract endpoint:** `useBuoyTelemetry` polls `GET /api/psathyrella/telemetry` (2.5 s) and `overlayEnvelope`s the fused `BuoyTelemetry` onto a resilient BME (`/api/mycobrain/COM4/sensors`) + position (`/api/earth-simulator/devices`) base, with **full field guards** — a partial/empty/errored envelope degrades to STANDBY, never crashes.
- **Commands** → `POST /api/devices/psathyrella-buoy-com4/command` (legacy diagnostics + MDP `nav.*`/`cam.*`).
- **iPad bottom-sheet panels** (Nav `<lg`, Comms `<xl` triggers) for tabletop/portrait.
- **`?view=` deep-link** added — `…/psathyrella?view=camera|lidar|radar|bluesight|map` sets the initial center view (default `map`).
- **SIM mode** = explicit watermarked walkthrough only (toggle / `NEXT_PUBLIC_PSATHYRELLA_SIM=1`).

**The hook needs NO changes when the telemetry source moves (3010 ↔ 188 ↔ Jetson).** It only ever talks to `/api/psathyrella/telemetry`; whatever serves that envelope — MAS proxying MycoBrain on the dev PC today, or the Jetson at the buoy tomorrow — the panels light up unchanged.

## Open items — CURSOR's lane
1. **Merge the website proxy to main.** `app/api/psathyrella/telemetry/route.ts` is on `feat/earth-sim-arraylake-fields-jun24` (verified 200 w/ live JSON), NOT in `main`/this checkout — so the endpoint 404s on a plain `main` 3010. Merge + blue-green for prod, or confirm the dev server runs that branch.
2. **`MYCOBRAIN_SERVICE_URL` on MAS 188** → dev-PC LAN IP `:8003` (today) or the **Jetson LAN IP `:8003`** after the board moves, so 188 can reach the buoy's BME without the dev PC in the loop.
3. **TS2440 in your lane:** `app/api/mycobrain/[port]/control/route.ts:5` — `Import declaration conflicts with local declaration of 'isLocalPsathyrellaSerialTarget'` (duplicate import vs. local def). Breaks that route's typecheck/build.

## Jetson move (IO Base A Rev 2) — front-end impact = NONE
When the MycoBrain board moves to the Jetson (mirror of the Mushroom One stack): serial becomes `/dev/tty*` not COM3, service stays `:8003`, registry id stays `psathyrella-buoy-com4` / `mycobrain-COM4`. Point `MYCOBRAIN_SERVICE_URL` at the Jetson and the GCS sees live BME + telemetry with the dev PC out of the loop — **no GCS/UI change required.**

## Suggested next FE work (when you want it)
- Mission path polyline + waypoint reorder/drag on the MAP view.
- Once the proxy is on `main`, a live-data pass to confirm every panel populates from the real envelope (currently verified against SIM + the live 188 JSON shape).
