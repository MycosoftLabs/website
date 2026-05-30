"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type maplibregl from "maplibre-gl"

type HeatLayer = "mycelium" | "am" | "ecm" | "rarity" | "endemic" | "fci" | "protected" | "uncertainty"
type FungalLayerEnabled = Partial<Record<HeatLayer, boolean>> & { samples?: boolean }

interface Props {
  map: maplibregl.Map | null
  enabled: FungalLayerEnabled
  bbox?: [number, number, number, number] | null
  zoom?: number
  opacity?: number
  sampleGroups?: string[]
}

const SAMPLE_SOURCE = "crep-fungal-atlas-samples"
const SAMPLE_DOT_LAYER = "crep-fungal-atlas-samples-dot"
const SAMPLE_ICON_LAYER = "crep-fungal-atlas-samples-icon"
const PROTECTED_SOURCE = "crep-fungal-atlas-protected-areas"
const PROTECTED_FILL_LAYER = "crep-fungal-atlas-protected-fill"
const PROTECTED_LINE_LAYER = "crep-fungal-atlas-protected-line"
const PROTECTED_LABEL_LAYER = "crep-fungal-atlas-protected-label"
const UNCERTAINTY_SOURCE = "crep-fungal-atlas-uncertainty-areas"
const UNCERTAINTY_FILL_LAYER = "crep-fungal-atlas-uncertainty-fill"
const UNCERTAINTY_LINE_LAYER = "crep-fungal-atlas-uncertainty-line"
const UNCERTAINTY_LABEL_LAYER = "crep-fungal-atlas-uncertainty-label"
const COMPOSITE_SOURCE = "crep-fungal-atlas-composite"
const COMPOSITE_LAYER = "crep-fungal-atlas-composite-raster"
const SAMPLE_MIN_ZOOM = 2
const SAMPLE_ICON_MIN_ZOOM = 10
const ATLAS_CELL_DEGREES = 0.05
const CELL_SOURCE_PREFIX = "crep-fungal-atlas-cells"
const EMPTY_FEATURE_COLLECTION = { type: "FeatureCollection", features: [] } as const
const STARTUP_FALLBACK_BBOX: [number, number, number, number] = [-180, -55, 180, 85]

const SPUN_TILE_VERSION = "2026-05-24-global-ecm-am-raster-v9-green-am"
const INACTIVE_SPUN_RASTER_WARM_OPACITY = 0.001

const HEAT_LAYERS: Array<{
  id: HeatLayer
  name: string
  opacity: number
  minZoom: number
}> = [
  { id: "mycelium", name: "Mycelium Heat", opacity: 0.95, minZoom: 1.2 },
  { id: "am", name: "AM Fungi", opacity: 1, minZoom: 1.2 },
  { id: "ecm", name: "EcM Fungi", opacity: 1, minZoom: 1.2 },
  { id: "rarity", name: "Rare Fungi", opacity: 0.58, minZoom: 1.2 },
  { id: "endemic", name: "Endemic Fungi", opacity: 0.58, minZoom: 1.2 },
  { id: "fci", name: "FCI Priority", opacity: 0.58, minZoom: 1.2 },
  { id: "protected", name: "Protected Areas", opacity: 0.52, minZoom: 1.2 },
  { id: "uncertainty", name: "High Uncertainty", opacity: 0.5, minZoom: 1.2 },
]

function sourceId(id: HeatLayer) {
  return `crep-fungal-atlas-${id}`
}

function layerId(id: HeatLayer) {
  return `crep-fungal-atlas-${id}-raster`
}

// AM/ECM use global SPUN raster tiles at all zoom levels (full globe on refresh).
// Cell polygons are viewport-budgeted detail for mycelium/rarity/fci only.
const SPUN_TILE_HEAT_LAYERS = new Set<HeatLayer>(["am", "ecm"])

function isSpunTileHeatLayer(id: HeatLayer) {
  return SPUN_TILE_HEAT_LAYERS.has(id)
}

function spunTileUrl(id: HeatLayer) {
  return `/api/crep/fungal-atlas/tiles/${id}/{z}/{x}/{y}.png?v=${SPUN_TILE_VERSION}`
}

function isFungaIsolationActive() {
  if (typeof window === "undefined") return false
  try {
    return (window as any).__crep_asset_isolation_mode === "funga"
  } catch {
    return false
  }
}

function enabledFromDashboardLayerIds(activeLayerIds: unknown): FungalLayerEnabled | null {
  if (!Array.isArray(activeLayerIds)) return null
  const active = new Set(activeLayerIds.map((id) => String(id)))
  return {
    mycelium: active.has("fungalAtlasMycelium"),
    am: active.has("fungalAtlasAM"),
    ecm: active.has("fungalAtlasECM"),
    rarity: active.has("fungalAtlasRare"),
    endemic: active.has("fungalAtlasRare"),
    protected: active.has("fungalAtlasProtected"),
    uncertainty: active.has("fungalAtlasUncertainty"),
    fci: active.has("fungalAtlasFci"),
    samples: active.has("fungalAtlasSamples"),
  }
}

function liveEnabledSnapshot(fallback: FungalLayerEnabled): FungalLayerEnabled {
  if (!isFungaIsolationActive() || typeof window === "undefined") return fallback
  const fromLayerIds = enabledFromDashboardLayerIds((window as any).__crep_fungal_active_layer_ids)
  if (fromLayerIds) return fromLayerIds
  const live = (window as any).__crep_fungal_atlas_enabled
  if (!live || typeof live !== "object") return fallback
  return {
    ...fallback,
    mycelium: Boolean(live.mycelium),
    am: Boolean(live.am),
    ecm: Boolean(live.ecm),
    rarity: Boolean(live.rarity),
    endemic: Boolean(live.endemic ?? live.rarity),
    protected: Boolean(live.protected),
    uncertainty: Boolean(live.uncertainty),
    fci: Boolean(live.fci),
    samples: Boolean(live.samples),
  }
}

function vectorSourceId(id: HeatLayer) {
  return `crep-fungal-atlas-${id}-vector`
}

function vectorLayerId(id: HeatLayer) {
  return `crep-fungal-atlas-${id}-vector-fill`
}

function imageSourceId(id: HeatLayer) {
  return `crep-fungal-atlas-${id}-image`
}

function imageLayerId(id: HeatLayer) {
  return `crep-fungal-atlas-${id}-image-raster`
}

function cellSourceId(id: HeatLayer) {
  return `${CELL_SOURCE_PREFIX}-${id}`
}

