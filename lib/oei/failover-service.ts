/**
 * CREP Failover Service
 * 
 * Provides intelligent failover between data sources:
 * - Primary API -> Secondary API -> Local Cache -> Snapshot
 * - Automatic recovery when APIs come back online
 * - Circuit breaker pattern to prevent cascade failures
 * - Latency monitoring with alerts
 */

import { getCached, invalidateCache, saveSnapshot } from './cache-manager';
import { getLatestSnapshot } from './snapshot-store';

// Circuit breaker state per endpoint
interface CircuitState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  successCount: number;
}

const circuitBreakers = new Map<string, CircuitState>();

// Configuration
const FAILURE_THRESHOLD = 3;
const RESET_TIMEOUT = 60_000; // 1 minute
const HALF_OPEN_REQUESTS = 2;

// Latency tracking
interface LatencyStats {
  samples: number[];
  avg: number;
  p95: number;
  lastUpdate: number;
}

const latencyStats = new Map<string, LatencyStats>();
const MAX_SAMPLES = 100;

// Data source endpoints with fallbacks
interface DataSourceConfig {
  name: string;
  primary: string;
  secondary?: string;
  fallbackToCache: boolean;
  fallbackToSnapshot: boolean;
  criticalityLevel: 'critical' | 'high' | 'medium' | 'low';
  maxLatency: number; // Alert if latency exceeds this (ms)
}

const DATA_SOURCES: DataSourceConfig[] = [
  {
    name: 'aircraft',
    primary: '/api/oei/flightradar24',
    secondary: '/api/oei/opensky',
    fallbackToCache: true,
    fallbackToSnapshot: true,
    criticalityLevel: 'critical',
    maxLatency: 5000,
  },
  {
    name: 'vessels',
    primary: '/api/oei/aisstream',
    fallbackToCache: true,
    fallbackToSnapshot: true,
    criticalityLevel: 'critical',
    maxLatency: 5000,
  },
  {
    name: 'satellites',
    primary: '/api/oei/satellites',
    fallbackToCache: true,
    fallbackToSnapshot: true,
    criticalityLevel: 'high',
    maxLatency: 10000,
  },
  {
    name: 'fungal',
    primary: '/api/crep/fungal',
    fallbackToCache: true,
    fallbackToSnapshot: true,
    criticalityLevel: 'high',
    maxLatency: 15000,
  },
  {
    name: 'space-weather',
    primary: '/api/oei/space-weather',
    fallbackToCache: true,
    fallbackToSnapshot: true,
    criticalityLevel: 'medium',
    maxLatency: 10000,
  },
  {
    name: 'events',
    primary: '/api/natureos/global-events',
    fallbackToCache: true,
    fallbackToSnapshot: true,
    criticalityLevel: 'critical',
    maxLatency: 5000,
  },
];

/**
 * Get circuit breaker state for an endpoint
 */
function getCircuitState(key: string): CircuitState {
  if (!circuitBreakers.has(key)) {
    circuitBreakers.set(key, {
      failures: 0,
      lastFailure: 0,
      state: 'closed',
      successCount: 0,
    });
  }
  return circuitBreakers.get(key)!;
}

/**
 * Record a failure for circuit breaker
 */
function recordFailure(key: string): void {
  const state = getCircuitState(key);
  state.failures++;
  state.lastFailure = Date.now();
  state.successCount = 0;
  
  if (state.failures >= FAILURE_THRESHOLD) {
    state.state = 'open';
    console.warn(`[Failover] Circuit breaker OPEN for ${key} after ${state.failures} failures`);
  }
}

/**
 * Record a success for circuit breaker
 */
function recordSuccess(key: string): void {
  const state = getCircuitState(key);
  
  if (state.state === 'half-open') {
    state.successCount++;
    if (state.successCount >= HALF_OPEN_REQUESTS) {
      state.state = 'closed';
      state.failures = 0;
      console.log(`[Failover] Circuit breaker CLOSED for ${key}`);
    }
  } else {
    state.failures = 0;
    state.state = 'closed';
  }
}

/**
 * Check if circuit is allowing requests
 */
function shouldAttemptRequest(key: string): boolean {
  const state = getCircuitState(key);
  
  if (state.state === 'closed') {
    return true;
  }
  
  if (state.state === 'open') {
    // Check if reset timeout has passed
    if (Date.now() - state.lastFailure > RESET_TIMEOUT) {
      state.state = 'half-open';
      console.log(`[Failover] Circuit breaker HALF-OPEN for ${key}`);
      return true;
    }
    return false;
  }
  
  // half-open: allow limited requests
  return true;
}

/**
 * Record latency for monitoring
 */
