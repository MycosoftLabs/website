/**
 * Ground Station Database Schema
 *
 * Drizzle ORM schema for PostgreSQL.
 * Self-contained ground station data - no external backend dependency.
 *
 * Tables:
 * - gs_satellites: Satellite catalog with TLE data
 * - gs_transmitters: Satellite radio transmitters
 * - gs_groups: User-defined satellite groups
 * - gs_group_satellites: Many-to-many group membership
 * - gs_locations: Ground station locations
 * - gs_sdrs: Software Defined Radio hardware
 * - gs_rotators: Antenna rotator hardware
 * - gs_rigs: Radio rig hardware
 * - gs_cameras: Station cameras
 * - gs_observations: Scheduled satellite observations
 * - gs_monitored_satellites: Auto-scheduling configuration
 * - gs_tracking_state: Current tracking state (singleton)
 * - gs_preferences: Key-value preferences
 * - gs_tle_sources: TLE data sources
 */

import {
  pgTable,
  text,
  timestamp,
  varchar,
  jsonb,
  numeric,
  boolean,
  integer,
  uuid,
  index,
  real,
} from "drizzle-orm/pg-core"

// =============================================================================
// SATELLITES
// =============================================================================

export const gsSatellites = pgTable(
  "gs_satellites",
  {
    noradId: integer("norad_id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    source: varchar("source", { length: 100 }).notNull().default("satnogs"),
    nameOther: varchar("name_other", { length: 255 }),
    alternativeName: varchar("alternative_name", { length: 255 }),
    image: text("image"),
    satId: varchar("sat_id", { length: 50 }),
    tle1: text("tle1").notNull(),
    tle2: text("tle2").notNull(),
    status: varchar("status", { length: 50 }).default("alive"),
    decayed: varchar("decayed", { length: 50 }),
    launched: varchar("launched", { length: 50 }),
    deployed: varchar("deployed", { length: 50 }),
    website: text("website"),
    operator: varchar("operator", { length: 255 }),
    countries: varchar("countries", { length: 255 }),
    citation: text("citation"),
    isFrequencyViolator: boolean("is_frequency_violator").default(false),
    associatedSatellites: text("associated_satellites"),
    added: timestamp("added").defaultNow().notNull(),
    updated: timestamp("updated").defaultNow(),
  },
  (table) => ({
    nameIdx: index("gs_satellites_name_idx").on(table.name),
    statusIdx: index("gs_satellites_status_idx").on(table.status),
  })
)

// =============================================================================
// TRANSMITTERS
// =============================================================================

export const gsTransmitters = pgTable(
  "gs_transmitters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    description: text("description"),
    alive: boolean("alive").default(true),
    type: varchar("type", { length: 50 }),
    uplinkLow: real("uplink_low"),
    uplinkHigh: real("uplink_high"),
    uplinkDrift: real("uplink_drift"),
    downlinkLow: real("downlink_low"),
    downlinkHigh: real("downlink_high"),
    downlinkDrift: real("downlink_drift"),
    mode: varchar("mode", { length: 50 }),
    modeId: integer("mode_id"),
    uplinkMode: varchar("uplink_mode", { length: 50 }),
    invert: boolean("invert").default(false),
    baud: integer("baud"),
    satId: varchar("sat_id", { length: 50 }),
    noradCatId: integer("norad_cat_id").notNull().references(() => gsSatellites.noradId),
    noradFollowId: integer("norad_follow_id"),
    status: varchar("status", { length: 50 }).notNull().default("active"),
    citation: text("citation"),
    service: varchar("service", { length: 100 }),
    source: varchar("source", { length: 100 }),
    iauruCoordination: varchar("iauru_coordination", { length: 255 }),
    iauruCoordinationUrl: text("iauru_coordination_url"),
    ituNotification: jsonb("itu_notification"),
    frequencyViolation: boolean("frequency_violation").default(false),
    unconfirmed: boolean("unconfirmed").default(false),
    added: timestamp("added").defaultNow(),
    updated: timestamp("updated").defaultNow(),
  },
  (table) => ({
    noradIdx: index("gs_transmitters_norad_idx").on(table.noradCatId),
  })
)

