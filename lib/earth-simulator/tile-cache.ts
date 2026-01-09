/**
 * Tile Cache for Earth Simulator
 * 
 * Specialized caching for tile-based data loading.
 */

import { CacheManager } from "./cache-manager";
import type { TileCoord } from "./tile-manager";

export class TileCache {
  private cache: CacheManager;

  constructor(cache?: CacheManager) {
    this.cache = cache || new CacheManager({ defaultTTL: 7200 }); // 2 hours for tiles
  }

  /**
   * Get tile key
   */
  private getTileKey(coord: TileCoord): string {
    return `tile:${coord.z}:${coord.x}:${coord.y}`;
  }

  /**
   * Get cached tile data
   */
  async getTile(coord: TileCoord): Promise<any | null> {
    const key = this.getTileKey(coord);
    return await this.cache.get(key);
  }

  /**
   * Cache tile data
   */
  async setTile(coord: TileCoord, data: any, ttl?: number): Promise<void> {
    const key = this.getTileKey(coord);
    await this.cache.set(key, data, ttl);
  }

  /**
   * Invalidate tile cache
   */
  async invalidateTile(coord: TileCoord): Promise<void> {
    const key = this.getTileKey(coord);
    await this.cache.delete(key);
  }

  /**
   * Invalidate all tiles at a zoom level
   */
  async invalidateZoomLevel(zoom: number): Promise<void> {
    // In production, this would use Redis pattern matching
    // For now, we'll need to track keys manually
    const stats = this.cache.getStats();
    const pattern = `tile:${zoom}:`;
    stats.keys
      .filter((key) => key.startsWith(pattern))
      .forEach((key) => this.cache.delete(key));
  }

  /**
   * Preload tiles for a viewport
   */
  async preloadTiles(
    tiles: TileCoord[],
    fetcher: (coord: TileCoord) => Promise<any>
  ): Promise<void> {
    const promises = tiles.map(async (coord) => {
      const cached = await this.getTile(coord);
      if (!cached) {
        const data = await fetcher(coord);
        await this.setTile(coord, data);
      }
    });
    await Promise.all(promises);
  }
}

export const tileCache = new TileCache();
