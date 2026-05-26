/**
 * Earth Simulator staged boot profile (May 24, 2026).
 * Single source of truth for first-paint layer/pump behavior on /natureos/earth-simulator.
 */

/** Set NEXT_PUBLIC_EARTH_SIM_STAGED_BOOT=0 to revert to legacy mount behavior. */
export const EARTH_SIM_STAGED_BOOT =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_EARTH_SIM_STAGED_BOOT === "0"
    ? false
    : true

export const EARTH_SIM_DEFAULT_CENTER: [number, number] = [-98.5, 39.8]
export const EARTH_SIM_DEFAULT_ZOOM = 3

/** Continental US bbox for preload before map bounds are ready. */
export const EARTH_SIM_US_BBOX = {
  south: 24,
  north: 50,
  west: -125,
  east: -66,
} as const

/** San Diego / Tijuana corridor — instant nature + infra preload for city fly-to demos. */
export const EARTH_SIM_SD_BBOX = {
  south: 32.45,
  north: 33.35,
  west: -117.45,
  east: -116.85,
} as const

/** Base map + EcM fungal raster visible at US zoom on refresh (AM off — mutually exclusive). */
export const EARTH_SIM_BASE_LAYER_IDS = [
  "satImagery",
  "bathymetry",
  "topography",
  "fungalAtlasECM",
] as const

/** Default fungal atlas layer at Earth Simulator refresh — EcM only, never AM+ECM together. */
export const EARTH_SIM_DEFAULT_FUNGAL_LAYER_ID = "fungalAtlasECM" as const

/** Infra line layers that paint instantly at z≈3 (PMTiles / line / raster). */
export const EARTH_SIM_INSTANT_INFRA_LINE_IDS = [
  "submarineCables",
  "txLinesGlobal",
] as const

/** Infra toggles ON at refresh but point icons gated to z≥7 in MapLibre layers. */
export const EARTH_SIM_DEFERRED_INFRA_POINT_IDS = [
  "transmissionLines",
  "txLinesFull",
  "txLinesSub",
  "substations",
  "powerPlants",
  "powerPlantsG",
  "cellTowers",
  "cellTowersG",
  "dataCenters",
  "dataCentersG",
  "ports",
  "factories",
  "factoriesG",
  "pipelines",
  "radioStations",
  "airports",
  "seaports",
] as const

/** Natural event categories ON at refresh (space-weather layer `solar` excluded). */
export const EARTH_SIM_EVENT_LAYER_IDS = [
  "earthquakes",
  "volcanoes",
  "wildfires",
  "storms",
  "lightning",
  "tornadoes",
  "events",
] as const

export const EARTH_SIM_ALWAYS_ON_INFRA_IDS = ["cctv", "militaryBases"] as const

/** Fungi only at first paint — movers/cameras load after user opt-in (May 24, 2026 QA crash fix). */
export const EARTH_SIM_INSTANT_LIVE_LAYER_IDS = ["fungi"] as const

