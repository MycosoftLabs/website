/**
 * Cache Manager for Earth Simulator
 * 
 * Manages Redis caching for grid cell data and tiles.
 */

export interface CacheConfig {
  redisUrl?: string;
  defaultTTL?: number; // seconds
}

export class CacheManager {
  private config: CacheConfig;
  private cache: Map<string, { data: any; expires: number }> = new Map();

  constructor(config?: CacheConfig) {
    this.config = {
      redisUrl: config?.redisUrl || process.env.REDIS_URL,
      defaultTTL: config?.defaultTTL || 3600, // 1 hour default
      ...config,
    };
  }

  /**
   * Get cached data
   */
  async get(key: string): Promise<any | null> {
    // In-memory cache (fallback)
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }

    // In production, this would check Redis
    // const redis = await this.getRedisClient();
    // return await redis.get(key);

    return null;
  }

  /**
   * Set cached data
   */
  async set(key: string, data: any, ttl?: number): Promise<void> {
    const expires = Date.now() + (ttl || this.config.defaultTTL!) * 1000;
    
    // In-memory cache
    this.cache.set(key, { data, expires });

    // In production, this would set in Redis
    // const redis = await this.getRedisClient();
    // await redis.setex(key, ttl || this.config.defaultTTL!, JSON.stringify(data));
  }

  /**
   * Delete cached data
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    
    // In production, this would delete from Redis
    // const redis = await this.getRedisClient();
    // await redis.del(key);
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
    
    // In production, this would clear Redis
    // const redis = await this.getRedisClient();
    // await redis.flushdb();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const cacheManager = new CacheManager();
