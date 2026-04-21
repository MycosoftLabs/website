# CREP Deferred Work — Parallel Execution Plan (Claude + Cursor)

**Created:** Apr 21, 2026 · Morgan direction: "work on all that you deferred in a clear detailed plan for both you and cursor to do at once."

Four deferred items from this session's P0–P3 audit. Each has a **Claude lane (code)** and **Cursor lane (ops/infra)** that can execute in parallel without blocking each other. Integration checkpoints after each track meets.

---

## Item 1 · P0-1 Video Widgets + Shinobi

### Problem
Morgan: "not one video is showing in the video widgets yet at all all in san diego are primary for now for start of training shinobi needs to be working too."

Current state (live-probed):
- Shinobi at `http://192.168.0.188:8080` → 200 OK but `/{API_KEY}/monitor/{GROUP_KEY}` returns **empty**
- `SHINOBI_API_KEY=a3fd4a3d` + `SHINOBI_GROUP_KEY=a3fd4a3d` configured in `.env.local`
- No monitors configured in Shinobi UI
- Cam-snapshot headless-render proxy **works** (94 KB JPEG in 5 s via `/api/eagle/cam-snapshot`)
- VideoWallWidget prefers `stream_url || embed_url` on click → picks raw HLS m3u8 when available, else iframe

### Cursor Lane — Ops (192.168.0.188)

**1.1 Confirm Shinobi is running + reachable**
```bash
ssh mas-188
docker ps | grep shinobi          # expect shinobi_shinobi_1 or similar
curl -s http://localhost:8080/a3fd4a3d/monitor/a3fd4a3d | head -c 200
```

**1.2 Validate API + Group keys**
- Log into Shinobi UI at http://192.168.0.188:8080 (default creds `moe@m0e.email` / `moe` unless changed)
- Navigate to **API Keys** → confirm `a3fd4a3d` exists with read+control scopes
- Navigate to **Groups** → confirm group key `a3fd4a3d` exists
- If either missing, regenerate + update `/opt/mycosoft/website/.env` + `.env.local` via git-managed secrets

**1.3 Create 10 San Diego training monitors (SD-primary per Morgan)**
Add these monitors via Shinobi UI → Add Monitor → RTSP/HLS source. Each needs `details.crep_lat` + `details.crep_lng` in Monitor Map settings so the connector picks up coordinates:

| # | Name | Source URL | Lat | Lng |
|---|---|---|---|---|
| 1 | Imperial Beach Pier | https://cameras.surfline.com/.../stream.m3u8 | 32.5789 | -117.1342 |
| 2 | Silver Strand State Beach | Caltrans SR-75 cam | 32.6470 | -117.1370 |
| 3 | Coronado Central Beach | https://cameras.surfline.com/coronado/... | 32.6859 | -117.1831 |
| 4 | Point Loma / Sunset Cliffs | Surfline sunset-cliffs | 32.7200 | -117.2550 |
| 5 | San Ysidro POE (CBP) | CBP border wait cam | 32.5427 | -117.0295 |
| 6 | Otay Mesa POE (CBP) | CBP OM | 32.5492 | -116.9695 |
| 7 | Downtown SD Skyline | Windy SD skyline | 32.7157 | -117.1611 |
| 8 | La Jolla Cove | EarthCam La Jolla | 32.8500 | -117.2770 |
| 9 | Mission Bay | EarthCam Mission Beach | 32.7701 | -117.2528 |
| 10 | TJ Estuary NERR mouth | TRNERR live cam if available | 32.5650 | -117.1200 |

Streams for these are mostly public HLS — Shinobi just needs to proxy them through MediaMTX so CORS/cert issues are bypassed.

**1.4 Wire Shinobi→MediaMTX bridge**
On 192.168.0.188, confirm MediaMTX is running on ports 8554 (RTSP), 8888 (HLS), 8889 (WebRTC-WHEP). Each Shinobi monitor republishes via `mediamtx.yml`:
```yaml
paths:
  shinobi-sd-ib-pier:
    source: rtsp://localhost:8554/shinobi/SD_IB_PIER
```

**1.5 Seed MINDEX**
```bash
curl -X POST http://localhost:3010/api/eagle/connectors/shinobi/sync
```
After Shinobi has monitors + MediaMTX is wired, this call ingests them into MINDEX `eagle_video_sources`.

### Claude Lane — Code

**1.6 Widget fallback to cam-snapshot when stream_url fails**
Currently VideoWallWidget picks `directEmbed = stream_url || embed_url` then tries HLS → iframe. If both fail (CORS / timeout / 404), the widget stays blank.

