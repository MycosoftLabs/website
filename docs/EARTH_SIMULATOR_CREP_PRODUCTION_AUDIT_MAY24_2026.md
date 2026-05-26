# Earth Simulator & CREP — Production Readiness Audit

**Date:** May 24, 2026  
**Status:** Staged boot implemented — **ready for manual sign-off**; sandbox deploy pending Morgan approval  
**Last updated:** May 25, 2026 (Earth Simulator staged boot plan implemented — Phases 0–6 complete)  
**Routes:** `/natureos/earth-simulator`, `/dashboard/crep`  
**Related:** [2026-05-23 Earth Simulator handoff](./codex-handoffs/2026-05-23-earth-simulator-handoff.md), `lib/crep/earth-simulator-boot.ts`

---

## Executive summary

Full refresh production audit covered **health checks**, **static assets**, **API latency**, **live-mover data paths**, **FPS/DOM marker performance**, **memory/browser behavior**, and **first-load policy** (May 24 production rules). **MAS and MINDEX VMs are healthy.** Dev site on port **3010** serves Earth Simulator (200).

**May 25 staged boot (implemented):** `EARTH_SIM_STAGED_BOOT` + `EARTH_SIMULATOR_BOOT_PROFILE` in `lib/crep/earth-simulator-boot.ts` drive first paint on `/natureos/earth-simulator`: AM+ECM rasters at 35%, infra **lines** at z≈3, events/CCTV/military ON, movers pump OFF until aviation/ships/satellites toggled, species DOM gated to z≥7 or Nature Observations toggle, heavy GeoJSON idle loads skipped, nature store capped at 15k, SSE batch 100ms, SW registration skipped on Earth route. Debug: `window.__crep_boot_profile` + `window.EARTH_SIMULATOR_BOOT_PROFILE`. Revert: `NEXT_PUBLIC_EARTH_SIM_STAGED_BOOT=0`.

**FPS fix applied:** Root cause of ~3 FPS was hundreds/thousands of DOM markers each syncing via per-frame `map.project()`. Fixed with batched rAF sync in `map.tsx` and Earth Sim event DOM caps via `getEarthSimulatorEventDomCap()`. Re-verify overlay before deploy.

**Proxy fix (May 24):** `/api/mindex/proxy/{aircraft,vessels,satellites}` falls through to OEI when MINDEX bbox returns 0 rows; `normalizeMoverEntity` flattens lat/lng/heading/velocity for client pump.

**Deploy verdict:** **NOT deployed** — prior merge to main predates ECM-only fix; redeploy blocked until browser verification passes.

---

## Staged boot verification (May 25, 2026 — automated smoke)

| Check | Result |
|-------|--------|
| `/natureos/earth-simulator` | 200 |
| `/dashboard/crep` | 200 (regression) |
| MAS 188 `/health` | 200 |
| MINDEX 189 `/health` | 200 |
| `/api/mindex/proxy/aircraft?limit=5` | 200, `X-MINDEX-Source: fallback` |
| `/api/crep/fungal?quick=true&bbox=US subset` | 200 |

**Manual sign-off still required:** FPS during pan, AM+ECM raster stability, zero species DOM at z3, infra points hidden until z7, events no blink, movers when toggled ON.

---

## Production first-load policy (May 24–25, 2026)

| Area | Expected at refresh | Verified in code |
|------|---------------------|------------------|
| Species / nature filters | Fungi fetch allowed; **no DOM icons** at z≈3 | Yes — `EARTH_SIM_FUNGI_ONLY_GROUND_FILTER`, `renderFungalDomMarkers` |
| Aircraft / vessels / satellites | **OFF** (pump off) until toggled | Yes — `isStreaming=false` at boot; pump effect on layer toggle |
| AM + ECM fungal rasters | **Both ON** at 35% opacity | Yes — `applyEarthSimulatorBootToLayers`, dual-atlas on Earth route |
| Infra line toggles (cables, rails, TX) | ON, paint at z≈3 | Yes — `EARTH_SIM_INSTANT_INFRA_LINE_IDS` |
| Infra **point** icons | Toggles ON; **hidden until z ≥ 7** | Yes — `applyInfraPointIconMinZoom()` (CCTV/military exempt) |
| Events + CCTV + military | ON at refresh | Yes — profile ON set |
| Space weather / Earth2 / AQI / transit | OFF | Yes — `EARTH_SIM_OFF_AT_BOOT_LAYER_IDS` |
| Heavy GeoJSON idle (11–14 MB TX/substations) | **Deferred** on Earth route | Yes — gated in `CREPDashboardClient` when staged boot |

