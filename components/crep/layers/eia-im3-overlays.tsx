"use client"

/**
 * EIA-860M + IM3 Data Center Atlas overlays — Apr 19, 2026
 *
 * Two canonical US datasets that OpenGridView uses and that Morgan
 * explicitly asked to have in CREP:
 *
 * 1. EIA-860M (Feb 2026)
 *    https://www.eia.gov/electricity/data/eia860m/
 *    Monthly snapshot of every utility-scale electric power generator
 *    in the US. 38,468 generators in this build:
 *      - Operating  : 27,716  (green — active)
 *      - Planned    :  1,946  (blue — "projected future")
 *      - Retired    :  7,201  (red)
 *      - Canceled   :  1,605  (gray — canceled / postponed)
 *    Each feature carries { plant_name, entity_name, technology,
 *    capacity_mw, state, county, plant_id, generator_id,
 *    status_code, year }.
 *
 * 2. IM3 Open Source Data Center Atlas v2026.02.09
 *    https://im3.pnnl.gov/datacenter-atlas
 *    PNNL's canonical US data-center footprint database — 1,479
 *    existing data centers (cyan) with building / campus classification,
 *    operator, and square footage. This is exactly the source
 *    OpenGridView's "Data Centers" layer pulls from.
 *
 * All five datasets live in public/data/crep/ as static GeoJSON so
 * first paint is instant — no MINDEX round trip required. The docs/
 * DATASETS.md file tracks provenance + refresh cadence.
 */

import { useEffect, useRef } from "react"
import type { Map as MapLibreMap } from "maplibre-gl"
import {
  DATA_CENTER_LABEL_MIN_ZOOM,
  DATA_CENTER_MIN_ZOOM,
  POWER_PLANT_MIN_ZOOM,
} from "@/lib/crep/lod-policy"

export interface EiaIm3Enabled {
  im3DataCenters?: boolean
  /** Apr 20, 2026 — IM3 gpkg building + campus POLYGON footprints
   *  (1,374 shapes parsed from the SQLite-packaged GeoPackage). Shown
   *  only at zoom ≥ 11 so world-view doesn't render thousands of
   *  tiny polygons. */
  im3DataCenterFootprints?: boolean
  eiaOperating?: boolean
  eiaPlanned?: boolean
  eiaRetired?: boolean
  eiaCanceled?: boolean
}

interface Props {
  map: MapLibreMap | null
  enabled: EiaIm3Enabled
  zoom?: number
  bounds?: ViewportBounds | null
  earthSimulator?: boolean
}

interface ViewportBounds {
  north: number
  south: number
  east: number
  west: number
}

