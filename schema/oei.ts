/**
 * NatureOS OEI (Environmental Common Operating Picture) Database Schema
 * 
 * Drizzle ORM schema for PostgreSQL with PostGIS and TimescaleDB support.
 * 
 * Tables:
 * - entities: Physical things (devices, species, locations, aircraft, vessels)
 * - observations: Sensor readings and measurements (TimescaleDB hypertable)
 * - events: Alerts, incidents, state changes
 * - provenance: Data source tracking
 */

import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  jsonb,
  numeric,
  boolean,
  integer,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// =============================================================================
// ENTITIES TABLE
// =============================================================================

/**
 * Entities represent physical or logical things in the system.
 * Examples: devices, species, locations, aircraft, vessels, weather stations
 */
export const entities = pgTable(
  "oei_entities",
  {
    // Primary key
    id: uuid("id").defaultRandom().primaryKey(),
    
    // Entity identification
    type: varchar("type", { length: 50 }).notNull(), // device, species, aircraft, vessel, etc.
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    
    // External source identification
    sourceId: varchar("source_id", { length: 255 }), // ID from external source
    source: varchar("source", { length: 100 }), // opensky, aisstream, inaturalist, etc.
    
    // Location (PostGIS point would be ideal, using JSON for portability)
    location: jsonb("location"), // { latitude, longitude, altitude, accuracy, source }
    
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at"),
    
    // Status
    status: varchar("status", { length: 50 }).default("active"), // active, inactive, archived
    
    // Flexible properties based on entity type
    properties: jsonb("properties").default({}),
    
    // Tags for filtering
    tags: jsonb("tags").default([]),
    
    // Provenance tracking
    provenance: jsonb("provenance"), // { source, sourceId, collectedAt, url, reliability, metadata }
  },
  (table) => ({
    // Indexes for common queries
    typeIdx: index("oei_entities_type_idx").on(table.type),
    sourceIdx: index("oei_entities_source_idx").on(table.source),
    statusIdx: index("oei_entities_status_idx").on(table.status),
    sourceIdIdx: uniqueIndex("oei_entities_source_id_idx").on(table.source, table.sourceId),
    lastSeenIdx: index("oei_entities_last_seen_idx").on(table.lastSeenAt),
  })
)

// =============================================================================
// OBSERVATIONS TABLE (TimescaleDB hypertable candidate)
// =============================================================================

/**
 * Observations represent sensor readings and measurements over time.
 * Designed as a TimescaleDB hypertable for time-series optimization.
 */
export const observations = pgTable(
  "oei_observations",
  {
    // Primary key
    id: uuid("id").defaultRandom().primaryKey(),
    
    // Observation type
    type: varchar("type", { length: 50 }).notNull(), // temperature, humidity, air_quality, etc.
    
    // Related entity (nullable - some observations are standalone)
    entityId: uuid("entity_id").references(() => entities.id),
    
    // Location (for observations not tied to an entity)
    location: jsonb("location"), // { latitude, longitude, altitude, accuracy, source }
    
    // Timestamp (partition key for TimescaleDB)
    observedAt: timestamp("observed_at").notNull(),
    receivedAt: timestamp("received_at").defaultNow().notNull(),
    
    // Measurement value(s)
    value: numeric("value"), // Primary numeric value
    unit: varchar("unit", { length: 50 }), // e.g., "celsius", "percent", "ppm"
    
    // Additional measurements
    values: jsonb("values"), // { key: value } for multiple measurements
    
    // Quality indicators
    quality: numeric("quality"), // 0.0 - 1.0 confidence score
    isValid: boolean("is_valid").default(true),
    
    // Source tracking
    source: varchar("source", { length: 100 }), // mycobrain, bme688, iNaturalist, etc.
    sourceId: varchar("source_id", { length: 255 }),
    
    // Provenance
    provenance: jsonb("provenance"),
  },
  (table) => ({
    // Indexes for time-series queries
    observedAtIdx: index("oei_observations_observed_at_idx").on(table.observedAt),
    typeObservedIdx: index("oei_observations_type_observed_idx").on(table.type, table.observedAt),
    entityObservedIdx: index("oei_observations_entity_observed_idx").on(table.entityId, table.observedAt),
    sourceIdx: index("oei_observations_source_idx").on(table.source),
  })
)

// =============================================================================
// EVENTS TABLE
// =============================================================================

/**
 * Events represent alerts, incidents, and state changes.
 * Examples: weather alerts, earthquake warnings, device failures, species sightings
 */
