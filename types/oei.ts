/**
 * NatureOS OEI (Environmental Common Operating Picture) Canonical Schemas
 * 
 * These schemas define the unified data structures for:
 * - Entities (physical things: devices, species, locations)
 * - Observations (sensor readings, measurements)
 * - Events (alerts, incidents, state changes)
 * - Provenance (data source tracking)
 */

// =============================================================================
// ENUMS
// =============================================================================

export enum EntityType {
  DEVICE = "device",
  SPECIES = "species",
  LOCATION = "location",
  AIRCRAFT = "aircraft",
  VESSEL = "vessel",
  WEATHER_STATION = "weather_station",
  SENSOR = "sensor",
  CUSTOM = "custom",
}

export enum EventSeverity {
  INFO = "info",
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum EventType {
  // Environmental
  WEATHER_ALERT = "weather_alert",
  AIR_QUALITY_ALERT = "air_quality_alert",
  SPACE_WEATHER_ALERT = "space_weather_alert",
  
  // Geological
  EARTHQUAKE = "earthquake",
  VOLCANIC_ACTIVITY = "volcanic_activity",
  TSUNAMI_WARNING = "tsunami_warning",
  
  // Biological
  SPECIES_OBSERVATION = "species_observation",
  INVASIVE_SPECIES_ALERT = "invasive_species_alert",
  
  // Device/System
  DEVICE_ALERT = "device_alert",
  SENSOR_THRESHOLD = "sensor_threshold",
  DEVICE_OFFLINE = "device_offline",
  DEVICE_ONLINE = "device_online",
  
  // Transportation
  AIRCRAFT_ALERT = "aircraft_alert",
  VESSEL_ALERT = "vessel_alert",
  
  // General
  SYSTEM_ALERT = "system_alert",
  CUSTOM = "custom",
}

export enum ObservationType {
  // Environmental
  TEMPERATURE = "temperature",
  HUMIDITY = "humidity",
  PRESSURE = "pressure",
  AIR_QUALITY = "air_quality",
  GAS_RESISTANCE = "gas_resistance",
  VOC = "voc",
  CO2 = "co2",
  
  // Weather
  WIND_SPEED = "wind_speed",
  WIND_DIRECTION = "wind_direction",
  PRECIPITATION = "precipitation",
  VISIBILITY = "visibility",
  
  // Space Weather
  KP_INDEX = "kp_index",
  SOLAR_WIND = "solar_wind",
  XRAY_FLUX = "xray_flux",
  
  // Biological
  SPECIES_COUNT = "species_count",
  IAQ = "iaq",
  GAS_CLASS = "gas_class",
  
  // Custom
  CUSTOM = "custom",
}

export enum ProvenanceSource {
  // Internal
  MYCOBRAIN = "mycobrain",
  MINDEX = "mindex",
  NATUREOS = "natureos",
  
  // Weather
  NOAA = "noaa",
  NWS = "nws",
  OPENWEATHER = "openweather",
  
  // Space Weather
  NASA_DONKI = "nasa_donki",
  NOAA_SWPC = "noaa_swpc",
  
  // Geological
  USGS = "usgs",
  
  // Air Quality
  OPENAQ = "openaq",
  AIRNOW = "airnow",
  
  // Biological
  INATURALIST = "inaturalist",
  GBIF = "gbif",
  
  // Transportation
  OPENSKY = "opensky",
  AISSTREAM = "aisstream",
  
  // Other
  USER_INPUT = "user_input",
  COMPUTED = "computed",
  CUSTOM = "custom",
}

// =============================================================================
// CORE INTERFACES
// =============================================================================

/**
 * Geographic location with optional accuracy and altitude
 */
export interface GeoLocation {
  latitude: number
  longitude: number
  altitude?: number  // meters
  accuracy?: number  // meters
  source?: "gps" | "manual" | "network" | "estimated"
}

/**
 * Bounding box for geographic queries
 */
export interface GeoBounds {
  north: number
  south: number
  east: number
  west: number
}

/**
 * Data provenance - tracks the origin and reliability of data
 */
export interface Provenance {
  source: ProvenanceSource | string
  sourceId?: string           // Original ID from source system
  collectedAt: string         // ISO 8601 timestamp
  processedAt?: string        // When data was processed/ingested
  reliability?: number        // 0-1 confidence score
  methodology?: string        // How data was collected
  license?: string            // Data license if applicable
  url?: string                // Source URL
  metadata?: Record<string, unknown>
}

/**
 * Base entity - represents any trackable object
 */
export interface Entity {
  id: string                  // Unique identifier (UUID)
  type: EntityType | string
  name: string
  description?: string
  
