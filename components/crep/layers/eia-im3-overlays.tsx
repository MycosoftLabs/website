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
    minzoom: 3,
    radiusProp: "sqft",
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
    minzoom: 4,
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
    minzoom: 3,           // planned plants visible sooner — they're the story
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
    minzoom: 5,
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
    minzoom: 5,
    radiusProp: "capacity_mw",
  },
]

function mapReady(map: MapLibreMap): boolean {
  return !!(map && (map as any).style && typeof map.getSource === "function")
}

export default function EiaIm3Overlays({ map, enabled }: Props) {
  const loadedRef = useRef<Record<string, boolean>>({})

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
    if (!on) {
      if (!mapReady(map)) return
      try {
        if (map.getLayer(fillId)) map.setLayoutProperty(fillId, "visibility", "none")
        if (map.getLayer(lineId)) map.setLayoutProperty(lineId, "visibility", "none")
      } catch { /* ignore */ }
      return
    }
    if (loadedRef.current[sourceId]) {
      if (!mapReady(map)) return
      try {
        if (map.getLayer(fillId)) map.setLayoutProperty(fillId, "visibility", "visible")
        if (map.getLayer(lineId)) map.setLayoutProperty(lineId, "visibility", "visible")
      } catch { /* ignore */ }
      return
    }
    loadedRef.current[sourceId] = true
    ;(async () => {
      try {
        const res = await fetch("/data/crep/im3-datacenter-footprints.geojson")
        if (!res.ok) return
        const data = await res.json()
        if (!mapReady(map)) return
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, { type: "geojson", data })
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
          console.log(`[EiaIm3] IM3 footprints: ${(data.features || []).length} polygons loaded → ${sourceId}`)
        }
      } catch (e: any) {
        console.warn("[EiaIm3/footprints]", e?.message)
      }
    })()
  }, [map, enabled.im3DataCenterFootprints])

  // ─── Attach each dataset lazily on first enable ────────────────────────
  useEffect(() => {
    if (!map) return
    for (const ds of DATASETS) {
      const on = !!enabled[ds.key]
      if (!on) {
        // Hide existing layers when disabled
        if (!mapReady(map)) continue
        for (const lid of ds.layerIds) {
          try {
            if (map.getLayer(lid)) map.setLayoutProperty(lid, "visibility", "none")
          } catch { /* ignore */ }
        }
        continue
      }

      // Flip visibility back if already attached
      if (loadedRef.current[ds.sourceId]) {
        if (!mapReady(map)) continue
        for (const lid of ds.layerIds) {
          try {
            if (map.getLayer(lid)) map.setLayoutProperty(lid, "visibility", "visible")
          } catch { /* ignore */ }
        }
        continue
      }

      loadedRef.current[ds.sourceId] = true

      ;(async () => {
        try {
          const res = await fetch(ds.file)
          if (!res.ok) {
            console.warn(`[EiaIm3] ${ds.label}: HTTP ${res.status}`)
            return
          }
          const data = await res.json()
          if (!mapReady(map)) return
          if (!map.getSource(ds.sourceId)) {
            map.addSource(ds.sourceId, { type: "geojson", data, generateId: true })

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
              minzoom: 9,
              layout: {
                "text-field": ds.valueProp
                  ? [
                      "case",
                      [">", ["coalesce", ["to-number", ["get", ds.valueProp]], 0], 0],
                      ["concat", ["get", ds.nameProp], " · ", ["to-string", ["get", ds.valueProp]], " ", ds.valueUnit || ""],
                      ["get", ds.nameProp],
                    ]
                  : ["get", ds.nameProp],
                "text-size": ["interpolate", ["linear"], ["zoom"], 9, 9, 14, 11, 18, 13],
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

            console.log(
              `[EiaIm3] ${ds.label}: ${(data.features || []).length} features loaded → ${ds.sourceId}`,
            )
          }
        } catch (e: any) {
          console.warn(`[EiaIm3] ${ds.label} load failed:`, e?.message)
        }
      })()
    }
  }, [map, enabled.im3DataCenters, enabled.eiaOperating, enabled.eiaPlanned, enabled.eiaRetired, enabled.eiaCanceled])

  return null
}