Add fallback chain in `components/crep/eagle-eye/VideoWallWidget.tsx`:
```typescript
// 1. Try directEmbed (stream_url)
// 2. On HLS error event → swap to SnapshotProxyVideo via /api/eagle/cam-snapshot
// 3. If snapshot proxy 404s → show provider logo + "live feed offline" state
```
Wire the `<video>` `onerror` handler to flip state → re-render as SnapshotProxyVideo.

**1.7 Expand cam-snapshot allowlist for SD primary cams**
Check `app/api/eagle/cam-snapshot/route.ts` `ALLOW_HOSTS` — add any SD-specific provider hosts not in the 30-host list (Surfline CDN, Caltrans D11 specifically, CBP bwt.cbp.gov).

**1.8 SD-primary filter on VideoWallWidget**
Add a training toggle in the widget: when enabled, hide non-SD cameras. Filter by `source.provider` being in `[shinobi, caltrans, surfline, cbp, earthcam-sd]` or bbox `[-118, 32, -116, 34]` (SD + IB + TJ).

**1.9 Retry + diagnostic console logs**
Current widget silently fails. Add:
```typescript
console.log("[VideoWall] play attempt:", { id, url, stream_type })
console.warn("[VideoWall] HLS error:", event, "→ falling back to snapshot")
console.log("[VideoWall] snapshot proxy resolved:", snapshotUrl)
```

### Integration Checkpoint (1.10)
1. Cursor confirms `curl /a3fd4a3d/monitor/a3fd4a3d` returns JSON array of 10 monitors
2. Claude confirms widget renders via HLS OR falls through to snapshot on error
3. Morgan clicks a SD cam on map → widget opens with live video
4. If Shinobi is down, widget shows snapshot fallback without blank state

**Acceptance**: Morgan reports "video widgets now show SD cams" · **Effort**: 2–3 hr each lane

---

## Item 2 · P1-9 UCSD PFM Sewage Plume Live Feed

### Problem
Current: `TJ_OYSTER_PLUME` is hardcoded polygon approximations. Morgan asked for **live sewage + contaminations based on pfmweb.ucsd.edu**.

### Investigation done
- pfmweb.ucsd.edu → 200 OK, landing page only
- No documented public JSON endpoint
- Data is behind the visualization viewer
- SCCOOS (who hosts PFM) has an OPeNDAP server for underlying model data

### Cursor Lane — Ops / Negotiation

**2.1 Contact Scripps for API access**
Email falk-petersen@ucsd.edu (SCCOOS PI) or feliks.dezsi@sccoos.org (data manager):
- Request read-only API access to PFM daily forecast grids
- Ask for OPeNDAP/THREDDS endpoint URL
- Standard Academic → Academic partnership; typical response time 3–5 business days

**2.2 Set up SCCOOS creds in env**
Once API endpoint + key granted:
```bash
# /opt/mycosoft/website/.env
SCCOOS_PFM_ENDPOINT=https://erddap.sccoos.org/erddap/griddap/pfm_sd_daily
SCCOOS_PFM_TOKEN=<issued>
```

**2.3 MINDEX destination table**
Create `crep.pfm_plume_forecasts` with columns: `(id, issued_at, valid_from, valid_to, contour_pct, geometry geography, flow_m3s)`. Allow PostGIS spatial index on `geometry`.

### Claude Lane — Code

**2.4 Create `/api/crep/oyster/plume` live route**
New file `app/api/crep/oyster/plume/route.ts`:
- Fetch SCCOOS OPeNDAP grid for current day
- Extract contours at probability thresholds (0.25, 0.50, 0.75) → GeoJSON Polygons
- POST to MINDEX `crep.pfm_plume_forecasts`
- Return GeoJSON to browser with 15 min edge cache

**2.5 Scraper fallback (interim, while awaiting API)**
`app/api/crep/oyster/plume/scrape-fallback/route.ts`:
- Headless render pfmweb.ucsd.edu plume viewer via Playwright
- Parse the rendered SVG/Canvas to reconstruct contours
- Cache 6 hr — this is the interim solution while SCCOOS API negotiation completes

**2.6 Wire live data into TijuanaEstuaryLayer**
Replace hardcoded `TJ_OYSTER_PLUME` in `/api/crep/tijuana-estuary/route.ts` with `fetch('/api/crep/oyster/plume')`.
Layer already renders `data.plume.outer` + `data.plume.core` — no layer changes needed.

**2.7 Temporal animation**
Add animation slider to VideoWallWidget or a new PlumeTimeline component that scrubs the PFM forecast hours (0h, 6h, 12h, 24h, 48h, 72h) and updates plume polygons as user scrubs.

