/**
 * RECONSTRUCTED faithful shim (see lib/geo/crep-map-fly-to.ts header). The v3 basemap layer-id
 * registry + visibility setter. The preview/hd photoreal basemap tiers exist only when Cursor's
 * v3 basemap stack installs them; on the legacy globe those layers are absent, so
 * setBasemapLayerVisibility is a getLayer-guarded no-op there (the legacy crep-satimagery-raster
 * basemap is toggled separately by CREPDashboardClient's own setVisibility). Cursor's real
 * version supersedes on sync.
 */
import type { Map as MapLibreMap } from "maplibre-gl"

type MapLike = MapLibreMap | { current: MapLibreMap | null } | null | undefined

export const BASEMAP_LAYER_IDS = {
  preview: "crep-basemap-preview",
  hd: "crep-basemap-hd",
} as const

function resolveMap(m: MapLike): MapLibreMap | null {
  if (!m) return null
  if (typeof (m as MapLibreMap).getLayer === "function") return m as MapLibreMap
  return (m as { current?: MapLibreMap | null }).current ?? null
}

export function setBasemapLayerVisibility(
  map: MapLike,
  key: keyof typeof BASEMAP_LAYER_IDS | string,
  visible: boolean,
): void {
  const m = resolveMap(map)
  if (!m) return
  const id = (BASEMAP_LAYER_IDS as Record<string, string>)[key as string] ?? (key as string)
  try {
    if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", visible ? "visible" : "none")
  } catch { /* */ }
}
