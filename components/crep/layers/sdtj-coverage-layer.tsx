"use client"

/**
 * SD + TJ Coverage Layer — Apr 22, 2026
 *
 * Morgan: "massive amount of missing data from TIJUANA including infra
 * cell towers enviornmental sensors, military, police, hospitals,
 * sewage line data centers, am fm antennas same with san diego
 * missing data".
 *
 * Loads 8 category-specific GeoJSON files baked by
 * scripts/etl/crep/bake-sdtj-coverage.mjs and renders each as its own
 * toggleable MapLibre layer. Each layer has:
 *   - Its own icon (emoji symbol until SVG icons are added)
 *   - Its own color (category-matched so users can distinguish at a glance)
 *   - Click handler that opens the generic InfraAsset panel via
 *     window.__crep_selectAsset
 *
 * Pattern mirrors MojavePreserveLayer and TijuanaEstuaryLayer so the
 * layer panel treats it consistently.
 */

import { useEffect } from "react"
import type { Map as MapLibreMap } from "maplibre-gl"
import {
  DATA_CENTER_MIN_ZOOM,
  TELECOM_CITY_MIN_ZOOM,
  TELECOM_DETAIL_MIN_ZOOM,
} from "@/lib/crep/lod-policy"

type Enabled = {
  sdtjHospitals?: boolean
  sdtjPolice?: boolean
  sdtjSewage?: boolean
  sdtjCellTowers?: boolean
  sdtjAmFmAntennas?: boolean
  sdtjMilitary?: boolean
  sdtjDataCenters?: boolean
  sdtjCivicFacilities?: boolean
}

interface CategoryDef {
  id: keyof Enabled
  layerId: string
  sourceId: string
  file: string
  label: string
  /** Color used for the circle fill + polygon outline. */
  color: string
  /** emoji surface marker used until we bake sprite icons. */
  glyph: string
  /** true if the layer renders Polygon features (sewage, military). */
  polygon?: boolean
  /** Open InfraAsset panel on click via __crep_selectAsset. */
  selectType: string
}

const CATEGORIES: CategoryDef[] = [
  { id: "sdtjHospitals",    layerId: "crep-sdtj-hospitals",     sourceId: "crep-sdtj-hospitals-src",     file: "/data/crep/sdtj-hospitals.geojson",        label: "Hospital",          color: "#f43f5e", glyph: "🏥", selectType: "hospital" },
  { id: "sdtjPolice",       layerId: "crep-sdtj-police",        sourceId: "crep-sdtj-police-src",        file: "/data/crep/sdtj-police.geojson",           label: "Police / Fire / Border", color: "#3b82f6", glyph: "🚔", selectType: "police" },
  { id: "sdtjSewage",       layerId: "crep-sdtj-sewage",        sourceId: "crep-sdtj-sewage-src",        file: "/data/crep/sdtj-sewage.geojson",           label: "Sewage works",      color: "#a16207", glyph: "🟫", polygon: true, selectType: "sewage_works" },
  { id: "sdtjCellTowers",   layerId: "crep-sdtj-cell-towers",   sourceId: "crep-sdtj-cell-towers-src",   file: "/data/crep/sdtj-cell-towers.geojson",      label: "Cell tower (SD/TJ)", color: "#ec4899", glyph: "📶", selectType: "cell_tower" },
  { id: "sdtjAmFmAntennas", layerId: "crep-sdtj-am-fm",         sourceId: "crep-sdtj-am-fm-src",         file: "/data/crep/sdtj-am-fm-antennas.geojson",   label: "AM/FM antenna",     color: "#a855f7", glyph: "📡", selectType: "broadcast_antenna" },
  { id: "sdtjMilitary",     layerId: "crep-sdtj-military",      sourceId: "crep-sdtj-military-src",      file: "/data/crep/sdtj-military.geojson",         label: "Military (OSM)",    color: "#10b981", glyph: "🛡️", polygon: true, selectType: "military_installation" },
  { id: "sdtjDataCenters",  layerId: "crep-sdtj-data-centers",  sourceId: "crep-sdtj-data-centers-src",  file: "/data/crep/sdtj-data-centers.geojson",     label: "Data center (SD/TJ)", color: "#06b6d4", glyph: "🖥️", selectType: "data_center" },
  { id: "sdtjCivicFacilities", layerId: "crep-sdtj-civic", sourceId: "crep-sdtj-civic-src", file: "/data/crep/sdtj-civic.geojson", label: "Civic facility", color: "#14b8a6", glyph: "C", selectType: "civic" },
]

