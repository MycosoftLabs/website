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
  "wsdot",
  "fdot",
  "txdot",
  "youtube_live",
  "unifi-protect",
  "static-seed",
  "public-webcam",
])

const INFO_ONLY_PROVIDERS = new Set([
  "cbp",
  "parks-ca",
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

export { SENSOR_ONLY_PROVIDERS }

export function isDisplayableEagleCamera(source: EagleCameraLike): boolean {
  if (!Number.isFinite(Number(source.lat)) || !Number.isFinite(Number(source.lng))) {
    return false
  }
  if (isSensorOnly(source)) return false

  const provider = String(source.provider || "").toLowerCase()
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
