import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

type Bounds = { north: number; south: number; east: number; west: number }

function finite(value: string | null, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function boundsFromRequest(req: NextRequest): Bounds {
  const q = req.nextUrl.searchParams
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
  const lng = Math.max(0.001, bounds.east >= bounds.west ? bounds.east - bounds.west : 360 - bounds.west + bounds.east)
  return lat * lng
}

async function openMeteoEnvironment(bounds: Bounds) {
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
  forecastUrl.searchParams.set("current", "temperature_2m,relative_humidity_2m,precipitation,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m")
  forecastUrl.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,weather_code")
  forecastUrl.searchParams.set("forecast_days", "14")
  forecastUrl.searchParams.set("timezone", "auto")

  const archiveUrl = new URL("https://archive-api.open-meteo.com/v1/archive")
  archiveUrl.searchParams.set("latitude", c.lat.toFixed(5))
  archiveUrl.searchParams.set("longitude", c.lng.toFixed(5))
  archiveUrl.searchParams.set("start_date", date(-14))
  archiveUrl.searchParams.set("end_date", date(-1))
  archiveUrl.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum")
  archiveUrl.searchParams.set("timezone", "auto")

  const [forecast, history] = await Promise.allSettled([
    fetch(forecastUrl, { signal: AbortSignal.timeout(8_000), next: { revalidate: 900 } }).then((r) => r.ok ? r.json() : null),
    fetch(archiveUrl, { signal: AbortSignal.timeout(8_000), next: { revalidate: 3600 } }).then((r) => r.ok ? r.json() : null),
  ])
  return {
    status: forecast.status === "fulfilled" && forecast.value ? "live" : "unavailable",
    current: forecast.status === "fulfilled" ? forecast.value?.current : null,
    units: forecast.status === "fulfilled" ? forecast.value?.current_units : null,
    forecastDaily: forecast.status === "fulfilled" ? forecast.value?.daily : null,
    historyDaily: history.status === "fulfilled" ? history.value?.daily : null,
  }
}

function featureFromOverpass(element: any) {
  const tags = element?.tags || {}
  const lat = Number(element.lat ?? element.center?.lat)
  const lng = Number(element.lon ?? element.center?.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const type = tags.waterway || tags.water || tags.natural || tags.leisure || tags.boundary || tags.protect_class || tags.tourism || tags.landuse || tags.place || "feature"
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

async function overpassEnvironment(bounds: Bounds, zoom: number) {
  if (area(bounds) > 25 && zoom < 7) {
    return { status: "bbox_too_large", water: [], ecosystems: [], geology: [] }
  }
  const query = `
    [out:json][timeout:18];
    (
      node["waterway"~"river|stream|creek|canal|drain"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      way["waterway"~"river|stream|creek|canal|drain"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      node["natural"~"water|spring|wetland|wood|beach|peak|volcano|cave_entrance|hot_spring"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      way["natural"~"water|spring|wetland|wood|beach|peak|volcano|cave_entrance|hot_spring"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      relation["natural"~"water|spring|wetland|wood|beach|peak|volcano|cave_entrance|hot_spring"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      node["leisure"~"park|nature_reserve"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      way["leisure"~"park|nature_reserve"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      relation["boundary"~"protected_area|national_park"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      way["boundary"~"protected_area|national_park"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      node["landuse"~"forest|grass|meadow|orchard|vineyard|farmland"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      way["landuse"~"forest|grass|meadow|orchard|vineyard|farmland"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
    );
    out center tags 120;
  `
  for (const endpoint of ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent": "Mycosoft-Earth-Simulator/1.0 (ops@mycosoft.com)",
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(20_000),
        next: { revalidate: 1800 },
      })
      if (!res.ok) continue
      const json = await res.json()
      const features = (Array.isArray(json?.elements) ? json.elements : []).map(featureFromOverpass).filter(Boolean)
      const water = features.filter((f: any) => /river|stream|creek|canal|drain|water|spring|wetland|reservoir/i.test(f.type)).slice(0, 40)
      const geology = features.filter((f: any) => /peak|volcano|cave|beach|hot spring|spring/i.test(f.type)).slice(0, 30)
      const ecosystems = features.filter((f: any) => /park|reserve|protected|national|forest|wood|grass|meadow|wetland|farmland|orchard|vineyard/i.test(f.type)).slice(0, 50)
      return { status: "live", water, ecosystems, geology }
    } catch {
      continue
    }
  }
  return { status: "overpass_unavailable", water: [], ecosystems: [], geology: [] }
}

export async function GET(req: NextRequest) {
  const bounds = boundsFromRequest(req)
  const zoom = finite(req.nextUrl.searchParams.get("zoom"), 4)
  try {
    const [weather, features] = await Promise.all([
      openMeteoEnvironment(bounds),
      overpassEnvironment(bounds, zoom),
    ])
    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      lod: zoom < 5 ? "regional" : zoom < 9 ? "watershed" : zoom < 12 ? "local ecosystem" : "site",
      bounds,
      center: center(bounds),
      weather,
      features,
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: (error as Error)?.message || "viewport_environment_failed",
      generatedAt: new Date().toISOString(),
      bounds,
      center: center(bounds),
    }, { status: 200 })
  }
}
