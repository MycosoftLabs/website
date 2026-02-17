/**
 * CREP Library Exports
 * Created: Feb 12, 2026
 * 
 * Centralized exports for CREP-related utilities:
 * - Device widget mapper for MycoBrain device visualization
 * - Redis cache for shared CREP and Search caching
 */

// Device Widget Mapper
export {
  getDeviceWidgetConfig,
  getDeviceEmoji,
  getIAQQuality,
  formatSensorValue,
  parseDeviceRole,
  getDeviceIcon,
  getDeviceMarkerStyle,
  getDeviceWidgetType,
  DEVICE_WIDGET_CONFIG,
  type MycoBrainDeviceRole,
  type DeviceWidgetConfig,
  type DeviceCapabilities,
  type DeviceWidgetType,
} from "./device-widget-mapper"

// Redis Cache
export {
  getCached,
  invalidateCache,
  invalidateNamespace,
  warmCache,
  getCacheStats,
  cacheCREPWeather,
  cacheCREPEvents,
  cacheCREPDevices,
  cacheCREPAlerts,
  cacheSearchUnified,
  cacheSearchTaxa,
  cacheSearchObservations,
  CACHE_NAMESPACES,
  CACHE_TTL,
} from "./redis-cache"

// Unified Entity Schema
export type {
  UnifiedEntity,
  UnifiedEntityState,
  UnifiedEntityTime,
  UnifiedEntityBatch,
  UnifiedEntityDelta,
  UnifiedEntityKeyframe,
  UnifiedEntityWithTimeline,
} from "./entities/unified-entity-schema"

// S2 Spatial Indexing
export {
  getS2CellId,
  getS2LevelFromZoom,
  getViewportCells,
} from "./spatial/s2-indexer"

export type { MapBounds } from "./spatial/s2-indexer"
