"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react"
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson"
import type { GeoJSONSource, Map as MlMap, MapMouseEvent } from "maplibre-gl"
import bbox from "@turf/bbox"
import booleanPointInPolygon from "@turf/boolean-point-in-polygon"
import { point } from "@turf/helpers"
import { X, Anchor, Radio, Waves, Ship, Compass } from "lucide-react"

import { Map as PsathyrellaDeploymentMap, MapControls, useMap } from "@/components/ui/map"
import { cn } from "@/lib/utils"

const DARK_NO_LABELS =
  "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json"

const SRC = {
  land: "psathyrella-m-land",
  cables: "psathyrella-m-cables",
  vessels: "psathyrella-m-vessels",
  navy: "psathyrella-m-navy",
  buoys: "psathyrella-m-buoys",
} as const

const LAYER = {
  landFill: "psathyrella-m-land-fill",
  landOutline: "psathyrella-m-land-outline",
  cables: "psathyrella-m-cables-line",
  cablesHit: "psathyrella-m-cables-hit",
  vessels: "psathyrella-m-vessels-circle",
  navy: "psathyrella-m-navy-circle",
  buoys: "psathyrella-m-buoys-circle",
  /** Invisible wider circles — same GeoJSON as buoys; makes dense demos clickable */
  buoysHit: "psathyrella-m-buoys-hit",
} as const

/** Pick priority: buoy hit-slab > navy > vessels > cable hit-slab (semantic buoy layer id stays LAYER.buoys) */
const CLICK_LAYERS = [LAYER.buoysHit, LAYER.navy, LAYER.vessels, LAYER.cablesHit] as const
/**
 * Hover cursor only — excludes buoysHit (1000+ features); querying it on every mousemove blocks the main thread
 * and slows the rest of the page (including links). Buoys remain fully clickable via CLICK_LAYERS on click.
 */
const HOVER_CURSOR_LAYERS = [LAYER.navy, LAYER.vessels, LAYER.cablesHit] as const

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] }

/** Maritime exercise theaters — labels only; positions come from ocean-only boxes below */
interface DemoTheaterMeta {
  id: string
  label: string
}

const DEMO_THEATERS: DemoTheaterMeta[] = [
  { id: "iran-hormuz", label: "Persian Gulf / Strait of Hormuz" },
  { id: "black-sea", label: "Black Sea (maritime periphery)" },
  { id: "taiwan-strait", label: "Taiwan Strait / northern SCS" },
  { id: "peninsula-seas", label: "Yellow Sea / East Sea" },
  { id: "venezuela-carib", label: "Southern Caribbean / Venezuela offshore" },
]

/** Axis-aligned boxes biased to open water (demo visualization — not chart datum). */
interface OceanBox {
  south: number
  north: number
  west: number
  east: number
}

/**
 * Fallback when Natural Earth land GeoJSON failed to load — coarse boxes only.
 */
const LAND_REJECT_BOXES: OceanBox[] = [
  { south: 22.15, north: 25.85, west: 119.65, east: 122.35 },
  { south: 33.6, north: 43.2, west: 124.35, east: 131.55 },
  { south: 23.6, north: 27.2, west: 51.85, east: 56.95 },
  { south: 24.2, north: 28.85, west: 48.25, east: 51.35 },
  { south: 41.65, north: 46.85, west: 29.25, east: 41.85 },
  { south: 8.25, north: 13.25, west: -67.35, east: -60.25 },
  { south: 17.35, north: 20.25, west: -67.85, east: -61.65 },
  { south: -11.2, north: 6.2, west: -81.2, east: -76.35 },
  { south: 24.55, north: 26.65, west: 50.05, east: 52.15 },
]

function pointInOceanBox(lat: number, lng: number, box: OceanBox): boolean {
  return lat >= box.south && lat <= box.north && lng >= box.west && lng <= box.east
}

function pointInOceanBoxes(lat: number, lng: number, boxes: OceanBox[]): boolean {
  return boxes.some((b) => pointInOceanBox(lat, lng, b))
}

function isRejectedLand(lat: number, lng: number): boolean {
  return LAND_REJECT_BOXES.some((b) => pointInOceanBox(lat, lng, b))
}

interface LandIndexedFeature {
  feature: Feature<Polygon | MultiPolygon>
  bbox: [number, number, number, number]
}

function indexLandFeatures(fc: FeatureCollection): LandIndexedFeature[] {
  const out: LandIndexedFeature[] = []
  for (const f of fc.features) {
    const g = f.geometry
    if (!g) continue
    if (g.type !== "Polygon" && g.type !== "MultiPolygon") continue
    const b = bbox(f as Feature) as [number, number, number, number]
    out.push({ feature: f as Feature<Polygon | MultiPolygon>, bbox: b })
  }
  return out
}

function pointOnLand(lng: number, lat: number, indexed: LandIndexedFeature[]): boolean {
  if (!indexed.length) return false
  const pt = point([lng, lat])
  for (const { feature, bbox: bb } of indexed) {
    const [w, s, e, n] = bb
    if (lng < w || lng > e || lat < s || lat > n) continue
    if (booleanPointInPolygon(pt, feature)) return true
  }
  return false
}

function isSampleOnLand(lat: number, lng: number, landIndexed: LandIndexedFeature[]): boolean {
  if (landIndexed.length > 0) return pointOnLand(lng, lat, landIndexed)
  return isRejectedLand(lat, lng)
}

/** Expanded hunt regions for submarine cables intersecting contested theaters. */
const THEATER_CABLE_HUNT: Record<string, OceanBox> = {
  "iran-hormuz": { south: 24.2, north: 30.8, west: 50.8, east: 61.2 },
  "black-sea": { south: 40.8, north: 47.2, west: 27, east: 42 },
  "taiwan-strait": { south: 20.8, north: 27.2, west: 116.5, east: 125.5 },
  "peninsula-seas": { south: 33.5, north: 42.5, west: 123.5, east: 139 },
  "venezuela-carib": { south: 9.5, north: 18.5, west: -73, east: -60.5 },
}

/** Demo mooring: ≤ ~1 statute foot of motion per 30 s (slow creep, no cable “sprints”). */
const DEMO_FOOT_KM = 0.3048 / 1000
const DEMO_KM_PER_MS_ALONG_CABLE = DEMO_FOOT_KM / 30000

/** Demo telemetry — apparent GPS speed ~1 ft / 30 s (m/s). */
const DEMO_GPS_SPEED_MS = 0.3048 / 30

/** Ocean-heavy sub-regions — fallback when no cable geometry in theater. */
const THEATER_OCEAN_BOXES: Record<string, OceanBox[]> = {
  "iran-hormuz": [
    { south: 25.65, north: 27.95, west: 52.35, east: 56.45 },
    { south: 26.65, north: 29.45, west: 56.05, east: 59.85 },
  ],
  "black-sea": [
    { south: 41.95, north: 43.95, west: 31.35, east: 34.85 },
    { south: 42.55, north: 44.55, west: 34.95, east: 37.55 },
  ],
  "taiwan-strait": [
    { south: 23.35, north: 24.95, west: 118.05, east: 119.55 },
    { south: 24.85, north: 26.35, west: 120.75, east: 122.35 },
  ],
  "peninsula-seas": [
    { south: 36.25, north: 38.85, west: 129.85, east: 133.55 },
    { south: 38.65, north: 41.05, west: 133.85, east: 136.95 },
  ],
  "venezuela-carib": [
    { south: 14.65, north: 16.95, west: -66.85, east: -63.75 },
    { south: 12.05, north: 14.05, west: -67.95, east: -65.35 },
  ],
}

const DEMO_BUOY_TOTAL = 1000
const DEMO_REFRESH_INTERVAL_MS = DEMO_BUOY_TOTAL > 2000 ? 2200 : 1600
/**
 * Legacy identifier — some dev/HMR bundles still reference this after the theater/global split was removed.
 * Demo placement uses `buildDemoCablePatrolNodes` only; value is unused but must exist to avoid ReferenceError.
 */
const DEMO_THEATER_BUOY_FRACTION = 1

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function sampleLatLngInOceanBox(box: OceanBox, rnd: () => number): { lat: number; lng: number } {
  return {
    lat: box.south + rnd() * (box.north - box.south),
    lng: box.west + rnd() * (box.east - box.west),
  }
}

function sampleLatLngOceanOnly(
  box: OceanBox,
  rnd: () => number,
  landIndexed: LandIndexedFeature[],
): { lat: number; lng: number } {
  for (let attempt = 0; attempt < 56; attempt++) {
    const p = sampleLatLngInOceanBox(box, rnd)
    if (!isSampleOnLand(p.lat, p.lng, landIndexed)) return p
  }
  const midLat = (box.south + box.north) / 2
  const midLng = (box.west + box.east) / 2
  for (let j = 0; j < 28; j++) {
    const p = {
      lat: midLat + (rnd() - 0.5) * (box.north - box.south) * 0.88,
      lng: midLng + (rnd() - 0.5) * (box.east - box.west) * 0.88,
    }
    if (!isSampleOnLand(p.lat, p.lng, landIndexed)) return p
  }
  return { lat: midLat, lng: midLng }
}

function hashSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** MapLibre / Web Mercator safe latitude band (avoids singularities & dropped symbols). */
const MAP_LAT_LIMIT = 85

/**
 * Clamp finite lat/lng so symbols stay inside MapLibre-safe Web Mercator range.
 */
function clampLngLat(lat: number, lng: number): { lat: number; lng: number } {
  const clat = Math.min(Math.max(lat, -MAP_LAT_LIMIT), MAP_LAT_LIMIT)
  let clng = lng
  if (clng > 180 || clng < -180) clng = ((((clng + 180) % 360) + 360) % 360) - 180
  return { lat: clat, lng: clng }
}

/** Drop invalid API coordinates; clamp the rest so layers never ingest NaN/∞. */
function safeMapPoint(lat: number, lng: number): { lat: number; lng: number } | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return clampLngLat(lat, lng)
}

/** Bounds covering all cable-demo theaters — initial frame so every demo asset is on-screen. */
const DEMO_THEATER_VIEW_BOUNDS: [[number, number], [number, number]] = (() => {
  let south = Infinity
  let north = -Infinity
  let west = Infinity
  let east = -Infinity
  for (const b of Object.values(THEATER_CABLE_HUNT)) {
    south = Math.min(south, b.south)
    north = Math.max(north, b.north)
    west = Math.min(west, b.west)
    east = Math.max(east, b.east)
  }
  const pad = 2.8
  return [
    [west - pad, south - pad],
    [east + pad, north + pad],
  ]
})()

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toR = (d: number) => (d * Math.PI) / 180
  const dLat = toR(lat2 - lat1)
  const dLng = toR(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

interface DemoCablePatrolPath {
  coords: [number, number][]
}

interface DemoBuoyNode {
  id: string
  title: string
  base: { lat: number; lng: number }
  theaterId: string
  /** Index into paths array for theater; -1 = ocean fallback drift */
  pathIndex: number
  sKm: number
  offsetNm: number
  seed: number
}

function lineBboxIntersectsBox(coords: [number, number][], box: OceanBox): boolean {
  let w = Infinity
  let s = Infinity
  let e = -Infinity
  let n = -Infinity
  for (const [lng, lat] of coords) {
    w = Math.min(w, lng)
    s = Math.min(s, lat)
    e = Math.max(e, lng)
    n = Math.max(n, lat)
  }
  return !(e < box.west || w > box.east || n < box.south || s > box.north)
}

function extractCablePathsForTheater(fc: FeatureCollection, hunt: OceanBox): DemoCablePatrolPath[] {
  const out: DemoCablePatrolPath[] = []
  for (const f of fc.features) {
    const g = f.geometry
    if (!g) continue
    if (g.type === "LineString") {
      const coords = g.coordinates as [number, number][]
      if (coords.length < 2) continue
      if (!lineBboxIntersectsBox(coords, hunt)) continue
      out.push({ coords })
    } else if (g.type === "MultiLineString") {
      for (const line of g.coordinates as [number, number][][]) {
        if (line.length < 2) continue
        if (!lineBboxIntersectsBox(line, hunt)) continue
        out.push({ coords: line })
      }
    }
  }
  return out
}

function pathLengthKm(coords: [number, number][]): number {
  let sum = 0
  for (let i = 1; i < coords.length; i++) {
    const [lng0, lat0] = coords[i - 1]
    const [lng1, lat1] = coords[i]
    sum += haversineKm(lat0, lng0, lat1, lng1)
  }
  return sum
}

function bearingGreatCircleDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

function interpolateAlongPath(
  coords: [number, number][],
  distKm: number,
): { lat: number; lng: number; bearingDeg: number } {
  let remaining = Math.max(0, distKm)
  if (coords.length < 2) {
    const [lng, lat] = coords[0]
    return { lat, lng, bearingDeg: 0 }
  }
  for (let i = 1; i < coords.length; i++) {
    const [lng0, lat0] = coords[i - 1]
    const [lng1, lat1] = coords[i]
    const segKm = haversineKm(lat0, lng0, lat1, lng1)
    if (remaining <= segKm || i === coords.length - 1) {
      const t = segKm > 1e-9 ? Math.min(1, remaining / segKm) : 0
      const lat = lat0 + t * (lat1 - lat0)
      const lng = lng0 + t * (lng1 - lng0)
      const bearingDeg = bearingGreatCircleDeg(lat0, lng0, lat1, lng1)
      return { lat, lng, bearingDeg }
    }
    remaining -= segKm
  }
  const [lngL, latL] = coords[coords.length - 1]
  const [lngP, latP] = coords[coords.length - 2]
  return { lat: latL, lng: lngL, bearingDeg: bearingGreatCircleDeg(latP, lngP, latL, lngL) }
}

function offsetPerpendicularKm(
  lat: number,
  lng: number,
  trackBearingDeg: number,
  offsetKm: number,
  sign: 1 | -1,
): { lat: number; lng: number } {
  const brng = ((trackBearingDeg + 90 * sign) * Math.PI) / 180
  const δ = offsetKm / 6371
  const φ1 = (lat * Math.PI) / 180
  const λ1 = (lng * Math.PI) / 180
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(brng))
  const λ2 =
    λ1 + Math.atan2(Math.sin(brng) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2))
  let lngOut = (λ2 * 180) / Math.PI
  lngOut = ((lngOut + 540) % 360) - 180
  return { lat: (φ2 * 180) / Math.PI, lng: lngOut }
}

function waterPositionAlongCable(
  coords: [number, number][],
  distKm: number,
  offsetNm: number,
  landIndexed: LandIndexedFeature[],
): { lat: number; lng: number } | null {
  const inner = interpolateAlongPath(coords, distKm)
  const nmTry = [offsetNm, -offsetNm, offsetNm * 0.55, -offsetNm * 0.55, 0]
  for (const nm of nmTry) {
    const km = Math.abs(nm) * 1.852
    if (km < 1e-6) {
      if (!isSampleOnLand(inner.lat, inner.lng, landIndexed)) return { lat: inner.lat, lng: inner.lng }
      continue
    }
    const sign: 1 | -1 = nm >= 0 ? 1 : -1
    const o = offsetPerpendicularKm(inner.lat, inner.lng, inner.bearingDeg, km, sign)
    if (!isSampleOnLand(o.lat, o.lng, landIndexed)) return o
  }
  return null
}

/**
 * Demo placement: at least one mooring per cable path (not an evenly spaced parade along routes),
 * dense clusters in theater ocean boxes (many neighbors km-scale apart is allowed), remainder ocean fill.
 */
