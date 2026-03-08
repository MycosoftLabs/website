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

// Entity Converters
export {
  isValidCoordinate,
  extractCoordinates,
  makePoint,
  convertSimpleAircraft,
  convertAircraftEntity,
  convertSimpleVessel,
  convertVesselEntity,
  convertSimpleSatellite,
  convertSatelliteEntity,
  convertGlobalEvent,
  convertFungalObservation,
  convertDevice,
  convertBatch,
  getEntityCoordinates,
  getEntityLatitude,
  getEntityLongitude,
} from "./entities/entity-converters"

// Entity Validators
export {
  validateCoordinates,
  validateEntity,
  validateBatch,
  type ValidationResult,
} from "./entities/entity-validators"

// MYCA-CREP Integration Bridge
export {
  parseMYCACommandForCREP,
  buildCREPContextForMYCA,
  buildEntityContextForMYCA,
  CREP_VOICE_COMMANDS,
  type CREPCommand,
  type CREPCommandResult,
  type CREPCommandType,
  type CREPContextForMYCA,
} from "./myca-integration"

// MINDEX-CREP Integration Pipeline
export {
  fetchMINDEXObservations,
  convertMINDEXToEntities,
  fetchSpeciesDetails,
  buildEnvironmentalContext,
  correlateWeatherWithFungal,
  type MINDEXObservation,
  type MINDEXSpeciesDetail,
  type MINDEXSearchParams,
  type MINDEXSearchResult,
} from "./mindex-integration"

// Streaming Client
export { EntityStreamClient, type ConnectionState, type EntityStreamConnectOptions } from "./streaming/entity-websocket-client"

// S2 Spatial Indexing
export {
  getS2CellId,
  getS2LevelFromZoom,
  getViewportCells,
} from "./spatial/s2-indexer"

export type { MapBounds } from "./spatial/s2-indexer"
