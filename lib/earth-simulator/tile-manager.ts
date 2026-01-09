/**
 * Tile Manager for Earth Simulator
 * 
 * Manages tile-based data loading for efficient rendering.
 * Uses standard tile coordinates (z/x/y) for caching and loading.
 */

export interface TileCoord {
  z: number; // Zoom level
  x: number; // Tile X coordinate
  y: number; // Tile Y coordinate
}

export interface TileData {
  coord: TileCoord;
  gridCells: string[]; // Cell IDs in this tile
  data?: any; // Cached data
  loaded: boolean;
  loading: boolean;
  timestamp?: number;
}

export class TileManager {
  private cache: Map<string, TileData> = new Map();
  private maxCacheSize: number = 1000;
  private tileSize: number = 256; // Standard tile size

  /**
   * Convert lat/lon to tile coordinates
   */
  latLonToTile(lat: number, lon: number, zoom: number): TileCoord {
    const n = Math.pow(2, zoom);
    const x = Math.floor(((lon + 180) / 360) * n);
    const latRad = (lat * Math.PI) / 180;
    const y = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
    );
    return { z: zoom, x, y };
  }

  /**
   * Convert tile coordinates to lat/lon bounds
   */
  tileToLatLon(tile: TileCoord): { north: number; south: number; east: number; west: number } {
    const n = Math.pow(2, tile.z);
    const west = (tile.x / n) * 360 - 180;
    const east = ((tile.x + 1) / n) * 360 - 180;
    const north = Math.atan(Math.sinh(Math.PI * (1 - (2 * tile.y) / n))) * (180 / Math.PI);
    const south = Math.atan(Math.sinh(Math.PI * (1 - (2 * (tile.y + 1)) / n))) * (180 / Math.PI);
    return { north, south, east, west };
  }

  /**
   * Get tile key for caching
   */
  getTileKey(coord: TileCoord): string {
    return `${coord.z}/${coord.x}/${coord.y}`;
  }

  /**
   * Get tiles needed for a viewport
   */
  getTilesForViewport(
    viewport: { north: number; south: number; east: number; west: number },
    zoom: number
  ): TileCoord[] {
    const topLeft = this.latLonToTile(viewport.north, viewport.west, zoom);
    const bottomRight = this.latLonToTile(viewport.south, viewport.east, zoom);

    const tiles: TileCoord[] = [];
    for (let x = topLeft.x; x <= bottomRight.x; x++) {
      for (let y = topLeft.y; y <= bottomRight.y; y++) {
        tiles.push({ z: zoom, x, y });
      }
    }
    return tiles;
  }

  /**
   * Get or create tile data
   */
  getTile(coord: TileCoord): TileData {
    const key = this.getTileKey(coord);
    if (!this.cache.has(key)) {
      this.cache.set(key, {
        coord,
        gridCells: [],
        loaded: false,
        loading: false,
      });
    }
    return this.cache.get(key)!;
  }

  /**
   * Mark tile as loaded
   */
  setTileLoaded(coord: TileCoord, data: any): void {
    const key = this.getTileKey(coord);
    const tile = this.getTile(coord);
    tile.data = data;
    tile.loaded = true;
    tile.loading = false;
    tile.timestamp = Date.now();
    this.cache.set(key, tile);
    this.cleanupCache();
  }

  /**
   * Mark tile as loading
   */
  setTileLoading(coord: TileCoord): void {
    const tile = this.getTile(coord);
    tile.loading = true;
    this.cache.set(this.getTileKey(coord), tile);
  }

  /**
   * Clean up old cache entries
   */
  private cleanupCache(): void {
    if (this.cache.size <= this.maxCacheSize) return;

    // Sort by timestamp (oldest first)
    const entries = Array.from(this.cache.entries())
      .map(([key, tile]) => ({ key, tile, timestamp: tile.timestamp || 0 }))
      .sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest 20% of entries
    const toRemove = Math.floor(this.cache.size * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i].key);
    }
  }

  /**
   * Clear all cached tiles
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; loaded: number } {
    const loaded = Array.from(this.cache.values()).filter((t) => t.loaded).length;
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      loaded,
    };
  }
}
