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
 *   • facilities: hospitals, fireStations, universities, policeStations,
 *     libraries, civicFacilities — OSM Overpass
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

import { useEffect, useMemo, useRef, useState } from "react"
import type { Map as MapLibreMap } from "maplibre-gl"

export interface V3Enabled {
  earthquakes?: boolean
  volcanoes?: boolean
  wildfires?: boolean
  storms?: boolean
  floods?: boolean
  lightning?: boolean
  tornadoes?: boolean

  hospitals?: boolean
  fireStations?: boolean
  universities?: boolean
  policeStations?: boolean
  libraries?: boolean
  civicFacilities?: boolean

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
  /** Facilities already resolved by viewport-intel/MINDEX/hints. */
  facilities?: ViewportOverlayFacility[]
}

type FacilityKind = "hospital" | "fire_station" | "university" | "police" | "library" | "civic"

type ViewportOverlayFacility = {
  id?: string
  name?: string
  type?: string
  lat?: number
  lng?: number
  latitude?: number
  longitude?: number
  agency?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  description?: string
  source?: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapReady(map: MapLibreMap): boolean {
  try {
    return !!(
      map &&
      (map as any).style &&
      typeof map.getSource === "function" &&
      typeof map.addSource === "function" &&
      typeof map.addLayer === "function" &&
      (typeof (map as any).isStyleLoaded !== "function" || (map as any).isStyleLoaded())
    )
  } catch {
    return false
  }
}

/** Add (or no-op) an empty GeoJSON source. */
function ensureSource(map: MapLibreMap, id: string) {
  try {
    if (!mapReady(map) || map.getSource(id)) return
    map.addSource(id, { type: "geojson", data: { type: "FeatureCollection", features: [] }, generateId: true })
  } catch {
    /* style can churn during dev hot reload; retry on the next render */
  }
}

function ensureCircleLayer(map: MapLibreMap, id: string, source: string, paint: any, opts?: { minzoom?: number }) {
  if (!mapReady(map) || map.getLayer(id)) return
  try { map.addLayer({ id, type: "circle", source, paint, minzoom: opts?.minzoom, layout: { visibility: "visible" } } as any) } catch { /* ignore */ }
}

function ensureHeatmapLayer(map: MapLibreMap, id: string, source: string, paint: any) {
  if (!mapReady(map) || map.getLayer(id)) return
  try { map.addLayer({ id, type: "heatmap", source, paint, layout: { visibility: "visible" } }) } catch { /* ignore */ }
}

function ensureLineLayer(map: MapLibreMap, id: string, source: string, paint: any) {
  if (!mapReady(map) || map.getLayer(id)) return
  try { map.addLayer({ id, type: "line", source, paint, layout: { visibility: "visible" } }) } catch { /* ignore */ }
}

const FACILITY_ICON_IMAGES: Record<FacilityKind, string> = {
  hospital: "crep-icon-hospital",
  fire_station: "crep-icon-fire-station",
  university: "crep-icon-university",
  police: "crep-icon-police",
  library: "crep-icon-library",
  civic: "crep-icon-civic",
}

function facilityIconImage(kind: FacilityKind): ImageData | null {
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
  } else if (kind === "university") {
    ctx.beginPath()
    ctx.moveTo(7, 18)
    ctx.lineTo(24, 9)
    ctx.lineTo(41, 18)
    ctx.lineTo(24, 27)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = "#ffffff"
    ctx.beginPath()
    ctx.moveTo(14, 26)
    ctx.lineTo(14, 35)
    ctx.lineTo(34, 35)
    ctx.lineTo(34, 26)
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.moveTo(8, 17)
    ctx.lineTo(24, 8)
    ctx.lineTo(40, 17)
    ctx.closePath()
    ctx.fill()
    for (const x of [13, 21, 29, 37]) {
      ctx.fillRect(x - 2, 19, 4, 16)
    }
    ctx.fillRect(8, 37, 32, 4)
  }
  return ctx.getImageData(0, 0, 48, 48)
}