function recordLatency(key: string, latency: number): void {
  let stats = latencyStats.get(key);
  
  if (!stats) {
    stats = { samples: [], avg: 0, p95: 0, lastUpdate: Date.now() };
    latencyStats.set(key, stats);
  }
  
  stats.samples.push(latency);
  if (stats.samples.length > MAX_SAMPLES) {
    stats.samples.shift();
  }
  
  // Calculate stats
  const sorted = [...stats.samples].sort((a, b) => a - b);
  stats.avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  stats.p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  stats.lastUpdate = Date.now();
}

/**
 * Fetch data with failover logic
 */
export async function fetchWithFailover<T>(
  sourceName: string,
  options?: {
    forceRefresh?: boolean;
    signal?: AbortSignal;
  }
): Promise<{
  data: T;
  source: 'primary' | 'secondary' | 'cache' | 'snapshot';
  latency: number;
  stale: boolean;
}> {
  const config = DATA_SOURCES.find(s => s.name === sourceName);
  
  if (!config) {
    throw new Error(`Unknown data source: ${sourceName}`);
  }
  
  const startTime = performance.now();
  
  // Try primary endpoint
  if (shouldAttemptRequest(config.primary)) {
    try {
      const response = await fetch(config.primary, {
        signal: options?.signal,
      });
      
      if (response.ok) {
        const data = await response.json();
        const latency = performance.now() - startTime;
        
        recordSuccess(config.primary);
        recordLatency(sourceName, latency);
        
        // Check if latency exceeds threshold
        if (latency > config.maxLatency) {
          console.warn(`[Failover] High latency for ${sourceName}: ${latency.toFixed(0)}ms (threshold: ${config.maxLatency}ms)`);
        }
        
        return {
          data,
          source: 'primary',
          latency,
          stale: false,
        };
      }
      
      recordFailure(config.primary);
    } catch (error) {
      recordFailure(config.primary);
      console.warn(`[Failover] Primary failed for ${sourceName}:`, error);
    }
  }
  
  // Try secondary endpoint if available
  if (config.secondary && shouldAttemptRequest(config.secondary)) {
    try {
      const response = await fetch(config.secondary, {
        signal: options?.signal,
      });
      
      if (response.ok) {
        const data = await response.json();
        const latency = performance.now() - startTime;
        
        recordSuccess(config.secondary);
        recordLatency(sourceName, latency);
        
        return {
          data,
          source: 'secondary',
          latency,
          stale: false,
        };
      }
      
      recordFailure(config.secondary);
    } catch (error) {
      recordFailure(config.secondary);
      console.warn(`[Failover] Secondary failed for ${sourceName}:`, error);
    }
  }
  
  // Fallback to cache
  if (config.fallbackToCache) {
    try {
      const cached = await getCached<T>(sourceName, async () => {
        throw new Error('Cache lookup only');
      });
      
      const latency = performance.now() - startTime;
      
      return {
        data: cached.data,
        source: 'cache',
        latency,
        stale: true,
      };
    } catch {
      // No cache available
    }
  }
  
  // Fallback to snapshot
  if (config.fallbackToSnapshot) {
    const snapshot = await getLatestSnapshot<T>(sourceName);
    
    if (snapshot) {
      const latency = performance.now() - startTime;
      
      console.log(`[Failover] Using snapshot for ${sourceName} from ${new Date(snapshot.timestamp).toISOString()}`);
      
      return {
        data: snapshot.data,
        source: 'snapshot',
        latency,
        stale: true,
      };
    }
  }
  
  throw new Error(`All data sources failed for ${sourceName}`);
}

/**
 * Get failover service status
 */
export function getFailoverStatus(): {
  circuits: Record<string, CircuitState>;
  latency: Record<string, LatencyStats>;
  healthyCount: number;
  degradedCount: number;
} {
  const circuits: Record<string, CircuitState> = {};
  const latency: Record<string, LatencyStats> = {};
  
  let healthyCount = 0;
  let degradedCount = 0;
  
  for (const source of DATA_SOURCES) {
    const state = getCircuitState(source.primary);
    circuits[source.name] = state;
    
    if (state.state === 'closed') {
      healthyCount++;
    } else {
      degradedCount++;
    }
    
    const stats = latencyStats.get(source.name);
    if (stats) {
      latency[source.name] = stats;
    }
  }
  
  return {
    circuits,
    latency,
    healthyCount,
    degradedCount,
  };
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuits(): void {
  circuitBreakers.clear();
  console.log('[Failover] All circuit breakers reset');
}

/**
 * Force refresh a specific source
 */
export async function forceRefresh(sourceName: string): Promise<void> {
  invalidateCache(sourceName);
  const state = getCircuitState(DATA_SOURCES.find(s => s.name === sourceName)?.primary || sourceName);
  state.state = 'closed';
  state.failures = 0;
  console.log(`[Failover] Force refresh triggered for ${sourceName}`);
}
