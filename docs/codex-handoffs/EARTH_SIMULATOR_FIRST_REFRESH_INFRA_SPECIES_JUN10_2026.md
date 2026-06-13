# Earth Simulator First Refresh Infra + Species Fix - Jun 10 2026

Scope: `WEBSITE/website` only. No deploy was performed.

## Fixed

- Earth Simulator permanent infrastructure no longer waits behind the old long startup gates.
- Stable bundled overlays now begin on first refresh for ports, radar, power plants, transmission lines, cell towers, data centers, bathymetry/topography, railway tracks, and related MapLibre sources.
- Buoys are no longer delayed behind the deferred-data gate.
- Military bases now paint in two phases: a tiny seed GeoJSON first, then the full `military-bases.geojson` layer shortly after startup.
- Data centers and power plants now reveal at the US flyover zoom instead of being hidden until deeper zoom.
- Earth Simulator boot species loading now uses broad biodiversity by default instead of fungi-only first paint.
- `/api/mindex/proxy/species` now supports `bbox=w,s,e,n`, includes `kingdom` in the proxy cache key, and filters live fallback observations to the requested bbox before returning them.

## Verification

- `npx.cmd tsc --noEmit --pretty false` passed.
- `GET /api/mindex/proxy/species?bbox=-124.8,24.3,-66.9,49.5&kingdom=all&limit=50&fallbackLive=true`
  - Returned 50 records, 0 out-of-bounds.
  - Included Insecta, Plantae, Arachnida, Reptilia, Aves, and Unknown.
- `GET /api/mindex/proxy/species?bbox=-115.45,35.95,-114.95,36.35&kingdom=all&limit=50&fallbackLive=true`
  - Returned 50 records, 0 out-of-bounds.
  - Included Aves, Plantae, Insecta, Mammalia, Actinopterygii, Arachnida, Reptilia, and Animalia.
- `GET /api/mindex/proxy/species?bbox=-117.35,32.55,-116.85,33.05&kingdom=Fungi&limit=20&fallbackLive=true`
  - Returned 20 fungi records, 0 out-of-bounds.
- `GET /api/oei/buoys`
  - Returned 894 NDBC buoys.
- Static assets checked:
  - `/data/crep/submarine-cables.geojson` returned 200.
  - `/data/military-bases-seed.geojson` contains 5 seed features.

## Browser Proof On 3010

URL tested:

`http://localhost:3010/natureos/earth-simulator?_qa=codex-first-refresh-infra-species-final`

Observed after refresh:

- MapLibre canvas present.
- Page was not stuck initializing.
- No unavailable/temporary-unavailable state visible.
- Visible counters included `Nature: 100`, `12000 NATURE`, `3 DEVICES`, and `894 BUOYS`.
- Startup logs confirmed:
  - 710 submarine cables loaded.
  - 44 hyperscale data centers rendered.
  - 74 major ports rendered.
  - US substations PMTiles active.
  - US transmission lines PMTiles active.
  - Global data centers PMTiles active.
  - Global cell towers PMTiles active.
  - Radar sites, satellite imagery, ports, power plants, and railway tracks attached.
  - Military seed loaded first with 5 facilities.
  - Full military static layer loaded after startup with 858 facilities.
  - US bbox nature preload loaded 500 observations in the background.

## Notes

- The AM/ECM fungi behavior was left alone.
- Radio stations remain staged behind the normal overlay readiness gate because pulling the large AM/FM catalog during first paint was one of the heavy startup risks.
- Camera/video operations were not deployed in this pass; this pass was focused on first-refresh infrastructure visibility and broad species startup behavior.
