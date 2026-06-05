# Earth Simulator AirNow, Civic Facilities, MAS/MINDEX Handoff - Jun 3, 2026

## Scope

This handoff is for Cursor/backend work that must not be guessed at from the frontend. Codex kept the Earth Simulator AM/ECM fungal atlas untouched after the user confirmed it was working again. The current frontend work is limited to:

- making public-safety and civic facility layers visible at Earth Simulator refresh;
- painting civic/facility icons from viewport-intel/MINDEX/hints immediately, before any slow Overpass enrichment;
- protecting production deploys from silently blanking critical live-data env vars;
- documenting backend and VM checks required for AirNow, MAS, MINDEX, and global city data propagation.

Do not deploy from this handoff until Morgan visually approves the local Earth Simulator state.

## Frontend Work Codex Applied

### Boot layer defaults

File: `lib/crep/earth-simulator-boot.ts`

Added `EARTH_SIM_CIVIC_BOOT_LAYER_IDS` and included these layer ids in the Earth Simulator boot-on profile:

- `hospitals`
- `fireStations`
- `universities`
- `policeStations`
- `libraries`
- `civicFacilities`

These are no longer in `EARTH_SIM_OFF_AT_BOOT_LAYER_IDS`.

Expected local behavior: at refresh, public safety/facility filters should be enabled and able to show city assets without requiring the user to open the Infra tab first.

### Map overlay rendering

Files:

- `components/crep/layers/v3-overlays.tsx`
- `app/dashboard/crep/CREPDashboardClient.tsx`

`CREPDashboardClient` now passes `viewportOverlayFacilities` into `V3Overlays`. The overlay merges:

- `viewportIntelPrefetch.intel.facilities.facilities`
- `resolveCivicFacilityHintsForViewport(...)`

`V3Overlays` now classifies and paints those records into:

- `crep-hospitals`
- `crep-firestations`
- `crep-universities`
- `crep-policestations`
- `crep-libraries`
- `crep-civicfacilities`

Overpass is still used only as best-effort city-scale enrichment. It is now gated at `zoom >= 9`, because public-safety layers are on at refresh and continent-wide Overpass queries are not acceptable for controls responsiveness.

`V3Overlays` also now retries source setup when MapLibre style churn prevents required sources from attaching on the first pass. The required retry check covers event/facility sources such as `crep-earthquakes`, `crep-policestations`, `crep-libraries`, and `crep-civicfacilities`.

### Deploy env guardrails

Files:

- `.github/workflows/instant-deploy.yml`
- `.github/workflows/ci-cd.yml`
- `.github/workflows/deploy-only.yml`
- `scripts/blue-green-deploy.sh`

The workflows no longer blindly write empty GitHub secret values over existing VM production env values. The deploy helper now:

- writes a secret when the GitHub secret exists;
- preserves the existing VM `.env` value when the GitHub secret is absent but the VM already has the key;
- warns when optional live-data keys are absent;
- blocks blue/green cutover if required Earth Simulator runtime keys are missing.

Required runtime keys for cutover:

- `AIRNOW_API_KEY`
- `MAS_API_URL`
- `MINDEX_API_URL`
- `MINDEX_API_KEY`

Optional but important live-data keys:

- `OPENAI_API_KEY`
- `TRANSIT_511_API_KEY`
- `SF_511_API_KEY`
- `GLOBAL_FISHING_WATCH_TOKEN`
- `YOUTUBE_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAP_TILES_API_KEY`
- `NEXT_PUBLIC_MAS_API_URL`
- `NEXT_PUBLIC_MINDEX_API_URL`

## Evidence From Codex

### Local AirNow is working

Local API:

```powershell
Invoke-RestMethod "http://localhost:3010/api/crep/airnow/current?lat=32.6401&lng=-117.0842&distance=25" | ConvertTo-Json -Depth 4
```

Observed result:

- HTTP 200
- Provider: `AirNow`
- Location: `Border Area`
- Dominant pollutant: `PM2.5`
- AQI: `65`, category `Moderate`
- Ozone and PM10 observations also present

This proves the code path can read a configured AirNow key locally.

### Production AirNow was missing env

Live API tested earlier:

```bash
curl -sS "https://mycosoft.com/api/crep/airnow/current?lat=32.6401&lng=-117.0842&distance=25"
```

Observed result:

- HTTP 501
- Message: `AIRNOW_API_KEY not configured`

This is an environment/deploy configuration problem, not a frontend rendering problem.

### Chula Vista civic facility data exists in local viewport-intel

Local API:

```powershell
Invoke-RestMethod "http://localhost:3010/api/crep/viewport-intel?north=32.68&south=32.61&east=-117.04&west=-117.13&zoom=13" |
  Select-Object -ExpandProperty facilities |
  ConvertTo-Json -Depth 5
```

Observed result:

- `status: civic-fallback`
- facilities included:
  - `Chula Vista City Hall`
  - `Chula Vista Police Department Headquarters`
  - `Civic Center Branch Library`

This means frontend map layers can paint these now, but MAS/MINDEX still need to make facility coverage reliable globally.

### GitHub/VM env needs Cursor/ops verification

Codex could inspect GitHub secrets names but cannot safely inspect or print secret values. Production environment was missing the required AirNow/MAS/MINDEX secret names in the first check that Codex ran, except unrelated map/transit keys.

Codex then set these GitHub `production` environment secrets from local `.env.local` without printing values:

- `AIRNOW_API_KEY`
- `MAS_API_URL`
- `MINDEX_API_URL`
- `MINDEX_API_KEY`

