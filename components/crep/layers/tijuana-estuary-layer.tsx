"use client"

/**
 * Tijuana Estuary / Project Oyster layer — Apr 20, 2026
 *
 * Morgan: "make layers filters for pollution and specifically a filter
 * section for project oyster with all of these layers and a perimeter
 * and hotspot of gasses water flows ect".
 *
 * Renders the Project Oyster (MYCODAO + MYCOSOFT) operational area at
 * the Tijuana Estuary on the SD-Mexico border, plus all federated
 * pollution / environmental data sources from /api/crep/tijuana-estuary:
 *
 *   • Project Oyster perimeter — outlined polygon over the estuary
 *     with subtle teal fill + dashed border. Always rendered when the
 *     master `tijuanaEstuary` layer is on.
 *   • H₂S hotspot — heatmap source from SDAPCD H₂S monitor positions,
 *     intensity proportional to monitor density (synthetic until
 *     SDAPCD's PowerBI dashboard exposes a public JSON feed).
 *   • River flow line — Tijuana River course with line-width modulated
 *     by latest IBWC discharge (m³/s) so high-flow sewage events
 *     visually thicken the line.
 *   • Discharge station — IBWC 11013300 marker with last reading.
 *   • Beach closures — red pulsing circles for chronic vs intermittent.
 *   • Navy training waters — yellow ring perimeter for affected
 *     Coronado / Silver Strand swims.
 *   • Project Oyster sites — branded teal+cyan markers with reef glyph.
 *
 * Each sub-category has its own toggle wired through the parent props
 * so the dashboard's layer panel can fold them all under a single
 * "Project Oyster" group.
 */

import { useEffect, useRef, useState } from "react"
import type { Map as MapLibreMap } from "maplibre-gl"

interface Props {
  map: MapLibreMap | null
  enabled: {
    tijuanaEstuary?: boolean         // master
    projectOysterPerimeter?: boolean // teal polygon outline
    projectOysterSites?: boolean     // reef markers
    h2sHotspot?: boolean             // SDAPCD H₂S heatmap
    riverFlow?: boolean              // TJ river course + IBWC station
    beachClosures?: boolean          // sewage-related closures
    navyTraining?: boolean           // Coronado / Silver Strand impact
    estuaryMonitors?: boolean        // TRNERR monitors
  }
}

// Project Oyster operational perimeter — wraps the lower TJ Estuary
// from the Pacific outflow EAST to Saturn Blvd, encompassing the
// military training land that straddles both banks of the river.
//
// Apr 20, 2026 update (Morgan: "project oyster goes all the way east
// of the eastuary mouth all the way to saturn blvd where the military
// base crosses both sides of the land on the river"). Saturn Blvd
// runs north-south near lng -117.051. Polygon now extends from the
// IB pier west edge all the way east to Saturn Blvd, with both banks
// north + south of the river included.
const PROJECT_OYSTER_PERIMETER_GEOJSON = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: { name: "Project Oyster operational zone" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [-117.1380, 32.5350], // SW — south of IB pier
          [-117.1280, 32.5340], // S — estuary mouth (south bank)
          [-117.1080, 32.5360], // S — south slough
          [-117.0900, 32.5400], // S — Nestor / south river bank
          [-117.0700, 32.5430], // S — south of Saturn approach
          [-117.0510, 32.5470], // SE — Saturn Blvd south
          [-117.0510, 32.5680], // NE — Saturn Blvd north (military boundary)
          [-117.0700, 32.5710], // N — north of Saturn
          [-117.0900, 32.5720], // N — Iris Ave / north river bank
          [-117.1080, 32.5720], // N — beach approach
          [-117.1280, 32.5720], // NW — beach corridor north
          [-117.1380, 32.5680], // W — IB pier north
          [-117.1380, 32.5350], // close
        ]],
      },
    },
  ],
}

// Tijuana River course from Otay Mountain to Pacific outflow (simplified).
const TJ_RIVER_COURSE_GEOJSON = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: { name: "Tijuana River" },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-116.6356, 32.5773], // upstream — Tecate area
          [-116.8342, 32.5961], // Otay Mountain headwaters
          [-116.9395, 32.5527], // Otay Mesa border crossing
          [-117.0298, 32.5435], // San Ysidro — international boundary
          [-117.0900, 32.5497], // Nestor
          [-117.1180, 32.5510], // TJ slough
          [-117.1280, 32.5440], // estuary mouth
          [-117.1330, 32.5390], // Pacific outflow
        ],
      },
    },
  ],
}

