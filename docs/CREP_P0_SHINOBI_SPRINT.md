# CREP P0 Shinobi Sprint — Cursor Ops Checklist

**Created:** Apr 21, 2026 · Morgan priority call: **Item 1 (Video + Shinobi) is P0 for this week.**

Morgan's direct ask: "we will not have any open provider links no one will be directed to leave crep all data will be within its widgets live including video streams."

**Claude's lane (code) is already in-flight** — see the commit for this doc. This file is the **Cursor ops checklist** for the Shinobi/MediaMTX backend work that Claude can't do without VM access.

---

## Cursor's lane — exact commands + order

### Pre-flight (2 min)
```bash
ssh mas-188
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -iE "shinobi|mediamtx"
# Expect: shinobi container healthy on :8080, mediamtx on :8554/:8888/:8889
```

If either container is not running:
```bash
cd /opt/mycosoft/media-stack
docker compose up -d shinobi mediamtx
sleep 15
docker compose logs shinobi mediamtx --tail 80
```

### 1.2 Validate keys (3 min)
Open `http://192.168.0.188:8080` in a browser.
- Default creds: `moe@m0e.email` / `moe` (unless Morgan changed).
- **Admin → API Keys**: confirm `a3fd4a3d` exists with read + control.
- **Groups**: confirm group key `a3fd4a3d` is active.

If either is missing or rotated, regenerate and update:
```bash
# Morgan's local .env.local + prod .env on 187
# Sync both so dev + prod use same keys
echo "SHINOBI_API_KEY=<new-key>" >> /opt/mycosoft/website/.env
echo "SHINOBI_GROUP_KEY=<new-group>" >> /opt/mycosoft/website/.env
```

### 1.3 Create the 10 SD training monitors (20 min)
**Shinobi UI → Add Monitor** × 10. For each:
- **Mode**: Record → Continuous (or Watch-Only if Morgan wants zero disk)
- **Source Type**: HLS (URL) for surf/skyline cams; RTSP for any future native-RTSP cams
- **Details → Monitor Map**: fill `crep_lat` + `crep_lng` (this is how the connector picks up coordinates — non-negotiable)

| # | Shinobi Name              | Source URL                                                                                   | crep_lat | crep_lng   |
|---|---------------------------|----------------------------------------------------------------------------------------------|----------|------------|
| 1 | SD_IB_PIER                | https://www.surfline.com/surf-report/imperial-beach/5842041f4e65fad6a7708bff                  | 32.5789  | -117.1342  |
| 2 | SD_CORONADO_CENTRAL       | https://www.surfline.com/surf-report/coronado/5842041f4e65fad6a77080a5                        | 32.6859  | -117.1831  |
| 3 | SD_SUNSET_CLIFFS          | https://www.surfline.com/surf-report/sunset-cliffs/5842041f4e65fad6a7708826                   | 32.7200  | -117.2550  |
| 4 | SD_SCRIPPS_PIER           | https://www.surfline.com/surf-report/scripps/5842041f4e65fad6a77088a2                         | 32.8666  | -117.2573  |
| 5 | SD_MISSION_BEACH          | https://www.surfline.com/surf-report/mission-beach/5842041f4e65fad6a7708802                   | 32.7701  | -117.2528  |
| 6 | SD_LA_JOLLA_COVE          | https://www.earthcam.com/usa/california/lajolla/?cam=lajollacove                              | 32.8502  | -117.2727  |
| 7 | SD_HOTEL_DEL_CORONADO     | https://www.earthcam.com/usa/california/coronado/                                             | 32.6803  | -117.1767  |
| 8 | SD_CALTRANS_I5_CORONADO   | https://cwwp2.dot.ca.gov/vm/loc/d11/i5n_main.htm                                              | 32.6800  | -117.1580  |
| 9 | SD_CALTRANS_SR75_STRAND   | https://cwwp2.dot.ca.gov/vm/loc/d11/sr75_silverstrand.htm                                     | 32.6600  | -117.1500  |
| 10| SD_DOWNTOWN_SKYLINE       | https://www.windy.com/webcams/1175537077                                                      | 32.7157  | -117.1611  |

