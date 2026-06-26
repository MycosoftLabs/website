/**
 * RECONSTRUCTED faithful shim (see lib/geo/crep-map-fly-to.ts header). v3 basemap install /
 * projection helpers Cursor extracted. On the legacy globe the basemap is installed by
 * CREPDashboardClient's own code, so these are guarded no-ops (ensureV3BasemapVisible /
 * applyV3GlobeProjection only have an effect once the v3 basemap layers exist). crepBasemapInstall
 * is imported-but-unused; exported for symbol compatibility. Cursor's real version supersedes on sync.
 */
import type { Map as MapLibreMap } from "maplibre-gl"

type MapLike = MapLibreMap | { current: MapLibreMap | null } | null | undefined

export function crepBasemapInstall(): void {
  /* legacy basemap is installed inline by CREPDashboardClient — nothing to do here */
}

export function applyV3GlobeProjection(_map: MapLike): void {
  /* v3-only globe projection; no-op on the legacy globe */
}

export function ensureV3BasemapVisible(_map: MapLike): void {
  /* v3-only basemap visibility; no-op on the legacy globe */
}
