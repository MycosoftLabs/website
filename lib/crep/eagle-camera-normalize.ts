/**
 * Eagle Eye camera display normalization — May 24, 2026
 *
 * MINDEX legacy rows and early ingest mixed air-quality monitors, reef
 * sensors, hydrology gauges, and beach env stations into the same layer
 * as CCTV. They pin in sloughs / ocean and read as "cameras in Mexico or
 * the water" on the border corridor map.
 *
 * Also applies hand-verified coordinate overrides for US-side border POIs.
 */

export interface EagleCameraLike {
  id?: string
  provider?: string
  name?: string | null
  lat?: number | null
  lng?: number | null
  stream_url?: string | null
  embed_url?: string | null
  media_url?: string | null
  status?: string | null
  source_status?: string | null
  kind?: string | null
  category?: string | null
}

/** Not video cameras — environmental / hydrology / reef monitoring. */
const SENSOR_ONLY_PROVIDERS = new Set([
  "sdapcd",
  "ibwc",
  "project_oyster",
  "sandiego_deh",
  "noaa-coops",
  "noaa_trnerr",
  "navy",
])

const SENSOR_ID_PREFIXES = [
  "po-tjne-",
  "ibwc-",
  "noaa-ndbc-",
  "noaa-cdip-",
  "sdapcd-",
  "beach-",
]

/** Known camera providers — show even when stream URL is temporarily null. */
const KNOWN_CAMERA_PROVIDERS = new Set([
  "caltrans",
  "shinobi",
  "earthcam",
  "webcamtaxi",
  "hdontap",
  "windy",
  "nps",
  "usgs",
  "alertwildfire",
  "hpwren",
  "surfline",
  "scripps",
  "port-of-sd",
  "skylinewebcams",
  "511",
  "511ga",
  "511sf",
  "nysdot",
  "nyctmc",
  "ndot",
  "wsdot",
  "fdot",
  "txdot",
  "youtube_live",
  "unifi-protect",
  "static-seed",
  "public-webcam",
  "ipcamlive",
])

const INFO_ONLY_PROVIDERS = new Set([
  "cbp",
  "parks-ca",
])

const STREAM_REQUIRED_PROVIDERS = new Set([
  "nysdot",
  "port-of-sd",
  "usgs",
  "webcamtaxi",
])

const UNAVAILABLE_SOURCE_STATUSES = new Set([
  "offline",
  "unavailable",
  "retired",
  "disabled",
  "blocked",
  "deprecated",
  "temporarily_unavailable",
])

const KNOWN_UNAVAILABLE_SOURCE_IDS = new Set([
  "vegas-youtube-fremont-live",
  "vegas-youtube-strip-live",
  "vegas-youtube-cityhall",
  "ec-vegas-strip",
  "earthcam-san-diego-bay",
  "earthcam-sd-bay",
  "earthcam-imperial-beach-pier",
  "nps-cabrillo-ref",
  "caltrans-d11-sr75-silverstrand",
  "caltrans-d11-sr75-coronado-bridge",
  "caltrans-d11-sr75-orange-ave",
  "caltrans-d11-sr75-palm-ave",
  "scripps-pier-sio-cam",
])

const LOCATION_CONTEXT_SOURCE_IDS = new Set([
  "caltrans-d11-sr75-silverstrand",
  "caltrans-d11-sr75-coronado-bridge",
  "caltrans-d11-sr75-orange-ave",
  "caltrans-d11-sr75-palm-ave",
  "earthcam-imperial-beach-pier",
  "earthcam-san-diego-bay",
  "earthcam-sd-bay",
  "nps-cabrillo-ref",
  "skylinewebcams-ocean-beach",
  "vegas-earthcam-fremont",
  "vegas-ndot-i15-sahara",
  "vegas-ndot-us95-summerlin",
  "vegas-ndot-215-charleston",
  "scripps-pier-sio-cam",
])

/** id → [lng, lat] verified US-side / on-land positions. */
const COORDINATE_OVERRIDES: Record<string, [number, number]> = {
  // CBP wait-time POE duplicate in manual seed was ~1 km south of official POE.
  "cbp-otay-mesa-poe-ref": [-116.9395, 32.5527],
  // Border Field State Park — park entrance on US land (not Tijuana Slough water).
  "parks-ca-border-field": [-117.1272, 32.538],
  // Imperial Beach pier cams — on pier head, not offshore.
  "surfline-imperial-beach-pier": [-117.1328, 32.5789],
  "earthcam-imperial-beach-pier": [-117.1328, 32.5789],
  // Caltrans manual seeds (curated vs stale bake drift).
  "caltrans-d11-c214-sb5-via-de-san-ysidro": [-117.0295, 32.5432],
  "caltrans-d11-c105-i5-dairy-mart-road": [-117.0464, 32.5506],
  "caltrans-d11-sr75-palm-ave": [-117.126, 32.579],
}

function hasPlayableUrl(source: EagleCameraLike): boolean {
  return !!(source.stream_url || source.embed_url || source.media_url)
}

function hasDirectPlayableMedia(source: EagleCameraLike): boolean {
  return !!(source.stream_url || source.media_url)
}

/** Environmental / hydrology rows — not Eagle Eye video cameras. */
export function isEagleEnvironmentalSensor(source: EagleCameraLike): boolean {
  const id = String(source.id || "")
  const provider = String(source.provider || "").toLowerCase()
  if (SENSOR_ONLY_PROVIDERS.has(provider)) return true
  if (provider.startsWith("noaa") && !hasPlayableUrl(source)) return true
  return SENSOR_ID_PREFIXES.some((prefix) => id.startsWith(prefix))
}

function isSensorOnly(source: EagleCameraLike): boolean {
  return isEagleEnvironmentalSensor(source)
}

function isUnavailableSource(source: EagleCameraLike): boolean {
  const id = String(source.id || "")
  if (KNOWN_UNAVAILABLE_SOURCE_IDS.has(id)) return true

  const rawStatus = String(source.source_status ?? source.status ?? "").trim().toLowerCase()
  return rawStatus ? UNAVAILABLE_SOURCE_STATUSES.has(rawStatus) : false
}

export { SENSOR_ONLY_PROVIDERS }

export function isDisplayableEagleCamera(source: EagleCameraLike): boolean {
  if (!Number.isFinite(Number(source.lat)) || !Number.isFinite(Number(source.lng))) {
    return false
  }
  const id = String(source.id || "")
  if (isUnavailableSource(source) && !LOCATION_CONTEXT_SOURCE_IDS.has(id)) return false
  if (isSensorOnly(source)) return false

  const provider = String(source.provider || "").toLowerCase()
  if (STREAM_REQUIRED_PROVIDERS.has(provider)) return hasDirectPlayableMedia(source)
  if (INFO_ONLY_PROVIDERS.has(provider)) return hasDirectPlayableMedia(source)
  if (KNOWN_CAMERA_PROVIDERS.has(provider)) return true

  // Unknown ingest — require a playable URL so we don't pin mystery rows.
  return hasPlayableUrl(source)
}

export function normalizeEagleCameraCoords<T extends EagleCameraLike>(source: T): T {
  const id = String(source.id || "")
  const override = COORDINATE_OVERRIDES[id]
  if (!override) return source
  const [lng, lat] = override
  return { ...source, lng, lat }
}

export function normalizeEagleCameraSource<T extends EagleCameraLike>(source: T): T {
  return normalizeEagleCameraCoords(source)
}

export function filterEagleVideoSources<T extends EagleCameraLike>(sources: T[]): T[] {
  return sources
    .map(normalizeEagleCameraSource)
    .filter(isDisplayableEagleCamera)
}