Shinobi can't natively pull from provider viewer pages (surfline/earthcam/windy/caltrans) — these are proxied via the **cam-snapshot** route already. For those 10 entries, set Shinobi monitor **Type = "Still"** (Image URL mode) pointing at:
```
http://192.168.0.187:3000/api/eagle/cam-snapshot?url=<encoded source url>&selector=video
```
Shinobi polls the snapshot URL every 10 s and stores the JPEG; MediaMTX republishes to any consumer.

### 1.4 Wire Shinobi → MediaMTX (5 min)
Verify MediaMTX yml has the paths defined:
```bash
cat /opt/mycosoft/media-stack/mediamtx.yml | grep -A2 "shinobi-sd-"
```

If empty, append:
```yaml
paths:
  shinobi-sd-ib-pier:
    source: http://localhost:8080/a3fd4a3d/hls/a3fd4a3d/SD_IB_PIER/s.m3u8
  shinobi-sd-coronado-central:
    source: http://localhost:8080/a3fd4a3d/hls/a3fd4a3d/SD_CORONADO_CENTRAL/s.m3u8
  # ... (8 more, one per monitor)
```
Then `docker compose restart mediamtx`.

### 1.5 Seed MINDEX (3 min)
```bash
curl -s -X POST http://192.168.0.187:3000/api/eagle/connectors/shinobi/sync | jq
# Expect: {"synced": 10, "ingested_to_mindex": 10}
```

Verify:
```bash
curl -s "http://192.168.0.189:8000/api/mindex/earth/map/bbox?layer=eagle_video_sources&bbox=-117.3,32.5,-117.0,32.9&limit=50" | jq '.entities | length'
# Expect: 10
```

### 1.6 Cloudflare purge (1 min) — prod only
If pushing this to prod:
```bash
cd /opt/mycosoft/ops
./scripts/cf-purge.sh "mycosoft.com/api/eagle/*" "mycosoft.com/api/crep/*"
```

### Acceptance
Morgan clicks any SD-area camera dot on CREP map → **video frame renders inside the widget**, no external link, no "open provider site" fallback.

---

## Claude's lane — what I'm shipping this commit (parallel)

**No waiting required** — these land on main as soon as the commit does:

1. **Kill the "open provider site" fallback everywhere** in `VideoWallWidget.tsx` —
   `INFO_ONLY_PROVIDERS` is now empty, `ProviderInfoCard` replaced with `NoStreamStatusTile` that stays inside CREP (no external `<a>` link).

2. **Snapshot selector chain** — when the first CSS selector returns 0B, advance to next: `video → img → canvas → body (fullpage)`. A 502 from cam-snapshot triggers the next candidate automatically. `mode=fullpage` added to the cam-snapshot route.

3. **Cameras without real streams removed from map** — `/api/crep/tijuana-estuary` filtered to 15 cameras with `has_stream: true`. CBP POE entries (no video, wait-times page only) dropped. TijuanaEstuaryLayer now filters at render time to ONLY dots with a stream.

4. **Anti-overlap jitter** — deterministic per-id sub-pixel offset (~1.5 m max) on oyster-sensors + oyster-cameras so co-located entities (IB pier = cam + AQS + NDBC + SDAPCD) don't share a hit-test cell. Clicks resolve cleanly to each.

5. **NDBC buoy matcher extended** — OysterSiteWidget now auto-detects `sens-ndbc-*`, `sens-buoy-*`, any id containing a 4-5 digit station code, OR `kind:"buoy"`. All three Oyster buoys (46225 / 46231 / 46232) now live-fetch to widget without manual wiring.

---

## Pipeline audit (this commit also adds)

### MINDEX reachability
```
http://192.168.0.189:8000/health → 200 (8 ms)
/api/mindex/earth/map/bbox → serving permanently
```

