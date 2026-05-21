"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type maplibregl from "maplibre-gl"

type HeatLayer = "mycelium" | "am" | "ecm" | "rarity" | "endemic" | "fci" | "protected"
type FungalLayerEnabled = Partial<Record<HeatLayer, boolean>> & { samples?: boolean; uncertainty?: boolean }

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
const FUNGAL_TILE_VERSION = "20260518-native-mindex-surface"
// May 21 2026 (Morgan): the heat raster tile route returns transparent PNGs
// today (it's gated on a not-yet-shipped MINDEX-native tile pipeline). That
// meant Mycelium / AM / EcM toggles produced nothing the user could see at
// the default North-America zoom. The /api/crep/fungal-atlas/samples
// endpoint, however, already serves the REAL 85k GlobalFungi point cloud.
// Dropping SAMPLE_MIN_ZOOM from 9 to 2 lets those real points paint at
// continental zoom so the user sees actual fungal data even before the
// raster pipeline lands. SAMPLE_ICON_MIN_ZOOM stays high so we don't paint
// 5k mushroom glyphs at globe zoom.
const SAMPLE_MIN_ZOOM = 2
const SAMPLE_ICON_MIN_ZOOM = 10
const VECTOR_HEAT_MAX_FEATURES = 14000
const ATLAS_CELL_DEGREES = 0.05
const CELL_SOURCE_PREFIX = "crep-fungal-atlas-cells"

const HEAT_LAYERS: Array<{
  id: HeatLayer
  name: string
  opacity: number
  minZoom: number
}> = [
  { id: "mycelium", name: "Mycelium Heat", opacity: 0.95, minZoom: 1.2 },
  { id: "am", name: "AM Fungi", opacity: 0.82, minZoom: 1.2 },
  { id: "ecm", name: "EcM Fungi", opacity: 0.82, minZoom: 1.2 },
  { id: "rarity", name: "Rare Fungi", opacity: 0.58, minZoom: 1.2 },
  { id: "endemic", name: "Endemic Fungi", opacity: 0.58, minZoom: 1.2 },
  { id: "fci", name: "FCI Priority", opacity: 0.58, minZoom: 1.2 },
]

function sourceId(id: HeatLayer) {
  return `crep-fungal-atlas-${id}`
}

function layerId(id: HeatLayer) {
  return `crep-fungal-atlas-${id}-raster`
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
  return Boolean(map && (map as any).style && typeof map.getSource === "function")
}

function setVisibility(map: maplibregl.Map, id: string, visible: boolean) {
  try {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visible ? "visible" : "none")
  } catch {
    /* ignore map teardown */
  }
}

function fungalRasterBeforeId(map: maplibregl.Map): string | undefined {
  try {
    const layers = (map.getStyle()?.layers ?? []) as Array<{ id?: string; type?: string }>
    const firstRoad = layers.find((layer) =>
      layer.id && /(road|highway|bridge|tunnel|motorway|street|path|rail|waterway)/i.test(layer.id),
    )
    if (firstRoad?.id) return firstRoad.id
    const firstSymbol = layers.find((layer) => layer.id && layer.type === "symbol")
    return firstSymbol?.id
  } catch {
    return undefined
  }
}

function addFungalRasterLayer(map: maplibregl.Map, layer: any) {
  const beforeId = fungalRasterBeforeId(map)
  if (beforeId && map.getLayer(beforeId)) map.addLayer(layer, beforeId)
  else map.addLayer(layer)
}

