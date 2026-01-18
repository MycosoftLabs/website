import { NextRequest, NextResponse } from "next/server"

/**
 * Weather Overlay Tiles API
 * 
 * Generates raster tiles showing weather conditions:
 * - Precipitation
 * - Cloud cover
 * - Wind patterns
 * 
 * GET /api/earth-simulator/weather-tiles/{z}/{x}/{y}
 * 
 * Query params:
 * - layer: "precipitation" | "clouds" | "wind" (default: precipitation)
 * 
 * Returns: PNG tile (256x256)
 */

// Tile size in pixels
const TILE_SIZE = 256

// Precipitation color gradient (mm/hr)
const PRECIP_GRADIENT = [
  { value: 0, color: [0, 0, 0, 0] },           // None
  { value: 0.5, color: [150, 200, 255, 100] }, // Light
  { value: 2, color: [100, 150, 255, 150] },   // Moderate
  { value: 5, color: [50, 100, 255, 180] },    // Heavy
  { value: 10, color: [255, 100, 100, 200] },  // Very heavy
  { value: 20, color: [255, 50, 150, 220] },   // Extreme
]

// Cloud cover gradient (0-100%)
const CLOUD_GRADIENT = [
  { value: 0, color: [0, 0, 0, 0] },            // Clear
  { value: 25, color: [200, 200, 200, 50] },    // Partly cloudy
  { value: 50, color: [180, 180, 180, 100] },   // Mostly cloudy
  { value: 75, color: [150, 150, 150, 150] },   // Overcast
  { value: 100, color: [120, 120, 120, 180] },  // Complete cover
]

type WeatherLayer = "precipitation" | "clouds" | "wind"

/**
 * Convert tile coordinates to lat/lng bounds
 */
function tileToBounds(z: number, x: number, y: number): {
  north: number
  south: number
  east: number
  west: number
} {
  const n = Math.pow(2, z)
  const west = (x / n) * 360 - 180
  const east = ((x + 1) / n) * 360 - 180
  const north = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * (180 / Math.PI)
  const south = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * (180 / Math.PI)
  return { north, south, east, west }
}

/**
 * Simulate weather data for a location
 * Real implementation would use OpenWeatherMap, NOAA, etc.
 */
function simulateWeather(lat: number, lng: number, layer: WeatherLayer): number {
  // Use noise-like functions for realistic-looking patterns
  const time = Date.now() / 10000000  // Slow movement
  
  // Create moving weather patterns
  const pattern1 = Math.sin((lat + time) * 0.5 + lng * 0.3) * 0.5 + 0.5
  const pattern2 = Math.cos((lng - time * 0.7) * 0.4 + lat * 0.6) * 0.5 + 0.5
  const pattern3 = Math.sin((lat * 0.8 + lng * 0.5 + time * 0.5)) * 0.5 + 0.5
  
  // Combine patterns
  const combined = (pattern1 * 0.4 + pattern2 * 0.35 + pattern3 * 0.25)
  
  switch (layer) {
    case "precipitation":
      // Precipitation more likely in certain latitudes
      const precipZone = Math.abs(lat) > 30 && Math.abs(lat) < 60 ? 0.3 : 0
      const precip = (combined * 15 + precipZone * 5) * (combined > 0.6 ? 1 : 0.1)
      return Math.max(0, precip)
      
    case "clouds":
      // Cloud cover percentage
      return combined * 100
      
    case "wind":
      // Wind speed (simplified)
      const baseWind = 5 + Math.abs(lat) * 0.2  // Higher latitudes = more wind
      return baseWind + combined * 20
      
    default:
      return 0
  }
}

/**
 * Get color from gradient
 */
function getGradientColor(
  value: number,
  gradient: Array<{ value: number; color: number[] }>
): [number, number, number, number] {
  let lower = gradient[0]
  let upper = gradient[gradient.length - 1]
  
  for (let i = 0; i < gradient.length - 1; i++) {
    if (value >= gradient[i].value && value <= gradient[i + 1].value) {
      lower = gradient[i]
      upper = gradient[i + 1]
      break
    }
  }
  
  const range = upper.value - lower.value
  const t = range === 0 ? 0 : (value - lower.value) / range
  
  return [
    Math.round(lower.color[0] + (upper.color[0] - lower.color[0]) * t),
    Math.round(lower.color[1] + (upper.color[1] - lower.color[1]) * t),
    Math.round(lower.color[2] + (upper.color[2] - lower.color[2]) * t),
    Math.round(lower.color[3] + (upper.color[3] - lower.color[3]) * t),
  ]
}

/**
 * Create a transparent PNG placeholder
 */
function createTransparentPNG(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00,
    0x08, 0x06, 0x00, 0x00, 0x00,
    0x5C, 0x72, 0xA8, 0x66,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
    0xAE, 0x42, 0x60, 0x82,
  ])
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  try {
    const { z, x, y: yWithExt } = await params
    const y = yWithExt.replace(/\.png$/, "")
    
    const zoom = parseInt(z, 10)
    const tileX = parseInt(x, 10)
    const tileY = parseInt(y, 10)
    
    // Get layer type from query params
    const { searchParams } = new URL(request.url)
    const layer = (searchParams.get("layer") || "precipitation") as WeatherLayer
    
    if (isNaN(zoom) || isNaN(tileX) || isNaN(tileY)) {
      return NextResponse.json(
        { error: "Invalid tile coordinates" },
        { status: 400 }
      )
    }
    
    if (zoom < 0 || zoom > 20) {
      return NextResponse.json(
        { error: "Zoom must be between 0 and 20" },
        { status: 400 }
      )
    }
    
    // Get bounds for metadata
    const bounds = tileToBounds(zoom, tileX, tileY)
    const centerLat = (bounds.north + bounds.south) / 2
    const centerLng = (bounds.east + bounds.west) / 2
    const weatherValue = simulateWeather(centerLat, centerLng, layer)
    
    // For stub, return transparent tile
    // In production, generate actual weather visualization
    const png = createTransparentPNG()
    
    return new NextResponse(png, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=900", // 15 minutes
        "X-Tile-Coords": `${zoom}/${tileX}/${tileY}`,
        "X-Weather-Layer": layer,
        "X-Weather-Value": weatherValue.toFixed(2),
      },
    })
  } catch (error) {
    console.error("[Tile API] Error generating weather tile:", error)
    return NextResponse.json(
      { error: "Failed to generate tile" },
      { status: 500 }
    )
  }
}