Current live still returns `AIRNOW_API_KEY not configured` until the next approved blue/green deployment injects the new secret into the active container, or until ops updates the active VM `.env` and restarts safely. SSH to VM 187 failed from this session with public-key/password denial, so Cursor/ops still needs to verify the active VM `.env` directly.

### Local dev logs show MINDEX instability

Local dev logs during the Jun 3 smoke showed intermittent backend failures unrelated to the civic frontend patch:

- `MINDEX taxa API error: HTTP 500`
- `/api/natureos/mindex/stats 503`
- `/api/natureos/mindex/observations 503`
- `MINDEX observations proxy error: TimeoutError`
- `MINDEX taxa proxy error: fetch failed`
- connect timeout to `192.168.0.189:8000`

This likely explains delayed or empty global city data/fallback behavior when the frontend asks for species, civic, and infrastructure context. Cursor should inspect MINDEX VM 189 health, queue/backpressure, route handlers, and MAS-to-MINDEX credentials before treating these as UI bugs.

## Cursor Backend Tasks

### 1. Fix production runtime env without leaking secrets

On VM 187 and in GitHub production environment secrets, ensure these are set:

- `AIRNOW_API_KEY`
- `MAS_API_URL`
- `MINDEX_API_URL`
- `MINDEX_API_KEY`

Also verify these if the corresponding features should work live:

- `OPENAI_API_KEY`
- `TRANSIT_511_API_KEY`
- `SF_511_API_KEY`
- `GLOBAL_FISHING_WATCH_TOKEN`
- `YOUTUBE_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAP_TILES_API_KEY`
- `NEXT_PUBLIC_MAS_API_URL`
- `NEXT_PUBLIC_MINDEX_API_URL`

Do not print secret values in logs or handoffs. Print only `SET` or `MISSING`.

Suggested VM check:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
docker exec <active-web-container> sh -lc '
for k in AIRNOW_API_KEY MAS_API_URL MINDEX_API_URL MINDEX_API_KEY OPENAI_API_KEY TRANSIT_511_API_KEY SF_511_API_KEY GLOBAL_FISHING_WATCH_TOKEN YOUTUBE_API_KEY NEXT_PUBLIC_GOOGLE_MAP_TILES_API_KEY NEXT_PUBLIC_MAS_API_URL NEXT_PUBLIC_MINDEX_API_URL; do
  eval "v=\${$k:-}"
  if [ -n "$v" ]; then echo "$k=SET"; else echo "$k=MISSING"; fi
done'
```

### 2. Verify AirNow live after env is fixed

```bash
curl -sS "https://mycosoft.com/api/crep/airnow/current?lat=32.6401&lng=-117.0842&distance=25" | jq .
curl -sS "https://mycosoft.com/api/crep/viewport-sensors?bbox=-117.13,32.61,-117.04,32.68&limit=24" | jq .
```

Acceptance:

- no `AIRNOW_API_KEY not configured` message;
- Chula Vista/San Ysidro/San Diego show live AQI sensors when available;
- frontend sensor widgets no longer show "key not configured" in US cities.

### 3. Verify civic/public-safety data propagation

```bash
curl -sS "https://mycosoft.com/api/crep/viewport-intel?north=32.68&south=32.61&east=-117.04&west=-117.13&zoom=13" | jq ".facilities"
```

Acceptance:

- Chula Vista City Hall, police station, and library records are present;
- facility records include stable ids, names, lat/lng, type, source, and enough metadata for widgets;
- MAS/MINDEX should not require a frontend-only fallback for major cities if backend has records.

### 4. Fix global city data gaps

Morgan specifically observed blind spots in Vancouver/Canada/Mexico and expects every major city to show useful data once zoomed in. Backend/MINDEX should audit these city classes:

- civic/facilities: libraries, city halls, police stations, fire stations, hospitals, universities;
- infrastructure: railways, substations, power plants, transmission/sub-transmission lines, cell towers, data centers;
- environmental sensors: AQI, stream/river flow, tide, buoy, weather observations;
- events: earthquakes, storms, floods, fires, lightning, volcanoes;
- species: iNaturalist/GBIF/MINDEX species observations.

Acceptance for each city smoke test:

- San Diego / Chula Vista
- San Francisco / Menlo Park
- Los Angeles
- Vancouver
- Mexico City or Tijuana
- Tokyo
- Madrid or Barcelona

Each city should return non-empty, relevant viewport-intel/MINDEX data for the categories that exist there. Data should not be accidentally US-only unless the source itself is US-only. When a source is US-only, the backend should either provide an alternate global source or return a clear provider-specific reason.

### 5. Keep fallbacks honest

Fallbacks should not become the normal path for major investor demo locations. If a route returns fallback data, log and expose a safe status field such as:

- `source: mindex`
- `source: mas`
- `source: civic-fallback`
- `source: overpass`
- `source: unavailable`

The UI can tolerate staged loading, but it should not look empty for a city that has known data.

## Codex Frontend Acceptance Checklist

After Cursor/ops fixes env and backend data, Codex should verify locally and then live:

- Earth Simulator refresh over San Diego shows public safety/facility/civic filters enabled.
- Chula Vista civic icons render without waiting for a long Overpass fetch.
- Clicking a civic/facility icon opens a stable widget and can be closed.
- AirNow widgets show real AQI where AirNow has data.
- No production page says `AIRNOW_API_KEY not configured`.
- Global city smoke tests do not return blank maps for known populated cities.
- AM/ECM fungal atlas remains unchanged from the approved local visual state.

## Do Not Do

- Do not touch AM/ECM fungal atlas rendering as part of this backend handoff.
- Do not deploy any Earth Simulator changes until Morgan visually approves.
- Do not print API keys or secret values.
- Do not use `_rebuild_sandbox.py` for production deploys; use the blue/green path only.
