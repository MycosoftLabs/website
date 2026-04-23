# Public Transit API Keys + Redundancy + Backup Tooling

**Apr 23, 2026 · Morgan's request: "give me links to get all needed api keys for all mass transportation public transit for the map and redundancies for registries in mindex and backup tooling to get to their public apps data if api fails"**

---

## 1. Tier 1 — Major US transit agencies (the NYC + DC + SF + LA demo)

For every agency below: GTFS static = schedule + stops (no live data, but the bedrock), GTFS-realtime = trip updates + vehicle positions + service alerts (~every 15-30 s).

### MTA (New York City) — **subway, bus, LIRR, Metro-North, bridges/tunnels**
- **Key signup:** https://api.mta.info/#/signup (free, no credit card)
- **Developer portal:** https://new.mta.info/developers
- **GTFS static:** https://rrgtfsfeeds.s3.amazonaws.com/gtfs.zip (no key)
- **GTFS-realtime endpoints** (one key unlocks all):
  - Subway ACE: `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace`
  - BDFM, G, JZ, NQRW, L, S, 1234567 each on their own URL (same pattern)
  - LIRR: `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/lirr%2Fgtfs-lirr`
  - Metro-North: `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/mnr%2Fgtfs-mnr`
  - Bus Time (all 5 boroughs): `http://gtfsrt.prod.obanyc.com/vehiclePositions`
- **Rate limits:** fair-use, typically 30 req/min. No hard limit on public users.
- **Env var:** `MTA_API_KEY` (legacy, still accepted) — new endpoints use `?key=` query param, no key also works for some feeds

### WMATA (DC Metro + Metrobus)
- **Key signup:** https://developer.wmata.com/Products (free, instant)
- **Developer portal:** https://developer.wmata.com/docs/services/
- **GTFS static:** `https://api.wmata.com/gtfs/rail-gtfs-static.zip` + `/bus-gtfs-static.zip`
- **GTFS-realtime:** `https://api.wmata.com/gtfs/rail-gtfsrt-vehiclepositions.pb` + trip-updates + alerts
- **Bus positions:** `https://api.wmata.com/Bus.svc/json/jBusPositions`
- **Rate limit:** 10 requests/sec, 50k calls/day on the free tier
- **Env var:** `WMATA_API_KEY` (header: `api_key`)

### Amtrak — already partially integrated
- **Track-A-Train public feed:** `https://maps.amtrak.com/rttl/js/RoutesList.v.json` (no key, undocumented but stable since 2018)
- **Official API:** Amtrak does NOT publish a public API. We reverse-engineer their Track-A-Train AJAX endpoints.
- **Backup:** Scrape https://www.amtrak.com/track-your-train — Playwright headless
- **Env var:** none required

### BART (San Francisco Bay Area)
- **Key signup:** https://api.bart.gov/api/register.aspx (free, instant)
- **Developer portal:** https://api.bart.gov/docs/overview/index.aspx
- **Feeds:** ETDs (estimated times of departure), real-time trains, advisories
- **Rate limit:** "reasonable use" — no hard cap documented
- **Env var:** `BART_API_KEY`

### LA Metro — subway + bus + rail
- **Key signup:** https://developer.metro.net/ (free)
- **Tokens:** Metro has GTFS + Swiftly vehicle tracking
- **Swiftly:** https://swiftly.com/developers — separate key for real-time bus
- **Env var:** `LA_METRO_API_KEY` + optionally `SWIFTLY_API_KEY`

### CTA (Chicago)
- **Key signup:** https://www.transitchicago.com/developers/traintracker/ (rail) + https://www.transitchicago.com/developers/bustracker/ (bus) — two separate keys
- **Rate limit:** 10 req/sec, 100 req/5min per key
- **Env var:** `CTA_TRAIN_TRACKER_API_KEY`, `CTA_BUS_TRACKER_API_KEY`

### MBTA (Boston)
- **Key signup:** https://api-v3.mbta.com/ → "Register" (free)
- **GTFS-realtime:** built into the REST API, no separate download
- **Rate limit:** 1000 req/min with key (free)
- **Env var:** `MBTA_API_KEY` (header: `x-api-key`)

### SEPTA (Philadelphia)
- **No key required** for public endpoints
- **Developer portal:** https://www.septa.org/developer/
- **Real-time:** https://www3.septa.org/beta/TrainView/index.html (regional rail), /TransitView/ (bus)
- **Env var:** none

