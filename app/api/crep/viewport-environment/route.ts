import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 900

type Bounds = { north: number; south: number; east: number; west: number }

const NWS_USER_AGENT = "Mycosoft CREP (ops@mycosoft.com)"

function finite(value: string | null, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function boundsFromRequest(req: NextRequest): Bounds {
  const q = req.nextUrl.searchParams
  const bbox = q.get("bbox")
  if (bbox) {
    const [west, south, east, north] = bbox.split(",").map(Number)
    if ([west, south, east, north].every(Number.isFinite)) {
      return {
        north: Math.max(north, south),
        south: Math.min(north, south),
        east,
        west,
      }
    }
  }
  const north = finite(q.get("north"), 0)
  const south = finite(q.get("south"), 0)
  return {
    north: Math.max(north, south),
    south: Math.min(north, south),
    east: finite(q.get("east"), 0),
    west: finite(q.get("west"), 0),
  }
}

function center(bounds: Bounds) {
  let lng = (bounds.east + bounds.west) / 2
  if (bounds.west > bounds.east) lng = ((bounds.east + 360 + bounds.west) / 2) % 360
  if (lng > 180) lng -= 360
  return { lat: (bounds.north + bounds.south) / 2, lng }
}

function area(bounds: Bounds) {
  const lat = Math.max(0.001, bounds.north - bounds.south)
  const lng =
    bounds.east >= bounds.west
      ? Math.max(0.001, bounds.east - bounds.west)
      : Math.max(0.001, 360 - bounds.west + bounds.east)
  return lat * lng
}

/** CONUS + AK + HI + PR — drives °F/mph vs °C/km/h. */
function isUSLocation(lat: number, lng: number): boolean {
  if (lat >= 24 && lat <= 50 && lng >= -125 && lng <= -66) return true
  if (lat >= 51 && lat <= 72 && lng >= -180 && lng <= -130) return true
  if (lat >= 18 && lat <= 23 && lng >= -161 && lng <= -154) return true
  if (lat >= 17 && lat <= 19 && lng >= -68 && lng <= -64) return true
  return false
}

function overpassRadiusMeters(zoom: number, bboxArea: number) {
  if (bboxArea > 25 || zoom < 7) {
    if (zoom < 5) return 80_000
    if (zoom < 8) return 45_000
    return 25_000
  }
  if (zoom < 10) return 18_000
  if (zoom < 12) return 10_000
  return 6_000
}

async function openMeteoEnvironment(bounds: Bounds, imperial: boolean) {
  const c = center(bounds)
  const today = new Date()
  const date = (offset: number) => {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() + offset)
    return d.toISOString().slice(0, 10)
  }

  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast")
  forecastUrl.searchParams.set("latitude", c.lat.toFixed(5))
  forecastUrl.searchParams.set("longitude", c.lng.toFixed(5))
  forecastUrl.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,precipitation,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,cloud_cover",
  )
  forecastUrl.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,weather_code,wind_speed_10m_max",
  )
  forecastUrl.searchParams.set("forecast_days", "14")
  forecastUrl.searchParams.set("timezone", "auto")
  if (imperial) {
    forecastUrl.searchParams.set("temperature_unit", "fahrenheit")
    forecastUrl.searchParams.set("wind_speed_unit", "mph")
    forecastUrl.searchParams.set("precipitation_unit", "inch")
  }

  const archiveUrl = new URL("https://archive-api.open-meteo.com/v1/archive")
  archiveUrl.searchParams.set("latitude", c.lat.toFixed(5))
  archiveUrl.searchParams.set("longitude", c.lng.toFixed(5))
  archiveUrl.searchParams.set("start_date", date(-14))
  archiveUrl.searchParams.set("end_date", date(-1))
  archiveUrl.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum")
  archiveUrl.searchParams.set("timezone", "auto")
  if (imperial) {
    archiveUrl.searchParams.set("temperature_unit", "fahrenheit")
    archiveUrl.searchParams.set("precipitation_unit", "inch")
  }

  const [forecast, history] = await Promise.allSettled([
    fetch(forecastUrl, { signal: AbortSignal.timeout(2_500), next: { revalidate: 900 } }).then((r) =>
      r.ok ? r.json() : null,
    ),
    fetch(archiveUrl, { signal: AbortSignal.timeout(2_500), next: { revalidate: 3600 } }).then((r) =>
      r.ok ? r.json() : null,
    ),
  ])

  return {
    status: forecast.status === "fulfilled" && forecast.value ? "live" : "unavailable",
    unitSystem: imperial ? ("imperial" as const) : ("metric" as const),
    current: forecast.status === "fulfilled" ? forecast.value?.current : null,
    units: forecast.status === "fulfilled" ? forecast.value?.current_units : null,
    forecastDaily: forecast.status === "fulfilled" ? forecast.value?.daily : null,
    historyDaily: history.status === "fulfilled" ? history.value?.daily : null,
  }
}

