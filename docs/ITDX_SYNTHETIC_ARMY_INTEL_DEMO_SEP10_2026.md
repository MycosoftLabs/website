# ITDX Synthetic Army Intel Demo — September 10, 2026

**Date:** Thursday 10 September 2026  
**Status:** Implemented on ITDX worktree `website-itdx-codex-v13` (3010). No 187 blue-green. Dirty `WEBSITE/website` main not reset.  
**Classification:** UNCLASSIFIED commercial demo  
**Owner:** Morgan Rockcoons (CEO / CTO / COO / SAO)  
**CFO:** RJ Ricasata (never COO)

## What changed

The ITDX chip, Intel Feed **ITDX** tab, and `/fusarium/itdx` workspace now share `ITDXSyntheticArmyIntelBriefing` — a tablet-first operator briefing instead of a thin toast.

| Surface | Route | Behavior |
|---|---|---|
| Overlay chip | `/fusarium/earth-simulator` only | Default **collapsed**. Expand shows the briefing. `live=false`. Pause on collapse / `document.hidden`. |
| Intel Feed ITDX | Earth Sim left panel | Same briefing, more sections open. Deep Weka/situation/Task 8 stay behind Expand. |
| Workspace | `/fusarium/itdx` | Same briefing on lab / walkthrough / replay / tests. No global Fusarium dock. |

Banner (always): **SYNTHETIC EXERCISE** · UNCLASSIFIED commercial demo · **not a live COP** · `live=false` · official Army injects **NOT_SUPPLIED**.

## What the demo now shows

1. **AO / terrain** — Fort Stewart slice (−81.6072, 31.8697), public Wikipedia/USGS GNIS cite, OpenTopoMap + OSM + SRTM cite. Earth Sim env filters remain the live topo/aerosol host.
2. **Training / synthetic PIRs** — PIR-W weather, PIR-M movement/pathways, PIR-B biology/aerosol, PIR-P collection pathways. Labeled **not unit CCIR**.
3. **Time-aware playback** — play/pause, 1×/5×/10×/20×, timestamp, sample 0–120. Demo polylines + hypothesis-tree highlight (`live=false`). Layers toggle on the shared CREP overlay.
4. **NLM / Weka / MYCA / AVANI strip** — `model_loaded`, SHA if MAS returns it, `forecast_qualified=false`, `p=null`, `bound_to_ollama`, Weka verify/F1/abstain, MYCA proposal titles, AVANI governor disposition. NLM ≠ Ollama.
5. **Movement / C2** — live device count, path / coordination / triangulation / path tree / propose-only waypoints from `/api/fusarium/movement/snapshot`. Honest empty; no catalog convoy.
6. **Traffic / pathways** — MAS situation-assessment traffic / OSM pathways / navigation. Hunter AAF / Hinesville only if the payload cites them (OSINT, not targeting).
7. **Situation ticks** — persisted demo log + situation HTTP/clock.

In-field layout: 16px body, 44px targets, collapsible sections, bottom sheet on phones, 480–520px card from 768px, no horizontal overflow.

## Still NOT_SUPPLIED / UNQUALIFIED (honest)

| Item | State |
|---|---|
| Official Army / FOUO injects | NOT_SUPPLIED (no Downloads ingest) |
| Live COP / fake enemy tracks | Never drawn. Overlay `live: false` |
| NLM ecology `p` | Always `null`. Not stub 0.85. Forecast not qualified |
| NLM ≠ Ollama | `bound_to_ollama` reported; not a chat LLM |
| Weka trial / field readiness | Arithmetic may PASS; trial criteria NOT_MET |
| Telemetry path polylines | NOT_SUPPLIED until ≥2 live fixes |
| Coordination | Empty until ≥2 live devices |
| Triangulation live fix | `live: false` until ≥3 observers |
| Path tree | Always hypothesis; Weka/NLM movement NOT_SUPPLIED |
| Waypoint / mission receipt | Propose-only · NOT_SUPPLIED |
| Smoke renderer | NOT_SUPPLIED (quarantined) |
| MINDEX AQ / FIRMS features | Empty while upstream unavailable |
| Google traffic | NOT_SUPPLIED if key missing / denied |
| Optional 8765/8766 lab | NOT_SUPPLIED / UNAVAILABLE — not “not configured” |

## Files

- `components/itdx/ITDXSyntheticArmyIntelBriefing.tsx`
- `hooks/use-itdx-synthetic-briefing.ts`
- `lib/itdx/synthetic-briefing.ts`
- `lib/itdx/replay-store.ts` (speed + hidden-tab clock)
- Overlay / Intel Feed / workspace wiring
- `app/api/fusarium/nlm/status/route.ts` — pass-through `model_loaded`, SHA, `forecast_qualified`, `p: null`
- `app/api/fusarium/itdx/situation/route.ts` — `official_injects: NOT_SUPPLIED`

## Verify

1. `http://localhost:3010/fusarium/earth-simulator` — collapsed chip; expand; **SYNTHETIC EXERCISE** banner; Play; no “not configured” dump; no fake live COP.
2. Intel Feed → ITDX — same briefing; desktop 1280 and iPad 768/1024; 44px targets; no overflow.
3. `/fusarium` and `/fusarium/soc` — no ITDX overlay.
4. `/fusarium/itdx` — briefing present; lab unbound stays NOT_SUPPLIED.

Related: `docs/ITDX_V14_CONFIG_ERROR_FIX_SEP10_2026.md`, `docs/EARTH_SIM_PC_IPAD_DEMO_STABILITY_SEP10_2026.md`, `docs/FUSARIUM_E2E_BROWSER_TEST_SEP10_2026.md`, `docs/NLM_WEIGHTS_IMPLEMENTED_MAS188_SEP10_2026.md`.