  // Location
  location?: GeoLocation
  
  // Temporal
  createdAt: string           // ISO 8601
  updatedAt: string           // ISO 8601
  lastSeenAt?: string         // ISO 8601
  
  // State
  status?: "active" | "inactive" | "unknown" | string
  
  // Provenance
  provenance: Provenance
  
  // Relationships
  parentId?: string           // For hierarchical entities
  childIds?: string[]
  tags?: string[]
  
  // Extensible properties
  properties?: Record<string, unknown>
}

/**
 * Observation - a single measurement or reading
 */
export interface Observation {
  id: string
  entityId: string            // Reference to the entity this observation is about
  type: ObservationType | string
  
  // Measurement
  value: number | string | boolean
  unit?: string               // e.g., "°C", "hPa", "%", "ppm"
  
  // Quality
  quality?: number            // 0-1 quality score
  accuracy?: number           // Measurement accuracy
  
  // Temporal
  observedAt: string          // When observation was made
  receivedAt: string          // When observation was received by system
  
  // Provenance
  provenance: Provenance
  
  // Context
  metadata?: Record<string, unknown>
}

/**
 * Observation batch - for efficient bulk ingestion
 */
export interface ObservationBatch {
  entityId: string
  observations: Omit<Observation, "entityId" | "id">[]
  provenance: Provenance
}

/**
 * Event - something that happened requiring attention
 */
export interface Event {
  id: string
  type: EventType | string
  severity: EventSeverity
  
  // Content
  title: string
  description: string
  details?: Record<string, unknown>
  
  // Location
  location?: GeoLocation
  affectedArea?: GeoBounds
  
  // Temporal
  occurredAt: string          // When event occurred
  detectedAt: string          // When event was detected
  expiresAt?: string          // When event expires/ends
  
  // State
  status: "active" | "resolved" | "expired" | "acknowledged"
  acknowledgedAt?: string
  acknowledgedBy?: string
  resolvedAt?: string
  
  // References
  entityIds?: string[]        // Related entities
  observationIds?: string[]   // Related observations
  parentEventId?: string      // For event threading
  
  // Provenance
  provenance: Provenance
  
  // Actions
  actions?: EventAction[]
}

/**
 * Suggested action for an event
 */
export interface EventAction {
  id: string
  type: "dismiss" | "acknowledge" | "investigate" | "custom"
  label: string
  url?: string
  metadata?: Record<string, unknown>
}

// =============================================================================
// SPECIALIZED ENTITY TYPES
// =============================================================================

/**
 * Device entity - IoT devices, sensors, etc.
 */
export interface DeviceEntity extends Entity {
  type: EntityType.DEVICE
  properties: {
    deviceType: "mycobrain" | "sensor" | "gateway" | "station" | string
    firmwareVersion?: string
    hardwareVersion?: string
    macAddress?: string
    serialNumber?: string
    port?: string
    capabilities?: {
      sensors?: string[]
      actuators?: string[]
      protocols?: string[]
    }
  }
}

/**
 * Species entity - biological species observation
 */
export interface SpeciesEntity extends Entity {
  type: EntityType.SPECIES
  properties: {
    scientificName: string
    commonName?: string
    kingdom: string
    phylum?: string
    class?: string
    order?: string
    family?: string
    genus?: string
    species?: string
    iucnStatus?: string       // Conservation status
    isInvasive?: boolean
    imageUrl?: string
    observationCount?: number
  }
}

/**
 * Aircraft entity - for ADS-B tracking
 * Used by both OpenSky and FlightRadar24 connectors
 */
export interface AircraftEntity {
  id: string
  type: EntityType.AIRCRAFT
  icao24: string            // 24-bit ICAO transponder address
  callsign?: string
  
