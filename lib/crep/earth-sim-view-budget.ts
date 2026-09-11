/**
 * Earth Sim viewport + memory budget for the ITDX + weather + species combo.
 *
 * Date: September 11, 2026
 *
 * Logical viewport (camera + pad + zoom span cap) is the only fetch/paint
 * window. Fort Stewart / CONUS must not pull planet-wide species or a second
 * CREP stack. ECM/AM stay MapLibre XYZ tiles in view. No mock data.
 * RJ Ricasata = CFO.
 */

import {
  boundsIntersect,
  getLogicalViewportBounds,
  isEarthSimScenarioActive,
  type LngLatBounds,
} from "@/lib/crep/viewport-memory-governor"

export type SpeciesFetchBounds = LngLatBounds

export const CONUS_ITDX_MAX_ANIMATED = 2
export const EARTH_SIM_NATURE_STORE_CAP_BASE = 8_000
export const EARTH_SIM_NATURE_STORE_CAP_COMBO = 4_000
export const EARTH_SIM_NATURE_FETCH_CONUS = 600
export const EARTH_SIM_NATURE_FETCH_CITY = 1_200

const PLANET_LAT_SPAN = 70
const PLANET_LNG_SPAN = 140

export function boundsSpan(b: LngLatBounds): { lat: number; lng: number } {
  const lat = Math.abs(b.north - b.south)
  const lng = b.west <= b.east ? Math.abs(b.east - b.west) : 360 - Math.abs(b.west - b.east)
  return { lat, lng }
}

export function isPlanetWideBounds(b: LngLatBounds | null | undefined): boolean {
  if (!b) return false
  const { lat, lng } = boundsSpan(b)
  return lat >= PLANET_LAT_SPAN || lng >= PLANET_LNG_SPAN
}

/**
 * Prefer the logical camera window. Raw getBounds() on a tilted globe is
 * planet-wide even when Fort Stewart / CONUS is framed.
 */
export function resolveSpeciesFetchBounds(
  map: Parameters<typeof getLogicalViewportBounds>[0],
  raw: LngLatBounds | null | undefined,
  fallback: LngLatBounds,
): LngLatBounds {
  const logical = getLogicalViewportBounds(map)
  if (logical && !isPlanetWideBounds(logical)) return logical
  if (raw && !isPlanetWideBounds(raw)) return raw
  if (logical) return logical
  if (raw) return raw
  return fallback
}

export function speciesStoreCapForEarthSim(): number {
  return isEarthSimScenarioActive() ? EARTH_SIM_NATURE_STORE_CAP_COMBO : EARTH_SIM_NATURE_STORE_CAP_BASE
}

export function speciesFetchLimitForZoom(zoom: number, earthSimCombo: boolean): number {
  if (zoom >= 8) return earthSimCombo ? 900 : EARTH_SIM_NATURE_FETCH_CITY
  if (zoom >= 5) return earthSimCombo ? 700 : 1_000
  return earthSimCombo ? 400 : EARTH_SIM_NATURE_FETCH_CONUS
}

export function speciesInViewCapForZoom(zoom: number, earthSimCombo: boolean): number {
  if (earthSimCombo) {
    if (zoom >= 9) return 360
    if (zoom >= 7) return 280
    if (zoom >= 5) return 220
    return 160
  }
  if (zoom >= 9) return 520
  if (zoom >= 7) return 420
  if (zoom >= 5) return 320
  return 220
}

export function bakedRegionsIntersectingView<T extends string>(
  regions: readonly T[],
  boxes: Record<T, LngLatBounds | { west: number; south: number; east: number; north: number }>,
  view: LngLatBounds | null | undefined,
): T[] {
  if (!view) return []
  return regions.filter((id) => boundsIntersect(view, boxes[id]))
}