const SDTJ_ICON_IMAGES = {
  hospital: "crep-icon-hospital",
  fire_station: "crep-icon-fire-station",
  police: "crep-icon-police",
  library: "crep-icon-library",
  civic: "crep-icon-civic",
  border_crossing: "crep-icon-civic",
  cell_tower: "crep-icon-cell-tower",
  broadcast_antenna: "crep-icon-broadcast-antenna",
  military_installation: "crep-icon-military",
  data_center: "crep-icon-data-center",
  sewage_works: "crep-icon-sewage",
} as const

export interface SdtjCoverageLayerProps {
  map: MapLibreMap | React.RefObject<MapLibreMap | null> | null
  enabled: Enabled
}

function resolveMap(map: SdtjCoverageLayerProps["map"]): MapLibreMap | null {
  if (!map) return null
  if (typeof (map as MapLibreMap).getZoom === "function") return map as MapLibreMap
  return (map as React.RefObject<MapLibreMap | null>).current ?? null
}

function safeTags(value: unknown): Record<string, unknown> {
  if (!value) return {}
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {}
    } catch {
      return {}
    }
  }
  return typeof value === "object" ? value as Record<string, unknown> : {}
}

function propertyText(properties: Record<string, unknown>): string {
  return [
    properties.name,
    properties.category,
    properties.facility_type,
    properties.amenity,
    properties.operator,
    properties.tags,
  ].map((value) => typeof value === "string" ? value : JSON.stringify(value ?? "")).join(" ").toLowerCase()
}

function resolvePointGlyph(cat: CategoryDef, properties: Record<string, unknown>): string {
  if (cat.id !== "sdtjPolice" && cat.id !== "sdtjCivicFacilities") return cat.glyph
  const text = propertyText({ ...properties, ...safeTags(properties.tags) })
  if (/\bfire\b|bomberos|fire_station/.test(text)) return "🚒"
  if (/\bborder\b|cbp|customs|port of entry|immigration|checkpoint/.test(text)) return "🛂"
  if (/\blibrary\b|biblioteca/.test(text)) return "📚"
  if (/\bhospital\b|clinic|medical/.test(text)) return "🏥"
  if (/\bpolice\b|sheriff|station|patrol/.test(text)) return "🚔"
  if (/\bcity hall\b|townhall|courthouse|government|municipal|civic/.test(text)) return "🏛️"
  return cat.glyph
}

function resolveSelectType(cat: CategoryDef, properties: Record<string, unknown>): string {
  if (cat.id !== "sdtjPolice" && cat.id !== "sdtjCivicFacilities") return cat.selectType
  const text = propertyText({ ...properties, ...safeTags(properties.tags) })
  if (/\bfire\b|bomberos|fire_station/.test(text)) return "fire_station"
  if (/\bborder\b|cbp|customs|port of entry|immigration|checkpoint/.test(text)) return "border_crossing"
  if (/\blibrary\b|biblioteca/.test(text)) return "library"
  if (/\bhospital\b|clinic|medical/.test(text)) return "hospital"
  if (/\bpolice\b|sheriff|station|patrol/.test(text)) return "police"
  return cat.selectType
}

function sdtjIconImage(selectType: string): string {
  return (SDTJ_ICON_IMAGES as Record<string, string>)[selectType] || SDTJ_ICON_IMAGES.civic
}

