"use client"

import { useEffect, useRef } from "react"
import type { Map as MapLibreMap } from "maplibre-gl"
import type { MovementSnapshot } from "@/lib/fusarium/movement/contracts"

interface DeviceMovementOverlayProps {
  map: MapLibreMap | null
  snapshot: MovementSnapshot | null
  showPaths: boolean
  showCoordination: boolean
  showTriangulation: boolean
  showPathTree: boolean
}

const SOURCE_IDS = {
  paths: "fusarium-movement-paths",
  coordination: "fusarium-movement-coordination",
  triangle: "fusarium-movement-triangle",
  tree: "fusarium-movement-tree",
} as const

type MovementFeature = {
  type: "Feature"
  properties: Record<string, string | number | boolean>
  geometry:
    | { type: "LineString"; coordinates: Array<[number, number]> }
    | { type: "Polygon"; coordinates: Array<Array<[number, number]>> }
}

type MovementCollection = {
  type: "FeatureCollection"
  features: MovementFeature[]
}

function emptyCollection(): MovementCollection {
  return { type: "FeatureCollection", features: [] }
}

function setGeoJson(map: MapLibreMap, sourceId: string, data: MovementCollection) {
  const source = map.getSource(sourceId) as { setData?: (next: MovementCollection) => void } | undefined
  if (source?.setData) {
    source.setData(data)
    return
  }
  map.addSource(sourceId, { type: "geojson", data })
}

export function DeviceMovementOverlay({
  map,
  snapshot,
  showPaths,
  showCoordination,
  showTriangulation,
  showPathTree,
}: DeviceMovementOverlayProps) {
  const attached = useRef(false)

  useEffect(() => {
    if (!map) return
    const ensure = () => {
      if (!map.getSource(SOURCE_IDS.paths)) {
        map.addSource(SOURCE_IDS.paths, { type: "geojson", data: emptyCollection() })
        map.addLayer({
          id: `${SOURCE_IDS.paths}-line`,
          type: "line",
          source: SOURCE_IDS.paths,
          paint: { "line-color": "#67e8f9", "line-width": 2.4, "line-opacity": 0.85 },
        })
      }
      if (!map.getSource(SOURCE_IDS.coordination)) {
        map.addSource(SOURCE_IDS.coordination, { type: "geojson", data: emptyCollection() })
        map.addLayer({
          id: `${SOURCE_IDS.coordination}-line`,
          type: "line",
          source: SOURCE_IDS.coordination,
          paint: { "line-color": "#fbbf24", "line-width": 1.6, "line-dasharray": [2, 2], "line-opacity": 0.8 },
        })
      }
      if (!map.getSource(SOURCE_IDS.triangle)) {
        map.addSource(SOURCE_IDS.triangle, { type: "geojson", data: emptyCollection() })
        map.addLayer({
          id: `${SOURCE_IDS.triangle}-fill`,
          type: "fill",
          source: SOURCE_IDS.triangle,
          paint: { "fill-color": "#c084fc", "fill-opacity": 0.12 },
        })
        map.addLayer({
          id: `${SOURCE_IDS.triangle}-line`,
          type: "line",
          source: SOURCE_IDS.triangle,
          paint: { "line-color": "#c084fc", "line-width": 1.8, "line-dasharray": [1, 1.4], "line-opacity": 0.9 },
        })
      }
      if (!map.getSource(SOURCE_IDS.tree)) {
        map.addSource(SOURCE_IDS.tree, { type: "geojson", data: emptyCollection() })
        map.addLayer({
          id: `${SOURCE_IDS.tree}-line`,
          type: "line",
          source: SOURCE_IDS.tree,
          paint: { "line-color": "#86efac", "line-width": 1.5, "line-dasharray": [1, 2], "line-opacity": 0.8 },
        })
      }
      attached.current = true
    }

    if (map.isStyleLoaded()) ensure()
    else map.once("load", ensure)
    return () => {
      map.off("load", ensure)
    }
  }, [map])

  useEffect(() => {
    if (!map) return
    if (!attached.current && map.isStyleLoaded()) {
      attached.current = Boolean(map.getSource(SOURCE_IDS.paths))
    }
    if (!attached.current) return

    const pathFeatures: MovementFeature[] = []
    if (showPaths && snapshot) {
      for (const device of snapshot.devices) {
        if (device.path === "NOT_SUPPLIED") continue
        pathFeatures.push({
          type: "Feature",
          properties: { id: device.id, name: device.name, live: true },
          geometry: {
            type: "LineString",
            coordinates: device.path.map((fix) => [fix.lng, fix.lat]),
          },
        })
      }
    }
    setGeoJson(map, SOURCE_IDS.paths, { type: "FeatureCollection", features: pathFeatures })

    const coordFeatures: MovementFeature[] = []
    if (showCoordination && snapshot) {
      for (const pair of snapshot.coordination) {
        const from = snapshot.devices.find((device) => device.id === pair.fromId)
        const to = snapshot.devices.find((device) => device.id === pair.toId)
        if (!from || !to) continue
        coordFeatures.push({
          type: "Feature",
          properties: {
            rangeM: Math.round(pair.rangeM),
            bearingDeg: Math.round(pair.bearingDeg),
            live: true,
          },
          geometry: {
            type: "LineString",
            coordinates: [
              [from.fix.lng, from.fix.lat],
              [to.fix.lng, to.fix.lat],
            ],
          },
        })
      }
    }
    setGeoJson(map, SOURCE_IDS.coordination, { type: "FeatureCollection", features: coordFeatures })

    const triangleFeatures: MovementFeature[] = []
    if (showTriangulation && snapshot?.triangulation) {
      const ring = [...snapshot.triangulation.vertices, snapshot.triangulation.vertices[0]]
      triangleFeatures.push({
        type: "Feature",
        properties: {
          live: snapshot.triangulation.live,
          qualification: snapshot.triangulation.qualification,
        },
        geometry: { type: "Polygon", coordinates: [ring] },
      })
    }
    setGeoJson(map, SOURCE_IDS.triangle, { type: "FeatureCollection", features: triangleFeatures })

    const treeFeatures: MovementFeature[] = []
    if (showPathTree && snapshot?.pathTree) {
      for (const branch of snapshot.pathTree.branches) {
        treeFeatures.push({
          type: "Feature",
          properties: { label: branch.label, live: false },
          geometry: {
            type: "LineString",
            coordinates: [snapshot.pathTree.origin, branch.tip],
          },
        })
      }
    }
    setGeoJson(map, SOURCE_IDS.tree, { type: "FeatureCollection", features: treeFeatures })
  }, [map, snapshot, showPaths, showCoordination, showTriangulation, showPathTree])

  return null
}