async function openMeteoAirQuality(lat: number, lng: number) {
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality")
  url.searchParams.set("latitude", lat.toFixed(5))
  url.searchParams.set("longitude", lng.toFixed(5))
  url.searchParams.set(
    "current",
    "us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,uv_index",
  )
  url.searchParams.set("timezone", "auto")

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(2_000),
      next: { revalidate: 900 },
    })
    if (!res.ok) return { status: "unavailable", current: null, units: null }
    const json = await res.json()
    return {
      status: "live",
      current: json.current ?? null,
      units: json.current_units ?? null,
    }
  } catch {
    return { status: "unavailable", current: null, units: null }
  }
}

async function fetchNwsAlerts(lat: number, lng: number) {
  try {
    const url = `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lng.toFixed(4)}`
    const res = await fetch(url, {
      headers: { Accept: "application/geo+json", "User-Agent": NWS_USER_AGENT },
      signal: AbortSignal.timeout(2_000),
      next: { revalidate: 300 },
    })
    if (!res.ok) return { status: "unavailable", items: [] as unknown[] }
    const json = await res.json()
    const items = (Array.isArray(json?.features) ? json.features : []).slice(0, 12).map((f: any) => {
      const p = f?.properties ?? {}
      return {
        id: String(f?.id ?? p.id ?? p["@id"] ?? Math.random()),
        title: String(p.event || p.headline || "Weather alert"),
        severity: String(p.severity || "Unknown"),
        urgency: String(p.urgency || ""),
        area: String(p.areaDesc || ""),
        expires: p.expires || p.ends || null,
        source: "NWS",
      }
    })
    return { status: items.length ? "live" : "none", items }
  } catch {
    return { status: "unavailable", items: [] as unknown[] }
  }
}

async function fetchNwsObservation(lat: number, lng: number) {
  try {
    const pointsRes = await fetch(
      `https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`,
      {
        headers: { Accept: "application/json", "User-Agent": NWS_USER_AGENT },
        signal: AbortSignal.timeout(1_500),
        next: { revalidate: 3600 },
      },
    )
    if (!pointsRes.ok) return null
    const points = await pointsRes.json()
    const stationsUrl = points?.properties?.observationStations
    if (!stationsUrl) return null

    const stationsRes = await fetch(stationsUrl, {
      headers: { Accept: "application/json", "User-Agent": NWS_USER_AGENT },
      signal: AbortSignal.timeout(1_500),
    })
    if (!stationsRes.ok) return null
    const stationsJson = await stationsRes.json()
    const stationId = stationsJson?.features?.[0]?.properties?.stationIdentifier
    if (!stationId) return null

    const obsRes = await fetch(
      `https://api.weather.gov/stations/${stationId}/observations/latest`,
      {
        headers: { Accept: "application/json", "User-Agent": NWS_USER_AGENT },
        signal: AbortSignal.timeout(1_500),
        next: { revalidate: 300 },
      },
    )
    if (!obsRes.ok) return null
    const obs = await obsRes.json()
    const p = obs?.properties ?? {}
    return {
      station: stationId,
      timestamp: p.timestamp ?? null,
      temperature_f: p.temperature?.value != null ? (p.temperature.value * 9) / 5 + 32 : null,
      wind_mph: p.windSpeed?.value != null ? p.windSpeed.value * 0.621371 : null,
      humidity_pct: p.relativeHumidity?.value ?? null,
      text: p.textDescription ?? null,
      source: "NWS",
    }
  } catch {
    return null
  }
}

