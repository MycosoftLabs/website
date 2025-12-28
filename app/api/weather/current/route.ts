import { NextResponse } from "next/server"

// Open-Meteo API - Free, no API key required
const OPEN_METEO_API = "https://api.open-meteo.com/v1"

interface WeatherStation {
  id: string
  lat: number
  lng: number
  windSpeed: number
  windDirection: number
  humidity: number
  temperature: number
  pressure: number
  precipitation: number
  cloudCover: number
  city?: string
}

// Major cities for weather data points
const WEATHER_LOCATIONS = [
  { city: "New York", lat: 40.7128, lng: -74.0060 },
  { city: "Los Angeles", lat: 34.0522, lng: -118.2437 },
  { city: "Chicago", lat: 41.8781, lng: -87.6298 },
  { city: "Houston", lat: 29.7604, lng: -95.3698 },
  { city: "Miami", lat: 25.7617, lng: -80.1918 },
  { city: "Seattle", lat: 47.6062, lng: -122.3321 },
  { city: "Denver", lat: 39.7392, lng: -104.9903 },
  { city: "Atlanta", lat: 33.7490, lng: -84.3880 },
  { city: "London", lat: 51.5074, lng: -0.1278 },
  { city: "Paris", lat: 48.8566, lng: 2.3522 },
  { city: "Berlin", lat: 52.5200, lng: 13.4050 },
  { city: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { city: "Sydney", lat: -33.8688, lng: 151.2093 },
  { city: "São Paulo", lat: -23.5505, lng: -46.6333 },
  { city: "Mumbai", lat: 19.0760, lng: 72.8777 },
  { city: "Beijing", lat: 39.9042, lng: 116.4074 },
  { city: "Moscow", lat: 55.7558, lng: 37.6173 },
  { city: "Cairo", lat: 30.0444, lng: 31.2357 },
  { city: "Cape Town", lat: -33.9249, lng: 18.4241 },
  { city: "Vancouver", lat: 49.2827, lng: -123.1207 },
]

async function fetchWeatherData(locations: typeof WEATHER_LOCATIONS): Promise<WeatherStation[]> {
  const stations: WeatherStation[] = []

  // Batch locations into groups of 5 to avoid rate limits
  for (let i = 0; i < locations.length; i += 5) {
    const batch = locations.slice(i, i + 5)
    
    const promises = batch.map(async (loc) => {
      try {
        const params = new URLSearchParams({
          latitude: String(loc.lat),
          longitude: String(loc.lng),
          current: "temperature_2m,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover",
          timezone: "auto",
        })

        const response = await fetch(`${OPEN_METEO_API}/forecast?${params}`, {
          next: { revalidate: 600 }, // Cache for 10 minutes
        })

        if (!response.ok) return null

        const data = await response.json()
        const current = data.current

        return {
          id: `station-${loc.city?.toLowerCase().replace(/\s+/g, "-")}`,
          lat: loc.lat,
          lng: loc.lng,
          city: loc.city,
          windSpeed: current?.wind_speed_10m || 0,
          windDirection: current?.wind_direction_10m || 0,
          humidity: current?.relative_humidity_2m || 50,
          temperature: current?.temperature_2m || 20,
          pressure: current?.surface_pressure || 1013,
          precipitation: current?.precipitation || 0,
          cloudCover: current?.cloud_cover || 0,
        }
      } catch (error) {
        console.error(`Failed to fetch weather for ${loc.city}:`, error)
        return null
      }
    })

    const results = await Promise.all(promises)
    stations.push(...results.filter((s): s is WeatherStation => s !== null))
  }

  return stations
}

// Get additional global weather grid points
async function fetchGlobalGrid(): Promise<WeatherStation[]> {
  const gridPoints: { lat: number; lng: number }[] = []
  
  // Create a sparse global grid
  for (let lat = -60; lat <= 70; lat += 30) {
    for (let lng = -150; lng <= 150; lng += 40) {
      gridPoints.push({ lat, lng })
    }
  }

  const stations: WeatherStation[] = []

  for (const point of gridPoints.slice(0, 20)) {
    try {
      const params = new URLSearchParams({
        latitude: String(point.lat),
        longitude: String(point.lng),
        current: "wind_speed_10m,wind_direction_10m,relative_humidity_2m",
        timezone: "auto",
      })

      const response = await fetch(`${OPEN_METEO_API}/forecast?${params}`, {
        next: { revalidate: 600 },
      })

      if (!response.ok) continue

      const data = await response.json()
      const current = data.current

      stations.push({
        id: `grid-${point.lat}-${point.lng}`,
        lat: point.lat,
        lng: point.lng,
        windSpeed: current?.wind_speed_10m || 0,
        windDirection: current?.wind_direction_10m || 0,
        humidity: current?.relative_humidity_2m || 50,
        temperature: 0,
        pressure: 1013,
        precipitation: 0,
        cloudCover: 0,
      })
    } catch {
      continue
    }
  }

  return stations
}

export async function GET() {
  try {
    // Fetch from both city locations and global grid
    const [cityStations, gridStations] = await Promise.all([
      fetchWeatherData(WEATHER_LOCATIONS),
      fetchGlobalGrid(),
    ])

    const stations = [...cityStations, ...gridStations]

    return NextResponse.json({
      stations,
      timestamp: new Date().toISOString(),
      source: "Open-Meteo",
      realData: true,
      count: stations.length,
    })
  } catch (error) {
    console.error("Weather API error:", error)
    return NextResponse.json({
      stations: [],
      timestamp: new Date().toISOString(),
      source: "error",
      realData: false,
      error: "Failed to fetch weather data",
    })
  }
}
