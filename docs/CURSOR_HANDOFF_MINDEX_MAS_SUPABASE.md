# Cursor Handoff — MINDEX + MAS + Supabase + ETL tasks

**Apr 23, 2026 — after main @69ca442f merges of PR #107 (Worldview v2) + PR #108 (NYC/DC expansion).**

Everything below is **outside the website repo** or requires **infra/env access Claude doesn't have**. Split by system so you can assign sequentially.

---

## 1. Supabase migrations — run these first (unblocks billing + device visibility)

The website repo carries SQL files but doesn't auto-apply. Run against prod Supabase (service-role or DB URL):

### 1.a Worldview v1 metering
```bash
node scripts/worldview/apply-migration.mjs \
  --file supabase/migrations/20260423_worldview_v1.sql
```
Creates:
- `agent_api_keys.scopes` text[] column (GIN indexed)
- `agent_usage_events` table (billing + analytics log)
- `worldview_rate_weight_last_minute(api_key_id)` SQL helper
- `worldview_meter_and_limit()` PL/pgSQL RPC — atomic debit + rate-limit + usage log

The RPC is what Worldview middleware at `/api/worldview/v1/*` calls on every request. Until this lands, metering quietly falls through as "allow" (graceful degrade we coded). **Run this before billing any agent.**

### 1.b Device visibility gate
```bash
node scripts/worldview/apply-migration.mjs \
  --file supabase/migrations/20260423_device_visibility.sql
```
Creates `myca_device_visibility` table + RLS + trigger. Backs the MYCA "toggle any device at will" feature (`POST /api/myca/devices/visibility`).

### 1.c Extend `validate_api_key` RPC to return email + scopes
The RPC was added by `20260316_agent_payment_pipeline.sql`. It currently doesn't return the profile's email or the key's scopes column. Our `lib/agent-auth.ts` already reads `row.email` + `row.scopes`; they'll stay `null` until the RPC is extended.

**Add to the RETURNS TABLE signature and SELECT body:**
```sql
ALTER FUNCTION public.validate_api_key(p_key_hash text)
-- add to RETURNS TABLE:
--   email text,
--   scopes text[]
-- add to SELECT:
--   p.email,              -- from agent_profiles
--   k.scopes              -- from agent_api_keys
```

This unlocks the `company` scope auto-promotion when the JWT email ends in `@mycosoft.org/.com/.org` and `@mycodao.org`.

---

## 2. GitHub environment secrets — set in `production` env

Navigate to `github.com/MycosoftLabs/website` → Settings → Environments → `production` → Secrets:

| Secret | Value | Why |
|--------|-------|-----|
| `MINDEX_API_URL` | `http://192.168.0.189:8000` | Must NOT be `localhost:8000` (wrong inside Docker) |
| `MINDEX_API_KEY` | (if MINDEX requires one) | X-API-Key header for backend-to-backend auth |
| `MAS_API_URL` | `http://192.168.0.188:8001` | Same Docker-loopback reasoning |
| `AIRNOW_API_KEY` | (rotated, from AirNow portal) | Morgan pasted an old one in chat — rotate + set new. Until set, `/api/crep/airnow/*` returns 501 |
| `OPS_EMAILS` | `morgan@mycosoft.org,rj@mycosoft.org` | Comma-separated; these emails auto-promote to `ops` scope in Worldview |
| `SHODAN_API_KEY` | (Small Business tier, when purchased) | Until set, `security.shodan.*` datasets + `security.critical-infrastructure` bundle return 501 |
| `MTA_API_KEY` | from api.mta.info/#/signup | NYC subway + LIRR + Metro-North real-time |
| `WMATA_API_KEY` | from developer.wmata.com | DC Metro + Metrobus |
| `BART_API_KEY` | from api.bart.gov | SF BART |
| `TRANSIT_511_API_KEY` | from 511.org/open-data/token | SF Muni + AC Transit + Caltrain (one key for all Bay Area) |
| `LA_METRO_API_KEY` | from developer.metro.net | LA bus + rail |
| `CTA_TRAIN_TRACKER_API_KEY` | from transitchicago.com/developers | Chicago L |
| `CTA_BUS_TRACKER_API_KEY` | (different from train) | Chicago buses |
| `MBTA_API_KEY` | from api-v3.mbta.com | Boston T |
| `NJTRANSIT_API_KEY` | from developer.njtransit.com | NJ Transit |
| `TRIMET_API_KEY` | from developer.trimet.org | Portland |
| `MARTA_API_KEY` | from itsmarta.com/app-developer-resources | Atlanta |
| `RTD_DENVER_API_KEY` | from rtd-denver.com/open-records | Denver |
| `TRANSITLAND_API_KEY` | from transit.land (Mapbox account) | Global transit fallback aggregator |
| `GOOGLE_MAPS_API_KEY` | from console.cloud.google.com/google/maps-apis | Live traffic layer (billable) |
| `TFL_API_KEY` | from api-portal.tfl.gov.uk | London |

