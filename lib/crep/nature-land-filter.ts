/**
 * Land/water placement filter for CREP nature observation markers.
 * Terrestrial taxa (fungi, plants, birds on land, etc.) must not render in open water.
 * Marine taxa may remain in water. Uses Natural Earth land polygons + regional water masks.
 */
import fs from "node:fs"
import path from "node:path"

export interface LandPolygon {
  bbox: [number, number, number, number]
  outer: Array<[number, number]>
  holes: Array<Array<[number, number]>>
}

const MARINE_TAXON_TOKENS = new Set([
  "actinopterygii",
  "chondrichthyes",
  "mollusca",
  "marine",
  "fish",
  "elasmobranchii",
  "cephalopoda",
])

let landMaskCache: LandPolygon[] | null = null

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function ringBbox(ring: Array<[number, number]>): [number, number, number, number] {
  let west = 180
  let south = 90
  let east = -180
  let north = -90
  for (const [lng, lat] of ring) {
    if (lng < west) west = lng
    if (lng > east) east = lng
    if (lat < south) south = lat
    if (lat > north) north = lat
  }
  return [west, south, east, north]
}

function pointInRing(lng: number, lat: number, ring: Array<[number, number]>): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const crosses = (yi > lat) !== (yj > lat)
    if (!crosses) continue
    const xAtLat = ((xj - xi) * (lat - yi)) / (yj - yi || 1e-9) + xi
    if (lng < xAtLat) inside = !inside
  }
  return inside
}

function normalizeRing(raw: unknown): Array<[number, number]> {
  if (!Array.isArray(raw)) return []
  const ring: Array<[number, number]> = []
  const step = raw.length > 12000 ? Math.ceil(raw.length / 12000) : 1
  for (let i = 0; i < raw.length; i += step) {
    const point = raw[i]
    if (!Array.isArray(point) || point.length < 2) continue
    const lng = Number(point[0])
    const lat = Number(point[1])
    if (Number.isFinite(lng) && Number.isFinite(lat)) ring.push([lng, lat])
  }
  const last = raw[raw.length - 1]
  if (Array.isArray(last) && last.length >= 2) {
    const lng = Number(last[0])
    const lat = Number(last[1])
    const prev = ring[ring.length - 1]
    if (Number.isFinite(lng) && Number.isFinite(lat) && (!prev || prev[0] !== lng || prev[1] !== lat)) {
      ring.push([lng, lat])
    }
  }
  return ring
}

function loadLandMask(): LandPolygon[] {
  if (landMaskCache) return landMaskCache
  const candidates = [
    path.join(process.cwd(), "public", "data", "crep", "ne_10m_land.geojson"),
    path.join(process.cwd(), "public", "data", "crep", "ne_50m_land.geojson"),
    path.join(process.cwd(), "public", "data", "geo", "ne_110m_land.geojson"),
  ]
  const file = candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[candidates.length - 1]
  const polygons: LandPolygon[] = []
  try {
    const geo = JSON.parse(fs.readFileSync(file, "utf8"))
    for (const feature of geo?.features ?? []) {
      const geometry = feature?.geometry
      const polygonSets =
        geometry?.type === "Polygon"
          ? [geometry.coordinates]
          : geometry?.type === "MultiPolygon"
            ? geometry.coordinates
            : []
      for (const polygon of polygonSets) {
        const outer = normalizeRing(polygon?.[0])
        if (outer.length < 4) continue
        const holes = Array.isArray(polygon)
          ? polygon.slice(1).map(normalizeRing).filter((ring) => ring.length >= 4)
          : []
        polygons.push({ bbox: ringBbox(outer), outer, holes })
      }
    }
  } catch {
    /* Natural Earth mask unavailable — fall back to coarse landPrior boxes. */
  }
  landMaskCache = polygons
  return polygons
}

function extraIslandLandPrior(lat: number, lng: number): boolean {
  const islands: Array<[number, number, number, number]> = [
    [-118.45, 33.39, 0.24, 0.1],
    [-118.50, 32.91, 0.22, 0.08],
    [-119.72, 34.0, 0.34, 0.12],
    [-117.27, 32.42, 0.08, 0.05],
    [-115.16, 32.28, 0.16, 0.08],
  ]
  for (const [centerLng, centerLat, rx, ry] of islands) {
    const dx = (lng - centerLng) / rx
    const dy = (lat - centerLat) / ry
    if (dx * dx + dy * dy <= 1) return true
  }
  return false
}

function inEllipse(lat: number, lng: number, centerLat: number, centerLng: number, rx: number, ry: number): boolean {
  const dx = (lng - centerLng) / rx
  const dy = (lat - centerLat) / ry
  return dx * dx + dy * dy <= 1
}