---

## Static assets (full refresh path)

Tested via `GET http://localhost:3010/data/crep/*` (cold read):

| Asset | Size | Latency (cold) | Risk |
|-------|------|----------------|------|
| `submarine-cables.geojson` | 0.69 MB | ~558 ms | Low |
| `substations-us.geojson` | **11.36 MB** | ~8.2 s | **High** — blocks main thread parse |
| `transmission-lines-us-major.geojson` | **13.39 MB** | ~9.5 s | **High** |
| `transmission-lines-sub-transmission.geojson` | 2.11 MB | ~1.5 s | Medium |
| `cell-towers-us.geojson` | 0.02 MB | ~41 ms | Low (US subset only) |
| `military-bases.geojson` | 6.94 MB | ~4.8 s | Medium–high |

**Recommendation:** Prefer PMTiles/vector tiles for substations and TX on production; defer full GeoJSON parse until zoom ≥ 4 or use worker + incremental `setData`.

---

## API latency matrix (localhost:3010)

### Live movers (used by `[CREP/pump]` every 45 s)

| Endpoint | Before fix | After fix | Notes |
|----------|------------|-----------|-------|
| `/api/mindex/proxy/aircraft?limit=N` | 0 rows, ~120 ms | **5 rows, ~5 s**, `X-MINDEX-Source: fallback` | OEI `/api/oei/flightradar24` |
| `/api/mindex/proxy/vessels?limit=N` | 0 rows | **5 rows, ~2.8 s**, fallback | OEI `/api/oei/aisstream?publish=true` |
| `/api/mindex/proxy/satellites?limit=N` | 0 rows / unavailable | **5 rows, ~8 s**, fallback | OEI `/api/oei/satellites?category=active&mode=registry` |

Direct OEI (reference — data exists):

| Endpoint | Latency | Payload |
|----------|---------|---------|
| `/api/oei/aisstream?limit=5` | ~2.6 s | ~21 KB |
| `/api/oei/opensky?limit=5` | ~4.0 s | ~4 KB |
| `/api/oei/flightradar24?limit=5` | ~3.3 s | ~1.6 KB |
| `/api/oei/satellites?limit=5` | ~0.1–12 s | registry cache dependent |

### OEI / nature / events

| Endpoint | Latency | Status |
|----------|---------|--------|
| `/api/oei/buoys` | ~2.5 s | OK (large payload at high limit) |
| `/api/oei/military?limit=3` | ~0.7 s | OK |
| `/api/oei/ports?limit=3` | ~6.2 s | OK |
| `/api/oei/submarine-cables?limit=3` | ~1.9 s | OK |
| `/api/oei/transmission-lines-global?limit=3` | ~6.2 s | OK |
| `/api/oei/radio-stations?limit=3` | ~5.1 s | OK |
| `/api/oei/power-plants?limit=3` | ~3.8 s | OK |
| `/api/oei/events?limit=3` | ~2.2 s | OK |
| `/api/oei/cell-towers-global?limit=3` | 400 | **Expected** — requires `bbox=w,s,e,n` |
| `/api/natureos/global-events?limit=3` | ~2.2 s | OK |
| `/api/earth-simulator/inaturalist?per_page=3` | ~3.6 s | OK |

### Nature / fungal (viewport)

