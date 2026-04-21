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
    // Apr 21, 2026 v2 expansion (Morgan: "massive increase in data
    // icons" + "we need real coverage here at project oyster"):
    oysterAnchor?: boolean           // MYCOSOFT/MYCODAO project site icon
    oysterCameras?: boolean          // Surfline/Caltrans/CBP/NOAA cams
    oysterBroadcast?: boolean        // AM/FM/TV
    oysterCell?: boolean             // cell towers
    oysterPower?: boolean            // substations + plants
    oysterNature?: boolean           // iNat observations
    oysterRails?: boolean            // Blue Line trolley + Amtrak + BNSF
    oysterCaves?: boolean            // sea caves + grottos
    oysterGovernment?: boolean       // CBP/USN/NPS/NOAA/IBWC
    oysterTourism?: boolean          // landmarks, beaches
    oysterSensors?: boolean          // AQS/tide/streamflow/water-quality
    oysterPlume?: boolean            // UCSD PFM sewage plume polygons
    oysterEmit?: boolean             // NASA EMIT methane/dust plumes
    oysterCrossBorder?: boolean      // Scripps cross-border samplers
    oysterHeatmap?: boolean          // pollution + biodiversity + noise
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
  // Apr 21, 2026 v2 (Morgan: "we need real coverage here at project
  // oyster"). Same React 18 strict-mode double-mount bug that was
  // discarding Mojave data: `let cancelled = false` + cleanup that
  // flips it to true on synthetic unmount causes setData to be
  // skipped when the fetch resolves. Fix: mountedRef that only
  // flips on TRUE unmount via a separate [] effect.
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Fetch data on mount + auto-refresh every 6 h to pick up the
  // background SWR refresh of /api/crep/oyster/plume (UCSD PFM scrape)
  // and /api/crep/oyster/emit (NASA CMR STAC) — both cache 6 h, so a
  // 6 h layer-side refresh lines up with their natural update cadence.
  // Skips refresh when document.hidden (don't burn on background tabs).
  useEffect(() => {
    if (!enabled.tijuanaEstuary) {
      fetchAttemptedRef.current = false
      return
    }
    const doFetch = (label: string) => {
      if (typeof document !== "undefined" && document.hidden && label !== "initial") return
      console.log(`[TijuanaEstuary] ${label} fetch /api/crep/tijuana-estuary ...`)
      fetch("/api/crep/tijuana-estuary")
        .then((r) => {
          console.log(`[TijuanaEstuary] ${label} response:`, r.status)
          return r.ok ? r.json() : null
        })
        .then((j) => {
          console.log(`[TijuanaEstuary] ${label} data:`, j ? `cameras=${j.cameras?.length} sensors=${j.sensors?.length} plume_source=${j.plume?.source} emit=${j.emit_plumes?.length}` : "null")
          if (mountedRef.current && j) setData(j)
        })
        .catch((e) => { console.warn(`[TijuanaEstuary] ${label} fetch failed:`, e?.message) })
    }

    if (!fetchAttemptedRef.current) {
      fetchAttemptedRef.current = true
      doFetch("initial")
    }
    // Every 6 h re-fetch the full oyster payload — picks up PFM plume
    // scrape refresh + EMIT STAC + fresh NDBC climate obs. Interval
    // doesn't hammer upstream: each sub-route caches 6 h + serves
    // instantly via SWR so the 6 h timer aligns with actual freshness.
    const refreshMs = 6 * 60 * 60 * 1000
    const iv = setInterval(() => doFetch("refresh"), refreshMs)
    return () => { clearInterval(iv) }
    // Intentionally no fetch-cancel cleanup — strict-mode cleanup was
    // aborting mount-1 in an earlier bug.
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

    // ══════════════════════════════════════════════════════════════════
    // Apr 21, 2026 v2 expansion (Morgan: "we need real coverage here at
    // project oyster" + "there needs to be a project oyster icon for
    // mycosoft just like there is for project goffs"). 11 new sub-layer
    // categories + PFM plume polygons + NASA EMIT plumes, all defensively
    // guarded so a single failure doesn't cascade.
    // ══════════════════════════════════════════════════════════════════
    const safeAddSource = (id: string, spec: any) => {
      try { if (map.getSource(id)) return true; map.addSource(id, spec); return true } catch (e: any) { console.warn(`[TijuanaEstuary/${id}]`, e?.message); return false }
    }
    const safeAddLayer = (spec: any, beforeId?: string) => {
      try { if (map.getLayer(spec.id)) return true; map.addLayer(spec, beforeId); return true } catch (e: any) { console.warn(`[TijuanaEstuary/layer ${spec.id}]`, e?.message); return false }
    }
    const bindOnce = (layerId: string, category: string) => {
      const key = `__crep_oyster_bound_${layerId}`
      if ((window as any)[key]) return
      ;(window as any)[key] = true
      map.on("click", layerId, (e: any) => {
        const p = e.features?.[0]?.properties || {}
        const c = e.lngLat
        try { window.dispatchEvent(new CustomEvent("crep:oyster:site-click", { detail: { category, ...p, lat: c?.lat, lng: c?.lng } })) } catch { /* ignore */ }
      })
      map.on("mouseenter", layerId, () => { try { map.getCanvas().style.cursor = "pointer" } catch {} })
      map.on("mouseleave", layerId, () => { try { map.getCanvas().style.cursor = "" } catch {} })
    }
    const beforeLabels = (() => {
      try { return map.getStyle().layers.find((l: any) => l.type === "symbol")?.id } catch { return undefined }
    })()

    // Apr 22, 2026 (Morgan: "icons overlaying eachother all over the map
    // in goffs in san diego project oyster ... makes selection impossible
    // and corrupted"). Previous 1.5 m jitter was invisible — at z12 a
    // pixel ≈ 9.5 m, so sub-pixel offset collapsed to zero. Bumped to a
    // VISUAL 40-80 m spread so co-located entities (IB Pier has ~6
    // sensors at identical coords) visibly fan out into distinct dots.
    // Deterministic per-id hash keeps layout stable across renders.
    const jitter = (id: string, lng: number, lat: number): [number, number] => {
      let h = 0
      for (let i = 0; i < (id || "").length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
      // Use different bit windows for x and y to avoid diagonal clumping
      const ux = ((h & 0xff) / 255 - 0.5)                    // -0.5 .. +0.5
      const uy = (((h >> 8) & 0xff) / 255 - 0.5)
      // ~0.0006° ≈ 65 m in lng, 65 m in lat — clearly pixel-separate
      // at zoom 12 (~60 px apart), still tight enough to read as
      // "clustered at this location" at zoom 15.
      const dx = ux * 0.0006
      const dy = uy * 0.0006
      return [lng + dx, lat + dy]
    }

    // ── OYSTER ANCHOR MARKER (MYCOSOFT/MYCODAO project site icon) ──
    if (data?.oyster && safeAddSource("oyster-anchor", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [{ type: "Feature", properties: { ...data.oyster }, geometry: { type: "Point", coordinates: [data.oyster.lng, data.oyster.lat] } }] },
    })) {
      safeAddLayer({
        id: "oyster-anchor-halo", type: "circle", source: "oyster-anchor",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 18, 4, 22, 10, 28],
          "circle-color": "#14b8a6",
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.70, 4, 0.50, 10, 0.30],
          "circle-blur": 0.45,
        },
      })
      safeAddLayer({
        id: "oyster-anchor-dot", type: "circle", source: "oyster-anchor",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 8, 5, 9, 10, 12],
          "circle-color": "#5eead4",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2.5,
          "circle-opacity": 1.0,
        },
      })
      safeAddLayer({
        id: "oyster-anchor-label", type: "symbol", source: "oyster-anchor", minzoom: 3,
        layout: {
          "text-field": "OYSTER · MYCODAO",
          "text-size": ["interpolate", ["linear"], ["zoom"], 3, 11, 10, 14],
          "text-offset": [0, 1.4],
          "text-anchor": "top",
          "text-allow-overlap": true,
          "text-letter-spacing": 0.08,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        } as any,
        paint: { "text-color": "#ecfeff", "text-halo-color": "#0f766e", "text-halo-width": 2.2, "text-halo-blur": 0.3 },
      })
      bindOnce("oyster-anchor-dot", "mycosoft-project")
    }

    // ── UCSD PFM plume (outer + core fill polygons) ──
    if (data?.plume?.outer && safeAddSource("oyster-plume-outer", {
      type: "geojson",
      data: { type: "Feature", properties: { kind: "outer", flow: data.plume.current_flow_m3s }, geometry: data.plume.outer },
    })) {
      safeAddLayer({
        id: "oyster-plume-outer-fill", type: "fill", source: "oyster-plume-outer",
        paint: { "fill-color": "#b91c1c", "fill-opacity": 0.18, "fill-antialias": true },
      }, beforeLabels)
      safeAddLayer({
        id: "oyster-plume-outer-line", type: "line", source: "oyster-plume-outer",
        paint: { "line-color": "#f87171", "line-width": 1.2, "line-opacity": 0.5, "line-dasharray": [4, 3] },
      }, beforeLabels)
    }
    if (data?.plume?.core && safeAddSource("oyster-plume-core", {
      type: "geojson",
      data: { type: "Feature", properties: { kind: "core", flow: data.plume.current_flow_m3s }, geometry: data.plume.core },
    })) {
      safeAddLayer({
        id: "oyster-plume-core-fill", type: "fill", source: "oyster-plume-core",
        paint: { "fill-color": "#dc2626", "fill-opacity": 0.34, "fill-antialias": true },
      }, beforeLabels)
      safeAddLayer({
        id: "oyster-plume-core-line", type: "line", source: "oyster-plume-core",
        paint: { "line-color": "#ef4444", "line-width": 1.8, "line-opacity": 0.85 },
      }, beforeLabels)
    }

    // ── NASA EMIT methane / dust plumes ──
    if (Array.isArray(data?.emit_plumes) && data.emit_plumes.length > 0 && safeAddSource("oyster-emit", {
      type: "geojson",
      data: { type: "FeatureCollection", features: data.emit_plumes.map((e: any) => ({ type: "Feature", properties: { ...e }, geometry: { type: "Point", coordinates: [e.lng, e.lat] } })) },
    })) {
      safeAddLayer({
        id: "oyster-emit-heatmap", type: "heatmap", source: "oyster-emit", minzoom: 9, maxzoom: 15,
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "intensity"], 0, 0, 1, 0.6],
          "heatmap-intensity": 0.8,
          "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,0,0)", 0.3, "rgba(249,115,22,0.35)", 0.7, "rgba(234,88,12,0.55)", 1, "rgba(194,65,12,0.70)"],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 9, 14, 13, 30],
          "heatmap-opacity": 0.55,
        },
      }, beforeLabels)
      safeAddLayer({
        id: "oyster-emit-dot", type: "circle", source: "oyster-emit", minzoom: 5,
        paint: { "circle-radius": 6, "circle-color": "#f97316", "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5 },
      })
      bindOnce("oyster-emit-dot", "emit")
    }

    // ── CAMERAS ──
    // Apr 21, 2026 (Morgan: "remove anything from map that doesnt have
    // camera"). Filter to ONLY cameras with verified live stream —
    // has_stream === true OR stream_url matching a known video pattern.
    const liveCams = (Array.isArray(data?.cameras) ? data.cameras : []).filter((c: any) =>
      c.has_stream === true ||
      (typeof c.stream_url === "string" && /\.m3u8|surfline|earthcam|windy|skylinewebcams|cwwp2\.dot|hpwren|alertwildfire|nps\.gov|usgs/i.test(c.stream_url))
    )
    if (liveCams.length > 0 && safeAddSource("oyster-cameras", {
      type: "geojson",
      data: { type: "FeatureCollection", features: liveCams.map((c: any) => { const [jx, jy] = jitter(c.id, c.lng, c.lat); return { type: "Feature", properties: { ...c }, geometry: { type: "Point", coordinates: [jx, jy] } } }) },
    })) {
      safeAddLayer({
        id: "oyster-cameras-dot", type: "circle", source: "oyster-cameras", minzoom: 8,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 4, 14, 7],
          "circle-color": ["match", ["get", "provider"], "surfline", "#06b6d4", "caltrans", "#0ea5e9", "cbp", "#3b82f6", "noaa", "#22d3ee", "earthcam", "#8b5cf6", "windy", "#a855f7", "#67e8f9"],
          "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.4, "circle-opacity": 0.95,
        },
      })
      bindOnce("oyster-cameras-dot", "camera")
    }

    // ── BROADCAST ──
    if (Array.isArray(data?.broadcast) && data.broadcast.length > 0 && safeAddSource("oyster-broadcast", {
      type: "geojson",
      data: { type: "FeatureCollection", features: data.broadcast.map((b: any) => { const [jx, jy] = jitter(b.id, b.lng, b.lat); return { type: "Feature", properties: { ...b }, geometry: { type: "Point", coordinates: [jx, jy] } } }) },
    })) {
      safeAddLayer({
        id: "oyster-broadcast-dot", type: "circle", source: "oyster-broadcast", minzoom: 7,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 3, 14, 6],
          "circle-color": ["match", ["get", "band"], "am", "#a855f7", "fm", "#8b5cf6", "tv", "#7c3aed", "#8b5cf6"],
          "circle-stroke-color": "#0b1220", "circle-stroke-width": 1.2, "circle-opacity": 0.9,
        },
      })
      bindOnce("oyster-broadcast-dot", "broadcast")
    }

    // ── CELL TOWERS ──
    if (Array.isArray(data?.cell_towers) && data.cell_towers.length > 0 && safeAddSource("oyster-cell", {
      type: "geojson",
      data: { type: "FeatureCollection", features: data.cell_towers.map((c: any) => { const [jx, jy] = jitter(c.id, c.lng, c.lat); return { type: "Feature", properties: { ...c }, geometry: { type: "Point", coordinates: [jx, jy] } } }) },
    })) {
      safeAddLayer({
        id: "oyster-cell-dot", type: "circle", source: "oyster-cell", minzoom: 8,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 3, 14, 6],
          "circle-color": ["match", ["get", "carrier"], "Verizon", "#ef4444", "AT&T", "#3b82f6", "T-Mobile", "#ec4899", "FirstNet", "#22c55e", "DoD", "#f59e0b", "#a855f7"],
          "circle-stroke-color": "#0b1220", "circle-stroke-width": 1.0, "circle-opacity": 0.9,
        },
      })
      bindOnce("oyster-cell-dot", "cell")
    }

    // ── POWER INFRASTRUCTURE ──
    if (Array.isArray(data?.power) && data.power.length > 0 && safeAddSource("oyster-power", {
      type: "geojson",
      data: { type: "FeatureCollection", features: data.power.map((p: any) => { const [jx, jy] = jitter(p.id, p.lng, p.lat); return { type: "Feature", properties: { ...p }, geometry: { type: "Point", coordinates: [jx, jy] } } }) },
    })) {
      safeAddLayer({
        id: "oyster-power-dot", type: "circle", source: "oyster-power", minzoom: 7,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["coalesce", ["get", "capacity_mw"], 0], 0, 4, 100, 5, 500, 7, 2000, 10],
          "circle-color": ["match", ["get", "kind"], "solar", "#facc15", "gas", "#f97316", "gas-retired", "#78350f", "nuclear-retired", "#84cc16", "substation", "#fbbf24", "battery", "#a855f7", "#fbbf24"],
          "circle-stroke-color": "#0b1220", "circle-stroke-width": 1.4, "circle-opacity": 0.95,
        },
      })
      bindOnce("oyster-power-dot", "power")
    }

    // ── RAILS ──
    if (Array.isArray(data?.rails) && data.rails.length > 0 && safeAddSource("oyster-rails", {
      type: "geojson",
      data: { type: "FeatureCollection", features: data.rails.map((r: any) => { const [jx, jy] = jitter(r.id, r.lng, r.lat); return { type: "Feature", properties: { ...r }, geometry: { type: "Point", coordinates: [jx, jy] } } }) },
    })) {
      safeAddLayer({
        id: "oyster-rails-dot", type: "circle", source: "oyster-rails", minzoom: 8,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 4, 14, 7],
          "circle-color": "#a1a1aa", "circle-stroke-color": "#0b1220", "circle-stroke-width": 1.4, "circle-opacity": 0.95,
        },
      })
      bindOnce("oyster-rails-dot", "rail")
    }

    // ── CAVES (sea caves / grottos) ──
    if (Array.isArray(data?.caves) && data.caves.length > 0 && safeAddSource("oyster-caves", {
      type: "geojson",
      data: { type: "FeatureCollection", features: data.caves.map((c: any) => { const [jx, jy] = jitter(c.id, c.lng, c.lat); return { type: "Feature", properties: { ...c }, geometry: { type: "Point", coordinates: [jx, jy] } } }) },
    })) {
      safeAddLayer({
        id: "oyster-caves-dot", type: "circle", source: "oyster-caves", minzoom: 8,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 4, 14, 7],
          "circle-color": "#78350f", "circle-stroke-color": "#f59e0b", "circle-stroke-width": 1.4, "circle-opacity": 0.92,
        },
      })
      bindOnce("oyster-caves-dot", "cave")
    }

    // ── GOVERNMENT ──
    if (Array.isArray(data?.government) && data.government.length > 0 && safeAddSource("oyster-gov", {
      type: "geojson",
      data: { type: "FeatureCollection", features: data.government.map((g: any) => { const [jx, jy] = jitter(g.id, g.lng, g.lat); return { type: "Feature", properties: { ...g }, geometry: { type: "Point", coordinates: [jx, jy] } } }) },
    })) {
      safeAddLayer({
        id: "oyster-gov-dot", type: "circle", source: "oyster-gov", minzoom: 7,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 4, 14, 7],
          "circle-color": ["match", ["get", "agency"], "CBP", "#3b82f6", "USN", "#0284c7", "USCG", "#0891b2", "NPS", "#84cc16", "NOAA", "#14b8a6", "IBWC", "#f59e0b", "EPA", "#22c55e", "CDFW", "#84cc16", "CA SP", "#10b981", "#7dd3fc"],
          "circle-stroke-color": "#0b1220", "circle-stroke-width": 1.4, "circle-opacity": 0.95,
        },
      })
      bindOnce("oyster-gov-dot", "government")
    }

    // ── TOURISM ──
    if (Array.isArray(data?.tourism) && data.tourism.length > 0 && safeAddSource("oyster-tourism", {
      type: "geojson",
      data: { type: "FeatureCollection", features: data.tourism.map((t: any) => { const [jx, jy] = jitter(t.id, t.lng, t.lat); return { type: "Feature", properties: { ...t }, geometry: { type: "Point", coordinates: [jx, jy] } } }) },
    })) {
      safeAddLayer({
        id: "oyster-tourism-dot", type: "circle", source: "oyster-tourism", minzoom: 8,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 3, 14, 6],
          "circle-color": "#f9a8d4", "circle-stroke-color": "#831843", "circle-stroke-width": 1.2, "circle-opacity": 0.9,
        },
      })
      bindOnce("oyster-tourism-dot", "tourism")
    }

    // ── SENSORS (includes UCSD PFM + Scripps cross-border) ──
    // Jittered to avoid click-occlusion against co-located dots (e.g.
    // IB pier has surfline cam + EPA AQS + NDBC buoy + SDAPCD — each
    // lands in its own hit-test cell now).
    if (Array.isArray(data?.sensors) && data.sensors.length > 0 && safeAddSource("oyster-sensors", {
      type: "geojson",
      data: { type: "FeatureCollection", features: data.sensors.map((s: any) => { const [jx, jy] = jitter(s.id, s.lng, s.lat); return { type: "Feature", properties: { ...s }, geometry: { type: "Point", coordinates: [jx, jy] } } }) },
    })) {
      safeAddLayer({
        id: "oyster-sensors-dot", type: "circle", source: "oyster-sensors", minzoom: 7,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 4, 14, 7],
          "circle-color": ["match", ["get", "kind"], "aqi", "#ef4444", "tide", "#0ea5e9", "streamflow", "#06b6d4", "waterquality", "#22d3ee", "oceanography", "#14b8a6", "plume", "#dc2626", "crossborder", "#b91c1c", "emit", "#f97316", "buoy", "#84cc16", "noise", "#a855f7", "light", "#fbbf24", "soil", "#78350f", "#06b6d4"],
          "circle-stroke-color": "#0b1220", "circle-stroke-width": 1.4, "circle-opacity": 0.95,
        },
      })
      // Click route: kind determines widget category (plume / crossborder / emit / etc)
      const key = `__crep_oyster_bound_oyster-sensors-dot`
      if (!(window as any)[key]) {
        ;(window as any)[key] = true
        map.on("click", "oyster-sensors-dot", (e: any) => {
          const p = e.features?.[0]?.properties || {}
          const c = e.lngLat
          const cat = p.kind === "plume" ? "plume" : p.kind === "crossborder" ? "crossborder" : p.kind === "emit" ? "emit" : p.kind === "aqi" ? "air-quality" : "sensor"
          try { window.dispatchEvent(new CustomEvent("crep:oyster:site-click", { detail: { category: cat, ...p, lat: c?.lat, lng: c?.lng } })) } catch { /* ignore */ }
        })
        map.on("mouseenter", "oyster-sensors-dot", () => { try { map.getCanvas().style.cursor = "pointer" } catch {} })
        map.on("mouseleave", "oyster-sensors-dot", () => { try { map.getCanvas().style.cursor = "" } catch {} })
      }
    }

    // ── iNaturalist observations ──
    if (Array.isArray(data?.inat_observations) && data.inat_observations.length > 0 && safeAddSource("oyster-inat", {
      type: "geojson",
      data: { type: "FeatureCollection", features: data.inat_observations.map((o: any) => { const [jx, jy] = jitter(String(o.id || `${o.lat}-${o.lng}`), o.lng, o.lat); return { type: "Feature", properties: { ...o }, geometry: { type: "Point", coordinates: [jx, jy] } } }) },
    })) {
      safeAddLayer({
        id: "oyster-inat-dot", type: "circle", source: "oyster-inat", minzoom: 9,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 3, 14, 6],
          "circle-color": ["match", ["get", "iconic_taxon"], "Plantae", "#84cc16", "Reptilia", "#eab308", "Aves", "#38bdf8", "Mammalia", "#f43f5e", "Insecta", "#a78bfa", "Mollusca", "#06b6d4", "Actinopterygii", "#22d3ee", "#22c55e"],
          "circle-stroke-color": "#052e16", "circle-stroke-width": 0.8, "circle-opacity": 0.92,
        },
      })
      bindOnce("oyster-inat-dot", "inat-observation")
    }

    // ── HEATMAPS (pollution + biodiversity + noise combined) ──
    if (data?.heatmaps && safeAddSource("oyster-heatmap", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          ...(data.heatmaps.pollution || []).map((p: any) => ({ type: "Feature", properties: { kind: "pollution", intensity: p.intensity, label: p.label }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } })),
          ...(data.heatmaps.biodiversity || []).map((p: any) => ({ type: "Feature", properties: { kind: "biodiversity", intensity: p.intensity, label: p.label }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } })),
          ...(data.heatmaps.noise || []).map((p: any) => ({ type: "Feature", properties: { kind: "noise", intensity: p.intensity, label: p.label }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } })),
        ],
      },
    })) {
      // Apr 21, 2026 (Morgan: "wierd heat map circles around projects
      // that are fake and when zoomed out they are large"). Hard
      // minzoom:10 so the heatmap only paints when user is actually
      // zoomed to the estuary, not on the world view. Radius capped
      // tight so it doesn't balloon geographically.
      safeAddLayer({
        id: "oyster-heatmap-layer", type: "heatmap", source: "oyster-heatmap", minzoom: 10, maxzoom: 15,
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "intensity"], 0, 0, 1, 0.55],
          "heatmap-intensity": 0.7,
          "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,0,0)", 0.25, "rgba(34,197,94,0.25)", 0.50, "rgba(250,204,21,0.40)", 0.75, "rgba(249,115,22,0.55)", 0.95, "rgba(220,38,38,0.70)"],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 16, 13, 30, 15, 42],
          "heatmap-opacity": 0.55,
        },
      }, beforeLabels)
    }

    // Apply visibility toggles
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
      // v2 expansion visibility:
      setVis("oyster-anchor-halo",        enabled.oysterAnchor !== false)
      setVis("oyster-anchor-dot",         enabled.oysterAnchor !== false)
      setVis("oyster-anchor-label",       enabled.oysterAnchor !== false)
      setVis("oyster-plume-outer-fill",   !!enabled.oysterPlume)
      setVis("oyster-plume-outer-line",   !!enabled.oysterPlume)
      setVis("oyster-plume-core-fill",    !!enabled.oysterPlume)
      setVis("oyster-plume-core-line",    !!enabled.oysterPlume)
      setVis("oyster-emit-heatmap",       !!enabled.oysterEmit)
      setVis("oyster-emit-dot",           !!enabled.oysterEmit)
      setVis("oyster-cameras-dot",        !!enabled.oysterCameras)
      setVis("oyster-broadcast-dot",      !!enabled.oysterBroadcast)
      setVis("oyster-cell-dot",           !!enabled.oysterCell)
      setVis("oyster-power-dot",          !!enabled.oysterPower)
      setVis("oyster-rails-dot",          !!enabled.oysterRails)
      setVis("oyster-caves-dot",          !!enabled.oysterCaves)
      setVis("oyster-gov-dot",            !!enabled.oysterGovernment)
      setVis("oyster-tourism-dot",        !!enabled.oysterTourism)
      setVis("oyster-sensors-dot",        !!enabled.oysterSensors)
      setVis("oyster-inat-dot",           !!enabled.oysterNature)
      setVis("oyster-heatmap-layer",      !!enabled.oysterHeatmap)
    } catch { /* ignore */ }
  }, [map, data, enabled])

  return null
}
