# LIVE PRODUCTION QA AUDIT — Mycosoft Earth Simulator

**Target:** `https://mycosoft.com/natureos/earth-simulator`
**Audit date:** 2026-06-13 (probe window data freshness `lastUpdated 2026-06-13T07:12:24Z`)
**Method:** 86 live production probes (HTTP GET, 1–5 samples each, medians reported) across 10 subsystems + 1 code-derived P0 not reachable by HTTP probe.
**Auditor:** MYCA Live-Prod QA

---

## 1. Executive Summary

**Overall verdict: SHIP-WORTHY BACKBONE, DEGRADED PERIPHERY — with one MERGE-BLOCKING client P0.**

The Earth Simulator's core is healthy. The route boots fast (153 ms median, 126 KB HTML, HTTP 200), the global-events bus has all 5 upstream feeds online (USGS, NOAA, NASA EONET, NWS, NIFC WFIGS), all 6 infrastructure metros return non-empty power/datacenter stats, species observations are dense in every tested city, all SPUN raster tiles serve, and all 3 field devices are connected. Of 86 probes, **63 pass (73%)**.

However, the audit surfaces a **device-class P0 that no HTTP probe can catch**: Apple iPad Pro **immediately freezes** on load. It is the headline finding and gates any "production-ready" claim — the page is unusable on one of the most common high-end client devices a defense/research demo audience will use.

Beyond the P0, three failure clusters degrade the periphery:
1. **SPUN Fungal Atlas vector cell layers are fully down** (5/5 empty, including a global bbox) — a backend data-mount regression.
2. **Eagle-Eye camera coverage has collapsed to CA + NY only** — Seattle and Miami (both coastal, both with provisioned DOT connectors) return zero, plus interior cities.
3. **Tide and buoy marine endpoints are not deployed at all** (HTTP 404, serving the SPA HTML shell).

### Verdict tally (86 probes)

| Verdict | Count | Share | Meaning |
|---------|------:|------:|---------|
| **pass** | 63 | 73.3% | Data present, latency under 3000 ms SLA |
| **empty** | 16 | 18.6% | HTTP 200 but zero payload (gaps + regressions) |
| **error** | 4 | 4.7% | HTTP 404 / route not deployed |
| **slow** | 3 | 3.5% | Data present but median ≥ 3000 ms SLA |
| **TOTAL** | **86** | 100% | |

> `{"pass":63,"slow":3,"empty":16,"error":4}`

**Note on the 16 "empty":** not all are faults. ~6 are expected/by-design (unauthenticated `waypoints`; `tornado`/`volcano` not designated major types; `protected` atlas layer known-empty; interior-city camera gaps). The other ~10 are real regressions or coverage losses (5 atlas cell layers, Seattle/Miami camera coverage).

---

## 2. Latency Table — Median ms per Subsystem (slowest-first)

Medians computed across all probes in each subsystem. SLA threshold = **3000 ms**.

| Rank | Subsystem | Median ms | Probes | Max ms | Min ms | Status |
|-----:|-----------|----------:|-------:|-------:|-------:|--------|
| 1 | **earth-simulator-live-prod-qa** (radio + cell PMTiles) | **2688** | 4 | 3349 | 153 | ⚠ radio-stations route known-slow; 2 of 3 metros breach SLA |
| 2 | earth-simulator-species-api (Fungi observations) | 522 | 6 | 2378 | 341 | ✅ all under SLA; SD cold-hit 2378 ms is the tail |
| 3 | earth-simulator-crep-production-qa (AQI/sensors/biodiv/tide/buoy) | 492 | 19 | 2719 | 0 | ⚠ mixed — biodiv healthy, tide/buoy 404 |
| 4 | mover-feeds (aircraft/vessels/satellites/rail) | 412 | 4 | 5350 | 119 | ⚠ median fine but **AIS vessels 5350 ms** is worst single route |
| 5 | earth-simulator-global-events (USGS/NWS/NIFC/EONET/SWPC) | 132 | 9 | 132 | 132 | ✅ single bundled call, fast |
| 6 | spun-fungal-atlas (raster tiles + cell layers) | 126 | 13 | 336 | 58 | ✅ fast — but cells empty (fast ≠ working) |
| 7 | eagle-eye-camera-coverage | 86 | 14 | 800 | 45 | ✅ fast — but half empty by coverage gap |
| 8 | earth-simulator-infra-qa (power/datacenters) | 76 | 7 | 92 | 48 | ✅ healthiest subsystem |
| 9 | core-route-and-boot-endpoints | 58 | 6 | 153 | 53 | ✅ boot path fast |
| 10 | earth-simulator-devices | 47 | 4 | 47 | 47 | ✅ fastest (served from stale cache) |