async function fetchUsgsEarthquakes(lat: number, lng: number, zoom: number) {
  const radiusKm = zoom < 6 ? 800 : zoom < 9 ? 400 : zoom < 12 ? 150 : 75
  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const url = new URL("https://earthquake.usgs.gov/fdsnws/event/1/query")
  url.searchParams.set("format", "geojson")
  url.searchParams.set("latitude", lat.toFixed(4))
  url.searchParams.set("longitude", lng.toFixed(4))
  url.searchParams.set("maxradiuskm", String(radiusKm))
  url.searchParams.set("minmagnitude", zoom < 8 ? "4" : "2.5")
  url.searchParams.set("starttime", start)
  url.searchParams.set("orderby", "time")
  url.searchParams.set("limit", "20")

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2_000), next: { revalidate: 600 } })
    if (!res.ok) return []
    const json = await res.json()
    return (Array.isArray(json?.features) ? json.features : []).map((f: any) => ({
      id: String(f.id),
      title: f.properties?.title || "Earthquake",
      magnitude: f.properties?.mag ?? null,
      place: f.properties?.place ?? "",
      time: f.properties?.time ?? null,
      lat: f.geometry?.coordinates?.[1] ?? null,
      lng: f.geometry?.coordinates?.[0] ?? null,
      source: "USGS",
    }))
  } catch {
    return []
  }
}

function featureFromOverpass(element: any) {
  const tags = element?.tags || {}
  const lat = Number(element.lat ?? element.center?.lat)
  const lng = Number(element.lon ?? element.center?.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const type =
    tags.waterway ||
    tags.water ||
    tags.natural ||
    tags.leisure ||
    tags.boundary ||
    tags.protect_class ||
    tags.tourism ||
    tags.landuse ||
    tags.place ||
    "feature"
  return {
    id: `osm-${element.type}-${element.id}`,
    name: tags.name || tags.official_name || String(type).replace(/_/g, " "),
    type: String(type).replace(/_/g, " "),
    lat,
    lng,
    website: tags.website || tags["contact:website"],
    operator: tags.operator || tags.owner,
    source: "OpenStreetMap",
  }
}

function classifyFeatures(features: ReturnType<typeof featureFromOverpass>[]) {
  const valid = features.filter(Boolean) as NonNullable<ReturnType<typeof featureFromOverpass>>[]
  const water = valid
    .filter((f) => /river|stream|creek|canal|drain|water|spring|wetland|reservoir|lake|pond/i.test(f.type))
    .slice(0, 40)
  const geology = valid
    .filter((f) => /peak|volcano|cave|beach|hot spring|spring|cliff|rock|geyser/i.test(f.type))
    .slice(0, 30)
  const ecosystems = valid
    .filter((f) =>
      /park|reserve|protected|national|forest|wood|grass|meadow|wetland|farmland|orchard|vineyard|scrub|heath/i.test(
        f.type,
      ),
    )
    .slice(0, 50)
  return { water, geology, ecosystems }
}

async function runOverpass(query: string) {
  for (const endpoint of [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ]) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent": "Mycosoft-Earth-Simulator/1.0 (ops@mycosoft.com)",
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(2_000),
        next: { revalidate: 1800 },
      })
      if (!res.ok) continue
      const json = await res.json()
      return (Array.isArray(json?.elements) ? json.elements : [])
        .map(featureFromOverpass)
        .filter(Boolean)
    } catch {
      continue
    }
  }
  return []
}

