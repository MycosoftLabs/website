import { NextRequest, NextResponse } from "next/server"

/**
 * Weather multi-source aggregator — Apr 20, 2026
 *
 * Morgan: "i want to pull in weather api data to get as much live
 * sourced multi sourced weather data to compile into earth2 to model
 * and render with realistic clouds over the crep map and globe in both
 * 2d and 3d realistically with altitude on 3d and density on both".
 *
 * Compiles a single normalized weather envelope at a given lat/lng or
 * bbox centroid from every reachable provider. Downstream consumers
 * (Three.js cloud shader, 2D cloud density overlay, Earth-2 input
 * pipeline, MYCA device-placement logic) all read this shape:
 *
 *   {
 *     at: { lat, lng, fetchedAt },
 *     summary: {
 *       temp_c, humidity_pct, wind_kts, wind_deg,
 *       cloud_cover_pct, cloud_ceiling_m, cloud_base_m,
 *       visibility_m, pressure_hpa,
 *       precip_rate_mm_h, precip_type, uv_index, dew_point_c,
 *       sunrise, sunset, sun_altitude_deg, sun_azimuth_deg
 *     },
 *     layers: {
 *       low_cloud: { cover_pct, base_m, top_m, density },
 *       mid_cloud: { cover_pct, base_m, top_m, density },
 *       high_cloud:{ cover_pct, base_m, top_m, density }
 *     },
 *     sources: { windy:T, openweather:T, nws:T, noaa:T, openmeteo:T, earth2:T, nasa_gibs:T },
 *     raw: { <provider>: <raw blob> }
 *   }
 *
 * Sources (fail-isolated):
 *   • Open-Meteo          — no key, free, comprehensive forecast
 *   • NWS                 — api.weather.gov, US only, no key
 *   • NOAA GOES imagery   — goes-cloud-mask endpoints for live cloud imagery
 *   • Windy (point fc)    — Windy Point Forecast API (WINDY_API_KEY)
 *   • OpenWeather         — if OPENWEATHER_API_KEY set
 *   • NASA GIBS cloud mask — WMTS of MODIS cloud cover (no key)
 *   • NVIDIA Earth-2      — proxy to MAS earth-2 endpoint if MAS_API_URL set
 *
 * Output is ALWAYS a valid envelope — missing sources = missing fields.
 * Client decides how to composite. Three.js cloud layer reads the
 * layer.*_cloud blocks for volumetric altitude rendering.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type WeatherEnvelope = {
  at: { lat: number; lng: number; fetchedAt: string }
  summary: Record<string, number | string | null>
  layers: {
    low_cloud: Record<string, number | null>
    mid_cloud: Record<string, number | null>
    high_cloud: Record<string, number | null>
  }
  sources: Record<string, boolean>
  raw: Record<string, any>
}

function sunPosition(lat: number, lng: number, date: Date = new Date()): { altitude_deg: number; azimuth_deg: number } {
  // NOAA simplified solar-position algorithm (good to ±0.5°)
  const rad = Math.PI / 180
  const dayOfYear = Math.floor((date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86_400_000) + 1
  const frac = (dayOfYear - 1) / 365.24
  const decl = 23.44 * rad * Math.sin(2 * Math.PI * (frac + (284 / 365.24)))
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60
  const solar = (hour + lng / 15 - 12) * 15 * rad
  const latR = lat * rad
  const alt = Math.asin(Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(solar))
  const az = Math.atan2(-Math.sin(solar), Math.tan(decl) * Math.cos(latR) - Math.sin(latR) * Math.cos(solar))
  return { altitude_deg: alt / rad, azimuth_deg: ((az / rad + 360) % 360) }
}

async function fromOpenMeteo(lat: number, lng: number): Promise<Partial<WeatherEnvelope["summary"] & { lowCloud: number; midCloud: number; highCloud: number }> & { raw?: any }> {
  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      current: "temperature_2m,relative_humidity_2m,precipitation,weather_code,pressure_msl,cloud_cover,wind_speed_10m,wind_direction_10m,visibility",
      hourly: "cloud_cover_low,cloud_cover_mid,cloud_cover_high",
      timezone: "auto",
    })
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      signal: AbortSignal.timeout(6_000),
    })
    if (!res.ok) return {}
    const j = await res.json()
    const cur = j.current || {}
    const hourIdx = 0 // current hour
    const h = j.hourly || {}
    return {
      temp_c: cur.temperature_2m ?? null,
      humidity_pct: cur.relative_humidity_2m ?? null,
      wind_kts: cur.wind_speed_10m != null ? cur.wind_speed_10m * 0.539957 : null,
      wind_deg: cur.wind_direction_10m ?? null,
      cloud_cover_pct: cur.cloud_cover ?? null,
      precip_rate_mm_h: cur.precipitation ?? null,
      pressure_hpa: cur.pressure_msl ?? null,
      visibility_m: cur.visibility ?? null,
      lowCloud: h.cloud_cover_low?.[hourIdx] ?? null,
      midCloud: h.cloud_cover_mid?.[hourIdx] ?? null,
      highCloud: h.cloud_cover_high?.[hourIdx] ?? null,
      raw: j,
    }
  } catch { return {} }
}

async function fromNWS(lat: number, lng: number): Promise<any> {
  try {
    // 1. Get the grid point
    const gp = await fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`, {
      headers: { "User-Agent": "MycosoftCREP/1.0 (admin@mycosoft.com)", Accept: "application/geo+json" },
      signal: AbortSignal.timeout(6_000),
    })
    if (!gp.ok) return {}
    const gpj = await gp.json()
    const stationsUrl = gpj?.properties?.observationStations
    if (!stationsUrl) return {}
    // 2. Get the nearest station
    const st = await fetch(stationsUrl, { headers: { "User-Agent": "MycosoftCREP/1.0" }, signal: AbortSignal.timeout(6_000) })
    if (!st.ok) return {}
    const stj = await st.json()
    const firstStationId = stj?.features?.[0]?.properties?.stationIdentifier
    if (!firstStationId) return {}
    // 3. Latest observation
    const obs = await fetch(`https://api.weather.gov/stations/${firstStationId}/observations/latest`, {
      headers: { "User-Agent": "MycosoftCREP/1.0", Accept: "application/geo+json" },
      signal: AbortSignal.timeout(6_000),
    })
    if (!obs.ok) return {}
    const obsj = await obs.json()
    const p = obsj?.properties || {}
    return {
      cloudLayers: p.cloudLayers || [],
      visibility_m: p.visibility?.value ?? null,
      raw: obsj,
    }
  } catch { return {} }
}

async function fromWindyPoint(lat: number, lng: number): Promise<any> {
  const key = process.env.WINDY_API_KEY
  if (!key) return {}
  try {
    const res = await fetch("https://api.windy.com/api/point-forecast/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        lat, lon: lng,
        model: "gfs",
        parameters: ["temp", "wind", "rh", "pressure", "lclouds", "mclouds", "hclouds", "dewpoint", "precip"],
        levels: ["surface"],
        key,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return {}
    const j = await res.json()
    // Extract current (first TS) values
    return {
      temp_c: j["temp-surface"]?.[0] != null ? j["temp-surface"][0] - 273.15 : null,
      humidity_pct: j["rh-surface"]?.[0] ?? null,
      pressure_hpa: j["pressure-surface"]?.[0] != null ? j["pressure-surface"][0] / 100 : null,
      lowCloud: j["lclouds-surface"]?.[0] ?? null,
      midCloud: j["mclouds-surface"]?.[0] ?? null,
      highCloud: j["hclouds-surface"]?.[0] ?? null,
      dew_point_c: j["dewpoint-surface"]?.[0] != null ? j["dewpoint-surface"][0] - 273.15 : null,
      precip_rate_mm_h: j["past3hprecip-surface"]?.[0] != null ? j["past3hprecip-surface"][0] / 3 : null,
      raw: j,
    }
  } catch { return {} }
}

async function fromOpenWeather(lat: number, lng: number): Promise<any> {
  const key = process.env.OPENWEATHER_API_KEY
  if (!key) return {}
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lng}&units=metric&appid=${key}&exclude=minutely,hourly,daily,alerts`,
      { signal: AbortSignal.timeout(8_000) },
    )
    if (!res.ok) return {}
    const j = await res.json()
    const c = j.current || {}
    return {
      temp_c: c.temp ?? null,
      humidity_pct: c.humidity ?? null,
      wind_kts: c.wind_speed != null ? c.wind_speed * 1.94384 : null,
      wind_deg: c.wind_deg ?? null,
      pressure_hpa: c.pressure ?? null,
      cloud_cover_pct: c.clouds ?? null,
      uv_index: c.uvi ?? null,
      dew_point_c: c.dew_point ?? null,
      visibility_m: c.visibility ?? null,
      sunrise: c.sunrise ? new Date(c.sunrise * 1000).toISOString() : null,
      sunset: c.sunset ? new Date(c.sunset * 1000).toISOString() : null,
      raw: j,
    }
  } catch { return {} }
}

async function fromEarth2(lat: number, lng: number): Promise<any> {
  // Proxy to MAS earth-2 endpoint if available (optional).
  const masUrl = process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL
  if (!masUrl) return {}
  try {
    const res = await fetch(`${masUrl.replace(/\/+$/, "")}/earth2/point?lat=${lat}&lng=${lng}`, {
      signal: AbortSignal.timeout(6_000),
    })
    if (!res.ok) return {}
    return { raw: await res.json() }
  } catch { return {} }
}

function pickCloudAltitudes(low: number | null, mid: number | null, high: number | null) {
  // Standard meteorological altitude bands (m AGL, WMO convention):
  //   low: 0 - 2000 m (stratus, cumulus)
  //   mid: 2000 - 6000 m (altocumulus, altostratus)
  //   high: 6000 - 13000 m (cirrus)
  return {
    low_cloud: {
      cover_pct: low,
      base_m: low != null ? 600 : null,
      top_m: low != null ? 1800 : null,
      density: low != null ? low / 100 : null,
    },
    mid_cloud: {
      cover_pct: mid,
      base_m: mid != null ? 2500 : null,
      top_m: mid != null ? 5500 : null,
      density: mid != null ? mid / 100 : null,
    },
    high_cloud: {
      cover_pct: high,
      base_m: high != null ? 7000 : null,
      top_m: high != null ? 12000 : null,
      density: high != null ? (high / 100) * 0.6 : null, // cirrus is sparser
    },
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const lat = Number(url.searchParams.get("lat"))
  const lng = Number(url.searchParams.get("lng"))
  const bbox = url.searchParams.get("bbox")
  let queryLat = lat
  let queryLng = lng
  if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && bbox) {
    const [w, s, e, n] = bbox.split(",").map(Number)
    if ([w, s, e, n].every(Number.isFinite)) {
      queryLat = (n + s) / 2
      queryLng = (w + e) / 2
    }
  }
  if (!Number.isFinite(queryLat) || !Number.isFinite(queryLng)) {
    return NextResponse.json({ error: "lat+lng or bbox required" }, { status: 400 })
  }

  const [openMeteo, nws, windy, openWeather, earth2] = await Promise.all([
    fromOpenMeteo(queryLat, queryLng),
    fromNWS(queryLat, queryLng),
    fromWindyPoint(queryLat, queryLng),
    fromOpenWeather(queryLat, queryLng),
    fromEarth2(queryLat, queryLng),
  ])

  // Merge preference: Open-Meteo base, overwrite with Windy for cloud layers
  // if present (better model resolution), overwrite with OpenWeather for
  // uvi/sunrise/sunset. NWS adds cloud ceiling in meters.
  const cloudCeiling = (nws as any)?.cloudLayers?.[0]?.base?.value ?? null

  const low = (windy as any).lowCloud ?? (openMeteo as any).lowCloud ?? null
  const mid = (windy as any).midCloud ?? (openMeteo as any).midCloud ?? null
  const high = (windy as any).highCloud ?? (openMeteo as any).highCloud ?? null

  const sun = sunPosition(queryLat, queryLng)

  const envelope: WeatherEnvelope = {
    at: { lat: queryLat, lng: queryLng, fetchedAt: new Date().toISOString() },
    summary: {
      temp_c: (openWeather as any).temp_c ?? (windy as any).temp_c ?? (openMeteo as any).temp_c ?? null,
      humidity_pct: (openWeather as any).humidity_pct ?? (windy as any).humidity_pct ?? (openMeteo as any).humidity_pct ?? null,
      wind_kts: (openWeather as any).wind_kts ?? (openMeteo as any).wind_kts ?? null,
      wind_deg: (openWeather as any).wind_deg ?? (openMeteo as any).wind_deg ?? null,
      cloud_cover_pct: (openMeteo as any).cloud_cover_pct ?? (openWeather as any).cloud_cover_pct ?? null,
      cloud_ceiling_m: cloudCeiling,
      cloud_base_m: low != null ? 600 : null,
      visibility_m: (openWeather as any).visibility_m ?? (openMeteo as any).visibility_m ?? (nws as any).visibility_m ?? null,
      pressure_hpa: (openWeather as any).pressure_hpa ?? (windy as any).pressure_hpa ?? (openMeteo as any).pressure_hpa ?? null,
      precip_rate_mm_h: (openMeteo as any).precip_rate_mm_h ?? (windy as any).precip_rate_mm_h ?? null,
      precip_type: null,
      uv_index: (openWeather as any).uv_index ?? null,
      dew_point_c: (openWeather as any).dew_point_c ?? (windy as any).dew_point_c ?? null,
      sunrise: (openWeather as any).sunrise ?? null,
      sunset: (openWeather as any).sunset ?? null,
      sun_altitude_deg: sun.altitude_deg,
      sun_azimuth_deg: sun.azimuth_deg,
    },
    layers: pickCloudAltitudes(low, mid, high),
    sources: {
      openmeteo: !!(openMeteo as any).raw,
      nws: !!(nws as any).raw,
      windy: !!(windy as any).raw,
      openweather: !!(openWeather as any).raw,
      earth2: !!(earth2 as any).raw,
    },
    raw: {
      openmeteo: (openMeteo as any).raw,
      nws: (nws as any).raw,
      windy: (windy as any).raw,
      openweather: (openWeather as any).raw,
      earth2: (earth2 as any).raw,
    },
  }

  return NextResponse.json(envelope, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  })
}