| Endpoint | Latency | Status |
|----------|---------|--------|
| `/api/crep/fungal?kingdom=Fungi&limit=5&bbox=…` | ~12–24 s | OK but **slow** — parallel MINDEX + iNat + GBIF |
| `/api/crep/fungal?limit=5` (no bbox) | **>60 s timeout** | **Do not call without bbox on refresh** |
| `/api/crep/species/search?q=fungi&limit=5` | ~4 s | OK fallback catalog |

### Routes not used by pump (audit probes only)

These returned connection errors or 404 when probed with wrong paths; **not blockers** if CREP uses proxy/OEI paths above:

- `/api/oei/vessels`, `/api/oei/maritime`, `/api/oei/airports`, `/api/oei/satellite-registry` — not primary pump paths

---

## Code fix applied (May 24, 2026)

**File:** `app/api/mindex/proxy/[source]/route.ts`

1. When MINDEX returns **200 with 0 entities** for `aircraft`, `vessels`, or `satellites`, fall through to OEI fallback (previously only `species` did this).
2. Vessel fallback adds `publish=true&refresh=true` for AISstream cache.
3. Satellite fallback adds `category=active&mode=registry` for fast registry path.

**Verify after deploy:**

```powershell
Invoke-WebRequest "http://localhost:3010/api/mindex/proxy/aircraft?limit=3" -UseBasicParsing |
  Select-Object -ExpandProperty Headers
# Expect X-MINDEX-Source: fallback and non-zero aircraft array
```

---

## Known gaps & follow-ups

| Priority | Issue | Impact | Suggested action |
|----------|-------|--------|------------------|
| P1 | MINDEX earth/map/bbox empty for movers | Was blocking planes/ships until proxy fix | Ensure MINDEX ETL/collector populates aircraft/vessel/satellite layers on VM 189 |
| P1 | Heavy GeoJSON on refresh (substations + TX major) | 20+ MB parse, jank, long TTI | PMTiles only at z&lt;7; lazy-load GeoJSON |
| P2 | `/api/crep/fungal` without bbox | Timeout | Client must always pass viewport bbox (already in bounds effect; verify no global call) |
| P2 | Satellite proxy `normalizeMoverEntity` lat/lng 0 | Icons at null island until SGP4/sync | Map `latitude`/`longitude` fields in proxy normalizer |
| P2 | TX GeoJSON layers still minzoom 4–5 | Lines not at true globe zoom on GeoJSON path | Align with `INFRA_LINE_GLOBAL_MIN_ZOOM = 0` |
| P3 | `isProductionFirstLoadRoute()` unused | Dead helper | Wire for telemetry or remove |
| P3 | `false &&` disables legacy parallel OEI in `fetchData` | Redundant now pump + proxy fallback exist | Clean up dead branches |
| P3 | DOM nature markers cap 700–2800 at low zoom | FPS contention with MapLibre | Keep LOD caps; monitor on sandbox |

---

## Full refresh regression checklist

Run on `http://localhost:3010/natureos/earth-simulator` after hard refresh (Ctrl+Shift+R):

1. **Camera:** North America ~`[-98.5, 39.8]`, zoom ~3 (not tiny z0 globe).
2. **Base layers:** Satellite imagery, bathymetry, topography visible.
3. **Filters:** Species, events, aircraft, vessels, satellites toggles **ON** (space weather OFF).
4. **Live counts:** Top bar shows non-zero planes/boats/sats within ~15 s (pump delay 900 ms + fallback latency).
5. **Infra lines at z3:** Submarine cables / railways / TX lines visible (no point clutter).
6. **Infra points at z3:** No substation/plant/tower **icons** (only lines/rasters).
7. **Zoom to z7+:** Infra point icons appear.
8. **Nature markers:** Stable after 10 s (no flicker/disappear — see May 23 regression lock).
9. **Click:** Nature and event markers open widgets.

Compare same checks on `/dashboard/crep`.

---

## Deploy readiness