async function overpassEnvironment(bounds: Bounds, zoom: number) {
  const c = center(bounds)
  const bboxArea = area(bounds)
  const useAround = bboxArea > 25 || zoom < 7
  const radius = overpassRadiusMeters(zoom, bboxArea)

  let elements: NonNullable<ReturnType<typeof featureFromOverpass>>[] = []

  if (useAround) {
    const aroundQuery = `
      [out:json][timeout:20];
      (
        node(around:${radius},${c.lat},${c.lng})["waterway"~"river|stream|creek|canal|drain"];
        way(around:${radius},${c.lat},${c.lng})["waterway"~"river|stream|creek|canal|drain"];
        node(around:${radius},${c.lat},${c.lng})["natural"~"water|spring|wetland|wood|beach|peak|volcano|cave_entrance|hot_spring|cliff|rock"];
        way(around:${radius},${c.lat},${c.lng})["natural"~"water|spring|wetland|wood|beach|peak|volcano|cave_entrance|hot_spring|cliff|rock"];
        node(around:${radius},${c.lat},${c.lng})["leisure"~"park|nature_reserve"];
        way(around:${radius},${c.lat},${c.lng})["leisure"~"park|nature_reserve"];
        way(around:${radius},${c.lat},${c.lng})["boundary"~"protected_area|national_park"];
        relation(around:${radius},${c.lat},${c.lng})["boundary"~"protected_area|national_park"];
        way(around:${radius},${c.lat},${c.lng})["landuse"~"forest|grass|meadow|orchard|vineyard|farmland"];
      );
      out center tags 80;
    `
    elements = await runOverpass(aroundQuery)
  } else {
    const bboxQuery = `
      [out:json][timeout:18];
      (
        node["waterway"~"river|stream|creek|canal|drain"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        way["waterway"~"river|stream|creek|canal|drain"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        node["natural"~"water|spring|wetland|wood|beach|peak|volcano|cave_entrance|hot_spring|cliff|rock"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        way["natural"~"water|spring|wetland|wood|beach|peak|volcano|cave_entrance|hot_spring|cliff|rock"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        relation["natural"~"water|spring|wetland|wood|beach|peak|volcano|cave_entrance|hot_spring|cliff|rock"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        node["leisure"~"park|nature_reserve"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        way["leisure"~"park|nature_reserve"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        relation["boundary"~"protected_area|national_park"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        way["boundary"~"protected_area|national_park"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        node["landuse"~"forest|grass|meadow|orchard|vineyard|farmland"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        way["landuse"~"forest|grass|meadow|orchard|vineyard|farmland"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      );
      out center tags 120;
    `
    elements = await runOverpass(bboxQuery)
  }

  const { water, geology, ecosystems } = classifyFeatures(elements)
  return {
    status: elements.length ? "live" : "none",
    mode: useAround ? "around" : "bbox",
    radius_m: useAround ? radius : null,
    water,
    ecosystems,
    geology,
  }
}

export async function GET(req: NextRequest) {
  const bounds = boundsFromRequest(req)
  const zoom = finite(req.nextUrl.searchParams.get("zoom"), 4)
  const c = center(bounds)
  const imperial = isUSLocation(c.lat, c.lng)

  try {
    const softTimeout = <T,>(promise: Promise<T>, fallback: T, timeoutMs: number): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
      ])

    const [weather, airQuality, features, usgsEarthquakes, nwsAlerts, nwsObservation] =
      await Promise.all([
        softTimeout(
          openMeteoEnvironment(bounds, imperial),
          {
            status: "deferred",
            unitSystem: imperial ? ("imperial" as const) : ("metric" as const),
            current: null,
            units: null,
            forecastDaily: null,
            historyDaily: null,
          },
          1_800,
        ),
        softTimeout(
          openMeteoAirQuality(c.lat, c.lng),
          { status: "deferred", current: null, units: null },
          1_200,
        ),
        softTimeout(
          overpassEnvironment(bounds, zoom),
          { status: "deferred", mode: "timeout", radius_m: null, water: [], ecosystems: [], geology: [] },
          1_200,
        ),
        softTimeout(fetchUsgsEarthquakes(c.lat, c.lng, zoom), [], 1_200),
        imperial
          ? softTimeout(fetchNwsAlerts(c.lat, c.lng), { status: "deferred", items: [] }, 1_200)
          : Promise.resolve({ status: "non_us", items: [] }),
        imperial ? softTimeout(fetchNwsObservation(c.lat, c.lng), null, 1_200) : Promise.resolve(null),
      ])

    return NextResponse.json(
      {
        ok: true,
        generatedAt: new Date().toISOString(),
        lod: zoom < 5 ? "regional" : zoom < 9 ? "watershed" : zoom < 12 ? "local ecosystem" : "site",
        unitSystem: imperial ? "imperial" : "metric",
        bounds,
        center: c,
        weather: {
          ...weather,
          nwsObservation,
        },
        airQuality,
        alerts: nwsAlerts,
        live: {
          usgsEarthquakes,
        },
        features,
      },
      {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" },
      },
    )
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: (error as Error)?.message || "viewport_environment_failed",
        generatedAt: new Date().toISOString(),
        bounds,
        center: c,
        unitSystem: imperial ? "imperial" : "metric",
      },
      { status: 200 },
    )
  }
}
