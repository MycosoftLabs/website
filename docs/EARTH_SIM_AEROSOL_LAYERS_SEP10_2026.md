# Earth Sim Aerosol Layers — September 10, 2026

**Date:** September 10, 2026  
**Status:** Implemented on ITDX worktree `website-itdx-codex-v13`  
**Route:** `/fusarium/earth-simulator` → Nature → Environment / Conditions  
**Source of truth:** `/fusarium/aerosol` workbench contracts (no duplicate mock arrays)

## Filters copied onto Earth Sim

| Filter | Layer id | Renderer | Truth |
|---|---|---|---|
| Particulates (PM) | `aerosolParticulate` | `AerosolParticulateLayer` | Live MINDEX AQ features that explicitly name PM |
| Modeled spore dispersal | `aerosolModeledDispersal` | `SporeDispersalLayer` | Earth-2 modeled; empty / NOT_SUPPLIED when the BFF has no zones |
| Wind | `aerosolWind` | `WindVectorLayer` | Earth-2 u10/v10 |
| Air quality | `mindexAirQuality` / `liveAqi` | existing | Already on Earth Sim |
| FIRMS fire | `mindexFirms` | existing | Already on Earth Sim |
| Smoke | `aerosolSmoke` | none | **NOT_SUPPLIED** — CREP `SmokeLayer` stays quarantined |

Working aerosol APIs reused: `/api/crep/environment/air-quality`, `/api/earth2/spore-dispersal`, `/api/earth2/layers/wind`, `/api/crep/environment/wildfires`.
