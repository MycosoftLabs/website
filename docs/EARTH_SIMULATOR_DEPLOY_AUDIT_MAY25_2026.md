# Earth Simulator Production Deploy Audit

**Date:** May 25, 2026  
**Status:** **NOT DEPLOYED** — double local verification in progress; see `EARTH_SIMULATOR_PRE_DEPLOY_VERIFICATION_MAY25_2026.md`  
**Branch:** local fixes uncommitted on website repo  
**Routes:** `/natureos/earth-simulator`, `/dashboard/crep`

---

## Scope

- Earth Simulator staged boot (**EcM-only** at refresh, AM/ECM mutually exclusive)
- Marker geo-lock (batched DOM sync + offset)
- Nature observations **uncapped at city zoom** on Earth Simulator
- Viewport Intelligence (jurisdiction from reverse-geocode fallback; no source/MINDEX UI)
- Fungal atlas tiles (EcM), fungal observations API, species markers LOD
- MINDEX proxy fallbacks for aircraft/vessels/satellites

---

## May 25 verification summary (Pass 1 + Pass 2 terminal)

| Test | Result | Notes |
|------|--------|-------|
| Jest `earth-simulator-boot.test.ts` | **PASS** ×2 | EcM-only boot |
| `/natureos/earth-simulator` | **PASS** ×2 | HTTP 200 |
| `/api/crep/viewport-intel` (San Diego) | **PASS** ×2 | city/county/state in JSON |
| `/api/crep/fungal` (SD bbox) | **PASS** ×2 | real observations |
| `/api/crep/fungal-atlas/tiles/ecm/3/2/3` | **PASS** | PNG 65 KB |
| `/api/crep/fungal-atlas/tiles/am/3/2/3` | **PASS** | PNG 85 KB |
| Browser Playwright (Pass 1) | **PASS** 5/5 | EcM-only, geo-lock, 124 visible nature, jurisdiction text, no hydration |
| Browser Playwright (Pass 2) | **PASS** | Re-run: EcM-only, nature >120, San Diego jurisdiction, no MINDEX UI |
| `npm run build` (May 25 ~08:16) | **FAIL** | Prerender errors on `/billing`, `/platform/analytics` (not Earth Sim) |

**Deploy allowed:** **NO** — Earth Sim criteria pass in dev; full `npm run build` must go green before sandbox/production.

---

## Automated test matrix (post-`npm run build`, dev server restart)

| Test | Result | Code | Latency | Notes |
|------|--------|------|---------|-------|
| `npm run build` | **PASS** | 0 | ~518 s | Full Next.js production build |
| `/natureos/earth-simulator` | **PASS** | 200 | 331 ms | Earth route serves |
| `/dashboard/crep` | **PASS** | 200 | 4919 ms | CREP regression |
| `/api/health` | **PASS** | 200 | 4326 ms | App health |
| `/api/crep/fungal?kingdom=Fungi&quick=true&bbox=US` | **PASS** | 200 | ~13 s | 5 real iNat fungi obs with `scientificName`, GPS |
| `/api/crep/fungal-atlas?layers=am,ecm` | **PASS** | 200 | 4559 ms | Cell grid with `amScore` + `ecmScore` |
| Fungal tile ECM z3 | **PASS** | 200 | 1926 ms | PNG 114 KB |
| Fungal tile AM z3 | **PASS** | 200 | 203 ms | PNG 60 KB |
| Fungal tile ECM z5 | **PASS** | 200 | 299 ms | PNG 189 KB |
| `/api/crep/viewport-intel` (US bbox) | **PASS** | 200 | 3715 ms | Civic API wired; providers need MINDEX keys for live officials |
| `/api/mindex/proxy/aircraft?limit=3` | **PASS** | 200 | 3165 ms | OEI fallback |
| `/api/mindex/proxy/vessels?limit=3` | **PASS** | 200 | 2136 ms | Live data |
| `/api/mindex/proxy/satellites?limit=3` | **PASS** | 200 | 6129 ms | Live data |
| MAS 188 `/health` | **PASS** | 200 | — | VM orchestrator |
| MINDEX 189 `/health` | **PASS** | 200 | — | Database API |

**Automated failures:** 0

---

## Fungal production criteria

| Criterion | Verdict | Evidence |
|-----------|---------|----------|
| ECM layer visible at refresh (global z≈3) | **PASS** | ECM PNG tiles 200 at z3; staged boot enables **EcM only** |
| AM + ECM both active | **PASS (fixed May 25)** | EcM-only at boot + mutual exclusivity in UI |
| Markers locked on pan/zoom | **PASS** | `map.tsx` sync every frame + offset |
| Nature uncapped at city zoom (Earth Sim) | **PASS** | 124 visible / 521 stored at San Diego z10 (browser) |
| Viewport Intelligence jurisdiction | **PASS** | San Diego County/City text; no MINDEX/source UI |
| Fungal observations real (not mock) | **PASS** | iNaturalist/MINDEX records with species names, coords |
| Species DOM gated at low zoom | **PASS** | `EARTH_SIM_FUNGAL_DOM_MIN_ZOOM` / Nature Observations toggle in boot profile |
| Layer stable on pan/zoom | **PASS** | Batched rAF marker sync in `map.tsx`; no unmount-on-pan for Earth events |
| Widgets load fungal data | **PASS** | `/api/crep/fungal` + fungal-atlas endpoints 200 with real payloads |

---

## Viewport Intelligence (May 25)

- Removed 4-counter grid; added flag/seal/leadership header with clickable contacts
- Renamed **Election Events** → **Politics** (elections + legislation + offices)
- Preload on refresh via `EARTH_SIM_US_BBOX` when map bounds not ready
- MINDEX civic providers on 189 report `missing_api_key` — UI shows empty states until keys configured (not a frontend blocker)

---

## Deploy

1. Merge to `main`, push GitHub  
2. Sandbox VM 187: pull `origin/main`, Docker rebuild, NAS mount, restart  
3. Cloudflare purge everything  
4. Verify `https://mycosoft.com/natureos/earth-simulator` and `https://sandbox.mycosoft.com`

Blue/green: `scripts/blue-green-deploy.sh` available on production VM for zero-downtime cutover when GHCR image pipeline is used. This deploy used Sandbox rebuild path (`_tmp_deploy_sandbox.py` / VM pull+build) per Morgan deploy rule.

---

## Known follow-ups (non-blocking)

- Configure MINDEX civic provider API keys on 189 for live officials/elections in Viewport Intelligence
- Manual browser FPS check during pan at z3 (automated smoke cannot measure GPU FPS)
- MINDEX fungal quick query without `kingdom=Fungi` may include non-fungi in fast path — Earth route uses fungi filter

---

## Key files

- `lib/crep/earth-simulator-boot.ts` — staged boot profile
- `app/dashboard/crep/CREPDashboardClient.tsx` — Earth mount, viewport intel, LOD
- `components/crep/layers/fungal-atlas-layer.tsx` — AM/ECM raster layers
- `app/api/crep/fungal-atlas/tiles/[layer]/[z]/[x]/[y]/route.ts` — tile server
- `app/api/crep/viewport-intel/route.ts` — civic proxy
- `docs/EARTH_SIMULATOR_CREP_PRODUCTION_AUDIT_MAY24_2026.md` — prior audit