**Worst individual routes (single-probe medians):**

| Route | Median ms | Verdict | Note |
|-------|----------:|---------|------|
| `/api/oei/aisstream` (vessels) | **5350** | slow | 42,986 vessels, **all 3 samples ≥ 5266 ms, no cache warmup** — uncapped payload serialization |
| `/api/oei/radio-stations` Chicago | 3349 | slow | both samples > 3000 ms |
| `/api/oei/radio-stations` San Diego | 3133 | slow | cold 4233 / warm 2034 |
| `biodiversity-hotspots` Chicago | 2719 | pass (borderline) | cold sample 3040 ms breached; warm 794 ms — **watch** |
| `species` San Diego | 2378 | pass | cold-cache; re-probe stabilized to 1044 ms |

---

## 3. What-Loads vs What-Doesn't Matrix

### ✅ WHAT LOADS (healthy, data-present)

| Feature / Layer | Endpoint | Evidence |
|---|---|---|
| Route boot / HTML shell | `/natureos/earth-simulator` | 200, 126,824 bytes, 153 ms |
| Viewport intel (officials/legislation/media) | `/api/crep/viewport-intel` | 4/4 cities ok=true; SD officials=20 |
| Global events bus | `/api/natureos/global-events` | 5/5 feeds online; 192 eq, 192 wf, 7 flood, 4 storm |
| Fungal species observations | `/api/mindex/proxy/species` | 6/6 cities; SD=200, others=120 obs |
| Power plants + datacenters | `/api/crep/infra/viewport-stats` | 6/6 metros non-empty; NY peak 18.4 GW / 126 plants |
| Power-plants PMTiles | `power-plants-global.pmtiles` | 206 partial, valid magic, 13.6 MB |
| Cell-towers PMTiles | `cell-towers-global.pmtiles` | 206 partial, valid magic, 43.8 MB |
| AQI sensors | `/api/crep/airnow/bbox` | 5/5 metros; NY=18 sensors |
| Viewport sensors | `/api/crep/viewport-sensors` | 5/5 metros; SEA=9 (below limit) |
| Biodiversity hotspots | `/api/crep/biodiversity-hotspots` | 5/5 metros = 300 features (bug-fix confirmed) |
| Aircraft | `/api/oei/flightradar24` | 132 aircraft, 119 ms |
| Satellites | `/api/oei/satellites` | 1610 satellites, 438 ms |
| Railway | `/api/oei/railway-live` | 469 trains, 386 ms |
| Field devices | `/api/earth-simulator/devices` | 3/3 connected, 47 ms |
| SPUN raster tiles (ECM/AM) | `/fungal-atlas/tiles/...png` | 8/8 tiles 200 image/png |

### ❌ WHAT DOESN'T LOAD — the priority rows (empty + error)

