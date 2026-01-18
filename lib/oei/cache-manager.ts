/**
 * CREP Cache Manager - Multi-Layer Caching System
 * 
 * Provides military-grade redundancy for CREP data:
 * - Layer 1: In-Memory (React State + TTL cache)
 * - Layer 2: Local Storage (persistent browser cache)
 * - Layer 3: Redis (server-side event bus)
 * - Layer 4: Snapshot Store (periodic backups)
 * 
 * Features:
 * - Automatic failover between API and cache
 * - Configurable TTL per data source
 * - Background refresh for seamless updates
 * - Latency tracking for performance monitoring
 */

// Cache entry with metadata
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  source: 'api' | 'cache' | 'snapshot';
  latency?: number;
}

// Cache configuration per data type
interface CacheConfig {
  ttl: number;        // Time-to-live in milliseconds
  maxAge: number;     // Maximum age before force refresh
  staleWhileRevalidate: boolean;
  snapshotInterval: number; // How often to save snapshots
}

// Default configurations for different data types
const DEFAULT_CONFIGS: Record<string, CacheConfig> = {
  aircraft: {
    ttl: 10_000,       // 10 seconds - aircraft move fast
    maxAge: 60_000,    // 1 minute max
    staleWhileRevalidate: true,
    snapshotInterval: 30_000,
  },
  vessels: {
    ttl: 30_000,       // 30 seconds - ships move slower
    maxAge: 300_000,   // 5 minutes max
    staleWhileRevalidate: true,
    snapshotInterval: 60_000,
  },
  satellites: {
    ttl: 60_000,       // 1 minute - orbital positions
    maxAge: 300_000,   // 5 minutes max
    staleWhileRevalidate: true,
    snapshotInterval: 120_000,
  },
  fungal: {
    ttl: 300_000,      // 5 minutes - observations don't change often
    maxAge: 3600_000,  // 1 hour max
    staleWhileRevalidate: true,
    snapshotInterval: 600_000,
  },
  events: {
    ttl: 30_000,       // 30 seconds - earthquakes/weather
    maxAge: 180_000,   // 3 minutes max
    staleWhileRevalidate: true,
    snapshotInterval: 60_000,
  },
  'space-weather': {
    ttl: 60_000,       // 1 minute
    maxAge: 300_000,   // 5 minutes max
    staleWhileRevalidate: true,
    snapshotInterval: 120_000,
  },
  'carbon-mapper': {
    ttl: 300_000,      // 5 minutes - plumes don't change fast
    maxAge: 1800_000,  // 30 minutes max
    staleWhileRevalidate: true,
    snapshotInterval: 600_000,
  },
  railway: {
    ttl: 3600_000,     // 1 hour - infrastructure rarely changes
    maxAge: 86400_000, // 24 hours max
    staleWhileRevalidate: true,
    snapshotInterval: 3600_000,
  },
};

// In-memory cache store
const memoryCache = new Map<string, CacheEntry<unknown>>();

// Snapshot store keys
const SNAPSHOT_PREFIX = 'crep_snapshot_';
const CACHE_PREFIX = 'crep_cache_';

/**
 * Get data from cache layers with failover
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  config?: Partial<CacheConfig>
): Promise<{ data: T; fromCache: boolean; latency: number; source: string }> {
  const cfg = { ...DEFAULT_CONFIGS[key] || DEFAULT_CONFIGS.events, ...config };
  const startTime = performance.now();
  
  // Layer 1: Check in-memory cache
  const memEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
  const now = Date.now();
  
  if (memEntry && (now - memEntry.timestamp) < cfg.ttl) {
    const latency = performance.now() - startTime;
    return {
      data: memEntry.data,
      fromCache: true,
      latency,
      source: 'memory',
    };
  }
  
  // Layer 2: Check local storage (if available)
  const localData = getFromLocalStorage<T>(key);
  if (localData && (now - localData.timestamp) < cfg.maxAge) {
    // Stale-while-revalidate: return cached data and refresh in background
    if (cfg.staleWhileRevalidate) {
      refreshInBackground(key, fetcher, cfg);
    }
    
    const latency = performance.now() - startTime;
    return {
      data: localData.data,
      fromCache: true,
      latency,
      source: 'localStorage',
    };
  }
  
  // Try to fetch fresh data
  try {
    const data = await fetcher();
    const latency = performance.now() - startTime;
    
    // Update all cache layers
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: cfg.ttl,
      source: 'api',
      latency,
    };
    
    memoryCache.set(key, entry);
    saveToLocalStorage(key, entry);
    
    return {
      data,
      fromCache: false,
      latency,
      source: 'api',
    };
  } catch (error) {
    console.error(`[CacheManager] API fetch failed for ${key}:`, error);
    
    // Layer 3: Try snapshot as last resort
    const snapshot = getSnapshot<T>(key);
    if (snapshot) {
      const latency = performance.now() - startTime;
      return {
        data: snapshot.data,
        fromCache: true,
        latency,
        source: 'snapshot',
      };
    }
    
    // If we have stale memory data, return it
    if (memEntry) {
      const latency = performance.now() - startTime;
      return {
        data: memEntry.data,
        fromCache: true,
        latency,
        source: 'stale-memory',
      };
    }
    
    throw error;
  }
}

/**
 * Invalidate cache for a specific key
 */
