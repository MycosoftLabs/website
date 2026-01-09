import { NextRequest, NextResponse } from "next/server"
import { getNearestStation, getAQICategory, compareAQI } from "@/lib/openaq-client"

/**
 * GET /api/environment/aqi
 * 
 * Fetches AQI data from the nearest OpenAQ monitoring station
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
    if (deviceIAQ && station.aqi) {
      const deviceValue = parseFloat(deviceIAQ)
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
