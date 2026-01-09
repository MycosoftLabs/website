import { NextRequest, NextResponse } from "next/server";
import { 
  isGEEConfigured, 
  AVAILABLE_DATASETS, 
  createMapVisualization,
  computeRegionStats,
  getBestTileUrl,
  FALLBACK_TILE_PROVIDERS,
} from "@/lib/google-earth-engine";

/**
 * Google Earth Engine API Proxy
 * 
 * Server-side proxy for Google Earth Engine requests.
 * Handles authentication and forwards requests to GEE API.
 * 
 * API Reference: https://developers.google.com/earth-engine/apidocs
 */

/**
 * Generate tile URL - uses GEE when configured, fallback otherwise
 */
function getGEETileUrl(x: number, y: number, z: number, type: string = "satellite"): string {
  return getBestTileUrl(type as "satellite" | "terrain" | "hybrid", z, x, y);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const zoom = parseInt(searchParams.get("zoom") || "10");
  const tileType = searchParams.get("type") || "satellite";
  const bounds = {
    north: parseFloat(searchParams.get("north") || "0"),
    south: parseFloat(searchParams.get("south") || "0"),
    east: parseFloat(searchParams.get("east") || "0"),
    west: parseFloat(searchParams.get("west") || "0"),
  };

  try {
    switch (action) {
      case "status":
        // Return GEE configuration status
        return NextResponse.json({
          success: true,
          configured: isGEEConfigured(),
          fallbackProvider: FALLBACK_TILE_PROVIDERS.satellite.name,
          availableDatasets: AVAILABLE_DATASETS.map(d => ({
            id: d.id,
            name: d.name,
            description: d.description,
          })),
        });

      case "datasets":
        // Return available datasets
        return NextResponse.json({
          success: true,
          datasets: AVAILABLE_DATASETS,
        });

      case "satellite":
        // Generate tile coordinates for the viewport
        const tiles: Array<{ coord: { x: number; y: number; z: number }; url: string }> = [];
        
        // Calculate tile range
        const n = Math.pow(2, zoom);
        const topLeftX = Math.floor(((bounds.west + 180) / 360) * n);
        const topLeftY = Math.floor(
          ((1 - Math.log(Math.tan((bounds.north * Math.PI) / 180) + 1 / Math.cos((bounds.north * Math.PI) / 180)) / Math.PI) / 2) * n
        );
        const bottomRightX = Math.floor(((bounds.east + 180) / 360) * n);
        const bottomRightY = Math.floor(
          ((1 - Math.log(Math.tan((bounds.south * Math.PI) / 180) + 1 / Math.cos((bounds.south * Math.PI) / 180)) / Math.PI) / 2) * n
        );

        // Generate tile URLs (limit to reasonable number)
        for (let x = topLeftX; x <= bottomRightX && tiles.length < 100; x++) {
          for (let y = topLeftY; y <= bottomRightY && tiles.length < 100; y++) {
            tiles.push({
              coord: { x, y, z: zoom },
              url: getGEETileUrl(x, y, zoom, tileType),
            });
          }
        }

        return NextResponse.json({
          success: true,
          tiles: tiles,
          bounds,
          provider: isGEEConfigured() ? "Google Earth Engine" : FALLBACK_TILE_PROVIDERS.satellite.name,
        });

      case "elevation":
        // Get elevation stats for region
        if (isGEEConfigured()) {
          const elevationStats = await computeRegionStats("USGS/SRTMGL1_003", "elevation", bounds);
          return NextResponse.json({
            success: true,
            data: {
              type: "elevation",
              bounds,
              stats: elevationStats,
            },
          });
        }
        return NextResponse.json({
          success: true,
          data: {
            type: "elevation",
            bounds,
            data: [],
            message: "GEE not configured - elevation data unavailable",
          },
        });

      case "landcover":
        // Get land cover data
        if (isGEEConfigured()) {
          const landcoverStats = await computeRegionStats("ESA/WorldCover/v200", "Map", bounds);
          return NextResponse.json({
            success: true,
            data: {
              type: "landcover",
              bounds,
              stats: landcoverStats,
            },
          });
        }
        return NextResponse.json({
          success: true,
          data: {
            type: "landcover",
            bounds,
            classification: [],
            message: "GEE not configured - land cover data unavailable",
          },
        });

      case "vegetation":
        // Get NDVI vegetation index
        if (isGEEConfigured()) {
          const ndviStats = await computeRegionStats("MODIS/006/MOD13Q1", "NDVI", bounds);
          return NextResponse.json({
            success: true,
            data: {
              type: "vegetation",
              bounds,
              stats: ndviStats,
            },
          });
        }
        return NextResponse.json({
          success: true,
          data: {
            type: "vegetation",
            bounds,
            ndvi: [],
            message: "GEE not configured - vegetation data unavailable",
          },
        });

      default:
        return NextResponse.json(
          { success: false, error: "Unknown action. Available: status, datasets, satellite, elevation, landcover, vegetation" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("GEE API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, bounds, dateRange } = body;

    // In production, this would process the request and call GEE API
    return NextResponse.json({
      success: true,
      message: "GEE request processed (mock)",
      action,
      bounds,
    });
  } catch (error) {
    console.error("GEE API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