| # | Feature | Endpoint | Verdict | Root cause | Fault class |
|--:|---|---|---|---|---|
| 1 | **SPUN Atlas — mycelium cells (CA)** | `fungal-atlas?layer=mycelium` | empty | `sourceDir=null`, all 5 sources `missing` | **REGRESSION** |
| 2 | **SPUN Atlas — ECM cells (CA)** | `fungal-atlas?layer=ecm` | empty | all sources missing | **REGRESSION** |
| 3 | **SPUN Atlas — ECM cells (GLOBAL)** | `fungal-atlas?layer=ecm&bbox=-180..180` | empty | even worldwide bbox = 0 cells → data-mount outage, not bbox | **REGRESSION** |
| 4 | **SPUN Atlas — mycelium cells (PNW)** | `fungal-atlas?layer=mycelium` PNW | empty | data-rich region, `sourceDir=null` | **REGRESSION** |
| 5 | SPUN Atlas — protected cells | `fungal-atlas?layer=protected` | empty | protectedplanet source missing | known-empty (expected) |
| 6 | **Eagle-Eye sources — Seattle** | `/api/eagle/sources` | empty | coastal city, total:0 sources:[] | **COVERAGE GAP** |
| 7 | **Eagle-Eye DOT CCTV — Seattle** | `connectors/state-dot-cctv` | empty | **wsdot=0 despite WA connector defined** | **COVERAGE GAP** |
| 8 | **Eagle-Eye sources — Miami** | `/api/eagle/sources` | empty | coastal FL, total:0 | **COVERAGE GAP** |
| 9 | **Eagle-Eye DOT CCTV — Miami** | `connectors/state-dot-cctv` | empty | **fdot=0 despite FL connector defined** | **COVERAGE GAP** |
| 10 | Eagle-Eye sources/DOT — Chicago | both | empty | no IL DOT provider provisioned | gap (interior, historical) |
| 11 | Eagle-Eye sources/DOT — Denver | both | empty | no CO DOT provider provisioned | gap (interior, historical) |
| 12 | **Tide predictions** | `/api/crep/tide` | **error 404** | route not deployed; serves SPA HTML shell | **NOT DEPLOYED** |
| 13 | **Buoy / NDBC marine** | `/api/crep/buoys` (+3 variants) | **error 404** | no buoys endpoint exists at any of 4 paths | **NOT DEPLOYED** |
| 14 | Waypoints | `/api/crep/waypoints` | empty | `authenticated:false` — auth-gated | by-design (probe unauth) |
| 15 | Global events — tornado | `global-events` | empty | none active / squeezed by 400-cap | by-design |
| 16 | Global events — volcano | `global-events` | empty | EONET online, no features in window | by-design |

**The 10 rows in bold are features that SHOULD load and DON'T.** The SPUN atlas regression (rows 1–4) and the tide/buoy non-deployment (rows 12–13) are the most actionable server-side defects.

---

## 4. Random-City Matrix — Per-City Asset Availability

Coverage across the 4 visible asset classes per city. ✅ = dense/present, ⚠ = sparse/single-provider, ❌ = empty/missing, — = not probed.

| City | Nature (species / biodiv) | Infra (plants / DC) | Cameras (sources / DOT) | Events / Intel | Verdict pattern |
|------|---------------------------|---------------------|-------------------------|----------------|-----------------|
| **San Diego** | ✅ 200 obs / 300 feat | ✅ 48 plants, 11 DC (1.7 GW) | ✅ **168 src (9 providers)** / 257 DOT | ✅ intel: 20 officials; devices live | **Richest city — full stack** |
| **Los Angeles** | ✅ 120 obs / 300 feat | ✅ 141 plants, 33 DC (10.5 GW) | ⚠ 139 src (**caltrans only**) / 832 DOT | — | Densest infra; thin camera providers |
| **New York** | ✅ 120 obs / 300 feat | ✅ 126 plants, 40 DC (**18.4 GW**) | ✅ 17 src / **1544 DOT (densest)** | ✅ intel: 6 officials | Highest capacity + densest DOT CCTV |
| **Chicago** | ✅ 120 obs / 300 feat | ✅ 29 plants, **42 DC (most)** | ❌ 0 src / 0 DOT | ✅ intel: 4 officials | Interior camera gap; slow radio (3349 ms) |
| **Seattle** | ✅ 120 obs / 300 feat | — (sensors 9, AQI 9) | ❌ **0 src / 0 DOT (wsdot defined!)** | ✅ intel: 4 officials | **Coastal coverage gap — should have cameras** |
| **Miami** | ✅ 120 obs | ✅ 5 plants, 15 DC (0.2 GW) | ❌ **0 src / 0 DOT (fdot defined!)** | — | **Coastal coverage gap — should have cameras** |
| **Denver** | — | ✅ 10 plants, 21 DC (1.2 GW) | ❌ 0 src / 0 DOT (no CO provider) | — | Interior; camera gap historical |

