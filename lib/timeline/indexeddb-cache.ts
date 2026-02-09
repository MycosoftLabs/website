/**
 * IndexedDB Timeline Cache - February 6, 2026
 * 
 * Client-side cache for timeline data using IndexedDB.
 * Provides instant access to recently viewed entity states.
 * 
 * Features:
 * - Store entity states by timestamp
 * - Query by time range and entity type
 * - LRU eviction when cache exceeds size limit
 * - Automatic expiration of old entries
 */

const DB_NAME = "crep-timeline-cache"
const DB_VERSION = 1
const STORE_NAME = "timeline_entries"
const MAX_CACHE_SIZE_MB = 100
const DEFAULT_TTL_HOURS = 24

export type EntityType = 
  | "aircraft" 
  | "vessel" 
  | "satellite" 
  | "wildlife" 
  | "earthquake" 
  | "storm" 
  | "wildfire" 
  | "fungal"
  | "forecast"
  | "custom"

export type DataSource = "live" | "historical" | "forecast" | "cached"

export interface TimelineEntry {
  id: string                    // Composite key: entityType:entityId:timestamp
  entityType: EntityType
  entityId: string
  timestamp: number             // Unix timestamp (ms)
  data: Record<string, unknown> // Entity state at this time
  source: DataSource
  expires: number               // Expiration timestamp (ms)
  size: number                  // Approximate size in bytes
  accessedAt: number            // Last access time for LRU
  createdAt: number             // When cached
}

export interface TimelineQuery {
  entityType?: EntityType
  entityId?: string
  startTime?: number
  endTime?: number
  limit?: number
  source?: DataSource
}

export interface CacheStats {
  totalEntries: number
  totalSizeBytes: number
  byEntityType: Record<string, number>
  oldestEntry: number | null
  newestEntry: number | null
}

