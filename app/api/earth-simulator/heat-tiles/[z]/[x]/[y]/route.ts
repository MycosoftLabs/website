import { NextRequest, NextResponse } from "next/server"

/**
 * Temperature Heat Tiles API
 * 
 * Generates raster tiles showing temperature data
 * based on weather API data and interpolation.
 * 
 * GET /api/earth-simulator/heat-tiles/{z}/{x}/{y}
 * 
 * Returns: PNG tile (256x256)
 */

// Tile size in pixels
const TILE_SIZE = 256

// Temperature color gradient (in Celsius)
const TEMP_GRADIENT = [
  { temp: -40, color: [128, 0, 255, 200] },   // Purple (very cold)
  { temp: -20, color: [0, 0, 255, 200] },     // Blue (cold)
  { temp: 0, color: [0, 200, 255, 200] },     // Cyan (freezing)
  { temp: 10, color: [0, 255, 128, 200] },    // Green-cyan (cool)
  { temp: 20, color: [128, 255, 0, 200] },    // Yellow-green (mild)
  { temp: 30, color: [255, 200, 0, 200] },    // Yellow-orange (warm)
  { temp: 40, color: [255, 100, 0, 200] },    // Orange (hot)
  { temp: 50, color: [255, 0, 0, 200] },      // Red (very hot)
]

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
 * Estimate temperature for a location
 * Simplified model based on:
 * - Latitude (equator is warmer)
 * - Time of year simulation
 * - Altitude approximation
 * 
 * Real implementation would fetch from weather APIs
 */
function estimateTemperature(lat: number, lng: number): number {
  // Base temperature from latitude
  // Equator ~28°C, poles ~-20°C
  const latTemp = 28 - Math.abs(lat) * 0.8
  
  // Seasonal variation (simplified, assuming northern hemisphere summer)
  const now = new Date()
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  const seasonalPhase = (dayOfYear - 172) / 365 * Math.PI * 2  // Peak at summer solstice
  const seasonalVariation = Math.cos(seasonalPhase) * 15 * (Math.abs(lat) / 90)
  
  // Diurnal variation (simplified)
  const hourOfDay = now.getHours()
  const diurnalPhase = (hourOfDay - 14) / 24 * Math.PI * 2  // Peak at 2 PM
  const diurnalVariation = Math.cos(diurnalPhase) * 5
  
  // Continental vs maritime (simplified - land masses are more extreme)
  // This is a rough approximation
  const isLikeLand = Math.abs(Math.sin(lng * 2)) > 0.5
  const continentalModifier = isLikeLand ? 5 : -2
  
  // Combine
  const temperature = latTemp + seasonalVariation + diurnalVariation + continentalModifier
  
  // Add some noise for variation
  const noise = Math.sin(lat * 5 + lng * 7) * 3
  
  return temperature + noise
}

/**
 * Get color from temperature gradient
 */
function getTemperatureColor(temp: number): [number, number, number, number] {
  // Clamp temperature
  temp = Math.max(-40, Math.min(50, temp))
  
  // Find gradient stops
  let lower = TEMP_GRADIENT[0]
  let upper = TEMP_GRADIENT[TEMP_GRADIENT.length - 1]
  
  for (let i = 0; i < TEMP_GRADIENT.length - 1; i++) {
    if (temp >= TEMP_GRADIENT[i].temp && temp <= TEMP_GRADIENT[i + 1].temp) {
      lower = TEMP_GRADIENT[i]
      upper = TEMP_GRADIENT[i + 1]
      break
    }
  }
  
  // Interpolate
  const range = upper.temp - lower.temp
  const t = range === 0 ? 0 : (temp - lower.temp) / range
  
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
    
    // For stub, return transparent tile
    // In production, generate actual temperature visualization
    const png = createTransparentPNG()
    
    // Get bounds for metadata
    const bounds = tileToBounds(zoom, tileX, tileY)
    const centerTemp = estimateTemperature(
      (bounds.north + bounds.south) / 2,
      (bounds.east + bounds.west) / 2
    )
    
    return new NextResponse(png, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=1800", // 30 minutes (weather changes)
        "X-Tile-Coords": `${zoom}/${tileX}/${tileY}`,
        "X-Center-Temp": centerTemp.toFixed(1),
      },
    })
  } catch (error) {
    console.error("[Tile API] Error generating heat tile:", error)
    return NextResponse.json(
      { error: "Failed to generate tile" },
      { status: 500 }
    )
  }
}