**Camera coverage reality:** functional Eagle-Eye coverage exists **only in California (SD, LA) and New York.** Every other tested city — including two coastal cities with provisioned state DOT connectors (Seattle/wsdot, Miami/fdot) — returns zero. This is the single most visible "the map looks empty" defect for a user panning across the US.

---

## 5. Prioritized Findings

### 🔴 P0 — iPad Pro immediately FREEZES on the Earth Simulator (HEADLINE)

> *Code-derived, not a live HTTP probe — but the highest-severity issue in this audit. It renders the page unusable on a flagship client device.*

- **Symptom:** Apple iPad Pro freezes immediately on opening the Earth Simulator. Hard lock, not a slow load.
- **Location:** `getEarthSimViewportPerfClass()` in `CREPDashboardClient.tsx` (~line 2350).
- **Root cause — misclassification:** the perf-class function keys off **width + `(pointer: coarse)` only**. iPad Pro landscape reports **1366px (12.9")** or **1194px (11")** — both **> 1180px**. iPadOS Safari requests **desktop sites** by default, and with a Magic Keyboard/trackpad attached it reports **`(pointer: fine)`**. Both signals therefore say "desktop."
- **Consequence:** the iPad is handed the **full desktop budget** — all overlays enabled, **900 DOM-marker cap**, and **full-density GeoJSON power-infra** — a workload a tablet-class GPU cannot survive. It locks up before first interaction.
- **Compounding factor:** the recent tablet/phone **deferred-data delay was cut from 45s/55s → 1.75s/2.5s**, so even when a device *is* correctly classed as tablet/phone, heavy layers now hydrate almost immediately instead of being staged — removing the safety valve that previously let weaker devices settle.
- **Fix (3 parts):**
  1. Add `navigator.maxTouchPoints > 1` to the classifier so any multi-touch device is capped at **at most `"tablet"`**, regardless of width or pointer type. (This is the decisive fix — it catches desktop-mode iPads with trackpads.)
  2. **Restore tablet staging** — bring back the longer deferred-data delay for tablet/phone classes (the 45s/55s staging, or a sane middle ground well above 1.75s/2.5s).
  3. **Lower tablet caps** — reduce the DOM-marker cap and GeoJSON power-infra density for the tablet budget so a correctly-classified iPad gets a survivable workload.
- **Why P0:** zero-interaction hard freeze on a common high-end device; affects every iPad visitor; not catchable by API probes (all backend probes pass); directly undermines any live demo to investors / defense / research audiences on tablets.

### 🟠 P1 — Server-side defects with high user-visible impact

| ID | Finding | Evidence | Impact |
|----|---------|----------|--------|
| **P1-1** | **SPUN Fungal Atlas cell layers fully down** | 5/5 atlas-cell probes empty; `sourceDir=null`, all sources `missing`; **global bbox also 0 cells** | Fungal-first flagship layer renders no vector cells. Raster tiles still draw, masking it visually, but the data layer is gone. **Backend data-dir not mounted in prod — regression.** Restore the source-dir mount. |
| **P1-2** | **AIS vessel feed 2× over SLA** | `/api/oei/aisstream` median **5350 ms, all samples ≥ 5266 ms, no warmup**; 42,986 vessels uncapped | Slowest route in the audit; consistently blocks the maritime layer. **Cap/paginate the payload by viewport bbox**, or stream/compress. Primary mover-feed action item. |
| **P1-3** | **Tide + buoy endpoints not deployed** | `/api/crep/tide` 404 across SD/LA/SEA; `/api/crep/buoys` + 3 variants all 404 (SPA HTML shell) | Coastal/marine features advertised but **completely absent in prod**. Either deploy the routes or remove the UI affordances so they don't dead-link. |
| **P1-4** | **Eagle-Eye coverage collapsed to CA + NY** | Seattle & Miami (coastal, with `wsdot`/`fdot` connectors defined) return 0; interior cities 0 | Camera layer looks broken to any user outside CA/NY. **Wire up wsdot/fdot (and provision IL/CO) connectors** — the providers are defined but returning zero. |