Full request-link list is in `docs/TRANSIT_API_KEYS_AND_REDUNDANCY.md`.

After setting secrets → trigger **Instant Deploy** workflow to reload the VM env.

---

## 3. MINDEX repo tasks (`github.com/MycosoftLabs/mindex`)

### 3.a New ingestion endpoints (Worldview + MYCA)
Website code POSTs to these — add the routes to MINDEX FastAPI:

| Endpoint | Method | Body | Purpose |
|---|---|---|---|
| `/api/v1/ingest/myca-verified-entity` | POST | entity JSON | MYCA waypoint-verify auto-add (PR #106) |
| `/api/v1/ingest/inat-region/{region}` | POST | FeatureCollection | Hourly iNat NYC/DC sync |
| `/api/v1/earth/bbox?bbox=w,s,e,n&types=…&limit=N` | GET | - | Already exists — just needs to not 404 on `power_plant,substation,cable,tx_line,cell_tower,data_center,camera,species_observation,fire,earthquake,alert` types |

### 3.b Transit schema (new)
For the transit redundancy plan (`docs/TRANSIT_API_KEYS_AND_REDUNDANCY.md` §6):
```sql
CREATE SCHEMA IF NOT EXISTS transit;

CREATE TABLE transit.agencies (
  onestop_id       text PRIMARY KEY,
  name             text NOT NULL,
  country          text, region text,
  api_endpoint     text, api_key_env_var text, api_format text,
  transitland_url  text,
  gtfs_static_url  text,
  scrape_config    jsonb,
  last_ok_at       timestamptz, last_fail_at timestamptz,
  fail_count_24h   integer NOT NULL DEFAULT 0,
  active_tier      integer NOT NULL DEFAULT 1,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE transit.vehicle_positions (
  agency_onestop_id text NOT NULL,
  trip_id          text NOT NULL,
  vehicle_id       text,
  route_id         text,
  lat              double precision NOT NULL,
  lng              double precision NOT NULL,
  bearing          double precision,
  speed_mps        double precision,
  timestamp        timestamptz NOT NULL,
  geom             geography(Point, 4326) NOT NULL,
  PRIMARY KEY (agency_onestop_id, trip_id, timestamp)
);
CREATE INDEX transit_vp_geom_gist ON transit.vehicle_positions USING GIST (geom);
CREATE INDEX transit_vp_agency_ts ON transit.vehicle_positions (agency_onestop_id, timestamp DESC);
```

Then expose `/api/v1/transit/vehicles?bbox=&agency=` returning GeoJSON.

### 3.c Multi-city coverage ingestion
The website bakes 11-category OSM geojsons per city (`{city}-{category}.geojson`). MINDEX should maintain a mirror table so any consumer can bbox-query without hitting the static files:

```sql
CREATE TABLE coverage.osm_entities (
  id             text PRIMARY KEY,           -- osm-way-<id> / osm-node-<id>
  osm_type       text, osm_id bigint,
  city           text,                       -- nyc / dc / sd / la / sf / chicago / ...
  category       text,                       -- hospitals / police / cell-towers / ...
  name           text,
  operator       text,
  tags           jsonb,
  geom           geography NOT NULL,         -- mixed point + polygon
  collected_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coverage_osm_city_cat ON coverage.osm_entities (city, category);
CREATE INDEX coverage_osm_geom ON coverage.osm_entities USING GIST (geom);
```

Hourly GHA cron `inat-nyc-dc-hourly.yml` already POSTs observations. Analogous cron for cities (new file `us-major-cities-hourly.yml` — **website repo** task):

```yaml
# .github/workflows/us-major-cities-hourly.yml
on:
  schedule:
    - cron: "30 */6 * * *"   # every 6h offset from top-of-hour
jobs:
  bake:
    steps:
      - run: node scripts/etl/crep/bake-us-major-cities.mjs
      - run: # POST each city/category geojson to MINDEX coverage.osm_entities
```

### 3.d MINDEX health endpoint
Ensure `GET /health` returns a small JSON (not just 200) so `/api/worldview/v1/health` can report:
```json
{ "status": "ok", "uptime_s": 12345, "version": "1.2.3", "postgis": "3.4", "record_count_total": 865000 }
```

---

## 4. MAS repo tasks (`github.com/MycosoftLabs/mycosoft-mas`)

### 4.a PersonaPlex → Worldview client
`docs/PERSONAPLEX_WORLDVIEW_MIGRATION.md` in the website repo has the full plan. TL;DR:
1. Provision a service API key: `POST /api/agent/keys { action: "create", name: "personaplex-voice-bridge" }` with `scopes=['agent','company']` + generous `balance_cents`.
2. Drop `lib/worldview-client.ts` into the MAS repo (zero-dep TS SDK we shipped in PR #107).
3. Replace hardcoded `fetch("https://mycosoft.com/api/oei/...")` calls with `wv.query(datasetId, params)`. Use `/v1/catalog` + `/v1/openapi.json` at PersonaPlex boot to populate the agent's tool manifest.
4. For live streams (aircraft / vessels / H2S / NWS), replace polling with `wv.stream("live.aircraft", { bbox }).on("data", ...)` to cut bandwidth + latency.

### 4.b MYCA agent → waypoint-verify consumer
MYCA should subscribe to `/api/myca/entity-feed` (SSE) and consume `entity` events:
- Persist verified entities to MAS's own knowledge store.
- Trigger agent reasoning on high-confidence entities (status="auto_add").
- Drive device-visibility gate via `POST /api/myca/devices/visibility` when entities conflict with OPSEC rules.

### 4.c MAS health endpoint
Same as MINDEX — ensure `/health` returns structured JSON for the Worldview `/v1/health` aggregator.

### 4.d Transit backup scraper container (optional, for transit redundancy)
Small Playwright worker defined in `docs/TRANSIT_API_KEYS_AND_REDUNDANCY.md` §7. Runs as a sidecar container, scrapes public transit web apps when APIs fail, publishes to `transit.vehicle_positions`.

---

## 5. Website repo follow-ups (smaller, we can do these)

These remain in the website repo — low-risk follow-ups to the two merged PRs:

- [x] iNat hourly cron `.github/workflows/inat-nyc-dc-hourly.yml` — done in PR #108 already.
- [ ] `.github/workflows/us-major-cities-hourly.yml` — see 3.c above, wraps `bake-us-major-cities.mjs` (claude currently running this in the background locally; once done + committed, wire the cron).
- [ ] Expose per-city layer toggles in `CREPDashboardClient` (same pattern as NYC/DC). Script baking now — layer wire-up is the follow-up PR.
- [ ] YouTube Live landmark cams: add `/api/oei/youtube-live` hit to eagle-eye-overlay with the known landmark slugs (Times Square, White House, Eiffel, etc.) — we have the connector already.
- [ ] Mapbox label toggle — surface `light-v11` / `dark-v11` labels in the basemap control so users can turn OSM road labels on. Currently default ON in most styles but worth a CREP control.
- [ ] Multi-city perf: add minzoom gates + cluster for dense point layers (cell-towers, transit-subway, hospitals) so 10k NYC points don't all paint at z6.

---

## 6. Operational verification (do once secrets are set)

From anywhere with internet:

```bash
# 1. Worldview health
curl https://mycosoft.com/api/worldview/v1/health | jq '.status, .upstream.mindex.reachable'
# Expect: "operational" and true

# 2. Snapshot shows live entities
curl https://mycosoft.com/api/worldview/snapshot | jq '.middleware.mindex.reachable, .live_entities'
# Expect: true and non-zero aircraft/vessels

# 3. Smoke test
node scripts/worldview/smoke-test-v1.mjs --key mk_<your_test_key>
# Expect: N/N passed, exit 0

# 4. AirNow
curl "https://mycosoft.com/api/crep/airnow/current?lat=38.8977&lng=-77.0365" | jq '.ok, .observations | length'
# Expect: true and count >= 1

# 5. MYCA waypoint verify at NBSD
curl -X POST https://mycosoft.com/api/myca/waypoint-verify \
  -H "Content-Type: application/json" \
  -d '{"waypoint":{"id":"audit","lat":32.6836,"lng":-117.121,"name":"NBSD audit","created_at":"2026-04-23T05:00:00Z"}}' \
  | jq '.status, .confidence, .classified_type'
# Expect: "auto_add" or "review", confidence > 0.5, "military_installation"
```

---

## Priority order for Cursor

1. **Run the two Supabase migrations** (20260423_worldview_v1.sql + 20260423_device_visibility.sql). Blocking for billing + device gating.
2. **Set the GitHub production secrets** — MINDEX_API_URL, MAS_API_URL, MINDEX_API_KEY, AIRNOW_API_KEY, OPS_EMAILS, SHODAN_API_KEY (when bought), MTA/WMATA/BART/LA Metro/511 keys as you acquire them.
3. **Trigger Instant Deploy** after secrets land.
4. **MINDEX repo**: add ingestion endpoints (3.a), transit schema (3.b), coverage schema (3.c), structured /health (3.d).
5. **MAS repo**: PersonaPlex → Worldview client (4.a), MYCA entity-feed subscriber (4.b), structured /health (4.c).
6. Verify with the six curls above.

Anything in this doc that's unclear, ping Claude or me — but the split above minimizes cross-repo blocking.
