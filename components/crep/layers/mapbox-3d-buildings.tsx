"use client"

/**
 * Mapbox 3D Buildings + Satellite Streets basemap option — Apr 20, 2026
 *
 * Morgan added a full-scope MAPBOX_ACCESS_TOKEN. This component adds two
 * capabilities:
 *   1. 3D building extrusions globally via Mapbox Composite vector tiles
 *      (the "mapbox-streets-v8" source contains `building` features with
 *      height + min_height attributes). Renders as fill-extrusion above
 *      the basemap, matching OSM Buildings 3D.
 *   2. Optional Satellite Streets hybrid as an alternative basemap — high-
 *      res aerial + road labels in one tileset, sharper than ESRI World
 *      Imagery and works well with extruded buildings.
 *
 * Feeds the 3D globe view (future iteration) + gives the 2D CREP map
 * proper city silhouettes at zoom 15+. Vital for Morgan's device-
 * placement logic because MycoBrain sensors need to know whether a
 * spot is shadowed by a building.
 */

import { useEffect, useRef } from "react"
import type { Map as MapLibreMap } from "maplibre-gl"

interface Props {
  map: MapLibreMap | null
  /** 3D extruded buildings at zoom ≥ 15. */
  enabled3dBuildings?: boolean
  /** Switch basemap to Mapbox Satellite Streets hybrid. */
  enabledSatelliteStreets?: boolean
}

const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  ""

export default function Mapbox3DBuildings({ map, enabled3dBuildings, enabledSatelliteStreets }: Props) {
  const loadedRef = useRef<{ buildings?: boolean; satstreets?: boolean }>({})

  // 3D buildings
  useEffect(() => {
    if (!map || !MAPBOX_TOKEN) return
    const ids = ["crep-mapbox-3d-buildings"]
    if (!enabled3dBuildings) {
      try {
        for (const id of ids) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none")
      } catch { /* ignore */ }
      return
    }
    if (loadedRef.current.buildings) {
      try {
        for (const id of ids) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "visible")
      } catch { /* ignore */ }
      return
    }
    loadedRef.current.buildings = true

    try {
      if (!map.getSource("mapbox-composite")) {
        map.addSource("mapbox-composite", {
          type: "vector",
          url: `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8.json?access_token=${MAPBOX_TOKEN}`,
        })
      }
      const style = map.getStyle()
      const beforeId = style.layers.find((l: any) => l.type === "symbol")?.id
      map.addLayer(
        {
          id: "crep-mapbox-3d-buildings",
          type: "fill-extrusion",
          source: "mapbox-composite",
          "source-layer": "building",
          minzoom: 14,
          filter: ["all", ["==", ["get", "extrude"], "true"], [">", ["get", "height"], 0]],
          paint: {
            "fill-extrusion-color": [
              "interpolate", ["linear"], ["get", "height"],
              0, "#1e293b",
              30, "#334155",
              100, "#475569",
              300, "#64748b",
              500, "#94a3b8",
            ],
            "fill-extrusion-height": [
              "interpolate", ["linear"], ["zoom"],
              14, 0,
              15, ["get", "height"],
            ],
            "fill-extrusion-base": [
              "interpolate", ["linear"], ["zoom"],
              14, 0,
              15, ["get", "min_height"],
            ],
            "fill-extrusion-opacity": 0.85,
            "fill-extrusion-vertical-gradient": true,
          },
        },
        beforeId,
      )
      console.log("[Mapbox3D] 3D buildings attached (crep-mapbox-3d-buildings), zoom ≥ 14")
    } catch (e: any) { console.warn("[Mapbox3D/buildings]", e.message) }
  }, [map, enabled3dBuildings])

  // Satellite Streets raster as alternative basemap
  useEffect(() => {
    if (!map || !MAPBOX_TOKEN) return
    const ids = ["crep-mapbox-satstreets"]
    if (!enabledSatelliteStreets) {
      try {
        for (const id of ids) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none")
      } catch { /* ignore */ }
      return
    }
    if (loadedRef.current.satstreets) {
      try {
        for (const id of ids) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "visible")
      } catch { /* ignore */ }
      return
    }
    loadedRef.current.satstreets = true

    try {
      if (!map.getSource("mapbox-satstreets-src")) {
        map.addSource("mapbox-satstreets-src", {
          type: "raster",
          tiles: [
            `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`,
          ],
          tileSize: 256,
          attribution: "© Mapbox © OpenStreetMap © Maxar",
          minzoom: 0,
          maxzoom: 22,
        })
      }
      // Insert AFTER basemap landcover but BEFORE roads — same pattern
      // as ESRI Sat Imagery. Roads + labels still read on top.
      const style = map.getStyle()
      let beforeId: string | undefined
      for (const l of style.layers as any[]) {
        if (!l?.id) continue
        if (/^(road|highway|bridge|tunnel|motorway|transit)/i.test(l.id)) {
          beforeId = l.id
          break
        }
      }
      if (!beforeId) beforeId = style.layers.find((l: any) => l.type === "symbol")?.id
      map.addLayer(
        {
          id: "crep-mapbox-satstreets",
          type: "raster",
          source: "mapbox-satstreets-src",
          layout: { visibility: "visible" },
          paint: { "raster-opacity": 0.95, "raster-fade-duration": 150 },
        },
        beforeId,
      )
      console.log("[Mapbox3D] Satellite Streets basemap attached (crep-mapbox-satstreets)")
    } catch (e: any) { console.warn("[Mapbox3D/satstreets]", e.message) }
  }, [map, enabledSatelliteStreets])

  return null
}
