// @ts-nocheck
/**
 * Earth Intelligence Search Connectors — Mar 15, 2026
 *
 * Bridges ALL OEI connectors + external APIs into the unified search pipeline.
 * Each function takes a search query and returns results in the unified format.
 * All calls are fire-and-forget safe (catch errors internally, return []).
 *
 * Domains covered:
 *   1. Natural events — earthquakes, volcanoes, wildfires, storms, floods, lightning
 *   2. Aircraft — OpenSky ADS-B, FlightRadar24
 *   3. Vessels — AISstream AIS
 *   4. Satellites — CelesTrak TLE
 *   5. Weather — NWS alerts, Open-Meteo
 *   6. Emissions — Carbon Mapper, OpenAQ
 *   7. Infrastructure — OpenRailway, OpenStreetMap
 *   8. Devices — MycoBrain telemetry
 *   9. Space weather — NOAA SWPC
 *  10. All-life species — GBIF, eBird, OBIS, iNaturalist (beyond fungi)
 */

import type {
  EventResult,
  AircraftResult,
  VesselResult,
  SatelliteResult,
  WeatherResult,
  EmissionsResult,
  InfrastructureResult,
  DeviceResult,
  SpaceWeatherResult,
  CameraResult,
} from "./unified-search-sdk"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"
import { mapMindexEarthResponse, enrichEarthEntity } from "@/lib/search/earth-entity-bridge"
import { defineConnector, type ConnectorRunContext } from "@/lib/search/connectors/_framework"
import { getAllPowerPlants } from "@/lib/crep/registries/power-plant-registry"
import { resolveInternalBaseUrl } from "@/lib/internal-base-url"
import { FIELD_MYCOBRAIN_DEPLOYMENTS } from "@/lib/devices/field-deployments"

/** MINDEX `/api/mindex/unified-search/earth` may return non-arrays for empty buckets — never iterate or trust `.length` on unknown shapes. */
function asEarthBucket<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

/** One bad live connector must not reject the whole `Promise.all` (unified treats null earth as all-empty). */
async function safeEarthSlice<T>(p: Promise<T[]>): Promise<T[]> {
  try {
    const v = await p
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

/** Collapse duplicate EONET rows (different id strings) or same lat/lng/title/time from multiple sources. */
function deduplicateEarthEvents(events: EventResult[]): EventResult[] {
  const seen = new Set<string>()
  const out: EventResult[] = []
  for (const e of events) {
    const id = String(e.id || "").trim()
    const lat = Number(e.lat)
    const lng = Number(e.lng)
    const fp = `${e.type}|${lat.toFixed(2)}|${lng.toFixed(2)}|${(e.title || "").toLowerCase().replace(/\s+/g, " ").slice(0, 100)}|${(e.timestamp || "").slice(0, 10)}`
    const eonetNum = id.match(/eonet[-_:]?(\d+)/i)?.[1]
    const key = eonetNum ? `eonet:${eonetNum}` : fp
    if (seen.has(key)) continue
    seen.add(key)
    out.push(e)
  }
  return out
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function safeFetch(url: string, timeoutMs = 8000): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: "application/json",
        "User-Agent": "MycosoftFluidSearch/1.0 (+https://mycosoft.com/search)",
      },
    })
    if (!res.ok) return null
    return res
  } catch {
    return null
  }
}

function serverSelfFetchBases(requestOrigin?: string): string[] {
  const port = process.env.PORT || "3000"
  const bases = [
    resolveInternalBaseUrl(requestOrigin),
    requestOrigin,
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.NEXTAUTH_URL,
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
  ]
  const seen = new Set<string>()
  return bases
    .map((base) => String(base || "").trim().replace(/\/$/, ""))
    .filter((base) => {
      if (!base || seen.has(base)) return false
      seen.add(base)
      return true
    })
}

async function safeFetchSelfPath(requestOrigin: string | undefined, path: string, timeoutMs = 8000): Promise<Response | null> {
  for (const base of serverSelfFetchBases(requestOrigin)) {
    const res = await safeFetch(`${base}${path}`, timeoutMs)
    if (res) return res
  }
  return null
}

// ---------------------------------------------------------------------------
// 1. Natural Events (NASA EONET + USGS)
// ---------------------------------------------------------------------------

const EVENT_CATEGORY_MAP: Record<string, string[]> = {
  earthquake: ["earthquake", "seismic", "quake", "tremor", "richter", "magnitude"],
  volcano: ["volcano", "volcanic", "eruption", "lava", "magma", "caldera", "vesuvius", "etna", "kilauea"],
  wildfire: ["wildfire", "fire", "burn", "blaze", "flame", "arson", "forest fire"],
  storm: ["storm", "hurricane", "typhoon", "cyclone", "tornado", "twister", "thunder", "hail", "supercell"],
  flood: ["flood", "flooding", "deluge", "inundation", "flash flood", "river overflow"],
  lightning: ["lightning", "bolt", "thunder", "strike", "blitz"],
  tsunami: ["tsunami", "tidal wave", "seiche"],
  dust_haze: ["dust", "haze", "sandstorm", "saharan", "smoke", "smog"],
}

function detectEventCategory(query: string): string | null {
  const q = query.toLowerCase()
  for (const [category, keywords] of Object.entries(EVENT_CATEGORY_MAP)) {
    if (keywords.some(kw => q.includes(kw))) return category
  }
  return null
}

async function searchUSGSEarthquakes(limit = 10000): Promise<EventResult[]> {
  try {
    const res = await safeFetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/1.0_week.geojson",
      20000
    )
    if (!res) return []
    const data = await res.json()
    const features = Array.isArray(data.features) ? data.features : []

    return features.slice(0, limit).map((feature: Record<string, unknown>) => {
      const props = (feature.properties as Record<string, unknown> | undefined) || {}
      const geometry = (feature.geometry as Record<string, unknown> | undefined) || {}
      const coords = Array.isArray(geometry.coordinates) ? geometry.coordinates as number[] : [0, 0, 0]
      const magnitude = Number(props.mag)
      const mag = Number.isFinite(magnitude) ? magnitude : 0
      const depth = Number(coords[2])
      let severity = "info"
      if (mag >= 7) severity = "extreme"
      else if (mag >= 6) severity = "critical"
      else if (mag >= 5) severity = "high"
      else if (mag >= 4) severity = "medium"
      else if (mag >= 3) severity = "low"

      return {
        id: `usgs-${String(feature.id || props.code || `${coords[1]}-${coords[0]}-${props.time}`)}`,
        type: "earthquake" as const,
        title: `M${mag.toFixed(1)} Earthquake - ${String(props.place || "Unknown location")}`,
        description: `Magnitude ${mag.toFixed(1)} earthquake${Number.isFinite(depth) ? ` at ${depth.toFixed(1)} km depth` : ""}.`,
        lat: Number(coords[1]) || 0,
        lng: Number(coords[0]) || 0,
        magnitude: mag,
        severity,
        timestamp: props.time ? new Date(Number(props.time)).toISOString() : new Date().toISOString(),
        source: "USGS",
      }
    })
  } catch {
    return []
  }
}

