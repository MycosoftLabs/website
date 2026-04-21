"use client"

/**
 * V3 Overlays — wires the long tail of orphan layer toggles (events,
 * facilities, pollution sub-types, human movement, military sub-types,
 * transport trails, biodiversity, signal heatmap) into MapLibre.
 *
 * Morgan (Apr 19, 2026): "wire every single one up now fix all of that".
 *
 * Architecture: one <V3Overlays /> component receives the layer-toggle
 * `enabled` map + a ref to the map + the current bbox. For each enabled
 * layer it:
 *   1. Adds an empty GeoJSON source keyed by layer id (idempotent).
 *   2. Adds a circle / line / heatmap render layer with a distinct style.
 *   3. Kicks off a best-effort data fetch (API endpoint OR OSM Overpass
 *      OR derived filter of existing data).
 *   4. Re-polls at a layer-appropriate interval (events: 60 s; facilities:
 *      300 s; heatmaps: 600 s).
 *   5. Wires a click handler → window.__crep_selectAsset for the generic
 *      InfraAsset panel.
 *
 * Layers handled:
 *   • events: earthquakes, volcanoes, wildfires, storms, lightning,
 *     tornadoes — NWS + USGS + EONET + FIRMS proxies.
 *   • facilities: hospitals, fireStations, universities — OSM Overpass
 *     bbox queries (render only when zoom ≥ 5 to avoid mass queries).
 *   • pollution: oilGas, methaneSources, metalOutput, waterPollution —
 *     OSM industrial tags + Overture facilities where present.
 *   • human: population, humanMovement, events_human — heatmap sources
 *     from Kontur OR existing events registry (empty source for now if
 *     the upstream isn't wired; filter toggle still works).
 *   • military sub-types: militaryAir, militaryNavy, tanks, militaryDrones
 *     — derived from aircraft (callsign prefix) + vessels (military
 *     operator tag) + OSM military=* ground infrastructure.
 *   • transport trails: aviationRoutes, shipRoutes — line trails emitted
 *     from lastKnownRef in CREPDashboardClient (empty until that's wired
 *     into a ref we can access here).
 *   • biodiversity: GBIF species-density heatmap.
 *   • signalHeatmap: cell-tower density heatmap (reuses PMTiles features).
 *
 * Any layer whose upstream is unreachable returns empty — the filter
 * toggle still works (visibility on/off), so the UI is complete even
 * when a specific feed is down.
 */

import { useEffect, useRef } from "react"
import type { Map as MapLibreMap } from "maplibre-gl"

export interface V3Enabled {
  earthquakes?: boolean
  volcanoes?: boolean
  wildfires?: boolean
  storms?: boolean
  lightning?: boolean
  tornadoes?: boolean

  hospitals?: boolean
  fireStations?: boolean
  universities?: boolean

  oilGas?: boolean
  methaneSources?: boolean
  metalOutput?: boolean
  waterPollution?: boolean

  population?: boolean
  humanMovement?: boolean
  events_human?: boolean
  signalHeatmap?: boolean

  militaryAir?: boolean
  militaryNavy?: boolean
  tanks?: boolean
  militaryDrones?: boolean

  aviationRoutes?: boolean
  shipRoutes?: boolean
  fishing?: boolean
  containers?: boolean
  vehicles?: boolean
  drones?: boolean

  biodiversity?: boolean
}