function cellFillLayerId(id: HeatLayer) {
  return `${CELL_SOURCE_PREFIX}-${id}-fill`
}

function cellLineLayerId(id: HeatLayer) {
  return `${CELL_SOURCE_PREFIX}-${id}-line`
}

function mapReady(map: maplibregl.Map | null): map is maplibregl.Map {
  if (!map || !(map as any).style || typeof map.getSource !== "function") return false
  try {
    return typeof (map as any).isStyleLoaded !== "function" || Boolean((map as any).isStyleLoaded())
  } catch {
    return false
  }
}

function shouldWarmInactiveSpunRasters() {
  if (typeof window === "undefined") return true
  if (window.location.pathname.includes("/natureos/earth-simulator")) return false
  const width = window.innerWidth || 1440
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false
  return !(width <= 1180 || coarsePointer)
}

function setVisibility(map: maplibregl.Map, id: string, visible: boolean) {
  try {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visible ? "visible" : "none")
  } catch {
    /* ignore map teardown */
  }
}

function setSourceData(map: maplibregl.Map, id: string, data: unknown) {
  try {
    const source = map.getSource(id) as maplibregl.GeoJSONSource | undefined
    source?.setData?.(data as any)
  } catch {
    /* ignore style churn */
  }
}

const LAYERS_THAT_STAY_ABOVE_FUNGAL_RASTERS = [
  "crep-live-",
  "crep-eagle-",
  "crep-events",
  "crep-cables",
  "crep-celltowers",
  "crep-radio",
  "crep-radar",
  "crep-railway",
  "crep-airports",
  "crep-ports",
  "crep-plants",
  "crep-subs",
  "crep-military",
  "crep-mycosoft",
  "crep-orbital",
  "earth2-",
  "waypoint-",
]

function shouldStayAboveFungalRaster(id: string) {
  if (id.startsWith("crep-fungal-atlas")) return false
  if (id.startsWith("crep-satimagery")) return false
  return LAYERS_THAT_STAY_ABOVE_FUNGAL_RASTERS.some((prefix) => id.startsWith(prefix))
}

function fungalRasterBeforeId(map: maplibregl.Map, movingId?: string): string | undefined {
  try {
    const layers = map.getStyle()?.layers || []
    return layers.find((layer) => layer.id !== movingId && shouldStayAboveFungalRaster(layer.id))?.id
  } catch {
    return undefined
  }
}

function addFungalRasterLayer(map: maplibregl.Map, layer: any) {
  const beforeId = fungalRasterBeforeId(map, layer.id)
  if (beforeId && map.getLayer(beforeId)) map.addLayer(layer, beforeId)
  else map.addLayer(layer)
}

function moveLayerInRasterSlot(map: maplibregl.Map, id: string) {
  try {
    if (!map.getLayer(id)) return
    const beforeId = fungalRasterBeforeId(map, id)
    if (beforeId && map.getLayer(beforeId)) map.moveLayer(id, beforeId)
    else map.moveLayer(id)
  } catch {
    /* ignore style churn */
  }
}

function moveLayerToTop(map: maplibregl.Map, id: string) {
  try {
    if (map.getLayer(id)) map.moveLayer(id)
  } catch {
    /* ignore style churn */
  }
}

function moveAssetLayersAboveFungalRasters(map: maplibregl.Map) {
  try {
    const layerIds = (map.getStyle()?.layers || [])
      .map((layer) => layer.id)
      .filter(shouldStayAboveFungalRaster)
    for (const id of layerIds) moveLayerToTop(map, id)
  } catch {
    /* ignore style churn */
  }
}

function isHeatVisible(id: HeatLayer, enabled: boolean | undefined, zoom: number) {
  if (!enabled) return false
  const heat = HEAT_LAYERS.find((item) => item.id === id)
  return zoom >= (heat?.minZoom ?? 0)
}

function removeCompositeHeatLayer(map: maplibregl.Map) {
  try { if (map.getLayer(COMPOSITE_LAYER)) map.removeLayer(COMPOSITE_LAYER) } catch {}
  try { if (map.getSource(COMPOSITE_SOURCE)) map.removeSource(COMPOSITE_SOURCE) } catch {}
  try { delete (window as any).__crep_fungal_composite_key } catch {}
}

function removeHeatLayer(map: maplibregl.Map, heat: { id: HeatLayer }) {
  try { if (map.getLayer(layerId(heat.id))) map.removeLayer(layerId(heat.id)) } catch {}
  try { if (map.getSource(sourceId(heat.id))) map.removeSource(sourceId(heat.id)) } catch {}
}

function ensureSpunTileHeatLayer(
  map: maplibregl.Map,
  heat: { id: HeatLayer; name: string; opacity: number; minZoom: number },
  visible: boolean,
  globalOpacity: number,
) {
  const sid = sourceId(heat.id)
  const lid = layerId(heat.id)
  const opacity = visible
    ? Math.max(0, Math.min(1, heat.opacity * globalOpacity))
    : INACTIVE_SPUN_RASTER_WARM_OPACITY

  if (!map.getSource(sid)) {
    map.addSource(sid, {
      type: "raster",
      tiles: [spunTileUrl(heat.id)],
      // Use higher-fidelity raster decode for clearer AM/ECM cells.
      tileSize: 512,
      minzoom: 0,
      maxzoom: 15,
      attribution: "SPUN / GlobalFungi / GlobalAMFungi / Global Soil Mycobiome consortium",
    } as any)
  }

  if (!map.getLayer(lid)) {
    addFungalRasterLayer(map, {
      id: lid,
      type: "raster",
      source: sid,
      minzoom: heat.minZoom,
      maxzoom: 20,
      layout: { visibility: "visible" },
      paint: {
        "raster-opacity": opacity,
        "raster-resampling": "nearest",
        "raster-fade-duration": 0,
        "raster-opacity-transition": { duration: 0, delay: 0 },
      },
    } as any)
    return
  }

  setVisibility(map, lid, true)
  try { map.setPaintProperty(lid, "raster-opacity", opacity) } catch {}
  try { map.setPaintProperty(lid, "raster-resampling", "nearest") } catch {}
  try {
    map.setPaintProperty(lid, "raster-opacity-transition", { duration: 0, delay: 0 })
  } catch {}
}

function removeVectorHeatLayer(map: maplibregl.Map, heat: { id: HeatLayer }) {
  try { if (map.getLayer(vectorLayerId(heat.id))) map.removeLayer(vectorLayerId(heat.id)) } catch {}
  try { if (map.getSource(vectorSourceId(heat.id))) map.removeSource(vectorSourceId(heat.id)) } catch {}
}

