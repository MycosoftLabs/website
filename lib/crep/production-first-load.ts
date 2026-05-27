/**
 * Production first-load profile for CREP / Earth Simulator (May 24, 2026).
 *
 * Filters ON at refresh; infra line layers (cables, rails, TX) paint globally;
 * infra point icons use tiered minzoom (DCs at country+, telecom detail at state+).
 */

import {
  DATA_CENTER_MIN_ZOOM,
  INFRA_POINT_ICON_MIN_ZOOM,
  POWER_PLANT_MIN_ZOOM,
  TELECOM_CITY_MIN_ZOOM,
  TELECOM_DETAIL_MIN_ZOOM,
} from "@/lib/crep/lod-policy"

export {
  DATA_CENTER_MIN_ZOOM,
  INFRA_POINT_ICON_MIN_ZOOM,
  POWER_PLANT_MIN_ZOOM,
  TELECOM_CITY_MIN_ZOOM,
  TELECOM_DETAIL_MIN_ZOOM,
} from "@/lib/crep/lod-policy"

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

/** Per-layer minzoom floor for infra point/symbol/heatmap layers. */
export function getInfraLayerMinZoom(layerId: string): number {
  const id = layerId.toLowerCase()

  if (
    id.includes("dcs-global") ||
    id.includes("static-dcs") ||
    id.includes("im3-dc") ||
    id.includes("sdtj-data-centers")
  ) {
    return DATA_CENTER_MIN_ZOOM
  }

  if (
    id.includes("crep-plants") ||
    id.includes("crep-pp-global") ||
    id.includes("crep-eia-") ||
    id.includes("power-plant") ||
    id.includes("powerplant")
  ) {
    return POWER_PLANT_MIN_ZOOM
  }

  if (
    id.includes("sdtj-cell") ||
    id.includes("sdtj-am-fm") ||
    id.includes("celltowers-bbox")
  ) {
    return TELECOM_CITY_MIN_ZOOM
  }

  if (
    id.includes("celltower") ||
    id.includes("cell-tower") ||
    id.includes("crep-radio") ||
    id.includes("signal-heatmap") ||
    id.includes("signalheatmap")
  ) {
    return TELECOM_DETAIL_MIN_ZOOM
  }

  return INFRA_POINT_ICON_MIN_ZOOM
}

/** MapLibre layer spec: gate infra point/symbol icons, never live movers or lines. */
export function applyInfraPointIconMinZoom<T extends { id?: string; type?: string; minzoom?: number }>(
  spec: T,
): T {
  const id = spec.id ?? ""
  if (id.startsWith("crep-live-")) return spec
  if (spec.type === "line" || spec.type === "raster") return spec
  if (
    spec.type !== "circle" &&
    spec.type !== "symbol" &&
    spec.type !== "fill" &&
    spec.type !== "heatmap"
  ) {
    return spec
  }
  const floor = getInfraLayerMinZoom(id)
  if (spec.minzoom != null && spec.minzoom >= floor) return spec
  return { ...spec, minzoom: floor }
}