  // Location (GeoJSON Point format)
  location: {
    type: "Point"
    coordinates: [number, number]  // [longitude, latitude]
  }
  
  // Flight info
  origin?: string           // Origin airport ICAO code
  destination?: string      // Destination airport ICAO code
  airline?: string          // Airline name or code
  flightNumber?: string     // Flight number (e.g., "UA123")
  aircraftType?: string     // Aircraft type code (e.g., "B738")
  registration?: string     // Aircraft registration (tail number)
  
  // Position & Movement
  altitude?: number | null  // feet
  velocity?: number | null  // knots
  heading?: number | null   // degrees
  verticalRate?: number | null  // feet per minute
  
  // Status
  onGround: boolean
  squawk?: string           // Transponder code
  transponder?: boolean     // ADS-B equipped
  
  // Timing
  lastSeen: string          // ISO 8601 timestamp
  
  // Provenance
  provenance: Provenance
}

/**
 * Vessel entity - for AIS ship tracking
 * Used by AISstream connector
 */
export interface VesselEntity {
  id: string
  type: EntityType.VESSEL
  mmsi: string              // Maritime Mobile Service Identity
  name?: string             // Ship name
  
  // Location (GeoJSON Point format)
  location: {
    type: "Point"
    coordinates: [number, number]  // [longitude, latitude]
  }
  
  // Identity
  imo?: string              // IMO ship number
  callsign?: string
  flag?: string             // Country flag
  
  // Vessel Details
  shipType: number | null   // AIS ship type code
  destination?: string
  eta?: string              // ISO 8601
  length?: number           // meters
  width?: number            // meters
  draught?: number          // meters (draft)
  
  // Movement
  heading?: number | null   // degrees (true heading)
  cog?: number | null       // Course over ground (degrees)
  sog?: number | null       // Speed over ground (knots)
  rot?: number | null       // Rate of turn (degrees/min)
  
  // Status
  navStatus: number | null  // AIS navigational status code
  
  // Timing
  lastSeen: string          // ISO 8601 timestamp
  
  // Provenance
  provenance: Provenance
}

/**
 * Satellite entity - for TLE-based satellite tracking
 * Used by CelesTrak connector
 */
export interface SatelliteEntity {
  id: string
  type: "satellite"
  noradId: number           // NORAD catalog number
  name: string              // Satellite name
  
  // Identity
  intlDesignator?: string   // International designator (e.g., "1998-067A")
  objectType?: string       // "PAYLOAD", "ROCKET BODY", "DEBRIS"
  country?: string          // Country of origin
  
  // Orbit Classification
  orbitType?: "LEO" | "MEO" | "GEO" | "HEO" | "POLAR" | "SSO" | "UNKNOWN"
  
  // Orbital Parameters (from TLE)
  orbitalParams?: {
    inclination?: number    // degrees
    eccentricity?: number   // 0-1
    apogee?: number         // km
    perigee?: number        // km
    period?: number         // minutes
    raan?: number           // Right Ascension of Ascending Node (degrees)
    argOfPerigee?: number   // Argument of Perigee (degrees)
    meanAnomaly?: number    // degrees
  }
  
  // Estimated Position (calculated from TLE)
  estimatedPosition?: {
    latitude: number
    longitude: number
    altitude: number        // km
  }
  
  // Timing
  launchDate?: string       // ISO 8601
  decayDate?: string        // ISO 8601 (if decayed)
  lastSeen: string          // TLE epoch
  