### NJ Transit — rail + bus + light rail
- **Key signup:** https://developer.njtransit.com/ (free, requires account)
- **GTFS-realtime:** vehicle positions + trip updates for NJT rail
- **Bus:** MyBus endpoint is public but undocumented; free-use
- **Env var:** `NJTRANSIT_API_KEY`

### SFMTA (Muni, San Francisco)
- **Key signup:** https://511.org/open-data/token (free — 511.org umbrella covers whole Bay Area)
- **Coverage:** SFMTA Muni + AC Transit + VTA + SamTrans + Caltrain + ferries (one key)
- **Rate limit:** 60 req/min, 5k req/day on free tier
- **Env var:** `TRANSIT_511_API_KEY`

### Sound Transit (Seattle) + King County Metro
- **Key signup:** https://www.soundtransit.org/help-contacts/business-information/open-transit-data-otd (ST) + https://data.kingcounty.gov (metro)
- **OneBusAway Puget Sound API:** https://www.soundtransit.org/help-contacts/business-information/open-transit-data-otd/real-time-api
- **Env var:** `SOUND_TRANSIT_API_KEY`

### TriMet (Portland)
- **Key signup:** https://developer.trimet.org/appid/registration/ (free)
- **Env var:** `TRIMET_API_KEY`

### Caltrain — uses 511.org umbrella key (see SFMTA above)

### Metrolink (Southern California commuter rail)
- **No key required** for VP feeds — https://rtt.metrolinktrains.com/
- **Env var:** none

### DART (Dallas)
- **No key** for GTFS static; vehicle positions via https://www.dart.org/riding/realtimedata.asp (scrape-able JSON)
- **Env var:** none

### MARTA (Atlanta)
- **Key signup:** http://www.itsmarta.com/app-developer-resources.aspx (free)
- **Env var:** `MARTA_API_KEY`

### RTD (Denver)
- **Key signup:** https://www.rtd-denver.com/open-records/open-spatial-information/real-time-feeds (free)
- **Env var:** `RTD_DENVER_API_KEY`

---

## 2. Tier 2 — National aggregators (the "fail open" backup layer)

Whenever a Tier-1 agency API fails, fall through to these. All of them aggregate GTFS-realtime from the same agencies we already key individually.

### Transitland (Mapbox-hosted, free for research/small commercial)
- **Key signup:** https://www.transit.land/documentation#api-key (requires Mapbox account)
- **Endpoints:**
  - `GET https://transit.land/api/v2/rest/agencies?bbox=&api_key=`
  - `GET /api/v2/rest/routes?bbox=&api_key=`
  - `GET /api/v2/rest/stops?bbox=&api_key=`
  - `GET /api/v2/rest/operators/{onestop_id}/gtfs_realtime/vehicle_positions`
- **Coverage:** 2500+ agencies worldwide
- **Env var:** `TRANSITLAND_API_KEY`

### MobilityData (TransitFeeds.com successor) — GTFS catalog
- **No key for catalog** — https://mobilitydatabase.org/
- **API (limited):** https://database.mobilitydata.org/ — REST catalog of every public GTFS feed URL globally
- **Use:** directory of 2300+ active GTFS feeds. When our own connector list is stale, this is authoritative.
- **Env var:** none

### OpenMobilityData (open-source mirror)
- **No key** — https://openmobilitydata.org/
- **Backup for static feeds** when agency's own download is down

### Google Transit (no direct API — use GTFS feeds they've aggregated)
- **Coverage:** read via `https://maps.googleapis.com/maps/api/directions/` for routing (requires Google Maps API key — `GOOGLE_MAPS_API_KEY`). Not real-time positions.

### The Transit App (commercial, no public API — treat as reference UX)

### TransSee (Toronto + Nextbus legacy)
- **No key** — https://bus.transsee.ca/ scrape-able; useful for agencies still on the Cubic/Nextbus stack

### CitiMapper Developer (mostly read-only commercial product, no API)

---

## 3. Tier 3 — International (for global expansion)

### Transport for London (TfL)
- **Key signup:** https://api-portal.tfl.gov.uk/signup (free, 50 req/min)
- **Env var:** `TFL_API_KEY` (header `app_key`)

### Paris RATP / Île-de-France Mobilités
- **Key signup:** https://prim.iledefrance-mobilites.fr/ (free, requires French account)
- **Env var:** `IDFM_API_KEY`

