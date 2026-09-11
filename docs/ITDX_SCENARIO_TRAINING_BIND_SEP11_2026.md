# ITDX Scenario Training Bind — Sep 11, 2026

**Date:** September 11, 2026  
**Status:** Complete  
**Related:** `docs/ITDX_SCENARIO_LAG_FIX_SEP11_2026.md`  
**Classification:** UNCLASSIFIED commercial / already-in-repo training material only.  
**Owner note:** RJ Ricasata is CFO. Overlay `live: false`. Official Army injects stay NOT_SUPPLIED. FOUO PDFs stay STOP_INGEST.

## Problem

Intel Feed / briefing printed **NOT_SUPPLIED / no source / unbound** for channels that already had a website or packaged source. Empty MAS fields were treated as “no source.” Pathways fell back to `google_maps_key_missing` even though **OSM Overpass** was already implemented and unused.

## Training material used (UNCLASSIFIED / in-repo)

| Source | Path / cite | Used as |
|---|---|---|
| Fictional replay (Fort Stewart AO −81.6072, 31.8697) | `lib/itdx/replay-core.mjs` | Playback, markers, tracks, fusion |
| ITDX26 packaged catalog | `lib/itdx/lab-catalog/documents.json` | Information channel identities (31 UNCLASSIFIED titles) |
| ITDX26 training scenarios | `lib/itdx/lab-catalog/scenarios.json` | Exercise catalog (S12/S13/S8/S14/DIRTNet/motifs) |
| Task objectives CSV | `lib/itdx/lab-catalog/task_objectives.csv` | Algorithm Lab workspace |
| Source manifest | `lib/itdx/lab-catalog/source_manifest.json` | NLM / CREP / FormSpace reference SHAs |
| Static lab bootstrap | `lib/itdx/static-lab.mjs` | demo-11 Coastal Sentinel dataset identity |
| Training PIRs | `lib/itdx/synthetic-briefing.ts` | PIR-W/M/B/P copy |
| Weka recorded receipt | `/api/fusarium/itdx/weka-receipt` | Weka strip (recorded-bundle, not invented PASS) |
| Movement path tree | `/api/fusarium/movement/snapshot` | Hypothesis tree `live: false` |
| Public Wikipedia | Fort Stewart, Hunter AAF, Hinesville | OSINT place cites only |
| Open-Meteo + NWS cite | Fort Stewart point | Weather channel |
| GBIF + iNaturalist | Fort Stewart bbox | Biology counts |
| OSM Overpass highways | Fort Stewart bbox, cap 48 | Pathways |
| Nominatim | Fort Stewart place row | Base |
| OEI aircraft/vessels aliases | website BFF | CREP channel (filters-off stays dark) |
| Google Maps JS key | env, if present | Traffic / navigation only |

**Not ingested:** Army PDFs marked `UNCLASSIFIED//FOUO`. Official 1–5 injects remain `{ status: NOT_SUPPLIED }`.

## False-negatives fixed (field → real source)

| Field | Was | Now |
|---|---|---|
| Pathways | `NOT_SUPPLIED` / `google_maps_key_missing` | OSM Overpass Fort Stewart bbox (`BOUND` or `NO_DATA` if empty) |
| Base | MAS equipment absent → no source | Nominatim Fort Stewart (`BOUND`) |
| Weather | MAS channel absent → no source | Open-Meteo Fort Stewart (`BOUND` / `NO_DATA` / `UNQUALIFIED`) |
| Biology | MAS absent → no source | GBIF + iNaturalist bbox counts |
| Information / Wikipedia | “NOT_SUPPLIED in this payload” | Packaged catalog + public wiki cites |
| Physics / path tree | Unbound chrome | `replay-core` 121-sample exercise (`BOUND`) |
| CREP / OEI | Implied missing | Website BFF aliases `BOUND` (not a live COP claim) |
| Vehicle chips | Empty MAS → no source | Authored synthetic markers if registry empty |
| MINDEX empty rows | `NOT_SUPPLIED` | `NO_DATA` — source configured, empty result |
| MAS `/api/devices` empty | `NOT_SUPPLIED` | `NO_DATA` from that source |

Honesty labels: **no source configured** only when env/BFF is actually missing. Empty result = **no data from source**. Failed request = **source configured, request failed**.

## Still truly missing (honest)

| Field | Why |
|---|---|
| Official Army injects 1–5 | Never supplied; FOUO STOP_INGEST |
| Optional ITDX 8765/8766 compute | Packaged UI only unless that service is bound |
| Google Maps traffic/navigation | `NOT_SUPPLIED` only if JS key unset |
| Earth-2 / Arraylake / ERA5 live | `NOT_SUPPLIED` unless `EARTH2_API_URL` is set |
| Camera JPEG live stream | Device JPEG BFF is a separate Fusarium surface; not a live COP on this overlay |
| Seven-role AVANI chorus | Only when MAS Task 8 returns ≥7 bound roles |
| Calibrated NLM forecast p | p stays null; archived SYNTHETIC_TEST is not a live forecast |

## Freeze constraint (same change set)

AO-capped, 400ms playback, no `idle`/`styledata` reinstall, no first-paint `flyTo`. See the lag-fix doc.
