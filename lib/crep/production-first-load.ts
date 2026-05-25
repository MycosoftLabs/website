/**
 * Production first-load profile for CREP / Earth Simulator (May 24, 2026).
 *
 * Filters ON at refresh; infra line layers (cables, rails, TX) paint globally;
 * infra point icons gated at INFRA_POINT_ICON_MIN_ZOOM for FPS.
 */

import { INFRA_POINT_ICON_MIN_ZOOM } from "@/lib/crep/lod-policy"

export { INFRA_POINT_ICON_MIN_ZOOM }

export function isProductionFirstLoadRoute(): boolean {
  if (typeof window === "undefined") return false
  try {
    const path = window.location.pathname
    return path.includes("/natureos/earth-simulator") || path.includes("/dashboard/crep")
  } catch {
    return false
  }
}

export function isEarthSimulatorProductionRoute(): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.location.pathname.includes("/natureos/earth-simulator")
  } catch {
    return false
  }
}

/** MapLibre layer spec: gate infra point/symbol icons, never live movers or lines. */
export function applyInfraPointIconMinZoom<T extends { id?: string; type?: string; minzoom?: number }>(
  spec: T,
): T {
  const id = spec.id ?? ""
  if (id.startsWith("crep-live-")) return spec
  if (spec.type === "line" || spec.type === "raster") return spec
  if (spec.type !== "circle" && spec.type !== "symbol" && spec.type !== "fill") return spec
  const floor = INFRA_POINT_ICON_MIN_ZOOM
  if (spec.minzoom != null && spec.minzoom >= floor) return spec
  return { ...spec, minzoom: floor }
}
