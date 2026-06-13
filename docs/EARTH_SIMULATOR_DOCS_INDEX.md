# Earth Simulator Documentation Index

**Date:** June 13, 2026  
**Purpose:** Quick reference to Earth Simulator / CREP documentation  
**Production stack:** MapLibre CREP globe (Cesium deprecated May 2026)

---

## Start here (current)

| Document | Description |
|----------|-------------|
| **[`docs/earth-simulator/README.md`](earth-simulator/README.md)** | **Public README** — what Earth Simulator is, who it is for, marketing feature overview + condensed developer reference |
| **[`docs/EARTH_SIMULATOR_TECHNICAL_REFERENCE.md`](EARTH_SIMULATOR_TECHNICAL_REFERENCE.md)** | **Technical Outline** — definitive capability index (20 sections, file:line refs, layer registry, APIs, QA test plan). **Sanitized for public sharing** (no private IPs, internal hosts, or deployment secrets). [GitHub](https://github.com/MycosoftLabs/website/blob/main/docs/EARTH_SIMULATOR_TECHNICAL_REFERENCE.md) |
| `lib/crep/earth-simulator-boot.ts` | Staged boot layer ON/OFF profile (source of truth in code) |
| `lib/devices/field-deployments.ts` | Field MycoBrain deployments (Mushroom1, Hyphae1, Psathyrella) |
| `app/dashboard/crep/CREPDashboardClient.tsx` | Main MapLibre + deck.gl implementation |

**Canonical URL:** `/natureos/earth-simulator`  
**Aliases:** `/dashboard/crep`, `/natureos/crep`, `/defense/crep`  
**Legacy redirect:** `/apps/earth-simulator` → canonical (Cesium removed from public routes)

---

## Deprecated (Cesium era — January 2026)

The following docs describe the **superseded CesiumJS** implementation. They remain in the repo for historical reference only. **Do not use for new development.**

| Document | Status |
|----------|--------|
| `docs/earth-simulator/ARCHITECTURE.md` | ⚠️ Deprecated — Cesium component tree |
| `docs/earth-simulator/API.md` | ⚠️ Deprecated — partial; see README API catalog |
| `docs/earth-simulator/GRID_SYSTEM.md` | ⚠️ Partially valid — grid APIs still exist under `/api/earth-simulator` |
| `docs/earth-simulator/DEPLOYMENT.md` | ⚠️ Deprecated — use README deployment section |
| `docs/earth-simulator/PERFORMANCE.md` | ⚠️ Deprecated — MapLibre LOD policy replaced Cesium tuning |
| `docs/earth-simulator/UIUX.md` | ⚠️ Deprecated — mobile shell replaced desktop-only Cesium UX |
| `docs/EARTH_SIMULATOR_STATUS.md` | ⚠️ Deprecated — Cesium status (if present at repo root) |
| `docs/EARTH_SIMULATOR_ERRORS_AND_FIXES.md` | ⚠️ Deprecated — Cesium error catalog |
| `docs/EARTH_SIMULATOR_IMPLEMENTATION_SUMMARY.md` | ⚠️ Deprecated |
| `docs/GOOGLE_EARTH_ENGINE_API_SETUP.md` | ⚠️ Partially valid — GEE proxy still at `/api/earth-simulator/gee` |

---

## CREP & recent handoffs (May–June 2026)

| Document | Topic |
|----------|-------|
| `docs/crep plan.md` | CREP roadmap |
| `docs/CREP_INFRASTRUCTURE_DEPLOYMENT.md` | Infra deployment |
| `docs/CREP_API_CACHING_FEB18_2026.md` | API caching |
| `docs/CREP_PLANES_BOATS_SATELLITES_FEB12_2026.md` | Live entity layers |
| `docs/CREP_DECK_GL_FIX_FEB12_2026.md` | deck.gl entity rendering |
| `docs/codex-handoffs/EARTH_SIMULATOR_FIRST_PAINT_CLOUD_SESSION_HANDOFF_JUN12_2026.md` | First-paint / cloud session |
| `docs/codex-handoffs/EARTH_SIMULATOR_DEVICE_BACKEND_CURSOR_HANDOFF_JUN12_2026.md` | Device backend |
| `docs/codex-handoffs/EARTH_SIMULATOR_PRODUCTION_MAP_FIX_HANDOFF_JUN12_2026.md` | Production map fix |
| `docs/codex-handoffs/EARTH_SIMULATOR_GLOBAL_MAP_BACKEND_HANDOFF_JUN03_2026.md` | Global map backend |
| `docs/codex-handoffs/EARTH_SIMULATOR_AIRNOW_CIVIC_MAS_MINDEX_HANDOFF_JUN03_2026.md` | AirNow + civic layers |
| `docs/reports/earth-field-mycobrain-devices-2026-05-27.md` | Field device audit |

---

## Quick tasks

### Open Earth Simulator locally

```
npm run dev:next-only   # port 3010
http://localhost:3010/natureos/earth-simulator
```

CREP-only (lighter):

```
npm run dev:crep        # port 3020
http://localhost:3020/dashboard/crep
```

### Check device API

```
GET http://localhost:3010/api/earth-simulator/devices
```

### Inspect boot profile in browser console

On `/natureos/earth-simulator`, after load:

```js
window.EARTH_SIMULATOR_BOOT_PROFILE
window.__crep_boot_profile
```

### Deploy to sandbox

See [`docs/earth-simulator/README.md` § Deployment](earth-simulator/README.md#deployment).

---

## API surface summary

| Prefix | Route count | Role |
|--------|-------------|------|
| `/api/earth-simulator/*` | 15 | Grid, tiles, GEE, devices, iNaturalist, aggregation |
| `/api/crep/*` | 38 | Unified CREP, fungal atlas, viewport intel, regional projects |
| `/api/oei/*` | 37 | OEI connectors (aviation, maritime, satellites, infra, events) |
| `/api/earth2/*` | 12 | Earth-2 forecast/nowcast/spore tiles via MAS + GPU legion |

Full tables: [`EARTH_SIMULATOR_TECHNICAL_REFERENCE.md` § MYCA Panel & Full API Index](EARTH_SIMULATOR_TECHNICAL_REFERENCE.md) and [`docs/earth-simulator/README.md` § API catalog](earth-simulator/README.md#api-catalog).

---

## Version history

| Date | Change |
|------|--------|
| **June 13, 2026** | Public marketing README + link to Technical Outline (`EARTH_SIMULATOR_TECHNICAL_REFERENCE.md`) |
| **June 12, 2026** | Replaced Cesium-first index with MapLibre CREP pointers; canonical README rewritten |
| **May 2026** | Cesium `/apps/earth-simulator` deprecated; staged boot profile shipped |
| **January 9, 2026** | Original Cesium-focused documentation set |

---

**Last updated:** June 13, 2026  
**Maintainer:** Mycosoft Platform / NatureOS team