### CREP → MINDEX data flow (verified live)
| Layer | MINDEX? | Live feed? | Status |
|---|---|---|---|
| Aircraft (FR24 + OpenSky + ADSBlol) | yes | 30 s pump + circuit breaker | ✓ |
| Vessels (AISstream) | yes | 30 s pump + circuit breaker | ✓ |
| Satellites (CelesTrak + MINDEX registry) | yes | 30 s pump | ✓ |
| Buoys (NDBC) | partial | on-click live via `/api/crep/buoy/[station]` | ✓ live |
| Camera sources (eagle_video_sources) | yes | Shinobi sync pending Cursor 1.5 | pending |
| iNat observations | yes | 6 h preload pending Cursor lane 4 | pending cache |
| NPS MOJA boundary | yes via /api/crep/mojave | live on layer fetch | ✓ |
| SDAPCD H2S + IBWC discharge | yes via /api/crep/tijuana-estuary | bundled CSV + live latest | ✓ |
| UCSD PFM plume | partial | hardcoded polygons; live pending SCCOOS API | pending |
| NASA EMIT | partial | 3 hardcoded; live pending systemd timer | pending |

### WorldView API — how it needs to be updated
Current: `/api/worldview` (if exists) returns generic global state.

New requirement: aggregate the **live CREP pipeline** so third-party Mycosoft apps (MYCA voice, external widgets) can read a single JSON snapshot of everything rendered on the CREP globe.

Proposed route: `GET /api/worldview/snapshot?project=oyster|goffs|global`
Returns:
```json
{
  "generated_at": "ISO-8601",
  "project_bbox": [w, s, e, n],
  "live": {
    "aircraft_count": 2248,
    "vessel_count": 0,
    "satellite_count": 1583,
    "buoy_count": 769
  },
  "infrastructure": {
    "substation_count": 76065,
    "tx_line_count": 52244,
    "power_plant_count": 34936,
    "cell_tower_count": 615611
  },
  "project_data": {
    "oyster": { "anchor": {...}, "cameras": 15, "sensors": 40, "plume_active": true, "emit_detections": 3 },
    "goffs":  { "anchor": {...}, "cameras": 9,  "sensors": 12, "wilderness_pois": 8 }
  },
  "myca_middleware": {
    "mas_connected": true,
    "mindex_latency_ms": 8,
    "shinobi_monitors": 10
  }
}
```

This surfaces MYCA / PersonaPlex / external consumers to the same data as CREP in one call.

### MYCA + middleware integration
- PersonaPlex voice bridge: `ws://localhost:8999/ws/crep/commands` — **currently offline** (circuit-broken). Cursor: check `docker ps | grep personaplex` on MAS-188.
- MYCA entity stream: `ws://localhost:8001/api/entities/stream` — **currently offline** (circuit-broken). Cursor: check MAS entity-stream service.
- MindexClient in CREP uses `process.env.MINDEX_API_URL` (must be `http://192.168.0.189:8000`, NOT empty — the blue/green deploy bug Cursor already fixed).

---

## Handoff protocol

After each Cursor step completes, add a checkmark line in this doc:
```
✅ 1.1 done — Cursor @ 2026-04-21 15:42 · shinobi up, mediamtx up, keys valid
```

Claude won't re-read this doc automatically; ping with a short message after step 1.5 so I verify the MINDEX row count in browser.

---

## Integration checkpoint

1. Cursor confirms `curl http://localhost:8080/a3fd4a3d/monitor/a3fd4a3d | jq 'length'` returns 10
2. Cursor runs Shinobi → MINDEX sync (step 1.5)
3. Claude verifies `/api/eagle/sources?bbox=-117.3,32.5,-117.0,32.9` returns 10+ cameras with `has_stream: true`
4. Claude hard-reloads CREP, clicks a Coronado cam — video renders in widget

**Expected turnaround:** 35–45 min Cursor ops + 0 min Claude wait (Claude lane already shipped).