function placeBuoysClusteredNearCables(
  meta: DemoTheaterMeta,
  paths: DemoCablePatrolPath[],
  lens: number[],
  hunt: OceanBox,
  quota: number,
  landIndexed: LandIndexedFeature[],
  startUid: number,
): { placed: DemoBuoyNode[]; nextUid: number } {
  const placed: DemoBuoyNode[] = []
  let uid = startUid
  const boxes = THEATER_OCEAN_BOXES[meta.id]
  const boxList = boxes?.length ? boxes : [hunt]

  if (!paths.length) {
    for (let i = 0; i < quota; i++) {
      uid += 1
      const id = `demo-${meta.id}-oc-${uid}`
      const rnd = mulberry32(hashSeed(id))
      const box = boxList[Math.floor(rnd() * boxList.length)] ?? hunt
      const { lat, lng } = sampleLatLngOceanOnly(box, rnd, landIndexed)
      placed.push({
        id,
        title: `(demo) Psathyrella — ${meta.label} · ocean`,
        base: { lat, lng },
        theaterId: meta.id,
        pathIndex: -1,
        sKm: 0,
        offsetNm: 0,
        seed: hashSeed(id),
      })
    }
    return { placed, nextUid: uid }
  }

  let count = 0
  const pathIndices = paths.map((_, i) => i).sort((a, b) => lens[b] - lens[a])
  const shuffleR = mulberry32(hashSeed(`${meta.id}-shuffle-${startUid}`))
  for (let i = pathIndices.length - 1; i > 0; i--) {
    const j = Math.floor(shuffleR() * (i + 1))
    ;[pathIndices[i], pathIndices[j]] = [pathIndices[j], pathIndices[i]]
  }

  for (const pi of pathIndices) {
    if (count >= quota) break
    const coords = paths[pi].coords
    const plen = lens[pi]
    if (plen < 1e-6) continue

    const rnd = mulberry32(hashSeed(`${meta.id}-cab-${pi}-${startUid}`))
    let wp: { lat: number; lng: number } | null = null
    let d = 0
    let offsetNm = 0
    for (let tries = 0; tries < 18 && !wp; tries++) {
      d = (0.06 + rnd() * 0.88) * plen
      offsetNm = (rnd() < 0.5 ? -1 : 1) * (1.1 + rnd() * 2.6)
      wp = waterPositionAlongCable(coords, d, offsetNm, landIndexed)
    }
    if (!wp) continue

    uid += 1
    const id = `demo-${meta.id}-${uid}`
    const seed = hashSeed(id)
    placed.push({
      id,
      title: `(demo) Psathyrella — ${meta.label} · cable watch`,
      base: { lat: wp.lat, lng: wp.lng },
      theaterId: meta.id,
      pathIndex: pi,
      sKm: d,
      offsetNm,
      seed,
    })
    count++
  }

  let guard = 0
  const maxGuard = quota * 100
  while (count < quota && guard < maxGuard) {
    guard++
    uid += 1
    const id = `demo-${meta.id}-cl-${uid}`
    const rnd = mulberry32(hashSeed(id))
    const box = boxList[Math.floor(rnd() * boxList.length)] ?? hunt
    const anchor = sampleLatLngOceanOnly(box, rnd, landIndexed)
    let lat = anchor.lat
    let lng = anchor.lng

    if (rnd() < 0.78) {
      const u = rnd()
      const v = rnd()
      const clusterKm = u * u * 16 + v * v * 9 + rnd() * rnd() * 22
      const ang = rnd() * Math.PI * 2
      const cosLat = Math.max(0.22, Math.cos(anchor.lat * (Math.PI / 180)))
      lat += (clusterKm / 111) * Math.cos(ang)
      lng += (clusterKm / (111 * cosLat)) * Math.sin(ang)
    }

    if (!pointInOceanBoxes(lat, lng, boxList)) continue
    if (landIndexed.length > 0 && pointOnLand(lng, lat, landIndexed)) continue
    if (!landIndexed.length && isRejectedLand(lat, lng)) continue

    const seed = hashSeed(id)
    placed.push({
      id,
      title: `(demo) Psathyrella — ${meta.label} · cluster`,
      base: { lat, lng },
      theaterId: meta.id,
      pathIndex: -1,
      sKm: 0,
      offsetNm: 0,
      seed,
    })
    count++
  }

  while (count < quota) {
    uid += 1
    const id = `demo-${meta.id}-fill-${uid}`
    const rnd = mulberry32(hashSeed(id))
    const box = boxList[Math.floor(rnd() * boxList.length)] ?? hunt
    const { lat, lng } = sampleLatLngOceanOnly(box, rnd, landIndexed)
    placed.push({
      id,
      title: `(demo) Psathyrella — ${meta.label} · fill`,
      base: { lat, lng },
      theaterId: meta.id,
      pathIndex: -1,
      sKm: 0,
      offsetNm: 0,
      seed: hashSeed(id),
    })
    count++
  }

  return { placed, nextUid: uid }
}

function buildDemoCablePatrolNodes(
  landIndexed: LandIndexedFeature[],
  cableFc: FeatureCollection,
  outPathsByTheater: Record<string, DemoCablePatrolPath[]>,
): DemoBuoyNode[] {
  const nodes: DemoBuoyNode[] = []
  const perTheater = Math.floor(DEMO_BUOY_TOTAL / DEMO_THEATERS.length)
  let remainder = DEMO_BUOY_TOTAL - perTheater * DEMO_THEATERS.length
  let uid = 0

  for (const meta of DEMO_THEATERS) {
    const hunt = THEATER_CABLE_HUNT[meta.id]
    const paths = extractCablePathsForTheater(cableFc, hunt)
    outPathsByTheater[meta.id] = paths

    const quota = perTheater + (remainder > 0 ? 1 : 0)
    if (remainder > 0) remainder -= 1

    if (!paths.length) {
      const boxes = THEATER_OCEAN_BOXES[meta.id]
      for (let i = 0; i < quota; i++) {
        uid += 1
        const id = `demo-${meta.id}-fb-${uid}`
        const rnd = mulberry32(hashSeed(id))
        const box = boxes[Math.floor(rnd() * boxes.length)] ?? boxes[0]
        const { lat, lng } = sampleLatLngOceanOnly(box, rnd, landIndexed)
        nodes.push({
          id,
          title: `(demo) Psathyrella — ${meta.label} (no cable geom.)`,
          base: { lat, lng },
          theaterId: meta.id,
          pathIndex: -1,
          sKm: 0,
          offsetNm: 0,
          seed: hashSeed(id),
        })
      }
      continue
    }

    const lens = paths.map((p) => pathLengthKm(p.coords))
    const { placed: chunk, nextUid } = placeBuoysClusteredNearCables(
      meta,
      paths,
      lens,
      hunt,
      quota,
      landIndexed,
      uid,
    )
    uid = nextUid
    nodes.push(...chunk)

    const shortfall = quota - chunk.length
    if (shortfall > 0) {
      const boxes = THEATER_OCEAN_BOXES[meta.id]
      for (let i = 0; i < shortfall; i++) {
        uid += 1
        const id = `demo-${meta.id}-fb-${uid}`
        const rnd = mulberry32(hashSeed(id))
        const box = boxes[Math.floor(rnd() * boxes.length)] ?? boxes[0]
        const { lat, lng } = sampleLatLngOceanOnly(box, rnd, landIndexed)
        nodes.push({
          id,
          title: `(demo) Psathyrella — ${meta.label} · fill`,
          base: { lat, lng },
          theaterId: meta.id,
          pathIndex: -1,
          sKm: 0,
          offsetNm: 0,
          seed: hashSeed(id),
        })
      }
    }
  }

  return nodes
}

/**
 * Legacy entrypoint name kept for stale webpack/HMR chunks that still call it.
 * Always use {@link buildDemoCablePatrolNodes} with real cable GeoJSON (see bootstrap `useEffect`).
 */
function buildDemoPsathyrellaNodes(landIndexed: LandIndexedFeature[]): DemoBuoyNode[] {
  const pathsRecord: Record<string, DemoCablePatrolPath[]> = {}
  const nodes = buildDemoCablePatrolNodes(landIndexed, EMPTY_FC, pathsRecord)
  const cap = Math.max(0, Math.ceil(DEMO_BUOY_TOTAL * DEMO_THEATER_BUOY_FRACTION))
  return nodes.length <= cap ? nodes : nodes.slice(0, cap)
}

/** Patrol along cable arc ≤ ~1 ft / 30 s; tiny cross-track oscillation only (no km-scale hops). */
function patrolLatLng(
  node: DemoBuoyNode,
  tMs: number,
  landIndexed: LandIndexedFeature[],
  pathsByTheater: Record<string, DemoCablePatrolPath[]>,
): { lat: number; lng: number } {
  if (node.pathIndex < 0) return driftLatLng(node.base, tMs, node.seed, landIndexed)

  const paths = pathsByTheater[node.theaterId]
  const path = paths?.[node.pathIndex]
  if (!path?.coords?.length) return driftLatLng(node.base, tMs, node.seed, landIndexed)

  const len = pathLengthKm(path.coords)
  if (len < 1e-6) return clampLngLat(node.base.lat, node.base.lng)

  let s = node.sKm + tMs * DEMO_KM_PER_MS_ALONG_CABLE
  s = ((s % len) + len) % len

  const crossOmega = (2 * Math.PI) / (320000 + (node.seed % 110) * 2800)
  const crossKm =
    Math.sin(tMs * crossOmega + node.seed * 0.41) * (DEMO_FOOT_KM * 0.38) +
    Math.cos(tMs * crossOmega * 0.61 + node.seed * 0.19) * (DEMO_FOOT_KM * 0.26)

  const inner = interpolateAlongPath(path.coords, s)
  const baseKm = Math.abs(node.offsetNm) * 1.852
  const km = Math.max(1e-9, baseKm + crossKm)
  const sign: 1 | -1 = node.offsetNm >= 0 ? 1 : -1
  let lat = inner.lat
  let lng = inner.lng
  if (km > 1e-9) {
    const o = offsetPerpendicularKm(inner.lat, inner.lng, inner.bearingDeg, km, sign)
    lat = o.lat
    lng = o.lng
  }

  if (landIndexed.length > 0 && pointOnLand(lng, lat, landIndexed))
    return clampLngLat(node.base.lat, node.base.lng)
  if (!landIndexed.length && isRejectedLand(lat, lng)) return clampLngLat(node.base.lat, node.base.lng)
  return clampLngLat(lat, lng)
}

/** Sub-foot oscillation around anchor — bounded, slow (demo mooring; no accumulated km drift). */
function driftLatLng(
  base: { lat: number; lng: number },
  tMs: number,
  seed: number,
  landIndexed: LandIndexedFeature[],
) {
  const rad = Math.PI / 180
  const latRad = base.lat * rad
  const ω1 = (2 * Math.PI) / (520000 + (seed % 130) * 3400)
  const ω2 = (2 * Math.PI) / (680000 + (seed % 90) * 4100)
  const ampKm = DEMO_FOOT_KM * 0.82
  const dxKm = Math.sin(tMs * ω1 + seed * 0.13) * ampKm
  const dyKm = Math.cos(tMs * ω2 + seed * 0.37) * ampKm * 0.72
  let lat = base.lat + dxKm / 111
  let lng = base.lng + dyKm / Math.max(0.22, Math.cos(latRad))
  if (landIndexed.length > 0 && pointOnLand(lng, lat, landIndexed)) {
    lat = base.lat
    lng = base.lng
  } else if (!landIndexed.length && isRejectedLand(lat, lng)) {
    lat = base.lat
    lng = base.lng
  }
  return clampLngLat(lat, lng)
}