### Deutsche Bahn + VBB (Berlin) + HVV (Hamburg)
- **Key signup:** https://developers.deutschebahn.com/ + each regional operator
- **Env var:** `DB_API_KEY`

### Tokyo Metro
- **Key signup:** https://developer.tokyometroapp.jp/ (Japanese account required)
- **Env var:** `TOKYO_METRO_API_KEY`

### TransportForNSW (Sydney)
- **Key signup:** https://opendata.transport.nsw.gov.au/user/register
- **Env var:** `TFNSW_API_KEY`

### OC Transpo (Ottawa) + TTC (Toronto) + STM (Montreal)
- **Key signup:** each agency's open-data portal, free tiers exist for all three

---

## 4. Tier 4 — Google Maps Live Traffic (the compete-with-Google-Maps piece)

### Google Maps Platform
- **Key signup:** https://console.cloud.google.com/google/maps-apis/credentials
- **APIs needed:**
  - **Roads API** — traffic-aware route snapping: `https://roads.googleapis.com/v1/snapToRoads`
  - **Directions API** — live ETA with traffic: `https://maps.googleapis.com/maps/api/directions/json?departure_time=now&traffic_model=best_guess`
  - **Distance Matrix API** — bulk ETAs
  - **Map Tiles API** (already have this for photorealistic 3D) — includes Traffic layer style ID
- **Billing:** Maps Platform is pay-per-call with $200/month free credit. Beyond that, Directions is ~$5 per 1000 calls. For agent-facing CREP, budget $300-500/month at meaningful scale.
- **Env var:** `GOOGLE_MAPS_API_KEY` (billing enabled)

### Waze Traffic Data (alternative; requires partnership)
- **Program signup:** https://www.waze.com/ccp (Connected Citizens Program — free but requires gov/transit partnership)
- **Access:** Waze only grants CCP keys to cities, DOTs, and infrastructure orgs. Mycosoft qualifies under partnership with SDG&E or any DOT we work with.
- **Env var:** `WAZE_CCP_KEY`

### HERE Traffic API
- **Key signup:** https://platform.here.com/ (freemium tier available)
- **Env var:** `HERE_API_KEY`

### TomTom Traffic
- **Key signup:** https://developer.tomtom.com/ (free 2500 req/day)
- **Env var:** `TOMTOM_API_KEY`

---

## 5. Tier 5 — Specialty feeds

### FAA — drones + UAS + flight data
- **FAA Drone B4UFLY:** https://www.faa.gov/uas/b4ufly (consumer app, no public API)
- **FAA UAS data portal:** https://data.faa.gov/search (DATA.GOV — no key for static DRZ polygons)
- **OpenSky drone tracking:** https://opensky-network.org/apidoc/ (limited drone tracking)
- **Env var:** none (DATA.GOV free)

