# Fusarium Scenario Simulation Interop — Sep 11, 2026

**Date:** September 11, 2026  
**Status:** Complete  
**Related:** `docs/ITDX_SCENARIO_TRAINING_BIND_SEP11_2026.md`, `docs/ITDX_SCENARIO_LAG_FIX_SEP11_2026.md`, `docs/EARTH_SIM_LIVE_DATA_LOCAL_TOGGLE_FIX_SEP11_2026.md`  
**Classification:** UNCLASSIFIED commercial / already-in-repo training material only.  
**Owner note:** RJ Ricasata is CFO. Overlay and bus stay `live: false`. Official Army injects stay NOT_SUPPLIED. FOUO PDFs stay STOP_INGEST. NLM is not bound to Ollama. Fusarium `p` stays null.

## What this is

One **scenario-simulation bus** so Overview and every `/fusarium/*` app/panel can run a **simulation test of all variables together**, even when live sensors are empty. It is **not** a second globe and **not** a live COP.

Banner: **SYNTHETIC EXERCISE**. Schema: `fusarium-scenario-sim/v1`. Clock: existing ITDX replay (400 ms floor). AO: Fort Stewart (−81.6072, 31.8697).

## How to run the test

1. Open `/fusarium` (owner login if 307).
2. Click **Run simulation test** on Overview, or **RUN SIM TEST** in Fusarium chrome.
3. Confirm the banner stays **SYNTHETIC EXERCISE · live=false**.
4. Open `/fusarium/itdx`, `/fusarium/earth-simulator`, `/fusarium/personnel`, `/fusarium/nlm-training` — they should show **LIT** on the same clock.
5. Earth Sim smoothness check: leave **Live Data off**. Do not treat this test as turning weather/species on.

## Bound vs truly unbound

| Surface | Bind | Source when the test runs |
|---|---|---|
| Overview | BOUND / LIT | Fort Stewart exercise cards; `confidence.score` stays null |
| ITDX Algorithm Lab / tabs | BOUND / LIT | Packaged lab + catalog |
| ITDX synthetic Army intel briefing | BOUND / LIT | `lib/itdx/synthetic-briefing.ts` |
| ITDX situation / Intel Feed | BOUND / LIT | Website-local Fort Stewart binds; empty live rows are NO_DATA |
| ITDX Earth Sim overlay | BOUND / LIT | Collapsed at idle; no flyTo on start |
| ITDX replay / movement | BOUND / LIT | 121-sample replay-core |
| Personnel 180 / survey / outcomes | BOUND / LIT | Catalog duty context; empty survey stays empty |
| NLM Training Dashboard | BOUND / LIT | Real MAS `/api/nlm/health`, `/api/nlm/runtime`, `/api/nlm/training/checkpoints` |
| OEI / CREP | BOUND | Filters-off stay dark; Live Data not forced on |
| SA / threat / fusion / C2 | BOUND / LIT | Exercise context via chrome + surface matrix |
| Official Army injects 1–5 | NOT_SUPPLIED | Never invented |
| Optional ITDX 8765/8766 | NOT_SUPPLIED | Packaged UI only |
| Calibrated Fusarium `p` | unbound | Always `null`. Never 0.85 |
| Ollama | unbound | `bound_to_ollama: false` |

## NLM weights (real, not stubbed)

Weight list comes only from MAS:

- `GET http://192.168.0.188:8001/api/nlm/weights` (canonical inventory; `count` + `weights[]`)
- SHA / tensor counts from `/api/nlm/health` and `/api/nlm/runtime`

Do **not** invent rows. Do **not** treat `/api/nlm/model/info` Llama-3.2-3B as the loaded weight list. Empty inventory stays empty.

Observed production checkpoint (when MAS answers):

- path: `/mnt/mycosoft-nas/models/nlm/reference/weights.pt`
- source: disk
- `forecast_qualified: false`
- `p: null`

## Files

- `lib/fusarium/scenario-sim/*` — contracts, packet, surfaces, NLM mapper, store, overview bind
- `app/api/fusarium/scenario-sim/route.ts` — idle frame + real NLM poll
- `app/api/fusarium/nlm/status/route.ts` — sequential MAS probes including checkpoints
- `components/fusarium/scenario-sim/*` — Overview panel, chrome chip, lite banners
- Consumers: Overview, ITDX app, Earth Sim overlay, personnel panels, NLM dashboard

## Locks

- `live: false` everywhere on this bus
- No mock sold as real
- No device marketing media / hero changes
- Instant Deploy: one owner, NAS mount, never stop primary first