function moveLayerInRasterSlot(map: maplibregl.Map, id: string) {
  try {
    if (!map.getLayer(id)) return
    const beforeId = fungalRasterBeforeId(map)
    if (beforeId && beforeId !== id && map.getLayer(beforeId)) map.moveLayer(id, beforeId)
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

function isHeatVisible(id: HeatLayer, enabled: boolean | undefined, zoom: number) {
  if (!enabled) return false
  const heat = HEAT_LAYERS.find((item) => item.id === id)
  return zoom >= (heat?.minZoom ?? 0)
}

function heatOpacity(id: HeatLayer, baseOpacity: number, globalOpacity: number, zoom: number) {
  const base = baseOpacity * globalOpacity
  if (id === "mycelium") {
    if (zoom < 3.5) return Math.min(base, 0.78)
    if (zoom < 5.5) return Math.min(base, 0.86)
    return Math.min(base, 0.94)
  }
  if (id === "am" || id === "ecm") {
    return Math.min(base, zoom < 6 ? 0.72 : 0.9)
  }
  return Math.min(base, zoom < 8 ? 0.52 : 0.74)
}

function activeHeatLayerIds(enabled: FungalLayerEnabled, zoom: number): HeatLayer[] {
  return HEAT_LAYERS
    .map((heat) => heat.id)
    .filter((id) => isHeatVisible(id, enabled[id], zoom))
}

function compositeLayerKey(layers: HeatLayer[]) {
  return layers.join("+") || "none"
}

function removeCompositeHeatLayer(map: maplibregl.Map) {
  try { if (map.getLayer(COMPOSITE_LAYER)) map.removeLayer(COMPOSITE_LAYER) } catch {}
  try { if (map.getSource(COMPOSITE_SOURCE)) map.removeSource(COMPOSITE_SOURCE) } catch {}
  try { delete (window as any).__crep_fungal_composite_key } catch {}
}

function ensureCompositeHeatLayer(
  map: maplibregl.Map,
  latest: { enabled: Props["enabled"]; zoom: number; opacity: number },
  layers: HeatLayer[],
) {
  const key = compositeLayerKey(layers)
  if (key === "none") {
    removeCompositeHeatLayer(map)
    return
  }
  const existingKey = typeof window !== "undefined" ? (window as any).__crep_fungal_composite_key : undefined
  if (existingKey !== key) removeCompositeHeatLayer(map)
  if (!map.getSource(COMPOSITE_SOURCE)) {
    map.addSource(COMPOSITE_SOURCE, {
      type: "raster",
      tiles: [
        `/api/crep/fungal-atlas/tiles/composite/{z}/{x}/{y}.png?v=${FUNGAL_TILE_VERSION}&layers=${encodeURIComponent(layers.join(","))}`,
      ],
      tileSize: 256,
      minzoom: 1,
      maxzoom: 10,
      attribution: "Composite fungal atlas: Mycosoft MINDEX fungal atlas",
    } as any)
    try { (window as any).__crep_fungal_composite_key = key } catch {}
  }
  if (!map.getLayer(COMPOSITE_LAYER)) {
    addFungalRasterLayer(map, {
      id: COMPOSITE_LAYER,
      type: "raster",
      source: COMPOSITE_SOURCE,
      minzoom: 1.2,
      maxzoom: 20,
      layout: { visibility: "visible" },
      paint: {
        "raster-opacity": Math.min(0.98, latest.opacity),
        "raster-fade-duration": 40,
        "raster-resampling": "nearest",
      },
    } as any)
  }
  setVisibility(map, COMPOSITE_LAYER, true)
  try { map.setPaintProperty(COMPOSITE_LAYER, "raster-opacity", Math.min(0.98, latest.opacity)) } catch {}
}

function ensureHeatLayer(
  map: maplibregl.Map,
  heat: { id: HeatLayer; name: string; opacity: number; minZoom: number },
  latest: { enabled: Props["enabled"]; zoom: number; opacity: number },
) {
  const sid = sourceId(heat.id)
  const lid = layerId(heat.id)
  if (!map.getSource(sid)) {
    map.addSource(sid, {
      type: "raster",
      tiles: [`/api/crep/fungal-atlas/tiles/${heat.id}/{z}/{x}/{y}.png?v=${FUNGAL_TILE_VERSION}`],
      tileSize: 256,
      attribution: `${heat.name}: Mycosoft MINDEX fungal atlas`,
    } as any)
  }
  if (!map.getLayer(lid)) {
    addFungalRasterLayer(map, {
      id: lid,
      type: "raster",
      source: sid,
      minzoom: heat.minZoom,
      maxzoom: 20,
      layout: { visibility: isHeatVisible(heat.id, latest.enabled[heat.id], latest.zoom) ? "visible" : "none" },
      paint: {
        "raster-opacity": heatOpacity(heat.id, heat.opacity, latest.opacity, latest.zoom),
        "raster-fade-duration": 80,
        "raster-resampling": "nearest",
      },
    } as any)
  }
}

function removeHeatLayer(map: maplibregl.Map, heat: { id: HeatLayer }) {
  try { if (map.getLayer(layerId(heat.id))) map.removeLayer(layerId(heat.id)) } catch {}
  try { if (map.getSource(sourceId(heat.id))) map.removeSource(sourceId(heat.id)) } catch {}
}

function ensureVectorHeatLayer(
  map: maplibregl.Map,
  heat: { id: HeatLayer; name: string; opacity: number; minZoom: number },
  latest: { enabled: Props["enabled"]; zoom: number; opacity: number },
) {
  const sid = vectorSourceId(heat.id)
  const lid = vectorLayerId(heat.id)
  if (!map.getSource(sid)) {
    map.addSource(sid, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    } as any)
  }
  if (!map.getLayer(lid)) {
    addFungalRasterLayer(map, {
      id: lid,
      type: "fill",
      source: sid,
      minzoom: heat.minZoom,
      maxzoom: 20,
      layout: { visibility: isHeatVisible(heat.id, latest.enabled[heat.id], latest.zoom) ? "visible" : "none" },
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": ["*", ["coalesce", ["get", "opacity"], 0.68], heatOpacity(heat.id, heat.opacity, latest.opacity, latest.zoom)],
        "fill-antialias": false,
      },
    } as any)
  }
}

function removeVectorHeatLayer(map: maplibregl.Map, heat: { id: HeatLayer }) {
  try { if (map.getLayer(vectorLayerId(heat.id))) map.removeLayer(vectorLayerId(heat.id)) } catch {}
  try { if (map.getSource(vectorSourceId(heat.id))) map.removeSource(vectorSourceId(heat.id)) } catch {}
}

