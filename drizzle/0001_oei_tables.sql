-- NatureOS OEI Database Migration
-- Version: 0001
-- Date: 2026-01-16
-- Description: Create OEI tables for entities, observations, and events

-- =============================================================================
-- ENTITIES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "oei_entities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" varchar(50) NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "source_id" varchar(255),
  "source" varchar(100),
  "location" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "last_seen_at" timestamp,
  "status" varchar(50) DEFAULT 'active',
  "properties" jsonb DEFAULT '{}',
  "tags" jsonb DEFAULT '[]',
  "provenance" jsonb
);

-- Indexes for entities
CREATE INDEX IF NOT EXISTS "oei_entities_type_idx" ON "oei_entities" ("type");
CREATE INDEX IF NOT EXISTS "oei_entities_source_idx" ON "oei_entities" ("source");
CREATE INDEX IF NOT EXISTS "oei_entities_status_idx" ON "oei_entities" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "oei_entities_source_id_idx" ON "oei_entities" ("source", "source_id");
CREATE INDEX IF NOT EXISTS "oei_entities_last_seen_idx" ON "oei_entities" ("last_seen_at");

-- =============================================================================
-- OBSERVATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "oei_observations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" varchar(50) NOT NULL,
  "entity_id" uuid REFERENCES "oei_entities"("id"),
  "location" jsonb,
  "observed_at" timestamp NOT NULL,
  "received_at" timestamp DEFAULT now() NOT NULL,
  "value" numeric,
  "unit" varchar(50),
  "values" jsonb,
  "quality" numeric,
  "is_valid" boolean DEFAULT true,
  "source" varchar(100),
  "source_id" varchar(255),
  "provenance" jsonb
);

-- Indexes for observations
CREATE INDEX IF NOT EXISTS "oei_observations_observed_at_idx" ON "oei_observations" ("observed_at");
CREATE INDEX IF NOT EXISTS "oei_observations_type_observed_idx" ON "oei_observations" ("type", "observed_at");
CREATE INDEX IF NOT EXISTS "oei_observations_entity_observed_idx" ON "oei_observations" ("entity_id", "observed_at");
CREATE INDEX IF NOT EXISTS "oei_observations_source_idx" ON "oei_observations" ("source");

-- =============================================================================
-- EVENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "oei_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" varchar(100) NOT NULL,
  "severity" varchar(20) NOT NULL DEFAULT 'info',
  "title" varchar(500) NOT NULL,
  "description" text,
  "details" jsonb,
  "location" jsonb,
  "affected_area" jsonb,
  "occurred_at" timestamp NOT NULL,
  "detected_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp,
  "resolved_at" timestamp,
  "status" varchar(20) DEFAULT 'active',
  "acknowledged" boolean DEFAULT false,
  "acknowledged_by" varchar(255),
  "acknowledged_at" timestamp,
  "entity_ids" jsonb DEFAULT '[]',
  "observation_ids" jsonb DEFAULT '[]',
  "actions" jsonb,
  "source" varchar(100),
  "source_id" varchar(255),
  "provenance" jsonb
);

-- Indexes for events
CREATE INDEX IF NOT EXISTS "oei_events_type_idx" ON "oei_events" ("type");
CREATE INDEX IF NOT EXISTS "oei_events_severity_idx" ON "oei_events" ("severity");
CREATE INDEX IF NOT EXISTS "oei_events_status_idx" ON "oei_events" ("status");
CREATE INDEX IF NOT EXISTS "oei_events_occurred_at_idx" ON "oei_events" ("occurred_at");
CREATE INDEX IF NOT EXISTS "oei_events_source_idx" ON "oei_events" ("source");
CREATE INDEX IF NOT EXISTS "oei_events_source_id_idx" ON "oei_events" ("source", "source_id");
CREATE INDEX IF NOT EXISTS "oei_events_active_idx" ON "oei_events" ("status", "severity", "occurred_at");

-- =============================================================================
-- EVENT SUBSCRIPTIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "oei_event_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar(255),
  "name" varchar(255),
  "event_types" jsonb,
  "min_severity" varchar(20),
  "area" jsonb,
  "entity_ids" jsonb,
  "channels" jsonb,
  "webhook_url" text,
  "enabled" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS "oei_event_subscriptions_user_idx" ON "oei_event_subscriptions" ("user_id");
CREATE INDEX IF NOT EXISTS "oei_event_subscriptions_enabled_idx" ON "oei_event_subscriptions" ("enabled");

-- =============================================================================
-- OPTIONAL: TimescaleDB Setup (Run manually if TimescaleDB is available)
-- =============================================================================

-- Enable TimescaleDB extension
-- CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert observations to hypertable
-- SELECT create_hypertable('oei_observations', 'observed_at',
--   chunk_time_interval => INTERVAL '1 day',
--   if_not_exists => TRUE
-- );

-- Add compression policy (compress chunks older than 7 days)
-- SELECT add_compression_policy('oei_observations', INTERVAL '7 days');

-- Add retention policy (delete data older than 365 days)
-- SELECT add_retention_policy('oei_observations', INTERVAL '365 days');

-- =============================================================================
-- OPTIONAL: PostGIS Setup (Run manually if PostGIS is available)
-- =============================================================================

-- Enable PostGIS extension
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometry column to entities
-- ALTER TABLE oei_entities ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);

-- Create spatial index
-- CREATE INDEX IF NOT EXISTS oei_entities_geom_idx ON oei_entities USING GIST (geom);