export const events = pgTable(
  "oei_events",
  {
    // Primary key
    id: uuid("id").defaultRandom().primaryKey(),
    
    // Event classification
    type: varchar("type", { length: 100 }).notNull(), // weather_alert, earthquake, volcanic_activity, etc.
    severity: varchar("severity", { length: 20 }).notNull().default("info"), // info, low, medium, high, critical
    
    // Content
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    details: jsonb("details"), // Type-specific additional data
    
    // Location
    location: jsonb("location"), // { latitude, longitude, altitude, accuracy, source }
    affectedArea: jsonb("affected_area"), // { north, south, east, west } bounds
    
    // Timestamps
    occurredAt: timestamp("occurred_at").notNull(),
    detectedAt: timestamp("detected_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"),
    resolvedAt: timestamp("resolved_at"),
    
    // Status
    status: varchar("status", { length: 20 }).default("active"), // active, resolved, expired
    acknowledged: boolean("acknowledged").default(false),
    acknowledgedBy: varchar("acknowledged_by", { length: 255 }),
    acknowledgedAt: timestamp("acknowledged_at"),
    
    // Related entities and observations
    entityIds: jsonb("entity_ids").default([]), // Array of entity UUIDs
    observationIds: jsonb("observation_ids").default([]), // Array of observation UUIDs
    
    // Actions
    actions: jsonb("actions"), // Available actions for this event
    
    // Provenance
    source: varchar("source", { length: 100 }),
    sourceId: varchar("source_id", { length: 255 }),
    provenance: jsonb("provenance"),
  },
  (table) => ({
    // Indexes for event queries
    typeIdx: index("oei_events_type_idx").on(table.type),
    severityIdx: index("oei_events_severity_idx").on(table.severity),
    statusIdx: index("oei_events_status_idx").on(table.status),
    occurredAtIdx: index("oei_events_occurred_at_idx").on(table.occurredAt),
    sourceIdx: index("oei_events_source_idx").on(table.source),
    sourceIdIdx: index("oei_events_source_id_idx").on(table.source, table.sourceId),
    activeEventsIdx: index("oei_events_active_idx").on(table.status, table.severity, table.occurredAt),
  })
)

// =============================================================================
// EVENT SUBSCRIPTIONS TABLE
// =============================================================================

/**
 * User subscriptions to specific event types or areas.
 */
export const eventSubscriptions = pgTable(
  "oei_event_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    
    // User/system that created the subscription
    userId: varchar("user_id", { length: 255 }),
    name: varchar("name", { length: 255 }),
    
    // Filter criteria
    eventTypes: jsonb("event_types"), // Array of event type strings
    minSeverity: varchar("min_severity", { length: 20 }),
    area: jsonb("area"), // GeoBounds to filter by location
    entityIds: jsonb("entity_ids"), // Watch specific entities
    
    // Notification settings
    channels: jsonb("channels"), // ["email", "push", "sms", "webhook"]
    webhookUrl: text("webhook_url"),
    
    // Status
    enabled: boolean("enabled").default(true),
    
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("oei_event_subscriptions_user_idx").on(table.userId),
    enabledIdx: index("oei_event_subscriptions_enabled_idx").on(table.enabled),
  })
)

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Entity = typeof entities.$inferSelect
export type NewEntity = typeof entities.$inferInsert
export type Observation = typeof observations.$inferSelect
export type NewObservation = typeof observations.$inferInsert
export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert
export type EventSubscription = typeof eventSubscriptions.$inferSelect
export type NewEventSubscription = typeof eventSubscriptions.$inferInsert

// =============================================================================
// SQL MIGRATIONS (for reference - run these manually or via migration system)
// =============================================================================

/**
 * TimescaleDB setup (run after creating observations table):
 * 
 * -- Enable TimescaleDB extension
 * CREATE EXTENSION IF NOT EXISTS timescaledb;
 * 
 * -- Convert observations to hypertable
 * SELECT create_hypertable('oei_observations', 'observed_at',
 *   chunk_time_interval => INTERVAL '1 day',
 *   if_not_exists => TRUE
 * );
 * 
 * -- Create continuous aggregates for common queries
 * CREATE MATERIALIZED VIEW oei_observations_hourly
 * WITH (timescaledb.continuous) AS
 * SELECT
 *   time_bucket('1 hour', observed_at) AS bucket,
 *   entity_id,
 *   type,
 *   AVG(value) as avg_value,
 *   MIN(value) as min_value,
 *   MAX(value) as max_value,
 *   COUNT(*) as count
 * FROM oei_observations
 * GROUP BY bucket, entity_id, type
 * WITH NO DATA;
 * 
 * -- Add compression policy (compress chunks older than 7 days)
 * SELECT add_compression_policy('oei_observations', INTERVAL '7 days');
 * 
 * -- Add retention policy (delete data older than 365 days)
 * SELECT add_retention_policy('oei_observations', INTERVAL '365 days');
 */

/**
 * PostGIS setup (optional - for spatial queries):
 * 
 * -- Enable PostGIS extension
 * CREATE EXTENSION IF NOT EXISTS postgis;
 * 
 * -- Add geometry column to entities (alternative to JSON location)
 * ALTER TABLE oei_entities ADD COLUMN geom geometry(Point, 4326);
 * 
 * -- Create spatial index
 * CREATE INDEX oei_entities_geom_idx ON oei_entities USING GIST (geom);
 * 
 * -- Update trigger to sync JSON location to geometry
 * CREATE OR REPLACE FUNCTION sync_entity_geom() RETURNS trigger AS $$
 * BEGIN
 *   IF NEW.location IS NOT NULL THEN
 *     NEW.geom = ST_SetSRID(ST_MakePoint(
 *       (NEW.location->>'longitude')::float,
 *       (NEW.location->>'latitude')::float
 *     ), 4326);
 *   END IF;
 *   RETURN NEW;
 * END;
 * $$ LANGUAGE plpgsql;
 * 
 * CREATE TRIGGER oei_entities_geom_sync
 *   BEFORE INSERT OR UPDATE ON oei_entities
 *   FOR EACH ROW EXECUTE FUNCTION sync_entity_geom();
 */