interface Props {
  map: MapLibreMap | null
  enabled: V3Enabled
  /** Current map viewport bbox [w, s, e, n]. Optional. */
  bbox?: [number, number, number, number]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapReady(map: MapLibreMap): boolean {
  return !!(map && (map as any).style && typeof map.getSource === "function")
}

/** Add (or no-op) an empty GeoJSON source. */
function ensureSource(map: MapLibreMap, id: string) {
  if (!mapReady(map) || map.getSource(id)) return
  map.addSource(id, { type: "geojson", data: { type: "FeatureCollection", features: [] }, generateId: true })
}

function ensureCircleLayer(map: MapLibreMap, id: string, source: string, paint: any) {
  if (!mapReady(map) || map.getLayer(id)) return
  try { map.addLayer({ id, type: "circle", source, paint, layout: { visibility: "visible" } }) } catch { /* ignore */ }
}

function ensureHeatmapLayer(map: MapLibreMap, id: string, source: string, paint: any) {
  if (!mapReady(map) || map.getLayer(id)) return
  try { map.addLayer({ id, type: "heatmap", source, paint, layout: { visibility: "visible" } }) } catch { /* ignore */ }
}

// Apr 21, 2026 (Morgan: "ALL NO FLY ZONE AND POLLUTION AND ANY GRID
// NEEDS TO BE SELECTABLE AND HAVE LABELS"). Shared helper to tack a
// text label layer onto the same source as a circle layer. Each label
// defaults to minzoom 10 so world view isn't cluttered.
function ensureSymbolLabel(
  map: MapLibreMap,
  id: string,
  source: string,
  opts: { textFields: any; color?: string; halo?: string; minzoom?: number },
) {
  if (!mapReady(map) || map.getLayer(id)) return
  try {
    map.addLayer({
      id, type: "symbol", source,
      minzoom: opts.minzoom ?? 10,
      layout: {
        "text-field": opts.textFields,
        "text-size": ["interpolate", ["linear"], ["zoom"], 10, 9, 14, 12],
        "text-offset": [0, 0.9],
        "text-anchor": "top",
        "text-allow-overlap": false,
        "text-optional": true,
        "visibility": "visible",
      } as any,
      paint: {
        "text-color": opts.color ?? "#ffffff",
        "text-halo-color": opts.halo ?? "rgba(0,0,0,0.85)",
        "text-halo-width": 1.3,
      },
    })
  } catch { /* ignore */ }
}

function setVisibility(map: MapLibreMap, id: string, visible: boolean) {
  if (!mapReady(map) || !map.getLayer(id)) return
  try { map.setLayoutProperty(id, "visibility", visible ? "visible" : "none") } catch { /* ignore */ }
}

function setData(map: MapLibreMap, id: string, fc: any) {
  try {
    const src = map.getSource(id) as any
    if (src?.setData) src.setData(fc)
  } catch { /* ignore */ }
}

function wireClick(map: MapLibreMap, layerId: string, type: string, fallbackName: string) {
  try {
    if ((wireClick as any)._bound?.has(layerId)) return
    if (!(wireClick as any)._bound) (wireClick as any)._bound = new Set<string>()
    ;(wireClick as any)._bound.add(layerId)
    map.on("click", layerId, (e: any) => {
      const f = e.features?.[0]
      if (!f) return
      const p = f.properties || {}
      const coords = e.lngLat
      try {
        const hook = (window as any).__crep_selectAsset
        if (typeof hook === "function") hook({
          type,
          id: p.id || f.id,
          name: p.name || p.n || p.NAME || fallbackName,
          lat: coords?.lat ?? 0, lng: coords?.lng ?? 0,
          properties: p,
        })
      } catch { /* ignore */ }
    })
    map.on("mouseenter", layerId, () => { map.getCanvas().style.cursor = "pointer" })
    map.on("mouseleave", layerId, () => { map.getCanvas().style.cursor = "" })
  } catch { /* ignore */ }
}

// ─── Fetchers ───────────────────────────────────────────────────────────────

// Apr 19, 2026 (Morgan QA: "all of the natural events filters non work none
// change map except for earthquakes"). Root cause: V3Overlays was fetching
// from /api/oei/{earthquakes,volcanoes,wildfires,storms,lightning,tornadoes}
// — none of those routes exist (404). Only earthquakes rendered because they
// come through a separate pipeline (/api/natureos/global-events + EventMarker
// layer in CREPDashboardClient).
//
// Fix: fetch /api/natureos/global-events ONCE per refresh, distribute its
// events to each enabled-typed layer by `type` match. Singular API types
// (earthquake / volcano / wildfire / storm) map to plural filter keys. For
// types the API doesn't cover (lightning / tornado) the layer stays empty
// but the filter toggle still controls visibility.
let _globalEventsCache: { ts: number; events: any[] } = { ts: 0, events: [] }
async function fetchAllGlobalEvents(): Promise<any[]> {
  const CACHE_MS = 60_000
  const now = Date.now()
  if (now - _globalEventsCache.ts < CACHE_MS && _globalEventsCache.events.length > 0) {
    return _globalEventsCache.events
  }
  try {
    const r = await fetch("/api/natureos/global-events?limit=10000", {
      signal: AbortSignal.timeout(15_000),
    })
    if (!r.ok) return _globalEventsCache.events
    const j = await r.json()
    const events = j?.events || []
    _globalEventsCache = { ts: now, events }
    return events
  } catch {
    return _globalEventsCache.events
  }
}

async function fetchEventsByType(kind: "earthquakes" | "volcanoes" | "wildfires" | "storms" | "lightning" | "tornadoes") {
  // API types are SINGULAR (earthquake/volcano/wildfire/storm). Map plural
  // filter keys to the set of API type strings they should claim.
  const typeMap: Record<string, string[]> = {
    earthquakes: ["earthquake"],
    volcanoes: ["volcano"],
    wildfires: ["wildfire", "fire"],
    storms: ["storm", "hurricane", "cyclone"],
    lightning: ["lightning"],
    tornadoes: ["tornado"],
  }
  const wantTypes = new Set(typeMap[kind] || [])
  const events = await fetchAllGlobalEvents()
  return events
    .filter((e: any) => {
      const t = (e.type || e.category || "").toLowerCase()
      return wantTypes.has(t)
    })
    .map((e: any) => ({
      id: e.id,
      lat: e.location?.latitude ?? e.lat,
      lng: e.location?.longitude ?? e.lng,
      name: e.title || e.name,
      magnitude: e.magnitude,
      severity: e.severity,
      timestamp: e.timestamp,
      source: e.source,
    }))
}

async function fetchOSMByTag(bbox: [number, number, number, number], amenity: string) {
  const [w, s, e, n] = bbox
  const q = `[out:json][timeout:30];(node["amenity"="${amenity}"](${s},${w},${n},${e});way["amenity"="${amenity}"](${s},${w},${n},${e}););out center 3000;`
  try {
    const r = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`, {
      signal: AbortSignal.timeout(30_000),
    })
    if (!r.ok) return []
    const j = await r.json()
    return (j.elements || []).map((el: any) => ({
      id: `osm-${el.type}-${el.id}`,
      lat: el.lat ?? el.center?.lat,
      lng: el.lon ?? el.center?.lon,
      name: el.tags?.name || el.tags?.operator || null,
      tags: el.tags,
    })).filter((x: any) => typeof x.lat === "number" && typeof x.lng === "number")
  } catch { return [] }
}

async function fetchOSMIndustrial(bbox: [number, number, number, number], kind: "oilGas" | "methaneSources" | "metalOutput" | "waterPollution") {
  const [w, s, e, n] = bbox
  const query: Record<string, string> = {
    oilGas: `node["man_made"~"pipeline|petroleum_well|pump"](${s},${w},${n},${e});way["industrial"~"oil|gas|refinery"](${s},${w},${n},${e});`,
    methaneSources: `node["industrial"~"landfill|sewage|biogas"](${s},${w},${n},${e});way["landuse"="landfill"](${s},${w},${n},${e});`,
    metalOutput: `node["industrial"~"mine|smelter|metallurgy"](${s},${w},${n},${e});way["landuse"="quarry"](${s},${w},${n},${e});`,
    waterPollution: `node["man_made"~"wastewater_plant|sewer"](${s},${w},${n},${e});node["industrial"="water_treatment"](${s},${w},${n},${e});`,
  }
  const q = `[out:json][timeout:30];(${query[kind]});out center 2000;`
  try {
    const r = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`, {
      signal: AbortSignal.timeout(30_000),
    })
    if (!r.ok) return []
    const j = await r.json()
    return (j.elements || []).map((el: any) => ({
      id: `osm-${el.type}-${el.id}`,
      lat: el.lat ?? el.center?.lat,
      lng: el.lon ?? el.center?.lon,
      name: el.tags?.name || el.tags?.operator || null,
      tags: el.tags,
    })).filter((x: any) => typeof x.lat === "number" && typeof x.lng === "number")
  } catch { return [] }
}