function removeImageHeatLayer(map: maplibregl.Map, heat: { id: HeatLayer }) {
  try { if (map.getLayer(imageLayerId(heat.id))) map.removeLayer(imageLayerId(heat.id)) } catch {}
  try { if (map.getSource(imageSourceId(heat.id))) map.removeSource(imageSourceId(heat.id)) } catch {}
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

const RICHNESS_STOPS: Array<[number, [number, number, number]]> = [
  [0, [25, 58, 190]],
  [0.28, [26, 109, 190]],
  [0.48, [45, 165, 145]],
  [0.68, [111, 204, 104]],
  [0.86, [193, 239, 72]],
  [1, [253, 249, 86]],
]

const AM_RICHNESS_STOPS = RICHNESS_STOPS

const RARITY_STOPS: Array<[number, [number, number, number]]> = [
  [0, [55, 48, 163]],
  [0.35, [126, 58, 170]],
  [0.62, [217, 91, 99]],
  [0.84, [250, 184, 59]],
  [1, [255, 245, 122]],
]

const PROTECTED_STOPS: Array<[number, [number, number, number]]> = [
  [0, [15, 118, 110]],
  [0.4, [20, 184, 166]],
  [0.72, [125, 211, 252]],
  [1, [219, 234, 254]],
]

const UNCERTAINTY_STOPS: Array<[number, [number, number, number]]> = [
  [0, [51, 65, 85]],
  [0.38, [100, 116, 139]],
  [0.7, [203, 213, 225]],
  [1, [248, 250, 252]],
]

function lerpColor(stops: Array<[number, [number, number, number]]>, value: number) {
  const v = clamp01(value)
  if (v <= stops[0][0]) return stops[0][1]
  for (let i = 1; i < stops.length; i += 1) {
    const upper = stops[i]
    if (v <= upper[0]) {
      const lower = stops[i - 1]
      const span = upper[0] - lower[0] || 1
      const t = (v - lower[0]) / span
      return [
        Math.round(lower[1][0] + (upper[1][0] - lower[1][0]) * t),
        Math.round(lower[1][1] + (upper[1][1] - lower[1][1]) * t),
        Math.round(lower[1][2] + (upper[1][2] - lower[1][2]) * t),
      ] as [number, number, number]
    }
  }
  return stops[stops.length - 1][1]
}

function rgbCss(rgb: [number, number, number]) {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}

function scoreCellForLayer(cell: any, id: HeatLayer) {
  if (!cell) return 0
  if (id === "am") return clamp01((Number(cell.amScore) || 0) * 0.65 + (Number(cell.richness) || 0) * 0.35)
  if (id === "ecm") return clamp01((Number(cell.ecmScore) || 0) * 0.65 + (Number(cell.richness) || 0) * 0.35)
  if (id === "rarity") return clamp01(Number(cell.rarity) || 0)
  if (id === "endemic") return clamp01(Number(cell.endemicity) || 0)
  if (id === "fci") return clamp01(Number(cell.fciPriority) || 0)
  if (id === "protected") {
    return clamp01(
      (Number(cell.endemicity) || 0) * 0.45 +
      (Number(cell.rarity) || 0) * 0.3 +
      (Number(cell.uncertainty) || 0) * 0.25,
    )
  }
  if (id === "uncertainty") return clamp01(Number(cell.uncertainty) || 0)
  return clamp01(
    (Number(cell.richness) || 0) * 0.38 +
    (Number(cell.activity) || 0) * 0.34 +
    Math.max(Number(cell.amScore) || 0, Number(cell.ecmScore) || 0) * 0.28,
  )
}

function cellOpacity(id: HeatLayer, score: number, sampleCount: number) {
  const countBoost = clamp01(Math.log1p(Math.max(0, sampleCount)) / Math.log1p(45))
  const base = id === "mycelium" || id === "am" || id === "ecm" ? 0.24 : 0.2
  const range = id === "fci" ? 0.56 : id === "rarity" || id === "endemic" ? 0.48 : 0.62
  return clamp01(base + score * range + countBoost * 0.18)
}

function cellsToGeoJson(cells: any[], id: HeatLayer) {
  const stops =
    id === "protected"
      ? PROTECTED_STOPS
      : id === "uncertainty"
        ? UNCERTAINTY_STOPS
        : id === "rarity" || id === "endemic" || id === "fci"
          ? RARITY_STOPS
          : id === "am"
            ? AM_RICHNESS_STOPS
            : RICHNESS_STOPS
  return {
    type: "FeatureCollection",
    features: (Array.isArray(cells) ? cells : [])
      .map((cell) => {
        const lat = Number(cell.lat)
        const lng = Number(cell.lng)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
        const score = scoreCellForLayer(cell, id)
        if (score <= 0) return null
        const half = ATLAS_CELL_DEGREES / 2
        const rgb = lerpColor(stops, score)
        return {
          type: "Feature",
          properties: {
            id: cell.id,
            layer: id,
            score,
            sample_count: Number(cell.sampleCount) || 0,
            color: rgbCss(rgb),
            opacity: cellOpacity(id, score, Number(cell.sampleCount) || 0),
            source_resolution: cell.sourceResolution,
            native_resolution_m: cell.nativeResolutionMeters,
            date_from: cell.dateRange?.from,
            date_to: cell.dateRange?.to,
          },
          geometry: {
            type: "Polygon",
            coordinates: [[
              [lng - half, lat - half],
              [lng + half, lat - half],
              [lng + half, lat + half],
              [lng - half, lat + half],
              [lng - half, lat - half],
            ]],
          },
        }
      })
      .filter(Boolean),
  }
}

function ensureCellHeatLayer(
  map: maplibregl.Map,
  heat: { id: HeatLayer; name: string; opacity: number; minZoom: number },
  visible: boolean,
) {
  const sid = cellSourceId(heat.id)
  const fill = cellFillLayerId(heat.id)
  const line = cellLineLayerId(heat.id)
  if (!map.getSource(sid)) {
    map.addSource(sid, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    } as any)
  }
  if (!map.getLayer(fill)) {
    addFungalRasterLayer(map, {
      id: fill,
      type: "fill",
      source: sid,
      minzoom: heat.minZoom,
      maxzoom: 20,
      layout: { visibility: visible ? "visible" : "none" },
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": ["coalesce", ["get", "opacity"], 0.55],
        "fill-outline-color": "rgba(248,250,252,0.18)",
      },
    } as any)
  }
  if (!map.getLayer(line)) {
    addFungalRasterLayer(map, {
      id: line,
      type: "line",
      source: sid,
      minzoom: heat.minZoom,
      maxzoom: 20,
      layout: { visibility: visible ? "visible" : "none" },
      paint: {
        "line-color": "rgba(248,250,252,0.5)",
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.08, 8, 0.22, 12, 0.42],
        "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.2, 10, 0.6, 14, 1],
      },
    } as any)
  }
}