function countVesselsNear(lat: number, lng: number, vessels: Array<{ lat: number; lng: number }>, radiusKm: number) {
  let n = 0
  for (const v of vessels) {
    if (!Number.isFinite(v.lat) || !Number.isFinite(v.lng)) continue
    if (haversineKm(lat, lng, v.lat, v.lng) <= radiusKm) n++
  }
  return n
}

/** ~0.25° bins — fast AIS density near a point (avoids O(buoys × vessels) at 5k demos) */
const AIS_CELL_SCALE = 4

function buildAisCellCounts(vessels: Array<{ lat: number; lng: number }>): Map<string, number> {
  const m = new Map<string, number>()
  for (const v of vessels) {
    if (!Number.isFinite(v.lat) || !Number.isFinite(v.lng)) continue
    const key = `${Math.floor(v.lat * AIS_CELL_SCALE)}:${Math.floor(v.lng * AIS_CELL_SCALE)}`
    m.set(key, (m.get(key) ?? 0) + 1)
  }
  return m
}

function countAisNearCells(lat: number, lng: number, cells: Map<string, number>): number {
  const cx = Math.floor(lat * AIS_CELL_SCALE)
  const cy = Math.floor(lng * AIS_CELL_SCALE)
  let sum = 0
  for (let dx = -3; dx <= 3; dx++) {
    for (let dy = -3; dy <= 3; dy++) {
      sum += cells.get(`${cx + dx}:${cy + dy}`) ?? 0
    }
  }
  return sum
}

export interface MaritimeMapStats {
  cablesLoaded: boolean
  vesselCount: number
  navyCount: number
  liveBuoyCount: number
  /** NOAA NDBC stations (latest_obs) — US + global network */
  ndbcBuoyCount: number
  registryBuoyCount: number
  demoBuoyCount: number
  lastError: string | null
}

interface MilitaryFacilityLite {
  id: string
  name: string
  lat: number
  lng: number
  type: string
  operator: string
  country: string
  tags: Record<string, string>
}

interface NetworkDeviceLite {
  device_name: string
  device_role?: string
  location: string | null
  extra?: Record<string, unknown>
}

export interface MaritimeMapSelection {
  layerId: string
  lngLat: [number, number]
  props: Record<string, unknown>
}

function isUsNavyRelated(f: MilitaryFacilityLite): boolean {
  const blob = `${f.name} ${f.operator} ${f.type} ${f.country} ${Object.values(f.tags || {}).join(" ")}`.toLowerCase()
  const navalHint =
    /navy|naval|usn|fleet activities|\bnavsta\b|\bnas\b|naval station|naval base|naval support|naval air|submarine|carrier/.test(blob)
  if (!navalHint) return false
  const country = (f.country || "").trim().toLowerCase()
  if (/^(us|usa|united states)$/i.test(country)) return true
  if (/u\.?s\.?\s*navy|united states navy|navsta |naval support activity|^nas |nsf /.test(blob)) return true
  return false
}

function parseDeviceLatLng(
  location: string | null,
  extra?: Record<string, unknown>,
): { lat: number; lng: number } | null {
  if (extra) {
    const exLat = Number(extra.lat ?? extra.latitude ?? (extra.gps as { lat?: number } | undefined)?.lat)
    const exLng = Number(
      extra.lng ?? extra.longitude ?? extra.lon ?? (extra.gps as { lng?: number } | undefined)?.lng,
    )
    if (Number.isFinite(exLat) && Number.isFinite(exLng)) {
      return clampLngLat(exLat, exLng)
    }
  }
  if (!location?.trim()) return null
  const t = location.trim()
  try {
    const j = JSON.parse(t) as Record<string, unknown>
    const lat = Number(j.lat ?? j.latitude)
    const lng = Number(j.lng ?? j.longitude ?? j.lon)
    if (Number.isFinite(lat) && Number.isFinite(lng)) return clampLngLat(lat, lng)
  } catch {
    /* not JSON */
  }
  const m = t.match(/(-?\d+\.?\d*)\s*[,;\s]+\s*(-?\d+\.?\d*)/)
  if (m) {
    const a = parseFloat(m[1])
    const b = parseFloat(m[2])
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null
    if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return clampLngLat(a, b)
    if (Math.abs(b) <= 90 && Math.abs(a) <= 180) return clampLngLat(b, a)
  }
  return null
}

function isPsathyrellaDevice(d: NetworkDeviceLite): boolean {
  const blob = `${d.device_role ?? ""} ${d.device_name}`.toLowerCase()
  return blob.includes("psathyrella")
}

function setFc(map: MlMap, sourceId: string, fc: FeatureCollection) {
  const src = map.getSource(sourceId) as GeoJSONSource | undefined
  if (src) src.setData(fc)
}

function buildDemoBuoyFeatures(
  /** Milliseconds since demo map animation began (monotonic; used for slow cable creep). */
  animElapsedMs: number,
  vesselPositions: Array<{ lat: number; lng: number }>,
  demoNodes: ReadonlyArray<DemoBuoyNode>,
  landIndexed: LandIndexedFeature[],
  cablePathsByTheater: Record<string, DemoCablePatrolPath[]>,
): Feature[] {
  const useExactAis = demoNodes.length <= 200 && vesselPositions.length <= 2500
  const aisCells = useExactAis ? null : buildAisCellCounts(vesselPositions)

  return demoNodes.map((node) => {
    const seed = node.seed
    const raw = patrolLatLng(node, animElapsedMs, landIndexed, cablePathsByTheater)
    const { lat, lng } = clampLngLat(raw.lat, raw.lng)
    const neighbors = useExactAis
      ? countVesselsNear(lat, lng, vesselPositions, 55)
      : countAisNearCells(lat, lng, aisCells!)
    const phase = animElapsedMs * 0.001
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        title: node.title,
        demo: "true",
        buoy_kind: "demo",
        demoId: node.id,
        acoustic_band_hz: String(Math.round(28000 + (seed % 8000) + Math.sin(phase) * 900)),
        acoustic_confidence: String((81 + Math.sin(phase * 0.7) * 14).toFixed(1)),
        gps_speed_ms: String((DEMO_GPS_SPEED_MS * (0.9 + Math.abs(Math.sin(phase * 0.4)) * 0.2)).toFixed(3)),
        heading_deg: String(Math.round((seed + animElapsedMs / 120) % 360)),
        air_temp_c: String((24 + Math.sin(animElapsedMs / 5e5) * 5).toFixed(1)),
        air_aqi: String(Math.round(42 + Math.abs(Math.cos(animElapsedMs / 4e5)) * 35)),
        water_temp_c: String((21 + Math.sin(animElapsedMs / 6e5) * 4).toFixed(1)),
        salinity_ppt: String((34.6 + Math.sin(animElapsedMs / 7e5) * 0.8).toFixed(2)),
        turbidity_ntu: String((1.5 + Math.abs(Math.sin(animElapsedMs / 3e3)) * 8).toFixed(1)),
        vessel_detections_55km: String(neighbors),
        comms_range_km: String((62 + (seed % 48) + Math.sin(animElapsedMs / 25e3) * 12).toFixed(1)),
        mesh_peers: String(4 + (seed % 6)),
      },
    }
  })
}