### Integration Checkpoint (2.8)
- Cursor: SCCOOS API key active in `.env`
- Claude: `/api/crep/oyster/plume` returns live JSON
- Morgan: sees plume polygons update every 15 min with live flow

**Acceptance**: Live plume boundary changes hourly · **Effort**: 2 hr Claude code + 3–5 day wait for API creds

---

## Item 3 · P1-10 NASA EMIT Live Methane / Mineral Dust

### Problem
Current: 3 hardcoded `TJ_OYSTER_EMIT_PLUMES` samples. Need live pull from earth.jpl.nasa.gov/emit.

### Cursor Lane — Ops / Earthdata

**3.1 Earthdata Login creds**
NASA EMIT data requires Earthdata Login. Credential already exists in `.env.local`:
```bash
EARTHDATA_USERNAME=<configured>
EARTHDATA_PASSWORD=<configured>
```
Confirm with `curl -u $EARTHDATA_USERNAME:$EARTHDATA_PASSWORD https://e4ftl01.cr.usgs.gov/EMIT/EMITL2BCH4PLM.001/` returns directory listing.

**3.2 Create MINDEX table `crep.emit_plumes`**
`(id, instrument, overpass_utc, gas, intensity, geometry geography, granule_id, download_url)` — PostGIS index on geometry + overpass_utc.

**3.3 systemd timer for daily pull**
```
/etc/systemd/system/emit-pull.timer
OnCalendar=daily
Persistent=true
```
Service runs `/usr/local/bin/emit-ingest.py` which:
- Lists new EMIT granules via CMR STAC API (`cmr.earthdata.nasa.gov/stac/LPCLOUD`)
- Filters bbox intersecting `[-118, 32, -116, 34]` (SD region)
- Downloads CSV of detected plumes
- UPSERTs into MINDEX

### Claude Lane — Code

**3.4 EMIT connector route**
`app/api/eagle/connectors/emit/route.ts`:
```typescript
// Query MINDEX crep.emit_plumes for last 30 days, bbox-filtered
// Return GeoJSON FeatureCollection of plume detection points
```

**3.5 STAC client for initial backfill**
`scripts/etl/crep/emit-stac-backfill.mjs`:
- Use NASA CMR STAC API
- Search collection `EMITL2BCH4PLM_001` (methane) + `EMITL2BMINGR_001` (minerals) for SD bbox
- Download + parse L2B CSV granules
- Bulk-insert to MINDEX

**3.6 Wire into TijuanaEstuaryLayer**
Replace hardcoded `TJ_OYSTER_EMIT_PLUMES` with `fetch('/api/eagle/connectors/emit?bbox=...')`. Layer already renders `data.emit_plumes` as heatmap + dots — no layer changes.

**3.7 Temporal filter**
EMIT overpass is roughly 2x/day. Show last 7 days by default; add toggle for "last 24 h only / last 7 d / last 30 d" in the Eagle Eye control panel.

### Integration Checkpoint (3.8)
- Cursor: EMIT systemd timer running + MINDEX has 30 days of plumes
- Claude: `/api/eagle/connectors/emit` returns live JSON
- Morgan: Oyster map shows NASA EMIT methane + mineral dust detections with timestamps

**Acceptance**: Fresh EMIT detections appear within 24 hr of satellite overpass · **Effort**: 4 hr Claude + 2 hr Cursor

---

## Item 4 · P2 MINDEX Preload (Permanent Cache for Fast Nature Load)

### Problem
Morgan: "permanent preloaded things faster load of nature data and more access to cameras sensors and air water and ground quality data."

Current: iNat fetch on every Tijuana/Mojave endpoint call (3 s → 9 s per region). No pre-warmed cache.

### Cursor Lane — MAS / Cron

**4.1 MAS Python worker `nature-preload.py`**
```python
# Runs every 6 hours via systemd timer
# For each project bbox (Oyster + Goffs + future):
#   1. Pull 200 iNat observations in bbox (research-grade + needs-ID)
#   2. Pull 200 GBIF occurrences (cross-validate)
#   3. Pull 100 eBird recent sightings
#   4. De-duplicate by taxon_id + observed_on + lat/lng (±0.0001°)
#   5. UPSERT into crep.project_nature_cache
```
Systemd timer: `OnCalendar=*:0/6` (every 6 hours).

