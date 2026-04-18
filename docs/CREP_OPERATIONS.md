# CREP — Operations & Data-Source Reference

**Mycosoft CREP** (Common Relevant Environmental Picture)
Version: Apr 17, 2026 · Baseline: **CUI//SP-EXPT**
Entry point: https://mycosoft.com/dashboard/crep (Earth icon on home page)

---

## 1. Domain coverage

CREP is a real-time 3D globe providing continuously-updated situational
awareness across six operational domains. Every claim below is backed by
a concrete registry, route, or bundled dataset in this repo.

| Domain | Target | Source of truth |
|---|---|---|
| **AIR** | 135k+ daily flights · 12k–15k airborne any moment | `lib/crep/registries/aircraft-registry.ts` · 5-source ADS-B aggregator (OpenSky + FlightRadar24 + ADS-B Exchange + ADSB.lol + MINDEX archive), dedup by ICAO hex |
| **MARITIME** | 112k+ vessels · 3,600+ seaports | `lib/crep/registries/vessel-registry.ts` · 8-source AIS (AISstream WebSocket + MarineTraffic + VesselFinder + BarentsWatch + DMA + GFW + AISHub + Mycosoft-SDR), plus `lib/crep/registries/port-registry.ts` (WPI/NGA Pub 150 + MarineCadastre + OSM + MINDEX) |
| **SPACE** | 14k active satellites · 44k+ tracked objects · 1.2M sub-catalog debris | `lib/crep/registries/satellite-registry.ts` + `orbital-object-registry.ts` + `debris-registry.ts` · CelesTrak active + SatCat full + analyst + Space-Track + UCS + N2YO + JSC Vimpel; debris both catalogued (tracked TLEs) and statistical (NASA ODPO ORDEM 3.2 Monte-Carlo sample rendered as canvas cloud) |
| **GROUND INFRA** | 35k power plants, 167 countries · 710+ submarine cables (1.9M km) · 7M+ km transmission lines · 10M+ cell towers · 44k+ radio stations | `power-plant-registry` (WRI bundle 34,936 + EIA + OSM + MINDEX) · `public/data/crep/submarine-cables.geojson` (TeleGeography 710 cables) · `transmission-lines-global` (HIFLD US 22,760 + OSM Overpass + GridFinder + MINDEX) · `cell-tower-registry` (OpenCelliD 47M + FCC ASR + OSM + MINDEX) · `radio-station-registry` (Radio-Browser 35k + FCC LMS + KiwiSDR) · `factory-registry` (Climate TRACE + GEM + OSM) |
| **NATURE / BIODIVERSITY** | 300M+ iNat observations · 3B+ GBIF records | `lib/crep/inat-etl.ts` + `scripts/inat-backfill-parallel.ts` (30-shard ~17h full scrape) + `/api/crep/nature-stream` SSE live push · `/api/oei/gbif`, `/api/oei/obis`, `/api/oei/ebird` proxies |
| **ENVIRONMENTAL** | 10k+ AQ stations · Earth-2 70+ variables @ 2.5 km · weather clouds/rain/spore | `/api/oei/openaq` · `components/crep/earth2/*` (cloud, precipitation, humidity, pressure, wind-vector, storm-cells, spore-dispersal layers) · `/api/oei/sun-earth-correlation` (solar flares → earthspots + sunspot↔cyclone hypothesis overlay) |

---

## 2. Repository layout