function removeCellHeatLayer(map: maplibregl.Map, heat: { id: HeatLayer }) {
  try { if (map.getLayer(cellLineLayerId(heat.id))) map.removeLayer(cellLineLayerId(heat.id)) } catch {}
  try { if (map.getLayer(cellFillLayerId(heat.id))) map.removeLayer(cellFillLayerId(heat.id)) } catch {}
  try { if (map.getSource(cellSourceId(heat.id))) map.removeSource(cellSourceId(heat.id)) } catch {}
}

function getCurrentMapBbox(map: maplibregl.Map | null): [number, number, number, number] | null {
  if (!map) return null
  try {
    const bounds = map.getBounds()
    return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
  } catch {
    return null
  }
}

function parseBboxString(value: string): [number, number, number, number] | null {
  if (!value) return null
  const parts = value.split(",").map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null
  return parts as [number, number, number, number]
}

function moveFungalLayersToTop(map: maplibregl.Map) {
  try {
    moveLayerInRasterSlot(map, COMPOSITE_LAYER)
    for (const heat of HEAT_LAYERS) {
      moveLayerInRasterSlot(map, layerId(heat.id))
      moveLayerInRasterSlot(map, vectorLayerId(heat.id))
      moveLayerInRasterSlot(map, imageLayerId(heat.id))
    }
    for (const heat of HEAT_LAYERS) {
      moveLayerInRasterSlot(map, cellFillLayerId(heat.id))
      moveLayerInRasterSlot(map, cellLineLayerId(heat.id))
    }
    for (const lid of [
      PROTECTED_FILL_LAYER,
      PROTECTED_LINE_LAYER,
      UNCERTAINTY_FILL_LAYER,
      UNCERTAINTY_LINE_LAYER,
      PROTECTED_LABEL_LAYER,
      UNCERTAINTY_LABEL_LAYER,
    ]) {
      moveLayerToTop(map, lid)
    }
    moveAssetLayersAboveFungalRasters(map)
    moveLayerToTop(map, SAMPLE_DOT_LAYER)
    moveLayerToTop(map, SAMPLE_ICON_LAYER)
  } catch {
    /* ignore map teardown */
  }
}

function orderFungalHeatLayers(_map: maplibregl.Map) {
  return
}

function hideFungalAtlasLayers(map: maplibregl.Map) {
  for (const heat of HEAT_LAYERS) {
    if (isSpunTileHeatLayer(heat.id)) {
      // Keep AM/ECM raster shells mounted; only hide visibility on full teardown.
      setVisibility(map, layerId(heat.id), false)
      setVisibility(map, cellFillLayerId(heat.id), false)
      setVisibility(map, cellLineLayerId(heat.id), false)
      continue
    }
    setVisibility(map, layerId(heat.id), false)
    setVisibility(map, vectorLayerId(heat.id), false)
    setVisibility(map, imageLayerId(heat.id), false)
    setVisibility(map, cellFillLayerId(heat.id), false)
    setVisibility(map, cellLineLayerId(heat.id), false)
    setSourceData(map, cellSourceId(heat.id), EMPTY_FEATURE_COLLECTION)
  }
  for (const lid of [
    COMPOSITE_LAYER,
    PROTECTED_FILL_LAYER,
    PROTECTED_LINE_LAYER,
    PROTECTED_LABEL_LAYER,
    UNCERTAINTY_FILL_LAYER,
    UNCERTAINTY_LINE_LAYER,
    UNCERTAINTY_LABEL_LAYER,
    SAMPLE_DOT_LAYER,
    SAMPLE_ICON_LAYER,
  ]) {
    setVisibility(map, lid, false)
  }
  setSourceData(map, SAMPLE_SOURCE, EMPTY_FEATURE_COLLECTION)
}

export const FUNGAL_AM_ECM_RASTER_LAYER_IDS = {
  am: "crep-fungal-atlas-am-raster",
  ecm: "crep-fungal-atlas-ecm-raster",
} as const

/** Mount AM + ECM SPUN raster shells on the map (both sources; toggle visibility). */
export function bootstrapFungalAmEcmRasters(
  map: maplibregl.Map | null,
  options: { showAm?: boolean; showEcm?: boolean; opacity?: number } = {},
) {
  const pendingMap = map as (maplibregl.Map & {
    __crepFungalRasterRetry?: boolean
    __crepFungalRasterPendingOptions?: { showAm?: boolean; showEcm?: boolean; opacity?: number }
    __crepFungalRasterAppliedSignature?: string
    __crepFungalRasterOrderedAt?: number
  }) | null
  if (pendingMap) pendingMap.__crepFungalRasterPendingOptions = options
  if (!mapReady(map)) {
    if (!pendingMap || pendingMap.__crepFungalRasterRetry) return
    pendingMap.__crepFungalRasterRetry = true
    const retry = () => {
      pendingMap.__crepFungalRasterRetry = false
      bootstrapFungalAmEcmRasters(pendingMap, pendingMap.__crepFungalRasterPendingOptions ?? options)
    }
    try { pendingMap.once?.("load", retry) } catch {}
    try { pendingMap.once?.("style.load", retry) } catch {}
    try { pendingMap.once?.("idle", retry) } catch {}
    if (typeof window !== "undefined") {
      window.setTimeout(retry, 150)
      window.setTimeout(retry, 600)
      window.setTimeout(retry, 1500)
    }
    return
  }
  const opacity = options.opacity ?? 0.55
  const showAm = Boolean(options.showAm)
  const showEcm = Boolean(options.showEcm)
  const amHeat = HEAT_LAYERS.find((heat) => heat.id === "am")
  const ecmHeat = HEAT_LAYERS.find((heat) => heat.id === "ecm")
  const warmInactiveRasters = shouldWarmInactiveSpunRasters()
  const signature = `${showAm ? 1 : 0}|${showEcm ? 1 : 0}|${opacity.toFixed(3)}`
  const hasAmShell = Boolean(map.getSource(sourceId("am")) && map.getLayer(layerId("am")))
  const hasEcmShell = Boolean(map.getSource(sourceId("ecm")) && map.getLayer(layerId("ecm")))
  const hasRasterShells =
    (warmInactiveRasters || !showAm || hasAmShell) &&
    (warmInactiveRasters || !showEcm || hasEcmShell) &&
    (!warmInactiveRasters || (hasAmShell && hasEcmShell))
  if (pendingMap?.__crepFungalRasterAppliedSignature === signature && hasRasterShells) {
    return
  }
  if (amHeat && (showAm || warmInactiveRasters || hasAmShell)) ensureSpunTileHeatLayer(map, amHeat, showAm, opacity)
  if (ecmHeat && (showEcm || warmInactiveRasters || hasEcmShell)) ensureSpunTileHeatLayer(map, ecmHeat, showEcm, opacity)
  setVisibility(map, layerId("am"), showAm || warmInactiveRasters)
  setVisibility(map, layerId("ecm"), showEcm || warmInactiveRasters)
  try {
    const now = Date.now()
    if (!pendingMap?.__crepFungalRasterOrderedAt || now - pendingMap.__crepFungalRasterOrderedAt > 1_500 || !hasRasterShells) {
      moveFungalLayersToTop(map)
      if (pendingMap) pendingMap.__crepFungalRasterOrderedAt = now
    }
    if (pendingMap) pendingMap.__crepFungalRasterAppliedSignature = signature
  } catch {
    /* ignore style churn */
  }
}