function pointsToFC(points: any[], extraProps?: (p: any) => Record<string, any>) {
  const features = points
    .filter((p) => typeof p.lat === "number" && typeof p.lng === "number")
    .map((p) => ({
      type: "Feature" as const,
      properties: { id: p.id, name: p.name, ...(p.tags || {}), ...(extraProps?.(p) || {}) },
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
    }))
  return { type: "FeatureCollection" as const, features }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function V3Overlays({ map, enabled, bbox }: Props) {
  const setupRef = useRef(false)

  // One-shot setup: add sources + layers for every layer we cover.
  useEffect(() => {
    if (!map || !mapReady(map) || setupRef.current) return
    setupRef.current = true

    // EVENTS — timed circle layers, severity-colored
    for (const k of ["earthquakes", "volcanoes", "wildfires", "storms", "lightning", "tornadoes"] as const) {
      ensureSource(map, `crep-${k}`)
      const colorMap: Record<string, string> = {
        earthquakes: "#b45309",
        volcanoes: "#f97316",
        wildfires: "#dc2626",
        storms: "#6366f1",
        lightning: "#facc15",
        tornadoes: "#7c3aed",
      }
      ensureCircleLayer(map, `crep-${k}-dot`, `crep-${k}`, {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2, 6, 4, 10, 7, 14, 11],
        "circle-color": colorMap[k],
        "circle-opacity": 0.85,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-opacity": 0.6,
      })
      wireClick(map, `crep-${k}-dot`, k.replace(/s$/, ""), `${k[0].toUpperCase()}${k.slice(1)}`)
    }

    // FACILITIES — OSM, muted crosses/stars
    ensureSource(map, "crep-hospitals")
    ensureCircleLayer(map, "crep-hospitals-dot", "crep-hospitals", {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2.5, 10, 4.5, 14, 7],
      "circle-color": "#ec4899",
      "circle-opacity": 0.8,
      "circle-stroke-width": 0.8,
      "circle-stroke-color": "#fdf2f8",
    })
    wireClick(map, "crep-hospitals-dot", "hospital", "Hospital")

    ensureSource(map, "crep-firestations")
    ensureCircleLayer(map, "crep-firestations-dot", "crep-firestations", {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2.5, 10, 4.5, 14, 7],
      "circle-color": "#ef4444",
      "circle-opacity": 0.8,
      "circle-stroke-width": 0.8,
      "circle-stroke-color": "#ffffff",
    })
    wireClick(map, "crep-firestations-dot", "fire_station", "Fire Station")

    ensureSource(map, "crep-universities")
    ensureCircleLayer(map, "crep-universities-dot", "crep-universities", {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2.5, 10, 4.5, 14, 7],
      "circle-color": "#6d28d9",
      "circle-opacity": 0.75,
      "circle-stroke-width": 0.8,
      "circle-stroke-color": "#ede9fe",
    })
    wireClick(map, "crep-universities-dot", "university", "University")

    // POLLUTION — OSM industrial tagged
    for (const k of ["oilGas", "methaneSources", "metalOutput", "waterPollution"] as const) {
      const id = `crep-${k.toLowerCase()}`
      ensureSource(map, id)
      const colorMap: Record<string, string> = {
        oilGas: "#78350f",
        methaneSources: "#dc2626",
        metalOutput: "#a16207",
        waterPollution: "#0284c7",
      }
      const labelColor: Record<string, string> = {
        oilGas: "#fed7aa",
        methaneSources: "#fecaca",
        metalOutput: "#fde68a",
        waterPollution: "#bae6fd",
      }
      const prefix: Record<string, string> = {
        oilGas: "OIL/GAS",
        methaneSources: "CH₄",
        metalOutput: "METAL/MINING",
        waterPollution: "WATER POLLUTION",
      }
      ensureCircleLayer(map, `${id}-dot`, id, {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 1.8, 8, 3, 12, 5, 16, 8],
        "circle-color": colorMap[k],
        "circle-opacity": 0.7,
        "circle-stroke-width": 0.5,
        "circle-stroke-color": "#ffffff",
      })
      // Apr 21, 2026: add label per pollution marker.
      ensureSymbolLabel(map, `${id}-label`, id, {
        textFields: ["concat", prefix[k], "  ·  ", ["coalesce", ["get", "name"], ["get", "tags.name"], ""]],
        color: labelColor[k],
        halo: "rgba(0,0,0,0.85)",
        minzoom: 11,
      })
      wireClick(map, `${id}-dot`, k, k)
    }

    // HEATMAPS — population, humanMovement, events_human, signalHeatmap
    for (const k of ["population", "humanMovement", "events_human", "signalHeatmap"] as const) {
      const id = `crep-${k.toLowerCase()}`
      ensureSource(map, id)
      const ramp: Record<string, any[]> = {
        population: ["rgba(0,0,0,0)", "rgba(59,130,246,0.25)", "rgba(99,102,241,0.5)", "rgba(168,85,247,0.7)", "rgba(236,72,153,0.9)"],
        humanMovement: ["rgba(0,0,0,0)", "rgba(99,102,241,0.25)", "rgba(139,92,246,0.5)", "rgba(168,85,247,0.8)"],
        events_human: ["rgba(0,0,0,0)", "rgba(139,92,246,0.3)", "rgba(168,85,247,0.6)", "rgba(236,72,153,0.85)"],
        signalHeatmap: ["rgba(0,0,0,0)", "rgba(168,85,247,0.25)", "rgba(168,85,247,0.55)", "rgba(236,72,153,0.8)"],
      }
      ensureHeatmapLayer(map, `${id}-heat`, id, {
        "heatmap-weight": 1,
        "heatmap-intensity": 0.7,
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 4, 8, 8, 16],
        "heatmap-opacity": 0.6,
        "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"],
          0, ramp[k][0], 0.2, ramp[k][1], 0.5, ramp[k][2], 0.85, ramp[k][3] || ramp[k][ramp[k].length - 1], 1.0, ramp[k][ramp[k].length - 1],
        ],
      })
    }

    // MILITARY SUB-TYPES — derived from window.__crep_aircraft/__crep_vessels
    for (const k of ["militaryAir", "militaryNavy", "tanks", "militaryDrones"] as const) {
      const id = `crep-${k.toLowerCase()}`
      ensureSource(map, id)
      const colorMap: Record<string, string> = {
        militaryAir: "#f59e0b",
        militaryNavy: "#eab308",
        tanks: "#d97706",
        militaryDrones: "#fbbf24",
      }
      ensureCircleLayer(map, `${id}-dot`, id, {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2, 6, 3.5, 10, 5, 14, 8],
        "circle-color": colorMap[k],
        "circle-opacity": 0.9,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#111827",
        "circle-stroke-opacity": 0.7,
      })
      wireClick(map, `${id}-dot`, k, k)
    }

    // TRANSPORT SUB-TYPES — fishing/containers/vehicles/drones
    for (const k of ["fishing", "containers", "vehicles", "drones"] as const) {
      const id = `crep-${k}`
      ensureSource(map, id)
      const colorMap: Record<string, string> = {
        fishing: "#22d3ee",
        containers: "#06b6d4",
        vehicles: "#f59e0b",
        drones: "#a855f7",
      }
      ensureCircleLayer(map, `${id}-dot`, id, {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 1.5, 6, 2.5, 10, 4, 14, 6],
        "circle-color": colorMap[k],
        "circle-opacity": 0.85,
        "circle-stroke-width": 0.6,
        "circle-stroke-color": "#ffffff",
      })
      wireClick(map, `${id}-dot`, k.replace(/s$/, ""), k)
    }

    // TRAJECTORIES — line layers from aircraft/vessel lastKnownRef trails
    ensureSource(map, "crep-aviation-routes")
    if (!map.getLayer("crep-aviation-routes-line")) {
      map.addLayer({
        id: "crep-aviation-routes-line", type: "line", source: "crep-aviation-routes",
        paint: { "line-color": "#38bdf8", "line-width": 0.8, "line-opacity": 0.55, "line-blur": 0.2 },
      })
    }
    ensureSource(map, "crep-ship-routes")
    if (!map.getLayer("crep-ship-routes-line")) {
      map.addLayer({
        id: "crep-ship-routes-line", type: "line", source: "crep-ship-routes",
        paint: { "line-color": "#2dd4bf", "line-width": 0.8, "line-opacity": 0.55, "line-blur": 0.2 },
      })
    }

    // BIODIVERSITY — GBIF-style heatmap
    ensureSource(map, "crep-biodiversity")
    ensureHeatmapLayer(map, "crep-biodiversity-heat", "crep-biodiversity", {
      "heatmap-weight": 1,
      "heatmap-intensity": 0.9,
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 4, 10, 8, 22],
      "heatmap-opacity": 0.55,
      "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"],
        0, "rgba(0,0,0,0)",
        0.2, "rgba(34,197,94,0.3)",
        0.5, "rgba(132,204,22,0.6)",
        0.85, "rgba(250,204,21,0.85)",
        1.0, "rgba(239,68,68,0.95)",
      ],
    })

    console.log("[V3Overlays] sources + layers attached (empty until fetchers complete)")
  }, [map])

  // Visibility sync — flip any layer on/off when its toggle changes.
  useEffect(() => {
    if (!map) return
    const flip = (lid: string, on: boolean) => setVisibility(map, lid, on)
    flip("crep-earthquakes-dot", !!enabled.earthquakes)
    flip("crep-volcanoes-dot", !!enabled.volcanoes)
    flip("crep-wildfires-dot", !!enabled.wildfires)
    flip("crep-storms-dot", !!enabled.storms)
    flip("crep-lightning-dot", !!enabled.lightning)
    flip("crep-tornadoes-dot", !!enabled.tornadoes)
    flip("crep-hospitals-dot", !!enabled.hospitals)
    flip("crep-firestations-dot", !!enabled.fireStations)
    flip("crep-universities-dot", !!enabled.universities)
    flip("crep-oilgas-dot", !!enabled.oilGas)
    flip("crep-oilgas-label", !!enabled.oilGas)
    flip("crep-methanesources-dot", !!enabled.methaneSources)
    flip("crep-methanesources-label", !!enabled.methaneSources)
    flip("crep-metaloutput-dot", !!enabled.metalOutput)
    flip("crep-metaloutput-label", !!enabled.metalOutput)
    flip("crep-waterpollution-dot", !!enabled.waterPollution)
    flip("crep-waterpollution-label", !!enabled.waterPollution)
    flip("crep-population-heat", !!enabled.population)
    flip("crep-humanmovement-heat", !!enabled.humanMovement)
    flip("crep-events_human-heat", !!enabled.events_human)
    flip("crep-signalheatmap-heat", !!enabled.signalHeatmap)
    flip("crep-militaryair-dot", !!enabled.militaryAir)
    flip("crep-militarynavy-dot", !!enabled.militaryNavy)
    flip("crep-tanks-dot", !!enabled.tanks)
    flip("crep-militarydrones-dot", !!enabled.militaryDrones)
    flip("crep-aviation-routes-line", !!enabled.aviationRoutes)
    flip("crep-ship-routes-line", !!enabled.shipRoutes)
    flip("crep-fishing-dot", !!enabled.fishing)
    flip("crep-containers-dot", !!enabled.containers)
    flip("crep-vehicles-dot", !!enabled.vehicles)
    flip("crep-drones-dot", !!enabled.drones)
    flip("crep-biodiversity-heat", !!enabled.biodiversity)
  }, [map, enabled])

  // EVENT fetchers — poll every 60 s when enabled.
  useEffect(() => {
    if (!map) return
    const timers: any[] = []
    const kinds: Array<["earthquakes" | "volcanoes" | "wildfires" | "storms" | "lightning" | "tornadoes", boolean]> = [
      ["earthquakes", !!enabled.earthquakes],
      ["volcanoes", !!enabled.volcanoes],
      ["wildfires", !!enabled.wildfires],
      ["storms", !!enabled.storms],
      ["lightning", !!enabled.lightning],
      ["tornadoes", !!enabled.tornadoes],
    ]
    for (const [kind, on] of kinds) {
      if (!on) continue
      const fetchPaint = async () => {
        // Apr 20, 2026 perf: skip the fetch when the tab is backgrounded.
        // Events tick every 60 s; no point hitting USGS/FIRMS/HPWREN while
        // the user is on another tab. Next interval runs when they return.
        if (typeof document !== "undefined" && document.hidden) return
        const items = await fetchEventsByType(kind)
        const fc = pointsToFC(items.map((x: any) => ({
          id: x.id || x.code,
          lat: x.lat ?? x.latitude ?? x.geometry?.coordinates?.[1],
          lng: x.lng ?? x.longitude ?? x.geometry?.coordinates?.[0],
          name: x.name || x.title || `${kind} event`,
          tags: x,
        })))
        setData(map, `crep-${kind}`, fc)
      }
      fetchPaint()
      timers.push(setInterval(fetchPaint, 60_000))
    }
    return () => timers.forEach((t) => clearInterval(t))
  }, [map, enabled.earthquakes, enabled.volcanoes, enabled.wildfires, enabled.storms, enabled.lightning, enabled.tornadoes])

  // FACILITIES (OSM) — fetch when bbox is set + zoom is high enough.
  // Apr 19, 2026 (Morgan QA: hospitals/fireStations/universities toggles
  // not responding). Lowered zoom floor from 5 → 3 so a viewport roughly
  // the size of the continental US triggers fetches. Overpass can still
  // time out for huge bboxes (hence the 30 s timeout in fetchOSMByTag),
  // but the UX feedback now exists even at continental zoom.
  useEffect(() => {
    if (!map || !bbox) return
    const hospitals = enabled.hospitals
    const fires = enabled.fireStations
    const unis = enabled.universities
    if (!hospitals && !fires && !unis) return
    const zoom = map.getZoom()
    if (zoom < 3) return // avoid flooding Overpass at pure world view
    ;(async () => {
      if (hospitals) setData(map, "crep-hospitals", pointsToFC(await fetchOSMByTag(bbox, "hospital")))
      if (fires) setData(map, "crep-firestations", pointsToFC(await fetchOSMByTag(bbox, "fire_station")))
      if (unis) setData(map, "crep-universities", pointsToFC(await fetchOSMByTag(bbox, "university")))
    })()
  }, [map, bbox, enabled.hospitals, enabled.fireStations, enabled.universities])

  // POLLUTION (OSM) — zoom floor 3 (not 6) so continental view triggers
  // queries. Morgan QA: "Pollution & Industry filters do nothing show
  // nothing have no data".
  useEffect(() => {
    if (!map || !bbox) return
    const any = enabled.oilGas || enabled.methaneSources || enabled.metalOutput || enabled.waterPollution
    if (!any || map.getZoom() < 3) return
    ;(async () => {
      if (enabled.oilGas) setData(map, "crep-oilgas", pointsToFC(await fetchOSMIndustrial(bbox, "oilGas")))
      if (enabled.methaneSources) setData(map, "crep-methanesources", pointsToFC(await fetchOSMIndustrial(bbox, "methaneSources")))
      if (enabled.metalOutput) setData(map, "crep-metaloutput", pointsToFC(await fetchOSMIndustrial(bbox, "metalOutput")))
      if (enabled.waterPollution) setData(map, "crep-waterpollution", pointsToFC(await fetchOSMIndustrial(bbox, "waterPollution")))
    })()
  }, [map, bbox, enabled.oilGas, enabled.methaneSources, enabled.metalOutput, enabled.waterPollution])

  // MILITARY SUB-TYPES — derive from existing aircraft/vessel data every 30 s.
  useEffect(() => {
    if (!map) return
    if (!enabled.militaryAir && !enabled.militaryNavy && !enabled.tanks && !enabled.militaryDrones) return
    const militaryCallsignPrefixes = new RegExp("^(RCH|REACH|DUKE|EVAC|HURLB|SPAR|AWACS|GAF|IAM|NAF|NAVY|HAF|BAF|RAAF|VADER|HOSS|SHADE|SNIPER|GOTHIC|BUZZ|SLAM|AARDVARK|STINK)", "i")
    const militaryShipOperators = /navy|coast guard|military|uscg|usn|royal navy|marine nationale/i
    const droneCallsigns = /^(FORTE|RANGER|PREDATOR|REAPER|GLOBAL HAWK|GRAY EAGLE|HERON|MALE|HUNTER)/i
    const tick = () => {
      // Apr 20, 2026 perf: only derive military snapshots while tab is
      // visible. Reading window.__crep_aircraft / __crep_vessels is cheap
      // but building 2 FCs + setData across 2 MapLibre sources on every
      // 30 s tick is wasted work when nobody's watching.
      if (typeof document !== "undefined" && document.hidden) return
      const acs = (window as any).__crep_aircraft as any[] | undefined
      const vs = (window as any).__crep_vessels as any[] | undefined
      if (enabled.militaryAir && Array.isArray(acs)) {
        const filtered = acs.filter((a) => militaryCallsignPrefixes.test(a.callsign || "") || (a.source === "adsb.lol" && a.mlat)).map((a) => ({
          id: a.id, lat: a.lat, lng: a.lng, name: a.callsign || a.icao, tags: { callsign: a.callsign, altitude: a.altitude, source: a.source },
        }))
        setData(map, "crep-militaryair", pointsToFC(filtered))
      }
      if (enabled.militaryDrones && Array.isArray(acs)) {
        const filtered = acs.filter((a) => droneCallsigns.test(a.callsign || "")).map((a) => ({
          id: a.id, lat: a.lat, lng: a.lng, name: a.callsign, tags: { type: "drone", callsign: a.callsign, altitude: a.altitude },
        }))
        setData(map, "crep-militarydrones", pointsToFC(filtered))
      }
      if (enabled.militaryNavy && Array.isArray(vs)) {
        const filtered = vs.filter((v) => militaryShipOperators.test(v.operator || "") || militaryShipOperators.test(v.name || "")).map((v) => ({
          id: v.id, lat: v.lat, lng: v.lng, name: v.name || v.mmsi, tags: { operator: v.operator, mmsi: v.mmsi },
        }))
        setData(map, "crep-militarynavy", pointsToFC(filtered))
      }
      // Tanks: OSM military=tank_trap / hardstanding — too niche, start empty
    }
    tick()
    const poll = setInterval(tick, 30_000)
    return () => clearInterval(poll)
  }, [map, enabled.militaryAir, enabled.militaryNavy, enabled.tanks, enabled.militaryDrones])

  // BIODIVERSITY — GBIF-density heatmap (best-effort)
  useEffect(() => {
    if (!map || !enabled.biodiversity || !bbox) return
    if (map.getZoom() < 3) return
    ;(async () => {
      try {
        const [w, s, e, n] = bbox
        const url = `https://api.gbif.org/v1/occurrence/search?limit=300&hasCoordinate=true&decimalLatitude=${s},${n}&decimalLongitude=${w},${e}`
        const r = await fetch(url, { signal: AbortSignal.timeout(12_000) })
        if (!r.ok) return
        const j = await r.json()
        const features = (j.results || []).filter((x: any) => x.decimalLatitude != null && x.decimalLongitude != null).map((x: any) => ({
          type: "Feature" as const,
          properties: { id: x.key, name: x.species || x.scientificName, taxa: x.taxonKey },
          geometry: { type: "Point" as const, coordinates: [x.decimalLongitude, x.decimalLatitude] },
        }))
        setData(map, "crep-biodiversity", { type: "FeatureCollection" as const, features })
      } catch { /* ignore */ }
    })()
  }, [map, bbox, enabled.biodiversity])

  return null
}