const DATASETS: Array<{
  key: keyof EiaIm3Enabled
  file: string
  sourceId: string
  layerIds: string[]
  color: string
  haloColor: string
  label: string
  /** Build the hero text for click-driven InfraAsset panel. */
  nameProp: string
  categoryProp: string
  valueProp?: string
  valueUnit?: string
  minzoom: number
  /** Size scales with capacity (EIA) or sqft (IM3) when available. */
  radiusProp?: string
  /** Optional close-zoom gate for labels only. */
  labelMinzoom?: number
}> = [
  {
    key: "im3DataCenters",
    file: "/data/crep/im3-datacenters-existing.geojson",
    sourceId: "crep-im3-datacenters",
    layerIds: ["crep-im3-dc-glow", "crep-im3-dc-core", "crep-im3-dc-label"],
    color: "#22d3ee",     // cyan — matches OpenGridView's existing-DC teal
    haloColor: "#67e8f9",
    label: "IM3 Data Centers (PNNL)",
    nameProp: "name",
    categoryProp: "op",
    valueProp: "sqft",
    valueUnit: "sqft",
    minzoom: DATA_CENTER_MIN_ZOOM,
    radiusProp: "sqft",
    labelMinzoom: DATA_CENTER_LABEL_MIN_ZOOM,
  },
  {
    key: "eiaOperating",
    file: "/data/crep/eia860m-operating.geojson",
    sourceId: "crep-eia-operating",
    layerIds: ["crep-eia-op-glow", "crep-eia-op-core", "crep-eia-op-label"],
    color: "#22c55e",     // green — active operating plants
    haloColor: "#4ade80",
    label: "EIA-860M Operating",
    nameProp: "plant_name",
    categoryProp: "technology",
    valueProp: "capacity_mw",
    valueUnit: "MW",
    minzoom: POWER_PLANT_MIN_ZOOM,
    radiusProp: "capacity_mw",
  },
  {
    key: "eiaPlanned",
    file: "/data/crep/eia860m-planned.geojson",
    sourceId: "crep-eia-planned",
    layerIds: ["crep-eia-pl-glow", "crep-eia-pl-core", "crep-eia-pl-label"],
    color: "#3b82f6",     // blue — "projected future" per Morgan's ask
    haloColor: "#60a5fa",
    label: "EIA-860M Planned",
    nameProp: "plant_name",
    categoryProp: "technology",
    valueProp: "capacity_mw",
    valueUnit: "MW",
    minzoom: POWER_PLANT_MIN_ZOOM,
    radiusProp: "capacity_mw",
  },
  {
    key: "eiaRetired",
    file: "/data/crep/eia860m-retired.geojson",
    sourceId: "crep-eia-retired",
    layerIds: ["crep-eia-re-glow", "crep-eia-re-core", "crep-eia-re-label"],
    color: "#ef4444",     // red — retired
    haloColor: "#f87171",
    label: "EIA-860M Retired",
    nameProp: "plant_name",
    categoryProp: "technology",
    valueProp: "capacity_mw",
    valueUnit: "MW",
    minzoom: POWER_PLANT_MIN_ZOOM,
    radiusProp: "capacity_mw",
  },
  {
    key: "eiaCanceled",
    file: "/data/crep/eia860m-canceled.geojson",
    sourceId: "crep-eia-canceled",
    layerIds: ["crep-eia-ca-glow", "crep-eia-ca-core", "crep-eia-ca-label"],
    color: "#9ca3af",     // gray — canceled / postponed
    haloColor: "#d1d5db",
    label: "EIA-860M Canceled",
    nameProp: "plant_name",
    categoryProp: "technology",
    valueProp: "capacity_mw",
    valueUnit: "MW",
    minzoom: POWER_PLANT_MIN_ZOOM,
    radiusProp: "capacity_mw",
  },
]

function mapReady(map: MapLibreMap): boolean {
  return !!(map && (map as any).style && typeof map.getSource === "function")
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function waitForBrowserIdle(timeout = 900): Promise<void> {
  const requestIdleCallback = (window as any).requestIdleCallback
  if (typeof requestIdleCallback === "function") {
    return new Promise((resolve) => requestIdleCallback(() => resolve(), { timeout }))
  }
  return delay(80)
}

const EMPTY_FEATURE_COLLECTION = { type: "FeatureCollection", features: [] } as const
const RAW_OVERVIEW_POINT_MIN_ZOOM = 11.5
const RAW_FOOTPRINT_DETAIL_MIN_ZOOM = 11
const RAW_DETAIL_MAX_SPAN_DEG = 0.85
const EIA_IM3_DATASET_CACHE = new Map<string, Promise<any>>()

function loadCachedDataset(file: string): Promise<any> {
  const cached = EIA_IM3_DATASET_CACHE.get(file)
  if (cached) return cached
  const pending = fetch(file, { cache: "force-cache" }).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  })
  EIA_IM3_DATASET_CACHE.set(file, pending)
  return pending
}

function normalizedLng(lng: number): number {
  if (!Number.isFinite(lng)) return 0
  let next = lng
  while (next > 180) next -= 360
  while (next < -180) next += 360
  return next
}

function lngSpan(bounds: ViewportBounds): number {
  const west = normalizedLng(bounds.west)
  const east = normalizedLng(bounds.east)
  return east >= west ? east - west : 360 - west + east
}

