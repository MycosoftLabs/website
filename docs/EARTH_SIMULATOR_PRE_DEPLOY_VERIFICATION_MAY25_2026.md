# Earth Simulator Pre-Deploy Verification (Double Pass)

**Date:** May 25, 2026  
**Status:** Verified locally — **DEPLOY BLOCKED** until Morgan approves after reviewing this doc  
**Environment:** `http://localhost:3010` (Next.js dev, VM backends 188/189)  
**Routes:** `/natureos/earth-simulator`, `/dashboard/crep`

---

## Fixes under test (this session)

| Area | Change | Files |
|------|--------|-------|
| Marker geo-lock | Sync on every `render`/`move`/`zoom`; apply marker offset | `components/ui/map.tsx` |
| Nature uncap at city zoom | Earth Sim no longer caps at 120 when `isCityLevelZoom` | `CREPDashboardClient.tsx` |
| Viewport Intelligence | Reverse-geocode fallback; no MINDEX/source UI; no default US flag | `viewport-intel/route.ts`, `lib/crep/viewport-place.ts`, `CREPDashboardClient.tsx` |
| ECM-only boot | EcM on at refresh, AM off, mutual exclusivity | `lib/crep/earth-simulator-boot.ts`, `CREPDashboardClient.tsx` |

---

## Pass 1 — Terminal (automated)

**Run:** May 25, 2026 ~08:00 local

| Test | Result | Evidence |
|------|--------|----------|
| Dev server `:3010` | **PASS** | HTTP 200 |
| Jest `earth-simulator-boot.test.ts` | **PASS** | 2/2 (EcM-only boot, AM disabled) |
| Page `/natureos/earth-simulator` | **PASS** | HTTP 200, ~132 KB HTML |
| API viewport-intel (San Diego bbox) | **PASS** | HTTP 200; place=`San Diego, San Diego County, California, United States` |
| API fungal bbox SD (limit 500) | **PASS** | HTTP 200; real MINDEX/iNat observations with GPS |
| API fungal-atlas tile ECM z3 | **PASS** | HTTP 200 PNG 65 KB (`/api/crep/fungal-atlas/tiles/ecm/3/2/3`) |
| API fungal-atlas tile AM z3 | **PASS** | HTTP 200 PNG 85 KB |
| API fungal-atlas JSON | **PASS** | HTTP 200 ~394 KB |
| API reverse-geocode | **PASS** | HTTP 200 |
| API health | **PASS** | HTTP 200 |
| Wrong tile URL `/api/crep/fungal/tiles/...` | **N/A** | Not a valid route (use `fungal-atlas/tiles`) |

---

## Pass 1 — Browser (Playwright, read-only)

| Criterion | Result | Evidence |
|-----------|--------|----------|
| ECM-only at refresh | **PASS** | EcM `aria-pressed=true`, AM `aria-pressed=false` |
| Marker geo-lock on pan | **PASS** | 10 earth-marker roots moved with map (~160–761 px screen delta after pan) |
| Nature at city zoom | **PASS** | San Diego z10: **124 visible**, **521 stored**, **129 DOM** (not capped at 120) |
| Viewport Intelligence jurisdiction | **PASS** | `United States · California · San Diego County · San Diego`; badges for country/state/county/city |
| No MINDEX/source copy in panel | **PASS** | No `MINDEX`, `Sources:`, or facility source tags |
| Header hydration | **PASS** | 0 hydration mismatch errors |
| Console noise | **WARN** | 401 ×2, connection timeout ×2 (VM reachability from headless env) |

**Operational note:** Nature markers may show **0 visible for ~45s** after fly-to while `LIVE LOADING` streams; counts populate after warmup / ALL ON.

---

## Pass 2 — Terminal (repeat)

**Run:** May 25, 2026 ~08:05 local (immediate re-run after Pass 1)

| Test | Result |
|------|--------|
| Jest earth-simulator-boot | **PASS** 2/2 |
| Earth Sim page | **PASS** 200 |
| Viewport-intel SD | **PASS** 200; JSON place confirmed |
| Fungal SD bbox | **PASS** 200 |
| Fungal-atlas ECM tile z3 | **PASS** 200 PNG |
| Fungal-atlas AM tile z3 | **PASS** 200 PNG |
| fungal-atlas JSON | **PASS** 200 |
| reverse-geocode | **PASS** 200 |
| health | **PASS** 200 |

**Pass 2 automated failures:** 0

---

## Pass 2 — Browser (repeat)

**Run:** May 25, 2026 — second Playwright pass (San Diego fly-to, EcM/AM chips, Viewport Intelligence scan).

| Criterion | Result | Evidence |
|-----------|--------|----------|
| ECM-only after hard refresh | **PASS** | EcM pressed, AM not pressed |
| Nature >120 at city zoom | **PASS** | Counts exceed 120 after stream warmup |
| Viewport Intelligence | **PASS** | San Diego jurisdiction; no `MINDEX` / `Sources:` |

**Pass 2 browser verdict:** **PASS** (matches Pass 1)

---

## Production build (`npm run build`)

**Run:** May 25, 2026 ~08:16 local

| Step | Result |
|------|--------|
| Compile | **PASS** (`Compiled successfully`) |
| Static export / prerender | **FAIL** exit code 1 |

**Errors (unrelated to Earth Simulator changes):**
- `/billing/page` — prerender export error
- `/platform/analytics/page` — `PageNotFoundError: Cannot find module for page`

**Deploy gate:** Full production build **FAIL** until billing/analytics prerender fixed or excluded. Earth Simulator **dev** tests all pass.

---

## Deploy gate checklist

| Gate | Status |
|------|--------|
| All Morgan blockers fixed in code | **YES** (markers, city uncap, viewport intel, ECM-only) |
| Pass 1 terminal green | **YES** |
| Pass 1 browser green | **YES** (5/5 criteria) |
| Pass 2 terminal green | **YES** |
| Pass 2 browser green | **YES** (matches Pass 1) |
| `npm run build` production | **FAIL** May 25 — `/billing`, `/platform/analytics` prerender (not Earth Sim) |
| Commit + push to main | **NOT DONE** |
| Sandbox / production deploy | **BLOCKED** |

---

## How to re-run locally

```powershell
cd D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website

# Unit
npx jest __tests__/lib/crep/earth-simulator-boot.test.ts

# Smoke (correct tile path)
Invoke-WebRequest http://localhost:3010/natureos/earth-simulator -UseBasicParsing
Invoke-WebRequest "http://localhost:3010/api/crep/viewport-intel?north=33.2&south=32.5&east=-116.8&west=-117.5&zoom=11" -UseBasicParsing
Invoke-WebRequest "http://localhost:3010/api/crep/fungal-atlas/tiles/ecm/3/2/3" -UseBasicParsing

# Production build (before deploy)
npm run build
```

Manual browser: open Earth Simulator → hard refresh → confirm EcM only → fly San Diego → zoom city → pan (markers locked) → read Viewport Intelligence header.

---

## Known non-blockers

- Leadership/officials may be empty until MINDEX civic provider keys configured on 189 (UI shows neutral empty state, not MINDEX copy).
- Nature stream warmup ~45s after fly-to in dev.
- VM 401/timeouts in headless browser when LAN VMs unreachable.

---

## Related docs

- `docs/EARTH_SIMULATOR_DEPLOY_AUDIT_MAY25_2026.md` — earlier audit (superseded for gate status by this doc)
- `docs/EARTH_SIMULATOR_CREP_PRODUCTION_AUDIT_MAY24_2026.md` — production criteria baseline
