/**
 * NatureOS OEI (Environmental Common Operating Picture)
 * 
 * Central module for real-time environmental data integration
 */

// Event Bus
export { 
  getEventBus, 
  createEventBus, 
  useEventBusState,
  HybridEventBus,
  InMemoryEventBus,
  type EventBusChannel,
  type EventBusMessage,
  type EventHandler,
  type EventBusConfig,
} from "./event-bus"

// WebSocket Streaming Service
export {
  getOEIStreamingService,
  OEIStreamingService,
  type StreamType,
  type StreamSubscription,
  type StreamMessage,
  type StreamStatus,
} from "./websocket-service"

// Cache Manager - Multi-layer caching with failover
export {
  getCached,
  invalidateCache,
  clearAllCaches,
  saveSnapshot as saveCacheSnapshot,
  preloadCriticalData,
  getCacheStats,
} from "./cache-manager"

// Snapshot Store - IndexedDB persistence for timeline replay
export {
  saveSnapshot,
  getLatestSnapshot,
  getSnapshotAtTime,
  getSnapshotTimeline,
  getStorageStats,
  exportSnapshots,
  clearAllSnapshots,
} from "./snapshot-store"

// Failover Service - Circuit breaker and automatic recovery
export {
  fetchWithFailover,
  getFailoverStatus,
  resetAllCircuits,
  forceRefresh,
} from "./failover-service"

// MINDEX Logger - Centralized logging for audit and monitoring
export {
  initMINDEXLogger,
  logCREPEvent,
  logDataCollection,
  logAPIError,
  logFailover,
  logSnapshot,
  logHealthCheck,
  flushLogs,
  getQueuedLogCount,
  stopMINDEXLogger,
  type MINDEXLogEntry,
} from "./mindex-logger"

// Re-export types from central types module
export type {
  Entity,
  Observation,
  Event,
  Provenance,
  GeoLocation,
  GeoBounds,
  EntityType,
  EventType,
  EventSeverity,
  ObservationType,
  ProvenanceSource,
  DeviceEntity,
  SpeciesEntity,
  AircraftEntity,
  VesselEntity,
  WeatherAlertEvent,
  EarthquakeEvent,
  VolcanicActivityEvent,
  PaginatedResponse,
  EntityQuery,
  ObservationQuery,
  EventQuery,
  OEISubscriptionMessage,
} from "@/types/oei"
