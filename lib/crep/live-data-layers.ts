import { fieldLayerList } from "@/lib/crep/fields/registry"

/**
 * Earth Simulator Live Data — Arraylake cubes + aerosol-equivalent layers.
 * These are NOT Environmental Conditions. They render under that block.
 * Default OFF. Empty bake / optional Earth-2 → NOT_SUPPLIED, not UNBOUND.
 */
export const AEROSOL_LIVE_DATA_LAYER_IDS = [
  "aerosolParticulate",
  "aerosolModeledDispersal",
  "aerosolWind",
  "aerosolSmoke",
  "mindexAirQuality",
  "mindexFirms",
] as const

export const AEROSOL_LIVE_DATA_BFFS: Record<(typeof AEROSOL_LIVE_DATA_LAYER_IDS)[number], string> = {
  aerosolParticulate: "/api/crep/environment/air-quality",
  aerosolModeledDispersal: "/api/earth2/spore-dispersal",
  aerosolWind: "/api/earth2/layers/wind",
  aerosolSmoke: "NOT_SUPPLIED",
  mindexAirQuality: "/api/crep/environment/air-quality",
  mindexFirms: "/api/crep/environment/wildfires",
}

export function liveDataLayerIds(): string[] {
  return [
    ...AEROSOL_LIVE_DATA_LAYER_IDS,
    ...fieldLayerList().map((row) => row.layerId),
  ]
}

export function isLiveDataLayerId(id: string): boolean {
  return id.startsWith("crep-field-") || (AEROSOL_LIVE_DATA_LAYER_IDS as readonly string[]).includes(id)
}

export function fieldBffUrl(layerId: string): string {
  if (!layerId.startsWith("crep-field-")) return ""
  const rest = layerId.slice("crep-field-".length)
  const dash = rest.lastIndexOf("-")
  if (dash <= 0) return "/api/crep/field/_catalog"
  return `/api/crep/field/${rest.slice(0, dash)}/${rest.slice(dash + 1)}`
}