/** Movers, space weather, Earth-2, AQI/transit, devices, projects — OFF at refresh. */
export const EARTH_SIM_OFF_AT_BOOT_LAYER_IDS = [
  "aviation",
  "ships",
  "satellites",
  "eagleEyeCameras",
  "aviationRoutes",
  "shipRoutes",
  "fishing",
  "containers",
  "orbitalDebris",
  "debrisCloud",
  "solar",
  "auroraOverlay",
  "sunEarthImpact",
  "realisticClouds",
  "liveAqi",
  "liveTransit",
  "earth2Forecast",
  "earth2Nowcast",
  "earth2Spore",
  "earth2Wind",
  "earth2Temp",
  "earth2Precip",
  "fungalAtlasAM",
  "fungalAtlasSamples",
  "fungalAtlasMycelium",
  "fungalAtlasRare",
  "fungalAtlasProtected",
  "fungalAtlasUncertainty",
  "fungalAtlasFci",
  "mycobrain",
  "devMushroom1",
  "devHyphae1",
  "sporebase",
  "devMycoNode",
  "devAlarm",
  "devPsathyrella",
  "partners",
  "smartfence",
  "biodiversity",
  "weather",
  "buoys",
  "population",
  "humanMovement",
  "events_human",
  "vehicles",
  "drones",
  "militaryAir",
  "militaryNavy",
  "tanks",
  "militaryDrones",
  "factories",
  "co2Sources",
  "methaneSources",
  "oilGas",
  "metalOutput",
  "waterPollution",
  "eagleEyeEvents",
  "im3DataCenters",
  "im3DataCenterFootprints",
  "eiaOperating",
  "eiaPlanned",
  "eiaRetired",
  "eiaCanceled",
  "radar",
  "signalHeatmap",
  "hospitals",
  "fireStations",
  "universities",
  "railwayTrains",
  "droneNoFly",
  "mapboxSatelliteStreets",
  "mapbox3dBuildings",
  "photorealistic3D",
  "jurisdictionCountry",
  "jurisdictionState",
  "jurisdictionCounty",
  "jurisdictionFema",
] as const

const PROJECT_LAYER_PREFIXES = [
  "tijuana",
  "project",
  "oyster",
  "mojave",
  "nyc",
  "dc",
  "vegas",
  "sdtj",
  "h2s",
  "tj",
] as const

export const EARTH_SIM_PROFILE_ON_LAYER_IDS = new Set<string>([
  ...EARTH_SIM_BASE_LAYER_IDS,
  ...EARTH_SIM_INSTANT_INFRA_LINE_IDS,
  ...EARTH_SIM_EVENT_LAYER_IDS,
  ...EARTH_SIM_ALWAYS_ON_INFRA_IDS,
  ...EARTH_SIM_INSTANT_LIVE_LAYER_IDS,
])

/** Nature kingdom fetch allowed; non-fungi kingdoms off at boot. */
export const EARTH_SIM_FUNGI_ONLY_GROUND_FILTER = {
  showFungi: true,
  showPlants: false,
  showBirds: false,
  showMammals: false,
  showReptiles: false,
  showInsects: false,
  showMarineLife: false,
  showAmFungi: false,
  showEcmFungi: true,
  showMyceliumHeat: false,
  showMycoBrain: false,
  showSporeBase: false,
  showSmartFence: false,
  showPartnerNetworks: false,
  showEarthquakes: true,
  showVolcanoes: true,
  showWildfires: true,
  showStorms: true,
  showLightning: true,
  showTornadoes: true,
  showFloods: true,
  showMilitaryBases: true,
  showPowerPlants: true,
  showFactories: true,
} as const

export const EARTH_SIM_FUNGAL_OPACITY = 0.35

/** DOM fungal markers when zoom ≥ this (US fly-to is z≈3). */
export const EARTH_SIM_FUNGAL_DOM_MIN_ZOOM = 3

/** Event DOM caps on Earth Simulator (always capped, even at city zoom). */
export function getEarthSimulatorEventDomCap(zoom: number): number {
  if (zoom < 3) return 300
  if (zoom < 5) return 400
  if (zoom < 7) return 600
  if (zoom < 9) return 800
  return 1500
}

export const EARTH_SIM_NATURE_STORE_CAP = 8_000

/** Instant MINDEX paint limit on Earth Simulator first load. */
export const EARTH_SIM_NATURE_INSTANT_LIMIT = 4_000

/** Defer live aircraft/vessel/satellite pump until after map settles (ms). */
export const EARTH_SIM_LIVE_STREAM_DELAY_MS = 18_000

export interface EarthSimBootDebugSnapshot {
  stagedBoot: boolean
  isStreaming: boolean
  showInfraLayers: boolean
  auditAllOffMode: boolean
  enabledLayerIds: string[]
  renderFungalDomMarkers: boolean
  mapZoom: number | null
}

export interface LayerConfigLike {
  id: string
  enabled: boolean
  opacity?: number
}

