# CREP Nature Placement + API/ETL Source Audit

**Date:** May 24, 2026  
**Status:** Complete (fixes applied locally; not deployed to sandbox)

## Nature marker misplacement (mushrooms/plants in bay/ocean)

### Root cause

- Nature markers use raw lat/lng from MINDEX / iNaturalist / GBIF with no land/water sanity check.
- Fungal atlas heatmaps already had a Natural Earth land mask + SoCal water carve-outs, but **observation markers did not use it**.
- Some iNaturalist rows have GPS in open water (harbor/bay) while photos show land species — valid source data but wrong for terrestrial marker placement.

### Fix

- New shared module: `lib/crep/nature-land-filter.ts`
  - Natural Earth land polygons (`public/data/crep/ne_*_land.geojson`)
  - Expanded SoCal water mask (Mission Bay, SD Bay, Coronado channel, Imperial Beach, La Jolla, etc.)
  - Marine taxa (fish, molluscs) **allowed** in water; fungi/plants/birds/mammals/etc. **must** be on land
- Applied in `app/api/crep/fungal/route.ts` before response; meta includes `filteredWater` count
- iNaturalist rows now pass through `normalizeCoordinatePair` (lat/lng swap guard)
- `lib/crep/fungal-atlas.ts` refactored to import the same land filter (atlas + markers stay aligned)

### Verification (localhost:3010)

```
GET /api/crep/fungal?quick=true&limit=500&kingdom=all
  &north=33&south=32.5&east=-116.9&west=-117.4&nocache=true

→ 82 observations returned, filteredWater=24 (terrestrial rows removed from open water)
```

## API / ETL source audit

### Production VMs (192.168.0.x)

| Source | URL | Result |
|--------|-----|--------|
| MAS Orchestrator | 188:8001/health | **200** (~116ms) |
| MINDEX API | 189:8000/health | **200** (~20ms) |
| n8n (MAS) | 188:5678/healthz | **200** (~1s) |
| MINDEX observations (no key) | 189:8000/api/mindex/observations?limit=1 | **401** (expected without `X-API-Key`; website dev uses key via `.env.local`) |

### External ETL / live APIs

| Source | Result | Notes |
|--------|--------|-------|
| iNaturalist | **200** | Working |
| GBIF | **200** | Working |
| FlightRadar24 | **200** | Working (via `/api/crep/services`) |
| NOAA SWPC | **200** | Working |
| NASA GIBS | **200** (slow ~7s) | Degraded latency |
| Overpass API | **429** | Rate limited from dev IP; viewport-environment infra queries may fail intermittently |
| CelesTrak | **offline** | Fetch failed from dev PC (timeout); satellite TLE feed — check network/firewall or fallback mirror |

### `/api/crep/services` (local dev)

| Service | Status | Notes |
|---------|--------|-------|
| MINDEX | online | Points at VM 189 via env |
| MAS Orchestrator | degraded | HTTP 200 but >3s |
| n8n / Redis / Postgres / Qdrant / Earth-2 | offline | Expected when `.env.local` defaults to `localhost` — not VM URLs |
| iNaturalist | degraded | HTTP 200, slow |

### Routes smoke-tested

| Route | Result |
|-------|--------|
| `/api/crep/health` | 200 |
| `/api/crep/fungal` (SD bbox) | 200 + land filter active |
| `/api/crep/unified?limit=5` | 200 but **~131MB payload** — `limit` not honored; separate performance bug |

### Keys / credentials

- **MINDEX_API_KEY**: Required for MINDEX observation ETL; working in dev (fungal route returns MINDEX-sourced rows).
- **No hardcoded secrets** in new code; all keys from env.

## Follow-ups (not in this pass)

1. **Overpass 429**: Add secondary Overpass endpoint or server-side cache for viewport-environment.
2. **CelesTrak**: Diagnose timeout; wire backup TLE source in `satellite-tracking` connector.
3. **`/api/crep/unified` payload size**: `limit=5` still returns ~131MB — needs cap fix.
4. **Deploy** nature land filter to sandbox after Morgan approves website deploy.

## Files changed

- `lib/crep/nature-land-filter.ts` (new)
- `app/api/crep/fungal/route.ts`
- `lib/crep/fungal-atlas.ts`