### FAA — commercial flight schedules
- **FAA ASDI / SWIM:** requires commercial agreement; free SWIM-Terminal-Publisher via registered agreement
- **Commercial:** FlightAware (`FLIGHTAWARE_API_KEY` — https://flightaware.com/commercial/aeroapi/), FR24 (already partially integrated)

### Self-driving vehicle live positions
- **Waymo, Cruise, Zoox do NOT publish live positions.** What's available:
  - Waymo service area polygons: https://waymo.com/waymo-one (manual scrape)
  - Cruise permit filings: https://data.cpuc.ca.gov/ (public records, static)
  - Zoox: Las Vegas + Foster City service zones — press-release static
- **Approach:** bake service-area polygons as a static geojson layer; no live position data exists without NDAs

### AIS (marine) — already integrated via AISStream
- **AISStream key:** https://aisstream.io/ (already set)
- **Backup:** MarineTraffic (paid), VesselFinder (free with rate limit)

### Freight rail (BNSF, UP, CSX, NS)
- **None publish live positions publicly** (security + competitive reasons)
- **Backup options:**
  - RailRoad API (commercial aggregator, subscription)
  - FRA Safety Data (historical, not live) — https://railroads.dot.gov/
  - OpenStreetMap network maps (static only)

### Maritime buoys + NDBC
- **No key** — https://www.ndbc.noaa.gov/ (already integrated)

### Weather/NWS
- **No key** — https://api.weather.gov (already integrated)

### EPA AirNow
- **Key signup:** https://docs.airnowapi.org/account/request/ (free) — **already have this; Cursor's rotating it**
- **Env var:** `AIRNOW_API_KEY`

### Shodan (security, for fusarium-tier CREP)
- **Key signup:** https://shodan.io/billing (Small Business $299/mo — already planned)
- **Env var:** `SHODAN_API_KEY`

---

## 6. MINDEX Redundancy Architecture

Morgan's ask: "redundancies for registries in mindex". Here's how to make every feed durable.

### 6.1 Three-tier agency registry

New MINDEX table: `transit.agencies`
```sql
CREATE TABLE transit.agencies (
    onestop_id       text PRIMARY KEY,       -- Transitland canonical id
    name             text NOT NULL,
    short_name       text,
    country          text,
    region           text,
    -- Tier 1: direct API (fastest, authoritative)
    api_endpoint     text,
    api_key_env_var  text,                   -- e.g. 'MTA_API_KEY'
    api_format       text,                   -- 'gtfs-rt' | 'siri' | 'rest-json' | 'scrape'
    -- Tier 2: Transitland aggregator
    transitland_url  text,
    -- Tier 3: static GTFS download URL
    gtfs_static_url  text,
    -- Tier 4: last-resort scrape config
    scrape_config    jsonb,                  -- { url, selector, playwright_script_id }
    -- Health tracking
    last_ok_at       timestamptz,
    last_fail_at     timestamptz,
    fail_count_24h   integer NOT NULL DEFAULT 0,
    active_tier      integer NOT NULL DEFAULT 1,  -- which tier the scheduler is using right now
    updated_at       timestamptz NOT NULL DEFAULT now()
);
```

### 6.2 Fallback state machine

Per-agency scheduler logic:
```
every 30s:
    tier = agency.active_tier
    result = try_tier(agency, tier)
    if result.ok:
        agency.active_tier = 1  ← prefer primary next time
        agency.last_ok_at = now()
    else:
        agency.fail_count_24h += 1
        if tier < 4:
            agency.active_tier = tier + 1  ← escalate
        // at tier 4 (scrape) we stay — it's last resort
```

After 3 consecutive Tier-1 failures in 5 min → escalate to Tier 2. After 2 hours of Tier-1 green → collapse back.

### 6.3 Registry sync job

Weekly cron pulls from MobilityData + Transitland catalogs to keep `transit.agencies` fresh:
```
node scripts/etl/transit/sync-agency-registry.mjs
  ├─ fetch https://mobilitydatabase.org/feeds
  ├─ fetch https://transit.land/api/v2/rest/operators
  ├─ diff against MINDEX transit.agencies
  └─ upsert changes + retire stale
```

### 6.4 Data durability (backfill from static if realtime fails)

Every agency's GTFS static is cached to `var/cache/transit/gtfs-static/<agency>.zip`. When realtime tiers are down, CREP can still paint stations + scheduled routes (just not live positions) until feeds recover.

---

## 7. Backup tooling — Playwright-based scrape fallback

Last-resort layer. For agencies whose API is consistently broken or gated behind login, a headless Playwright worker scrapes the public-facing web app and publishes GTFS-rt-compatible messages to an internal bus.

### Architecture

```
/scripts/etl/transit/backup-scrape/
    ├── scraper-registry.json        # one entry per scrapable source
    ├── playwright-worker.mjs        # headless Chromium with anti-bot hardening
    └── scrapers/
        ├── amtrak-trackatrain.mjs
        ├── dart-dallas.mjs
        ├── septa-bus.mjs
        └── ... 
```

### Sample scraper shape

```ts
// scripts/etl/transit/backup-scrape/scrapers/amtrak-trackatrain.mjs
export default {
  agency_onestop_id: "o-9-amtrak",
  cadence_s: 60,
  url: "https://maps.amtrak.com/rttl/js/RoutesList.v.json",
  mode: "json-direct",
  parse: (body) => {
    const trains = JSON.parse(body)
    return trains.map(t => ({
      trip_id: t.TrainNum,
      lat: Number(t.lat),
      lng: Number(t.lon),
      bearing: Number(t.heading),
      speed_mps: Number(t.Velocity) * 0.44704,
      timestamp: Date.parse(t.LastValTS),
    }))
  },
}
```

For HTML-only agencies:
```ts
// scripts/etl/transit/backup-scrape/scrapers/dart-dallas.mjs
export default {
  agency_onestop_id: "o-9vk-dartdallas",
  cadence_s: 120,
  url: "https://www.dart.org/riding/realtimedata.asp",
  mode: "playwright",
  wait_for: ".vehicle-marker",
  extract: (page) => page.$$eval(".vehicle-marker", els =>
    els.map(el => ({
      trip_id: el.dataset.vehicleId,
      lat: Number(el.dataset.lat),
      lng: Number(el.dataset.lng),
      timestamp: Date.now(),
    }))
  ),
}
```

### Worker runs as a separate container (same Docker compose as the website)

```yaml
# docker-compose.production.yml additions
transit-backup-scraper:
    image: ghcr.io/mycosoftlabs/transit-backup-scraper:latest
    environment:
      - MINDEX_API_URL=http://192.168.0.189:8000
      - PLAYWRIGHT_HEADLESS=1
    restart: unless-stopped
    mem_limit: 512m
```

### Published back as GTFS-realtime-equivalent

Scraper output → MINDEX `transit.vehicle_positions` table (same schema Transitland uses) → served by `/api/crep/transit/vehicles?agency=` → Worldview `crep.live.transit.vehicles` dataset.

No consumer has to know whether the data came from the agency's own API, from Transitland, or from the scraper. All three tiers produce the same shape.

---

## 8. Action list for Morgan (today)

**Free keys to request right now — no gate, instant approval:**

| Agency | Signup URL | Minutes |
|--------|-----------|---------|
| MTA | https://api.mta.info/#/signup | 2 |
| WMATA | https://developer.wmata.com/Products | 5 |
| BART | https://api.bart.gov/api/register.aspx | 2 |
| LA Metro | https://developer.metro.net/ | 3 |
| CTA (train + bus) | https://www.transitchicago.com/developers/ | 5 |
| MBTA | https://api-v3.mbta.com/ | 2 |
| NJ Transit | https://developer.njtransit.com/ | 5 |
| 511 Bay Area (SFMTA/AC/Caltrain) | https://511.org/open-data/token | 2 |
| TriMet (Portland) | https://developer.trimet.org/appid/registration/ | 3 |
| MARTA (Atlanta) | http://www.itsmarta.com/app-developer-resources.aspx | 5 |
| Denver RTD | https://www.rtd-denver.com/open-records/open-spatial-information/real-time-feeds | 5 |
| TfL (London) | https://api-portal.tfl.gov.uk/signup | 5 |
| Transitland (Mapbox) | https://www.transit.land/documentation#api-key | 5 |
| **Total** | | **~50 min** |

**Gated — need org verification:**
- Waze CCP (gov/transit partner only) — apply if we add a DOT partnership
- FAA SWIM — enterprise license

**Paid (when ready to scale to national):**
- Google Maps Platform — $200 free/mo then pay-as-you-go
- Shodan Small Business — $299/mo (already planned)
- FlightAware AeroAPI — $100/mo starter tier
- HERE Traffic — freemium + paid tiers

**Env vars to add to GitHub prod secrets (after keys arrive):**
```
MTA_API_KEY=
WMATA_API_KEY=
BART_API_KEY=
LA_METRO_API_KEY=
CTA_TRAIN_TRACKER_API_KEY=
CTA_BUS_TRACKER_API_KEY=
MBTA_API_KEY=
NJTRANSIT_API_KEY=
TRANSIT_511_API_KEY=
TRIMET_API_KEY=
MARTA_API_KEY=
RTD_DENVER_API_KEY=
TFL_API_KEY=
TRANSITLAND_API_KEY=
GOOGLE_MAPS_API_KEY=     (when ready for traffic)
```

---

## 9. What I'll build once keys are in (follow-up PRs)

| Phase | PR | What |
|-------|----|------|
| A | transit-connectors-p1 | MTA + WMATA + BART + LA Metro connectors + Worldview datasets `crep.live.transit.{nyc-subway,nyc-bus,dc-metro,bay-bart}` |
| B | transit-connectors-p2 | CTA + MBTA + NJT + 511-Bay + TriMet + MARTA + RTD |
| C | transit-registry-mindex | `transit.agencies` table + fallback state machine + weekly sync-agency-registry cron |
| D | transit-backup-scraper | Playwright worker container + Amtrak + DART + SEPTA scrapers |
| E | google-traffic-layer | Roads API + Directions bulk ETA + tile layer (gated on Maps key) |
| F | transit-international | TfL + IDFM + TfNSW + TTC + DB |

Each phase is self-contained and can ship independently as soon as the relevant keys land.