function syncHeatLayerShells(
  map: maplibregl.Map,
  latest: { enabled: FungalLayerEnabled; zoom: number; opacity: number },
) {
  for (const heat of HEAT_LAYERS) {
    const visible = isHeatVisible(heat.id, latest.enabled[heat.id], latest.zoom)
    if (isSpunTileHeatLayer(heat.id)) {
      const warmInactiveRasters = shouldWarmInactiveSpunRasters()
      const lid = layerId(heat.id)
      const hasLayer = Boolean(map.getLayer(lid))
      if (!visible && !warmInactiveRasters && !hasLayer) {
        continue
      }
      ensureSpunTileHeatLayer(map, heat, visible, latest.opacity)
      setVisibility(map, lid, visible || warmInactiveRasters)
      setVisibility(map, cellFillLayerId(heat.id), false)
      setVisibility(map, cellLineLayerId(heat.id), false)
    } else {
      if (!visible && !map.getLayer(cellFillLayerId(heat.id)) && !map.getLayer(cellLineLayerId(heat.id))) {
        setVisibility(map, layerId(heat.id), false)
        continue
      }
      ensureCellHeatLayer(map, heat, visible)
      setVisibility(map, cellFillLayerId(heat.id), visible)
      setVisibility(map, cellLineLayerId(heat.id), visible)
      setVisibility(map, layerId(heat.id), false)
    }
  }
}

function syncSupportOverlayLayers(
  map: maplibregl.Map,
  latest: { enabled: FungalLayerEnabled; zoom: number },
) {
  const showProtected = Boolean(latest.enabled.protected) && latest.zoom >= 1.2
  if (showProtected) ensureProtectedOverlayLayers(map, true)
  setVisibility(map, PROTECTED_FILL_LAYER, showProtected)
  setVisibility(map, PROTECTED_LINE_LAYER, showProtected)
  setVisibility(map, PROTECTED_LABEL_LAYER, showProtected && latest.zoom >= 5)

  const showUncertainty = Boolean(latest.enabled.uncertainty) && latest.zoom >= 1.2
  if (showUncertainty) ensureUncertaintyOverlayLayers(map, true)
  setVisibility(map, UNCERTAINTY_FILL_LAYER, showUncertainty)
  setVisibility(map, UNCERTAINTY_LINE_LAYER, showUncertainty)
  setVisibility(map, UNCERTAINTY_LABEL_LAYER, showUncertainty && latest.zoom >= 5)

  const showSamples = Boolean(latest.enabled.samples) && latest.zoom >= SAMPLE_MIN_ZOOM
  if (showSamples) ensureSampleOverlayLayers(map, true)
  setVisibility(map, SAMPLE_DOT_LAYER, showSamples)
  setVisibility(map, SAMPLE_ICON_LAYER, showSamples && latest.zoom >= SAMPLE_ICON_MIN_ZOOM)
  if (!showSamples) setSourceData(map, SAMPLE_SOURCE, EMPTY_FEATURE_COLLECTION)
}

const PROTECTED_AREAS_GEOJSON = {
  type: "FeatureCollection",
  features: [],
} as const

const UNCERTAINTY_AREAS_GEOJSON = {
  type: "FeatureCollection",
  features: [],
} as const

function colorExpression() {
  // May 21 2026 (Morgan: "no AM fungi or ECM fungi in any way on the map").
  // Each sample feature now carries a `color` property pre-computed in
  // samplesToGeoJson() — AM = cyan, EcM = magenta, mixed = violet, other
  // falls back to the group color. Use it directly so the AM/EcM split is
  // visible on the map. Keep the old group->color match as a fallback for
  // features without the new mycorrhizal classification.
  return [
    "case",
    ["has", "color"],
    ["get", "color"],
    [
      "match",
      ["get", "group"],
      "mushroom", "#f59e0b",
      "mycelium", "#22c55e",
      "mold", "#84cc16",
      "mildew", "#a3e635",
      "yeast", "#f472b6",
      "#b45309",
    ],
  ]
}

function ensureProtectedOverlayLayers(map: maplibregl.Map, visible: boolean) {
  if (!map.getSource(PROTECTED_SOURCE)) {
    map.addSource(PROTECTED_SOURCE, { type: "geojson", data: PROTECTED_AREAS_GEOJSON } as any)
  }
  if (!map.getLayer(PROTECTED_FILL_LAYER)) {
    map.addLayer({
      id: PROTECTED_FILL_LAYER,
      type: "fill",
      source: PROTECTED_SOURCE,
      minzoom: 1.2,
      layout: { visibility: visible ? "visible" : "none" },
      paint: {
        "fill-color": "rgba(86, 180, 88, 0.18)",
        "fill-outline-color": "rgba(151, 224, 118, 0.8)",
      },
    } as any)
  }
  if (!map.getLayer(PROTECTED_LINE_LAYER)) {
    map.addLayer({
      id: PROTECTED_LINE_LAYER,
      type: "line",
      source: PROTECTED_SOURCE,
      minzoom: 1.2,
      layout: { visibility: visible ? "visible" : "none" },
      paint: {
        "line-color": "#7ccf68",
        "line-opacity": 0.88,
        "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.7, 9, 1.2, 13, 1.8],
      },
    } as any)
  }
  if (!map.getLayer(PROTECTED_LABEL_LAYER)) {
    map.addLayer({
      id: PROTECTED_LABEL_LAYER,
      type: "symbol",
      source: PROTECTED_SOURCE,
      minzoom: SAMPLE_MIN_ZOOM,
      layout: {
        "text-field": ["get", "name"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 7, 9, 11, 11, 15, 13],
        "text-font": ["Noto Sans Regular"],
        "text-variable-anchor": ["top", "bottom", "left", "right"],
        "text-radial-offset": 0.55,
        "text-justify": "auto",
        visibility: visible ? "visible" : "none",
      } as any,
      paint: {
        "text-color": "#f8fafc",
        "text-halo-color": "rgba(0, 0, 0, 0.78)",
        "text-halo-width": 1.2,
      },
    } as any)
  }
}