  // Provenance
  provenance: Provenance
}

/**
 * Weather station entity
 */
export interface WeatherStationEntity extends Entity {
  type: EntityType.WEATHER_STATION
  properties: {
    stationId: string
    stationType: "noaa" | "nws" | "personal" | "aviation" | string
    elevation?: number
    timezone?: string
  }
}

// =============================================================================
// SPECIALIZED OBSERVATION TYPES
// =============================================================================

/**
 * Environmental observation - temperature, humidity, pressure, etc.
 */
export interface EnvironmentalObservation extends Observation {
  type: 
    | ObservationType.TEMPERATURE
    | ObservationType.HUMIDITY
    | ObservationType.PRESSURE
    | ObservationType.AIR_QUALITY
  metadata?: {
    sensorType?: string
    calibrationDate?: string
  }
}

/**
 * Air quality observation
 */
export interface AirQualityObservation extends Observation {
  type: ObservationType.AIR_QUALITY
  value: number               // AQI value
  metadata?: {
    pollutant?: "pm25" | "pm10" | "o3" | "no2" | "so2" | "co"
    category?: string         // "Good", "Moderate", "Unhealthy", etc.
    healthMessage?: string
  }
}

/**
 * Space weather observation
 */
export interface SpaceWeatherObservation extends Observation {
  type:
    | ObservationType.KP_INDEX
    | ObservationType.SOLAR_WIND
    | ObservationType.XRAY_FLUX
  metadata?: {
    stormLevel?: string
    auroraVisibility?: boolean
    expectedDuration?: number  // hours
  }
}

// =============================================================================
// SPECIALIZED EVENT TYPES
// =============================================================================

/**
 * Weather alert event
 */
export interface WeatherAlertEvent extends Event {
  type: EventType.WEATHER_ALERT
  details: {
    alertType: string         // "Tornado Warning", "Flood Watch", etc.
    phenomenon?: string
    significance?: string
    certainty?: string
    urgency?: string
    response?: string
    instruction?: string
    headline?: string
  }
}

/**
 * Earthquake event
 */
export interface EarthquakeEvent extends Event {
  type: EventType.EARTHQUAKE
  details: {
    magnitude: number
    magnitudeType: string     // "ml", "mb", "mw", etc.
    depth: number             // km
    place: string
    felt?: number             // DYFI felt reports
    cdi?: number              // Community Decimal Intensity
    mmi?: number              // Modified Mercalli Intensity
    tsunami?: boolean
    usgsEventId?: string
  }
}

/**
 * Volcanic activity event
 */
export interface VolcanicActivityEvent extends Event {
  type: EventType.VOLCANIC_ACTIVITY
  details: {
    volcanoName: string
    alertLevel: string        // Normal, Advisory, Watch, Warning
    colorCode?: string        // Green, Yellow, Orange, Red
    activity?: string
    hazards?: string[]
    usgsVolcanoId?: string
  }
}

/**
 * Species observation event
 */
export interface SpeciesObservationEvent extends Event {
  type: EventType.SPECIES_OBSERVATION
  details: {
    scientificName: string
    commonName?: string
    observerName?: string
    isFirstRecord?: boolean
    isRareSpecies?: boolean
    inaturalistId?: string
    imageUrl?: string
  }
}

// =============================================================================
// API TYPES
// =============================================================================

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * Entity query parameters
 */
export interface EntityQuery {
  type?: EntityType | string
  status?: string
  bounds?: GeoBounds
  nearLocation?: GeoLocation & { radiusKm: number }
  tags?: string[]
  since?: string              // ISO 8601 timestamp
  limit?: number
  offset?: number
}

/**
 * Observation query parameters
 */
export interface ObservationQuery {
  entityId?: string
  type?: ObservationType | string
  since?: string
  until?: string
  limit?: number
  offset?: number
}

/**
 * Event query parameters
 */
export interface EventQuery {
  type?: EventType | string
  severity?: EventSeverity[]
  status?: ("active" | "resolved" | "expired")[]
  bounds?: GeoBounds
  since?: string
  until?: string
  limit?: number
  offset?: number
}

/**
 * Real-time subscription message
 */
export interface OEISubscriptionMessage {
  type: "entity_update" | "observation" | "event" | "heartbeat"
  timestamp: string
  payload: Entity | Observation | Event | null
}

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * Create entity input (without auto-generated fields)
 */
export type CreateEntityInput = Omit<Entity, "id" | "createdAt" | "updatedAt">

/**
 * Update entity input (partial, without id and timestamps)
 */
export type UpdateEntityInput = Partial<Omit<Entity, "id" | "createdAt" | "updatedAt">>

/**
 * Create observation input
 */
export type CreateObservationInput = Omit<Observation, "id" | "receivedAt">

/**
 * Create event input
 */
export type CreateEventInput = Omit<Event, "id" | "detectedAt" | "status"> & {
  status?: Event["status"]
}