export async function searchEvents(query: string, limit = 20): Promise<EventResult[]> {
  try {
    const category = detectEventCategory(query)
    if (category === "earthquake") {
      return searchUSGSEarthquakes(Math.max(limit, 10000))
    }

    let eonetCategory = ""
    if (category === "earthquake") eonetCategory = "earthquakes"
    else if (category === "volcano") eonetCategory = "volcanoes"
    else if (category === "wildfire") eonetCategory = "wildfires"
    else if (category === "storm" || category === "tornado") eonetCategory = "severeStorms"
    else if (category === "flood") eonetCategory = "floods"

    const eonetUrl = `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=${limit}${eonetCategory ? `&category=${eonetCategory}` : ""}`
    const res = await safeFetch(eonetUrl, 10000)
    if (!res) return []

    const data = await res.json()
    const events = data.events || []

    return events.slice(0, limit).map((e: Record<string, unknown>) => {
      const geom = (e.geometry as Array<Record<string, unknown>>)?.[0]
      const coords = (geom?.coordinates as number[]) || [0, 0]
      const cats = (e.categories as Array<Record<string, string>>)?.[0]

      let eventType: EventResult["type"] = "dust_haze"
      const catId = cats?.id || ""
      if (catId === "earthquakes") eventType = "earthquake"
      else if (catId === "volcanoes") eventType = "volcano"
      else if (catId === "wildfires") eventType = "wildfire"
      else if (catId === "severeStorms") eventType = "storm"
      else if (catId === "floods") eventType = "flood"

      return {
        id: `eonet-${e.id}`,
        type: eventType,
        title: (e.title as string) || "",
        description: (e.description as string) || `${eventType} event`,
        lat: coords[1] || 0,
        lng: coords[0] || 0,
        severity: undefined,
        timestamp: (geom?.date as string) || new Date().toISOString(),
        source: "NASA EONET",
      }
    })
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// 2. Aircraft (OpenSky Network)
// ---------------------------------------------------------------------------

const AIRCRAFT_KEYWORDS = [
  "aircraft", "airplane", "plane", "flight", "aviation", "jet",
  "ads-b", "adsb", "airline", "landing", "takeoff", "airspace",
  "flying",
]

export function isAircraftQuery(query: string): boolean {
  const q = query.toLowerCase()
  return AIRCRAFT_KEYWORDS.some(kw => q.includes(kw))
}

/**
 * Tight city bounding boxes intentionally narrow the live feed so a "flights over LA"
 * query lands on local traffic. Ocean/region queries (Pacific, Atlantic, …) and generic
 * flight queries deliberately return NO bounds so the feed stays GLOBAL — the Earth widget
 * zooms the camera to the region while every plane on Earth remains visible.
 */
function aircraftBoundsForQuery(query: string): URLSearchParams {
  const q = query.toLowerCase()
  const params = new URLSearchParams()
  const setBounds = (south: number, north: number, west: number, east: number) => {
    params.set("lamin", String(south))
    params.set("lamax", String(north))
    params.set("lomin", String(west))
    params.set("lomax", String(east))
  }

  if (q.includes("over la") || q.includes("los angeles")) setBounds(29.05, 39.05, -123.24, -113.24)
  else if (q.includes("over sf") || q.includes("san francisco")) setBounds(33.77, 41.77, -126.42, -118.42)
  // Region/ocean/global flight queries fetch worldwide aircraft (no bbox).
  return params
}

/** A "city" flight query is scoped to local traffic; everything else shows all planes globally. */
function isCityScopedAircraftQuery(query: string): boolean {
  const q = query.toLowerCase()
  return (
    q.includes("over la") ||
    q.includes("los angeles") ||
    q.includes("over sf") ||
    q.includes("san francisco")
  )
}

/**
 * Broad flight queries ("flights over the Pacific", "planes worldwide") should surface as many
 * aircraft as the globe can render, not the default page size. City-scoped queries keep the
 * smaller incoming limit so the local feed stays readable.
 */
function resolveAircraftLimit(query: string, limit: number): number {
  if (isCityScopedAircraftQuery(query)) return limit
  return Math.max(limit, 500)
}

function mapAircraftRow(a: Record<string, unknown>): AircraftResult {
  return {
    id: String(a.id || a.icao24 || a.icao || a.hex || `aircraft-${a.callsign || Date.now()}`),
    callsign: String(a.callsign || "").trim(),
    icao24: String(a.icao24 || a.icao || a.hex || ""),
    origin: String(a.origin || a.country || ""),
    lat: Number(a.lat ?? a.latitude ?? 0),
    lng: Number(a.lng ?? a.longitude ?? 0),
    altitude: Number(a.altitude ?? a.alt ?? 0),
    velocity: Number(a.velocity ?? a.speed ?? 0),
    heading: Number(a.heading ?? a.track ?? 0),
    onGround: Boolean(a.onGround ?? a.on_ground ?? false),
    source: String(a.source || "Aircraft registry"),
  }
}

export async function searchAircraft(query: string, origin = "", limit = 20): Promise<AircraftResult[]> {
  try {
    const effectiveLimit = resolveAircraftLimit(query, limit)
    const localParams = aircraftBoundsForQuery(query)
    localParams.set("limit", String(effectiveLimit))
    for (const base of serverSelfFetchBases(origin)) {
      const localRes = await safeFetch(`${base}/api/oei/flightradar24?${localParams.toString()}`, 15000)
      if (localRes) {
        const localData = await localRes.json()
        const localRows = localData.entities || localData.aircraft || localData.data || []
        const mapped = (localRows as Record<string, unknown>[])
          .map(mapAircraftRow)
          .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng))
          .slice(0, effectiveLimit)
        if (mapped.length > 0) return mapped
      }
    }

    const res = await safeFetch("https://opensky-network.org/api/states/all?extended=1", 10000)
    if (!res) return []
    const data = await res.json()
    const states = data.states || []

    const q = query.toLowerCase()
    let filtered = states

    // Only city-scoped queries narrow the feed. Ocean/region/global queries (e.g. "Pacific")
    // keep every plane on Earth so the map stays globally populated while it zooms to the region.
    if (q.includes("over la") || q.includes("los angeles")) {
      filtered = states.filter((s: unknown[]) => {
        const lat = s[6] as number, lng = s[5] as number
        return lat && lng && Math.abs(lat - 34.05) < 2 && Math.abs(lng + 118.24) < 2
      })
    } else if (q.includes("over sf") || q.includes("san francisco")) {
      filtered = states.filter((s: unknown[]) => {
        const lat = s[6] as number, lng = s[5] as number
        return lat && lng && Math.abs(lat - 37.77) < 2 && Math.abs(lng + 122.42) < 2
      })
    }

    return filtered.slice(0, effectiveLimit).map((s: unknown[]) => ({
      id: `opensky-${s[0]}`,
      callsign: ((s[1] as string) || "").trim(),
      icao24: (s[0] as string) || "",
      origin: (s[2] as string) || "",
      lat: (s[6] as number) || 0,
      lng: (s[5] as number) || 0,
      altitude: (s[7] as number) || 0,
      velocity: (s[9] as number) || 0,
      heading: (s[10] as number) || 0,
      onGround: (s[8] as boolean) || false,
      source: "OpenSky Network",
    }))
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// 3. Vessels (AISstream via internal API)
// ---------------------------------------------------------------------------

const VESSEL_KEYWORDS = [
  "vessel", "ship", "boat", "maritime", "port", "harbor", "harbour",
  "cargo", "tanker", "freighter", "cruise", "ferry", "ais", "mmsi",
  "marine traffic", "shipping", "naval",
]

export function isVesselQuery(query: string): boolean {
  const q = query.toLowerCase()
  return VESSEL_KEYWORDS.some(kw => q.includes(kw))
}

export async function searchVessels(query: string, origin: string, limit = 20): Promise<VesselResult[]> {
  try {
    const res = await safeFetchSelfPath(origin, `/api/oei/aisstream?limit=${limit}`, 10000)
    if (!res) return []
    const data = await res.json()
    const vessels = data.entities || data.vessels || data.data || []

    return (vessels as Record<string, unknown>[]).slice(0, limit).map((v) => ({
      id: `ais-${v.mmsi || v.id}`,
      name: (v.name as string) || (v.vessel_name as string) || "Unknown",
      mmsi: String(v.mmsi || v.id || ""),
      shipType: (v.ship_type as string) || (v.type as string) || "Unknown",
      lat: (v.lat as number) || (v.latitude as number) || 0,
      lng: (v.lng as number) || (v.longitude as number) || 0,
      speed: (v.speed as number) || (v.sog as number) || 0,
      heading: (v.heading as number) || (v.cog as number) || 0,
      destination: (v.destination as string) || undefined,
      source: "AISstream",
    }))
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// 4. Satellites (CelesTrak TLE)
// ---------------------------------------------------------------------------

const SATELLITE_KEYWORDS = [
  "satellite", "orbit", "space station", "iss", "starlink", "gps",
  "norad", "tle", "celestrak", "space debris", "hubble", "james webb",
]

export function isSatelliteQuery(query: string): boolean {
  const q = query.toLowerCase()
  return SATELLITE_KEYWORDS.some(kw => q.includes(kw))
}

export async function searchSatellites(query: string, origin: string, limit = 20): Promise<SatelliteResult[]> {
  try {
    let sats: Record<string, unknown>[] = []
    for (const base of serverSelfFetchBases(origin)) {
      const res = await safeFetch(`${base}/api/oei/satellites?category=active&limit=${limit}`, 25000)
      if (!res) continue
      const data = await res.json()
      const rows = data.entities || data.satellites || data.data || []
      if (Array.isArray(rows) && rows.length > 0) {
        sats = rows as Record<string, unknown>[]
        break
      }
    }
    if (sats.length === 0) return []

    return sats.slice(0, limit).map((s) => ({
      id: `sat-${s.norad_id || s.id}`,
      name: (s.name as string) || "Unknown",
      noradId: String(s.norad_id || s.noradId || s.id || ""),
      category: (s.category as string) || "active",
      lat: (s.lat as number) || (s.latitude as number) || 0,
      lng: (s.lng as number) || (s.longitude as number) || 0,
      altitude: (s.altitude as number) || (s.alt as number) || 0,
      velocity: (s.velocity as number) || undefined,
      source: "CelesTrak",
    }))
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// 5. Weather (NWS Alerts + Open-Meteo)
// ---------------------------------------------------------------------------

const WEATHER_KEYWORDS = [
  "weather", "forecast", "temperature", "wind", "rain", "snow",
  "humidity", "pressure", "precipitation", "cloud", "uv",
  "heat", "cold", "frost", "drought", "climate",
  "modis", "landsat", "airs", "radar", "barometer",
]

export function isWeatherQuery(query: string): boolean {
  const q = query.toLowerCase()
  return WEATHER_KEYWORDS.some(kw => q.includes(kw))
}

export async function searchWeather(query: string, origin: string, limit = 10): Promise<WeatherResult[]> {
  try {
    const results: WeatherResult[] = []

    // NWS Alerts
    const alertsRes = await safeFetchSelfPath(origin, `/api/oei/nws-alerts?limit=${limit}`)
    if (alertsRes) {
      const alertsData = await alertsRes.json()
      const alerts = alertsData.entities || alertsData.alerts || alertsData.data || []
      for (const a of (alerts as Record<string, unknown>[]).slice(0, limit)) {
        results.push({
          id: `nws-${a.id}`,
          type: "alert",
          title: (a.headline as string) || (a.title as string) || (a.event as string) || "Weather Alert",
          description: (a.description as string) || "",
          lat: (a.lat as number) || undefined,
          lng: (a.lng as number) || undefined,
          timestamp: (a.onset as string) || (a.effective as string) || new Date().toISOString(),
          source: "NWS",
        })
      }
    }

    if (results.length === 0) {
      const place = fallbackCoordsForKnownPlace(query)
      if (place) {
        const params = new URLSearchParams({
          latitude: String(place.lat),
          longitude: String(place.lon),
          current: "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,weather_code",
          timezone: "auto",
        })
        const meteo = await safeFetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, 10000)
        if (meteo) {
          const data = await meteo.json()
          const current = data.current || {}
          results.push({
            id: `openmeteo-${place.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            type: "observation",
            title: `Current weather near ${place.label}`,
            description: [
              Number.isFinite(Number(current.temperature_2m)) ? `${current.temperature_2m} C` : "",
              Number.isFinite(Number(current.wind_speed_10m)) ? `${current.wind_speed_10m} km/h wind` : "",
              Number.isFinite(Number(current.precipitation)) ? `${current.precipitation} mm precipitation` : "",
            ].filter(Boolean).join(" | ") || "Current weather observation",
            lat: place.lat,
            lng: place.lon,
            timestamp: String(current.time || data.current_units?.time || new Date().toISOString()),
            source: "Open-Meteo",
          })
        }
      }
    }

    return results.slice(0, limit)
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// 6. Emissions & Air Quality (Carbon Mapper + OpenAQ)
// ---------------------------------------------------------------------------

const EMISSIONS_KEYWORDS = [
  "co2", "carbon", "methane", "emission", "pollution", "pollutant",
  "air quality", "pm2.5", "pm10", "ozone", "o3", "no2", "so2",
  "co", "carbon monoxide", "smog", "particulate", "aqi",
  "plume", "leak", "flare", "vent",
]

export function isEmissionsQuery(query: string): boolean {
  const q = query.toLowerCase()
  return EMISSIONS_KEYWORDS.some(kw => q.includes(kw))
}

export async function searchEmissions(query: string, origin: string, limit = 20): Promise<EmissionsResult[]> {
  const results: EmissionsResult[] = []
  const q = query.toLowerCase()

  try {
    // Carbon Mapper
    if (q.includes("methane") || q.includes("co2") || q.includes("carbon") || q.includes("emission") || q.includes("plume")) {
      const cmRes = await safeFetchSelfPath(origin, `/api/oei/carbon-mapper?limit=${limit}`)
      if (cmRes) {
        const cmData = await cmRes.json()
        const plumes = cmData.entities || cmData.plumes || cmData.data || []
        for (const p of (plumes as Record<string, unknown>[]).slice(0, limit)) {
          results.push({
            id: `cm-${p.id}`,
            type: q.includes("methane") ? "methane" : "co2",
            title: (p.name as string) || (p.source_name as string) || "Emission Source",
            description: (p.description as string) || `${p.source_type || "Unknown"} emission`,
            lat: (p.lat as number) || (p.latitude as number) || 0,
            lng: (p.lng as number) || (p.longitude as number) || 0,
            value: (p.emission_rate as number) || undefined,
            unit: "kg/hr",
            sourceType: (p.source_type as string) || undefined,
            timestamp: (p.datetime as string) || new Date().toISOString(),
            source: "Carbon Mapper",
          })
        }
      }
    }

    // OpenAQ
    if (q.includes("air quality") || q.includes("pm") || q.includes("ozone") || q.includes("no2") || q.includes("so2") || q.includes("aqi") || q.includes("pollution")) {
      const aqRes = await safeFetchSelfPath(origin, `/api/oei/openaq?limit=${limit}`)
      if (aqRes) {
        const aqData = await aqRes.json()
        const measurements = aqData.entities || aqData.measurements || aqData.data || []
        for (const m of (measurements as Record<string, unknown>[]).slice(0, limit)) {
          results.push({
            id: `oaq-${m.id}`,
            type: "air_quality",
            title: (m.location as string) || (m.city as string) || "Air Quality Reading",
            description: `${m.parameter || "AQI"}: ${m.value || "N/A"} ${m.unit || ""}`,
            lat: (m.lat as number) || (m.latitude as number) || 0,
            lng: (m.lng as number) || (m.longitude as number) || 0,
            value: (m.value as number) || undefined,
            unit: (m.unit as string) || undefined,
            parameter: (m.parameter as string) || undefined,
            timestamp: (m.date as string) || (m.lastUpdated as string) || new Date().toISOString(),
            source: "OpenAQ",
          })
        }
      }
    }
  } catch {
    // silent
  }

  return results.slice(0, limit)
}

// ---------------------------------------------------------------------------
// 7. Infrastructure (OpenRailway + general)
// ---------------------------------------------------------------------------

const INFRASTRUCTURE_KEYWORDS = [
  "factory", "power plant", "dam", "mining", "mine", "oil", "gas",
  "treatment plant", "refinery", "pipeline", "power grid",
  "airport", "seaport", "port", "spaceport", "launch pad",
  "railway", "railroad", "train station", "antenna", "cell tower",
  "internet cable", "submarine cable", "power line", "substation",
  "military base", "military", "air force", "navy", "army",
  "water treatment", "reservoir", "wind farm", "solar farm",
  "nuclear", "coal", "hydroelectric", "geothermal",
]

export function isInfrastructureQuery(query: string): boolean {
  const q = query.toLowerCase()
  return INFRASTRUCTURE_KEYWORDS.some(kw => q.includes(kw))
}

export async function searchInfrastructure(query: string, origin: string, limit = 20): Promise<InfrastructureResult[]> {
  try {
    const q = query.toLowerCase()
    const results: InfrastructureResult[] = []

    if (/\b(power\s+plants?|power\s+grid|electric(?:al)?\s+grid|transmission\s+lines?|power\s+lines?|substations?)\b/i.test(q)) {
      if (/\b(power\s+grid|electric(?:al)?\s+grid|transmission\s+lines?|power\s+lines?|substations?)\b/i.test(q)) {
        results.push({
          id: "power-grid-transmission-layer",
          type: "power_line",
          name: "Transmission and sub-transmission line layer",
          description: "Search-controlled Earth layer for all available transmission-scale power lines and substations. Geometry is rendered in Earth Simulator from MINDEX/CREP tile sources.",
          lat: 39.5,
          lng: -98.35,
          operator: "MINDEX/CREP",
          source: "HIFLD + OpenStreetMap + MINDEX tiles",
        })
      }

      const registry = await getAllPowerPlants({ baseUrl: origin })
      const plantLimit = Math.max(1, Math.min(Math.max(limit - results.length, 1), /\bpower\s+plants?\b/i.test(q) ? limit : Math.ceil(limit / 2)))
      for (const plant of registry.plants.slice(0, plantLimit)) {
        results.push({
          id: `power-plant-${plant.id}`,
          type: "power_plant",
          name: plant.name || "Power plant",
          description: [
            plant.fuel ? `${plant.fuel} generation` : "Power generation facility",
            plant.capacity_mw != null ? `${Number(plant.capacity_mw).toLocaleString()} MW` : "",
            plant.countryLong || plant.country,
          ].filter(Boolean).join(" · "),
          lat: plant.lat,
          lng: plant.lng,
          operator: plant.operator || plant.owner,
          source: plant.sources?.join(", ") || "WRI/EIA/MINDEX",
        })
      }
    }

    // Railway data
    if (q.includes("railway") || q.includes("railroad") || q.includes("train")) {
      const rRes = await safeFetchSelfPath(origin, `/api/oei/railways?limit=${limit}`)
      if (rRes) {
        const rData = await rRes.json()
        const stations = rData.entities || rData.stations || rData.data || []
        for (const s of (stations as Record<string, unknown>[]).slice(0, limit)) {
          results.push({
            id: `rail-${s.id}`,
            type: "railway",
            name: (s.name as string) || "Railway",
            description: (s.description as string) || (s.operator as string) || undefined,
            lat: (s.lat as number) || (s.latitude as number) || 0,
            lng: (s.lng as number) || (s.longitude as number) || 0,
            operator: (s.operator as string) || undefined,
            source: "OpenRailwayMap",
          })
        }
      }
    }

    return results.slice(0, limit)
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// 8. Devices (MycoBrain telemetry)
// ---------------------------------------------------------------------------

const DEVICE_KEYWORDS = [
  "device", "devices", "sensor", "mycobrain", "sporebase", "telemetry",
  "iot", "mycoboard", "brain board", "spore count",
  "myco", "trufflebot", "myconode", "hyphae", "network",
]

export function isDeviceQuery(query: string): boolean {
  const q = query.toLowerCase()
  return DEVICE_KEYWORDS.some(kw => q.includes(kw))
}

function mapLocalMycobrainRow(d: Record<string, unknown>): DeviceResult {
  return {
    id: `device-${d.id || d.device_id}`,
    deviceType: (d.type as string) || (d.device_type as string) || "mycobrain",
    name: (d.name as string) || (d.label as string) || "MycoBrain",
    lat: (d.lat as number) || (d.latitude as number) || undefined,
    lng: (d.lng as number) || (d.longitude as number) || undefined,
    temperature: (d.temperature as number) || undefined,
    humidity: (d.humidity as number) || undefined,
    airQuality: (d.air_quality as number) || undefined,
    sporeCount: (d.spore_count as number) || undefined,
    lastSeen: (d.last_seen as string) || new Date().toISOString(),
    status: (d.status as string) || "online",
    source: "MycoBrain",
  }
}

function mapMasRegistryRow(d: Record<string, unknown>): DeviceResult {
  const id = String(d.device_id || d.id || "").trim() || `unknown-${Date.now()}`
  const display =
    (d.display_name as string) ||
    (d.device_display_name as string) ||
    (d.device_name as string) ||
    (d.name as string) ||
    id
  const statusRaw = String(d.status || "offline").toLowerCase()
  const lastSeen = (d.last_seen as string) || (d.registered_at as string) || new Date().toISOString()
  return {
    id: `device-${id}`,
    deviceType: (d.board_type as string) || (d.type as string) || "mycobrain",
    name: display,
    lat: undefined,
    lng: undefined,
    temperature: undefined,
    humidity: undefined,
    airQuality: undefined,
    sporeCount: undefined,
    lastSeen,
    status: statusRaw.includes("online") || statusRaw === "stale" ? "online" : "offline",
    source: "MAS-Registry",
  }
}

function mapFieldDeploymentRow(d: (typeof FIELD_MYCOBRAIN_DEPLOYMENTS)[number]): DeviceResult {
  return {
    id: d.catalog_id,
    deviceType: d.role || "mycobrain",
    name: d.name,
    lat: d.location.lat,
    lng: d.location.lon,
    registryId: d.registry_id,
    role: d.role,
    host: d.host_ip,
    agentUrl: d.agent_url,
    locationLabel: d.location_label,
    lastSeen: new Date().toISOString(),
    status: "connected",
    source: "MycoBrain field deployment",
  }
}

function mapEarthSimulatorDeviceRow(d: Record<string, unknown>): DeviceResult | null {
  const location = (d.location as Record<string, unknown> | undefined) || {}
  const telemetry = (d.telemetry as Record<string, unknown> | undefined) || {}
  const lat = Number(d.lat ?? d.latitude ?? location.lat ?? location.latitude)
  const lng = Number(d.lng ?? d.lon ?? d.longitude ?? location.lng ?? location.lon ?? location.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const temperature = Number(telemetry.temperature_c)
  const humidity = Number(telemetry.humidity_pct)
  const airQuality = Number(telemetry.iaq)
  const pressure = Number(telemetry.pressure_hpa)
  const eco2 = Number(telemetry.eco2_ppm)
  const gasResistance = Number(telemetry.gas_resistance_ohm)

  return {
    id: String(d.id ?? d.registry_id ?? `device-${lat}-${lng}`),
    deviceType: String(d.type ?? d.role ?? "mycobrain"),
    name: String(d.name ?? d.id ?? "MycoBrain"),
    lat,
    lng,
    registryId: d.registry_id ? String(d.registry_id) : undefined,
    role: d.role ? String(d.role) : undefined,
    host: d.host ? String(d.host) : undefined,
    agentUrl: d.agent_url ? String(d.agent_url) : undefined,
    locationLabel: d.location_label ? String(d.location_label) : undefined,
    sensorSlot: telemetry.sensor_slot ? String(telemetry.sensor_slot) : undefined,
    temperature: Number.isFinite(temperature) ? temperature : undefined,
    humidity: Number.isFinite(humidity) ? humidity : undefined,
    airQuality: Number.isFinite(airQuality) ? airQuality : undefined,
    pressure: Number.isFinite(pressure) ? pressure : undefined,
    eco2: Number.isFinite(eco2) ? eco2 : undefined,
    gasResistance: Number.isFinite(gasResistance) ? gasResistance : undefined,
    lastSeen: String(d.lastSeen ?? d.last_seen ?? telemetry.captured_at ?? new Date().toISOString()),
    status: String(d.status ?? "connected"),
    source: String(d.source ?? "MycoBrain"),
  }
}

export async function searchDevices(query: string, origin: string, limit = 20): Promise<DeviceResult[]> {
  try {
    const byId = new Map<string, DeviceResult>()
    for (const row of FIELD_MYCOBRAIN_DEPLOYMENTS.map(mapFieldDeploymentRow)) {
      byId.set(row.id, row)
    }
    const needsLiveDeviceDetails = /\b(telemetry|temperature|humidity|iaq|air quality|live|status|control|command|beep|rainbow|led)\b/i.test(query)
    if (!needsLiveDeviceDetails) {
      return [...byId.values()].slice(0, limit)
    }

    /** MAS device registry (LAN / VM) — real rows when local MycoBrain serial service has none */
    const [earthDevices, net, res] = await Promise.all([
      safeFetchSelfPath(origin, "/api/earth-simulator/devices", 1500),
      safeFetchSelfPath(origin, "/api/devices/network?include_offline=true", 1500),
      safeFetchSelfPath(origin, "/api/natureos/devices/mycobrain", 800),
    ])

    if (earthDevices) {
      const payload = await earthDevices.json()
      const list = ((payload?.devices || payload?.data || []) as Record<string, unknown>[])
        .map(mapEarthSimulatorDeviceRow)
        .filter(Boolean) as DeviceResult[]
      for (const row of list) byId.set(row.id, row)
    }

    if (net) {
      const jd = (await net.json()) as { devices?: Record<string, unknown>[] }
      for (const d of jd.devices || []) {
        const mapped = mapMasRegistryRow(d)
        if (mapped.lat == null || mapped.lng == null) continue
        byId.set(mapped.id, mapped)
      }
    }

    const data = res ? await res.json() : {}
    const devices = (data.devices || data.data || []) as Record<string, unknown>[]
    for (const row of devices.map(mapLocalMycobrainRow)) {
      if (row.lat == null || row.lng == null) continue
      byId.set(row.id, row)
    }

    return [...byId.values()].slice(0, limit)
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// 9. Space Weather (NOAA SWPC)
// ---------------------------------------------------------------------------

const SPACE_WEATHER_KEYWORDS = [
  "solar flare", "solar wind", "geomagnetic", "aurora", "northern lights",
  "kp index", "kp-index", "x-ray flux", "coronal mass", "cme",
  "space weather", "solar storm", "radiation belt", "magnetosphere",
  "soho", "stereo", "solar cycle", "sunspot",
]

export function isSpaceWeatherQuery(query: string): boolean {
  const q = query.toLowerCase()
  return SPACE_WEATHER_KEYWORDS.some(kw => q.includes(kw))
}

export async function searchSpaceWeather(query: string, origin: string, _limit = 10): Promise<SpaceWeatherResult[]> {
  try {
    const res = await safeFetchSelfPath(origin, "/api/oei/space-weather")
    if (!res) return []
    const data = await res.json()

    const results: SpaceWeatherResult[] = []

    if (data.solarWind) {
      results.push({
        id: "sw-solar-wind",
        type: "solar_wind",
        title: "Solar Wind Conditions",
        description: `Speed: ${data.solarWind.speed || "N/A"} km/s, Density: ${data.solarWind.density || "N/A"} p/cm³`,
        solarWindSpeed: data.solarWind.speed,
        timestamp: data.timestamp || new Date().toISOString(),
        source: "NOAA SWPC",
      })
    }

    if (data.indices?.kpIndex != null) {
      const kp = data.indices.kpIndex
      results.push({
        id: "sw-kp-index",
        type: "geomagnetic_storm",
        title: `Geomagnetic Activity (Kp=${kp})`,
        description: kp >= 5 ? "Geomagnetic storm in progress" : "Quiet geomagnetic conditions",
        severity: kp >= 7 ? "high" : kp >= 5 ? "medium" : "low",
        kpIndex: kp,
        timestamp: data.timestamp || new Date().toISOString(),
        source: "NOAA SWPC",
      })
    }

    if (data.indices?.radioFlux != null) {
      results.push({
        id: "sw-xray",
        type: "solar_flare",
        title: "Solar Radio Flux",
        description: `Current 10.7cm flux: ${data.indices.radioFlux} SFU`,
        xrayFlux: data.indices.radioFlux,
        timestamp: data.timestamp || new Date().toISOString(),
        source: "NOAA SWPC",
      })
    }

    return results
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// 10. CCTV & Webcams — MINDEX Eagle Eye (eagle.video_sources via unified-search)
// ---------------------------------------------------------------------------

const CAMERA_KEYWORDS = [
  "camera",
  "cctv",
  "webcam",
  "livestream",
  "live stream",
  "traffic cam",
  "traffic cameras",
  "surveillance",
]

/** MINDEX may return placeholder objects — treat as empty so OSM / live fallback can run. */
function isRenderableCamera(c: unknown): c is CameraResult {
  if (!c || typeof c !== "object") return false
  const o = c as CameraResult
  if (!Number.isFinite(Number(o.lat)) || !Number.isFinite(Number(o.lng))) return false
  const title = String(o.title ?? "").trim()
  const id = String(o.id ?? "").trim()
  return title.length > 0 || id.length > 0
}

function filterRenderableCameras(rows: CameraResult[]): CameraResult[] {
  return rows.filter((c) => isRenderableCamera(c))
}

const MINDEX_INTERNAL_TOKEN =
  process.env.MINDEX_INTERNAL_TOKEN ||
  (process.env.MINDEX_INTERNAL_TOKENS || "").split(",")[0].trim() ||
  ""

const MINDEX_API_KEY = process.env.MINDEX_API_KEY || ""

function mindexAuthHeaders(): Record<string, string> {
  if (MINDEX_INTERNAL_TOKEN) return { "X-Internal-Token": MINDEX_INTERNAL_TOKEN }
  if (MINDEX_API_KEY) return { "X-API-Key": MINDEX_API_KEY }
  return {}
}

export function isCamerasQuery(query: string): boolean {
  const q = query.toLowerCase()
  return CAMERA_KEYWORDS.some(kw => q.includes(kw))
}

/** When Nominatim is down or rate-limited, still query Overpass with real coords (not mock rows). */
function fallbackCoordsForKnownPlace(place: string): { lat: number; lon: number; label: string } | null {
  const p = place.trim().toLowerCase()
  if (!p) return null
  const table: Array<{ m: RegExp; lat: number; lon: number; label: string }> = [
    { m: /paris/, lat: 48.8566, lon: 2.3522, label: "Paris, France" },
    { m: /tokyo/, lat: 35.6762, lon: 139.6503, label: "Tokyo, Japan" },
    { m: /london/, lat: 51.5074, lon: -0.1278, label: "London, UK" },
    { m: /(san francisco|sf\b)/, lat: 37.7749, lon: -122.4194, label: "San Francisco, CA" },
    { m: /los angeles|la\b/, lat: 34.0522, lon: -118.2437, label: "Los Angeles, CA" },
    { m: /new york|nyc/, lat: 40.7128, lon: -74.006, label: "New York, NY" },
    { m: /berlin/, lat: 52.52, lon: 13.405, label: "Berlin, Germany" },
  ]
  for (const row of table) {
    if (row.m.test(p)) return { lat: row.lat, lon: row.lon, label: row.label }
  }
  return null
}

/** City / area hint for OSM fallback (no MINDEX Eagle rows). */
function extractPlaceHintForCameras(query: string): string | null {
  const q = query.trim()
  const inMatch = q.match(/\bin\s+([^,;]+)$/i)
  if (inMatch?.[1]) return inMatch[1].trim()
  const near = q.match(/\bnear\s+([^,;]+)$/i)
  if (near?.[1]) return near[1].trim()
  const cam = q.match(/(?:traffic\s+)?(?:cctv|webcams?|cameras?)\s+([^,;]+)$/i)
  if (cam?.[1]) return cam[1].trim()
  return null
}

/**
 * Public surveillance nodes from OpenStreetMap (Nominatim + Overpass).
 * Used when MINDEX eagle_video is empty — real geo data, no mock payloads.
 */
async function searchCamerasOsmAroundPlace(place: string, limit: number): Promise<CameraResult[]> {
  try {
    let lat: number | undefined
    let lon: number | undefined
    let labelBase = place

    /** Known cities first — avoids waiting on Nominatim (often 10s+) before Overpass. */
    const fb = fallbackCoordsForKnownPlace(place)
    if (fb) {
      lat = fb.lat
      lon = fb.lon
      labelBase = fb.label
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`
      const nomRes = await fetch(nomUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent": "MycosoftFluidSearch/1.0 (+https://mycosoft.com/search)",
        },
        signal: AbortSignal.timeout(5_000),
      })
      if (nomRes.ok) {
        const nom = (await nomRes.json()) as Array<{ lat: string; lon: string; display_name?: string }>
        if (nom?.[0]) {
          lat = parseFloat(nom[0].lat)
          lon = parseFloat(nom[0].lon)
          labelBase = nom[0].display_name?.split(",").slice(0, 2).join(", ") || place
        }
      }
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return []

    const cap = Math.min(Math.max(limit, 1), 25)
    /** Surveillance + speed cameras — 12 km radius keeps Overpass fast; cap applied in JS after `out body`. */
    const overpassQ = `
[out:json][timeout:12];
(
  node["man_made"="surveillance"](around:12000,${lat},${lon});
  node["highway"="speed_camera"](around:12000,${lat},${lon});
);
out body;
`
    const overpassEndpoints = [
      "https://lz4.overpass-api.de/api/interpreter",
      "https://overpass.openstreetmap.fr/api/interpreter",
      "https://overpass-api.de/api/interpreter",
      "https://z.overpass-api.de/api/interpreter",
    ]

    function elementsToCameras(
      els: Array<{ type: string; id: number; lat?: number; lon?: number; tags?: Record<string, string> }>
    ): CameraResult[] {
      const rows: CameraResult[] = []
      for (const el of els) {
        if (el.type !== "node" || typeof el.lat !== "number" || typeof el.lon !== "number") continue
        const tags = el.tags || {}
        const isSpeed = tags.highway === "speed_camera"
        const title =
          tags.name ||
          tags.ref ||
          tags.operator ||
          (isSpeed ? `Speed camera ${el.id}` : `Surveillance ${el.id}`)
        rows.push({
          id: isSpeed ? `osm-speedcam-${el.id}` : `osm-surveillance-${el.id}`,
          title,
          location: labelBase,
          lat: el.lat,
          lng: el.lon,
          type: isSpeed ? "traffic" : "cctv",
          status: "live",
          source: isSpeed ? "OpenStreetMap (speed_camera)" : "OpenStreetMap (surveillance)",
        })
        if (rows.length >= cap) break
      }
      return rows
    }

    async function fetchOneMirror(endpoint: string): Promise<CameraResult[]> {
      const opRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "MycosoftFluidSearch/1.0 (+https://mycosoft.com/search)",
        },
        body: `data=${encodeURIComponent(overpassQ)}`,
        signal: AbortSignal.timeout(10_000),
      })
      if (!opRes.ok) throw new Error(`overpass HTTP ${opRes.status}`)
      const op = (await opRes.json()) as {
        elements?: Array<{ type: string; id: number; lat?: number; lon?: number; tags?: Record<string, string> }>
      }
      const rows = elementsToCameras(op.elements || [])
      if (rows.length === 0) throw new Error("overpass empty")
      return rows
    }

    /** Race mirrors: public Overpass is often slow or times out sequentially — first non-empty wins. */
    try {
      return await Promise.any(overpassEndpoints.map((endpoint) => fetchOneMirror(endpoint)))
    } catch {
      return []
    }
  } catch {
    return []
  }
}

function mapEagleUnifiedRowToCamera(row: Record<string, unknown>): CameraResult | null {
  const lat = Number(row.lat)
  const lng = Number(row.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const props = (row.properties as Record<string, unknown> | undefined) || {}
  const streamUrl =
    (props.stream_url as string | undefined) ||
    (props.embed_url as string | undefined) ||
    (props.media_url as string | undefined)
  const name = String(row.name || row.id || "Video source")
  return {
    id: String(row.id),
    title: name,
    location: `${lat.toFixed(2)}, ${lng.toFixed(2)}`,
    lat,
    lng,
    type: "webcam",
    status: "live",
    source: String(row.source || "eagle.video_sources"),
    streamUrl: streamUrl || undefined,
  }
}

/** Fluid Search / earth intelligence: real Eagle rows from MINDEX unified-search (types=eagle_video). */
export async function searchCameras(query: string, limit = 10): Promise<CameraResult[]> {
  const qRaw = query.trim()
  const q = qRaw.length >= 2 ? qRaw : "camera"
  const cap = Math.min(Math.max(limit, 1), 100)
  let mindexOut: CameraResult[] = []

  if (MINDEX_INTERNAL_TOKEN || MINDEX_API_KEY) {
    try {
      const qp = new URLSearchParams({
        q,
        types: "eagle_video",
        limit: String(cap),
      })
      const mindexBase = resolveMindexServerBaseUrl().replace(/\/$/, "")
      const res = await fetch(`${mindexBase}/api/mindex/unified-search?${qp}`, {
        signal: AbortSignal.timeout(8_000),
        headers: { Accept: "application/json", ...mindexAuthHeaders() },
      })
      if (res.ok) {
        const j = (await res.json()) as { results?: Record<string, unknown> }
        const rowsRaw = j?.results?.eagle_video
        const rows = Array.isArray(rowsRaw) ? rowsRaw : []
        for (const row of rows) {
          const c = mapEagleUnifiedRowToCamera(row as Record<string, unknown>)
          if (c) mindexOut.push(c)
          if (mindexOut.length >= cap) break
        }
      }
    } catch {
      mindexOut = []
    }
  }

  if (mindexOut.length > 0) return mindexOut

  const place = extractPlaceHintForCameras(qRaw)
  if (place) {
    const osm = await searchCamerasOsmAroundPlace(place, cap)
    if (osm.length > 0) return osm
  }

  return []
}

// ---------------------------------------------------------------------------
// Master: detect which domains a query targets
// ---------------------------------------------------------------------------

export interface EarthSearchDomains {
  events: boolean
  aircraft: boolean
  vessels: boolean
  satellites: boolean
  weather: boolean
  emissions: boolean
  infrastructure: boolean
  devices: boolean
  spaceWeather: boolean
  cameras: boolean
}

export function detectEarthDomains(query: string): EarthSearchDomains {
  return {
    events: detectEventCategory(query) !== null,
    aircraft: isAircraftQuery(query),
    vessels: isVesselQuery(query),
    satellites: isSatelliteQuery(query),
    weather: isWeatherQuery(query),
    emissions: isEmissionsQuery(query),
    infrastructure: isInfrastructureQuery(query),
    devices: isDeviceQuery(query),
    spaceWeather: isSpaceWeatherQuery(query),
    cameras: isCamerasQuery(query),
  }
}

/**
 * Try MINDEX Earth search endpoint first (local DB, low latency).
 * Falls through to external APIs if MINDEX returns nothing.
 */
async function searchMindexEarth(
  query: string,
  limit: number,
  origin?: string
): Promise<Record<string, unknown[]> | null> {
  const params = new URLSearchParams({
    q: query,
    types: "all",
    limit: String(limit),
  })
  const base = origin ? resolveInternalBaseUrl(origin) : resolveMindexServerBaseUrl()
  const path = origin
    ? `${base}/api/mindex/unified-search/earth?${params}`
    : `${base}/api/mindex/unified-search/earth?${params}`
  try {
    const res = await safeFetch(path, 10_000)
    if (!res) return null
    const data = (await res.json()) as Record<string, unknown>
    const mapped = mapMindexEarthResponse(data)
    const hasAny = Object.values(mapped).some((v) => Array.isArray(v) && v.length > 0)
    return hasAny ? mapped : null
  } catch {
    return null
  }
}

/** MINDEX-first earth bundle — used by `searchEarthIntelligence` and `/api/search/stream` extensions. */
export const earthMindexFirstConnector = defineConnector({
  widgetType: "earth",
  sources: [
    {
      name: "mindex-earth",
      fetch: async (ctx: ConnectorRunContext) => searchMindexEarth(ctx.query, ctx.limit, ctx.origin),
      transform: (raw) =>
        raw && typeof raw === "object" && !Array.isArray(raw) ? [raw as Record<string, unknown[]>] : [],
    },
  ],
})

/**
 * Run all Earth Intelligence searches in parallel based on detected domains.
 * MINDEX-first: tries local DB, then falls back to external APIs.
 * Returns partial results object matching UnifiedSearchResults shape.
 */
export async function searchEarthIntelligence(
  query: string,
  origin: string,
  limit = 20
): Promise<{
  events: EventResult[]
  aircraft: AircraftResult[]
  vessels: VesselResult[]
  satellites: SatelliteResult[]
  weather: WeatherResult[]
  emissions: EmissionsResult[]
  infrastructure: InfrastructureResult[]
  devices: DeviceResult[]
  space_weather: SpaceWeatherResult[]
  cameras: CameraResult[]
}> {
  const domains = detectEarthDomains(query)
  const isGeneral = !Object.values(domains).some(Boolean)
  const wantsWeatherContext = domains.weather || isGeneral || domains.aircraft
  const wantsSpaceWeatherContext = domains.spaceWeather || domains.satellites
  const internalOrigin = resolveInternalBaseUrl(origin)

  /** Live connectors — run in parallel with MINDEX so camera/geo queries are not serialized (MINDEX + OSM). */
  const livePromises = {
    events: (domains.events || isGeneral) ? searchEvents(query, limit) : Promise.resolve([] as EventResult[]),
    aircraft: domains.aircraft ? searchAircraft(query, internalOrigin, limit) : Promise.resolve([] as AircraftResult[]),
    vessels: domains.vessels ? searchVessels(query, internalOrigin, limit) : Promise.resolve([] as VesselResult[]),
    satellites: domains.satellites ? searchSatellites(query, internalOrigin, limit) : Promise.resolve([] as SatelliteResult[]),
    weather: wantsWeatherContext ? searchWeather(query, internalOrigin, limit) : Promise.resolve([] as WeatherResult[]),
    emissions: domains.emissions ? searchEmissions(query, internalOrigin, limit) : Promise.resolve([] as EmissionsResult[]),
    infrastructure: domains.infrastructure ? searchInfrastructure(query, internalOrigin, limit) : Promise.resolve([] as InfrastructureResult[]),
    devices: domains.devices ? searchDevices(query, internalOrigin, limit) : Promise.resolve([] as DeviceResult[]),
    spaceWeather: wantsSpaceWeatherContext ? searchSpaceWeather(query, internalOrigin, limit) : Promise.resolve([] as SpaceWeatherResult[]),
    cameras: domains.cameras ? searchCameras(query, limit) : Promise.resolve([] as CameraResult[]),
  }

  const livePromise = Promise.all([
    safeEarthSlice(livePromises.events),
    safeEarthSlice(livePromises.aircraft),
    safeEarthSlice(livePromises.vessels),
    safeEarthSlice(livePromises.satellites),
    safeEarthSlice(livePromises.weather),
    safeEarthSlice(livePromises.emissions),
    safeEarthSlice(livePromises.infrastructure),
    safeEarthSlice(livePromises.devices),
    safeEarthSlice(livePromises.spaceWeather),
    safeEarthSlice(livePromises.cameras),
  ])

  const mindexPromise = earthMindexFirstConnector
    .run({
      query,
      signal: AbortSignal.timeout(6_000),
      limit,
      origin,
    })
    .catch((e) => {
      console.warn("[searchEarthIntelligence] mindex-earth connector failed:", e)
      return [] as Awaited<ReturnType<typeof earthMindexFirstConnector.run>>
    })

  const [mindexChunks, liveTuple] = await Promise.all([mindexPromise, livePromise])

  const mindexEarth = mindexChunks[0]?.items[0] as Record<string, unknown[]> | undefined

  const [
    liveEvents,
    liveAircraft,
    liveVessels,
    liveSatellites,
    liveWeather,
    liveEmissions,
    liveInfrastructure,
    liveDevices,
    liveSpaceWeather,
    liveCameras,
  ] = liveTuple

  if (mindexEarth && typeof mindexEarth === "object") {
    const hasAny = Object.values(mindexEarth).some((v) => Array.isArray(v) && v.length > 0)
    if (hasAny) {
      let events = deduplicateEarthEvents(asEarthBucket<EventResult>(mindexEarth.events))
      let aircraft = asEarthBucket<AircraftResult>(mindexEarth.aircraft)
      let vessels = asEarthBucket<VesselResult>(mindexEarth.vessels)
      let satellites = asEarthBucket<SatelliteResult>(mindexEarth.satellites)
      let weather = asEarthBucket<WeatherResult>(mindexEarth.weather)
      let emissions = asEarthBucket<EmissionsResult>(mindexEarth.emissions)
      let infrastructure = asEarthBucket<InfrastructureResult>(mindexEarth.infrastructure)
      let devices = asEarthBucket<DeviceResult>(mindexEarth.devices)
      let space_weather = asEarthBucket<SpaceWeatherResult>(mindexEarth.space_weather)
      let cameras = filterRenderableCameras(asEarthBucket<CameraResult>(mindexEarth.cameras))

      /** Prefer MINDEX rows; fill empty buckets from live results (already awaited in parallel). */
      if ((domains.events || isGeneral) && events.length === 0) events = deduplicateEarthEvents(liveEvents)
      if (domains.aircraft && aircraft.length === 0) aircraft = liveAircraft
      if (domains.vessels && vessels.length === 0) vessels = liveVessels
      if (domains.satellites && satellites.length === 0) satellites = liveSatellites
      if (wantsWeatherContext && weather.length === 0) weather = liveWeather
      if (domains.emissions && emissions.length === 0) emissions = liveEmissions
      if (domains.infrastructure && infrastructure.length === 0) infrastructure = liveInfrastructure
      if (domains.devices && devices.length === 0) devices = liveDevices
      if (wantsSpaceWeatherContext && space_weather.length === 0) space_weather = liveSpaceWeather
      if (domains.cameras && cameras.length === 0) cameras = filterRenderableCameras(liveCameras)
      if (detectEventCategory(query) === "earthquake" && liveEvents.length > 0) {
        events = deduplicateEarthEvents(liveEvents)
      }

      return {
        events,
        aircraft,
        vessels,
        satellites,
        weather,
        emissions,
        infrastructure,
        devices,
        space_weather,
        cameras,
      }
    }
  }

  const [events, aircraft, vessels, satellites, weather, emissions, infrastructure, devices, space_weather, rawCameras] =
    liveTuple
  const cameras = filterRenderableCameras(rawCameras)

  const mindexIngestBase = resolveMindexServerBaseUrl()
  // Background ingestion: "scrape that live data and put it in MINDEX"
  const mindexEmpty =
    !mindexEarth ||
    !Object.values(mindexEarth).some((v) => Array.isArray(v) && v.length > 0)
  if (mindexEmpty && Object.keys(domains).some((d) => domains[d as keyof EarthSearchDomains])) {
    const payload: Record<string, unknown[]> = {
      events,
      aircraft,
      vessels,
      satellites,
      weather,
      emissions,
      infrastructure,
      devices,
      space_weather,
      cameras,
    }
    // Only send non-empty arrays
    const validPayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v && v.length > 0))
    if (Object.keys(validPayload).length > 0) {
      fetch(`${mindexIngestBase}/api/search/earth/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
        signal: AbortSignal.timeout(5000)
      }).catch(e => console.error("[EarthData] Failed to ingest into MINDEX:", e))
    }
  }

  return {
    events: deduplicateEarthEvents(events),
    aircraft,
    vessels,
    satellites,
    weather,
    emissions,
    infrastructure,
    devices,
    space_weather,
    cameras,
  }
}

// ---------------------------------------------------------------------------
// Embedding Atlas Search — cross-domain similarity search
// ---------------------------------------------------------------------------

/**
 * Search across all domains using embedding-space similarity.
 * Fetches compressed embedding batch from the embeddings API,
 * enabling cross-domain pattern discovery and visualization.
 */
export async function searchEmbeddings(
  query: string,
  origin: string,
  options: {
    limit?: number
    types?: string[]
    includeCrep?: boolean
    bounds?: { north: number; south: number; east: number; west: number }
    timeRange?: { start?: string; end?: string }
  } = {}
): Promise<{
  points: Array<{
    id: string
    label: string
    description: string
    type: string
    score: number
    lat?: number
    lng?: number
  }>
  similar: Array<{
    id: string
    label: string
    type: string
    score: number
  }>
  totalCount: number
  compressionRatio: number
} | null> {
  try {
    const body = {
      query,
      types: options.types || [],
      limit: options.limit || 500,
      bounds: options.bounds,
      timeRange: options.timeRange,
    }

    const res = await fetch(`${origin}/api/search/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    })

    if (!res.ok) return null
    const data = await res.json()

    return {
      points: data.batch?.points || [],
      similar: data.similar || [],
      totalCount: data.batch?.totalCount || 0,
      compressionRatio: data.batch?.compressionRatio || 1,
    }
  } catch {
    return null
  }
}
