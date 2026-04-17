# CREP Static Infrastructure Data

Accurate, authoritative GeoJSON files for permanent physical
infrastructure rendered on the CREP digital-twin globe. Follows Morgan's
rule: **never hallucinate a path or perimeter — if we don't have real
geometry, we don't render it.**

## Files

| File | Source | License | Notes |
|---|---|---|---|
| `submarine-cables.geojson` | [TeleGeography Submarine Cable Map](https://www.submarinecablemap.com) — public v3 API (`/api/v3/cable/cable-geo.json`) | CC-BY 4.0 — © TeleGeography | 710 cables, MultiLineString seafloor routes, antimeridian splits pre-applied |
| `submarine-cable-landings.geojson` | TeleGeography — `/api/v3/landing-point/landing-point-geo.json` | CC-BY 4.0 — © TeleGeography | 1,910 landing points (where cables meet shore) |
| `../military-bases-us.geojson` | US NTAD (Department of Homeland Security) | Public domain (US federal data) | Already in the repo at `public/data/` — polygon perimeters for US military installations |

## Adding more

When adding REAL infrastructure geometry, put it here with:

1. **Source citation** in this README
2. **License** visible in file header or alongside
3. **Verified against at least one other source** where possible (cross-check coordinates)

### Priority follow-ups

- [ ] **Transmission lines (US)** — source: HIFLD Electric Power Transmission Lines
  (https://hifld-geoplatform.hub.arcgis.com/datasets/electric-power-transmission-lines)
  — public domain, exact tower-to-tower routes
- [ ] **Airport perimeters** — source: OSM `aeroway=aerodrome` polygon query
  — ODbL 1.0, real runway-accurate footprints
- [ ] **Hospital perimeters** — source: OSM `amenity=hospital` polygon query
  — ODbL 1.0, actual building footprints
- [ ] **Pipelines** — source: HIFLD Oil and Natural Gas Pipelines
- [ ] **Rail network** — source: OSM `railway=rail` or OpenRailwayMap

### What does NOT go here

- **Live / moving data**: aircraft, vessels, satellites, buoys, weather, fires.
  Those update continuously and are served by registry endpoints.
- **Species observations**: biodiversity data is live from iNaturalist/GBIF
  via MINDEX — served by `/api/crep/fungal`.
- **Point markers for a few dozen facilities**: those are hardcoded in
  `lib/crep/static-infra.ts` (ports, hyperscale DCs, etc.) — no filesystem
  round-trip needed.

## Update cadence

Infrastructure changes on timescales of **months to years**. Re-fetch
these files manually when new cables come online (or quarterly as
maintenance). The map does NOT need to re-fetch these at runtime — they
ship with the app and are immutable until the next deploy.

## Attribution in UI

The CREP dashboard should surface attribution for any visible TeleGeography
data per CC-BY 4.0. Add to the layer legend / about section:
> Submarine cable data © TeleGeography (CC-BY 4.0), used with attribution.
