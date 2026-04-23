"use client"

/**
 * Project NYC + Project DC layer — Apr 23, 2026
 *
 * Morgan: "i also want just like goffs and osyer a fly to and layers od
 * detaisl perimeters and special icon locations for dc and new york".
 *
 * Parallel to TijuanaEstuaryLayer / MojavePreserveLayer:
 *   - Anchor icon at the project centroid
 *   - Perimeter polygon (dashed)
 *   - POI pins (landmarks + transit + aviation + gov + nature + military)
 *   - Fly-to buttons exposed via window.__crep_flyTo("project-nyc"|"project-dc")
 *
 * Plus the 11 OSM-baked regional layers per region (hospitals, police,
 * sewage, cell towers, AM/FM, military, data centers, transit subway,
 * transit rail, airports, government/embassy). Each layer has its own
 * toggle in the CREP panel and its own click-to-InfraAsset handler.
 */

import { useEffect } from "react"
import type { Map as MapLibreMap } from "maplibre-gl"

type Enabled = {
  // Project anchor + perimeter + POIs (one toggle per project)
  projectNyc?: boolean
  projectDc?: boolean
  // OSM-baked layers (shared toggle structure; NYC copies)
  nycHospitals?: boolean
  nycPolice?: boolean
  nycSewage?: boolean
  nycCellTowers?: boolean
  nycAmFmAntennas?: boolean
  nycMilitary?: boolean
  nycDataCenters?: boolean
  nycTransitSubway?: boolean
  nycTransitRail?: boolean
  nycAirports?: boolean
  nycGovtEmbassy?: boolean
  nycInat?: boolean
  // DC copies
  dcHospitals?: boolean
  dcPolice?: boolean
  dcSewage?: boolean
  dcCellTowers?: boolean
  dcAmFmAntennas?: boolean
  dcMilitary?: boolean
  dcDataCenters?: boolean
  dcTransitSubway?: boolean
  dcTransitRail?: boolean
  dcAirports?: boolean
  dcGovtEmbassy?: boolean
  dcInat?: boolean
}

interface RegionCategory {
  id: keyof Enabled
  file: string
  layerId: string
  sourceId: string
  label: string
  color: string
  selectType: string
  polygon?: boolean
  /** 50%-smaller dots (cell towers — Morgan Apr 23, 2026). */
  cellSmall?: boolean
  minzoom?: number
}

