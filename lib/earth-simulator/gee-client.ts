/**
 * Google Earth Engine Client
 * 
 * Handles GEE tile requests and authentication.
 * Uses server-side proxy to avoid exposing credentials.
 */

export interface GEETileCoord {
  x: number;
  y: number;
  z: number;
}

export interface GEETileRequest {
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  zoom: number;
  type?: "satellite" | "elevation" | "landcover" | "vegetation";
}

export class GEEClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || "/api/earth-simulator/gee";
  }

  /**
   * Get tile URL for a specific coordinate
   * Uses standard Web Mercator tile coordinates
   */
  getTileUrl(coord: GEETileCoord, type: string = "satellite"): string {
    // Use our proxy endpoint that handles GEE authentication and CORS
    return `${this.baseUrl}/tile/${type}/${coord.z}/${coord.x}/${coord.y}`;
  }

  /**
   * Convert lat/lon to tile coordinates (Web Mercator)
   */
  latLonToTile(lat: number, lon: number, zoom: number): GEETileCoord {
    const n = Math.pow(2, zoom);
    const x = Math.floor(((lon + 180) / 360) * n);
    const latRad = (lat * Math.PI) / 180;
    const y = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
    );
    return { x, y, z: zoom };
  }

  /**
   * Get tiles needed for a viewport
   */
  getTilesForViewport(
    viewport: { north: number; south: number; east: number; west: number },
    zoom: number
  ): GEETileCoord[] {
    const topLeft = this.latLonToTile(viewport.north, viewport.west, zoom);
    const bottomRight = this.latLonToTile(viewport.south, viewport.east, zoom);

    const tiles: GEETileCoord[] = [];
    for (let x = topLeft.x; x <= bottomRight.x; x++) {
      for (let y = topLeft.y; y <= bottomRight.y; y++) {
        tiles.push({ x, y, z: zoom });
      }
    }
    return tiles;
  }

  /**
   * Request satellite imagery for a viewport
   */
  async requestSatelliteImagery(request: GEETileRequest): Promise<{
    tiles: Array<{ coord: GEETileCoord; url: string }>;
    bounds: GEETileRequest["bounds"];
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}?action=satellite&north=${request.bounds.north}&south=${request.bounds.south}&east=${request.bounds.east}&west=${request.bounds.west}&zoom=${request.zoom}`
      );
      const data = await response.json();

      if (data.success && data.tiles) {
        return {
          tiles: data.tiles,
          bounds: request.bounds,
        };
      }

      // Fallback: generate tile URLs
      const tiles = this.getTilesForViewport(request.bounds, request.zoom);
      return {
        tiles: tiles.map((coord) => ({
          coord,
          url: this.getTileUrl(coord, "satellite"),
        })),
        bounds: request.bounds,
      };
    } catch (error) {
      console.error("Error requesting GEE satellite imagery:", error);
      throw error;
    }
  }
}

export const geeClient = new GEEClient();
