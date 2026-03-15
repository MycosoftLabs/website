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
} from "./unified-search-sdk"

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function safeFetch(url: string, timeoutMs = 8000): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/json" },
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

export async function searchEvents(query: string, limit = 20): Promise<EventResult[]> {
  try {
    const category = detectEventCategory(query)
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

export async function searchVessels(query: string, origin: string, limit = 20): Promise<VesselResult[]> {
  try {
    const res = await safeFetch(`${origin}/api/oei/aisstream?limit=${limit}`, 10000)
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
    const res = await safeFetch(`${origin}/api/oei/satellites?limit=${limit}`, 10000)
    if (!res) return []
    const data = await res.json()
    const sats = data.entities || data.satellites || data.data || []

    return (sats as Record<string, unknown>[]).slice(0, limit).map((s) => ({
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

export async function searchEmissions(query: string, origin: string, limit = 20): Promise<EmissionsResult[]> {
  const results: EmissionsResult[] = []
  const q = query.toLowerCase()

  try {
    // Carbon Mapper
    if (q.includes("methane") || q.includes("co2") || q.includes("carbon") || q.includes("emission") || q.includes("plume")) {
      const cmRes = await safeFetch(`${origin}/api/oei/carbon-mapper?limit=${limit}`)
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
  "device", "sensor", "mycobrain", "sporebase", "telemetry",
  "iot", "mycoboard", "brain board", "spore count",
  "myco", "trufflebot", "myconode", "hyphae",
]

export function isDeviceQuery(query: string): boolean {
  const q = query.toLowerCase()
  return DEVICE_KEYWORDS.some(kw => q.includes(kw))
}

export async function searchDevices(query: string, origin: string, limit = 20): Promise<DeviceResult[]> {
  try {
    const res = await safeFetch(`${origin}/api/natureos/devices/mycobrain`)
    if (!res) return []
    const data = await res.json()
    const devices = data.devices || data.data || data || []

    return (devices as Record<string, unknown>[]).slice(0, limit).map((d) => ({
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
    }))
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
    const conditions = data.conditions || data.data || data

    const results: SpaceWeatherResult[] = []

    if (conditions.solar_wind || conditions.solarWind) {
      const sw = conditions.solar_wind || conditions.solarWind || {}
      results.push({
        id: "sw-solar-wind",
        type: "solar_wind",
        title: "Solar Wind Conditions",
        description: `Speed: ${sw.speed || "N/A"} km/s, Density: ${sw.density || "N/A"} p/cm³`,
        solarWindSpeed: sw.speed,
        timestamp: sw.time_tag || new Date().toISOString(),
        source: "NOAA SWPC",
      })
    }

    if (conditions.kp_index != null || conditions.kpIndex != null) {
      const kp = conditions.kp_index ?? conditions.kpIndex
      results.push({
        id: "sw-kp-index",
        type: "geomagnetic_storm",
        title: `Geomagnetic Activity (Kp=${kp})`,
        description: kp >= 5 ? "Geomagnetic storm in progress" : "Quiet geomagnetic conditions",
        severity: kp >= 7 ? "high" : kp >= 5 ? "medium" : "low",
        kpIndex: kp,
        timestamp: new Date().toISOString(),
        source: "NOAA SWPC",
      })
    }

    if (conditions.xray_flux || conditions.xrayFlux) {
      const xf = conditions.xray_flux || conditions.xrayFlux
      results.push({
        id: "sw-xray",
        type: "solar_flare",
        title: "X-Ray Flux",
        description: `Current X-ray flux: ${typeof xf === "object" ? xf.flux : xf}`,
        xrayFlux: typeof xf === "object" ? xf.flux : xf,
        timestamp: new Date().toISOString(),
        source: "NOAA SWPC",
      })
    }

    return results
  } catch {
    return []
  }
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
  }
}

/**
 * Try MINDEX Earth search endpoint first (local DB, low latency).
 * Falls through to external APIs if MINDEX returns nothing.
 */
async function searchMindexEarth(query: string, limit: number): Promise<Record<string, unknown[]> | null> {
  const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://192.168.0.189:8000"
  try {
    const res = await safeFetch(
      `${MINDEX_API_URL}/api/search/earth?q=${encodeURIComponent(query)}&limit=${limit}`,
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
}> {
  // MINDEX-first: try local database (instant, already scraped + stored)
  const mindexEarth = await searchMindexEarth(query, limit)
  if (mindexEarth) {
    // Map MINDEX results to our typed format — MINDEX returns domain-keyed arrays
    return {
      events: (mindexEarth.events as EventResult[]) || [],
      aircraft: (mindexEarth.aircraft as AircraftResult[]) || [],
      vessels: (mindexEarth.vessels as VesselResult[]) || [],
      satellites: (mindexEarth.satellites as SatelliteResult[]) || [],
      weather: (mindexEarth.weather as WeatherResult[]) || [],
      emissions: (mindexEarth.emissions as EmissionsResult[]) || [],
      infrastructure: (mindexEarth.infrastructure as InfrastructureResult[]) || [],
      devices: (mindexEarth.devices as DeviceResult[]) || [],
      space_weather: (mindexEarth.space_weather as SpaceWeatherResult[]) || [],
    }
  }

  // Fallback: query external APIs directly
  const domains = detectEarthDomains(query)
  const isGeneral = !Object.values(domains).some(Boolean)

  // For general queries, search events + weather as baseline context
  const promises = {
    events: (domains.events || isGeneral) ? searchEvents(query, limit) : Promise.resolve([]),
    aircraft: domains.aircraft ? searchAircraft(query, limit) : Promise.resolve([]),
    vessels: domains.vessels ? searchVessels(query, origin, limit) : Promise.resolve([]),
    satellites: domains.satellites ? searchSatellites(query, origin, limit) : Promise.resolve([]),
    weather: (domains.weather || isGeneral) ? searchWeather(query, origin, limit) : Promise.resolve([]),
    emissions: domains.emissions ? searchEmissions(query, origin, limit) : Promise.resolve([]),
    infrastructure: domains.infrastructure ? searchInfrastructure(query, origin, limit) : Promise.resolve([]),
    devices: domains.devices ? searchDevices(query, origin, limit) : Promise.resolve([]),
    space_weather: domains.spaceWeather ? searchSpaceWeather(query, origin, limit) : Promise.resolve([]),
  }

  const [events, aircraft, vessels, satellites, weather, emissions, infrastructure, devices, space_weather] =
    await Promise.all([
      promises.events,
      promises.aircraft,
      promises.vessels,
      promises.satellites,
      promises.weather,
      promises.emissions,
      promises.infrastructure,
      promises.devices,
      promises.space_weather,
    ])

  return { events, aircraft, vessels, satellites, weather, emissions, infrastructure, devices, space_weather }
}