| Step | Status |
|------|--------|
| Local test on 3010 | Done (page 200; APIs partially probed) |
| FPS fix (marker batch + cap 120) | Applied — **manual FPS verify required** |
| P0 audit blockers | **Open** — see Extended audit section |
| Browser visual QA | **Manual** — Morgan refresh + pan/zoom |
| Commit all fixes | Pending user request |
| Push → Sandbox 187 rebuild + NAS mount | Not run |
| Cloudflare purge | Not run |

---

## Files touched in this audit session

- `app/api/mindex/proxy/[source]/route.ts` — empty MINDEX mover fallback (production blocker fix)
- `docs/EARTH_SIMULATOR_CREP_PRODUCTION_AUDIT_MAY24_2026.md` — this document
- `docs/codex-handoffs/2026-05-23-earth-simulator-handoff.md` — audit pointer added

---

## Lessons learned

1. **Empty MINDEX ≠ unavailable MINDEX** — proxy must treat zero-row success as a miss for live layers.
2. **Probe with the same URLs the client uses** — direct `/api/oei/*` can look healthy while pump uses empty proxy.
3. **Always pass bbox** to fungal and cell-tower global APIs.
4. **Size static assets** before production — multi‑MB GeoJSON on refresh is the main latency risk after live data.
5. **DOM markers × per-frame `map.project()`** — hundreds of React markers with a synchronous render listener will collapse FPS to single digits; batch + rAF + `isMoving()` gating is mandatory.

---

## Extended audit — performance, memory, browser, latency (May 24, 2026)

This section covers lag, cache, memory, browser stability, broken data, and low-latency issues beyond the API/static-asset matrix above. **Verdict: do not ship live until P0 rows are resolved or signed off.**

### Fix applied this session (FPS ~3 → target 20–30)

| Area | Root cause | Fix |
|------|------------|-----|
| `components/ui/map.tsx` | Every DOM marker registered its own `render` handler; each frame ran `map.project()` for all markers | Single `registerEarthMarkerBatch` per map; rAF-coalesced sync; sync on `render` only when `map.isMoving()`; snap on `moveend`/`resize` |
| `CREPDashboardClient.tsx` | Earth Sim allowed 700–2800 DOM nature markers; instant fungal preload 4000 | `EARTH_SIM_DOM_MARKER_CAP = 120`; reduced zoom caps; preload 1200; fungal render uses earth cap |

**Verify:** Dev overlay (bottom-left on `/natureos/earth-simulator`) should stay **≥ 20 FPS** at z3 pan after hard refresh. Re-test after any marker/layer change.

---

### P0 — deploy blockers

| # | Issue | Symptom | Location | Fix |
|---|--------|---------|----------|-----|
| 1 | **Earth mount forces max load** | First paint starts streaming, infra, clears audit/off — contradicts staged “filters off / light boot” handoff; stacks pump + SSE + 20+ MB GeoJSON parse | `CREPDashboardClient.tsx` ~4664–4673 `setIsStreaming(true)`, `setShowInfraLayers(true)` | Earth Sim boot profile: start with species/base layers only; defer movers/infra/SSE until user toggles or zoom ≥ threshold |
| 2 | **Event DOM markers uncapped at city zoom** | At zoom ≥ 9, `getEventDomMarkerCapForZoom` returns `UNCAPPED_RENDER_LIMIT`; `renderedEventsForMap` skips cap when `isCityLevelZoom` — thousands of DOM nodes, OOM / 3 FPS | ~1110–1118, ~9087–9094 | On Earth Sim, always apply hard cap (e.g. 120–500) even at city zoom; prefer WebGL/circle layer for dense events |
| 3 | **Markers unmount during pan** | Nature/event icons blink/disappear while dragging | `shouldRenderDomMarkers = !(earthStrictPerfMode && isMapAnimationActive)` ~8613 | Hide via CSS/`pointer-events: none` or keep mounted with batched position sync — do not unmount |
| 4 | **Fungal API without bbox** | `/api/crep/fungal?limit=5` **times out** (>60 s) in smoke test | Client must never call without viewport bbox | Audit all fetch sites; guard route to 400 if bbox missing |
| 5 | **Heavy GeoJSON on first load** | substations 11 MB + TX major 13 MB parse blocks main thread 8–10 s each | `/data/crep/*.geojson` | Lazy-load at zoom ≥ 4 or PMTiles; do not parse on Earth Sim first load if infra toggles start OFF |
| 6 | **Live-only policy violations** | SDAPCD H₂S returns `source: awaiting-feed` (200 but not real); oyster EMIT/plume static fallbacks; FCI demo waveform | `/api/crep/sdapcd/h2s`, oyster routes, FCI widgets | Gate behind “demo” tier or empty state until real feeds; remove static fallbacks for production |
| 7 | **MINDEX species empty path** | Without `CREP_ENABLE_LIVE_NATURE_FALLBACK=1`, species proxy returns empty when MINDEX cache cold | `app/api/mindex/proxy/[source]/route.ts` ~476–495 | Set env on sandbox **or** default safe iNat/GBIF fallback for species only |