function ensureFacilityIconImages(map: MapLibreMap) {
  for (const kind of Object.keys(FACILITY_ICON_IMAGES) as FacilityKind[]) {
    const id = FACILITY_ICON_IMAGES[kind]
    try {
      if ((map as any).hasImage?.(id)) continue
      const image = facilityIconImage(kind)
      if (image) map.addImage(id, image, { pixelRatio: 2 } as any)
    } catch {
      /* icon can be re-added after style reload */
    }
  }
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

function ensureSymbolIconLayer(
  map: MapLibreMap,
  id: string,
  source: string,
  opts?: { minzoom?: number },
) {
  if (!mapReady(map) || map.getLayer(id)) return
  ensureFacilityIconImages(map)
  try {
    map.addLayer({
      id,
      type: "symbol",
      source,
      minzoom: opts?.minzoom ?? 10,
      layout: {
        "icon-image": ["coalesce", ["get", "icon_image"], FACILITY_ICON_IMAGES.civic],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 9, 0.46, 12, 0.58, 16, 0.78],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "text-optional": true,
        "visibility": "visible",
      } as any,
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
let _globalEventsInFlight: Promise<any[]> | null = null
const EVENT_DISPLAY_WINDOW_MS = 72 * 60 * 60 * 1000
const BIODIVERSITY_HOTSPOT_MIN_ZOOM = 3
const FACILITY_ICON_MIN_ZOOM = 9
const FACILITY_OSM_FETCH_MIN_ZOOM = 10
const FACILITY_OSM_MAX_POINTS_PER_KIND = 900
const FACILITY_GLYPHS: Record<FacilityKind, string> = {
  hospital: "🏥",
  fire_station: "🚒",
  university: "🎓",
  police: "🚔",
  library: "📚",
  civic: "🏛️",
}

function eventTimestampMs(event: any): number {
  const value = event?.timestamp ?? event?.time ?? event?.updatedAt ?? event?.properties?.time
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

async function fetchAllGlobalEvents(): Promise<any[]> {
  const CACHE_MS = 60_000
  const now = Date.now()
  if (now - _globalEventsCache.ts < CACHE_MS && _globalEventsCache.events.length > 0) {
    return _globalEventsCache.events
  }
  if (_globalEventsInFlight) return _globalEventsInFlight
  _globalEventsInFlight = (async () => {
    try {
      const isTabletViewport =
        typeof window !== "undefined" &&
        (window.innerWidth <= 1180 || window.matchMedia?.("(pointer: coarse)")?.matches)
      const limit = isTabletViewport ? 280 : 420
      const r = await fetch(`/api/natureos/global-events?days=3&limit=${limit}`, {
        signal: AbortSignal.timeout(isTabletViewport ? 5_000 : 10_000),
      })
      if (!r.ok) return _globalEventsCache.events
      const j = await r.json()
      const cutoff = Date.now() - EVENT_DISPLAY_WINDOW_MS
      const events = (j?.events || []).filter((event: any) => {
        const t = eventTimestampMs(event)
        return t > 0 && t >= cutoff
      })
      _globalEventsCache = { ts: now, events }
      return events
    } catch {
      return _globalEventsCache.events
    } finally {
      _globalEventsInFlight = null
    }
  })()
  return _globalEventsInFlight
}

async function fetchEventsByType(kind: "earthquakes" | "volcanoes" | "wildfires" | "storms" | "floods" | "lightning" | "tornadoes") {
  // API types are SINGULAR (earthquake/volcano/wildfire/storm). Map plural
  // filter keys to the set of API type strings they should claim.
  const typeMap: Record<string, string[]> = {
    earthquakes: ["earthquake"],
    volcanoes: ["volcano"],
    wildfires: ["wildfire", "fire"],
    storms: ["storm", "hurricane", "typhoon", "cyclone", "blizzard", "heatwave", "coldwave", "air_quality", "drought"],
    floods: ["flood", "tsunami", "landslide"],
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

function osmAddress(tags: Record<string, any> | undefined): string | undefined {
  if (!tags) return undefined
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ").trim()
  const city = tags["addr:city"]
  const state = tags["addr:state"]
  const postcode = tags["addr:postcode"]
  return [street, city, state, postcode].filter(Boolean).join(", ") || undefined
}

function facilityQueryFragment(kind: "hospital" | "fire_station" | "university" | "police" | "library" | "civic") {
  const byAmenity = (amenity: string) => `
        node["amenity"="${amenity}"]({BBOX});
        way["amenity"="${amenity}"]({BBOX});
        relation["amenity"="${amenity}"]({BBOX});`
  switch (kind) {
    case "hospital":
      return `${byAmenity("hospital")}
        node["amenity"="clinic"]({BBOX});
        way["amenity"="clinic"]({BBOX});
        node["healthcare"="hospital"]({BBOX});
        way["healthcare"="hospital"]({BBOX});`
    case "fire_station":
      return byAmenity("fire_station")
    case "university":
      return `${byAmenity("university")}
        node["amenity"="college"]({BBOX});
        way["amenity"="college"]({BBOX});`
    case "police":
      return byAmenity("police")
    case "library":
      return byAmenity("library")
    case "civic":
      return `${byAmenity("townhall")}
        node["office"="government"]({BBOX});
        way["office"="government"]({BBOX});
        relation["office"="government"]({BBOX});
        node["amenity"="courthouse"]({BBOX});
        way["amenity"="courthouse"]({BBOX});
        relation["amenity"="courthouse"]({BBOX});`
  }
}

async function fetchOSMFacility(bbox: [number, number, number, number], kind: FacilityKind, signal?: AbortSignal) {
  const [w, s, e, n] = bbox
  const bboxText = `${s},${w},${n},${e}`
  const fragment = facilityQueryFragment(kind).replace(/\{BBOX\}/g, bboxText)
  const q = `[out:json][timeout:6];(${fragment});out center 1200;`
  try {
    const r = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`, {
      signal: signal ?? AbortSignal.timeout(6_000),
    })
    if (!r.ok) return []
    const j = await r.json()
    return (j.elements || []).map((el: any) => ({
      id: `osm-${el.type}-${el.id}`,
      lat: el.lat ?? el.center?.lat,
      lng: el.lon ?? el.center?.lon,
      name: el.tags?.name || el.tags?.operator || null,
      tags: {
        ...(el.tags || {}),
        address: osmAddress(el.tags),
        facility_type: kind,
        glyph: FACILITY_GLYPHS[kind],
        icon_image: FACILITY_ICON_IMAGES[kind],
        source: "osm-overpass",
      },
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

function classifyViewportFacility(facility: ViewportOverlayFacility): FacilityKind | null {
  const text = [
    facility.type,
    facility.name,
    facility.agency,
    facility.address,
    facility.description,
    facility.source,
  ].filter(Boolean).join(" ").toLowerCase()
  if (/\blibrary\b|biblioteca|bibliotheque|bibliothek/.test(text)) return "library"
  if (/\bfire\s+(station|department|rescue)\b|fire-rescue|\bfirehouse\b/.test(text)) return "fire_station"
  if (/\bpolice\b|sheriff|law enforcement|public safety/.test(text)) return "police"
  if (/\bhospital\b|medical center|urgent care|health clinic|\bclinic\b/.test(text)) return "hospital"
  if (/university|college|campus|\bschool\b/.test(text)) return "university"
  if (/city hall|town hall|courthouse|government|civic|municipal|county|port of entry|border|customs|cbp|ibwc/.test(text)) return "civic"
  return null
}

function viewportFacilityToPoint(facility: ViewportOverlayFacility, kind: FacilityKind) {
  const lat = typeof facility.lat === "number" ? facility.lat : facility.latitude
  const lng = typeof facility.lng === "number" ? facility.lng : facility.longitude
  if (typeof lat !== "number" || typeof lng !== "number") return null
  const name = facility.name || facility.agency || kind.replace("_", " ")
  return {
    id: facility.id || `viewport-${kind}-${lat.toFixed(5)}-${lng.toFixed(5)}-${name}`,
    lat,
    lng,
    name,
    tags: {
      address: facility.address,
      agency: facility.agency,
      description: facility.description,
      email: facility.email,
      facility_type: kind,
      glyph: FACILITY_GLYPHS[kind],
      icon_image: FACILITY_ICON_IMAGES[kind],
      phone: facility.phone,
      source: facility.source || "viewport-intel",
      website: facility.website,
    },
  }
}

function mergePointsByIdentity(...groups: any[][]) {
  const merged: any[] = []
  const seen = new Set<string>()
  for (const group of groups) {
    for (const point of group || []) {
      if (typeof point?.lat !== "number" || typeof point?.lng !== "number") continue
      const key = String(point.id || `${point.lat.toFixed(5)}:${point.lng.toFixed(5)}:${point.name || ""}`).toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(point)
    }
  }
  return merged
}

function compactBboxKey(bbox: [number, number, number, number]) {
  return bbox.map((value) => value.toFixed(3)).join(",")
}

function isEarthSimulatorRoute() {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/natureos/earth-simulator")
}

function capFacilityPoints(points: any[]) {
  return points.length > FACILITY_OSM_MAX_POINTS_PER_KIND
    ? points.slice(0, FACILITY_OSM_MAX_POINTS_PER_KIND)
    : points
}

// ─── Component ──────────────────────────────────────────────────────────────

const REQUIRED_V3_SETUP_SOURCES = [
  "crep-earthquakes",
  "crep-hospitals",
  "crep-firestations",
  "crep-universities",
  "crep-policestations",
  "crep-libraries",
  "crep-civicfacilities",
] as const

// The LAST layer the one-shot setup adds. isStyleLoaded() can flip false partway
// through the synchronous setup (sprite/tile churn on first load), which makes the
// trailing ensure* calls silently no-op — leaving biodiversity, signal/population/
// movement heatmaps, mover trajectories, military + transport sub-types, and the
// pollution layers permanently uncreated. The old completion check validated only
// REQUIRED_V3_SETUP_SOURCES (all created early), so setupRef stayed true and never
// retried. Verifying this terminal layer forces a retry until setup truly finishes.
// (Jun 12, 2026 fix.)
const V3_SETUP_TERMINAL_LAYER = "crep-biodiversity-heat"

export default function V3Overlays({ map, enabled, bbox, facilities = [] }: Props) {
  const setupRef = useRef(false)
  const lastBiodiversityDataRef = useRef<any>(null)
  const facilityOsmCacheRef = useRef<Map<string, any[]>>(new Map())
  const [styleReadyTick, setStyleReadyTick] = useState(0)
  const [mapZoom, setMapZoom] = useState(0)
  const viewportFacilityGroups = useMemo(() => {
    const groups: Record<FacilityKind, any[]> = {
      hospital: [],
      fire_station: [],
      university: [],
      police: [],
      library: [],
      civic: [],
    }
    for (const facility of facilities) {
      const kind = classifyViewportFacility(facility)
      if (!kind) continue
      const point = viewportFacilityToPoint(facility, kind)
      if (point) groups[kind].push(point)
    }
    return groups
  }, [facilities])

  useEffect(() => {
    if (!map) return

    let frame: number | null = null
    const bump = () => {
      if (frame != null) window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        if (!mapReady(map)) return
        const setupComplete = setupRef.current
          && REQUIRED_V3_SETUP_SOURCES.every((id) => map.getSource(id))
          && !!map.getLayer(V3_SETUP_TERMINAL_LAYER)
        if (setupComplete) return
        setStyleReadyTick((value) => value + 1)
      })
    }
    const resetAndBump = () => {
      setupRef.current = false
      bump()
    }

    bump()
    map.on("load", resetAndBump)
    map.on("style.load", resetAndBump)
    map.on("styledata", bump)

    return () => {
      if (frame != null) window.cancelAnimationFrame(frame)
      try { map.off("load", resetAndBump) } catch { /* map can be gone during HMR */ }
      try { map.off("style.load", resetAndBump) } catch { /* map can be gone during HMR */ }
      try { map.off("styledata", bump) } catch { /* map can be gone during HMR */ }
    }
  }, [map])

  useEffect(() => {
    if (!map) return

    let frame: number | null = null
    const syncZoom = () => {
      if (frame != null) window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        try {
          const next = typeof map.getZoom === "function" ? map.getZoom() : 0
          setMapZoom((previous) => Math.abs(previous - next) > 0.05 ? next : previous)
        } catch { /* map can be gone during HMR */ }
      })
    }

    syncZoom()
    map.on("zoomend", syncZoom)
    map.on("moveend", syncZoom)

    return () => {
      if (frame != null) window.cancelAnimationFrame(frame)
      try { map.off("zoomend", syncZoom) } catch { /* map can be gone during HMR */ }
      try { map.off("moveend", syncZoom) } catch { /* map can be gone during HMR */ }
    }
  }, [map])

  // One-shot setup: add sources + layers for every layer we cover.
  useEffect(() => {
    if (!map || !mapReady(map) || setupRef.current) return
    setupRef.current = true

    // EVENTS — timed circle layers, severity-colored
    for (const k of ["earthquakes", "volcanoes", "wildfires", "storms", "floods", "lightning", "tornadoes"] as const) {
      ensureSource(map, `crep-${k}`)
      const colorMap: Record<string, string> = {
        earthquakes: "#b45309",
        volcanoes: "#f97316",
        wildfires: "#dc2626",
        storms: "#6366f1",
        floods: "#0284c7",
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
    }, { minzoom: FACILITY_ICON_MIN_ZOOM })
    ensureSymbolIconLayer(map, "crep-hospitals-icon", "crep-hospitals", { minzoom: FACILITY_ICON_MIN_ZOOM })
    wireClick(map, "crep-hospitals-dot", "hospital", "Hospital")
    wireClick(map, "crep-hospitals-icon", "hospital", "Hospital")

    ensureSource(map, "crep-firestations")
    ensureCircleLayer(map, "crep-firestations-dot", "crep-firestations", {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2.5, 10, 4.5, 14, 7],
      "circle-color": "#ef4444",
      "circle-opacity": 0.8,
      "circle-stroke-width": 0.8,
      "circle-stroke-color": "#ffffff",
    }, { minzoom: FACILITY_ICON_MIN_ZOOM })
    ensureSymbolIconLayer(map, "crep-firestations-icon", "crep-firestations", { minzoom: FACILITY_ICON_MIN_ZOOM })
    wireClick(map, "crep-firestations-dot", "fire_station", "Fire Station")
    wireClick(map, "crep-firestations-icon", "fire_station", "Fire Station")

    ensureSource(map, "crep-universities")
    ensureCircleLayer(map, "crep-universities-dot", "crep-universities", {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2.5, 10, 4.5, 14, 7],
      "circle-color": "#6d28d9",
      "circle-opacity": 0.75,
      "circle-stroke-width": 0.8,
      "circle-stroke-color": "#ede9fe",
    }, { minzoom: FACILITY_ICON_MIN_ZOOM })
    ensureSymbolIconLayer(map, "crep-universities-icon", "crep-universities", { minzoom: FACILITY_ICON_MIN_ZOOM })
    wireClick(map, "crep-universities-dot", "university", "University")
    wireClick(map, "crep-universities-icon", "university", "University")

    ensureSource(map, "crep-policestations")
    ensureCircleLayer(map, "crep-policestations-dot", "crep-policestations", {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2.5, 10, 4.5, 14, 7],
      "circle-color": "#38bdf8",
      "circle-opacity": 0.78,
      "circle-stroke-width": 0.8,
      "circle-stroke-color": "#e0f2fe",
    }, { minzoom: FACILITY_ICON_MIN_ZOOM })
    ensureSymbolIconLayer(map, "crep-policestations-icon", "crep-policestations", { minzoom: FACILITY_ICON_MIN_ZOOM })
    wireClick(map, "crep-policestations-dot", "police", "Police Station")
    wireClick(map, "crep-policestations-icon", "police", "Police Station")

    ensureSource(map, "crep-libraries")
    ensureCircleLayer(map, "crep-libraries-dot", "crep-libraries", {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2.5, 10, 4.5, 14, 7],
      "circle-color": "#facc15",
      "circle-opacity": 0.78,
      "circle-stroke-width": 0.8,
      "circle-stroke-color": "#fef9c3",
    }, { minzoom: FACILITY_ICON_MIN_ZOOM })
    ensureSymbolIconLayer(map, "crep-libraries-icon", "crep-libraries", { minzoom: FACILITY_ICON_MIN_ZOOM })
    wireClick(map, "crep-libraries-dot", "library", "Library")
    wireClick(map, "crep-libraries-icon", "library", "Library")

    ensureSource(map, "crep-civicfacilities")
    ensureCircleLayer(map, "crep-civicfacilities-dot", "crep-civicfacilities", {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 5, 14, 8],
      "circle-color": "#14b8a6",
      "circle-opacity": 0.82,
      "circle-stroke-width": 1,
      "circle-stroke-color": "#ccfbf1",
    }, { minzoom: FACILITY_ICON_MIN_ZOOM })
    ensureSymbolIconLayer(map, "crep-civicfacilities-icon", "crep-civicfacilities", { minzoom: FACILITY_ICON_MIN_ZOOM })
    wireClick(map, "crep-civicfacilities-dot", "civic", "Civic Facility")
    wireClick(map, "crep-civicfacilities-icon", "civic", "Civic Facility")

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
    ensureLineLayer(map, "crep-aviation-routes-line", "crep-aviation-routes", {
      "line-color": "#38bdf8",
      "line-width": 0.8,
      "line-opacity": 0.55,
      "line-blur": 0.2,
    })
    ensureSource(map, "crep-ship-routes")
    ensureLineLayer(map, "crep-ship-routes-line", "crep-ship-routes", {
      "line-color": "#2dd4bf",
      "line-width": 0.8,
      "line-opacity": 0.55,
      "line-blur": 0.2,
    })

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
    if (lastBiodiversityDataRef.current) setData(map, "crep-biodiversity", lastBiodiversityDataRef.current)

    const missingSetupSources = REQUIRED_V3_SETUP_SOURCES.filter((id) => !map.getSource(id))
    const terminalLayerMissing = !map.getLayer(V3_SETUP_TERMINAL_LAYER)
    if (missingSetupSources.length > 0 || terminalLayerMissing) {
      setupRef.current = false
      window.setTimeout(() => setStyleReadyTick((value) => value + 1), 200)
    }
  }, [map, styleReadyTick])

  // Visibility sync — flip any layer on/off when its toggle changes.
  useEffect(() => {
    if (!map || !mapReady(map)) return
    const flip = (lid: string, on: boolean) => setVisibility(map, lid, on)
    // Events are rendered as icon-widget DOM markers (<EventMarker> in
    // CREPDashboardClient) — the canonical representation with icon, popup and
    // fly-to. These V3 plain-circle dots duplicated every event (the "second
    // earthquake icon" / bare USGS dot Morgan saw), so keep them permanently
    // hidden. The sources still exist for any future low-cost fallback use.
    // (Jun 12, 2026)
    flip("crep-earthquakes-dot", false)
    flip("crep-volcanoes-dot", false)
    flip("crep-wildfires-dot", false)
    flip("crep-storms-dot", false)
    flip("crep-floods-dot", false)
    flip("crep-lightning-dot", false)
    flip("crep-tornadoes-dot", false)
    const zoom = mapZoom || (typeof map.getZoom === "function" ? map.getZoom() : 0)
    const showFacilities = zoom >= FACILITY_ICON_MIN_ZOOM
    flip("crep-hospitals-dot", !!enabled.hospitals && showFacilities)
    flip("crep-hospitals-icon", !!enabled.hospitals && showFacilities)
    flip("crep-firestations-dot", !!enabled.fireStations && showFacilities)
    flip("crep-firestations-icon", !!enabled.fireStations && showFacilities)
    flip("crep-universities-dot", !!enabled.universities && showFacilities)
    flip("crep-universities-icon", !!enabled.universities && showFacilities)
    flip("crep-policestations-dot", !!enabled.policeStations && showFacilities)
    flip("crep-policestations-icon", !!enabled.policeStations && showFacilities)
    flip("crep-libraries-dot", !!enabled.libraries && showFacilities)
    flip("crep-libraries-icon", !!enabled.libraries && showFacilities)
    flip("crep-civicfacilities-dot", !!enabled.civicFacilities && showFacilities)
    flip("crep-civicfacilities-icon", !!enabled.civicFacilities && showFacilities)
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
    flip("crep-biodiversity-heat", !!enabled.biodiversity && zoom >= BIODIVERSITY_HOTSPOT_MIN_ZOOM)
  }, [map, enabled, styleReadyTick, mapZoom])

  // EVENT fetchers — poll every 60 s when enabled.
  useEffect(() => {
    if (!map) return
    const timers: any[] = []
    const kinds: Array<["earthquakes" | "volcanoes" | "wildfires" | "storms" | "floods" | "lightning" | "tornadoes", boolean]> = [
      ["earthquakes", !!enabled.earthquakes],
      ["volcanoes", !!enabled.volcanoes],
      ["wildfires", !!enabled.wildfires],
      ["storms", !!enabled.storms],
      ["floods", !!enabled.floods],
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
  }, [map, enabled.earthquakes, enabled.volcanoes, enabled.wildfires, enabled.storms, enabled.floods, enabled.lightning, enabled.tornadoes])

  // Viewport-intel/MINDEX facilities are already scoped to the active city.
  // Paint them immediately so civic/public-safety icons do not wait on
  // best-effort Overpass fetches.
  useEffect(() => {
    if (!map || !mapReady(map) || facilities.length === 0) return
    const zoom = mapZoom || (typeof map.getZoom === "function" ? map.getZoom() : 0)
    if (zoom < FACILITY_ICON_MIN_ZOOM) return
    const paintFacility = (sourceId: string, points: any[]) => {
      if (points.length > 0) setData(map, sourceId, pointsToFC(points))
    }
    if (enabled.hospitals && viewportFacilityGroups.hospital.length > 0) {
      paintFacility("crep-hospitals", viewportFacilityGroups.hospital)
    }
    if (enabled.fireStations && viewportFacilityGroups.fire_station.length > 0) {
      paintFacility("crep-firestations", viewportFacilityGroups.fire_station)
    }
    if (enabled.universities && viewportFacilityGroups.university.length > 0) {
      paintFacility("crep-universities", viewportFacilityGroups.university)
    }
    if (enabled.policeStations && viewportFacilityGroups.police.length > 0) {
      paintFacility("crep-policestations", viewportFacilityGroups.police)
    }
    if (enabled.libraries && viewportFacilityGroups.library.length > 0) {
      paintFacility("crep-libraries", viewportFacilityGroups.library)
    }
    if (enabled.civicFacilities && viewportFacilityGroups.civic.length > 0) {
      paintFacility("crep-civicfacilities", viewportFacilityGroups.civic)
    }
  }, [
    map,
    styleReadyTick,
    mapZoom,
    facilities.length,
    viewportFacilityGroups,
    enabled.hospitals,
    enabled.fireStations,
    enabled.universities,
    enabled.policeStations,
    enabled.libraries,
    enabled.civicFacilities,
  ])

  // FACILITIES (OSM) — fetch when bbox is set + zoom is high enough.
  // Apr 19, 2026 (Morgan QA: hospitals/fireStations/universities toggles
  // not responding). Lowered zoom floor from 5 → 3 so a viewport roughly
  // the size of the continental US triggers fetches. Overpass can still
  // time out for huge bboxes (hence the 30 s timeout in fetchOSMFacility),
  // but the UX feedback now exists even at continental zoom.
  useEffect(() => {
    if (!map || !bbox) return
    if (isEarthSimulatorRoute()) return
    type FacilityTask = {
      enabled: boolean
      kind: FacilityKind
      sourceId: string
      viewport: any[]
    }
    const facilityTasks = ([
      { enabled: !!enabled.hospitals, kind: "hospital", sourceId: "crep-hospitals", viewport: viewportFacilityGroups.hospital },
      { enabled: !!enabled.fireStations, kind: "fire_station", sourceId: "crep-firestations", viewport: viewportFacilityGroups.fire_station },
      { enabled: !!enabled.universities, kind: "university", sourceId: "crep-universities", viewport: viewportFacilityGroups.university },
      { enabled: !!enabled.policeStations, kind: "police", sourceId: "crep-policestations", viewport: viewportFacilityGroups.police },
      { enabled: !!enabled.libraries, kind: "library", sourceId: "crep-libraries", viewport: viewportFacilityGroups.library },
      { enabled: !!enabled.civicFacilities, kind: "civic", sourceId: "crep-civicfacilities", viewport: viewportFacilityGroups.civic },
    ] satisfies FacilityTask[]).filter((task): task is FacilityTask => task.enabled)
    if (facilityTasks.length === 0) return
    const zoom = map.getZoom()
    if (zoom < FACILITY_OSM_FETCH_MIN_ZOOM) return // viewport-intel paints immediately; Overpass enriches at city scale
    const requestBbox = bbox.join(",")
    const cacheBbox = compactBboxKey(bbox)
    let active = true
    const abortController = new AbortController()
    const timer = window.setTimeout(() => {
      ;(async () => {
      const results = await Promise.all(facilityTasks.map(async (task) => {
        const cacheKey = `${task.kind}:${cacheBbox}`
        let osm = facilityOsmCacheRef.current.get(cacheKey)
        if (!osm) {
          osm = capFacilityPoints(await fetchOSMFacility(bbox, task.kind, abortController.signal))
          if (!active || abortController.signal.aborted) return { ...task, points: capFacilityPoints(task.viewport) }
          facilityOsmCacheRef.current.set(cacheKey, osm)
          if (facilityOsmCacheRef.current.size > 96) {
            const firstKey = facilityOsmCacheRef.current.keys().next().value
            if (firstKey) facilityOsmCacheRef.current.delete(firstKey)
          }
        }
        return { ...task, points: capFacilityPoints(mergePointsByIdentity(task.viewport, osm)) }
      }))
      if (!active || abortController.signal.aborted || !mapReady(map)) return
      const currentBbox = bbox.join(",")
      const currentZoom = typeof map.getZoom === "function" ? map.getZoom() : 0
      if (currentBbox !== requestBbox || currentZoom < FACILITY_OSM_FETCH_MIN_ZOOM) return
      for (const result of results) {
        if (result.points.length > 0) setData(map, result.sourceId, pointsToFC(result.points))
      }
      })()
    }, 350)
    return () => {
      active = false
      abortController.abort()
      window.clearTimeout(timer)
    }
  }, [map, bbox, viewportFacilityGroups, enabled.hospitals, enabled.fireStations, enabled.universities, enabled.policeStations, enabled.libraries, enabled.civicFacilities])

  // POLLUTION (OSM) — zoom floor 3 (not 6) so continental view triggers
  // queries. Morgan QA: "Pollution & Industry filters do nothing show
  // nothing have no data".
  useEffect(() => {
    if (!map || !bbox) return
    if (isEarthSimulatorRoute()) return
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
    const zoom = mapZoom || (typeof map.getZoom === "function" ? map.getZoom() : 0)
    if (zoom < BIODIVERSITY_HOTSPOT_MIN_ZOOM) {
      const empty = { type: "FeatureCollection" as const, features: [] }
      lastBiodiversityDataRef.current = empty
      setData(map, "crep-biodiversity", empty)
      return
    }
    const controller = new AbortController()
    ;(async () => {
      try {
        const url = `/api/crep/biodiversity-hotspots?bbox=${encodeURIComponent(bbox.join(","))}&limit=650`
        const r = await fetch(url, { signal: controller.signal })
        if (!r.ok) return
        const j = await r.json()
        const data = { type: "FeatureCollection" as const, features: Array.isArray(j?.features) ? j.features : [] }
        lastBiodiversityDataRef.current = data
        setData(map, "crep-biodiversity", data)
      } catch { /* ignore */ }
    })()
    return () => controller.abort()
  }, [map, bbox, enabled.biodiversity, mapZoom])

  return null
}