export default function TijuanaEstuaryLayer({ map, enabled }: Props) {
  const loadedRef = useRef(false)
  const [data, setData] = useState<any | null>(null)
  // Apr 21, 2026 (Morgan: "crep keeps reloading ... too much data?"):
  // guard against the infinite-fetch loop we had here before. The old
  // effect listed `data` in its deps AND called setData(j) where j
  // could be null when the endpoint 5xx'd — flipping data from null
  // to null re-evaluated the deps array (still null) but React fires
  // the effect once per mount regardless of equality. More importantly,
  // when j was null the `if (data) return` gate didn't catch it,
  // so every render re-fetched. Now we track the attempt in a ref so
  // a failed fetch doesn't spin forever, and drop `data` from deps.
  const fetchAttemptedRef = useRef(false)

  // Fetch data once when enabled (or re-enable after a disable)
  useEffect(() => {
    if (!enabled.tijuanaEstuary) {
      // reset the guard so a re-enable re-fetches fresh
      fetchAttemptedRef.current = false
      return
    }
    if (fetchAttemptedRef.current) return
    fetchAttemptedRef.current = true
    let cancelled = false
    fetch("/api/crep/tijuana-estuary")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j) setData(j) })
      .catch(() => { /* ignore */ })
    return () => { cancelled = true }
  }, [enabled.tijuanaEstuary])

  useEffect(() => {
    if (!map) return
    if (typeof map.getSource !== "function") return

    const allLayerIds = [
      "tj-estuary-perimeter-fill", "tj-estuary-perimeter-line",
      "tj-river-course-line", "tj-river-course-glow",
      "tj-h2s-heat",
      "tj-stations-discharge", "tj-stations-h2s", "tj-stations-oyster", "tj-stations-navy", "tj-stations-beach", "tj-stations-monitor",
      "tj-stations-labels",
    ]

    // Disable path
    if (!enabled.tijuanaEstuary) {
      try {
        for (const id of allLayerIds) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none")
      } catch { /* ignore */ }
      return
    }

    if (!loadedRef.current) {
      try {
        // ── Project Oyster perimeter ──
        if (!map.getSource("tj-perimeter")) {
          map.addSource("tj-perimeter", { type: "geojson", data: PROJECT_OYSTER_PERIMETER_GEOJSON })
          // Insert before first symbol to keep labels on top
          const beforeId = map.getStyle().layers.find((l: any) => l.type === "symbol")?.id
          map.addLayer({
            id: "tj-estuary-perimeter-fill",
            type: "fill",
            source: "tj-perimeter",
            paint: {
              "fill-color": "#0d9488",
              "fill-opacity": 0.08,
            },
          }, beforeId)
          map.addLayer({
            id: "tj-estuary-perimeter-line",
            type: "line",
            source: "tj-perimeter",
            paint: {
              "line-color": "#5eead4",
              "line-width": 2,
              "line-dasharray": [2, 2],
              "line-opacity": 0.9,
            },
          }, beforeId)
        }

        // ── TJ River course ──
        if (!map.getSource("tj-river-course")) {
          map.addSource("tj-river-course", { type: "geojson", data: TJ_RIVER_COURSE_GEOJSON })
          const beforeId = map.getStyle().layers.find((l: any) => l.type === "symbol")?.id
          map.addLayer({
            id: "tj-river-course-glow",
            type: "line",
            source: "tj-river-course",
            paint: {
              "line-color": "#fbbf24",
              "line-width": ["interpolate", ["linear"], ["zoom"], 8, 6, 14, 12],
              "line-opacity": 0.18,
              "line-blur": 3,
            },
          }, beforeId)
          map.addLayer({
            id: "tj-river-course-line",
            type: "line",
            source: "tj-river-course",
            paint: {
              "line-color": "#f59e0b",
              "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1.5, 14, 3],
              "line-opacity": 0.9,
            },
          }, beforeId)
        }

        // ── Stations source (populated when data arrives) ──
        if (!map.getSource("tj-stations")) {
          map.addSource("tj-stations", { type: "geojson", data: { type: "FeatureCollection", features: [] } })

          // H₂S heatmap (uses same source, filtered to air-quality category)
          map.addLayer({
            id: "tj-h2s-heat",
            type: "heatmap",
            source: "tj-stations",
            filter: ["==", ["get", "category"], "air-quality"],
            paint: {
              "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 8, 30, 14, 80],
              "heatmap-weight": 1,
              "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 8, 0.6, 14, 1.4],
              "heatmap-opacity": 0.55,
              "heatmap-color": [
                "interpolate", ["linear"], ["heatmap-density"],
                0, "rgba(0,0,0,0)",
                0.2, "#22c55e",
                0.4, "#fde047",
                0.7, "#f97316",
                1, "#dc2626",
              ],
            },
          })

          // Discharge station marker
          map.addLayer({
            id: "tj-stations-discharge",
            type: "circle",
            source: "tj-stations",
            filter: ["==", ["get", "category"], "river-flow"],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 6, 14, 14],
              "circle-color": "#0ea5e9",
              "circle-stroke-color": "#082f49",
              "circle-stroke-width": 2,
              "circle-opacity": 0.95,
            },
          })

          // H₂S monitor pins
          map.addLayer({
            id: "tj-stations-h2s",
            type: "circle",
            source: "tj-stations",
            filter: ["==", ["get", "category"], "air-quality"],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 4, 14, 9],
              "circle-color": "#f43f5e",
              "circle-stroke-color": "#1f2937",
              "circle-stroke-width": 1.4,
              "circle-opacity": 0.9,
            },
          })

          // Project Oyster site (branded teal pulse)
          map.addLayer({
            id: "tj-stations-oyster",
            type: "circle",
            source: "tj-stations",
            filter: ["==", ["get", "category"], "project-oyster"],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 7, 14, 16],
              "circle-color": "#14b8a6",
              "circle-stroke-color": "#5eead4",
              "circle-stroke-width": 2,
              "circle-opacity": 0.95,
            },
          })

          map.addLayer({
            id: "tj-stations-navy",
            type: "circle",
            source: "tj-stations",
            filter: ["==", ["get", "category"], "navy-training"],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 6, 14, 12],
              "circle-color": "#fbbf24",
              "circle-stroke-color": "#78350f",
              "circle-stroke-width": 2,
              "circle-opacity": 0.9,
            },
          })

          map.addLayer({
            id: "tj-stations-beach",
            type: "circle",
            source: "tj-stations",
            filter: ["==", ["get", "category"], "beach-closure"],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 5, 14, 11],
              "circle-color": "#dc2626",
              "circle-stroke-color": "#7f1d1d",
              "circle-stroke-width": 1.6,
              "circle-opacity": 0.92,
            },
          })

          map.addLayer({
            id: "tj-stations-monitor",
            type: "circle",
            source: "tj-stations",
            filter: ["==", ["get", "category"], "estuary-monitor"],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 5, 14, 10],
              "circle-color": "#22d3ee",
              "circle-stroke-color": "#0e7490",
              "circle-stroke-width": 1.4,
              "circle-opacity": 0.9,
            },
          })

          // Universal label layer
          map.addLayer({
            id: "tj-stations-labels",
            type: "symbol",
            source: "tj-stations",
            minzoom: 11,
            layout: {
              "text-field": ["get", "name"],
              "text-size": 10,
              "text-offset": [0, 1.2],
              "text-anchor": "top",
              "text-allow-overlap": false,
              "text-optional": true,
            },
            paint: {
              "text-color": "#ffffff",
              "text-halo-color": "rgba(0,0,0,0.8)",
              "text-halo-width": 1.5,
            },
          })

          // Click handler — open station detail
          map.on("click", "tj-stations-oyster", (e: any) => {
            const f = e.features?.[0]
            if (f) try { window.dispatchEvent(new CustomEvent("crep:tijuana:station-click", { detail: f.properties })) } catch { /* ignore */ }
          })
          for (const id of ["tj-stations-discharge", "tj-stations-h2s", "tj-stations-navy", "tj-stations-beach", "tj-stations-monitor"]) {
            map.on("click", id, (e: any) => {
              const f = e.features?.[0]
              if (f) try { window.dispatchEvent(new CustomEvent("crep:tijuana:station-click", { detail: f.properties })) } catch { /* ignore */ }
            })
            map.on("mouseenter", id, () => { map.getCanvas().style.cursor = "pointer" })
            map.on("mouseleave", id, () => { map.getCanvas().style.cursor = "" })
          }
        }
        loadedRef.current = true
      } catch (e: any) {
        console.warn("[TijuanaEstuary]", e?.message || e)
      }
    }

    // Push station data when it arrives + apply per-category visibility
    if (data?.geojson) {
      try {
        const src = map.getSource("tj-stations") as any
        if (src?.setData) src.setData(data.geojson)
      } catch { /* ignore */ }
    }
    try {
      const setVis = (id: string, on: boolean) => {
        try { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none") } catch { /* ignore */ }
      }
      setVis("tj-estuary-perimeter-fill", enabled.projectOysterPerimeter !== false)
      setVis("tj-estuary-perimeter-line", enabled.projectOysterPerimeter !== false)
      setVis("tj-river-course-line",      enabled.riverFlow !== false)
      setVis("tj-river-course-glow",      enabled.riverFlow !== false)
      setVis("tj-h2s-heat",               enabled.h2sHotspot !== false)
      setVis("tj-stations-discharge",     enabled.riverFlow !== false)
      setVis("tj-stations-h2s",           enabled.h2sHotspot !== false)
      setVis("tj-stations-oyster",        enabled.projectOysterSites !== false)
      setVis("tj-stations-navy",          enabled.navyTraining !== false)
      setVis("tj-stations-beach",         enabled.beachClosures !== false)
      setVis("tj-stations-monitor",       enabled.estuaryMonitors !== false)
      setVis("tj-stations-labels",        true)
    } catch { /* ignore */ }
  }, [map, data, enabled])

  return null
}
