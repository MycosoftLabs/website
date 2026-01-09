import { NextRequest, NextResponse } from "next/server";
import {
  generateLandTiles,
  getTilesInViewport,
  getGridStats,
  tilesToGeoJSON,
  generateTileId,
  parseTileId,
  GRID_CONFIG,
} from "@/lib/earth-grid-system";

/**
 * Land Tiles API - 24x24 Grid System
 * 
 * Returns land-only tiles covering Earth's surface, excluding oceans.
 * Each tile has a unique ID for tracking observations, mycelium networks, etc.
 * 
 * Query Parameters:
 * - action: stats | viewport | geojson | tile | regions | all | lookup
 * - tileSize: Grid cell size in degrees (default: 0.5)
 * - north, south, east, west: Viewport bounds
 * - maxTiles: Maximum tiles to return (default: 500)
 * - id: Tile ID for lookup
 * - lat, lon: Coordinates for lookup
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "stats";
  const tileSize = parseFloat(searchParams.get("tileSize") || String(GRID_CONFIG.tileSizeDegrees));
  
  try {
    switch (action) {
      case "stats": {
        const stats = getGridStats(tileSize);
        return NextResponse.json({
          success: true,
          stats,
          description: "24x24 inch equivalent grid covering all land areas",
          config: {
            availableSizes: GRID_CONFIG.sizes,
            currentSize: tileSize,
            approximateKm: 111 * tileSize,
          },
        });
      }

      case "viewport": {
        const north = parseFloat(searchParams.get("north") || "90");
        const south = parseFloat(searchParams.get("south") || "-90");
        const east = parseFloat(searchParams.get("east") || "180");
        const west = parseFloat(searchParams.get("west") || "-180");
        const maxTiles = parseInt(searchParams.get("maxTiles") || "500");

        const tiles = getTilesInViewport(north, south, east, west, tileSize, maxTiles);
        
        return NextResponse.json({
          success: true,
          tiles,
          count: tiles.length,
          bounds: { north, south, east, west },
          tileSize,
        });
      }

      case "geojson": {
        const north = parseFloat(searchParams.get("north") || "90");
        const south = parseFloat(searchParams.get("south") || "-90");
        const east = parseFloat(searchParams.get("east") || "180");
        const west = parseFloat(searchParams.get("west") || "-180");
        const maxTiles = parseInt(searchParams.get("maxTiles") || "500");

        const tiles = getTilesInViewport(north, south, east, west, tileSize, maxTiles);
        const geojson = tilesToGeoJSON(tiles);
        
        return NextResponse.json(geojson);
      }

      case "tile": {
        const id = searchParams.get("id");
        if (!id) {
          return NextResponse.json(
            { success: false, error: "Missing tile ID parameter" },
            { status: 400 }
          );
        }

        const coords = parseTileId(id, tileSize);
        if (!coords) {
          return NextResponse.json(
            { success: false, error: "Invalid tile ID format. Expected: TXXX_XXX" },
            { status: 400 }
          );
        }

        const tiles = generateLandTiles(
          {
            north: coords.lat + tileSize,
            south: coords.lat,
            east: coords.lon + tileSize,
            west: coords.lon,
          },
          tileSize
        );

        const tile = tiles.find(t => t.id === id);
        
        if (!tile) {
          return NextResponse.json({
            success: false,
            error: "Tile not found - location may be ocean",
            coords,
            queriedId: id,
          });
        }

        return NextResponse.json({
          success: true,
          tile,
        });
      }

      case "regions": {
        const allTiles = generateLandTiles(undefined, tileSize);
        const regions: Record<string, { count: number; sampleTiles: string[] }> = {};

        for (const tile of allTiles) {
          const region = tile.region || "Unknown";
          if (!regions[region]) {
            regions[region] = { count: 0, sampleTiles: [] };
          }
          regions[region].count++;
          if (regions[region].sampleTiles.length < 5) {
            regions[region].sampleTiles.push(tile.id);
          }
        }

        return NextResponse.json({
          success: true,
          totalLandTiles: allTiles.length,
          regionCount: Object.keys(regions).length,
          regions,
        });
      }

      case "all": {
        const tiles = generateLandTiles(undefined, tileSize);
        
        return NextResponse.json({
          success: true,
          tiles,
          count: tiles.length,
          tileSize,
          note: "Large response - consider using viewport filtering for production",
        });
      }

      case "lookup": {
        const lat = parseFloat(searchParams.get("lat") || "0");
        const lon = parseFloat(searchParams.get("lon") || "0");
        
        const tileId = generateTileId(lat, lon, tileSize);
        const tiles = generateLandTiles(
          {
            north: lat + tileSize,
            south: lat - tileSize,
            east: lon + tileSize,
            west: lon - tileSize,
          },
          tileSize
        );

        const tile = tiles.find(t => 
          lat >= t.lat && lat < t.latEnd &&
          lon >= t.lon && lon < t.lonEnd
        );

        return NextResponse.json({
          success: true,
          query: { lat, lon },
          tileId,
          tile: tile || null,
          isLand: !!tile,
        });
      }

      default:
        return NextResponse.json(
          { 
            success: false, 
            error: "Unknown action",
            availableActions: ["stats", "viewport", "geojson", "tile", "regions", "all", "lookup"],
            example: "/api/earth-simulator/land-tiles?action=viewport&north=50&south=40&east=10&west=-10",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Land Tiles API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