function ensureUncertaintyOverlayLayers(map: maplibregl.Map, visible: boolean) {
  if (!map.getSource(UNCERTAINTY_SOURCE)) {
    map.addSource(UNCERTAINTY_SOURCE, { type: "geojson", data: UNCERTAINTY_AREAS_GEOJSON } as any)
  }
  if (!map.getLayer(UNCERTAINTY_FILL_LAYER)) {
    map.addLayer({
      id: UNCERTAINTY_FILL_LAYER,
      type: "fill",
      source: UNCERTAINTY_SOURCE,
      minzoom: 1.2,
      layout: { visibility: visible ? "visible" : "none" },
      paint: {
        "fill-color": "rgba(180, 180, 180, 0.18)",
        "fill-outline-color": "rgba(235, 235, 235, 0.78)",
      },
    } as any)
  }
  if (!map.getLayer(UNCERTAINTY_LINE_LAYER)) {
    map.addLayer({
      id: UNCERTAINTY_LINE_LAYER,
      type: "line",
      source: UNCERTAINTY_SOURCE,
      minzoom: 1.2,
      layout: { visibility: visible ? "visible" : "none" },
      paint: {
        "line-color": "#d4d4d8",
        "line-dasharray": [1.6, 1.2],
        "line-opacity": 0.84,
        "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.7, 9, 1.2, 13, 1.8],
      },
    } as any)
  }
  if (!map.getLayer(UNCERTAINTY_LABEL_LAYER)) {
    map.addLayer({
      id: UNCERTAINTY_LABEL_LAYER,
      type: "symbol",
      source: UNCERTAINTY_SOURCE,
      minzoom: 5,
      layout: {
        "text-field": ["get", "name"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 8, 9, 12, 11, 15, 13],
        "text-font": ["Noto Sans Regular"],
        "text-variable-anchor": ["top", "bottom", "left", "right"],
        "text-radial-offset": 0.45,
        "text-justify": "auto",
        visibility: visible ? "visible" : "none",
      } as any,
      paint: {
        "text-color": "#f4f4f5",
        "text-halo-color": "rgba(0, 0, 0, 0.8)",
        "text-halo-width": 1.2,
      },
    } as any)
  }
}

function ensureSampleOverlayLayers(map: maplibregl.Map, visible: boolean) {
  if (!map.getSource(SAMPLE_SOURCE)) {
    map.addSource(SAMPLE_SOURCE, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      generateId: true,
    } as any)
  }
  if (!map.getLayer(SAMPLE_DOT_LAYER)) {
    map.addLayer({
      id: SAMPLE_DOT_LAYER,
      type: "circle",
      source: SAMPLE_SOURCE,
      // May 21 2026 (Morgan: "no AM or EcM fungi on the map"). minzoom was
      // hardcoded to 5 here AND in the paint interpolations, so at the
      // default North America zoom 4 view MapLibre culled the entire layer
      // before ever drawing a dot. Now uses the SAMPLE_MIN_ZOOM constant
      // (2) so sample dots paint at continental view too.
      minzoom: SAMPLE_MIN_ZOOM,
      layout: { visibility: visible ? "visible" : "none" },
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 1.5, 5, 2, 9, 4, 13, 6, 17, 8],
        "circle-color": colorExpression(),
        "circle-stroke-color": "#08111f",
        "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 2, 0.3, 5, 0.6, 12, 1.1],
        "circle-opacity": 0.92,
      } as any,
    })
  }
  if (!map.getLayer(SAMPLE_ICON_LAYER)) {
    map.addLayer({
      id: SAMPLE_ICON_LAYER,
      type: "symbol",
      source: SAMPLE_SOURCE,
      minzoom: SAMPLE_ICON_MIN_ZOOM,
      layout: {
        "text-field": ["coalesce", ["get", "glyph"], "\u{1F344}"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 8, 7, 13, 10, 17, 12],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        visibility: visible ? "visible" : "none",
      } as any,
      paint: {
        "text-color": "#fff7ed",
        "text-halo-color": "rgba(0,0,0,0.65)",
        "text-halo-width": 0.7,
      },
    } as any)
  }
}

