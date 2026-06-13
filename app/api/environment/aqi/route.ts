import { NextRequest, NextResponse } from "next/server"
import { getAirNowApiKey } from "@/lib/airnow-key"
import { getNearestStation, getAQICategory, compareAQI } from "@/lib/openaq-client"

const PARAM_LABELS: Record<string, string> = {
  O3: "Ozone",
  PM25: "PM2.5",
  "PM2.5": "PM2.5",
  PM10: "PM10",
  CO: "CO",
  NO2: "NO2",
  SO2: "SO2",
}

function airNowCategory(aqi: number): { level: string; color: string; description: string } {
  if (aqi <= 50) return { level: "Good", color: "#00E400", description: "Air quality is satisfactory." }
  if (aqi <= 100) return { level: "Moderate", color: "#FFFF00", description: "Air quality is acceptable." }
  if (aqi <= 150) return { level: "Unhealthy for Sensitive Groups", color: "#FF7E00", description: "Sensitive groups may experience effects." }
  if (aqi <= 200) return { level: "Unhealthy", color: "#FF0000", description: "Some members of the public may experience effects." }
  if (aqi <= 300) return { level: "Very Unhealthy", color: "#8F3F97", description: "Health alert: risk is increased for everyone." }
  return { level: "Hazardous", color: "#7E0023", description: "Health warning of emergency conditions." }
}

async function getAirNowStation(latitude: number, longitude: number, radiusKm: number, deviceValue?: number) {
  const key = getAirNowApiKey()
  if (!key) return null

  const distanceMi = Math.min(100, Math.max(1, Math.ceil(radiusKm / 1.60934)))
  const url = new URL("https://www.airnowapi.org/aq/observation/latLong/current/")
  url.searchParams.set("format", "application/json")
  url.searchParams.set("latitude", String(latitude))
  url.searchParams.set("longitude", String(longitude))
  url.searchParams.set("distance", String(distanceMi))
  url.searchParams.set("API_KEY", key)

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "MycosoftCREP/1.0", Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  })
  if (!res.ok) return null

  const rows: any[] = await res.json()
  const observations = rows
    .map((it) => {
      const aqi = Number(it.AQI)
      if (!Number.isFinite(aqi)) return null
      const category = airNowCategory(aqi)
      return {
        parameter: PARAM_LABELS[it.ParameterName] || it.ParameterName,
        parameter_raw: it.ParameterName,
        value: aqi,
        unit: "AQI",
        aqi,
        category,
        last_updated: `${it.DateObserved}T${String(it.HourObserved).padStart(2, "0")}:00:00${it.LocalTimeZone ? ` ${it.LocalTimeZone}` : ""}`,
        reporting_area: it.ReportingArea || null,
        state: it.StateCode || null,
        latitude: Number(it.Latitude),
        longitude: Number(it.Longitude),
      }
    })
    .filter(Boolean) as Array<Record<string, any>>

  if (observations.length === 0) return null
  const dominant = observations.reduce((best, item) => item.aqi > best.aqi ? item : best, observations[0])
  const comparison = typeof deviceValue === "number" && Number.isFinite(deviceValue)
    ? compareAQI(deviceValue, dominant.aqi)
    : null

  return {
    ok: true,
    found: true,
    provider: "airnow",
    station: {
      id: `airnow-${dominant.reporting_area || dominant.state || `${latitude},${longitude}`}`,
      name: dominant.reporting_area || "EPA AirNow monitor",
      city: dominant.reporting_area || undefined,
      country: "US",
      coordinates: {
        latitude: Number.isFinite(dominant.latitude) ? dominant.latitude : latitude,
        longitude: Number.isFinite(dominant.longitude) ? dominant.longitude : longitude,
      },
      distance_km: null,
      last_updated: dominant.last_updated,
    },
    measurements: observations,
    aqi: dominant.aqi,
    category: dominant.category,
    comparison: comparison
      ? {
          device_iaq: deviceValue,
          station_aqi: dominant.aqi,
          ...comparison,
        }
      : undefined,
  }
}

/**
 * GET /api/environment/aqi
 * 
 * Fetches AQI data from EPA AirNow first, then falls back to OpenAQ,
 * and optionally compares it to a device's IAQ reading.
 * 
 * Query params:
 * - lat: Latitude (required)
 * - lng: Longitude (required)
 * - device_iaq: Device's IAQ reading for comparison (optional)
 * - radius: Search radius in km (optional, default 50)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const deviceIAQ = searchParams.get("device_iaq")
  const radius = searchParams.get("radius")
  
  if (!lat || !lng) {
    return NextResponse.json(
      { ok: false, error: "lat and lng query parameters are required" },
      { status: 400 }
    )
  }
  
  const latitude = parseFloat(lat)
  const longitude = parseFloat(lng)
  
  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      { ok: false, error: "Invalid latitude or longitude" },
      { status: 400 }
    )
  }
  
  try {
    const radiusKm = radius ? parseInt(radius) : 50
    const deviceValue = deviceIAQ ? parseFloat(deviceIAQ) : undefined
    const airNow = await getAirNowStation(latitude, longitude, radiusKm, deviceValue)
    if (airNow) return NextResponse.json(airNow)

    const station = await getNearestStation(latitude, longitude, radiusKm)
    
    if (!station) {
      return NextResponse.json({
        ok: true,
        found: false,
        message: `No air quality monitoring stations found within ${radiusKm}km`,
        coordinates: { lat: latitude, lng: longitude }
      })
    }
    
    // Build response
    const response: Record<string, unknown> = {
      ok: true,
      found: true,
      station: {
        id: station.id,
        name: station.name,
        city: station.city,
        country: station.country,
        coordinates: station.coordinates,
        distance_km: station.distance_km,
        last_updated: station.lastUpdated
      },
      measurements: station.measurements,
      aqi: station.aqi,
      category: station.aqi ? getAQICategory(station.aqi) : null
    }
    
    // Compare with device IAQ if provided
    if (deviceValue !== undefined && station.aqi) {
      if (!isNaN(deviceValue)) {
        const comparison = compareAQI(deviceValue, station.aqi)
        response.comparison = {
          device_iaq: deviceValue,
          station_aqi: station.aqi,
          ...comparison
        }
      }
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error("AQI fetch error:", error)
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    )
  }
}