// =============================================================================
// GROUPS
// =============================================================================

export const gsGroups = pgTable("gs_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  identifier: varchar("identifier", { length: 255 }),
  type: varchar("type", { length: 20 }).notNull().default("user"),
  added: timestamp("added").defaultNow().notNull(),
  updated: timestamp("updated").defaultNow(),
})

export const gsGroupSatellites = pgTable(
  "gs_group_satellites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id").notNull().references(() => gsGroups.id),
    noradId: integer("norad_id").notNull().references(() => gsSatellites.noradId),
  },
  (table) => ({
    groupIdx: index("gs_group_satellites_group_idx").on(table.groupId),
    noradIdx: index("gs_group_satellites_norad_idx").on(table.noradId),
  })
)

// =============================================================================
// LOCATIONS
// =============================================================================

export const gsLocations = pgTable("gs_locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  lat: real("lat").notNull(),
  lon: real("lon").notNull(),
  alt: real("alt").notNull().default(0),
  isActive: boolean("is_active").default(false),
  added: timestamp("added").defaultNow().notNull(),
  updated: timestamp("updated").defaultNow(),
})

// =============================================================================
// HARDWARE - SDRs
// =============================================================================

export const gsSDRs = pgTable("gs_sdrs", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  serial: varchar("serial", { length: 255 }),
  host: varchar("host", { length: 255 }),
  port: integer("port"),
  type: varchar("type", { length: 50 }),
  driver: varchar("driver", { length: 100 }),
  frequencyMin: real("frequency_min"),
  frequencyMax: real("frequency_max"),
  added: timestamp("added").defaultNow().notNull(),
  updated: timestamp("updated").defaultNow(),
})

// =============================================================================
// HARDWARE - ROTATORS
// =============================================================================

export const gsRotators = pgTable("gs_rotators", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  host: varchar("host", { length: 255 }).notNull(),
  port: integer("port").notNull(),
  minaz: real("minaz").notNull().default(0),
  maxaz: real("maxaz").notNull().default(360),
  minel: real("minel").notNull().default(0),
  maxel: real("maxel").notNull().default(90),
  aztolerance: real("aztolerance").notNull().default(1),
  eltolerance: real("eltolerance").notNull().default(1),
  added: timestamp("added").defaultNow().notNull(),
  updated: timestamp("updated").defaultNow(),
})

// =============================================================================
// HARDWARE - RIGS
// =============================================================================

export const gsRigs = pgTable("gs_rigs", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  host: varchar("host", { length: 255 }).notNull(),
  port: integer("port").notNull(),
  radiotype: varchar("radiotype", { length: 100 }).notNull(),
  radioMode: varchar("radio_mode", { length: 50 }).notNull().default("FM"),
  vfotype: integer("vfotype").notNull().default(0),
  txControlMode: varchar("tx_control_mode", { length: 50 }).notNull().default("none"),
  retuneIntervalMs: integer("retune_interval_ms").notNull().default(1000),
  followDownlinkTuning: boolean("follow_downlink_tuning").default(true),
  added: timestamp("added").defaultNow().notNull(),
  updated: timestamp("updated").defaultNow(),
})

// =============================================================================
// HARDWARE - CAMERAS
// =============================================================================

export const gsCameras = pgTable("gs_cameras", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url"),
  type: varchar("type", { length: 20 }).notNull().default("mjpeg"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  added: timestamp("added").defaultNow().notNull(),
  updated: timestamp("updated").defaultNow(),
})

// =============================================================================
// OBSERVATIONS
// =============================================================================

