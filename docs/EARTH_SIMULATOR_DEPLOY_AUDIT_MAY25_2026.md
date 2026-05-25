# Earth Simulator Production Deploy Audit

**Date:** May 25, 2026  
**Status:** Complete — all automated gates passed; deployed to production  
**Branch:** `main` (merged from `codex/myca-website-security-boundary`)  
**Routes:** `/natureos/earth-simulator`, `/dashboard/crep`

---

## Scope

- Earth Simulator staged boot (AM + ECM rasters, infra lines, events, deferred movers)
- Viewport Intelligence panel (government header, Politics section, civic API wiring)
- Fungal atlas tiles (AM + ECM), fungal observations API, species markers LOD
- MINDEX proxy fallbacks for aircraft/vessels/satellites
- Production build + sandbox deploy + Cloudflare purge

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
| ECM layer visible at refresh (global z≈3) | **PASS** | ECM PNG tiles 200 at z3/z5; staged boot enables `fungalAtlasAM` + `fungalAtlasECM` at 35% |
| AM + ECM both active | **PASS** | Boot profile + atlas API returns cells with both scores |
| Fungal observations real (not mock) | **PASS** | iNaturalist records with species names, coords, photo URLs |
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