---

### P1 — high (ship only with mitigation)

| # | Issue | Impact | Action |
|---|--------|--------|--------|
| 8 | Nature store up to **120k** rows before prune (~6966) | Memory + GC pressure on long sessions | Lower Earth Sim ceiling (e.g. 5k–15k); viewport prune every SSE tick |
| 9 | SSE nature stream rebuilds `Array.from(store.values())` each message | React re-render churn | Batch updates (100 ms); diff by id; throttle setState |
| 10 | Service worker scope **`/dashboard/crep/`** only | Earth Sim route **not** cached by `crep-sw.js` | Register second scope or use `/natureos/` parent scope |
| 11 | Circuit breaker **stubbed** (`breakerSkip` always `false` ~5029) | Dead upstreams spam pump every 45 s | Restore skip-until logic already documented in comments |
| 12 | **`EARTH2_BACKEND_ENABLED = false`** (~1531) | All Earth-2 weather layers/widgets inert | Expected for now — hide UI toggles or show “Earth-2 offline” empty state |
| 13 | **`/api/crep/status` → 503** | Status widget may show error | Fix upstream dependency or degrade gracefully on Earth Sim |
| 14 | **AirNow** requires bbox/key | `/api/crep/airnow/current` → 400 without params; 501 on sandbox without `AIRNOW_API_KEY` | Document env; client always passes bbox; empty state if key missing |
| 15 | Aircraft/vessel **rAF interpolation** | Pump pauses on interaction but animation loop may still run | Pause rAF writers when `shouldPauseLiveWork` or Earth strict perf + moving |

---

### P2 — medium (quality / polish)

| Item | Notes |
|------|--------|
| `map.stop()` ~700 ms after startup (`map.tsx`) | Can fight user pan; restrict to earth boot only once |
| Pending marker-batch rAF not cancelled on unmount | Minor leak on hot reload |
| SW stale cache for events/fungal | Version cache keys on deploy; `Cache-Control: no-store` for live layers |
| `EarthSimulatorViewportLock` MutationObserver on full subtree | Extra layout work; narrow to `.crep-dashboard-root` only |
| Orphan airport layer IDs in visibility sync | Harmless 404s in console |
| Satellite proxy lat/lng `0` until SGP4 | Icons at null island — normalize `latitude`/`longitude` in proxy |
| CREP SSR ~15 s cold | Acceptable for dashboard; Earth Sim should stay client-heavy |

---

### API smoke (May 24, 2026 — localhost:3010)

| Endpoint | Result | Notes |
|----------|--------|-------|
| `/natureos/earth-simulator` | 200 | Page serves |
| `/api/crep/health` | 200 | OK |
| `/api/crep/status` | **503** | Investigate before live |
| `/api/crep/fungal?limit=5` (no bbox) | **Timeout** | Blocker — never call without bbox |
| `/api/crep/nature/preloaded` | 400 | Expected without params |
| `/api/crep/airnow/current` | 400 | Expected without bbox |
| `/api/crep/sdapcd/h2s` | 200 | **Not live data** — `awaiting-feed` |
| `/api/mindex/proxy/species?bbox=…` | 200 | ~14 KB — OK when MINDEX/fallback warm |
| MAS 188 / MINDEX 189 `/health` | 200 | VMs healthy |

