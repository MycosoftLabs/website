import { NextRequest, NextResponse } from "next/server";
import { getBestTileUrl, isGEEConfigured } from "@/lib/google-earth-engine";

/**
 * Google Earth Engine Tile Proxy
 * 
 * Proxies individual tile requests from GEE or fallback providers.
 * Handles authentication, CORS, and caching.
 * 
 * Available types:
 * - satellite: High-resolution satellite imagery
 * - terrain: Terrain/topographic maps  
 * - hybrid: Satellite + labels
 * - ndvi: Vegetation index (when GEE configured)
 * - elevation: Elevation data (when GEE configured)
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; z: string; x: string; y: string } }
) {
  const { type, z, x, y } = params;
  const zoom = parseInt(z);
  const tileX = parseInt(x);
  const tileY = parseInt(y);

  try {
    // Get tile URL from GEE client library
    const tileUrl = getBestTileUrl(
      type as "satellite" | "terrain" | "hybrid",
      zoom,
      tileX,
      tileY
    );

    // Fetch the tile with proper headers
    const response = await fetch(tileUrl, {
      headers: {
        "User-Agent": "MycoEarthSim/1.0 (Mycosoft NatureOS Earth Simulator)",
        "Accept": "image/png,image/jpeg,image/*",
      },
      // Add timeout
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      // Try ESRI as ultimate fallback
      const fallbackUrl = `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tileY}/${tileX}`;
      const fallbackResponse = await fetch(fallbackUrl, {
        headers: { "User-Agent": "MycoEarthSim/1.0" },
        signal: AbortSignal.timeout(10000),
      });
      
      if (!fallbackResponse.ok) {
        throw new Error(`Failed to fetch tile: ${response.status}`);
      }
      
      const imageBuffer = await fallbackResponse.arrayBuffer();
      return new NextResponse(imageBuffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "*",
          "X-Tile-Provider": "ESRI-Fallback",
        },
      });
    }

    const imageBuffer = await response.arrayBuffer();

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "image/png",
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
        "Access-Control-Allow-Origin": "*",
        "X-Tile-Provider": isGEEConfigured() ? "Google-Earth-Engine" : "ESRI-World-Imagery",
      },
    });
  } catch (error) {
    console.error("Error fetching tile:", error);
    
    // Return a placeholder tile on error
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        tile: { type, z: zoom, x: tileX, y: tileY },
      },
      { status: 500 }
    );
  }
}