export function FungalAtlasLayer({
  map,
  enabled,
  bbox,
  zoom = 2,
  opacity = 1,
  sampleGroups = [],
}: Props) {
  const bboxStr = bbox ? bbox.map((n) => n.toFixed(6)).join(",") : ""
  const sampleGroupStr = useMemo(() => sampleGroups.filter(Boolean).join(","), [sampleGroups])
  const enabledKey = useMemo(
    () => [
      ...HEAT_LAYERS.map((heat) => `${heat.id}:${enabled[heat.id] ? 1 : 0}`),
      `samples:${enabled.samples ? 1 : 0}`,
    ].join("|"),
    [enabled],
  )
  const [viewportTick, setViewportTick] = useState(0)
  const [mapZoomLive, setMapZoomLive] = useState(zoom)
  const latestCellsRef = useRef<Record<HeatLayer, any[]>>({
    mycelium: [],
    am: [],
    ecm: [],
    rarity: [],
    endemic: [],
    fci: [],
    protected: [],
    uncertainty: [],
  })
  const latestRef = useRef({ enabled, zoom, opacity })
  latestRef.current = { enabled, zoom, opacity }

  useEffect(() => {
    try {
      if (!isFungaIsolationActive() || !Array.isArray((window as any).__crep_fungal_active_layer_ids)) {
        ;(window as any).__crep_fungal_atlas_enabled = liveEnabledSnapshot(enabled)
      }
    } catch {
      /* debug hook only */
    }
  }, [enabledKey, enabled])

  const needsViewportDrivenRefresh = useMemo(() => {
    const live = liveEnabledSnapshot(enabled)
    const cellLayerActive = HEAT_LAYERS.some(
      (heat) => !isSpunTileHeatLayer(heat.id) && Boolean(live[heat.id]),
    )
    return cellLayerActive || Boolean(live.samples || live.protected || live.uncertainty)
  }, [enabledKey, enabled])

  useEffect(() => {
    if (!map) return
    if (!needsViewportDrivenRefresh) return
    // Cell/sample overlays refetch on meaningful viewport changes only.
    // AM/ECM global rasters must never refresh on pan — MapLibre tiles pan natively.
    let timer: ReturnType<typeof setTimeout> | null = null
    let lastSignature = ""
    const computeSignature = () => {
      try {
        const z = Math.floor(map.getZoom?.() ?? 0)
        const b = map.getBounds?.()
        if (!b) return `z${z}`
        const cx = Math.round(((b.getWest() + b.getEast()) / 2) * 4) / 4
        const cy = Math.round(((b.getSouth() + b.getNorth()) / 2) * 4) / 4
        return `z${z}|${cx}|${cy}`
      } catch {
        return "?"
      }
    }
    const schedule = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        const sig = computeSignature()
        if (sig === lastSignature) return
        lastSignature = sig
        setViewportTick((tick) => (tick + 1) % 100_000)
      }, 400)
    }
    map.on("moveend", schedule)
    map.on("zoomend", schedule)
    schedule()
    return () => {
      if (timer) clearTimeout(timer)
      try { map.off("moveend", schedule) } catch {}
      try { map.off("zoomend", schedule) } catch {}
    }
  }, [map, needsViewportDrivenRefresh])

  useEffect(() => {
    if (!map) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const syncZoom = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        try {
          const nextZoom = map.getZoom?.() ?? zoom
          setMapZoomLive((prev) => (Math.abs(prev - nextZoom) > 0.02 ? nextZoom : prev))
        } catch {
          /* ignore map teardown */
        }
      }, 120)
    }
    map.on("zoomend", syncZoom)
    syncZoom()
    return () => {
      if (timer) clearTimeout(timer)
      try { map.off("zoomend", syncZoom) } catch {}
    }
  }, [map, zoom])

  useEffect(() => {
    if (!map) return
    const add = () => {
      if (!mapReady(map)) return
      const latest = {
        ...latestRef.current,
        enabled: liveEnabledSnapshot(latestRef.current.enabled),
        zoom: map.getZoom?.() ?? latestRef.current.zoom,
      }
      syncHeatLayerShells(map, latest)
      syncSupportOverlayLayers(map, latest)

      if (map.getLayer(SAMPLE_DOT_LAYER) && !(window as any).__crep_fungal_atlas_bound) {
        ;(window as any).__crep_fungal_atlas_bound = true
        map.on("click", SAMPLE_DOT_LAYER, (e: any) => {
          const f = e.features?.[0]
          if (!f) return
          const p = f.properties || {}
          const [lng, lat] = f.geometry?.coordinates || [e.lngLat?.lng, e.lngLat?.lat]
          const hook = (window as any).__crep_selectAsset
          if (typeof hook === "function") {
            hook({
              type: "fungal_atlas_sample",
              id: p.id,
              name: p.name || "Fungal atlas sample",
              lat,
              lng,
              properties: {
                ...p,
                precision_note:
                  "Sample points are source records; heatmap pixels are interpolated display detail with source-resolution metadata.",
              },
            })
          }
        })
        map.on("mouseenter", SAMPLE_DOT_LAYER, () => { map.getCanvas().style.cursor = "pointer" })
        map.on("mouseleave", SAMPLE_DOT_LAYER, () => { map.getCanvas().style.cursor = "" })
      }
    }

    let loadTimer: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (loadTimer) return
      loadTimer = setTimeout(() => {
        loadTimer = null
        add()
      }, 0)
    }
    if ((map as any).isStyleLoaded?.()) schedule()
    map.once("load", schedule)
    map.once("idle", schedule)

    return () => {
      if (loadTimer) clearTimeout(loadTimer)
      try { map.off("load", schedule) } catch {}
      try { map.off("idle", schedule) } catch {}
      // AM/ECM SPUN rasters stay mounted; visibility is owned by onLoad bootstrap
      // and CREPDashboardClient layer sync (same contract as sat/bathy/topo).
    }
  }, [map])

  useEffect(() => {
    if (!mapReady(map)) return
    const latest = {
      ...latestRef.current,
      enabled: liveEnabledSnapshot(latestRef.current.enabled),
      zoom: map.getZoom?.() ?? mapZoomLive ?? latestRef.current.zoom,
    }
    syncHeatLayerShells(map, latest)
    syncSupportOverlayLayers(map, latest)
    try {
      if (map.getLayer(SAMPLE_ICON_LAYER)) {
        map.setLayoutProperty(SAMPLE_ICON_LAYER, "text-field", ["coalesce", ["get", "glyph"], "\u{1F344}"])
      }
    } catch {}
  }, [map, enabledKey, opacity, mapZoomLive])

  // May 21 2026 (Morgan): cell-fetch — pulls real cells from
  // /api/crep/fungal-atlas?layer={id}&bbox=... for every enabled
  // heat layer and pushes the result into its cell GeoJSON source.
  // cellsToGeoJson() builds polygon features pre-coloured by the
  // layer's RICHNESS_STOPS / RARITY_STOPS ramp, so MapLibre paints
  // a true choropleth (blue→green→yellow for richness). One fetch
  // per enabled layer per significant viewport change (throttled via
  // viewportTick).
  useEffect(() => {
    if (!mapReady(map)) return
    const latest = {
      ...latestRef.current,
      enabled: liveEnabledSnapshot(latestRef.current.enabled),
      zoom: map.getZoom?.() ?? latestRef.current.zoom,
    }
    const activeBbox = getCurrentMapBbox(map) ?? parseBboxString(bboxStr) ?? STARTUP_FALLBACK_BBOX
    const [west, south, east, north] = activeBbox
    const bboxParam = `${west.toFixed(4)},${south.toFixed(4)},${east.toFixed(4)},${north.toFixed(4)}`
    let cancelled = false
    const controllers: AbortController[] = []
    const fetchCellsFor = async (heat: { id: HeatLayer; name: string; opacity: number; minZoom: number }) => {
      if (cancelled) return
      if (isSpunTileHeatLayer(heat.id)) return
      const enabledFlag = latest.enabled[heat.id]
      if (!enabledFlag) {
        try {
          const src = map.getSource(cellSourceId(heat.id)) as maplibregl.GeoJSONSource | undefined
          src?.setData?.({ type: "FeatureCollection", features: [] } as any)
        } catch { /* ignore */ }
        return
      }
      try {
        const controller = new AbortController()
        controllers.push(controller)
        const lngSpan = Math.abs(east - west)
        const latSpan = Math.abs(north - south)
        const useGlobalGlobeFetch =
          latest.zoom < 6 || lngSpan > 90 || latSpan > 45
        const cachedCells = latestCellsRef.current[heat.id]
        if (Array.isArray(cachedCells) && cachedCells.length > 0) {
          const cachedFc = cellsToGeoJson(cachedCells, heat.id)
          try {
            const src = map.getSource(cellSourceId(heat.id)) as maplibregl.GeoJSONSource | undefined
            src?.setData?.(cachedFc as any)
          } catch {
            /* ignore source churn */
          }
        }
        const q = new URLSearchParams({
          layer: heat.id,
          limit: useGlobalGlobeFetch
            ? "3000"
            : latest.zoom < 7
              ? "2600"
              : latest.zoom < 10
                ? "1800"
                : "1200",
        })
        if (!useGlobalGlobeFetch) {
          q.set("bbox", bboxParam)
        }
        const res = await fetch(`/api/crep/fungal-atlas?${q}`, {
          signal: controller.signal,
          cache: "default",
        })
        if (!res.ok || cancelled) return
        const body = await res.json()
        const cells = Array.isArray(body?.cells) ? body.cells : []
        if (cells.length > 0) latestCellsRef.current[heat.id] = cells
        const fc = cellsToGeoJson(cells, heat.id)
        const setData = (attempt = 0) => {
          if (cancelled) return
          const src = map.getSource(cellSourceId(heat.id)) as maplibregl.GeoJSONSource | undefined
          if (!src?.setData) {
            if (attempt < 30) window.setTimeout(() => setData(attempt + 1), 100)
            return
          }
          src.setData(fc as any)
        }
        setData()
      } catch (error) {
        console.warn(`[CREP/FungalAtlas] cells fetch failed for ${heat.id}:`, (error as Error)?.message)
      }
    }
    const activeCellLayers = HEAT_LAYERS.filter(
      (heat) => !isSpunTileHeatLayer(heat.id) && Boolean(latest.enabled[heat.id]),
    )
    for (const heat of activeCellLayers) void fetchCellsFor(heat)
    return () => {
      cancelled = true
      for (const controller of controllers) {
        try {
          controller.abort()
        } catch {
          /* ignore abort races */
        }
      }
    }
  }, [map, enabledKey, bboxStr, viewportTick])

  useEffect(() => {
    if (!mapReady(map)) return
    const syncSupportLayers = () => {
      if (!mapReady(map)) return
      const currentEnabled = liveEnabledSnapshot(latestRef.current.enabled)
      const currentZoom = map.getZoom?.() ?? zoom
      syncSupportOverlayLayers(map, { enabled: currentEnabled, zoom: currentZoom })
    }
    syncSupportLayers()
    const currentEnabled = liveEnabledSnapshot(latestRef.current.enabled)
    const hasSupportLayerEnabled = Boolean(currentEnabled.protected || currentEnabled.uncertainty || currentEnabled.samples)
    const timers = hasSupportLayerEnabled ? [250, 900, 1800].map((delay) => setTimeout(syncSupportLayers, delay)) : []
    return () => {
      for (const timer of timers) clearTimeout(timer)
    }
  }, [map, enabled.protected, enabled.uncertainty, enabled.samples, zoom, viewportTick])

  useEffect(() => {
    const currentEnabled = liveEnabledSnapshot(latestRef.current.enabled)
    if (!mapReady(map) || !currentEnabled.samples) return
    const currentZoom = map.getZoom?.() ?? zoom
    if (currentZoom < SAMPLE_MIN_ZOOM) return
    const activeBbox = getCurrentMapBbox(map) ?? parseBboxString(bboxStr)
    if (!activeBbox) return
    const activeBboxStr = activeBbox.map((n) => n.toFixed(6)).join(",")
    let cancelled = false
    // May 21 2026 (Morgan: "no AM or ECM fungi on the map"). The previous
    // 600 ms setTimeout meant React Strict Mode's mount → unmount → mount
    // cycle in dev cancelled the first scheduled poll. The second mount
    // re-scheduled, but if any dep then changed inside 600 ms we'd lose
    // that one too — and at startup mapZoom/mapBounds settle through a
    // few values fast. Drop the delay: fire the fetch on the next
    // microtask. Cancellation still works via the `cancelled` closure
    // for in-flight requests.
    const applyData = (features: any[], attempt = 0): boolean => {
      if (cancelled) return true
      const src = map.getSource(SAMPLE_SOURCE) as maplibregl.GeoJSONSource | undefined
      if (!src?.setData) {
        // May 21 2026 (Morgan: "no AM/EcM fungi on the map"). The sample
        // source is added 120 ms after mount by the layer's main add()
        // pass, but this fetch fires immediately. Without a retry, the
        // first setData was a no-op (src undefined) and the sample
        // points never painted. Poll the source up to ~3 s.
        if (attempt < 30) {
          window.setTimeout(() => applyData(features, attempt + 1), 100)
        }
        return false
      }
      src.setData({
        type: "FeatureCollection",
        features: Array.isArray(features) ? features : [],
      } as any)
      return true
    }
    const poll = async () => {
      if (cancelled) return
      try {
        const q = new URLSearchParams({
          bbox: activeBboxStr,
          zoom: String(currentZoom),
          // Startup/load-shedding budget: avoid large sample spikes.
          limit: currentZoom < 4 ? "1000" : currentZoom < 7 ? "1800" : currentZoom < 10 ? "2200" : currentZoom < 13 ? "1200" : "700",
        })
        if (sampleGroupStr) q.set("groups", sampleGroupStr)
        const res = await fetch(`/api/crep/fungal-atlas/samples?${q}`, {
          signal: AbortSignal.timeout(12_000),
          cache: "default",
        })
        if (!res.ok) return
        const fc = await res.json()
        if (cancelled) return
        applyData(fc.features)
      } catch (error) {
        console.warn("[CREP/FungalAtlas] sample fetch failed:", (error as Error)?.message)
      }
    }
    void poll()
    return () => {
      cancelled = true
    }
  }, [map, enabled.samples, bboxStr, zoom, sampleGroupStr, viewportTick])

  return null
}