---

### Deploy gate checklist (must pass before sandbox/production)

**Performance**

- [ ] FPS ≥ 20 at z3 during pan (Earth Sim overlay)
- [ ] FPS ≥ 25 at z5 with nature + events ON (caps enforced)
- [ ] No sustained main-thread blocks > 500 ms after first 3 s (Performance tab)
- [ ] Memory stable < 1.5 GB tab heap after 5 min pan/zoom (Chrome task manager)

**Data & latency**

- [ ] MINDEX proxy movers return rows (`X-MINDEX-Source: live` or `fallback`) within 15 s of refresh
- [ ] Fungal fetch **always** includes bbox; completes < 30 s in viewport
- [ ] No mock/demo payloads visible on public Earth Sim (SDAPCD, oyster, FCI)
- [ ] Species visible when MINDEX cold (fallback env or UX empty state with explanation)

**UX / browser**

- [ ] No marker blink during pan (nature + events)
- [ ] No Next.js full-page reload loop (MapLibre/React reconciler errors suppressed — see ~4255)
- [ ] Hard refresh: camera US center ~`[-98.5, 39.8]`, z ~3
- [ ] Mobile: no horizontal scroll; map fills `100dvh` (`EarthSimulatorViewportLock`)

**Ops**

- [ ] Sandbox env: `MINDEX_API_URL`, `MAS_API_URL`, optional `AIRNOW_API_KEY`, `CREP_ENABLE_LIVE_NATURE_FALLBACK` as needed
- [ ] Docker rebuild + NAS mount + Cloudflare purge after push
- [ ] Compare localhost:3010 vs sandbox.mycosoft.com/natureos/earth-simulator

---

### Recommended fix order (next implementation session)

1. ~~Earth Sim staged boot (remove forced streaming/infra on mount)~~ **Done May 25, 2026**
2. ~~Hard-cap event DOM markers on Earth Sim at all zoom levels~~ **Done**
3. ~~Replace marker unmount-with-pan with CSS hide + existing batch sync~~ **Done (Earth route keeps markers mounted)**
4. ~~Bbox guard on `/api/crep/fungal` + client audit~~ **Done (US bbox preload + server 400 without bbox)**
5. ~~Defer/lazy infra GeoJSON until zoom or toggle~~ **Done (PMTiles + skip idle GeoJSON on Earth)**
6. ~~SW scope for `/natureos/earth-simulator`~~ **Done (skip SW register on Earth route)**
7. ~~Restore circuit breaker; cap nature store for Earth Sim~~ **Done**
8. Remove or gate mock data routes for live deploy (SDAPCD, oyster — separate ticket)
9. Env checklist on VM 187 + manual browser sign-off + sandbox deploy

---

### Files referenced (performance path)

| File | Role |
|------|------|
| `app/natureos/earth-simulator/page.tsx` | Route entry |
| `app/natureos/earth-simulator/EarthSimulatorViewportLock.tsx` | Viewport lock / overflow |
| `app/dashboard/crep/CREPDashboardClient.tsx` | Monolith: layers, pump, caps, mount effects |
| `lib/crep/earth-simulator-boot.ts` | **Staged boot profile + debug export** |
| `components/ui/map.tsx` | MapLibre wrapper + earth marker batch sync |
| `components/crep/layers/proposal-overlays.tsx` | Infra overlays + minzoom gating |
| `lib/crep/lod-policy.ts` | LOD / DOM marker guidance |
| `public/crep-sw.js` | CREP service worker (skipped on Earth route) |
| `app/api/mindex/proxy/[source]/route.ts` | MINDEX + OEI fallback + mover normalization |
| `docs/codex-handoffs/2026-05-23-earth-simulator-handoff.md` | Regression locks + fungal test profile |
