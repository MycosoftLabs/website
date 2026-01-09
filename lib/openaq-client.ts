/**
 * OpenAQ API Client
 * 
 * Fetches air quality data from OpenAQ (https://openaq.org)
 * OpenAQ provides free, open-source air quality data from around the world.
 * 
 * API Documentation: https://docs.openaq.org/
 */

const OPENAQ_API_BASE = "https://api.openaq.org/v2"

export interface OpenAQStation {
  id: number
  name: string
  city?: string
  country: string
  coordinates: {
    latitude: number
    longitude: number
  }
  distance_km: number
  measurements: {
    pm25?: number
    pm10?: number
    o3?: number
    no2?: number
    co?: number
    so2?: number
  }
  aqi?: number
  lastUpdated: string
}

export interface OpenAQMeasurement {
  parameter: string
  value: number
  unit: string
  lastUpdated: string
}

interface OpenAQLocationResponse {
  results: Array<{
    id: number
    name: string
    city?: string
    country: string
    coordinates: {
      latitude: number
      longitude: number
    }
    parameters: Array<{
      parameter: string
      lastValue: number
      unit: string
      lastUpdated: string
    }>
    lastUpdated: string
    distance?: number
  }>
  meta: {
    found: number
    limit: number
    page: number
  }
}

// Cache for AQI data (15-minute TTL)
const cache: Map<string, { data: OpenAQStation; timestamp: number }> = new Map()
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

// Convert PM2.5 to US EPA AQI
function pm25ToAQI(pm25: number): number {
  const breakpoints = [
    { low: 0, high: 12, aqiLow: 0, aqiHigh: 50 },
    { low: 12.1, high: 35.4, aqiLow: 51, aqiHigh: 100 },
    { low: 35.5, high: 55.4, aqiLow: 101, aqiHigh: 150 },
    { low: 55.5, high: 150.4, aqiLow: 151, aqiHigh: 200 },
    { low: 150.5, high: 250.4, aqiLow: 201, aqiHigh: 300 },
    { low: 250.5, high: 350.4, aqiLow: 301, aqiHigh: 400 },
    { low: 350.5, high: 500.4, aqiLow: 401, aqiHigh: 500 }
  ]
  
  for (const bp of breakpoints) {
    if (pm25 >= bp.low && pm25 <= bp.high) {
      return Math.round(
        ((bp.aqiHigh - bp.aqiLow) / (bp.high - bp.low)) * (pm25 - bp.low) + bp.aqiLow
      )
    }
  }
  
  return pm25 > 500.4 ? 500 : 0
}

// Calculate distance between two coordinates using Haversine formula
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Get the nearest air quality monitoring station
 */
export async function getNearestStation(
  lat: number,
  lng: number,
  radiusKm: number = 50
): Promise<OpenAQStation | null> {
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`
  
  // Check cache
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  
  try {
    // OpenAQ v2 API endpoint for locations
    const url = `${OPENAQ_API_BASE}/locations?coordinates=${lat},${lng}&radius=${radiusKm * 1000}&limit=5&order_by=distance`
    
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(10000)
    })
    
    if (!response.ok) {
      console.error(`OpenAQ API error: ${response.status}`)
      return null
    }
    
    const data: OpenAQLocationResponse = await response.json()
    
    if (!data.results || data.results.length === 0) {
      return null
    }
    
    // Get the nearest station
    const nearest = data.results[0]
    
    // Calculate distance
    const distance = haversineDistance(
      lat,
      lng,
      nearest.coordinates.latitude,
      nearest.coordinates.longitude
    )
    
    // Parse measurements
    const measurements: OpenAQStation["measurements"] = {}
    let pm25Value: number | undefined
    
    for (const param of nearest.parameters || []) {
      const key = param.parameter.toLowerCase()
      if (key === "pm25") {
        measurements.pm25 = param.lastValue
        pm25Value = param.lastValue
      } else if (key === "pm10") {
        measurements.pm10 = param.lastValue
      } else if (key === "o3") {
        measurements.o3 = param.lastValue
      } else if (key === "no2") {
        measurements.no2 = param.lastValue
      } else if (key === "co") {
        measurements.co = param.lastValue
      } else if (key === "so2") {
        measurements.so2 = param.lastValue
      }
    }
    
    const station: OpenAQStation = {
      id: nearest.id,
      name: nearest.name,
      city: nearest.city,
      country: nearest.country,
      coordinates: nearest.coordinates,
      distance_km: Math.round(distance * 10) / 10,
      measurements,
      aqi: pm25Value !== undefined ? pm25ToAQI(pm25Value) : undefined,
      lastUpdated: nearest.lastUpdated
    }
    
    // Cache result
    cache.set(cacheKey, { data: station, timestamp: Date.now() })
    
    return station
  } catch (error) {
    console.error("OpenAQ fetch error:", error)
    return null
  }
}

/**
 * Get AQI category based on value
 */
export function getAQICategory(aqi: number): {
  level: string
  color: string
  description: string
} {
  if (aqi <= 50) {
    return { level: "Good", color: "#00E400", description: "Air quality is satisfactory" }
  } else if (aqi <= 100) {
    return { level: "Moderate", color: "#FFFF00", description: "Acceptable air quality" }
  } else if (aqi <= 150) {
    return { level: "Unhealthy for Sensitive Groups", color: "#FF7E00", description: "Members of sensitive groups may experience health effects" }
  } else if (aqi <= 200) {
    return { level: "Unhealthy", color: "#FF0000", description: "Everyone may begin to experience health effects" }
  } else if (aqi <= 300) {
    return { level: "Very Unhealthy", color: "#8F3F97", description: "Health alert: everyone may experience more serious health effects" }
  } else {
    return { level: "Hazardous", color: "#7E0023", description: "Health warning of emergency conditions" }
  }
}

/**
 * Compare device IAQ to external AQI
 */
export function compareAQI(
  deviceIAQ: number,
  externalAQI: number
): {
  difference: number
  deviceHigher: boolean
  assessment: string
} {
  const difference = Math.abs(deviceIAQ - externalAQI)
  const deviceHigher = deviceIAQ > externalAQI
  
  let assessment: string
  if (difference <= 10) {
    assessment = "Device reading matches external station closely"
  } else if (difference <= 25) {
    assessment = deviceHigher
      ? "Device detects slightly higher pollution than regional average"
      : "Device detects slightly better air quality than regional average"
  } else if (difference <= 50) {
    assessment = deviceHigher
      ? "Local air quality noticeably worse than regional average"
      : "Local air quality noticeably better than regional average"
  } else {
    assessment = deviceHigher
      ? "Significant local pollution source detected"
      : "Excellent local air quality compared to region"
  }
  
  return { difference, deviceHigher, assessment }
}