export function isEarthSimulatorPathFromWindow(): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.location.pathname.includes("/natureos/earth-simulator")
  } catch {
    return false
  }
}

export function isEarthSimStagedBootActive(): boolean {
  return EARTH_SIM_STAGED_BOOT && isEarthSimulatorPathFromWindow()
}

export function isEarthSimProjectLayer(id: string): boolean {
  const lower = id.toLowerCase()
  return PROJECT_LAYER_PREFIXES.some((prefix) => lower.startsWith(prefix))
}

export function getEarthSimInitialFungalLayerIds(): Set<string> {
  return new Set([EARTH_SIM_DEFAULT_FUNGAL_LAYER_ID])
}

export function applyEarthSimulatorBootToLayers<T extends LayerConfigLike>(layers: T[]): T[] {
  const offSet = new Set<string>(EARTH_SIM_OFF_AT_BOOT_LAYER_IDS)
  return layers.map((layer) => {
    if (layer.id === "fungalAtlasECM") {
      return { ...layer, enabled: true, opacity: EARTH_SIM_FUNGAL_OPACITY }
    }
    if (layer.id === "fungalAtlasAM") {
      return { ...layer, enabled: false, opacity: EARTH_SIM_FUNGAL_OPACITY }
    }
    if (offSet.has(layer.id) || isEarthSimProjectLayer(layer.id)) {
      return { ...layer, enabled: false }
    }
    if (EARTH_SIM_PROFILE_ON_LAYER_IDS.has(layer.id)) {
      const opacity =
        layer.id === "fungalAtlasECM" ? EARTH_SIM_FUNGAL_OPACITY : layer.opacity
      return { ...layer, enabled: true, opacity }
    }
    return { ...layer, enabled: false }
  })
}

export function publishEarthSimBootDebug(snapshot: EarthSimBootDebugSnapshot): void {
  if (typeof window === "undefined") return
  const w = window as unknown as {
    __crep_boot_profile?: EarthSimBootDebugSnapshot
    EARTH_SIMULATOR_BOOT_PROFILE?: typeof EARTH_SIMULATOR_BOOT_PROFILE
  }
  w.__crep_boot_profile = snapshot
  w.EARTH_SIMULATOR_BOOT_PROFILE = EARTH_SIMULATOR_BOOT_PROFILE
}

/** Canonical boot profile object for console inspection. */
export const EARTH_SIMULATOR_BOOT_PROFILE = {
  stagedBoot: EARTH_SIM_STAGED_BOOT,
  center: EARTH_SIM_DEFAULT_CENTER,
  zoom: EARTH_SIM_DEFAULT_ZOOM,
  baseLayers: EARTH_SIM_BASE_LAYER_IDS,
  instantInfraLines: EARTH_SIM_INSTANT_INFRA_LINE_IDS,
  deferredInfraPoints: EARTH_SIM_DEFERRED_INFRA_POINT_IDS,
  events: EARTH_SIM_EVENT_LAYER_IDS,
  alwaysOnInfra: EARTH_SIM_ALWAYS_ON_INFRA_IDS,
  instantLiveLayers: EARTH_SIM_INSTANT_LIVE_LAYER_IDS,
  offAtBoot: EARTH_SIM_OFF_AT_BOOT_LAYER_IDS,
  fungalOpacity: EARTH_SIM_FUNGAL_OPACITY,
  fungalDomMinZoom: EARTH_SIM_FUNGAL_DOM_MIN_ZOOM,
  defaultFungalLayer: EARTH_SIM_DEFAULT_FUNGAL_LAYER_ID,
  natureStoreCap: EARTH_SIM_NATURE_STORE_CAP,
  natureInstantLimit: EARTH_SIM_NATURE_INSTANT_LIMIT,
  liveStreamDelayMs: EARTH_SIM_LIVE_STREAM_DELAY_MS,
  usBbox: EARTH_SIM_US_BBOX,
} as const
