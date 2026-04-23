"use client"

/**
 * SD + TJ Coverage Layer — Apr 22, 2026
 *
 * Morgan: "massive amount of missing data from TIJUANA including infra
 * cell towers enviornmental sensors, military, police, hospitals,
 * sewage line data centers, am fm antennas same with san diego
 * missing data".
 *
 * Loads 7 category-specific GeoJSON files baked by
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

type Enabled = {
  sdtjHospitals?: boolean
  sdtjPolice?: boolean
  sdtjSewage?: boolean
  sdtjCellTowers?: boolean
  sdtjAmFmAntennas?: boolean
  sdtjMilitary?: boolean
  sdtjDataCenters?: boolean
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
]

export interface SdtjCoverageLayerProps {
  map: React.RefObject<MapLibreMap | null>
  enabled: Enabled
}

export function SdtjCoverageLayer({ map, enabled }: SdtjCoverageLayerProps) {
  useEffect(() => {
    const m = map?.current
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
      hook({
        type: cat.selectType,
        id: f.properties?.id,
        name: f.properties?.name || `${cat.label}`,
        lat, lng,
        properties: {
          category: cat.label,
          operator: f.properties?.operator,
          ref: f.properties?.ref,
          source: "OSM (community-mapped)",
          ...(typeof f.properties?.tags === "string" ? JSON.parse(f.properties.tags) : f.properties?.tags || {}),
        },
      })
    }

    const ensureLoaded = async (cat: CategoryDef) => {
      if (loaded.has(cat.layerId)) return
      try {
        const res = await fetch(cat.file, { cache: "default" })
        if (!res.ok) {
          console.log(`[CREP/SDTJ] ${cat.file} missing — skip ${cat.id}`)
          return
        }
        const gj = await res.json()
        if (cancelled) return
        safeAddSource(cat.sourceId, gj)
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
            minzoom: 6,
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
            minzoom: 6,
          })
          // Also a centroid circle for clickability when polygon is tiny
          safeAddLayer({
            id: cat.layerId,
            type: "circle",
            source: cat.sourceId,
            filter: ["==", ["geometry-type"], "Point"],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 3, 10, 5, 14, 7],
              "circle-color": cat.color,
              "circle-opacity": 0.85,
              "circle-stroke-color": "#000",
              "circle-stroke-width": 0.6,
            },
            minzoom: 6,
          })
        } else {
          safeAddLayer({
            id: cat.layerId,
            type: "circle",
            source: cat.sourceId,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 3, 10, 5.5, 14, 8],
              "circle-color": cat.color,
              "circle-opacity": 0.85,
              "circle-stroke-color": "#000",
              "circle-stroke-width": 0.6,
            },
            minzoom: 6,
          })
        }

        // Click handler
        m.on("click", cat.layerId, (e: any) => openClickPanel(cat, e))
        if (cat.polygon) m.on("click", cat.layerId + "-fill", (e: any) => openClickPanel(cat, e))
        m.on("mouseenter", cat.layerId, () => { m.getCanvas().style.cursor = "pointer" })
        m.on("mouseleave", cat.layerId, () => { m.getCanvas().style.cursor = "" })
        loaded.add(cat.layerId)
        console.log(`[CREP/SDTJ] ${cat.id}: ${gj.features?.length ?? 0} loaded`)
      } catch (err: any) {
        console.warn(`[CREP/SDTJ] ${cat.id} load failed:`, err?.message)
      }
    }

    const applyVisibility = (cat: CategoryDef, on: boolean) => {
      const vis = on ? "visible" : "none"
      for (const suffix of ["", "-fill", "-outline"]) {
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
  }, [map, enabled.sdtjHospitals, enabled.sdtjPolice, enabled.sdtjSewage, enabled.sdtjCellTowers, enabled.sdtjAmFmAntennas, enabled.sdtjMilitary, enabled.sdtjDataCenters])

  return null
}

export default SdtjCoverageLayer