class TimelineCacheDB {
  private db: IDBDatabase | null = null
  private dbPromise: Promise<IDBDatabase> | null = null
  
  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db
    if (this.dbPromise) return this.dbPromise
    
    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB not available"))
        return
      }
      
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      
      request.onerror = () => reject(request.error)
      
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create main store with indexes
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" })
          
          // Index for querying by entity
          store.createIndex("entityType", "entityType", { unique: false })
          store.createIndex("entityId", "entityId", { unique: false })
          store.createIndex("timestamp", "timestamp", { unique: false })
          store.createIndex("expires", "expires", { unique: false })
          store.createIndex("accessedAt", "accessedAt", { unique: false })
          
          // Compound index for entity+time queries
          store.createIndex("entityType_timestamp", ["entityType", "timestamp"], { unique: false })
          store.createIndex("entityId_timestamp", ["entityId", "timestamp"], { unique: false })
        }
      }
    })
    
    return this.dbPromise
  }
  
  /**
   * Generate composite key for an entry
   */
  private makeKey(entityType: EntityType, entityId: string, timestamp: number): string {
    return `${entityType}:${entityId}:${timestamp}`
  }
  
  /**
   * Estimate size of an object in bytes
   */
  private estimateSize(obj: unknown): number {
    const str = JSON.stringify(obj)
    return str ? str.length * 2 : 0 // 2 bytes per char in JS
  }
  
  /**
   * Store an entity state at a specific time
   */
  async put(
    entityType: EntityType,
    entityId: string,
    timestamp: number,
    data: Record<string, unknown>,
    source: DataSource = "live",
    ttlHours: number = DEFAULT_TTL_HOURS
  ): Promise<void> {
    const db = await this.init()
    
    const entry: TimelineEntry = {
      id: this.makeKey(entityType, entityId, timestamp),
      entityType,
      entityId,
      timestamp,
      data,
      source,
      expires: Date.now() + ttlHours * 60 * 60 * 1000,
      size: this.estimateSize(data),
      accessedAt: Date.now(),
      createdAt: Date.now(),
    }
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      const request = store.put(entry)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
  
  /**
   * Store multiple entries in a batch
   */
  async putBatch(entries: Array<{
    entityType: EntityType
    entityId: string
    timestamp: number
    data: Record<string, unknown>
    source?: DataSource
  }>): Promise<void> {
    const db = await this.init()
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      
      for (const entry of entries) {
        const fullEntry: TimelineEntry = {
          id: this.makeKey(entry.entityType, entry.entityId, entry.timestamp),
          entityType: entry.entityType,
          entityId: entry.entityId,
          timestamp: entry.timestamp,
          data: entry.data,
          source: entry.source || "live",
          expires: Date.now() + DEFAULT_TTL_HOURS * 60 * 60 * 1000,
          size: this.estimateSize(entry.data),
          accessedAt: Date.now(),
          createdAt: Date.now(),
        }
        store.put(fullEntry)
      }
      
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }
  
  /**
   * Get a specific entry
   */
  async get(
    entityType: EntityType,
    entityId: string,
    timestamp: number
  ): Promise<TimelineEntry | null> {
    const db = await this.init()
    const key = this.makeKey(entityType, entityId, timestamp)
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(key)
      
      request.onsuccess = () => {
        const entry = request.result as TimelineEntry | undefined
        
        if (entry) {
          // Check expiration
          if (entry.expires < Date.now()) {
            store.delete(key)
            resolve(null)
            return
          }
          
          // Update access time for LRU
          entry.accessedAt = Date.now()
          store.put(entry)
        }
        
        resolve(entry || null)
      }
      request.onerror = () => reject(request.error)
    })
  }
  
  /**
   * Query entries by time range and/or entity type
   */
  async query(query: TimelineQuery): Promise<TimelineEntry[]> {
    const db = await this.init()
    const results: TimelineEntry[] = []
    const now = Date.now()
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly")
      const store = tx.objectStore(STORE_NAME)
      
      let cursor: IDBRequest
      
      // Choose best index based on query
      if (query.entityId && query.startTime !== undefined) {
        const index = store.index("entityId_timestamp")
        const range = IDBKeyRange.bound(
          [query.entityId, query.startTime || 0],
          [query.entityId, query.endTime || Infinity]
        )
        cursor = index.openCursor(range)
      } else if (query.entityType && query.startTime !== undefined) {
        const index = store.index("entityType_timestamp")
        const range = IDBKeyRange.bound(
          [query.entityType, query.startTime || 0],
          [query.entityType, query.endTime || Infinity]
        )
        cursor = index.openCursor(range)
      } else if (query.entityType) {
        const index = store.index("entityType")
        cursor = index.openCursor(IDBKeyRange.only(query.entityType))
      } else {
        cursor = store.openCursor()
      }
      
      cursor.onsuccess = (event) => {
        const c = (event.target as IDBRequest).result as IDBCursorWithValue | null
        
        if (c) {
          const entry = c.value as TimelineEntry
          
          // Filter expired entries
          if (entry.expires >= now) {
            // Apply additional filters
            let include = true
            
            if (query.entityType && entry.entityType !== query.entityType) include = false
            if (query.entityId && entry.entityId !== query.entityId) include = false
            if (query.source && entry.source !== query.source) include = false
            if (query.startTime && entry.timestamp < query.startTime) include = false
            if (query.endTime && entry.timestamp > query.endTime) include = false
            
            if (include) {
              results.push(entry)
            }
          }
          
          // Check limit
          if (query.limit && results.length >= query.limit) {
            resolve(results)
            return
          }
          
          c.continue()
        } else {
          resolve(results)
        }
      }
      
      cursor.onerror = () => reject(cursor.error)
    })
  }
  
  /**
   * Get the closest entry to a timestamp
   */
  async getNearest(
    entityType: EntityType,
    entityId: string,
    timestamp: number,
    maxDeltaMs: number = 60000
  ): Promise<TimelineEntry | null> {
    const entries = await this.query({
      entityType,
      entityId,
      startTime: timestamp - maxDeltaMs,
      endTime: timestamp + maxDeltaMs,
    })
    
    if (entries.length === 0) return null
    
    // Find closest
    let closest = entries[0]
    let minDelta = Math.abs(entries[0].timestamp - timestamp)
    
    for (const entry of entries) {
      const delta = Math.abs(entry.timestamp - timestamp)
      if (delta < minDelta) {
        minDelta = delta
        closest = entry
      }
    }
    
    return closest
  }
  
  /**
   * Delete expired entries
   */
  async cleanExpired(): Promise<number> {
    const db = await this.init()
    const now = Date.now()
    let deleted = 0
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      const index = store.index("expires")
      const range = IDBKeyRange.upperBound(now)
      const cursor = index.openCursor(range)
      
      cursor.onsuccess = (event) => {
        const c = (event.target as IDBRequest).result as IDBCursorWithValue | null
        if (c) {
          c.delete()
          deleted++
          c.continue()
        } else {
          resolve(deleted)
        }
      }
      
      cursor.onerror = () => reject(cursor.error)
    })
  }
  
  /**
   * Evict least recently accessed entries to stay under size limit
   */
  async evictLRU(targetSizeBytes: number = MAX_CACHE_SIZE_MB * 1024 * 1024): Promise<number> {
    const stats = await this.getStats()
    
    if (stats.totalSizeBytes <= targetSizeBytes) return 0
    
    const db = await this.init()
    const bytesToEvict = stats.totalSizeBytes - targetSizeBytes
    let evictedBytes = 0
    let evictedCount = 0
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      const index = store.index("accessedAt")
      const cursor = index.openCursor() // Oldest access first
      
      cursor.onsuccess = (event) => {
        const c = (event.target as IDBRequest).result as IDBCursorWithValue | null
        
        if (c && evictedBytes < bytesToEvict) {
          const entry = c.value as TimelineEntry
          evictedBytes += entry.size
          evictedCount++
          c.delete()
          c.continue()
        } else {
          resolve(evictedCount)
        }
      }
      
      cursor.onerror = () => reject(cursor.error)
    })
  }
  
  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const db = await this.init()
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly")
      const store = tx.objectStore(STORE_NAME)
      const cursor = store.openCursor()
      
      const stats: CacheStats = {
        totalEntries: 0,
        totalSizeBytes: 0,
        byEntityType: {},
        oldestEntry: null,
        newestEntry: null,
      }
      
      cursor.onsuccess = (event) => {
        const c = (event.target as IDBRequest).result as IDBCursorWithValue | null
        
        if (c) {
          const entry = c.value as TimelineEntry
          
          stats.totalEntries++
          stats.totalSizeBytes += entry.size
          stats.byEntityType[entry.entityType] = (stats.byEntityType[entry.entityType] || 0) + 1
          
          if (stats.oldestEntry === null || entry.timestamp < stats.oldestEntry) {
            stats.oldestEntry = entry.timestamp
          }
          if (stats.newestEntry === null || entry.timestamp > stats.newestEntry) {
            stats.newestEntry = entry.timestamp
          }
          
          c.continue()
        } else {
          resolve(stats)
        }
      }
      
      cursor.onerror = () => reject(cursor.error)
    })
  }
  
  /**
   * Clear all cached data
   */
  async clear(): Promise<void> {
    const db = await this.init()
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      const request = store.clear()
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
  
  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      this.dbPromise = null
    }
  }
}

// Singleton instance
let cacheInstance: TimelineCacheDB | null = null

export function getTimelineCache(): TimelineCacheDB {
  if (!cacheInstance) {
    cacheInstance = new TimelineCacheDB()
  }
  return cacheInstance
}

export { TimelineCacheDB }