export function invalidateCache(key: string): void {
  memoryCache.delete(key);
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
  } catch {
    // localStorage might not be available
  }
}

/**
 * Clear all CREP caches
 */
export function clearAllCaches(): void {
  memoryCache.clear();
  try {
    const keys = Object.keys(localStorage);
    for (const k of keys) {
      if (k.startsWith(CACHE_PREFIX) || k.startsWith(SNAPSHOT_PREFIX)) {
        localStorage.removeItem(k);
      }
    }
  } catch {
    // localStorage might not be available
  }
}

/**
 * Save a snapshot for disaster recovery
 */
export function saveSnapshot<T>(key: string, data: T): void {
  try {
    const entry = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(SNAPSHOT_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Storage might be full or unavailable
  }
}

/**
 * Get snapshot data
 */
function getSnapshot<T>(key: string): CacheEntry<T> | null {
  try {
    const stored = localStorage.getItem(SNAPSHOT_PREFIX + key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // localStorage might not be available
  }
  return null;
}

/**
 * Get from localStorage
 */
function getFromLocalStorage<T>(key: string): CacheEntry<T> | null {
  try {
    const stored = localStorage.getItem(CACHE_PREFIX + key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // localStorage might not be available
  }
  return null;
}

/**
 * Save to localStorage
 */
function saveToLocalStorage<T>(key: string, entry: CacheEntry<T>): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Storage might be full
    console.warn(`[CacheManager] Failed to save ${key} to localStorage`);
  }
}

/**
 * Background refresh for stale-while-revalidate
 */
async function refreshInBackground<T>(
  key: string,
  fetcher: () => Promise<T>,
  config: CacheConfig
): Promise<void> {
  try {
    const data = await fetcher();
    const now = Date.now();
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: config.ttl,
      source: 'api',
    };
    
    memoryCache.set(key, entry);
    saveToLocalStorage(key, entry);
    
    console.log(`[CacheManager] Background refresh completed for ${key}`);
  } catch (error) {
    console.warn(`[CacheManager] Background refresh failed for ${key}:`, error);
  }
}

/**
 * Preload critical data sources
 */
export async function preloadCriticalData(sources: string[]): Promise<void> {
  console.log('[CacheManager] Preloading critical data sources:', sources);
  
  const fetchers: Record<string, () => Promise<unknown>> = {
    aircraft: () => fetch('/api/oei/flightradar24').then(r => r.json()),
    vessels: () => fetch('/api/oei/aisstream').then(r => r.json()),
    satellites: () => fetch('/api/oei/satellites?category=stations').then(r => r.json()),
    fungal: () => fetch('/api/crep/fungal').then(r => r.json()),
    events: () => fetch('/api/natureos/global-events').then(r => r.json()),
    'space-weather': () => fetch('/api/oei/space-weather').then(r => r.json()),
  };
  
  await Promise.allSettled(
    sources.map(source => {
      const fetcher = fetchers[source];
      if (fetcher) {
        return getCached(source, fetcher);
      }
      return Promise.resolve();
    })
  );
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  memoryEntries: number;
  totalSize: number;
  entries: Array<{ key: string; age: number; source: string }>;
} {
  const now = Date.now();
  const entries = Array.from(memoryCache.entries()).map(([key, entry]) => ({
    key,
    age: now - entry.timestamp,
    source: entry.source,
  }));
  
  return {
    memoryEntries: memoryCache.size,
    totalSize: JSON.stringify(Array.from(memoryCache.values())).length,
    entries,
  };
}