function SelectionPanel({
  selection,
  onClose,
}: {
  selection: MaritimeMapSelection
  onClose: () => void
}) {
  const { map } = useMap()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: 16, top: 96 })

  const syncPos = useCallback(() => {
    if (!map || !wrapRef.current) return
    const el = map.getContainer()
    const rect = el.getBoundingClientRect()
    const p = map.project(selection.lngLat)
    const pad = 12
    const cardW = 320
    const cardH = 280
    let left = p.x + pad
    let top = p.y - cardH / 2
    if (left + cardW > rect.width - pad) left = p.x - cardW - pad
    if (left < pad) left = pad
    if (top < pad) top = pad
    if (top + cardH > rect.height - pad) top = rect.height - cardH - pad
    setPos({ left, top })
  }, [map, selection.lngLat])

  useEffect(() => {
    syncPos()
    if (!map) return
    map.on("move", syncPos)
    map.on("zoom", syncPos)
    return () => {
      map.off("move", syncPos)
      map.off("zoom", syncPos)
    }
  }, [map, syncPos])

  const pr = selection.props
  const isDemoBuoy = String(pr.demo ?? "") === "true"
  const buoyKind = String(pr.buoy_kind ?? "")
  const isNdbcBuoy = buoyKind === "ndbc"
  const isRegistryBuoy = buoyKind === "registry"
  const isLiveBuoy = selection.layerId === LAYER.buoys && !isDemoBuoy
  const isNavy = selection.layerId === LAYER.navy
  const isVessel = selection.layerId === LAYER.vessels
  const isCable = selection.layerId === LAYER.cables

  const title =
    (pr.title as string) ||
    (pr.name as string) ||
    (isCable ? "Submarine cable" : "Maritime feature")

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none absolute inset-0 z-[60]"
      aria-live="polite"
    >
      <div
        className="pointer-events-auto absolute max-h-[min(72vh,340px)] w-[min(calc(100vw-2rem),320px)] overflow-y-auto rounded-xl border border-sky-500/40 bg-slate-950/95 p-3 text-left text-xs text-white shadow-2xl backdrop-blur-md sm:p-4 sm:text-sm"
        style={{ left: pos.left, top: pos.top }}
        role="dialog"
        aria-label="Feature details"
      >
        <div className="mb-2 flex items-start justify-between gap-2 border-b border-white/10 pb-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-snug text-sky-300">{title}</p>
            {isDemoBuoy ? (
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-amber-300/90">
                Demonstration telemetry — not a deployed asset
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white min-h-[44px] min-w-[44px]"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {isNdbcBuoy ? (
          <div className="space-y-3 font-mono text-[11px] leading-relaxed sm:text-xs">
            <p className="rounded-lg border border-lime-500/25 bg-lime-500/10 px-2 py-1.5 text-[10px] text-lime-50/95">
              Live NOAA NDBC observation (
              <a
                href="https://www.ndbc.noaa.gov/"
                className="underline decoration-lime-400/80 underline-offset-2 hover:text-white"
                target="_blank"
                rel="noreferrer"
              >
                ndbc.noaa.gov
              </a>
              ) — same public latest_obs feed used across Mycosoft marine tooling; refreshed ~every 5 min.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <WidgetStat icon={<Waves className="size-3.5 text-lime-400" />} label="Sig. wave H (m)" value={String(pr.wave_height_m ?? "—")} />
              <WidgetStat label="Peak period (s)" value={String(pr.dominant_wave_period_s ?? "—")} />
              <WidgetStat label="Water temp °C" value={String(pr.water_temp_c ?? "—")} />
              <WidgetStat label="Air temp °C" value={String(pr.air_temp_c ?? "—")} />
              <WidgetStat label="Wind m/s" value={String(pr.wind_speed_ms ?? "—")} />
              <WidgetStat label="Wind dir °" value={String(pr.wind_direction_deg ?? "—")} />
              <WidgetStat label="Pressure (hPa)" value={String(pr.pressure_hpa ?? "—")} />
              <WidgetStat label="Observed (UTC)" value={String(pr.obs_time_utc ?? "—")} />
            </div>
            {pr.station_id ? (
              <a
                href={`https://www.ndbc.noaa.gov/station_page.php?station=${encodeURIComponent(String(pr.station_id))}`}
                className="inline-flex min-h-[44px] items-center text-[11px] font-medium text-sky-300 underline underline-offset-2 hover:text-white"
                target="_blank"
                rel="noreferrer"
              >
                Open official station page →
              </a>
            ) : null}
          </div>
        ) : null}

        {!isNdbcBuoy && (isDemoBuoy || isLiveBuoy) ? (
          <div className="space-y-3 font-mono text-[11px] leading-relaxed sm:text-xs">
            {isRegistryBuoy ? (
              <p className="rounded-lg border border-fuchsia-500/25 bg-fuchsia-500/10 px-2 py-1.5 text-[10px] text-fuchsia-100/90">
                Registry Psathyrella device — hydro/environment fields populate when MAS ingests live telemetry.
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <WidgetStat icon={<Waves className="size-3.5 text-cyan-400" />} label="Acoustic band (Hz)" value={String(pr.acoustic_band_hz ?? "—")} />
              <WidgetStat icon={<Radio className="size-3.5 text-emerald-400" />} label="Detection confidence %" value={String(pr.acoustic_confidence ?? "—")} />
              <WidgetStat icon={<Compass className="size-3.5 text-sky-400" />} label="GPS drift speed (m/s)" value={String(pr.gps_speed_ms ?? "—")} />
              <WidgetStat icon={<Anchor className="size-3.5 text-violet-400" />} label="Heading °" value={String(pr.heading_deg ?? "—")} />
            </div>
            <p className="text-[10px] uppercase tracking-wide text-white/45">Environment</p>
            <div className="grid grid-cols-2 gap-2">
              <WidgetStat label="Air temp °C" value={String(pr.air_temp_c ?? "—")} />
              <WidgetStat label="Air AQI" value={String(pr.air_aqi ?? "—")} />
              <WidgetStat label="Water temp °C" value={String(pr.water_temp_c ?? "—")} />
              <WidgetStat label="Salinity ppt" value={String(pr.salinity_ppt ?? "—")} />
              <WidgetStat label="Turbidity NTU" value={String(pr.turbidity_ntu ?? "—")} />
            </div>
            <p className="text-[10px] uppercase tracking-wide text-white/45">Maritime & mesh</p>
            <div className="grid grid-cols-2 gap-2">
              <WidgetStat
                icon={<Ship className="size-3.5 text-slate-300" />}
                label="AIS density (≈55 km)"
                value={String(pr.vessel_detections_55km ?? "—")}
              />
              <WidgetStat icon={<Radio className="size-3.5 text-amber-400" />} label="Comms range (km)" value={String(pr.comms_range_km ?? "—")} />
              <WidgetStat label="Mesh peers (est.)" value={String(pr.mesh_peers ?? "—")} />
            </div>
            {isRegistryBuoy ? (
              <p className="text-[10px] text-white/50">Live registry device — values shown when reported by MAS.</p>
            ) : (
              <p className="text-[10px] text-white/50">
                Simulated GPS drift and environmental fields for showroom; correlate with live AIS where available.
              </p>
            )}
          </div>
        ) : null}

        {isNavy ? (
          <dl className="space-y-2 font-mono text-[11px] sm:text-xs">
            <Row k="Installation" v={String(pr.name ?? title)} />
            <Row k="Type" v={String(pr.type ?? "—")} />
            <Row k="Operator" v={String(pr.operator ?? "—")} />
            <Row k="Country" v={String(pr.country ?? "—")} />
            <p className="text-[10px] text-white/45">
              From /api/oei/military — U.S. Navy–related filter. Select another marker or zoom for context.
            </p>
          </dl>
        ) : null}

        {isVessel ? (
          <dl className="space-y-2 font-mono text-[11px] sm:text-xs">
            <Row k="Name" v={String(pr.name ?? "—")} />
            <Row k="MMSI" v={String(pr.mmsi ?? "—")} />
            <Row k="SOG (kn)" v={String(pr.sog ?? "—")} />
            <Row k="COG °" v={String(pr.cog ?? "—")} />
            <Row k="Destination" v={String(pr.destination ?? "—")} />
            <Row k="Source" v={String(pr.source ?? "—")} />
            <Row k="Updated" v={String(pr.timestamp ?? "—")} />
          </dl>
        ) : null}

        {isCable ? (
          <dl className="space-y-2 font-mono text-[11px] sm:text-xs">
            <Row k="Cable system" v={String(pr.name ?? title)} />
            <Row k="Feature id" v={String(pr.feature_id ?? pr.id ?? "—")} />
            <p className="text-[10px] text-white/45">
              Submarine cable GeoJSON (Earth Simulator dataset) — click near route geometry.
            </p>
          </dl>
        ) : null}
      </div>
    </div>
  )
}

function WidgetStat({
  icon,
  label,
  value,
}: {
  icon?: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
      <div className="mb-0.5 flex items-center gap-1 text-[10px] text-white/50">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-[11px] font-semibold text-sky-100 sm:text-xs">{value}</div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-white/5 pb-1.5 last:border-0">
      <dt className="text-[10px] uppercase tracking-wide text-white/45">{k}</dt>
      <dd className="text-white/90">{v}</dd>
    </div>
  )
}