```
app/
├── api/
│   ├── oei/                     # One-Earth-Intelligence live data routes
│   │   ├── aisstream/           # AIS WebSocket bridge
│   │   ├── cell-towers-global/  # OpenCelliD + FCC ASR + OSM + MINDEX
│   │   ├── debris/              # catalogued + statistical 1.2M cloud
│   │   ├── eonet/               # NASA natural-event tracker (5k cap)
│   │   ├── factories/           # Climate TRACE + OSM + GEM + MINDEX
│   │   ├── flightradar24/
│   │   ├── gbif/
│   │   ├── obis/
│   │   ├── opensky/
│   │   ├── openaq/
│   │   ├── orbital-objects/     # 64k SatCat + analyst, filter by orbit/alt/country
│   │   ├── ports/               # Global seaports multi-source
│   │   ├── power-plants/        # WRI + EIA + OSM + MINDEX, filter by fuel
│   │   ├── radar/               # NEXRAD + Mycosoft SDR + FAA ASR
│   │   ├── radio-stations/      # Radio-Browser + KiwiSDR + FCC LMS
│   │   ├── satellites/          # CelesTrak + Space-Track + UCS + N2YO
│   │   ├── sdr/listen/          # stream | sdr | mycosoft tuning modes
│   │   ├── space-weather/
│   │   ├── submarine-cables/
│   │   ├── sun-earth-correlation/  # flares → earthspots + sunspot↔cyclone
│   │   └── transmission-lines-global/
│   ├── earth2/                  # Earth-2 weather stack
│   │   ├── forecast/            # 15-day global
│   │   ├── nowcast/             # 0-6h storm prediction
│   │   ├── spore-dispersal/
│   │   └── layers/
│   ├── crep/
│   │   ├── fungal/              # iNat deep fallback with regional fanout
│   │   ├── nature-stream/       # SSE live observations push
│   │   └── species/
│   ├── etl/
│   │   ├── inat/sync/           # cron delta sync
│   │   ├── inat/backfill/       # chunked bulk backfill
│   │   └── mindex-sync/         # 20-source unified MINDEX pusher
│   └── mindex/ingest/[type]/    # 25 accepted entity types, dedupe by id
│
├── dashboard/crep/
│   ├── CREPDashboardClient.tsx  # Main dashboard (6,500+ lines)
│   ├── CREPDashboardLoader.tsx  # Phone fallback + animated loader
│   └── page.tsx                 # Thin wrapper
│
components/crep/
├── earth2/                      # Weather layers
├── layers/                      # Map overlay components
│   ├── aurora-overlay.tsx       # NOAA SWPC, default OFF
│   ├── gibs-base-layers.tsx     # NASA GIBS satellite imagery
│   ├── proposal-overlays.tsx    # 9 new Army-proposal overlays in one wrapper
│   ├── signal-heatmap-layer.tsx
│   └── sun-earth-impact-layer.tsx  # Live solar→earth bullseye + cyclone lines
├── flight-tracker-widget.tsx    # Detailed aircraft SVG per row
├── satellite-tracker-widget.tsx # Detailed satellite SVG per row
├── vessel-tracker-widget.tsx    # Detailed ship SVG per row
└── ...
│
lib/crep/
├── registries/                  # Multi-source fan-out, dedup, per-source timing
│   ├── aircraft-registry.ts
│   ├── cell-tower-registry.ts
│   ├── debris-registry.ts
│   ├── factory-registry.ts
│   ├── orbital-object-registry.ts
│   ├── port-registry.ts
│   ├── power-plant-registry.ts
│   ├── radar-registry.ts        # 160 NEXRAD stations bundled inline
│   ├── radio-station-registry.ts
│   ├── satellite-registry.ts
│   └── vessel-registry.ts
├── inat-etl.ts                  # delta + bulk backfill + MINDEX POST
├── mindex-sync-all.ts           # 20-source unified pipeline (5-min cron)
├── sgp4-propagator.ts           # Live satellite position propagation
├── satellite-animation.ts       # rAF SGP4 render loop
├── static-infra.ts              # 74 major ports + 44 hyperscale DCs inline
└── sun-earth-correlation.ts     # Subsolar, flare, CME, aurora, cyclone math
│
public/
├── crep/icons/
│   ├── aircraft.svg             # Detailed plane sprite (64×64, real art)
│   ├── satellite.svg            # Solar panels + dish + antennas
│   └── vessel.svg               # Hull + bridge + stack + lifeboats
└── data/
    ├── military-bases-us.geojson
    └── crep/
        ├── power-plants-global.geojson       # 34,936 / 167 countries (WRI v1.3.0)
        ├── submarine-cables.geojson          # 710 real TeleGeography routes
        ├── submarine-cable-landings.geojson  # 1,910 landings
        ├── transmission-lines-us-major.geojson  # 22,760 US ≥345kV
        ├── substations-us.geojson            # 76,065 HIFLD substations
        ├── cell-towers-us.geojson            # 192 OSM comm towers (expand via OpenCelliD)
        ├── ports-global.geojson              # 3,804 WPI/NGA Pub 150 ports
        └── README.md                         # Attribution + licenses

scripts/
├── inat-backfill.ts             # Single-worker 300M scrape
├── inat-backfill-parallel.ts    # 30-shard ~17h parallel scrape
└── etl/crep/
    └── fetch-ports-wpi.ts       # WPI CSV → GeoJSON + MINDEX POST

.github/workflows/
├── inat-delta-sync.yml          # Every 10 min
└── mindex-sync-all.yml          # Every 5 min — pulls 20 sources → MINDEX
```

