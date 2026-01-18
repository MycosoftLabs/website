/**
 * MINDEX Logger - Centralized Logging for CREP Services
 * 
 * Logs all CREP data collection events to MINDEX for:
 * - Audit trail and compliance
 * - Performance monitoring
 * - Data provenance tracking
 * - Anomaly detection
 * 
 * Features:
 * - Batched writes for efficiency
 * - Local queue for offline resilience
 * - Structured log format
 * - Source attribution
 */

const MINDEX_API = process.env.MINDEX_API_URL || 'http://localhost:8000';
const BATCH_SIZE = 100;
const FLUSH_INTERVAL = 10_000; // 10 seconds

// Log entry structure
export interface MINDEXLogEntry {
  id?: string;
  timestamp: string;
  service: string;
  event_type: 'data_collection' | 'api_error' | 'cache_hit' | 'cache_miss' | 'failover' | 'snapshot' | 'health_check';
  data: {
    source?: string;
    endpoint?: string;
    item_count?: number;
    latency_ms?: number;
    error?: string;
    from_cache?: boolean;
    cache_source?: 'memory' | 'localStorage' | 'snapshot';
    api_status?: 'healthy' | 'degraded' | 'down';
    confidence?: number;
    provenance?: {
      source_type: string;
      method: string;
      timestamp: string;
    };
  };
  metadata?: Record<string, unknown>;
}

// In-memory log queue
const logQueue: MINDEXLogEntry[] = [];
let flushTimer: NodeJS.Timeout | null = null;
let isInitialized = false;

/**
 * Initialize the MINDEX logger
 */
export function initMINDEXLogger(): void {
  if (isInitialized) return;
  
  // Start periodic flush
  flushTimer = setInterval(() => {
    flushLogs().catch(console.error);
  }, FLUSH_INTERVAL);
  
  // Flush on page unload (browser)
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      flushLogsSync();
    });
  }
  
  isInitialized = true;
  console.log('[MINDEXLogger] Initialized');
}

/**
 * Log a CREP event
 */
export function logCREPEvent(entry: Omit<MINDEXLogEntry, 'id' | 'timestamp'>): void {
  const logEntry: MINDEXLogEntry = {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  
  logQueue.push(logEntry);
  
  // Auto-flush if queue is full
  if (logQueue.length >= BATCH_SIZE) {
    flushLogs().catch(console.error);
  }
}

/**
 * Log a data collection event
 */
export function logDataCollection(
  service: string,
  source: string,
  itemCount: number,
  latencyMs: number,
  fromCache: boolean = false,
  cacheSource?: 'memory' | 'localStorage' | 'snapshot'
): void {
  logCREPEvent({
    service,
    event_type: 'data_collection',
    data: {
      source,
      item_count: itemCount,
      latency_ms: latencyMs,
      from_cache: fromCache,
      cache_source: cacheSource,
      provenance: {
        source_type: fromCache ? 'cache' : 'api',
        method: fromCache ? `cache:${cacheSource}` : 'http_get',
        timestamp: new Date().toISOString(),
      },
    },
  });
}

/**
 * Log an API error
 */
export function logAPIError(
  service: string,
  endpoint: string,
  error: string,
  statusCode?: number
): void {
  logCREPEvent({
    service,
    event_type: 'api_error',
    data: {
      endpoint,
      error,
    },
    metadata: {
      status_code: statusCode,
    },
  });
}

/**
 * Log a failover event
 */
export function logFailover(
  service: string,
  fromSource: string,
  toSource: string,
  reason: string
): void {
  logCREPEvent({
    service,
    event_type: 'failover',
    data: {
      source: `${fromSource} -> ${toSource}`,
      error: reason,
    },
  });
}

/**
 * Log a snapshot event
 */
export function logSnapshot(
  service: string,
  itemCount: number,
  action: 'save' | 'restore'
): void {
  logCREPEvent({
    service,
    event_type: 'snapshot',
    data: {
      item_count: itemCount,
      source: action,
    },
  });
}

/**
 * Log a health check
 */
export function logHealthCheck(
  service: string,
  status: 'healthy' | 'degraded' | 'down',
  latencyMs?: number
): void {
  logCREPEvent({
    service,
    event_type: 'health_check',
    data: {
      api_status: status,
      latency_ms: latencyMs,
    },
  });
}

/**
 * Flush logs to MINDEX API
 */
export async function flushLogs(): Promise<void> {
  if (logQueue.length === 0) return;
  
  const logsToSend = logQueue.splice(0, BATCH_SIZE);
  
  try {
    const response = await fetch(`${MINDEX_API}/api/logs/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.MINDEX_API_KEY || 'local-dev-key',
      },
      body: JSON.stringify({ logs: logsToSend }),
    });
    
    if (!response.ok) {
      console.warn(`[MINDEXLogger] Failed to flush logs: ${response.status}`);
      // Re-queue failed logs
      logQueue.unshift(...logsToSend);
    } else {
      console.log(`[MINDEXLogger] Flushed ${logsToSend.length} logs`);
    }
  } catch (error) {
    console.warn('[MINDEXLogger] Failed to flush logs:', error);
    // Re-queue failed logs
    logQueue.unshift(...logsToSend);
    
    // If queue is too large, drop old entries
    if (logQueue.length > 1000) {
      const dropped = logQueue.splice(0, logQueue.length - 500);
      console.warn(`[MINDEXLogger] Dropped ${dropped.length} old log entries`);
    }
  }
}

/**
 * Synchronous flush for page unload
 */
function flushLogsSync(): void {
  if (logQueue.length === 0) return;
  
  const logsToSend = logQueue.splice(0, BATCH_SIZE);
  
  // Use sendBeacon for reliable delivery on page unload
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify({ logs: logsToSend })], {
      type: 'application/json',
    });
    navigator.sendBeacon(`${MINDEX_API}/api/logs/batch`, blob);
  }
}

/**
 * Generate unique log ID
 */
function generateLogId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Get queued log count
 */
export function getQueuedLogCount(): number {
  return logQueue.length;
}

/**
 * Stop the logger
 */
export function stopMINDEXLogger(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  
  // Attempt final flush
  flushLogs().catch(console.error);
  
  isInitialized = false;
  console.log('[MINDEXLogger] Stopped');
}

/**
 * Export logs for debugging
 */
export function exportLogs(): MINDEXLogEntry[] {
  return [...logQueue];
}