const makeCategories = (region: "nyc" | "dc"): RegionCategory[] => [
  { id: `${region}Hospitals` as keyof Enabled,     file: `/data/crep/${region}-hospitals.geojson`,       layerId: `crep-${region}-hospitals`,     sourceId: `crep-${region}-hospitals-src`,     label: "Hospital", color: "#f43f5e", selectType: "hospital", minzoom: 7 },
  { id: `${region}Police` as keyof Enabled,        file: `/data/crep/${region}-police.geojson`,          layerId: `crep-${region}-police`,        sourceId: `crep-${region}-police-src`,        label: "Police / Fire", color: "#3b82f6", selectType: "police", minzoom: 8 },
  { id: `${region}Sewage` as keyof Enabled,        file: `/data/crep/${region}-sewage.geojson`,          layerId: `crep-${region}-sewage`,        sourceId: `crep-${region}-sewage-src`,        label: "Sewage works", color: "#a16207", selectType: "sewage_works", polygon: true, minzoom: 7 },
  // Apr 23, 2026 — cell-tower dots at 50% of default per Morgan. See
  // `cellSmall` override in the layer paint below.
  { id: `${region}CellTowers` as keyof Enabled,    file: `/data/crep/${region}-cell-towers.geojson`,     layerId: `crep-${region}-cell`,          sourceId: `crep-${region}-cell-src`,          label: "Cell tower", color: "#ec4899", selectType: "cell_tower", minzoom: 9, cellSmall: true as any },
  { id: `${region}AmFmAntennas` as keyof Enabled,  file: `/data/crep/${region}-am-fm-antennas.geojson`,  layerId: `crep-${region}-amfm`,          sourceId: `crep-${region}-amfm-src`,          label: "AM/FM antenna", color: "#a855f7", selectType: "broadcast_antenna", minzoom: 7 },
  { id: `${region}Military` as keyof Enabled,      file: `/data/crep/${region}-military.geojson`,        layerId: `crep-${region}-mil`,           sourceId: `crep-${region}-mil-src`,           label: "Military installation", color: "#10b981", selectType: "military_installation", polygon: true, minzoom: 6 },
  { id: `${region}DataCenters` as keyof Enabled,   file: `/data/crep/${region}-data-centers.geojson`,    layerId: `crep-${region}-dc`,            sourceId: `crep-${region}-dc-src`,            label: "Data center", color: "#06b6d4", selectType: "data_center", minzoom: 7 },
  { id: `${region}TransitSubway` as keyof Enabled, file: `/data/crep/${region}-transit-subway.geojson`,  layerId: `crep-${region}-subway`,        sourceId: `crep-${region}-subway-src`,        label: "Subway station", color: "#f59e0b", selectType: "subway_station", minzoom: 10 },
  { id: `${region}TransitRail` as keyof Enabled,   file: `/data/crep/${region}-transit-rail.geojson`,    layerId: `crep-${region}-rail`,          sourceId: `crep-${region}-rail-src`,          label: "Rail station", color: "#eab308", selectType: "rail_station", minzoom: 8 },
  { id: `${region}Airports` as keyof Enabled,      file: `/data/crep/${region}-airports.geojson`,        layerId: `crep-${region}-air`,           sourceId: `crep-${region}-air-src`,           label: "Airport", color: "#8b5cf6", selectType: "airport", minzoom: 5 },
  { id: `${region}GovtEmbassy` as keyof Enabled,   file: `/data/crep/${region}-govt-embassy.geojson`,    layerId: `crep-${region}-gov`,           sourceId: `crep-${region}-gov-src`,           label: "Government / Embassy", color: "#14b8a6", selectType: "government", minzoom: 9 },
  // Apr 23, 2026 — iNat nature observations (Morgan: "i see not one
  // nature data icon in nyc or washington dc that is a huge violation
  // of our product fix that now"). 10k research-grade observations
  // per region; kingdom-colored dots, minzoom 10 to keep it legible.
  // Apr 23, 2026 — minzoom lowered 10 → 7 so iNat density reads as a
  // metro-scale overlay, not just neighbourhood-scale. 10k points per
  // region × 2 regions = 20k; MapLibre's internal tile bin handles it
  // fine at z≥7 viewport cull.
  // Apr 23, 2026 — Morgan: "that data should not be icon different then all
  // the other nature data and using the same widgets its not different source
  // or time is irrelivant as long as its relevant! naturedata from inat goes
  // into mindex we just need more historical data in those cities for obvious
  // reasons you did that wrong". iNat category REMOVED from this layer. The
  // baked historical per-city geojsons now load straight into the shared
  // fungalObservations React state in CREPDashboardClient (see the
  // "BAKED HISTORICAL iNAT" effect) and render through the same FungalMarker
  // + species popup as the live SSE stream. One icon, one widget, one truth.
]

// Apr 23, 2026 — Morgan: "massivly missing nature data in nyc also".
// Root cause found in browser audit: CREPDashboardClient passes the
// MapLibre instance DIRECTLY (stored in state, not a ref) to this
// component, but the component did `map?.current` which returns
// `undefined` for a Map instance — so every useEffect bailed before
// adding sources. The regression silently dropped all 12 baked NYC/DC
// layers (hospitals, police, sewage, cells, AM/FM, military, DCs,
// transit subway/rail, airports, gov/embassy, iNat) for NYC AND DC.
// We now accept EITHER a Map instance OR a RefObject<Map>.
type MapOrRef = MapLibreMap | React.RefObject<MapLibreMap | null> | null
function resolveMap(m: MapOrRef): MapLibreMap | null {
  if (!m) return null
  if (typeof (m as any).getZoom === "function") return m as MapLibreMap
  const current = (m as React.RefObject<MapLibreMap | null>).current
  return current ?? null
}

export interface ProjectNycDcLayerProps {
  map: MapOrRef
  enabled: Enabled
}