function PsathyrellaMaritimeLayers({
  setStats,
  setSelection,
  mapViewportActive,
}: {
  setStats: Dispatch<SetStateAction<MaritimeMapStats>>
  setSelection: Dispatch<SetStateAction<MaritimeMapSelection | null>>
  /** Demo buoys (heavy animation + GeoJSON) run only while the map is on-screen and the tab is visible. */
  mapViewportActive: boolean
}) {
  const { map, isLoaded } = useMap()
  const viewportActiveRef = useRef(mapViewportActive)
  viewportActiveRef.current = mapViewportActive

  const intervalsRef = useRef<{
    vessels?: ReturnType<typeof setInterval>
    demo?: ReturnType<typeof setInterval>
    navy?: ReturnType<typeof setInterval>
  }>({})
  const refreshDemoBuoysOnlyRef = useRef<(() => void) | null>(null)
  const [vectorLayersReady, setVectorLayersReady] = useState(false)

  const vesselPositionsRef = useRef<Array<{ lat: number; lng: number }>>([])
  const liveBuoyFeaturesRef = useRef<Feature[]>([])
  /** Wall time when demo motion started — patrol uses elapsed ms, not epoch (avoids modulo teleport). */
  const demoAnimStartRef = useRef<number | null>(null)
  const getDemoAnimElapsedMs = () => {
    const now = Date.now()
    if (demoAnimStartRef.current == null) demoAnimStartRef.current = now
    return now - demoAnimStartRef.current
  }
  const landFcRef = useRef<FeatureCollection>(EMPTY_FC)
  const landIndexedRef = useRef<LandIndexedFeature[]>([])
  /** Cable GeoJSON for deferred demo placement (built only when map enters viewport). */
  const cableFcRef = useRef<FeatureCollection>(EMPTY_FC)
  const demoCablePathsRef = useRef<Record<string, DemoCablePatrolPath[]>>({})
  const demoNodesRef = useRef<ReadonlyArray<DemoBuoyNode>>([])
  const didFitDemoTheaterViewRef = useRef(false)

  const pushStats = useCallback(
    (partial: Partial<MaritimeMapStats>) => {
      setStats((prev) => ({ ...prev, ...partial }))
    },
    [setStats],
  )

  useEffect(() => {
    if (!map || !isLoaded) {
      setVectorLayersReady(false)
      return
    }

    setVectorLayersReady(false)

    let cancelled = false
    /** Coalesced hover queries — cancel on teardown to avoid stale rAF after layer removal */
    let hoverCursorRaf = 0
    let onMapClick: ((e: MapMouseEvent) => void) | null = null
    let onMouseMove: ((e: MapMouseEvent) => void) | null = null

    const teardownLayers = () => {
      try {
        if (hoverCursorRaf) {
          cancelAnimationFrame(hoverCursorRaf)
          hoverCursorRaf = 0
        }
        if (onMapClick) {
          map.off("click", onMapClick)
          onMapClick = null
        }
        if (onMouseMove) {
          map.off("mousemove", onMouseMove)
          onMouseMove = null
        }
        if (map.getLayer(LAYER.buoysHit)) map.removeLayer(LAYER.buoysHit)
        if (map.getLayer(LAYER.buoys)) map.removeLayer(LAYER.buoys)
        if (map.getLayer(LAYER.navy)) map.removeLayer(LAYER.navy)
        if (map.getLayer(LAYER.vessels)) map.removeLayer(LAYER.vessels)
        if (map.getLayer(LAYER.cablesHit)) map.removeLayer(LAYER.cablesHit)
        if (map.getLayer(LAYER.cables)) map.removeLayer(LAYER.cables)
        if (map.getLayer(LAYER.landOutline)) map.removeLayer(LAYER.landOutline)
        if (map.getLayer(LAYER.landFill)) map.removeLayer(LAYER.landFill)
        for (const id of Object.values(SRC)) {
          if (map.getSource(id)) map.removeSource(id)
        }
      } catch {
        /* style may already be gone */
      }
    }

    const installLandLayers = () => {
      if (map.getSource(SRC.land)) return
      const landFc = landFcRef.current
      if (!landFc.features.length) return
      map.addSource(SRC.land, { type: "geojson", data: landFc })
      map.addLayer({
        id: LAYER.landFill,
        type: "fill",
        source: SRC.land,
        paint: {
          "fill-color": "#1e293b",
          "fill-opacity": 0.38,
        },
      })
      map.addLayer({
        id: LAYER.landOutline,
        type: "line",
        source: SRC.land,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#94a3b8",
          "line-opacity": 0.62,
          "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.55, 6, 1.1, 12, 2],
        },
      })
    }

    const installVectorLayers = () => {
      installLandLayers()
      if (map.getSource(SRC.cables)) return

      map.addSource(SRC.cables, { type: "geojson", data: EMPTY_FC })
      map.addSource(SRC.vessels, { type: "geojson", data: EMPTY_FC })
      map.addSource(SRC.navy, { type: "geojson", data: EMPTY_FC })
      map.addSource(SRC.buoys, { type: "geojson", data: EMPTY_FC })

      map.addLayer({
        id: LAYER.cables,
        type: "line",
        source: SRC.cables,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#38bdf8",
          "line-opacity": 0.55,
          "line-width": ["interpolate", ["linear"], ["zoom"], 2, 1.25, 5, 2, 10, 3.5, 14, 5],
        },
      })

      map.addLayer({
        id: LAYER.cablesHit,
        type: "line",
        source: SRC.cables,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#000000",
          "line-opacity": 0,
          "line-width": ["interpolate", ["linear"], ["zoom"], 2, 16, 6, 12, 12, 8, 16, 6],
        },
      })

      map.addLayer({
        id: LAYER.vessels,
        type: "circle",
        source: SRC.vessels,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 5, 5, 6.5, 10, 8, 14, 10],
          "circle-color": "#cbd5e1",
          "circle-opacity": 0.78,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#f8fafc",
        },
      })

      map.addLayer({
        id: LAYER.navy,
        type: "circle",
        source: SRC.navy,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 8, 6, 11, 12, 14],
          "circle-color": "#2563eb",
          "circle-opacity": 0.95,
          "circle-stroke-color": "#bfdbfe",
          "circle-stroke-width": 1.5,
        },
      })

      map.addLayer({
        id: LAYER.buoys,
        type: "circle",
        source: SRC.buoys,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 11, 6, 14, 12, 18],
          "circle-color": [
            "match",
            ["get", "buoy_kind"],
            "ndbc",
            "#84cc16",
            "registry",
            "#e879f9",
            "#22d3ee",
          ],
          "circle-opacity": 1,
          "circle-stroke-color": [
            "match",
            ["get", "buoy_kind"],
            "ndbc",
            "#365314",
            "registry",
            "#701a75",
            "#ecfeff",
          ],
          "circle-stroke-width": 2,
        },
      })

      map.addLayer({
        id: LAYER.buoysHit,
        type: "circle",
        source: SRC.buoys,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 28, 6, 34, 12, 42, 14, 48],
          "circle-color": "#000000",
          "circle-opacity": 0,
          "circle-stroke-width": 0,
        },
      })

      map.on("error", (ev: { error?: { message?: string } }) => {
        const msg = ev?.error?.message || ""
        if (/feature index out of bounds/i.test(msg)) return
      })

      const clickLayerRank = new Map<string, number>(CLICK_LAYERS.map((id, i) => [id, i]))

      onMapClick = (e: MapMouseEvent) => {
        const feats = map.queryRenderedFeatures(e.point, { layers: [...CLICK_LAYERS] })
        if (!feats.length) {
          setSelection(null)
          return
        }
        let best = feats[0]
        let bestRank = clickLayerRank.get(String(best.layer?.id ?? "")) ?? 999
        for (let i = 1; i < feats.length; i++) {
          const f = feats[i]
          const r = clickLayerRank.get(String(f.layer?.id ?? "")) ?? 999
          if (r < bestRank) {
            best = f
            bestRank = r
          }
        }
        const lid = String(best.layer?.id ?? "")
        const semanticLayerId =
          lid === LAYER.buoysHit ? LAYER.buoys : lid === LAYER.cablesHit ? LAYER.cables : lid
        const coords =
          best.geometry?.type === "Point" ? (best.geometry.coordinates as [number, number]) : null
        const rawLng = coords ? coords[0] : e.lngLat.lng
        const rawLat = coords ? coords[1] : e.lngLat.lat
        const pinned = clampLngLat(rawLat, rawLng)
        const lngLat: [number, number] = [pinned.lng, pinned.lat]
        const props = { ...(best.properties as Record<string, unknown>) }
        setSelection({ layerId: semanticLayerId, lngLat, props })
      }
      map.on("click", onMapClick)

      let hoverCursorPoint = { x: 0, y: 0 }
      onMouseMove = (e: MapMouseEvent) => {
        if (!viewportActiveRef.current) {
          if (hoverCursorRaf) {
            cancelAnimationFrame(hoverCursorRaf)
            hoverCursorRaf = 0
          }
          map.getCanvas().style.cursor = ""
          return
        }
        hoverCursorPoint = e.point
        if (hoverCursorRaf) return
        hoverCursorRaf = requestAnimationFrame(() => {
          hoverCursorRaf = 0
          if (cancelled || !map.getCanvas()) return
          try {
            const hits = map.queryRenderedFeatures(hoverCursorPoint, {
              layers: [...HOVER_CURSOR_LAYERS],
            })
            map.getCanvas().style.cursor = hits.length ? "pointer" : ""
          } catch {
            map.getCanvas().style.cursor = ""
          }
        })
      }
      map.on("mousemove", onMouseMove)
    }

    const loadCables = async () => {
      try {
        const res = await fetch("/data/crep/submarine-cables.geojson", { cache: "force-cache" })
        if (!res.ok) throw new Error(`cables HTTP ${res.status}`)
        const gj = (await res.json()) as FeatureCollection
        if (cancelled || !map.getSource(SRC.cables)) return
        setFc(map, SRC.cables, gj)
        pushStats({ cablesLoaded: true, lastError: null })
      } catch (e) {
        pushStats({
          cablesLoaded: false,
          lastError: e instanceof Error ? e.message : "Cable routes unavailable",
        })
      }
    }

    const refreshDemoBuoysOnly = () => {
      if (!map.getSource(SRC.buoys)) return
      const active = viewportActiveRef.current && demoNodesRef.current.length > 0
      if (!active) {
        setFc(map, SRC.buoys, {
          type: "FeatureCollection",
          features: [...liveBuoyFeaturesRef.current],
        })
        return
      }

      const elapsed = getDemoAnimElapsedMs()
      const demoFeats = buildDemoBuoyFeatures(
        elapsed,
        vesselPositionsRef.current,
        demoNodesRef.current,
        landIndexedRef.current,
        demoCablePathsRef.current,
      )

      setFc(map, SRC.buoys, {
        type: "FeatureCollection",
        features: [...liveBuoyFeaturesRef.current, ...demoFeats],
      })

      setSelection((prev) => {
        if (!prev || prev.layerId !== LAYER.buoys) return prev
        const demoId = prev.props.demoId as string | undefined
        if (!demoId) return prev
        const match = demoFeats.find((df) => String(df.properties?.demoId) === demoId)
        if (!match || match.geometry.type !== "Point") return prev
        const [mlng, mlat] = match.geometry.coordinates as [number, number]
        const pinned = clampLngLat(mlat, mlng)
        return {
          ...prev,
          lngLat: [pinned.lng, pinned.lat],
          props: { ...prev.props, ...match.properties },
        }
      })
    }

    const refreshNavyAndLiveBuoys = async () => {
      try {
        const milUrl =
          "/api/oei/military?south=-60&north=85&west=-180&east=180&limit=8000"
        const devUrl = "/api/devices/network?include_offline=true"
        const buoyUrl = "/api/oei/buoys"
        const [milRes, devRes, buoyRes] = await Promise.all([
          fetch(milUrl),
          fetch(devUrl),
          fetch(buoyUrl, { cache: "no-store" }),
        ])

        const navyFeatures: Feature[] = []
        if (milRes.ok) {
          const milJson = (await milRes.json()) as { facilities?: MilitaryFacilityLite[] }
          const facilities = milJson.facilities ?? []
          for (const f of facilities) {
            if (!isUsNavyRelated(f)) continue
            const pt = safeMapPoint(f.lat, f.lng)
            if (!pt) continue
            navyFeatures.push({
              type: "Feature",
              geometry: { type: "Point", coordinates: [pt.lng, pt.lat] },
              properties: {
                name: f.name,
                type: f.type,
                operator: f.operator,
                country: f.country,
              },
            })
          }
        }

        const registryBuoyFeatures: Feature[] = []
        if (devRes.ok) {
          const devJson = (await devRes.json()) as { devices?: NetworkDeviceLite[] }
          const devices = devJson.devices ?? []
          for (const d of devices) {
            if (!isPsathyrellaDevice(d)) continue
            const ll = parseDeviceLatLng(d.location, d.extra)
            if (!ll) continue
            const regPt = safeMapPoint(ll.lat, ll.lng)
            if (!regPt) continue
            registryBuoyFeatures.push({
              type: "Feature",
              geometry: { type: "Point", coordinates: [regPt.lng, regPt.lat] },
              properties: {
                title: d.device_name,
                demo: "false",
                buoy_kind: "registry",
                acoustic_band_hz: "",
                acoustic_confidence: "",
                gps_speed_ms: "",
                heading_deg: "",
                air_temp_c: "",
                air_aqi: "",
                water_temp_c: "",
                salinity_ppt: "",
                turbidity_ntu: "",
                vessel_detections_55km: "",
                comms_range_km: "",
                mesh_peers: "",
              },
            })
          }
        }

        const ndbcBuoyFeatures: Feature[] = []
        if (buoyRes.ok) {
          const buoyJson = (await buoyRes.json()) as {
            buoys?: Array<{
              station_id: string
              lat: number
              lng: number
              wave_height: number | null
              dominant_wave_period: number | null
              water_temp: number | null
              air_temp: number | null
              wind_speed: number | null
              wind_direction: number | null
              pressure: number | null
              timestamp: string
            }>
          }
          const rows = buoyJson.buoys ?? []
          for (const b of rows) {
            const ndbcPt = safeMapPoint(b.lat, b.lng)
            if (!ndbcPt) continue
            const fmt = (n: number | null | undefined, digits: number) =>
              n != null && Number.isFinite(n) ? n.toFixed(digits) : "—"
            ndbcBuoyFeatures.push({
              type: "Feature",
              geometry: { type: "Point", coordinates: [ndbcPt.lng, ndbcPt.lat] },
              properties: {
                title: `NDBC ${b.station_id}`,
                demo: "false",
                buoy_kind: "ndbc",
                station_id: b.station_id,
                wave_height_m: fmt(b.wave_height, 2),
                dominant_wave_period_s: fmt(b.dominant_wave_period, 1),
                water_temp_c: fmt(b.water_temp, 1),
                air_temp_c: fmt(b.air_temp, 1),
                wind_speed_ms: fmt(b.wind_speed, 1),
                wind_direction_deg: fmt(b.wind_direction, 0),
                pressure_hpa: fmt(b.pressure, 1),
                obs_time_utc: b.timestamp ? String(b.timestamp).slice(0, 19).replace("T", " ") : "—",
              },
            })
          }
        }

        const liveCombined = [...ndbcBuoyFeatures, ...registryBuoyFeatures]

        if (cancelled) return
        liveBuoyFeaturesRef.current = liveCombined
        const includeDemo =
          viewportActiveRef.current && demoNodesRef.current.length > 0
        const demoFeats = includeDemo
          ? buildDemoBuoyFeatures(
              getDemoAnimElapsedMs(),
              vesselPositionsRef.current,
              demoNodesRef.current,
              landIndexedRef.current,
              demoCablePathsRef.current,
            )
          : []
        if (map.getSource(SRC.navy)) {
          setFc(map, SRC.navy, { type: "FeatureCollection", features: navyFeatures })
        }
        if (map.getSource(SRC.buoys)) {
          setFc(map, SRC.buoys, {
            type: "FeatureCollection",
            features: [...liveCombined, ...demoFeats],
          })
        }
        pushStats({
          navyCount: navyFeatures.length,
          ndbcBuoyCount: ndbcBuoyFeatures.length,
          registryBuoyCount: registryBuoyFeatures.length,
          liveBuoyCount: liveCombined.length,
          demoBuoyCount: demoNodesRef.current.length,
          lastError: null,
        })
      } catch (e) {
        pushStats({
          lastError: e instanceof Error ? e.message : "Registry refresh failed",
        })
      }
    }

    const refreshVessels = async () => {
      try {
        const res = await fetch("/api/oei/aisstream?limit=4000", { cache: "no-store" })
        if (!res.ok) throw new Error(`aisstream ${res.status}`)
        const j = (await res.json()) as {
          vessels?: Array<{
            lat: number
            lng: number
            name?: string
            mmsi?: string
            sog?: number | null
            cog?: number | null
            destination?: string | null
            source?: string
            timestamp?: string
          }>
        }
        const vessels = j.vessels ?? []
        const positions: Array<{ lat: number; lng: number }> = []
        const features: Feature[] = []
        for (const v of vessels) {
          const aisPt = safeMapPoint(v.lat, v.lng)
          if (!aisPt) continue
          positions.push({ lat: aisPt.lat, lng: aisPt.lng })
          features.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [aisPt.lng, aisPt.lat] },
            properties: {
              name: v.name ?? "",
              mmsi: v.mmsi ?? "",
              sog: v.sog ?? "",
              cog: v.cog ?? "",
              destination: v.destination ?? "",
              source: v.source ?? "",
              timestamp: v.timestamp ?? "",
            },
          })
        }
        vesselPositionsRef.current = positions
        if (cancelled || !map.getSource(SRC.vessels)) return
        setFc(map, SRC.vessels, { type: "FeatureCollection", features })
        pushStats({ vesselCount: features.length, lastError: null })
        refreshDemoBuoysOnly()
      } catch (e) {
        pushStats({
          lastError: e instanceof Error ? e.message : "Vessel feed unavailable",
        })
      }
    }

    const reinstallAfterStyleChange = () => {
      if (cancelled) return
      if (map.getSource(SRC.cables)) return
      teardownLayers()
      installVectorLayers()
      void loadCables()
      void refreshVessels()
      void refreshNavyAndLiveBuoys()
    }

    void (async () => {
      let cableFc: FeatureCollection = EMPTY_FC
      try {
        const [landRes, cableRes] = await Promise.all([
          fetch("/data/geo/ne_110m_land.geojson", { cache: "force-cache" }),
          fetch("/data/crep/submarine-cables.geojson", { cache: "force-cache" }),
        ])
        if (landRes.ok) landFcRef.current = (await landRes.json()) as FeatureCollection
        if (cableRes.ok) cableFc = (await cableRes.json()) as FeatureCollection
      } catch {
        /* fallback: coarse LAND_REJECT_BOXES; demo placement uses theater ocean boxes */
      }
      if (cancelled) return
      landIndexedRef.current = indexLandFeatures(landFcRef.current)
      cableFcRef.current = cableFc
      demoNodesRef.current = []
      demoCablePathsRef.current = {}
      pushStats({ demoBuoyCount: 0 })

      if (cancelled) return
      installVectorLayers()
      if (!cancelled && !didFitDemoTheaterViewRef.current) {
        didFitDemoTheaterViewRef.current = true
        requestAnimationFrame(() => {
          try {
            map.fitBounds(DEMO_THEATER_VIEW_BOUNDS, {
              padding: { top: 56, bottom: 52, left: 52, right: 52 },
              maxZoom: 3.35,
              duration: 0,
            })
          } catch {
            /* map resize/style race */
          }
        })
      }
      if (cancelled) return
      map.on("style.load", reinstallAfterStyleChange)

      void loadCables()
      void refreshVessels()
      void refreshNavyAndLiveBuoys()

      intervalsRef.current.vessels = setInterval(() => {
        void refreshVessels()
      }, 45_000)
      intervalsRef.current.navy = setInterval(() => {
        void refreshNavyAndLiveBuoys()
      }, 120_000)

      if (!cancelled) setVectorLayersReady(true)
    })()

    refreshDemoBuoysOnlyRef.current = refreshDemoBuoysOnly

    return () => {
      cancelled = true
      map.off("style.load", reinstallAfterStyleChange)
      if (intervalsRef.current.vessels) clearInterval(intervalsRef.current.vessels)
      if (intervalsRef.current.demo) clearInterval(intervalsRef.current.demo)
      if (intervalsRef.current.navy) clearInterval(intervalsRef.current.navy)
      teardownLayers()
    }
  }, [map, isLoaded, pushStats, setSelection])

  useEffect(() => {
    if (!map || !isLoaded || !vectorLayersReady) return

    if (!mapViewportActive) {
      if (intervalsRef.current.demo) {
        clearInterval(intervalsRef.current.demo)
        intervalsRef.current.demo = undefined
      }
      try {
        if (map.getSource(SRC.buoys)) {
          setFc(map, SRC.buoys, {
            type: "FeatureCollection",
            features: [...liveBuoyFeaturesRef.current],
          })
        }
      } catch {
        /* style/source race */
      }
      return
    }

    if (!map.getSource(SRC.buoys)) return

    if (demoNodesRef.current.length === 0) {
      const pathsRecord: Record<string, DemoCablePatrolPath[]> = {}
      demoNodesRef.current = buildDemoCablePatrolNodes(
        landIndexedRef.current,
        cableFcRef.current,
        pathsRecord,
      )
      demoCablePathsRef.current = pathsRecord
      pushStats({ demoBuoyCount: demoNodesRef.current.length })
    }

    refreshDemoBuoysOnlyRef.current?.()

    if (intervalsRef.current.demo) clearInterval(intervalsRef.current.demo)
    intervalsRef.current.demo = setInterval(() => {
      if (!viewportActiveRef.current) return
      refreshDemoBuoysOnlyRef.current?.()
    }, DEMO_REFRESH_INTERVAL_MS)

    return () => {
      if (intervalsRef.current.demo) {
        clearInterval(intervalsRef.current.demo)
        intervalsRef.current.demo = undefined
      }
    }
  }, [map, isLoaded, vectorLayersReady, mapViewportActive, pushStats])

  return null
}

