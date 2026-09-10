"use client"

import { useEffect } from "react"
import type { Map as MapLibreMap } from "maplibre-gl"

interface OpenTopoBasemapLayerProps {
  map: MapLibreMap | null
  enabled: boolean
  opacity?: number
}

const SOURCE_ID = "fusarium-opentopo"
const LAYER_ID = "fusarium-opentopo-raster"
const TILES = [
  "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
  "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
  "https://c.tile.opentopomap.org/{z}/{x}/{y}.png",
]

/**
 * Public OpenTopoMap hillshade/contour overlay (OSM + SRTM).
 * Attribution: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA).
 */
export function OpenTopoBasemapLayer({ map, enabled, opacity = 0.72 }: OpenTopoBasemapLayerProps) {
  useEffect(() => {
    if (!map) return
    const add = () => {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: "raster",
          tiles: TILES,
          tileSize: 256,
          attribution: "© OpenStreetMap contributors, SRTM | © OpenTopoMap (CC-BY-SA)",
        })
      }
      if (!map.getLayer(LAYER_ID)) {
        map.addLayer({
          id: LAYER_ID,
          type: "raster",
          source: SOURCE_ID,
          paint: { "raster-opacity": enabled ? opacity : 0 },
        })
      }
      if (map.getLayer(LAYER_ID)) {
        map.setLayoutProperty(LAYER_ID, "visibility", enabled ? "visible" : "none")
        map.setPaintProperty(LAYER_ID, "raster-opacity", enabled ? opacity : 0)
      }
    }
    if (map.isStyleLoaded()) add()
    else map.once("load", add)
    return () => {
      map.off("load", add)
    }
  }, [map, enabled, opacity])

  return null
}
