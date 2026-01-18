/**
 * CREP Snapshot Store - Hourly Backup System
 * 
 * Provides military-grade data persistence:
 * - Periodic snapshots of all CREP data
 * - IndexedDB for large dataset storage
 * - Automatic cleanup of old snapshots
 * - Timeline replay capability
 */

// IndexedDB database name and version
const DB_NAME = 'crep-snapshots';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const MAX_SNAPSHOTS_PER_TYPE = 24; // Keep 24 hours of hourly snapshots

interface Snapshot<T = unknown> {
  id: string;
  type: string;
  data: T;
  timestamp: number;
  itemCount: number;
  compressed?: boolean;
}

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB connection
 */
async function initDB(): Promise<IDBDatabase> {
  if (db) return db;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type_timestamp', ['type', 'timestamp'], { unique: false });
      }
    };
  });
}

/**
 * Save a snapshot to IndexedDB
 */
export async function saveSnapshot<T>(
  type: string,
  data: T,
  itemCount: number
): Promise<string> {
  const database = await initDB();
  const timestamp = Date.now();
  const id = `${type}_${timestamp}`;
  
  const snapshot: Snapshot<T> = {
    id,
    type,
    data,
    timestamp,
    itemCount,
  };
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.put(snapshot);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log(`[SnapshotStore] Saved ${type} snapshot with ${itemCount} items`);
      
      // Clean up old snapshots
      cleanupOldSnapshots(type).catch(console.error);
      
      resolve(id);
    };
  });
}

/**
 * Get the latest snapshot for a type
 */
export async function getLatestSnapshot<T>(type: string): Promise<Snapshot<T> | null> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('type_timestamp');
    
    // Get the most recent snapshot for this type
    const range = IDBKeyRange.bound([type, 0], [type, Date.now()]);
    const request = index.openCursor(range, 'prev');
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        resolve(cursor.value as Snapshot<T>);
      } else {
        resolve(null);
      }
    };
  });
}

/**
 * Get snapshot at a specific time (for timeline replay)
 */
export async function getSnapshotAtTime<T>(
  type: string,
  targetTime: number
): Promise<Snapshot<T> | null> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('type_timestamp');
    
    // Find snapshot closest to target time (before or at target)
    const range = IDBKeyRange.bound([type, 0], [type, targetTime]);
    const request = index.openCursor(range, 'prev');
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        resolve(cursor.value as Snapshot<T>);
      } else {
        resolve(null);
      }
    };
  });
}

/**
 * Get all snapshots for a type (for timeline)
 */
export async function getSnapshotTimeline(
  type: string,
  limit: number = 24
): Promise<Array<{ id: string; timestamp: number; itemCount: number }>> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('type_timestamp');
    
    const range = IDBKeyRange.bound([type, 0], [type, Date.now()]);
    const request = index.openCursor(range, 'prev');
    
    const timeline: Array<{ id: string; timestamp: number; itemCount: number }> = [];
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor && timeline.length < limit) {
        const snapshot = cursor.value as Snapshot;
        timeline.push({
          id: snapshot.id,
          timestamp: snapshot.timestamp,
          itemCount: snapshot.itemCount,
        });
        cursor.continue();
      } else {
        resolve(timeline);
      }
    };
  });
}

/**
 * Clean up old snapshots (keep only last N per type)
 */
async function cleanupOldSnapshots(type: string): Promise<void> {
  const database = await initDB();
  
  const transaction = database.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const index = store.index('type_timestamp');
  
  // Get all snapshots for this type
  const range = IDBKeyRange.bound([type, 0], [type, Date.now()]);
  const request = index.openCursor(range, 'prev');
  
  let count = 0;
  const idsToDelete: string[] = [];
  
  request.onsuccess = () => {
    const cursor = request.result;
    if (cursor) {
      count++;
      if (count > MAX_SNAPSHOTS_PER_TYPE) {
        idsToDelete.push((cursor.value as Snapshot).id);
      }
      cursor.continue();
    } else {
      // Delete old snapshots
      for (const id of idsToDelete) {
        store.delete(id);
      }
      if (idsToDelete.length > 0) {
        console.log(`[SnapshotStore] Cleaned up ${idsToDelete.length} old ${type} snapshots`);
      }
    }
  };
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  totalSnapshots: number;
  byType: Record<string, number>;
  estimatedSize: number;
}> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();
    
    let total = 0;
    const byType: Record<string, number> = {};
    let estimatedSize = 0;
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const snapshot = cursor.value as Snapshot;
        total++;
        byType[snapshot.type] = (byType[snapshot.type] || 0) + 1;
        estimatedSize += JSON.stringify(snapshot.data).length;
        cursor.continue();
      } else {
        resolve({ totalSnapshots: total, byType, estimatedSize });
      }
    };
  });
}

/**
 * Export all snapshots for a type (for backup)
 */
export async function exportSnapshots<T>(type: string): Promise<Snapshot<T>[]> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('type');
    const request = index.getAll(type);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      resolve(request.result as Snapshot<T>[]);
    };
  });
}

/**
 * Clear all snapshots (for debugging)
 */
export async function clearAllSnapshots(): Promise<void> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log('[SnapshotStore] All snapshots cleared');
      resolve();
    };
  });
}