function expandBounds(bounds: ViewportBounds, factor = 0.18): ViewportBounds {
  const latDelta = Math.max(0.05, Math.abs(bounds.north - bounds.south) * factor)
  const lonDelta = Math.max(0.05, lngSpan(bounds) * factor)
  return {
    north: Math.min(90, bounds.north + latDelta),
    south: Math.max(-90, bounds.south - latDelta),
    east: bounds.east + lonDelta,
    west: bounds.west - lonDelta,
  }
}

function shouldLoadRawDetail(
  earthSimulator: boolean | undefined,
  zoom: number | undefined,
  bounds: ViewportBounds | null | undefined,
  minZoom = RAW_OVERVIEW_POINT_MIN_ZOOM,
  allowSmallViewportOverride = true,
): boolean {
  if (!earthSimulator) return true
  if (!bounds || !Number.isFinite(zoom)) return false
  if ((zoom ?? 0) >= minZoom) return true
  if (!allowSmallViewportOverride) return false
  return Math.abs(bounds.north - bounds.south) <= RAW_DETAIL_MAX_SPAN_DEG && lngSpan(bounds) <= RAW_DETAIL_MAX_SPAN_DEG
}

function coordInBounds(lng: number, lat: number, bounds: ViewportBounds): boolean {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return false
  if (lat < bounds.south || lat > bounds.north) return false
  const west = normalizedLng(bounds.west)
  const east = normalizedLng(bounds.east)
  const value = normalizedLng(lng)
  return east >= west ? value >= west && value <= east : value >= west || value <= east
}

function geometryTouchesBounds(geometry: any, bounds: ViewportBounds): boolean {
  if (!geometry) return false
  if (geometry.type === "Point") {
    return coordInBounds(Number(geometry.coordinates?.[0]), Number(geometry.coordinates?.[1]), bounds)
  }
  if (geometry.type === "MultiPoint" || geometry.type === "LineString") {
    return (geometry.coordinates || []).some((coord: any) => coordInBounds(Number(coord?.[0]), Number(coord?.[1]), bounds))
  }
  if (geometry.type === "MultiLineString" || geometry.type === "Polygon") {
    return (geometry.coordinates || []).some((line: any[]) =>
      (line || []).some((coord: any) => coordInBounds(Number(coord?.[0]), Number(coord?.[1]), bounds)),
    )
  }
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates || []).some((poly: any[]) =>
      (poly || []).some((line: any[]) =>
        (line || []).some((coord: any) => coordInBounds(Number(coord?.[0]), Number(coord?.[1]), bounds)),
      ),
    )
  }
  return false
}

function scopeGeojsonToBounds(data: any, bounds: ViewportBounds | null | undefined): any {
  if (!data || data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
    return EMPTY_FEATURE_COLLECTION
  }
  if (!bounds) return data
  const padded = expandBounds(bounds)
  return {
    ...data,
    features: data.features.filter((feature: any) => geometryTouchesBounds(feature?.geometry, padded)),
  }
}

function setGeojsonSourceData(map: MapLibreMap, sourceId: string, data: any): boolean {
  const source = map.getSource(sourceId) as any
  if (source && typeof source.setData === "function") {
    source.setData(data)
    return true
  }
  return false
}

function hideLayers(map: MapLibreMap, layerIds: string[]) {
  if (!mapReady(map)) return
  for (const lid of layerIds) {
    try {
      if (map.getLayer(lid)) map.setLayoutProperty(lid, "visibility", "none")
    } catch { /* ignore */ }
  }
}

function showLayers(map: MapLibreMap, layerIds: string[]) {
  if (!mapReady(map)) return
  for (const lid of layerIds) {
    try {
      if (map.getLayer(lid)) map.setLayoutProperty(lid, "visibility", "visible")
    } catch { /* ignore */ }
  }
}

function clearSource(map: MapLibreMap, sourceId: string) {
  if (!mapReady(map)) return
  try {
    setGeojsonSourceData(map, sourceId, EMPTY_FEATURE_COLLECTION)
  } catch { /* ignore */ }
}

