# Earth Simulator Global Map Backend Handoff - June 3, 2026

## Owner Split

Codex owns the website UI, local QA on `localhost:3010`, and blue/green website deployment on VM 187.

Cursor owns MAS, MINDEX, ETL, firmware/service work, VM 188/189 deploys, and backend data propagation. The website must consume fast APIs and cached registries, not crawl live data sources in the browser.

## Current Website State To Preserve

- Earth Simulator route: `/natureos/earth-simulator`
- Local QA surface: `http://localhost:3010`
- Fungi species markers are rendering again and should not be changed without explicit approval.
- AM / EcM fungal atlas switching is restored to the previous visual behavior and should not be experimented on in this pass.
- Eagle Eye thumbnails are showing live camera cards again when camera feeds are available.
- MycoBrain field widgets are present for Mushroom 1, Hyphae 1, and Psathyrella/COM4 when their upstream registry path returns them.
- COM4 can be offline, boot-looping, or firmware-flashing without breaking Earth Simulator interactivity.
- Local dev HTTP routing was fixed so `localhost:3010` does not get redirected to `https://0.0.0.0:3010`.

## Backend Issues Cursor Should Fix

### 1. Global City Data Gaps

Observed from UI testing: San Diego is dense, but cities such as Vancouver and some non-US regions can appear empty or delayed. Earth Simulator should show appropriate local data in any major city.

Cursor should verify ETL/storage/API coverage for:

- Railways and rail stations
- Cell towers and telecom assets
- Power lines, substations, generators, sub-transmission, and large transmission
- Buoys, tide stations, hydrology, weather, AQI, and environmental sensors
- Airports, ports, and civic/government facilities
- Species and event feeds beyond the United States

Acceptance:

- API calls return non-empty, bounded, viewport-relevant payloads for San Diego, Los Angeles, San Francisco, Menlo Park, Vancouver, Mexico City/Tijuana, Tokyo, Taipei, London, Madrid, New York, DC, and Toronto.
- Normal viewport APIs should respond quickly enough for UI interaction, ideally under 500 ms from cache and under 1500 ms worst case.
- Empty city responses must be explainable by source absence; otherwise ETL or cache backfill is required.

### 2. MINDEX Species And Events

The website should not fall back to background crawling for species/events. MINDEX needs complete, indexed, classified, fast reads.

Cursor should verify:

- iNaturalist/GBIF ingestion for all displayed species groups: fungi, plants, birds, mammals, fish/marine, reptiles/amphibians, insects/arachnids.
- Kingdom/taxon metadata is present for legacy rows, not only newly ingested rows.
- Event feeds are global, not mostly US-only: earthquakes, storms, floods, fires, lightning, volcanoes, tornadoes/severe weather.
- Multi-filter requests do not cause count/query contention or slow fallbacks.

Acceptance:

- For each test city, one-filter and multi-filter species/event requests return data without interfering with fungi.
- MINDEX primary path is used, not slow website fallback.
- Counts match visible marker classes closely enough for demos.

### 3. MAS / MycoBrain Fleet Latency

The website saw delayed field device online state and delayed command responses. Cursor should harden MAS/heartbeat so slow or broken devices cannot stall Earth Simulator.

Cursor should verify:

- `/api/earth-simulator/devices` and `/api/devices/network` are fast from the website VM path.
- Mushroom 1 and Hyphae 1 online telemetry appears from MAS cache without waiting on direct LAN probes.
- COM4 aliases are consistent: `mycobrain-COM4`, `psathyrella-buoy-com4`, and current COM port mappings should not conflict.
- A boot-looping or unplugged COM4 device returns stale/offline state quickly and never blocks the whole fleet payload.
- Commands are acknowledged quickly or time out cleanly.

Acceptance:

- Bad COM4 state cannot freeze the map or delay Mushroom/Hyphae.
- Field command API returns a response or safe timeout in under 5 seconds.
- Device telemetry includes stable registry ID, board ID, sensor IDs, and stale/online metadata.

### 4. Camera Registry Expansion

The next camera pass should be backend/registry driven, not hard-coded in map UI.

Sources to audit:

- `https://alltrafficcams.com/live/border-crossings/mexico/united-states/tijuana-san-ysidro/`
- `https://vi-ads.com/bordertrafficcams/`
- Windy San Ysidro webcam page
- Windy Avalon/Catalina webcam page
- Baja/Tijuana/Rosarito/La Jolla/Ocean Beach/Channel Islands camera sources visible from those pages

Cursor should identify original stream/source URLs where possible. If source cannot be found, create a temporary registry entry with clear provenance and cache rules.

Acceptance:

- Added cameras appear in Eagle Eye and map camera layer with stable coordinates, title, operator/source, and stream/thumbnail metadata.
- Cameras that are image-only must be marked as image/still so the UI does not spin forever expecting live video.
- Unavailable streams must degrade to a clear unavailable state without freezing controls.

### 5. San Ysidro Point Of Entry Widget

Create backend data for a border crossing widget bound to the CBP San Ysidro government/point-of-entry feature.

Required title:

- `San Ysidro Point of Entry`

Required data:

- San Ysidro commercial vehicles
- San Ysidro passenger vehicles
- San Ysidro pedestrians
- San Ysidro Cross Border Xpress / CBX where available
- San Ysidro PedWest commercial/passenger/pedestrian where available
- Ready lane / sentry / pedestrian lane distinctions when source data supports them
- Last updated timestamp and source attribution

Preferred sources:

- Official CBP/border wait time source if available
- Otherwise, documented temporary source from alltrafficcams/visible page data until official ingestion is wired

Acceptance:

- API returns structured crossing rows with status, lane type, wait minutes, open/closed when available, and timestamp.
- Widget payload is available without scraping in the browser.
- UI can attach it to the existing CBP San Ysidro point feature.

### 6. AirNow / San Ysidro AQI

The UI showed `AirNow key is not configured` for EPA AQS San Ysidro even though an AirNow key exists in deployment secrets.

Cursor should verify:

- Production `AIRNOW_API_KEY` is present where the website/API expects it.
- VM/container env is injected during blue/green deploy.
- San Ysidro AQI route returns real AQI payloads and not config errors.

Acceptance:

- San Ysidro EPA/AQI widget shows live AQI in local/prod when secret is available.
- Missing key errors should include server-side diagnostics only, not noisy live-user copy.

## Test Matrix For Cursor

Run these API and browser checks after backend changes:

- San Diego / Chula Vista / San Ysidro: species, events, cameras, AQI, buoys, devices, infra
- Menlo Park / Palo Alto / San Mateo / San Francisco: species, cameras, cell towers, rail, AQI, events
- Vancouver: rail, towers, cameras, events, species, power, buoys/coastal sensors
- Tijuana / border: cameras, crossing times, CBP widget, AQI, river/hydrology
- Mexico City, Tokyo, Taipei, Madrid, London, New York, DC: non-empty viewport intelligence and infrastructure

Required proof:

- API timings and counts
- Sample payloads
- Browser screenshots from Earth Simulator
- Notes on which data is truly unavailable from source versus missing ETL

## Do Not Change Without Approval

- AM / EcM visual styling or raster behavior
- Existing fungal marker behavior
- Earth Simulator UI layer ownership
- Blue/green deploy scripts
- Website fallback crawling behavior except to remove slow fallbacks in favor of backend APIs
