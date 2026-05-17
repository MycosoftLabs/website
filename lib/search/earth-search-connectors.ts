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
import * as satellite from "satellite.js"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"
import { defineConnector, type ConnectorRunContext } from "@/lib/search/connectors/_framework"
import { nearestCoastalFocus, queryNeedsCoastalFocus } from "@/lib/search/coastal-focus"

/** MINDEX `/api/search/earth` may return non-arrays for empty buckets — never iterate or trust `.length` on unknown shapes. */
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
  "over", "flying",
]

export function isAircraftQuery(query: string): boolean {
  const q = query.toLowerCase()
  return AIRCRAFT_KEYWORDS.some(kw => q.includes(kw))
}

export async function searchAircraft(query: string, limit = 20): Promise<AircraftResult[]> {
  try {
    const res = await safeFetch("https://opensky-network.org/api/states/all?extended=1", 10000)
    if (!res) return []
    const data = await res.json()
    const states = data.states || []

    const q = query.toLowerCase()
    let filtered = states

    // Filter by callsign or region if query hints
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
    } else if (q.includes("pacific")) {
      filtered = states.filter((s: unknown[]) => {
        const lng = s[5] as number
        return lng && lng < -120 && lng > -180
      })
    }

    return filtered.slice(0, limit).map((s: unknown[]) => ({
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

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const r = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const lat1 = a.lat * Math.PI / 180
  const lat2 = b.lat * Math.PI / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(h))
}

export async function searchVessels(
  query: string,
  origin: string,
  limit = 20,
  userLocation?: { lat: number; lng: number }
): Promise<VesselResult[]> {
  try {
    const focus = userLocation && queryNeedsCoastalFocus(query)
      ? nearestCoastalFocus(userLocation) ?? userLocation
      : userLocation
    const fetchLimit = focus ? Math.max(limit, 750) : limit
    const params = new URLSearchParams({ limit: String(fetchLimit) })
    if (focus) {
      const latSpan = 8
      const lngSpan = 10
      params.set("lamin", String(Math.max(-90, focus.lat - latSpan)))
      params.set("lamax", String(Math.min(90, focus.lat + latSpan)))
      params.set("lomin", String(Math.max(-180, focus.lng - lngSpan)))
      params.set("lomax", String(Math.min(180, focus.lng + lngSpan)))
    }
    const res = await safeFetch(`${origin}/api/oei/aisstream?${params.toString()}`, 10000)
    if (!res) return []
    const data = await res.json()
    const vessels = data.entities || data.vessels || data.data || []

    const mapped = (vessels as Record<string, unknown>[]).map((v) => ({
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
      .filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lng) && (v.lat !== 0 || v.lng !== 0))

    if (focus) {
      mapped.sort((a, b) => haversineKm(focus, a) - haversineKm(focus, b))
    }

    return mapped.slice(0, limit)
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

function num(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
  return Number.isFinite(n) ? n : undefined
}

function propagateSatelliteTle(line1?: unknown, line2?: unknown): { lat: number; lng: number; altitude: number; velocity?: number } | null {
  if (typeof line1 !== "string" || typeof line2 !== "string" || !line1.trim() || !line2.trim()) return null
  try {
    const now = new Date()
    const satrec = satellite.twoline2satrec(line1.trim(), line2.trim())
    const pv = satellite.propagate(satrec, now)
    const positionEci = pv.position
    if (!positionEci || typeof positionEci === "boolean") return null
    const gmst = satellite.gstime(
      satellite.jday(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds(),
      ),
    )
    const positionGd = satellite.eciToGeodetic(positionEci, gmst)
    const velocityEci = pv.velocity && typeof pv.velocity !== "boolean" ? pv.velocity : null
    const velocity = velocityEci
      ? Math.sqrt((velocityEci.x ** 2) + (velocityEci.y ** 2) + (velocityEci.z ** 2))
      : undefined
    return {
      lat: satellite.radiansToDegrees(positionGd.latitude),
      lng: satellite.radiansToDegrees(positionGd.longitude),
      altitude: positionGd.height,
      velocity,
    }
  } catch {
    return null
  }
}

export async function searchSatellites(query: string, origin: string, limit = 20): Promise<SatelliteResult[]> {
  try {
    const params = new URLSearchParams({ limit: String(limit) })
    if (/\biss\b|international\s+space\s+station/i.test(query)) {
      params.set("norad", "25544")
      params.set("category", "stations")
    } else if (/\bstarlink\b/i.test(query)) {
      params.set("category", "starlink")
    } else if (/\bdebris|orbital\s+objects?\b/i.test(query)) {
      params.set("category", "debris")
    } else {
      params.set("category", "active")
    }
    const res = await safeFetch(`${origin}/api/oei/satellites?${params.toString()}`, 15000)
    if (!res) return []
    const data = await res.json()
    const sats = data.entities || data.satellites || data.data || []

    return (sats as Record<string, unknown>[]).slice(0, limit).map((s) => {
      const propagated = propagateSatelliteTle(s.line1 || s.tle1, s.line2 || s.tle2)
      const rawLat = num(s.lat) ?? num(s.latitude)
      const rawLng = num(s.lng) ?? num(s.lon) ?? num(s.longitude)
      const usePropagated = propagated && (!Number.isFinite(rawLat) || !Number.isFinite(rawLng) || (rawLat === 0 && rawLng === 0))
      const norad = String(s.norad_id || s.noradId || s.norad || s.id || "").replace(/^satnogs-/, "")
      return {
        id: `sat-${norad || s.id || s.name || "unknown"}`,
        name: (s.name as string) || (s.title as string) || "Unknown",
        noradId: norad,
        category: (s.category as string) || (s.orbitType as string) || "active",
        lat: usePropagated ? propagated.lat : rawLat ?? 0,
        lng: usePropagated ? propagated.lng : rawLng ?? 0,
        altitude: num(s.altitude) ?? num(s.alt) ?? propagated?.altitude ?? 0,
        velocity: num(s.velocity) ?? propagated?.velocity,
        source: "CelesTrak",
      }
    }).filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
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
    const alertsRes = await safeFetch(`${origin}/api/oei/nws-alerts?limit=${limit}`)
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

function nestedNum(row: Record<string, unknown>, path: string[]): number | undefined {
  let cur: unknown = row
  for (const key of path) {
    if (!cur || typeof cur !== "object") return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  return num(cur)
}

function nestedValue(row: Record<string, unknown>, path: string[]): unknown {
  let cur: unknown = row
  for (const key of path) {
    if (!cur || typeof cur !== "object") return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  return cur
}

export async function searchEmissions(query: string, origin: string, limit = 20): Promise<EmissionsResult[]> {
  const results: EmissionsResult[] = []
  const q = query.toLowerCase()

  try {
    // Carbon Mapper
    if (q.includes("methane") || q.includes("co2") || q.includes("carbon") || q.includes("emission") || q.includes("plume")) {
      const cmParams = new URLSearchParams({ limit: String(limit) })
      if (q.includes("co2") || q.includes("carbon")) cmParams.set("gas_type", "co2")
      else if (q.includes("methane")) cmParams.set("gas_type", "methane")
      const cmRes = await safeFetch(`${origin}/api/oei/carbon-mapper?${cmParams.toString()}`)
      if (cmRes) {
        const cmData = await cmRes.json()
        const plumes = cmData.entities || cmData.plumes || cmData.emissions || cmData.data || []
        const filteredPlumes = (plumes as Record<string, unknown>[]).filter((p) => {
          const gas = String(p.gasType || p.gas_type || nestedValue(p, ["properties", "gasType"]) || "").toLowerCase()
          if (q.includes("co2") || q.includes("carbon")) return gas === "co2" || gas === "carbon dioxide"
          if (q.includes("methane")) return gas === "methane" || gas === "ch4"
          return true
        })
        for (const p of filteredPlumes.slice(0, limit)) {
          const gasType = String(p.gasType || p.gas_type || nestedValue(p, ["properties", "gasType"]) || "").toLowerCase()
          const sourceType = String(p.sourceType || p.source_type || (p.properties as Record<string, unknown> | undefined)?.sourceType || "")
          const emissionRate = num(p.emissionRate) ?? num(p.emission_rate) ?? num((p.properties as Record<string, unknown> | undefined)?.emissionRate)
          results.push({
            id: `cm-${p.id}`,
            type: gasType || (q.includes("methane") ? "methane" : "co2"),
            title: (p.name as string) || (p.facilityName as string) || (p.source_name as string) || "Emission Source",
            description: (p.description as string) || `${sourceType || "Unknown"} emission`,
            lat: num(p.lat) ?? num(p.latitude) ?? nestedNum(p, ["location", "latitude"]) ?? 0,
            lng: num(p.lng) ?? num(p.lon) ?? num(p.longitude) ?? nestedNum(p, ["location", "longitude"]) ?? 0,
            value: emissionRate,
            unit: "kg/hr",
            sourceType: sourceType || undefined,
            timestamp: (p.datetime as string) || (p.lastSeenAt as string) || (p.updatedAt as string) || new Date().toISOString(),
            source: "Carbon Mapper",
          })
        }
      }
    }

    // OpenAQ
    if (q.includes("air quality") || q.includes("pm") || q.includes("ozone") || q.includes("no2") || q.includes("so2") || q.includes("aqi") || q.includes("pollution")) {
      const aqRes = await safeFetch(`${origin}/api/oei/openaq?limit=${limit}`)
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

    // Railway data
    if (q.includes("railway") || q.includes("railroad") || q.includes("train")) {
      const rRes = await safeFetch(`${origin}/api/oei/railways?limit=${limit}`)
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

export async function searchDevices(query: string, origin: string, limit = 20): Promise<DeviceResult[]> {
  try {
    const res = await safeFetch(`${origin}/api/natureos/devices/mycobrain`)
    const data = res ? await res.json() : {}
    const devices = (data.devices || data.data || data || []) as Record<string, unknown>[]

    let rows = devices.slice(0, limit).map(mapLocalMycobrainRow)

    /** MAS device registry (LAN / VM) — real rows when local MycoBrain serial service has none */
    if (rows.length === 0) {
      const net = await safeFetch(`${origin}/api/devices/network?include_offline=true`, 12_000)
      if (net) {
        const jd = (await net.json()) as { devices?: Record<string, unknown>[] }
        const list = jd.devices || []
        rows = list.slice(0, limit).map(mapMasRegistryRow)
      }
    }

    return rows
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
    const res = await safeFetch(`${origin}/api/oei/space-weather`)
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
async function searchMindexEarth(query: string, limit: number): Promise<Record<string, unknown[]> | null> {
  const mindexBase = resolveMindexServerBaseUrl()
  try {
    const res = await safeFetch(
      `${mindexBase}/api/search/earth?q=${encodeURIComponent(query)}&limit=${limit}`,
      6000
    )
    if (!res) return null
    const data = await res.json()
    if (data?.universal_results?.length > 0 || data?.results) {
      return data.results || data
    }
    return null
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
      fetch: async (ctx: ConnectorRunContext) => searchMindexEarth(ctx.query, ctx.limit),
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
  limit = 20,
  options: { lat?: number; lng?: number } = {}
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
  const isBiodiversityGeneral =
    /\b(species|wildlife|animal|animals|plant|plants|fungi|mushrooms?|birds?|insects?|mammals?|fish|dolphins?|bees?|migration|populations?|biodiversity|inat(?:uralist)?)\b/i.test(query)
  const userLocation =
    Number.isFinite(options.lat) && Number.isFinite(options.lng)
      ? { lat: Number(options.lat), lng: Number(options.lng) }
      : undefined

  /** Live connectors — run in parallel with MINDEX so camera/geo queries are not serialized (MINDEX + OSM). */
  const livePromises = {
    events: (domains.events || (isGeneral && !isBiodiversityGeneral)) ? searchEvents(query, limit) : Promise.resolve([] as EventResult[]),
    aircraft: domains.aircraft ? searchAircraft(query, limit) : Promise.resolve([] as AircraftResult[]),
    vessels: domains.vessels ? searchVessels(query, origin, limit, userLocation) : Promise.resolve([] as VesselResult[]),
    satellites: domains.satellites ? searchSatellites(query, origin, limit) : Promise.resolve([] as SatelliteResult[]),
    weather: (domains.weather || (isGeneral && !isBiodiversityGeneral)) ? searchWeather(query, origin, limit) : Promise.resolve([] as WeatherResult[]),
    emissions: domains.emissions ? searchEmissions(query, origin, limit) : Promise.resolve([] as EmissionsResult[]),
    infrastructure: domains.infrastructure ? searchInfrastructure(query, origin, limit) : Promise.resolve([] as InfrastructureResult[]),
    devices: domains.devices ? searchDevices(query, origin, limit) : Promise.resolve([] as DeviceResult[]),
    spaceWeather: domains.spaceWeather ? searchSpaceWeather(query, origin, limit) : Promise.resolve([] as SpaceWeatherResult[]),
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
      if ((domains.weather || isGeneral) && weather.length === 0) weather = liveWeather
      if (domains.emissions && emissions.length === 0) emissions = liveEmissions
      if (domains.infrastructure && infrastructure.length === 0) infrastructure = liveInfrastructure
      if (domains.devices && devices.length === 0) devices = liveDevices
      if (domains.spaceWeather && space_weather.length === 0) space_weather = liveSpaceWeather
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