function boundsKey(bounds: ViewportBounds | null | undefined): string {
  if (!bounds) return "global"
  const precision = 2
  return [
    bounds.north.toFixed(precision),
    bounds.south.toFixed(precision),
    bounds.east.toFixed(precision),
    bounds.west.toFixed(precision),
  ].join(":")
}

export default function EiaIm3Overlays({ map, enabled, zoom, bounds, earthSimulator }: Props) {
  const loadedRef = useRef<Record<string, boolean>>({})
  const loadKeyRef = useRef<Record<string, string>>({})

  // ─── IM3 footprint POLYGONS (building + campus) ──────────────────────
  // Apr 20, 2026 (Morgan OpenGridView parity: building-level DC shapes).
  // Parsed from the gpkg's `building` + `campus` tables (1,374 polygons).
  // Rendered as fill + outline at zoom ≥ 11; color = cyan matching the
  // existing IM3 point glyph palette.
  useEffect(() => {
    if (!map) return
    const sourceId = "crep-im3-footprints"
    const fillId = "crep-im3-footprint-fill"
    const lineId = "crep-im3-footprint-line"
    const on = !!enabled.im3DataCenterFootprints
    const active = on && shouldLoadRawDetail(earthSimulator, zoom, bounds, RAW_FOOTPRINT_DETAIL_MIN_ZOOM, false)
    if (!active) {
      if (!mapReady(map)) return
      try {
        hideLayers(map, [fillId, lineId])
        clearSource(map, sourceId)
      } catch { /* ignore */ }
      return
    }
    const loadKey = `${sourceId}:${earthSimulator ? boundsKey(bounds) : "global"}:${Math.floor((zoom ?? 0) * 2) / 2}`
    if (loadedRef.current[sourceId] && loadKeyRef.current[sourceId] === loadKey) {
      if (!mapReady(map)) return
      try {
        showLayers(map, [fillId, lineId])
      } catch { /* ignore */ }
      return
    }
    loadKeyRef.current[sourceId] = loadKey
    let cancelled = false
    ;(async () => {
      try {
        await waitForBrowserIdle(700)
        const data = await loadCachedDataset("/data/crep/im3-datacenter-footprints.geojson")
        const scopedData = earthSimulator ? scopeGeojsonToBounds(data, bounds) : data
        if (cancelled || !mapReady(map)) return
        if (setGeojsonSourceData(map, sourceId, scopedData)) {
          showLayers(map, [fillId, lineId])
          return
        }
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, { type: "geojson", data: scopedData })
          map.addLayer({
            id: fillId,
            type: "fill",
            source: sourceId,
            minzoom: 11,
            paint: {
              "fill-color": [
                "match", ["get", "atlas_type"],
                "campus", "#0ea5e9",     // sky-500 — campus (wider boundary)
                /* building */ "#22d3ee",  // cyan-400 — individual building
              ],
              "fill-opacity": ["case", ["==", ["get", "atlas_type"], "campus"], 0.12, 0.32],
            },
          })
          map.addLayer({
            id: lineId,
            type: "line",
            source: sourceId,
            minzoom: 11,
            paint: {
              "line-color": [
                "match", ["get", "atlas_type"],
                "campus", "#0ea5e9",
                "#67e8f9",
              ],
              "line-width": ["case", ["==", ["get", "atlas_type"], "campus"], 1.8, 1.2],
              "line-opacity": 0.9,
            },
          })
          map.on("click", fillId, (e: any) => {
            const f = e.features?.[0]
            if (!f) return
            const p = f.properties || {}
            const c = e.lngLat
            try {
              const hook = (window as any).__crep_selectAsset
              if (typeof hook === "function") {
                hook({
                  type: "data_center",
                  id: p.id,
                  name: p.name || "Data Center",
                  lat: c?.lat ?? 0,
                  lng: c?.lng ?? 0,
                  properties: { ...p, atlas_source: "IM3 footprint (PNNL)" },
                })
              }
            } catch { /* ignore */ }
          })
          map.on("mouseenter", fillId, () => { map.getCanvas().style.cursor = "pointer" })
          map.on("mouseleave", fillId, () => { map.getCanvas().style.cursor = "" })
          loadedRef.current[sourceId] = true
          console.log(`[EiaIm3] IM3 footprints: ${(scopedData.features || []).length} viewport polygons loaded -> ${sourceId}`)
        }
      } catch (e: any) {
        console.warn("[EiaIm3/footprints]", e?.message)
      }
    })()
    return () => { cancelled = true }
  }, [map, enabled.im3DataCenterFootprints, earthSimulator, zoom, bounds?.north, bounds?.south, bounds?.east, bounds?.west])

  // ─── Attach each dataset lazily on first enable ────────────────────────
  useEffect(() => {
    if (!map) return
    let cancelled = false
    for (const [datasetIndex, ds] of DATASETS.entries()) {
      const on = !!enabled[ds.key]
      const active = on && shouldLoadRawDetail(earthSimulator, zoom, bounds)
      if (!active) {
        // Hide and clear raw detail when disabled or outside viewport LOD.
        if (!mapReady(map)) continue
        hideLayers(map, ds.layerIds)
        clearSource(map, ds.sourceId)
        continue
      }

      const loadKey = `${ds.sourceId}:${earthSimulator ? boundsKey(bounds) : "global"}:${Math.floor((zoom ?? 0) * 2) / 2}`

      // Flip visibility back if the already attached source is scoped to
      // the current viewport. Otherwise refetch and replace with the new
      // bounded slice so off-viewport features leave the render source.
      if (loadedRef.current[ds.sourceId] && loadKeyRef.current[ds.sourceId] === loadKey) {
        if (!mapReady(map)) continue
        showLayers(map, ds.layerIds)
        try {
          const labelLayerId = ds.layerIds[2]
          if (ds.labelMinzoom != null && map.getLayer(labelLayerId)) {
            map.setLayerZoomRange(labelLayerId, ds.labelMinzoom, 24)
          }
        } catch { /* ignore */ }
        continue
      }

      loadKeyRef.current[ds.sourceId] = loadKey

      ;(async () => {
        try {
          await delay(datasetIndex * 90)
          await waitForBrowserIdle(ds.key === "eiaOperating" ? 300 : 180)
          const data = await loadCachedDataset(ds.file)
          const scopedData = earthSimulator ? scopeGeojsonToBounds(data, bounds) : data
          if (cancelled || !mapReady(map)) return
          if (setGeojsonSourceData(map, ds.sourceId, scopedData)) {
            showLayers(map, ds.layerIds)
            try {
              const labelLayerId = ds.layerIds[2]
              if (ds.labelMinzoom != null && map.getLayer(labelLayerId)) {
                map.setLayerZoomRange(labelLayerId, ds.labelMinzoom, 24)
              }
            } catch { /* ignore */ }
            return
          }
          if (!map.getSource(ds.sourceId)) {
            map.addSource(ds.sourceId, { type: "geojson", data: scopedData, generateId: true })

            // OUTER GLOW — soft halo, scales with capacity/sqft
            map.addLayer({
              id: ds.layerIds[0],
              type: "circle",
              source: ds.sourceId,
              minzoom: ds.minzoom,
              paint: {
                "circle-radius": ds.radiusProp
                  ? [
                      "interpolate", ["linear"], ["zoom"],
                      3, ["min", 14, ["+", 3, ["*", ["sqrt", ["coalesce", ["to-number", ["get", ds.radiusProp]], 1]], 0.1]]],
                      8, ["min", 22, ["+", 5, ["*", ["sqrt", ["coalesce", ["to-number", ["get", ds.radiusProp]], 1]], 0.3]]],
                      13, ["min", 32, ["+", 7, ["*", ["sqrt", ["coalesce", ["to-number", ["get", ds.radiusProp]], 1]], 0.6]]],
                    ]
                  : ["interpolate", ["linear"], ["zoom"], 3, 4, 8, 7, 13, 11],
                "circle-color": ds.haloColor,
                "circle-opacity": 0.3,
                "circle-blur": 1.1,
              },
            })

            // CORE DOT — sharp edge, bright
            map.addLayer({
              id: ds.layerIds[1],
              type: "circle",
              source: ds.sourceId,
              minzoom: ds.minzoom,
              paint: {
                "circle-radius": ds.radiusProp
                  ? [
                      "interpolate", ["linear"], ["zoom"],
                      3, ["min", 6, ["+", 1.5, ["*", ["sqrt", ["coalesce", ["to-number", ["get", ds.radiusProp]], 1]], 0.05]]],
                      8, ["min", 10, ["+", 2.5, ["*", ["sqrt", ["coalesce", ["to-number", ["get", ds.radiusProp]], 1]], 0.12]]],
                      13, ["min", 16, ["+", 4, ["*", ["sqrt", ["coalesce", ["to-number", ["get", ds.radiusProp]], 1]], 0.25]]],
                    ]
                  : ["interpolate", ["linear"], ["zoom"], 3, 2, 8, 3.5, 13, 6],
                "circle-color": ds.color,
                "circle-opacity": 0.95,
                "circle-stroke-width": 1.1,
                "circle-stroke-color": "#ffffff",
                "circle-stroke-opacity": 0.8,
              },
            })

            // NAME LABEL at zoom ≥ 9 — "Plant Name · capacity MW"
            map.addLayer({
              id: ds.layerIds[2],
              type: "symbol",
              source: ds.sourceId,
              minzoom: ds.labelMinzoom ?? 9,
              layout: {
                "text-field": ds.valueProp
                  ? [
                      "case",
                      [">", ["coalesce", ["to-number", ["get", ds.valueProp]], 0], 0],
                      ["concat", ["get", ds.nameProp], " · ", ["to-string", ["get", ds.valueProp]], " ", ds.valueUnit || ""],
                      ["get", ds.nameProp],
                    ]
                  : ["get", ds.nameProp],
                "text-size": ["interpolate", ["linear"], ["zoom"], ds.labelMinzoom ?? 9, 9, 14, 11, 18, 13],
                "text-offset": [0, 1.0],
                "text-anchor": "top",
                "text-allow-overlap": false,
                "text-optional": true,
                "text-max-width": 10,
              } as any,
              paint: {
                "text-color": ds.haloColor,
                "text-halo-color": "rgba(0,0,0,0.9)",
                "text-halo-width": 1.5,
                "text-halo-blur": 0.5,
              },
            })

            // Click → InfraAsset widget. Uses the global hook dashboard
            // wires in CREPDashboardClient (window.__crep_selectAsset).
            map.on("click", ds.layerIds[1], (e: any) => {
              const f = e.features?.[0]
              if (!f) return
              const p = f.properties || {}
              const c = e.lngLat
              try {
                const hook = (window as any).__crep_selectAsset
                if (typeof hook === "function") {
                  hook({
                    type: ds.key.startsWith("eia") ? "plant" : "data_center",
                    id: p.plant_id || p.generator_id || p.id || `${c?.lat}-${c?.lng}`,
                    name: p[ds.nameProp] || ds.label,
                    lat: c?.lat ?? 0,
                    lng: c?.lng ?? 0,
                    properties: { ...p, atlas_source: ds.label, layer_key: ds.key },
                  })
                }
              } catch { /* ignore */ }
            })
            map.on("mouseenter", ds.layerIds[1], () => { map.getCanvas().style.cursor = "pointer" })
            map.on("mouseleave", ds.layerIds[1], () => { map.getCanvas().style.cursor = "" })

            loadedRef.current[ds.sourceId] = true
            console.log(
              `[EiaIm3] ${ds.label}: ${(data.features || []).length} features loaded → ${ds.sourceId}`,
            )
          }
        } catch (e: any) {
          console.warn(`[EiaIm3] ${ds.label} load failed:`, e?.message)
        }
      })()
    }
    return () => { cancelled = true }
  }, [
    map,
    enabled.im3DataCenters,
    enabled.eiaOperating,
    enabled.eiaPlanned,
    enabled.eiaRetired,
    enabled.eiaCanceled,
    earthSimulator,
    zoom,
    bounds?.north,
    bounds?.south,
    bounds?.east,
    bounds?.west,
  ])

  return null
}
