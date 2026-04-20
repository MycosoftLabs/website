# CREP Canonical Datasets

> Apr 19, 2026 — Morgan: "put all of that data and datacenter data in mindex and put on crep perfectly" (referring to the IM3 Data Center Atlas + EIA-860M generator data).

This document tracks the canonical, publicly-licensed datasets that power CREP's infrastructure + data-center layers. Each entry lists source, file location, size, refresh cadence, and the MapLibre source IDs / layer IDs that consume it.

## Active datasets

### IM3 Open Source Data Center Atlas — `v2026.02.09`

- **Source**: Pacific Northwest National Laboratory (PNNL)
- **Homepage**: https://im3.pnnl.gov/datacenter-atlas
- **Download**: `im3_open_source_data_center_atlas_v2026.02.09.csv` + `im3_open_source_data_center_atlas_v2026.02.09.gpkg`
- **License**: CC-BY — cite as PNNL IM3 Data Center Atlas
- **In CREP**: `public/data/crep/im3-datacenters-existing.geojson` (1,479 features, 464 KB)
- **Layer**: `im3DataCenters` (category: telecom, default ON)
- **MapLibre source**: `crep-im3-datacenters`
- **MapLibre layers**: `crep-im3-dc-glow`, `crep-im3-dc-core`, `crep-im3-dc-label`
- **Schema**: `id, state, state_abb, state_id, county, county_id, operator, ref, name, sqft, lon, lat, type`
- **Refresh**: ~monthly per PNNL release cadence. Manual re-import from the CSV → GeoJSON.
- **What OpenGridView uses**: this exact dataset (see the "Data Centers" legend on opengridview).

Projected hyperscale data centers for 2035 are part of the gpkg (not yet imported). That layer will be the equivalent of OpenGridView's amber "Projected Hyperscale Data Centers (2035)".

### EIA-860M — Monthly Generator Inventory (February 2026)

- **Source**: U.S. Energy Information Administration
- **Homepage**: https://www.eia.gov/electricity/data/eia860m/
- **Download**: `february_generator2026.xlsx`
- **License**: Public domain (U.S. federal government work)
- **In CREP**: `public/data/crep/eia860m-{operating,planned,retired,canceled}.geojson`
- **Layers**: `eiaOperating`, `eiaPlanned`, `eiaRetired`, `eiaCanceled` (all default OFF except by user toggle)
- **Counts**:
  | Status | Count | File size |
  | --- | ---: | ---: |
  | Operating | 27,716 | 10.3 MB |
  | Planned (projected future) | 1,946 | 814 KB |
  | Retired | 7,201 | 2.5 MB |
  | Canceled / postponed | 1,605 | 541 KB |
  | **Total** | **38,468** | ~14 MB |
- **Schema per feature**: `plant_name, entity_name, technology, capacity_mw, state, county, plant_id, generator_id, status_code, year`
- **Refresh**: monthly (EIA publishes a new workbook ~mid-month for the prior month). Manual re-import: download the latest `month_generator{year}.xlsx`, re-run the ETL in `scripts/etl/crep/build-eia-im3-geojson.py` (or inline Python one-liner in the commit that introduced this file).
- **Rendering**: glow + core circle, size scales with `capacity_mw`. Label shown at zoom ≥ 9 ("Plant Name · capacity MW").

Morgan's "projected future" ask is fulfilled by the `eiaPlanned` layer — 1,946 generators with `Planned Operation Year` carrying the commissioning date.

## OpenGridView parity checklist

- [x] Data Centers — IM3 atlas (cyan circles + labels, signature diamond icon stacked over the glow via `crep-dcs-global-icon`)
- [x] Transmission lines — HIFLD full-voltage PMTiles + OSM power=line (see `scripts/etl/crep/fetch-transmission-full.mjs`) with voltage labels along lines (`crep-txlines-full-label`)
- [x] Substations — HIFLD + MINDEX (76k+ US substations) with name + voltage labels (`crep-subs-label`)
- [x] Power plants — existing MINDEX registry + WRI Global Power Plants + **EIA-860M Operating / Planned / Retired / Canceled** (new)
- [x] Fiber density / Internet exchanges — submarine cables (TeleGeography) + radio stations registry
- [ ] Municipal Water Service Areas — TODO, requires gpkg parse from IM3 file
- [ ] Projected Hyperscale Data Centers 2035 — TODO, in IM3 gpkg only (sqlite3 parse)
- [ ] Balancing Authority / Sector / Year filters on EIA plants — UI work pending

## ETL scripts

- `scripts/etl/crep/fetch-datacenters-global.mjs` — global OSM + PeeringDB + MINDEX merge (5-7k hyperscale points globally)
- `scripts/etl/crep/fetch-transmission-full.mjs` — HIFLD + OSM transmission lines
- *(this commit)* inline Python one-liner converts EIA-860M xlsx → 4 GeoJSONs + IM3 CSV → GeoJSON. Rerun on refresh:

  ```python
  import openpyxl, json, os, csv
  # (see commit 48af90a6 / ef9f0569 for full script; lives in shell history)
  ```

  A committed script will land in `scripts/etl/crep/build-eia-im3-geojson.py` in a follow-up.

## Layer wiring

`components/crep/layers/eia-im3-overlays.tsx` consumes the five new static GeoJSONs. It:

1. Lazily fetches each file on first enable of the matching registry toggle.
2. Adds three MapLibre layers per dataset: outer glow (blurred halo), core dot (sharp, capacity-scaled), and text label at zoom ≥ 9.
3. Wires click → `window.__crep_selectAsset` → `setSelectedInfraAsset` → InfraAsset panel, so plant + data-center clicks open the existing widget.
4. Honours the layer-registry `enabled` flag — disabled layers flip visibility off; re-enabling flips back without re-fetching.

## MINDEX ETL

Static GeoJSON is the first-paint path. The MINDEX table `infra_plants` + `data_centers` should receive the same rows for server-side querying by bbox. Cursor task in `CURSOR_TASK.md` tracks the Supabase/PostGIS ingestion work.

## Refresh discipline

When a new EIA-860M month drops (typically mid-month, e.g. `march_generator2026.xlsx`):

1. Download the workbook to `/tmp/` or `Downloads/`.
2. Run the Python ETL one-liner (or committed script) pointing at the new file.
3. Overwrite the four `eia860m-*.geojson` files.
4. `git add public/data/crep/eia860m-*.geojson && git commit -m "chore(crep): refresh EIA-860M to <month>"`
5. `git push origin main` — the `[fast]` flag in commit subject skips the full CI/CD and uses the instant-build path.

For IM3 atlas (monthly-ish refresh):

1. Download the new CSV + gpkg from https://im3.pnnl.gov/datacenter-atlas.
2. Run the CSV → GeoJSON conversion.
3. Overwrite `public/data/crep/im3-datacenters-existing.geojson`.
4. Same commit + push as above.