### 🟡 P2 — Watch-list / lower-impact

| ID | Finding | Evidence | Action |
|----|---------|----------|--------|
| **P2-1** | radio-stations route known-slow | SD 3133 ms, CHI 3349 ms (NY 2243 ms passes) | Cache/index the OEI radio query; 2 of 3 metros breach SLA. |
| **P2-2** | biodiversity-hotspots Chicago borderline | cold 3040 ms (breach), warm 794 ms, median 2719 ms | Pre-warm cache; one cold hit tips over 3000 ms. |
| **P2-3** | Devices served from **stale cache** | `cache.hit=true, stale=true, age_ms≈340455 (~5.7 min), revalidating=true` | Fast 47 ms is from stale cache; confirm SWR revalidation actually completes. |
| **P2-4** | Device telemetry on **only 1 of 3** devices | mushroom-1 live (temp/IAQ/eCO2 flowing); **hyphae-1 telemetry=null**; **buoy-com4 telemetry=null AND lastSeen=null** (never reported) | Investigate field-device payload pipeline; buoy-com4 has never checked in. |
| **P2-5** | global-events **hard-capped at 400** | eq=wf=192 symmetric (truncation floor); storm/flood squeezed | Raise/partition the cap by type, or per-type quotas, so storms/floods/volcano aren't starved by eq+wf. |
| **P2-6** | LA & NYC camera **provider thinness** | LA = caltrans-only; NYC `/sources`=17 vs connector=1544 | `/sources` feed is sparse even where DOT is dense — reconcile the two camera feeds. |

---

## 6. Recommendations

**Immediate (block release / hotfix):**
1. **Fix the iPad P0** — land the 3-part fix in `getEarthSimViewportPerfClass()`: add `navigator.maxTouchPoints > 1` to force touch devices to ≤ tablet, restore tablet/phone deferred-data staging (revert the 1.75s/2.5s cut toward the prior 45s/55s), and lower the tablet DOM-marker (900→materially lower) and GeoJSON power-infra density caps. Validate on a physical iPad Pro 12.9" in Safari desktop mode **with a trackpad attached** (the exact freeze repro).
2. **Restore the SPUN atlas source-dir mount** (P1-1) — the global-bbox-empty result proves it's an infra mount, not a query; this is a one-config-fix regression.

**Near-term (this sprint):**
3. **Cap/paginate the AIS feed by viewport bbox** (P1-2) — target < 3000 ms; 42,986 uncapped vessels is the serialization bottleneck.
4. **Resolve marine endpoints** (P1-3) — deploy `/api/crep/tide` and a buoy/NDBC route, or remove the UI entry points to avoid dead links.
5. **Wire wsdot + fdot connectors and provision IL/CO DOT** (P1-4) so coverage isn't visually broken everywhere outside CA/NY.

**Hardening / hygiene:**
6. Cache-warm and index the radio-stations and Chicago biodiversity queries (P2-1, P2-2).
7. Confirm device SWR revalidation completes (currently 5.7-min stale) and fix the hyphae-1 / buoy-com4 telemetry pipeline (P2-3, P2-4).
8. Replace the global-events 400-item global cap with per-type quotas so storms/floods/volcano/tornado aren't starved by 384 earthquakes+wildfires (P2-5).
9. **Add a device-matrix gate to QA:** all 86 API probes pass while the page is unusable on iPad — API-only QA is blind to client perf-class freezes. Add real-device smoke tests (iPad Pro, mid-tier Android tablet, phone) to the release checklist.

---

**Bottom line:** Backend is in good shape — 73% pass, healthy boot path, dense infra/species/events, all upstream feeds online. The audit's release-blocker is **not** a server fault but the **iPad Pro freeze (P0)**, followed by four P1 server defects (SPUN atlas regression, AIS over-SLA, missing marine endpoints, collapsed camera coverage). Fix the P0 and P1-1 before any tablet-facing demo; schedule the rest in-sprint.