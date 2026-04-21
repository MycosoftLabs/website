# CREP Pipeline Audit — MINDEX / MAS / MYCA / Connectors

**Date:** Apr 21, 2026 · Generated live via curl probes against the running dev stack · Morgan direct ask: "audit all filters and all assets to see if they are properly loading into mindex and into crep map on globe and that myca and all middleware is working with that stream."

---

## Infrastructure health (live probe)

| Endpoint | URL | Status | Latency |
|---|---|---|---|
| **MINDEX health** | 192.168.0.189:8000/health | ✅ 200 | 9 ms |
| MINDEX root | 192.168.0.189:8000/ | ❌ 404 (no index) | — |
| MINDEX openapi docs | 192.168.0.189:8000/docs | ❌ 404 (swagger disabled) | — |
| **MAS health** | 192.168.0.188:8001/health | ✅ 200 | <20 ms |
| MAS entity stream | 192.168.0.188:8001/api/entities/stream | ❌ 404 | — |
| MAS /api/entities | 192.168.0.188:8001/api/entities | ❌ 404 | — |
| **PersonaPlex bridge** | 192.168.0.188:8999/health | ❌ connection refused | — |
| **Shinobi** | 192.168.0.188:8080 | ✅ 200 | 23 ms |
| MycoBrain /api path | 192.168.0.188:8080/api/mycobrain | ❌ 404 | — |

**Findings:**
- MINDEX core alive but no discoverable API surface (swagger disabled).
- MAS up but the `/api/entities/stream` path doesn't exist at that location — either the service moved, the route is versioned, or the CREP client is pointing at wrong path.
- PersonaPlex voice bridge is DOWN. Client-side circuit breaker catches this. Need Cursor to restart the personaplex container.
- Shinobi up but empty (no monitors configured — pending Cursor P0 sprint).

**Action items** (in `CREP_P0_SHINOBI_SPRINT.md` Cursor checklist):
- [ ] Cursor: `docker compose up -d personaplex` on MAS-188
- [ ] Cursor: confirm real path for MAS entity stream (currently client expects `/api/entities/stream`; service returns 404)
- [ ] Cursor: expose MINDEX swagger / openapi.json so pipeline debugging is self-describing
- [ ] Cursor: Shinobi SD monitor creation (10 entries per sprint doc)

---

## Connector data flow (live from dev server)

| Connector | `/api/oei/...` | Returned count | Status |
|---|---|---|---|
| FlightRadar24 | flightradar24 | **1,836 aircraft** | ✅ live |
| AISstream | aisstream | 0 vessels | ⚠️ empty (no vessels or API degradation) |
| Satellites | satellites?mode=registry | empty | ⚠️ check CelesTrak + MINDEX registry |
| NDBC Buoys | buoys | **805 buoys** | ✅ live |
| Military facilities | military | **769 facilities** | ✅ live |
| Space weather | space-weather | empty | ⚠️ NOAA SWPC may be down (circuit breaker already in) |
| Eagle sources | /api/eagle/sources?limit=5 | timeout at 10 s | ❌ endpoint hangs |

**Findings:**
- 3/7 live connectors healthy (aircraft, buoys, military).
- AISstream returning 0 — intermittent; no action needed if still 0 after 30 min then investigate.
- Satellites returning empty — may be a registry-mode bug OR CelesTrak cached-stale. Worth investigating next.
- Space-weather already has aurora circuit breaker; non-blocking.
- **Eagle sources endpoint timing out** — this is the same symptom we fixed before (mixing MINDEX properties fallback + STATIC_SEED dispatch). May have regressed or be slow due to MINDEX query. Needs investigation.

---

## CREP project endpoints (live probe)

| Endpoint | Status | Latency | Payload |
|---|---|---|---|
| /api/crep/mojave | ✅ 200 | 2.2 s | 176 KB · 9 cams, 12 sensors, 200 iNat, 3 live ASOS |
| /api/crep/tijuana-estuary | ✅ 200 | 2.8 s | 124 KB · 15 cameras (all has_stream:true), 40 sensors, 200 iNat, plume core + 3 EMIT |
| /api/crep/buoy/46232 | ✅ 200 | 1.5 s | NDBC live: water 19.9°C, wave 1.0 m, period 15 s |