export default function ProjectNycDcLayer({ map, enabled }: ProjectNycDcLayerProps) {
  // Anchor + perimeter + POIs for BOTH projects
  useEffect(() => {
    const m = resolveMap(map)
    if (!m) return
    let cancelled = false
    const projects = [
      { id: "nyc" as const, file: "/data/crep/project-nyc.geojson", anchorColor: "#06b6d4", perimeterColor: "#22d3ee", enabled: enabled.projectNyc },
      { id: "dc" as const, file: "/data/crep/project-dc.geojson", anchorColor: "#facc15", perimeterColor: "#fbbf24", enabled: enabled.projectDc },
    ]

    const run = async () => {
      for (const proj of projects) {
        if (cancelled) return
        try {
          const res = await fetch(proj.file, { cache: "default" })
          if (!res.ok) { console.log(`[CREP/Project] ${proj.file} missing`); continue }
          const gj = await res.json()
          const srcId = `crep-project-${proj.id}-src`
          const anchorLayer = `crep-project-${proj.id}-anchor`
          const perimeterFillLayer = `crep-project-${proj.id}-perim-fill`
          const perimeterOutlineLayer = `crep-project-${proj.id}-perim-outline`
          const poiLayer = `crep-project-${proj.id}-poi`
          const anchorLabelLayer = `crep-project-${proj.id}-anchor-label`

          try {
            const existing = m.getSource(srcId)
            if (existing) (existing as any).setData(gj)
            else m.addSource(srcId, { type: "geojson", data: gj })
          } catch { /* hmr */ }
          try { if (!m.getLayer(perimeterFillLayer)) m.addLayer({ id: perimeterFillLayer, type: "fill", source: srcId, filter: ["==", ["get", "kind"], "project-perimeter"], paint: { "fill-color": proj.perimeterColor, "fill-opacity": 0.08 } }) } catch {}
          try { if (!m.getLayer(perimeterOutlineLayer)) m.addLayer({ id: perimeterOutlineLayer, type: "line", source: srcId, filter: ["==", ["get", "kind"], "project-perimeter"], paint: { "line-color": proj.perimeterColor, "line-width": 2, "line-opacity": 0.9, "line-dasharray": [4, 2] } }) } catch {}
          try { if (!m.getLayer(poiLayer)) m.addLayer({ id: poiLayer, type: "circle", source: srcId, filter: ["==", ["get", "kind"], "project-poi"], paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 2, 9, 4, 14, 7], "circle-color": proj.perimeterColor, "circle-opacity": 0.85, "circle-stroke-color": "#000", "circle-stroke-width": 0.8 }, minzoom: 6 }) } catch {}
          try {
            if (!m.getLayer(anchorLayer)) m.addLayer({
              id: anchorLayer, type: "circle", source: srcId,
              filter: ["==", ["get", "kind"], "project-anchor"],
              paint: {
                "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 6, 5, 10, 10, 16],
                "circle-color": proj.anchorColor,
                "circle-opacity": 0.9,
                "circle-stroke-width": 2.5,
                "circle-stroke-color": "#0b1220",
              },
            })
          } catch {}
          try {
            if (!m.getLayer(anchorLabelLayer)) m.addLayer({
              id: anchorLabelLayer, type: "symbol", source: srcId,
              filter: ["==", ["get", "kind"], "project-anchor"],
              layout: {
                "text-field": ["get", "name"],
                "text-size": ["interpolate", ["linear"], ["zoom"], 3, 10, 8, 16, 12, 20],
                "text-anchor": "top",
                "text-offset": [0, 1.1],
                "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
              },
              paint: {
                "text-color": proj.anchorColor,
                "text-halo-color": "#000",
                "text-halo-width": 2,
              },
            })
          } catch {}

          // Visibility
          const vis = proj.enabled ? "visible" : "none"
          for (const lid of [perimeterFillLayer, perimeterOutlineLayer, poiLayer, anchorLayer, anchorLabelLayer]) {
            try { if (m.getLayer(lid)) m.setLayoutProperty(lid, "visibility", vis) } catch {}
          }

          // Click handler for POIs → InfraAsset panel
          m.on("click", poiLayer, (e: any) => {
            const f = e.features?.[0]; if (!f) return
            const hook = (window as any).__crep_selectAsset
            if (typeof hook !== "function") return
            const p = f.properties || {}
            hook({
              type: p.category || "project_poi",
              id: p.id,
              name: p.name,
              lat: e.lngLat?.lat,
              lng: e.lngLat?.lng,
              properties: { project: p.project, category: p.category, source: "Project " + proj.id.toUpperCase() },
            })
          })
          m.on("click", anchorLayer, (e: any) => {
            const f = e.features?.[0]; if (!f) return
            const hook = (window as any).__crep_selectAsset
            if (typeof hook !== "function") return
            const p = f.properties || {}
            hook({
              type: "mycosoft-project",
              id: p.id,
              name: p.name,
              lat: e.lngLat?.lat,
              lng: e.lngLat?.lng,
              properties: {
                project: p.project,
                owner: p.owner,
                thesis: p.thesis,
                partners: Array.isArray(p.partners) ? p.partners : (typeof p.partners === "string" ? JSON.parse(p.partners) : []),
                status: p.status,
              },
            })
          })
          m.on("mouseenter", poiLayer, () => { m.getCanvas().style.cursor = "pointer" })
          m.on("mouseleave", poiLayer, () => { m.getCanvas().style.cursor = "" })
          m.on("mouseenter", anchorLayer, () => { m.getCanvas().style.cursor = "pointer" })
          m.on("mouseleave", anchorLayer, () => { m.getCanvas().style.cursor = "" })
          console.log(`[CREP/Project] ${proj.id.toUpperCase()} loaded (${(gj.features || []).length} features)`)
        } catch (err: any) {
          console.warn(`[CREP/Project] ${proj.id} failed:`, err?.message)
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [map, enabled.projectNyc, enabled.projectDc])

  // Regional OSM layers (NYC + DC)
  useEffect(() => {
    const m = resolveMap(map)
    if (!m) return
    let cancelled = false
    const all = [...makeCategories("nyc"), ...makeCategories("dc")]
    const loaded = new Set<string>()

    const ensureCategory = async (cat: RegionCategory) => {
      if (loaded.has(cat.layerId)) return
      try {
        const res = await fetch(cat.file, { cache: "default" })
        if (!res.ok) { console.log(`[CREP/NYC-DC] ${cat.file} missing`); return }
        const gj = await res.json()
        if (cancelled) return
        try { if (!m.getSource(cat.sourceId)) m.addSource(cat.sourceId, { type: "geojson", data: gj }) } catch {}
        if (cat.polygon) {
          try { if (!m.getLayer(cat.layerId + "-fill")) m.addLayer({ id: cat.layerId + "-fill", type: "fill", source: cat.sourceId, filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": cat.color, "fill-opacity": 0.18 }, minzoom: cat.minzoom ?? 6 }) } catch {}
          try { if (!m.getLayer(cat.layerId + "-outline")) m.addLayer({ id: cat.layerId + "-outline", type: "line", source: cat.sourceId, filter: ["==", ["geometry-type"], "Polygon"], paint: { "line-color": cat.color, "line-width": 1.4, "line-dasharray": [3, 1.5] }, minzoom: cat.minzoom ?? 6 }) } catch {}
          try { if (!m.getLayer(cat.layerId)) m.addLayer({ id: cat.layerId, type: "circle", source: cat.sourceId, filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 2, 10, 4, 14, 6], "circle-color": cat.color, "circle-opacity": 0.85, "circle-stroke-color": "#000", "circle-stroke-width": 0.6 }, minzoom: cat.minzoom ?? 6 }) } catch {}
        } else {
          try {
            if (!m.getLayer(cat.layerId)) {
              // Apr 23, 2026 — cellSmall=true halves the dot radius per
              // Morgan ("make every single cell phone tower dot 50%
              // smaller"). Applied to nycCellTowers + dcCellTowers.
              const radius: any = cat.cellSmall
                ? ["interpolate", ["linear"], ["zoom"], 6, 1, 10, 2.25, 14, 3.5]
                : ["interpolate", ["linear"], ["zoom"], 6, 2, 10, 4.5, 14, 7]
              m.addLayer({ id: cat.layerId, type: "circle", source: cat.sourceId, paint: { "circle-radius": radius, "circle-color": cat.color, "circle-opacity": 0.85, "circle-stroke-color": "#000", "circle-stroke-width": 0.5 }, minzoom: cat.minzoom ?? 6 })
            }
          } catch {}
        }
        const openClick = (e: any) => {
          const f = e.features?.[0]; if (!f) return
          const hook = (window as any).__crep_selectAsset
          if (typeof hook !== "function") return
          const p = f.properties || {}
          const [lng, lat] = f.geometry?.type === "Point" ? (f.geometry.coordinates as [number, number]) : [e.lngLat?.lng, e.lngLat?.lat]
          hook({
            type: cat.selectType,
            id: p.id,
            name: p.name || cat.label,
            lat, lng,
            properties: {
              category: cat.label,
              operator: p.operator,
              ref: p.ref,
              source: "OSM (community-mapped)",
              ...(typeof p.tags === "string" ? JSON.parse(p.tags) : p.tags || {}),
            },
          })
        }
        m.on("click", cat.layerId, openClick)
        if (cat.polygon) m.on("click", cat.layerId + "-fill", openClick)
        m.on("mouseenter", cat.layerId, () => { m.getCanvas().style.cursor = "pointer" })
        m.on("mouseleave", cat.layerId, () => { m.getCanvas().style.cursor = "" })
        loaded.add(cat.layerId)
        console.log(`[CREP/NYC-DC] ${cat.layerId}: ${gj.features?.length ?? 0} loaded`)
      } catch (err: any) {
        console.warn(`[CREP/NYC-DC] ${cat.layerId} failed:`, err?.message)
      }
    }
    const applyVisibility = (cat: RegionCategory, on: boolean) => {
      const vis = on ? "visible" : "none"
      for (const suffix of ["", "-fill", "-outline"]) {
        try { if (m.getLayer(cat.layerId + suffix)) m.setLayoutProperty(cat.layerId + suffix, "visibility", vis) } catch {}
      }
    }
    for (const cat of all) {
      const on = !!(enabled as any)[cat.id]
      if (on) ensureCategory(cat).then(() => applyVisibility(cat, true))
      else applyVisibility(cat, false)
    }
    return () => { cancelled = true }
  }, [map, ...Object.values(enabled)])

  return null
}
