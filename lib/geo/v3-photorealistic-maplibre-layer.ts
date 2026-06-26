/**
 * RECONSTRUCTED dormant stub (see lib/geo/crep-map-fly-to.ts header). v3 photorealistic basemap
 * layer sync — Cursor's lane. No-op until the real photoreal layer is synced; the legacy globe
 * never mounts it. Cursor's real version supersedes on sync.
 */
import type { Map as MapLibreMap } from "maplibre-gl"

type MapLike = MapLibreMap | { current: MapLibreMap | null } | null | undefined

export function syncV3PhotorealisticMapLayer(_map: MapLike, _active: boolean): void {
  /* v3-only photoreal layer; no-op on the legacy globe */
}