/** Known water bodies where terrestrial nature markers must not appear (SD / SoCal focus). */
function southernCaliforniaWaterMask(lat: number, lng: number): boolean {
  const waterAreas: Array<[number, number, number, number]> = [
    [32.775, -117.225, 0.042, 0.028], // Mission Bay
    [32.706, -117.190, 0.030, 0.075], // San Diego Bay channel
    [32.678, -117.175, 0.050, 0.058], // San Diego Bay central
    [32.730, -117.200, 0.022, 0.028], // Downtown waterfront / harbor
    [32.692, -117.234, 0.028, 0.038], // Point Loma / harbor mouth
    [32.679, -117.158, 0.026, 0.042], // Coronado / NAS North Island channel
    [32.635, -117.130, 0.040, 0.055], // South Bay
    [32.640, -117.050, 0.042, 0.058], // Chula Vista / south SD Bay
    [32.623, -117.092, 0.038, 0.034], // Imperial Beach / Tijuana estuary mouth
    [32.565, -117.105, 0.026, 0.028], // Tijuana Estuary
    [32.848, -117.272, 0.032, 0.026], // La Jolla cove / kelp beds
    [32.960, -117.255, 0.045, 0.030], // Torrey Pines / Del Mar nearshore
    [33.300, -115.840, 0.26, 0.12], // Salton Sea
    [33.200, -117.390, 0.055, 0.035], // Oceanside / Camp Pendleton nearshore
    [32.790, -117.250, 0.035, 0.025], // Pacific Beach / Mission Beach surf zone
  ]
  return waterAreas.some(([centerLat, centerLng, rx, ry]) => inEllipse(lat, lng, centerLat, centerLng, rx, ry))
}

function southernCaliforniaLandMask(lat: number, lng: number): boolean | null {
  if (lng < -121.2 || lng > -114.0 || lat < 30.0 || lat > 35.2) return null
  if (extraIslandLandPrior(lat, lng)) return true
  if (southernCaliforniaWaterMask(lat, lng)) return false
  return null
}

function landPrior(lat: number, lng: number): number {
  if (lat < -58 || lat > 78) return 0
  const boxes: Array<[number, number, number, number]> = [
    [-170, -52, 8, 72],
    [-96, -34, -56, 18],
    [-12, 45, -35, 38],
    [-12, 45, 35, 72],
    [25, 180, 5, 72],
    [95, 155, -45, -8],
    [43, 51, -26, -11],
    [164, 179, -48, -33],
    [-10, 2, 50, 60],
    [120, 150, -8, 2],
  ]
  let score = 0
  for (const [west, east, south, north] of boxes) {
    if (lng < west || lng > east || lat < south || lat > north) continue
    const edge = Math.min(lng - west, east - lng, lat - south, north - lat)
    score = Math.max(score, clamp01(edge / 5 + 0.18))
  }
  return clamp01(score)
}

export function isLikelyLandInPolygons(lat: number, lng: number, polygons: LandPolygon[]): boolean {
  if (lat < -58 || lat > 83.7) return false
  const socal = southernCaliforniaLandMask(lat, lng)
  if (socal !== null) return socal
  if (extraIslandLandPrior(lat, lng)) return true
  if (polygons.length === 0) return false
  for (const polygon of polygons) {
    const [west, south, east, north] = polygon.bbox
    if (lng < west || lng > east || lat < south || lat > north) continue
    if (!pointInRing(lng, lat, polygon.outer)) continue
    if (polygon.holes.some((hole) => pointInRing(lng, lat, hole))) return false
    return true
  }
  return false
}

/** True when coordinates fall on land (Natural Earth + regional water carve-outs). */
export function isNatureObservationOnLand(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (lat < -58 || lat > 83.7) return false
  const socal = southernCaliforniaLandMask(lat, lng)
  if (socal !== null) return socal
  if (extraIslandLandPrior(lat, lng)) return true
  const polygons = loadLandMask()
  if (polygons.length === 0) return landPrior(lat, lng) > 0
  return isLikelyLandInPolygons(lat, lng, polygons)
}

export function normalizeTaxonToken(value: unknown): string {
  return String(value || "").trim().toLowerCase()
}

export function isMarineNatureTaxon(kingdom?: string, iconicTaxon?: string): boolean {
  const tokens = [normalizeTaxonToken(kingdom), normalizeTaxonToken(iconicTaxon)]
  return tokens.some((token) => token && MARINE_TAXON_TOKENS.has(token))
}

/** Terrestrial taxa must be on land; marine taxa may appear in water. */
export function isPlausibleNatureMarkerPlacement(
  lat: number,
  lng: number,
  kingdom?: string,
  iconicTaxon?: string,
): boolean {
  if (isMarineNatureTaxon(kingdom, iconicTaxon)) return true
  return isNatureObservationOnLand(lat, lng)
}

export function landPolygonsForBounds(bounds: {
  north: number
  south: number
  east: number
  west: number
}): LandPolygon[] | null {
  const polygons = loadLandMask()
  if (polygons.length === 0) return null
  const west = bounds.west - 0.5
  const east = bounds.east + 0.5
  const south = bounds.south - 0.5
  const north = bounds.north + 0.5
  return polygons.filter((polygon) => {
    const [pw, ps, pe, pn] = polygon.bbox
    return pe >= west && pw <= east && pn >= south && ps <= north
  })
}

/** Clear cached land polygons (tests only). */
export function clearNatureLandMaskCacheForTests(): void {
  landMaskCache = null
}