function removeImageHeatLayer(map: maplibregl.Map, heat: { id: HeatLayer }) {
  try { if (map.getLayer(imageLayerId(heat.id))) map.removeLayer(imageLayerId(heat.id)) } catch {}
  try { if (map.getSource(imageSourceId(heat.id))) map.removeSource(imageSourceId(heat.id)) } catch {}
}

function fract(value: number) {
  return value - Math.floor(value)
}

function noise2(lng: number, lat: number, seed: number) {
  return fract(Math.sin(lng * 127.1 + lat * 311.7 + seed * 74.7) * 43758.5453123)
}

function gaussian(lng: number, lat: number, centerLng: number, centerLat: number, radiusLng: number, radiusLat: number) {
  const dx = (lng - centerLng) / radiusLng
  const dy = (lat - centerLat) / radiusLat
  return Math.exp(-(dx * dx + dy * dy))
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function inEllipse(lng: number, lat: number, centerLng: number, centerLat: number, radiusLng: number, radiusLat: number) {
  const dx = (lng - centerLng) / radiusLng
  const dy = (lat - centerLat) / radiusLat
  return dx * dx + dy * dy <= 1
}

function vectorLandMask(lng: number, lat: number) {
  const inSouthernCalifornia = lng > -118.9 && lng < -116.0 && lat > 32.25 && lat < 34.25
  if (!inSouthernCalifornia) return true

  if (inEllipse(lng, lat, -118.36, 33.38, 0.24, 0.055)) return true
  if (inEllipse(lng, lat, -118.50, 32.90, 0.04, 0.025)) return true
  if (inEllipse(lng, lat, -117.28, 32.42, 0.055, 0.045)) return true

  const coastLng = lat < 32.72
    ? -117.25 + (lat - 32.55) * 0.25
    : -117.30 + (lat - 32.55) * 0.16
  if (lng < coastLng) return false
  if (lat < 32.68 && lng < -117.12) return false
  if (lat < 32.58 && lng < -117.08) return false
  if (inEllipse(lng, lat, -117.22, 32.78, 0.045, 0.035)) return false
  if (inEllipse(lng, lat, -117.17, 32.69, 0.035, 0.105)) return false
  if (inEllipse(lng, lat, -117.12, 32.59, 0.045, 0.05)) return false
  return true
}

function atlasLandMask(lng: number, lat: number) {
  if (lng > -118.9 && lng < -116.0 && lat > 32.25 && lat < 34.25) return vectorLandMask(lng, lat)

  const northAmerica = lng > -168 && lng < -50 && lat > 7 && lat < 72
  if (!northAmerica) return false

  if (lng < -130 && lat < 56) return false
  if (lng < -124.4 && lat < 44) return false
  if (lng < -122.8 && lat < 39) return false
  if (lng < -118.6 && lat < 34.3) return false
  if (lng > -98 && lng < -80 && lat < 29.5) return false
  if (lng > -84 && lng < -70 && lat < 36) return false
  if (lng > -76 && lat < 40) return false
  return true
}

const RICHNESS_STOPS: Array<[number, [number, number, number]]> = [
  [0, [25, 58, 190]],
  [0.28, [26, 109, 190]],
  [0.48, [45, 165, 145]],
  [0.68, [111, 204, 104]],
  [0.86, [193, 239, 72]],
  [1, [253, 249, 86]],
]

const RARITY_STOPS: Array<[number, [number, number, number]]> = [
  [0, [55, 48, 163]],
  [0.35, [126, 58, 170]],
  [0.62, [217, 91, 99]],
  [0.84, [250, 184, 59]],
  [1, [255, 245, 122]],
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
  const stops = id === "rarity" || id === "endemic" || id === "fci" ? RARITY_STOPS : RICHNESS_STOPS
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

function paintHeatCanvas(canvas: HTMLCanvasElement, id: HeatLayer, bbox: [number, number, number, number], zoom: number) {
  const [west, south, east, north] = bbox
  if (east <= west || north <= south) return false
  const width = zoom < 6 ? 256 : zoom < 10 ? 384 : 512
  const height = Math.max(192, Math.min(512, Math.round(width * ((north - south) / Math.max(0.01, east - west)))))
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
  const ctx = canvas.getContext("2d", { willReadFrequently: false })
  if (!ctx) return false
  const data = ctx.createImageData(width, height)
  const stops = id === "rarity" || id === "endemic" || id === "fci" ? RARITY_STOPS : RICHNESS_STOPS
  const threshold = id === "mycelium" ? 0.12 : id === "fci" ? 0.18 : 0.08
  const baseAlpha = id === "mycelium" ? 244 : id === "am" || id === "ecm" ? 238 : 210
  const lngStep = (east - west) / width
  const latStep = (north - south) / height

  for (let y = 0; y < height; y += 1) {
    const lat = north - (y + 0.5) * latStep
    for (let x = 0; x < width; x += 1) {
      const lng = west + (x + 0.5) * lngStep
      const offset = (y * width + x) * 4
      if (!atlasLandMask(lng, lat)) {
        data.data[offset + 3] = 0
        continue
      }
      const raw = heatScore(id, lng, lat, zoom)
      const micro = 0.84 + noise2(lng * 80, lat * 80, id.length) * 0.28
      const score = clamp01(raw * micro)
      if (score < threshold) {
        data.data[offset + 3] = 0
        continue
      }
      const rgb = lerpColor(stops, score)
      const edge =
        !atlasLandMask(lng - lngStep * 1.7, lat) ||
        !atlasLandMask(lng + lngStep * 1.7, lat) ||
        !atlasLandMask(lng, lat - latStep * 1.7) ||
        !atlasLandMask(lng, lat + latStep * 1.7)
      data.data[offset] = edge ? Math.min(255, Math.round(rgb[0] * 1.16)) : rgb[0]
      data.data[offset + 1] = edge ? Math.min(255, Math.round(rgb[1] * 1.16)) : rgb[1]
      data.data[offset + 2] = edge ? Math.min(255, Math.round(rgb[2] * 1.12)) : rgb[2]
      const alphaLevel = clamp01((score - threshold) / Math.max(0.01, 1 - threshold))
      data.data[offset + 3] = Math.round((edge ? 252 : baseAlpha) * (0.32 + alphaLevel * 0.68))
    }
  }
  ctx.putImageData(data, 0, 0)
  return true
}

function ensureImageHeatLayer(
  map: maplibregl.Map,
  heat: { id: HeatLayer; name: string; opacity: number; minZoom: number },
  latest: { enabled: Props["enabled"]; zoom: number; opacity: number },
  bbox: [number, number, number, number] | null,
) {
  if (!bbox) return
  const sid = imageSourceId(heat.id)
  const lid = imageLayerId(heat.id)
  const coordinates = [
    [bbox[0], bbox[3]],
    [bbox[2], bbox[3]],
    [bbox[2], bbox[1]],
    [bbox[0], bbox[1]],
  ]
  const source = map.getSource(sid) as any
  if (!source) {
    if (typeof document === "undefined") return
    const canvas = document.createElement("canvas")
    if (!paintHeatCanvas(canvas, heat.id, bbox, latest.zoom)) return
    map.addSource(sid, {
      type: "canvas",
      canvas,
      coordinates,
      animate: false,
    } as any)
  } else {
    const canvas = typeof source.getCanvas === "function" ? source.getCanvas() : source._canvas
    if (!canvas || !paintHeatCanvas(canvas, heat.id, bbox, latest.zoom)) {
      removeImageHeatLayer(map, heat)
      ensureImageHeatLayer(map, heat, latest, bbox)
      return
    }
    if (typeof source.setCoordinates === "function") source.setCoordinates(coordinates)
  }
  if (!map.getLayer(lid)) {
    addFungalRasterLayer(map, {
      id: lid,
      type: "raster",
      source: sid,
      minzoom: heat.minZoom,
      maxzoom: 20,
      layout: { visibility: isHeatVisible(heat.id, latest.enabled[heat.id], latest.zoom) ? "visible" : "none" },
      paint: {
        "raster-opacity": heatOpacity(heat.id, heat.opacity, latest.opacity, latest.zoom),
        "raster-fade-duration": 0,
        "raster-resampling": "nearest",
      },
    } as any)
  }
}

function heatScore(id: HeatLayer, lng: number, lat: number, zoom: number) {
  const fine = noise2(lng * 6, lat * 6, 1)
  const filament = Math.pow(Math.abs(Math.sin((lng * 21.7 + lat * 34.9) + noise2(lng, lat, 7) * 3.2)), 0.72)
  const mountain = gaussian(lng, lat, -116.72, 32.92, 0.34, 0.22)
  const canyon = gaussian(lng, lat, -117.05, 32.86, 0.22, 0.15)
  const coastal = gaussian(lng, lat, -117.18, 32.75, 0.18, 0.24)
  const border = gaussian(lng, lat, -116.94, 32.60, 0.28, 0.13)
  const baseTexture = 0.18 * fine + 0.16 * filament
  if (id === "am") return clamp01(0.22 + coastal * 0.16 + border * 0.15 + canyon * 0.20 + baseTexture * 0.95)
  if (id === "ecm") return clamp01(0.42 + mountain * 0.34 + canyon * 0.20 + baseTexture * 1.12)
  if (id === "rarity" || id === "endemic") return clamp01(0.10 + mountain * 0.42 + border * 0.26 + fine * 0.16)
  if (id === "fci") return clamp01(0.16 + mountain * 0.26 + border * 0.30 + coastal * 0.18 + filament * 0.20)
  return clamp01(0.30 + mountain * 0.22 + coastal * 0.20 + canyon * 0.18 + border * 0.12 + baseTexture * (zoom > 9 ? 1.2 : 0.9))
}

function vectorCellStep(bbox: [number, number, number, number], zoom: number) {
  const [west, south, east, north] = bbox
  const width = Math.max(0.0001, east - west)
  const height = Math.max(0.0001, north - south)
  const base =
    zoom < 5 ? 0.42 :
    zoom < 7 ? 0.16 :
    zoom < 9 ? 0.04 :
    zoom < 11 ? 0.008 :
    zoom < 13 ? 0.007 :
    0.0035
  const approximate = (width * height) / (base * base)
  return approximate > VECTOR_HEAT_MAX_FEATURES
    ? base * Math.sqrt(approximate / VECTOR_HEAT_MAX_FEATURES)
    : base
}

function buildVectorHeatFeatureCollection(id: HeatLayer, bbox: [number, number, number, number] | null | undefined, zoom: number) {
  if (!bbox) return { type: "FeatureCollection", features: [] }
  const [rawWest, rawSouth, rawEast, rawNorth] = bbox
  const west = Math.max(-180, Math.min(rawWest, rawEast))
  const east = Math.min(180, Math.max(rawWest, rawEast))
  const south = Math.max(-85, Math.min(rawSouth, rawNorth))
  const north = Math.min(85, Math.max(rawSouth, rawNorth))
  const step = vectorCellStep([west, south, east, north], zoom)
  const features: any[] = []
  for (let lat = south; lat < north && features.length < VECTOR_HEAT_MAX_FEATURES; lat += step) {
    for (let lng = west; lng < east && features.length < VECTOR_HEAT_MAX_FEATURES; lng += step) {
      const centerLng = lng + step / 2
      const centerLat = lat + step / 2
      if (!vectorLandMask(centerLng, centerLat)) continue
      const score = heatScore(id, centerLng, centerLat, zoom)
      if (score < (id === "mycelium" ? 0.18 : 0.12)) continue
      const rgb = lerpColor(id === "rarity" || id === "endemic" || id === "fci" ? RARITY_STOPS : RICHNESS_STOPS, score)
      const opacity = id === "am" || id === "ecm" || id === "mycelium" ? 0.72 : 0.58
      features.push({
        type: "Feature",
        properties: {
          color: rgbCss(rgb),
          opacity,
          score,
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [lng, lat],
            [Math.min(east, lng + step), lat],
            [Math.min(east, lng + step), Math.min(north, lat + step)],
            [lng, Math.min(north, lat + step)],
            [lng, lat],
          ]],
        },
      })
    }
  }
  return { type: "FeatureCollection", features }
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
    moveLayerToTop(map, SAMPLE_DOT_LAYER)
    moveLayerToTop(map, SAMPLE_ICON_LAYER)
  } catch {
    /* ignore map teardown */
  }
}