---

## 3. MINDEX ingestion

### Accepted ingest types (POST /api/mindex/ingest/[type])
```
aircraft, vessels, satellites, events, weather, telemetry,
lightning, fires, smoke, spores, debris,
ports, submarine-cables, transmission-lines, power-plants,
cell-towers, radio-stations, radar, factories, orbital-objects,
nature-observations, gbif-occurrences, obis-occurrences,
air-quality, earthspots
```

### Payload contract
```json
{
  "source": "string",
  "timestamp": "ISO-8601",
  "data": [{ "id": "...", /* ...arbitrary fields... */ }],
  "metadata": { "dedupe_key": "id" }
}
```

### Sync schedules
- **iNat delta** — every 10 min via `.github/workflows/inat-delta-sync.yml`
- **iNat bulk backfill** — manual: `npx tsx scripts/inat-backfill-parallel.ts --shards=30 --maxId=300000000` (30 parallel workers, ~17h for full 300M)
- **MINDEX sync-all** — every 5 min via `.github/workflows/mindex-sync-all.yml` → POST `/api/etl/mindex-sync` → fans out 20 sources, chunk-POSTs 2,000 records per batch, returns per-sink timing + grand totals

### Required environment
| Variable | Used for | Source |
|---|---|---|
| `ETL_CRON_TOKEN` | Cron endpoint auth | GitHub Actions secret |
| `SITE_URL` | Ingress base URL | GitHub Actions secret (e.g. https://mycosoft.com) |
| `MINDEX_API_URL` | PostGIS backend | 192.168.0.189:8000 (internal) |
| `MINDEX_API_KEY` | MINDEX auth | shared internal |
| `OPENCELLID_KEY` | 47M cell tower catalog | opencellid.org (free key) |
| `SPACETRACK_USER`, `SPACETRACK_PASS` | Full 44k orbital catalog | space-track.org (free account) |
| `MAS_URL`, `MAS_BRIDGE_TOKEN` | Mycosoft SDR tuning relay | Internal MAS |
| `AISSTREAM_API_KEY` | Live AIS WebSocket | aisstream.io (free tier) |
| `MARINETRAFFIC_API_KEY` | MarineTraffic fallback | commercial |
| `NASA_API_KEY` | DONKI CME quota | api.nasa.gov (free, raises DEMO_KEY limit) |

---

## 4. Live entity rendering — architecture

- **Permanent infra** (ports, cables, lines, substations, power plants) — bundled GeoJSON in `public/data/crep/`, paints instantly on map load, ZERO MINDEX round-trips unless user pans to non-bundled region.
- **Live movement** (aircraft, vessels, satellites) — pulled from OEI routes every 30–60 s, merged into map via direct `setData()` on MapLibre sources. Satellites additionally animated via rAF SGP4 propagation at 1 FPS.
- **Events** (fire/quake/storm/volcano/aurora) — pulled every 60 s, capped per zoom level (600 at world view → 10k at regional) to keep React marker render budget sane.
- **Dead-reckoning** — aircraft + vessels interpolate positions between pulls using `lng = lng₀ + velLng × dt` so motion is smooth at 5 FPS without hitting the upstream API.

### Whole-line selection
Clicking any submarine cable or transmission line calls `gatherLineByGroupId(map, sourceId, cable_id)` which scans `querySourceFeatures` for every segment sharing the same ID and unions them into a `MultiLineString` — then highlights end-to-end and `fitBounds()` pulls the full route into view.

### Sun ↔ Earth correlation
`/api/oei/sun-earth-correlation` fuses NOAA SWPC Solar Region Summary + GOES X-ray flare list + NASA DONKI CME predictions + NOAA Ovation aurora power + NOAA NHC active cyclones and returns:
- **Subsolar earthspot** — moving yellow dot, Sun's instantaneous footprint on Earth
- **Flare dayside footprint** — red great-circle polygon on the lit hemisphere, sized by X-ray class
- **CME arrival bullseye** — magenta point at predicted arrival coords plus north+south auroral ovals widened by predicted Kp
- **Ovation auroral ovals** — green rings, invariant latitude from hemispheric-power GW
- **Correlation lines** — dashed purple from complex active regions (βγ/βγδ magnetic class) to each live tropical cyclone. Labelled hypothesis overlay.

---

## 5. Performance defaults (Apr 17, 2026)

Too many layers ON at once was crashing the dashboard. First-paint defaults:

| Layer | Default |
|---|---|
| Aircraft · Vessels · Satellites · Nature · Military · Power plants (existing infra) | **ON** |
| Earth-2 clouds / precipitation / spore-dispersal / storm-cells | **OFF** (raster-heavy, user opts in) |
| Aurora forecast | **OFF** (image-source can AJAXError) |
| Global seaports (3,600+) | **OFF** (toggle ON from Data Filters) |
| Sun→Earth impact | **OFF** (polls 5 upstreams every 60 s) |
| Global factories / cell towers / radio stations / radar / transmission lines / orbital debris / debris cloud | **OFF** |

Event render budget per zoom:
- **zoom < 2** → 600 markers (critical + high severity)
- **zoom < 3** → 1,500
- **zoom < 5** → 3,500
- **zoom ≥ 5** → 10,000 (regional — render all in-view)

Upstream data is never capped — only the DOM marker count.

---

## 6. Device integration (Mycosoft SDR)

Mushroom1, Hyphae1, and Psathyrella devices ship with over-the-shelf SDR units that can operate as passive radar / ADS-B / Mode-S / AIS receivers.

- `lib/crep/registries/radar-registry.ts` → `fromMycosoftDevices()` calls `/api/ground-station/hardware?capability=radar,sdr` and merges each device into the live radar-sites list.
- `/api/oei/sdr/listen?mode=mycosoft&deviceId=hyphae1&frequency_khz=14200&band=usb` routes tune commands through `GroundStationProvider` → MAS bridge → device SDR.
- Public-SDR mode (`mode=sdr&sdrUrl=http://kiwisdr.example/&frequency_khz=...&band=usb`) mints a KiwiSDR WebSocket URL for direct tuning.
- Internet-radio mode (`mode=stream&url=https://...`) proxies Icecast/Shoutcast streams through the server to bypass CORS.

---

## 7. Error resilience

- **Every upstream call is time-boxed** (8 – 30 s depending on source).
- **Per-source error isolation** — one failing source never blocks others in any registry.
- **MINDEX-push is fire-and-forget** — main response never waits on MINDEX.
- **MapLibre AJAX rejections** are silenced at window level (they're non-fatal — only affect the one image source that failed).
- **Click-handler wrap** — `highlightFromEvent` has an outer try/catch so bad feature data can never crash the tree.
- **Dynamic-import chunk failures** — the three most crash-prone layer components (`signal-heatmap-layer`, `gibs-base-layers`, `aurora-overlay`) are STATIC imports in `CREPDashboardClient` to avoid HMR `ChunkLoadError`.

---

## 8. Licensing & attribution (bundled datasets)

- **WRI Global Power Plant Database** — CC-BY 4.0 (Global Energy Observatory / WRI)
- **NGA World Port Index Pub 150** — US Government public domain
- **TeleGeography submarine cables** — free with attribution
- **HIFLD substations + transmission lines** — CC-BY 4.0 (via SeerAI archive post-Aug-2025)
- **NEXRAD stations** — US Government public domain
- **NASA EONET** — open
- **NOAA SWPC** — open

See `public/data/crep/README.md` for per-file attribution strings.