export const gsObservations = pgTable(
  "gs_observations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    enabled: boolean("enabled").default(true),
    status: varchar("status", { length: 20 }).notNull().default("scheduled"),
    noradId: integer("norad_id").notNull().references(() => gsSatellites.noradId),
    eventStart: timestamp("event_start").notNull(),
    eventEnd: timestamp("event_end").notNull(),
    taskStart: timestamp("task_start"),
    taskEnd: timestamp("task_end"),
    sdrId: uuid("sdr_id"),
    rotatorId: uuid("rotator_id"),
    rigId: uuid("rig_id"),
    satelliteConfig: jsonb("satellite_config").default({}),
    passConfig: jsonb("pass_config").default({}),
    hardwareConfig: jsonb("hardware_config").default({}),
    sessions: jsonb("sessions").default([]),
    monitoredSatelliteId: uuid("monitored_satellite_id"),
    generatedAt: timestamp("generated_at"),
    errorMessage: text("error_message"),
    errorCount: integer("error_count").default(0),
    lastErrorTime: timestamp("last_error_time"),
    actualStartTime: timestamp("actual_start_time"),
    actualEndTime: timestamp("actual_end_time"),
    executionLog: jsonb("execution_log").default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    statusIdx: index("gs_observations_status_idx").on(table.status),
    noradIdx: index("gs_observations_norad_idx").on(table.noradId),
    eventStartIdx: index("gs_observations_event_start_idx").on(table.eventStart),
  })
)

// =============================================================================
// MONITORED SATELLITES (auto-scheduling)
// =============================================================================

export const gsMonitoredSatellites = pgTable("gs_monitored_satellites", {
  id: uuid("id").defaultRandom().primaryKey(),
  enabled: boolean("enabled").default(true),
  noradId: integer("norad_id").notNull().references(() => gsSatellites.noradId),
  sdrId: uuid("sdr_id"),
  rotatorId: uuid("rotator_id"),
  rigId: uuid("rig_id"),
  satelliteConfig: jsonb("satellite_config").default({}),
  hardwareConfig: jsonb("hardware_config").default({}),
  generationConfig: jsonb("generation_config").default({}),
  sessions: jsonb("sessions").default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// =============================================================================
// TRACKING STATE (singleton row)
// =============================================================================

export const gsTrackingState = pgTable("gs_tracking_state", {
  id: varchar("id", { length: 20 }).primaryKey().default("current"),
  noradId: integer("norad_id"),
  groupId: uuid("group_id"),
  rotatorState: varchar("rotator_state", { length: 20 }).notNull().default("idle"),
  rigState: varchar("rig_state", { length: 20 }).notNull().default("idle"),
  rigId: uuid("rig_id"),
  rotatorId: uuid("rotator_id"),
  transmitterId: uuid("transmitter_id"),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// =============================================================================
// PREFERENCES
// =============================================================================

export const gsPreferences = pgTable("gs_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  value: text("value").notNull(),
  added: timestamp("added").defaultNow().notNull(),
  updated: timestamp("updated").defaultNow(),
})

// =============================================================================
// TLE SOURCES
// =============================================================================

export const gsTleSources = pgTable("gs_tle_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  url: text("url").notNull(),
  format: varchar("format", { length: 50 }).notNull().default("tle"),
  added: timestamp("added").defaultNow().notNull(),
  updated: timestamp("updated").defaultNow(),
})

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type GSSatelliteRow = typeof gsSatellites.$inferSelect
export type GSTransmitterRow = typeof gsTransmitters.$inferSelect
export type GSGroupRow = typeof gsGroups.$inferSelect
export type GSLocationRow = typeof gsLocations.$inferSelect
export type GSSDRRow = typeof gsSDRs.$inferSelect
export type GSRotatorRow = typeof gsRotators.$inferSelect
export type GSRigRow = typeof gsRigs.$inferSelect
export type GSCameraRow = typeof gsCameras.$inferSelect
export type GSObservationRow = typeof gsObservations.$inferSelect
export type GSMonitoredSatelliteRow = typeof gsMonitoredSatellites.$inferSelect
export type GSPreferenceRow = typeof gsPreferences.$inferSelect
export type GSTLESourceRow = typeof gsTleSources.$inferSelect