function drawSdtjIcon(kind: "hospital" | "fire_station" | "police" | "library" | "civic" | "cell_tower" | "broadcast_antenna" | "military" | "data_center" | "sewage"): ImageData | null {
  if (typeof document === "undefined") return null
  const canvas = document.createElement("canvas")
  canvas.width = 48
  canvas.height = 48
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  ctx.clearRect(0, 0, 48, 48)
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.strokeStyle = "#ffffff"
  ctx.fillStyle = "#ffffff"
  ctx.lineWidth = 5
  if (kind === "hospital") {
    ctx.fillRect(20, 9, 8, 30)
    ctx.fillRect(9, 20, 30, 8)
  } else if (kind === "fire_station") {
    ctx.beginPath()
    ctx.moveTo(24, 6)
    ctx.bezierCurveTo(34, 15, 38, 25, 31, 38)
    ctx.bezierCurveTo(24, 44, 13, 39, 13, 29)
    ctx.bezierCurveTo(13, 21, 21, 17, 20, 9)
    ctx.bezierCurveTo(23, 12, 25, 16, 24, 22)
    ctx.bezierCurveTo(29, 17, 29, 11, 24, 6)
    ctx.closePath()
    ctx.fill()
  } else if (kind === "police") {
    ctx.beginPath()
    ctx.moveTo(24, 6)
    ctx.lineTo(38, 13)
    ctx.lineTo(35, 31)
    ctx.lineTo(24, 42)
    ctx.lineTo(13, 31)
    ctx.lineTo(10, 13)
    ctx.closePath()
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(24, 23, 4, 0, Math.PI * 2)
    ctx.fill()
  } else if (kind === "library") {
    ctx.strokeRect(10, 13, 12, 25)
    ctx.strokeRect(26, 13, 12, 25)
    ctx.beginPath()
    ctx.moveTo(24, 13)
    ctx.lineTo(24, 38)
    ctx.stroke()
  } else if (kind === "cell_tower") {
    ctx.beginPath()
    ctx.moveTo(24, 40)
    ctx.lineTo(24, 13)
    ctx.moveTo(14, 40)
    ctx.lineTo(24, 13)
    ctx.lineTo(34, 40)
    ctx.moveTo(18, 27)
    ctx.lineTo(30, 27)
    ctx.moveTo(16, 34)
    ctx.lineTo(32, 34)
    ctx.stroke()
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(24, 15, 8, -0.9, 0.9)
    ctx.stroke()
  } else if (kind === "broadcast_antenna") {
    ctx.beginPath()
    ctx.moveTo(24, 39)
    ctx.lineTo(24, 14)
    ctx.moveTo(14, 39)
    ctx.lineTo(24, 14)
    ctx.lineTo(34, 39)
    ctx.stroke()
    ctx.lineWidth = 3
    for (const r of [7, 13]) {
      ctx.beginPath()
      ctx.arc(24, 14, r, -0.85, 0.85)
      ctx.stroke()
    }
  } else if (kind === "military") {
    ctx.beginPath()
    ctx.moveTo(24, 6)
    ctx.lineTo(39, 13)
    ctx.lineTo(36, 31)
    ctx.lineTo(24, 42)
    ctx.lineTo(12, 31)
    ctx.lineTo(9, 13)
    ctx.closePath()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(17, 26)
    ctx.lineTo(31, 26)
    ctx.moveTo(24, 17)
    ctx.lineTo(24, 35)
    ctx.stroke()
  } else if (kind === "data_center") {
    ctx.strokeRect(11, 10, 26, 28)
    ctx.beginPath()
    ctx.moveTo(16, 18)
    ctx.lineTo(32, 18)
    ctx.moveTo(16, 26)
    ctx.lineTo(32, 26)
    ctx.moveTo(16, 34)
    ctx.lineTo(32, 34)
    ctx.stroke()
    ctx.fillRect(33, 17, 3, 3)
    ctx.fillRect(33, 25, 3, 3)
    ctx.fillRect(33, 33, 3, 3)
  } else if (kind === "sewage") {
    ctx.beginPath()
    ctx.arc(24, 24, 15, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(14, 24)
    ctx.bezierCurveTo(19, 18, 29, 30, 34, 24)
    ctx.moveTo(14, 31)
    ctx.bezierCurveTo(19, 25, 29, 37, 34, 31)
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.moveTo(8, 17)
    ctx.lineTo(24, 8)
    ctx.lineTo(40, 17)
    ctx.closePath()
    ctx.fill()
    for (const x of [13, 21, 29, 37]) ctx.fillRect(x - 2, 19, 4, 16)
    ctx.fillRect(8, 37, 32, 4)
  }
  return ctx.getImageData(0, 0, 48, 48)
}

function ensureSdtjIconImages(map: MapLibreMap) {
  const draw = {
    "crep-icon-hospital": () => drawSdtjIcon("hospital"),
    "crep-icon-fire-station": () => drawSdtjIcon("fire_station"),
    "crep-icon-police": () => drawSdtjIcon("police"),
    "crep-icon-library": () => drawSdtjIcon("library"),
    "crep-icon-civic": () => drawSdtjIcon("civic"),
    "crep-icon-cell-tower": () => drawSdtjIcon("cell_tower"),
    "crep-icon-broadcast-antenna": () => drawSdtjIcon("broadcast_antenna"),
    "crep-icon-military": () => drawSdtjIcon("military"),
    "crep-icon-data-center": () => drawSdtjIcon("data_center"),
    "crep-icon-sewage": () => drawSdtjIcon("sewage"),
  }
  for (const [id, make] of Object.entries(draw)) {
    try {
      if ((map as any).hasImage?.(id)) continue
      const image = make()
      if (image) map.addImage(id, image, { pixelRatio: 2 } as any)
    } catch {
      /* image can already exist after hot reload */
    }
  }
}

function enrichCoverageGeoJson(gj: any, cat: CategoryDef) {
  return {
    ...gj,
    features: (Array.isArray(gj?.features) ? gj.features : []).map((feature: any) => {
      const properties = feature?.properties && typeof feature.properties === "object" ? feature.properties : {}
      const selectType = properties.select_type || resolveSelectType(cat, properties)
      return {
        ...feature,
        properties: {
          ...properties,
          glyph: properties.glyph || resolvePointGlyph(cat, properties),
          icon_image: properties.icon_image || sdtjIconImage(String(selectType)),
          select_type: selectType,
          category_label: properties.category_label || cat.label,
        },
      }
    }),
  }
}

export function SdtjCoverageLayer({ map, enabled }: SdtjCoverageLayerProps) {
  useEffect(() => {
    const m = resolveMap(map)
    if (!m) return

    let cancelled = false
    const loaded: Set<string> = new Set()

    const safeAddSource = (id: string, data: any) => {
      try { if (!m.getSource(id)) m.addSource(id, { type: "geojson", data }) } catch { /* HMR */ }
    }
    const safeAddLayer = (spec: any) => {
      try { if (!m.getLayer(spec.id)) m.addLayer(spec) } catch { /* HMR */ }
    }

    const openClickPanel = (cat: CategoryDef, e: any) => {
      const f = e.features?.[0]
      if (!f) return
      const hook = (window as any).__crep_selectAsset
      if (typeof hook !== "function") return
      const [lng, lat] = f.geometry?.type === "Point"
        ? (f.geometry.coordinates as [number, number])
        : [e.lngLat?.lng, e.lngLat?.lat]
      const selectType = String(f.properties?.select_type || cat.selectType)
      hook({
        type: selectType,
        id: f.properties?.id,
        name: f.properties?.name || `${cat.label}`,
        lat, lng,
        properties: {
          category: f.properties?.category_label || cat.label,
          operator: f.properties?.operator,
          agency: f.properties?.agency,
          address: f.properties?.address,
          phone: f.properties?.phone,
          website: f.properties?.website,
          facility_type: f.properties?.facility_type,
          ref: f.properties?.ref,
          source: f.properties?.source || "OSM (community-mapped)",
          ...safeTags(f.properties?.tags),
        },
      })
    }

    const minZoomForCategory = (cat: CategoryDef): number => {
      if (cat.id === "sdtjDataCenters") return DATA_CENTER_MIN_ZOOM
      if (cat.id === "sdtjCellTowers" || cat.id === "sdtjAmFmAntennas") return TELECOM_CITY_MIN_ZOOM
      if (cat.id === "sdtjCivicFacilities") return 9
      return TELECOM_DETAIL_MIN_ZOOM
    }

    const ensureLoaded = async (cat: CategoryDef) => {
      if (loaded.has(cat.layerId)) return
      try {
        const res = await fetch(cat.file, { cache: "default" })
        if (!res.ok) {
          console.log(`[CREP/SDTJ] ${cat.file} missing — skip ${cat.id}`)
          return
        }
        const gj = enrichCoverageGeoJson(await res.json(), cat)
        if (cancelled) return
        safeAddSource(cat.sourceId, gj)
        ensureSdtjIconImages(m)
        const categoryMinZoom = minZoomForCategory(cat)
        const pointCircleOpacity = cat.id === "sdtjMilitary" ? 0.18 : 0.28
        if (cat.polygon) {
          // Polygon fill + outline
          safeAddLayer({
            id: cat.layerId + "-fill",
            type: "fill",
            source: cat.sourceId,
            filter: ["==", ["geometry-type"], "Polygon"],
            paint: {
              "fill-color": cat.color,
              "fill-opacity": 0.18,
            },
            minzoom: categoryMinZoom,
          })
          safeAddLayer({
            id: cat.layerId + "-outline",
            type: "line",
            source: cat.sourceId,
            filter: ["==", ["geometry-type"], "Polygon"],
            paint: {
              "line-color": cat.color,
              "line-width": 1.5,
              "line-opacity": 0.8,
              "line-dasharray": [3, 1.5],
            },
            minzoom: categoryMinZoom,
          })
          // Also a centroid circle for clickability when polygon is tiny
          safeAddLayer({
            id: cat.layerId,
            type: "circle",
            source: cat.sourceId,
            filter: ["==", ["geometry-type"], "Point"],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 2.5, 10, 3.5, 14, 4.5],
              "circle-color": cat.color,
              "circle-opacity": pointCircleOpacity,
              "circle-stroke-color": "#000",
              "circle-stroke-width": 0.6,
            },
            minzoom: categoryMinZoom,
          })
        } else {
          safeAddLayer({
            id: cat.layerId,
            type: "circle",
            source: cat.sourceId,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 2.5, 10, 3.5, 14, 4.5],
              "circle-color": cat.color,
              "circle-opacity": pointCircleOpacity,
              "circle-stroke-color": "#000",
              "circle-stroke-width": 0.6,
            },
            minzoom: categoryMinZoom,
          })
        }
        safeAddLayer({
          id: cat.layerId + "-icon",
          type: "symbol",
          source: cat.sourceId,
          filter: ["==", ["geometry-type"], "Point"],
          layout: {
            "icon-image": ["coalesce", ["get", "icon_image"], SDTJ_ICON_IMAGES.civic],
            "icon-size": ["interpolate", ["linear"], ["zoom"], 7, 0.44, 10, 0.56, 14, 0.76],
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "text-optional": true,
            "visibility": "visible",
          },
          minzoom: categoryMinZoom,
        })

        const boundKey = `__sdtjCoverageBound_${cat.layerId}`
        if (!(m as any)[boundKey]) {
          ;(m as any)[boundKey] = true
          m.on("click", cat.layerId, (e: any) => openClickPanel(cat, e))
          m.on("click", cat.layerId + "-icon", (e: any) => openClickPanel(cat, e))
          if (cat.polygon) m.on("click", cat.layerId + "-fill", (e: any) => openClickPanel(cat, e))
          m.on("mouseenter", cat.layerId, () => { m.getCanvas().style.cursor = "pointer" })
          m.on("mouseenter", cat.layerId + "-icon", () => { m.getCanvas().style.cursor = "pointer" })
          m.on("mouseleave", cat.layerId, () => { m.getCanvas().style.cursor = "" })
          m.on("mouseleave", cat.layerId + "-icon", () => { m.getCanvas().style.cursor = "" })
        }
        loaded.add(cat.layerId)
        console.log(`[CREP/SDTJ] ${cat.id}: ${gj.features?.length ?? 0} loaded`)
      } catch (err: any) {
        console.warn(`[CREP/SDTJ] ${cat.id} load failed:`, err?.message)
      }
    }

    const applyVisibility = (cat: CategoryDef, on: boolean) => {
      const vis = on ? "visible" : "none"
      for (const suffix of ["", "-fill", "-outline", "-icon"]) {
        try {
          if (m.getLayer(cat.layerId + suffix)) m.setLayoutProperty(cat.layerId + suffix, "visibility", vis)
        } catch { /* layer not yet present */ }
      }
    }

    for (const cat of CATEGORIES) {
      const on = !!(enabled as any)[cat.id]
      if (on) {
        ensureLoaded(cat).then(() => applyVisibility(cat, true))
      } else {
        applyVisibility(cat, false)
      }
    }

    return () => {
      cancelled = true
    }
  }, [map, enabled.sdtjHospitals, enabled.sdtjPolice, enabled.sdtjSewage, enabled.sdtjCellTowers, enabled.sdtjAmFmAntennas, enabled.sdtjMilitary, enabled.sdtjDataCenters, enabled.sdtjCivicFacilities])

  return null
}

export default SdtjCoverageLayer