export function PsathyrellaMaritimeDeploymentMap({ className }: { className?: string }) {
  const mapWrapRef = useRef<HTMLDivElement>(null)
  const [mapInView, setMapInView] = useState(false)
  const [tabVisible, setTabVisible] = useState(true)
  const [stats, setStats] = useState<MaritimeMapStats>({
    cablesLoaded: false,
    vesselCount: 0,
    navyCount: 0,
    liveBuoyCount: 0,
    ndbcBuoyCount: 0,
    registryBuoyCount: 0,
    demoBuoyCount: 0,
    lastError: null,
  })
  const [selection, setSelection] = useState<MaritimeMapSelection | null>(null)

  useEffect(() => {
    const onVis = () => setTabVisible(document.visibilityState === "visible")
    onVis()
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [])

  useEffect(() => {
    const el = mapWrapRef.current
    if (!el || typeof IntersectionObserver === "undefined") {
      setMapInView(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        setMapInView(entries.some((e) => e.isIntersecting))
      },
      { root: null, rootMargin: "120px", threshold: 0.06 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const mapViewportActive = mapInView && tabVisible

  return (
    <div className={cn("space-y-4", className)}>
      <div
        ref={mapWrapRef}
        className="relative overflow-hidden rounded-2xl border border-sky-500/30 bg-slate-950 shadow-xl"
        data-testid="psathyrella-maritime-map"
      >
        <div className="relative h-[min(58vh,520px)] w-full min-h-[280px] sm:min-h-[360px]">
          <PsathyrellaDeploymentMap
            center={[34, 28]}
            zoom={2.25}
            minZoom={1}
            maxZoom={18}
            styles={{ dark: DARK_NO_LABELS, light: DARK_NO_LABELS }}
            attributionControl={{ compact: true }}
          >
            <PsathyrellaMaritimeLayers
              setStats={setStats}
              setSelection={setSelection}
              mapViewportActive={mapViewportActive}
            />
            {selection ? <SelectionPanel selection={selection} onClose={() => setSelection(null)} /> : null}
            <MapControls position="bottom-right" showZoom />
          </PsathyrellaDeploymentMap>

          <div
            className="pointer-events-none absolute left-2 top-2 z-10 max-w-[min(100%-1rem,252px)] rounded-lg border border-white/10 bg-slate-950/90 px-2 py-1.5 text-[10px] text-white/95 shadow-lg backdrop-blur-md sm:left-3 sm:top-3 sm:max-w-[min(100%-1.5rem,268px)] sm:text-[11px]"
            aria-label="Map legend"
          >
            <p className="mb-1 font-semibold uppercase tracking-wide text-sky-300/90">Layers</p>
            <p className="mb-1.5 font-mono leading-snug text-white/85">
              <span className="text-sky-200">AIS:</span>{" "}
              <strong className="text-white">{stats.vesselCount.toLocaleString()}</strong>
              {" · "}
              <span className="text-blue-300">Navy:</span>{" "}
              <strong className="text-white">{stats.navyCount.toLocaleString()}</strong>
              {" · "}
              <span className="text-lime-300">NDBC:</span>{" "}
              <strong className="text-white">{stats.ndbcBuoyCount.toLocaleString()}</strong>
              {" · "}
              <span className="text-fuchsia-300">Reg:</span>{" "}
              <strong className="text-white">{stats.registryBuoyCount}</strong>
              {" · "}
              <span className="text-cyan-300">Demo:</span>{" "}
              <strong className="text-amber-200">{stats.demoBuoyCount.toLocaleString()}</strong>
            </p>
            <ul className="space-y-1 font-mono leading-snug text-white/75">
              <li className="flex items-center gap-1.5">
                <span className="inline-block size-2 shrink-0 rounded-full bg-lime-400 ring-1 ring-white/40" />
                NOAA NDBC (live waves/SST)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="inline-block size-2 shrink-0 rounded-full bg-fuchsia-400 ring-1 ring-white/35" />
                Registry Psathyrella
              </li>
              <li className="flex items-center gap-1.5">
                <span className="inline-block size-2 shrink-0 rounded-full bg-cyan-400 ring-1 ring-white/40" />
                Demo Psathyrella (sim)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="inline-block size-2 shrink-0 rounded-full bg-blue-600 ring-1 ring-sky-200/50" />
                Navy
              </li>
              <li className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 shrink-0 rounded-sm bg-slate-600 ring-1 ring-slate-400/60" />
                Land / coast (Natural Earth 110m)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 shrink-0 bg-sky-400 opacity-80" />
                Cables{stats.cablesLoaded ? "" : " …"}
              </li>
              <li className="flex items-center gap-1.5">
                <span className="inline-block size-1.5 shrink-0 rounded-full bg-slate-200 opacity-90 ring-1 ring-white/30" />
                AIS
              </li>
            </ul>
          </div>
        </div>
      </div>

      {stats.lastError ? (
        <p className="text-center text-xs text-amber-600 dark:text-amber-400/90" role="status">
          Map data: {stats.lastError}
        </p>
      ) : null}
    </div>
  )
}
