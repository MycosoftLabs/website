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