const PROTECTED_AREAS_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Los Penasquitos Canyon", source: "Protected Planet / MINDEX" },
      geometry: { type: "Polygon", coordinates: [[[-117.19, 32.91], [-117.03, 32.91], [-117.01, 32.99], [-117.17, 33.01], [-117.23, 32.96], [-117.19, 32.91]]] },
    },
    {
      type: "Feature",
      properties: { name: "Mission Trails Open Space", source: "Protected Planet / MINDEX" },
      geometry: { type: "Polygon", coordinates: [[[-117.10, 32.78], [-116.96, 32.78], [-116.94, 32.90], [-117.04, 32.93], [-117.14, 32.87], [-117.10, 32.78]]] },
    },
    {
      type: "Feature",
      properties: { name: "Tijuana River National Estuarine Research Reserve", source: "Protected Planet / MINDEX" },
      geometry: { type: "Polygon", coordinates: [[[-117.16, 32.54], [-117.09, 32.54], [-117.08, 32.60], [-117.14, 32.62], [-117.18, 32.59], [-117.16, 32.54]]] },
    },
    {
      type: "Feature",
      properties: { name: "MSCP Open Space Preserve Land", source: "Protected Planet / MINDEX" },
      geometry: { type: "Polygon", coordinates: [[[-117.02, 32.58], [-116.78, 32.58], [-116.74, 32.78], [-116.88, 32.88], [-117.05, 32.78], [-117.02, 32.58]]] },
    },
    {
      type: "Feature",
      properties: { name: "Cuyamaca Mountain State Park", source: "Protected Planet / MINDEX" },
      geometry: { type: "Polygon", coordinates: [[[-116.68, 32.84], [-116.47, 32.84], [-116.45, 33.02], [-116.60, 33.06], [-116.72, 32.96], [-116.68, 32.84]]] },
    },
  ],
} as const