**4.2 MINDEX table `crep.project_nature_cache`**
```sql
CREATE TABLE crep.project_nature_cache (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,  -- "oyster" | "goffs"
  source TEXT NOT NULL,       -- "inat" | "gbif" | "ebird"
  source_id TEXT,
  observed_on DATE,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  taxon_id INTEGER,
  taxon_name TEXT,
  common_name TEXT,
  iconic_taxon TEXT,
  photo_url TEXT,
  observer TEXT,
  quality_grade TEXT,
  raw_properties JSONB,
  indexed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_pnc_project_observed ON crep.project_nature_cache(project_id, observed_on DESC);
CREATE INDEX idx_pnc_geo ON crep.project_nature_cache USING GIST (ST_MakePoint(lng, lat));
```

**4.3 Monitoring**
Add `mas.project_nature_preload_status` health check so MYCA dashboard shows last successful preload + observation count per project.

### Claude Lane — Code

**4.4 Fast-path route `/api/crep/nature/preloaded`**
New file `app/api/crep/nature/preloaded/route.ts`:
- Accepts `?project=oyster` or `?project=goffs`
- Queries MINDEX `crep.project_nature_cache` (target: <200 ms P99)
- Returns normalized GeoJSON-ready array

**4.5 Swap in Oyster + Goffs endpoints**
Replace the `fetchINatOyster()` / `fetchINatGoffs()` calls in `/api/crep/tijuana-estuary` + `/api/crep/mojave` with:
```typescript
// Preloaded cache first (fast, no upstream hit)
const cached = await fetch('/api/crep/nature/preloaded?project=oyster')
if (cached.ok) return await cached.json()
// Live iNat fallback if cache miss or empty
return fetchINatLive(...)
```
This drops observation-fetch latency from 9 s → <500 ms.

**4.6 SSE live-append stream**
Open-ended: `app/api/crep/nature/live-stream/route.ts` uses EventSource to push new iNat observations as they arrive in MINDEX (polled by MAS every 60 s). Frontend subscribes once; gets both preloaded + live-delta without re-fetching.

**4.7 Cache-warming for new projects**
When Morgan adds a new project to `FlyToProjects.MYCOSOFT_PROJECTS`, the preload job auto-detects and starts caching for that bbox without code changes. Cursor reads the list from the repo via MAS file sync.

### Integration Checkpoint (4.8)
- Cursor: `nature-preload.py` has run successfully (check `mas.project_nature_preload_status`)
- Claude: `/api/crep/nature/preloaded?project=oyster` returns in <200 ms with ≥100 observations
- Morgan: CREP loads Oyster iNat dots instantly (no 9 s wait)

**Acceptance**: Oyster/Goffs nature dots appear on map within 500 ms of layer toggle · **Effort**: 4 hr Claude + 3 hr Cursor

---

## Execution Timeline (Parallel)

```
  T0 ─────────────────────────────── T+4h ───────────── T+1 day ────────────── T+5 days
                                                                              (SCCOOS creds)

Cursor lane
├─ 1.1-1.5  Shinobi SD monitor creation         (2 hr)
├─ 2.1      Scripps email                       (10 min)
├─ 3.1-3.3  EMIT systemd timer + MINDEX table  (2 hr)
└─ 4.1-4.3  nature-preload.py + cron            (3 hr)

Claude lane
├─ 1.6-1.9  VideoWall fallback + SD filter      (2 hr)  [can start immediately]
├─ 2.4-2.7  PFM route + scraper fallback        (2 hr)  [2.5 scrape unblocks early]
├─ 3.4-3.7  EMIT STAC client + connector        (4 hr)
└─ 4.4-4.7  Preload route + SSE + swap-in       (4 hr)

Checkpoints
├─ 1.10 after Cursor 1.5 + Claude 1.6           (T+2h)
├─ 2.8  after Cursor 2.2 (awaits creds)         (T+5d)  — use 2.5 scrape meanwhile
├─ 3.8  after Cursor 3.3 + Claude 3.4           (T+6h)
└─ 4.8  after Cursor 4.1 + Claude 4.4           (T+7h)
```

**Critical path**: PFM live (item 2) is blocked by Scripps API negotiation — use scrape fallback (2.5) immediately so Oyster still shows live plume data within T+4h.

---

## Handoff Protocol

- **Cursor writes back to this doc** with completion status under each item (insert a "✅ Cursor done @ <timestamp>" line)
- **Claude writes back with commits** (link SHAs under each sub-item)
- **Integration blocked?** Morgan tags in chat "integration point X.Y ready" — the other side kicks in

---

## What Morgan Doesn't Do

- No ops work — Cursor runs everything on the VM
- No code work — Claude handles all repo edits
- **Only** the validation click-throughs when checkpoints are hit

---

**Plan ready. Ping Cursor with `docs/CREP_DEFERRED_PARALLEL_PLAN.md` and I'll start Claude-lane items in parallel.**
