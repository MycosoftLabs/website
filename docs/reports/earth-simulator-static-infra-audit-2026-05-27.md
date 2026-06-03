# Earth Simulator Static Infrastructure Audit - 2026-05-27

## Scope

Permanent map assets should render from bundled app data or PMTiles, not runtime OEI/MINDEX bbox fetches. This pass focused on Earth Simulator startup and static infrastructure paths for power plants, transmission lines, substations, data centers, cell towers, ports, radar sites, and military bases.

## Completed

- Static PMTiles loader now attaches bundled PMTiles directly instead of doing a browser preflight probe that could fail and fall back to very large GeoJSON files.
- Power plants, transmission lines, substations, data centers, and global cell towers use bundled PMTiles through `addInfraSourceWithFallback`.
- Ports now load from bundled `/data/crep/ports-global.geojson` instead of `/api/oei/ports`.
- Radar sites now load from the bundled NEXRAD registry instead of `/api/oei/radar`.
- Earth Simulator skips the redundant `/api/oei/military` fetch; military perimeters continue to render from bundled static data.
- Earth Simulator no longer uses the proposal-overlay bbox calls for `/api/oei/cell-towers-global` or `/api/oei/transmission-lines-global`.

## Verification

- `cmd /c npx tsc --noEmit --pretty false` passed.
- Local dev server restarted on `localhost:3010` and served `/natureos/earth-simulator`.
- Range checks returned `206` with bytes for:
  - `/api/crep/tiles/cell-towers-global.pmtiles`
  - `/api/crep/tiles/data-centers-global.pmtiles`
  - `/data/crep/tiles/substations-us.pmtiles`
  - `/api/crep/tiles/transmission-lines-us-full.pmtiles`
  - `/api/crep/tiles/transmission-lines-us-major.pmtiles`
  - `/data/crep/tiles/power-plants-global.pmtiles`
  - `/data/crep/ports-global.geojson`
- Current server log after final reload showed no startup calls to:
  - `/api/oei/military`
  - `/api/oei/ports`
  - `/api/oei/radar`
  - `/api/oei/cell-towers-global`
  - `/api/oei/transmission-lines-global`

## Remaining Gaps

- Railway infrastructure still depends on OpenRailwayMap raster tiles. It should be replaced by a baked US/Taiwan rail PMTiles layer before the external railway raster source is removed.
- Live movers and volatile data still call runtime services by design, including aircraft, vessels, satellites, live trains, sensors, MYCA entity feed, nature stream, global events, and fungal/iNaturalist paths.
- Final browser QA still shows low FPS during heavy live-service startup. Static infra is no longer the main blocker; remaining latency is coming from live services and viewport analysis work.
- The global bundled cell tower dataset contains 615,611 towers, including 600,460 in the contiguous United States and 11,068 in Taiwan. The lightweight instant seed is still only a small US seed; detailed country/state/county rendering should rely on PMTiles until a smaller US/Taiwan seed is generated.