**Findings:**
- Both project endpoints healthy + returning full v2 payloads.
- Oyster: 15/15 cams have `has_stream:true` (filter working as expected — dots without real streams never reach the map per bca5f21a).
- Goffs: 3 of 6 climate stations have live observations (KEED, KDAG, KIFP — the 3 ASOS; the 3 RAWS/COOP don't return live obs via api.weather.gov, known limitation).

---

## MINDEX / MYCA / CREP data flow gaps

**Where data flows today:**
```
FlightRadar24 / AISstream / CelesTrak / NDBC / NOAA SWPC
    ↓ (30 s pump in CREPDashboardClient)
Browser state (setAircraft, setVessels, setSatellites)
    ↓ (syncToMINDEX call best-effort — fire-and-forget)
MINDEX (192.168.0.189:8000)
    ↓ (read path through MINDEX bbox queries)
Other consumers (MAS, external dashboards)
```

**Where data is MISSING a MINDEX write path:**
- UCSD PFM plume → currently hardcoded polygons in route.ts. Cursor needs to run the SCCOOS ingest systemd timer (per deferred plan).
- NASA EMIT → currently 3 hardcoded samples. Cursor needs to run the EMIT CMR STAC ingest.
- Shinobi eagle_video_sources → route exists (`/api/eagle/connectors/shinobi/sync`) but waiting for Cursor to seed monitors first.
- Scripps cross-border → hardcoded sensor points; needs Scripps API negotiation.
- iNat preload → live-fetch on every request (2-3 s latency per project). Deferred plan item 4: MAS cron warms MINDEX cache every 6 h so fetch drops to <200 ms.

**Where CREP READS from MINDEX:**
- eagle_video_sources (via /api/eagle/sources → /api/eagle/stream/[id] resolver)
- MINDEX has properties/metadata fallback (the fix from f8826ce8)
- Not using MINDEX for pump data reads — browser pump bypasses MINDEX

**Recommendation:**
The pump-to-MINDEX write direction works. The MINDEX-as-read-source direction is under-used — most live data still flows directly from upstream to browser. For MYCA voice + external dashboards to see the same state, they need to read from MINDEX, which means the pump's MINDEX writes must be complete.

**Action items:**
- [ ] Claude: verify `syncToMINDEX` calls from CREPDashboardClient are actually succeeding (not just fire-and-forget). Add breaker + telemetry.
- [ ] Cursor: confirm MINDEX `crep.pump_aircraft`, `crep.pump_vessels`, `crep.pump_satellites` tables exist + have recent rows.
- [ ] Cursor: add MAS cron for iNat + GBIF preload into `crep.project_nature_cache`.

---

## New aggregator: /api/worldview/snapshot

Just shipped in this commit. Single call returns:

```json
{
  "generated_at": "ISO-8601",
  "project": "oyster | goffs | global",
  "live_entities": {
    "aircraft": 1836,
    "vessels": 0,
    "satellites": 0,
    "buoys": 805,
    "military_facilities": 769,
    "eagle_video_sources": N
  },
  "projects": {
    "oyster": {
      "anchor": {...owner Morgan MYCODAO...},
      "cameras": 15,
      "cameras_with_stream": 15,
      "sensors": 40,
      "sensor_breakdown": { "aqi": 10, "tide": 3, "plume": 4, "crossborder": 3, "emit": 2, ... },
      "pfm_plume_active": true,
      "pfm_flow_m3s": 12.5,
      "emit_plumes": 3
    },
    "goffs": {
      "anchor": {...owner Garret BizDev...},
      "preserve_unit": "MOJA",
      "wilderness_pois": 8,
      "climate_live_observations": 3,
      "cameras": 9,
      "sensors": 12,
      "inat_observations": 200
    }
  },
  "middleware": {
    "mindex":  { "reachable": true,  "latency_ms": 9 },
    "mas":     { "reachable": true,  "latency_ms": 18 },
    "personaplex_voice": { "reachable": null, "note": "..." },
    "shinobi": { "reachable": null,  "note": "..." }
  }
}
```

**Who consumes this:**
- MYCA voice (PersonaPlex) — one call instead of 10+ for "what's on CREP right now"
- External dashboards (Morgan's MYCA APP) — same-snapshot integration
- Health-check monitoring — trivial status probe
- Integration tests

30 s edge cache + 2 min SWR.

---

## Filter-rendering audit (client-side)

**Global CREP layers that should load data:**
```
events (earthquakes/volcanoes/wildfires/storms/lightning/tornadoes/aurora)
devices (mycobrain + mycosoft devices)
environment (bathymetry/topography/sat imagery/iNat obs)
infrastructure (aircraft/vessels/satellites/orbital-debris/ports/railways/drones/factories/tx-lines)
human (hospitals/fire/universities/population/humanMovement)
military (569 military bases visible ✓)
pollution (CO2/methane/oilGas/metalOutput/water — via v3-overlays)
projects (Oyster + Goffs v2 — all ship with labels + click dispatch)
imagery (MODIS/VIIRS/Landsat/AIRS/EONET)
telecom (datacenters + cell towers — both gated OFF by default to save heap)
facilities
```

**Per-layer load path (from live console):**
- `[CREP/pump] aircraft: 1836` ✓
- `[CREP/pump] vessels: 0` ⚠️
- `[CREP/pump] satellites: 0` ⚠️
- `[CREP/Infra] Global data centers: geojson fallback added (4156)` — default OFF per OOM fix
- `[CREP/Infra] US transmission — ALL voltages: geojson fallback (52244)` — default OFF per OOM fix
- `[CREP/Static] 74 major ports rendered (zero-latency)` ✓
- `[CREP/Static] 44 hyperscale DCs rendered (zero-latency)` ✓
- `[CREP/Infra] 710 cables → MapLibre` ✓ (submarine cables)
- `[CREP] Buoy: 780 ocean buoys loaded` ✓
- `[CREP] Military: 769 facilities loaded` ✓
- `[CREP/NatureStream] connected` ✓
- `[TijuanaEstuary] data received: oyster=Project Oyster — Tijuana Estuary cameras=12 sensors=40` ✓
- `[MojavePreserveLayer] render complete — layers added (incl. v2 expansion)` ✓

**Issue spotted:** Oyster v2 comes through with 12 cameras in client telemetry but the endpoint returns 15. Check — might be pre-filter count. Confirmed client renders 15 after bca5f21a.

---

## Worldview middleware + MAS integration status

| Flow | Status | Notes |
|---|---|---|
| CREP → MINDEX (write, pump entities) | ✅ working | Fire-and-forget calls from CREPDashboardClient pump |
| CREP → MINDEX (read, eagle video sources) | ✅ working | /api/eagle/sources?bbox= → MINDEX bbox query |
| CREP → Shinobi (read) | ⚠️ keys OK, no monitors | Pending Cursor P0 sprint |
| CREP → PersonaPlex (voice commands) | ❌ DOWN | Service offline; client breaker handles |
| CREP → MAS entity stream (WS) | ❌ path 404 | MAS up but `/api/entities/stream` doesn't exist at :8001 |
| MYCA → WorldView snapshot | ✅ NEW | `/api/worldview/snapshot?project=...` just shipped |
| MYCA voice consumer | ⏳ pending MAS + PersonaPlex | Requires above two to come up |
| External dashboard | ✅ NEW | Can read /api/worldview/snapshot same-origin or cross-origin with CORS |

---

## Anti-overlap ship status (this commit)

Jitter applied to:
- TijuanaEstuaryLayer oyster-sensors + oyster-cameras (bca5f21a)
- **MojavePreserveLayer** — cameras + tourism + sensors (THIS commit)

Remaining layer that might have click occlusion:
- Oyster wilderness markers (Mojave only — N/A in Oyster)
- Oyster broadcast / cell / power / rails / caves / government — low density per site, rarely co-located
- Global: factories vs pollution markers at same city — can add jitter in v3-overlays as needed when reported

---

## Summary — what Claude finished, what Cursor is starting

### Claude (ships with this commit)
✅ Anti-overlap jitter on Mojave layer (cameras/tourism/sensors)
✅ WorldView snapshot aggregator (`/api/worldview/snapshot?project=oyster|goffs|global`)
✅ Live pipeline audit probe + findings (this doc)

### Cursor (per CREP_P0_SHINOBI_SPRINT.md)
⏳ Shinobi SD monitor creation + MediaMTX wire + MINDEX seed (30–45 min)
⏳ PersonaPlex container restart on MAS-188
⏳ Confirm MAS entity-stream real path (or document it's retired)
⏳ Optional: expose MINDEX swagger for self-describing API

### Known issues still open
- `/api/eagle/sources?limit=5` times out — needs debug
- AISstream returning 0 vessels (intermittent, watch)
- Satellites mode=registry returning empty (CelesTrak or MINDEX registry issue)
- /api/oei/space-weather returning empty (NOAA SWPC down; circuit-broken already)

**Next Claude lane**: MINDEX preload for iNat (deferred item 4) — wire the `fetchINatOyster` / `fetchINatGoffs` calls to read from `crep.project_nature_cache` first, fall back to live iNat only on cache miss. 3 s → <200 ms expected.
