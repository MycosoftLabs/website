import { NextRequest, NextResponse } from "next/server"

/**
 * Mycelium Probability Tiles API
 * 
 * Generates raster tiles showing mycelium network probability
 * based on environmental conditions and species distribution data.
 * 
 * GET /api/earth-simulator/mycelium-tiles/{z}/{x}/{y}
 * 
 * Returns: PNG tile (256x256)
 */

// Tile size in pixels
const TILE_SIZE = 256

// Color gradient for mycelium probability (0-1)
const GRADIENT_COLORS = [
  { stop: 0, color: [0, 0, 0, 0] },         // Transparent (no mycelium)
  { stop: 0.2, color: [20, 80, 40, 100] },  // Dark green
  { stop: 0.4, color: [50, 150, 80, 150] }, // Medium green
  { stop: 0.6, color: [100, 200, 120, 180] }, // Light green
  { stop: 0.8, color: [150, 230, 160, 200] }, // Bright green
  { stop: 1.0, color: [200, 255, 200, 230] }, // Very bright green
]

interface TileParams {
  z: number
  x: number
  y: number
}

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
 * Calculate mycelium probability for a given location
 * This is a simplified model - real implementation would use:
 * - Soil moisture data
 * - Temperature data
 * - Vegetation indices
 * - Historical species observations
 */
function calculateMyceliumProbability(lat: number, lng: number, z: number): number {
  // Base probability from latitude (higher in temperate zones)
  const latFactor = 1 - Math.abs(lat) / 90
  const temperateBonus = lat >= 30 && lat <= 60 ? 0.3 : 0
  
  // Simplified noise function for organic variation
  const noise1 = Math.sin(lat * 10 + lng * 15) * 0.5 + 0.5
  const noise2 = Math.cos(lat * 20 - lng * 10) * 0.5 + 0.5
  const noise = (noise1 + noise2) / 2
  
  // Combine factors
  let probability = latFactor * 0.3 + temperateBonus + noise * 0.4
  
  // Add some random hotspots
  const hotspotX = Math.floor(lng / 5) * 5
  const hotspotY = Math.floor(lat / 5) * 5
  const inHotspot = Math.abs(lng - hotspotX) < 2 && Math.abs(lat - hotspotY) < 2
  if (inHotspot) {
    probability += 0.3
  }
  
  return Math.min(1, Math.max(0, probability))
}

/**
 * Get color from gradient for a given probability value
 */
function getGradientColor(value: number): [number, number, number, number] {
  let lower = GRADIENT_COLORS[0]
  let upper = GRADIENT_COLORS[GRADIENT_COLORS.length - 1]
  
  for (let i = 0; i < GRADIENT_COLORS.length - 1; i++) {
    if (value >= GRADIENT_COLORS[i].stop && value <= GRADIENT_COLORS[i + 1].stop) {
      lower = GRADIENT_COLORS[i]
      upper = GRADIENT_COLORS[i + 1]
      break
    }
  }
  
  const range = upper.stop - lower.stop
  const t = range === 0 ? 0 : (value - lower.stop) / range
  
  return [
    Math.round(lower.color[0] + (upper.color[0] - lower.color[0]) * t),
    Math.round(lower.color[1] + (upper.color[1] - lower.color[1]) * t),
    Math.round(lower.color[2] + (upper.color[2] - lower.color[2]) * t),
    Math.round(lower.color[3] + (upper.color[3] - lower.color[3]) * t),
  ]
}

/**
 * Generate a PNG tile as base64
 * Note: In production, use sharp or canvas library for better performance
 */
function generateTileData(z: number, x: number, y: number): Uint8Array {
  const bounds = tileToBounds(z, x, y)
  const data = new Uint8Array(TILE_SIZE * TILE_SIZE * 4)
  
  for (let py = 0; py < TILE_SIZE; py++) {
    for (let px = 0; px < TILE_SIZE; px++) {
      // Convert pixel to lat/lng
      const lng = bounds.west + (px / TILE_SIZE) * (bounds.east - bounds.west)
      const lat = bounds.north - (py / TILE_SIZE) * (bounds.north - bounds.south)
      
      // Calculate probability
      const prob = calculateMyceliumProbability(lat, lng, z)
      
      // Get color
      const [r, g, b, a] = getGradientColor(prob)
      
      // Set pixel
      const idx = (py * TILE_SIZE + px) * 4
      data[idx] = r
      data[idx + 1] = g
      data[idx + 2] = b
      data[idx + 3] = a
    }
  }
  
  return data
}

/**
 * Create a simple PNG from raw RGBA data
 * This is a minimal PNG encoder for stub purposes
 */
function createPNG(width: number, height: number, rgba: Uint8Array): Buffer {
  // For stub purposes, return a transparent 1x1 PNG
  // In production, use sharp or pngjs library
  const transparentPNG = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, // 256x256
    0x08, 0x06, 0x00, 0x00, 0x00, // 8-bit RGBA
    0x5C, 0x72, 0xA8, 0x66, // IHDR CRC
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND chunk
    0xAE, 0x42, 0x60, 0x82, // IEND CRC
  ])
  
  return transparentPNG
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  try {
    const { z, x, y: yWithExt } = await params
    
    // Remove .png extension if present
    const y = yWithExt.replace(/\.png$/, "")
    
    const zoom = parseInt(z, 10)
    const tileX = parseInt(x, 10)
    const tileY = parseInt(y, 10)
    
    // Validate parameters
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
    
    // Generate tile
    const tileData = generateTileData(zoom, tileX, tileY)
    const png = createPNG(TILE_SIZE, TILE_SIZE, tileData)
    
    return new NextResponse(png, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
        "X-Tile-Coords": `${zoom}/${tileX}/${tileY}`,
      },
    })
  } catch (error) {
    console.error("[Tile API] Error generating mycelium tile:", error)
    return NextResponse.json(
      { error: "Failed to generate tile" },
      { status: 500 }
    )
  }
}