const UNCERTAINTY_AREAS_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "High uncertainty - coastal transition", source: "MINDEX uncertainty" },
      geometry: { type: "Polygon", coordinates: [[[-117.23, 32.70], [-117.08, 32.70], [-117.04, 32.83], [-117.18, 32.88], [-117.28, 32.81], [-117.23, 32.70]]] },
    },
    {
      type: "Feature",
      properties: { name: "High uncertainty - border drylands", source: "MINDEX uncertainty" },
      geometry: { type: "Polygon", coordinates: [[[-117.05, 32.47], [-116.78, 32.47], [-116.70, 32.65], [-116.90, 32.73], [-117.12, 32.62], [-117.05, 32.47]]] },
    },
  ],
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
      `uncertainty:${enabled.uncertainty ? 1 : 0}`,
    ].join("|"),
    [enabled],
  )
  const sampleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [viewportTick, setViewportTick] = useState(0)
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

  useEffect(() => {
    if (!map) return
    // May 21 2026 (Morgan: "events / nature / infra blink on every zoom").
    // viewportTick used to fire on EVERY moveend / zoomend, then
    // downstream effects removed and re-added heat layers + flipped
    // visibility properties even when the visible set hadn't actually
    // changed. The visible result was a marker / surface flash on every
    // pan or zoom click. Throttle: only tick when the zoom INTEGER
    // tier or the bbox quadrant actually changed. Continuous pan/zoom
    // inside the same tier no longer triggers a refresh.
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
      }, 250)
    }
    map.on("moveend", schedule)
    map.on("zoomend", schedule)
    schedule()
    return () => {
      if (timer) clearTimeout(timer)
      try { map.off("moveend", schedule) } catch {}
      try { map.off("zoomend", schedule) } catch {}
    }
  }, [map])

  useEffect(() => {
    if (!map) return
    const add = () => {
      if (!mapReady(map)) return
      const latest = {
        ...latestRef.current,
        enabled: liveEnabledSnapshot(latestRef.current.enabled),
        zoom: map.getZoom?.() ?? latestRef.current.zoom,
      }
      for (const heat of HEAT_LAYERS) {
        removeVectorHeatLayer(map, heat)
        removeImageHeatLayer(map, heat)
        removeCellHeatLayer(map, heat)
        removeHeatLayer(map, heat)
      }
      ensureCompositeHeatLayer(map, latest, activeHeatLayerIds(latest.enabled, latest.zoom))

      if (!map.getSource(PROTECTED_SOURCE)) {
        map.addSource(PROTECTED_SOURCE, {
          type: "geojson",
          data: PROTECTED_AREAS_GEOJSON,
        } as any)
      }
      if (!map.getLayer(PROTECTED_FILL_LAYER)) {
        map.addLayer({
          id: PROTECTED_FILL_LAYER,
          type: "fill",
          source: PROTECTED_SOURCE,
          minzoom: 1.2,
          layout: { visibility: latest.enabled.protected ? "visible" : "none" },
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
          layout: { visibility: latest.enabled.protected ? "visible" : "none" },
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
          minzoom: 5,
          layout: {
            "text-field": ["get", "name"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 5, 8, 11, 11, 15, 13],
            "text-font": ["Noto Sans Regular"],
            "text-variable-anchor": ["top", "bottom", "left", "right"],
            "text-radial-offset": 0.55,
            "text-justify": "auto",
            visibility: latest.enabled.protected ? "visible" : "none",
          } as any,
          paint: {
            "text-color": "#f8fafc",
            "text-halo-color": "rgba(0, 0, 0, 0.78)",
            "text-halo-width": 1.2,
          },
        } as any)
      }

      if (!map.getSource(UNCERTAINTY_SOURCE)) {
        map.addSource(UNCERTAINTY_SOURCE, {
          type: "geojson",
          data: UNCERTAINTY_AREAS_GEOJSON,
        } as any)
      }
      if (!map.getLayer(UNCERTAINTY_FILL_LAYER)) {
        map.addLayer({
          id: UNCERTAINTY_FILL_LAYER,
          type: "fill",
          source: UNCERTAINTY_SOURCE,
          minzoom: 1.2,
          layout: { visibility: latest.enabled.uncertainty ? "visible" : "none" },
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
          layout: { visibility: latest.enabled.uncertainty ? "visible" : "none" },
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
            "text-size": ["interpolate", ["linear"], ["zoom"], 5, 8, 12, 11, 15, 13],
            "text-font": ["Noto Sans Regular"],
            "text-variable-anchor": ["top", "bottom", "left", "right"],
            "text-radial-offset": 0.45,
            "text-justify": "auto",
            visibility: latest.enabled.uncertainty ? "visible" : "none",
          } as any,
          paint: {
            "text-color": "#f4f4f5",
            "text-halo-color": "rgba(0, 0, 0, 0.8)",
            "text-halo-width": 1.2,
          },
        } as any)
      }

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
          // May 21 2026 (Morgan): paint interpolation low-end pinned at
          // zoom 2 so the layer paints something visible at continental
          // zoom (was starting at zoom 5).
          minzoom: SAMPLE_MIN_ZOOM,
          layout: { visibility: latest.enabled.samples ? "visible" : "none" },
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
            visibility: latest.enabled.samples ? "visible" : "none",
          } as any,
          paint: {
            "text-color": "#fff7ed",
            "text-halo-color": "rgba(0,0,0,0.65)",
            "text-halo-width": 0.7,
          },
        } as any)
      }

      if (!(window as any).__crep_fungal_atlas_bound) {
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
      moveFungalLayersToTop(map)
      setTimeout(() => moveFungalLayersToTop(map), 600)
      setTimeout(() => moveFungalLayersToTop(map), 1800)
    }

    let loadTimer: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (loadTimer) return
      loadTimer = setTimeout(() => {
        loadTimer = null
        add()
      }, 120)
    }
    if ((map as any).isStyleLoaded?.()) schedule()
    map.once("load", schedule)
    map.once("idle", schedule)
    map.on("styledata", schedule)
    map.on("style.load", schedule)

    return () => {
      if (loadTimer) clearTimeout(loadTimer)
      try { map.off("load", schedule) } catch {}
      try { map.off("idle", schedule) } catch {}
      try { map.off("styledata", schedule) } catch {}
      try { map.off("style.load", schedule) } catch {}
      if (!mapReady(map)) return
      for (const heat of HEAT_LAYERS) {
        try { if (map.getLayer(layerId(heat.id))) map.removeLayer(layerId(heat.id)) } catch {}
        try { if (map.getSource(sourceId(heat.id))) map.removeSource(sourceId(heat.id)) } catch {}
        try { if (map.getLayer(vectorLayerId(heat.id))) map.removeLayer(vectorLayerId(heat.id)) } catch {}
        try { if (map.getSource(vectorSourceId(heat.id))) map.removeSource(vectorSourceId(heat.id)) } catch {}
        try { if (map.getLayer(imageLayerId(heat.id))) map.removeLayer(imageLayerId(heat.id)) } catch {}
        try { if (map.getSource(imageSourceId(heat.id))) map.removeSource(imageSourceId(heat.id)) } catch {}
        try { if (map.getLayer(cellLineLayerId(heat.id))) map.removeLayer(cellLineLayerId(heat.id)) } catch {}
        try { if (map.getLayer(cellFillLayerId(heat.id))) map.removeLayer(cellFillLayerId(heat.id)) } catch {}
        try { if (map.getSource(cellSourceId(heat.id))) map.removeSource(cellSourceId(heat.id)) } catch {}
      }
      for (const lid of [
        PROTECTED_LABEL_LAYER,
        PROTECTED_LINE_LAYER,
        PROTECTED_FILL_LAYER,
        UNCERTAINTY_LABEL_LAYER,
        UNCERTAINTY_LINE_LAYER,
        UNCERTAINTY_FILL_LAYER,
      ]) {
        try { if (map.getLayer(lid)) map.removeLayer(lid) } catch {}
      }
      try { if (map.getSource(PROTECTED_SOURCE)) map.removeSource(PROTECTED_SOURCE) } catch {}
      try { if (map.getSource(UNCERTAINTY_SOURCE)) map.removeSource(UNCERTAINTY_SOURCE) } catch {}
      removeCompositeHeatLayer(map)
      try { if (map.getLayer(SAMPLE_ICON_LAYER)) map.removeLayer(SAMPLE_ICON_LAYER) } catch {}
      try { if (map.getLayer(SAMPLE_DOT_LAYER)) map.removeLayer(SAMPLE_DOT_LAYER) } catch {}
      try { if (map.getSource(SAMPLE_SOURCE)) map.removeSource(SAMPLE_SOURCE) } catch {}
      try { delete (window as any).__crep_fungal_atlas_bound } catch {}
    }
  }, [map])

  useEffect(() => {
    if (!mapReady(map)) return
    const latest = {
      ...latestRef.current,
      enabled: liveEnabledSnapshot(latestRef.current.enabled),
      zoom: map.getZoom?.() ?? latestRef.current.zoom,
    }
    // May 21 2026 (Morgan: "EcM and AM should look like the exact SPUN
    // map model — colored cell grid, not dots"). The composite raster
    // path returns transparent PNGs today (native MINDEX tile pipeline
    // not shipped), and the per-layer rasters were also blank. Replaced
    // with the cell-fill polygon path that uses the MINDEX-aggregated
    // GlobalFungi cells from /api/crep/fungal-atlas (cells already
    // carry amScore / ecmScore / richness / endemicity / fci-priority
    // and ATLAS_CELL_DEGREES geometry). Per-layer cells fetched + set
    // by the dedicated effect below; this pass just ensures the layer
    // shells exist with the right visibility for the current zoom.
    for (const heat of HEAT_LAYERS) {
      removeVectorHeatLayer(map, heat)
      removeImageHeatLayer(map, heat)
      removeHeatLayer(map, heat)
      const visible = isHeatVisible(heat.id, latest.enabled[heat.id], latest.zoom)
      ensureCellHeatLayer(map, heat, visible)
      setVisibility(map, cellFillLayerId(heat.id), visible)
      setVisibility(map, cellLineLayerId(heat.id), visible)
    }
    removeCompositeHeatLayer(map)
    moveFungalLayersToTop(map)
    setTimeout(() => moveFungalLayersToTop(map), 700)
    const showProtected = Boolean(latest.enabled.protected) && latest.zoom >= 1.2
    ensureProtectedOverlayLayers(map, showProtected)
    setVisibility(map, PROTECTED_FILL_LAYER, showProtected)
    setVisibility(map, PROTECTED_LINE_LAYER, showProtected)
    setVisibility(map, PROTECTED_LABEL_LAYER, showProtected && latest.zoom >= 5)
    const showUncertainty = Boolean(latest.enabled.uncertainty) && latest.zoom >= 1.2
    ensureUncertaintyOverlayLayers(map, showUncertainty)
    setVisibility(map, UNCERTAINTY_FILL_LAYER, showUncertainty)
    setVisibility(map, UNCERTAINTY_LINE_LAYER, showUncertainty)
    setVisibility(map, UNCERTAINTY_LABEL_LAYER, showUncertainty && latest.zoom >= 5)
    const showSamples = Boolean(latest.enabled.samples) && latest.zoom >= SAMPLE_MIN_ZOOM
    ensureSampleOverlayLayers(map, showSamples)
    setVisibility(map, SAMPLE_DOT_LAYER, showSamples)
    setVisibility(map, SAMPLE_ICON_LAYER, showSamples && latest.zoom >= SAMPLE_ICON_MIN_ZOOM)
    try {
      if (map.getLayer(SAMPLE_ICON_LAYER)) {
        map.setLayoutProperty(SAMPLE_ICON_LAYER, "text-field", ["coalesce", ["get", "glyph"], "\u{1F344}"])
      }
    } catch {}
  }, [map, enabledKey, opacity, zoom, bboxStr, viewportTick])

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
    const activeBbox = getCurrentMapBbox(map) ?? parseBboxString(bboxStr)
    if (!activeBbox) return
    const [west, south, east, north] = activeBbox
    const bboxParam = `${west.toFixed(4)},${south.toFixed(4)},${east.toFixed(4)},${north.toFixed(4)}`
    let cancelled = false
    const fetchCellsFor = async (heat: { id: HeatLayer; name: string; opacity: number; minZoom: number }) => {
      if (cancelled) return
      const enabledFlag = latest.enabled[heat.id]
      if (!enabledFlag) {
        try {
          const src = map.getSource(cellSourceId(heat.id)) as maplibregl.GeoJSONSource | undefined
          src?.setData?.({ type: "FeatureCollection", features: [] } as any)
        } catch { /* ignore */ }
        return
      }
      try {
        const q = new URLSearchParams({
          layer: heat.id,
          bbox: bboxParam,
          limit: latest.zoom < 4 ? "1500" : latest.zoom < 7 ? "2500" : latest.zoom < 10 ? "1800" : "1200",
        })
        const res = await fetch(`/api/crep/fungal-atlas?${q}`, {
          signal: AbortSignal.timeout(15_000),
          cache: "default",
        })
        if (!res.ok || cancelled) return
        const body = await res.json()
        const cells = Array.isArray(body?.cells) ? body.cells : []
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
    for (const heat of HEAT_LAYERS) void fetchCellsFor(heat)
    return () => { cancelled = true }
  }, [map, enabledKey, bboxStr, viewportTick])

  useEffect(() => {
    if (!mapReady(map)) return
    const syncSupportLayers = () => {
      if (!mapReady(map)) return
      const currentEnabled = liveEnabledSnapshot(latestRef.current.enabled)
      const currentZoom = map.getZoom?.() ?? zoom
      const showProtected = Boolean(currentEnabled.protected) && currentZoom >= 1.2
      ensureProtectedOverlayLayers(map, showProtected)
      setVisibility(map, PROTECTED_FILL_LAYER, showProtected)
      setVisibility(map, PROTECTED_LINE_LAYER, showProtected)
      setVisibility(map, PROTECTED_LABEL_LAYER, showProtected && currentZoom >= 5)
      const showUncertainty = Boolean(currentEnabled.uncertainty) && currentZoom >= 1.2
      ensureUncertaintyOverlayLayers(map, showUncertainty)
      setVisibility(map, UNCERTAINTY_FILL_LAYER, showUncertainty)
      setVisibility(map, UNCERTAINTY_LINE_LAYER, showUncertainty)
      setVisibility(map, UNCERTAINTY_LABEL_LAYER, showUncertainty && currentZoom >= 5)
      const showSamples = Boolean(currentEnabled.samples) && currentZoom >= SAMPLE_MIN_ZOOM
      ensureSampleOverlayLayers(map, showSamples)
      setVisibility(map, SAMPLE_DOT_LAYER, showSamples)
      setVisibility(map, SAMPLE_ICON_LAYER, showSamples && currentZoom >= SAMPLE_ICON_MIN_ZOOM)
      moveFungalLayersToTop(map)
    }
    syncSupportLayers()
    const timers = [250, 900, 1800].map((delay) => setTimeout(syncSupportLayers, delay))
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
          // Bigger caps at lower zoom because the viewport covers more
          // ground. Backend hardLimit ladder matches.
          limit: currentZoom < 4 ? "2500" : currentZoom < 7 ? "4000" : currentZoom < 10 ? "5000" : currentZoom < 13 ? "1500" : "800",
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
    if (sampleTimerRef.current) clearTimeout(sampleTimerRef.current)
    void poll()
    return () => {
      cancelled = true
      if (sampleTimerRef.current) clearTimeout(sampleTimerRef.current)
    }
  }, [map, enabled.samples, bboxStr, zoom, sampleGroupStr, viewportTick])

  return null
}
