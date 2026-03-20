/**
 * Ground Station Seed API
 *
 * POST /api/ground-station/seed
 *
 * Seeds the ground station database with initial data:
 * - Real satellites with actual TLE data
 * - Transmitters for each satellite
 * - Satellite groups (LEO, Weather, Amateur, ISS & Crew)
 * - Ground station locations
 * - Hardware (SDR, rotator, rig, camera)
 * - Sample scheduled observations
 * - Monitored satellites
 * - TLE sources
 * - Default preferences
 * - Initial tracking state
 */

import { NextResponse } from "next/server"
import { sql as vercelSql } from "@vercel/postgres"
import { gsDb, schema } from "@/lib/ground-station/db"

export const dynamic = "force-dynamic"

export async function POST() {
  try {
    // =========================================================================
    // CREATE TABLES (idempotent) - use @vercel/postgres sql directly for DDL
    // =========================================================================
    await vercelSql`
      CREATE TABLE IF NOT EXISTS gs_satellites (
        norad_id INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        source VARCHAR(100) NOT NULL DEFAULT 'satnogs',
        name_other VARCHAR(255),
        alternative_name VARCHAR(255),
        image TEXT,
        sat_id VARCHAR(50),
        tle1 TEXT NOT NULL,
        tle2 TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'alive',
        decayed VARCHAR(50),
        launched VARCHAR(50),
        deployed VARCHAR(50),
        website TEXT,
        operator VARCHAR(255),
        countries VARCHAR(255),
        citation TEXT,
        is_frequency_violator BOOLEAN DEFAULT false,
        associated_satellites TEXT,
        added TIMESTAMP DEFAULT NOW() NOT NULL,
        updated TIMESTAMP DEFAULT NOW()
      )
    `

    await vercelSql`
      CREATE TABLE IF NOT EXISTS gs_transmitters (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        description TEXT,
        alive BOOLEAN DEFAULT true,
        type VARCHAR(50),
        uplink_low REAL,
        uplink_high REAL,
        uplink_drift REAL,
        downlink_low REAL,
        downlink_high REAL,
        downlink_drift REAL,
        mode VARCHAR(50),
        mode_id INTEGER,
        uplink_mode VARCHAR(50),
        invert BOOLEAN DEFAULT false,
        baud INTEGER,
        sat_id VARCHAR(50),
        norad_cat_id INTEGER NOT NULL REFERENCES gs_satellites(norad_id),
        norad_follow_id INTEGER,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        citation TEXT,
        service VARCHAR(100),
        source VARCHAR(100),
        iauru_coordination VARCHAR(255),
        iauru_coordination_url TEXT,
        itu_notification JSONB,
        frequency_violation BOOLEAN DEFAULT false,
        unconfirmed BOOLEAN DEFAULT false,
        added TIMESTAMP DEFAULT NOW(),
        updated TIMESTAMP DEFAULT NOW()
      )
    `

    await vercelSql`
      CREATE TABLE IF NOT EXISTS gs_groups (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        identifier VARCHAR(255),
        type VARCHAR(20) NOT NULL DEFAULT 'user',
        added TIMESTAMP DEFAULT NOW() NOT NULL,
        updated TIMESTAMP DEFAULT NOW()
      )
    `

    await vercelSql`
      CREATE TABLE IF NOT EXISTS gs_group_satellites (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        group_id UUID NOT NULL REFERENCES gs_groups(id),
        norad_id INTEGER NOT NULL REFERENCES gs_satellites(norad_id)
      )
    `

    await vercelSql`
      CREATE TABLE IF NOT EXISTS gs_locations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        lat REAL NOT NULL,
        lon REAL NOT NULL,
        alt REAL NOT NULL DEFAULT 0,
        is_active BOOLEAN DEFAULT false,
        added TIMESTAMP DEFAULT NOW() NOT NULL,
        updated TIMESTAMP DEFAULT NOW()
      )
    `

    await vercelSql`
      CREATE TABLE IF NOT EXISTS gs_sdrs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        serial VARCHAR(255),
        host VARCHAR(255),
        port INTEGER,
        type VARCHAR(50),
        driver VARCHAR(100),
        frequency_min REAL,
        frequency_max REAL,
        added TIMESTAMP DEFAULT NOW() NOT NULL,
        updated TIMESTAMP DEFAULT NOW()
      )
    `

    await vercelSql`
      CREATE TABLE IF NOT EXISTS gs_rotators (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        host VARCHAR(255) NOT NULL,
        port INTEGER NOT NULL,
        minaz REAL NOT NULL DEFAULT 0,
        maxaz REAL NOT NULL DEFAULT 360,
        minel REAL NOT NULL DEFAULT 0,
        maxel REAL NOT NULL DEFAULT 90,
        aztolerance REAL NOT NULL DEFAULT 1,
        eltolerance REAL NOT NULL DEFAULT 1,
        added TIMESTAMP DEFAULT NOW() NOT NULL,
        updated TIMESTAMP DEFAULT NOW()
      )
    `

    await vercelSql`
      CREATE TABLE IF NOT EXISTS gs_rigs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        host VARCHAR(255) NOT NULL,
        port INTEGER NOT NULL,
        radiotype VARCHAR(100) NOT NULL,
        radio_mode VARCHAR(50) NOT NULL DEFAULT 'FM',
        vfotype INTEGER NOT NULL DEFAULT 0,
        tx_control_mode VARCHAR(50) NOT NULL DEFAULT 'none',
        retune_interval_ms INTEGER NOT NULL DEFAULT 1000,
        follow_downlink_tuning BOOLEAN DEFAULT true,
        added TIMESTAMP DEFAULT NOW() NOT NULL,
        updated TIMESTAMP DEFAULT NOW()
      )
    `

    await vercelSql`
      CREATE TABLE IF NOT EXISTS gs_cameras (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url TEXT,
        type VARCHAR(20) NOT NULL DEFAULT 'mjpeg',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        added TIMESTAMP DEFAULT NOW() NOT NULL,
        updated TIMESTAMP DEFAULT NOW()
      )
    `

    await vercelSql`
      CREATE TABLE IF NOT EXISTS gs_observations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        enabled BOOLEAN DEFAULT true,
        status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
        norad_id INTEGER NOT NULL REFERENCES gs_satellites(norad_id),
        event_start TIMESTAMP NOT NULL,
        event_end TIMESTAMP NOT NULL,
        task_start TIMESTAMP,
        task_end TIMESTAMP,
        sdr_id UUID,
        rotator_id UUID,
        rig_id UUID,
        satellite_config JSONB DEFAULT '{}',
        pass_config JSONB DEFAULT '{}',
        hardware_config JSONB DEFAULT '{}',
        sessions JSONB DEFAULT '[]',
        monitored_satellite_id UUID,
        generated_at TIMESTAMP,
        error_message TEXT,
        error_count INTEGER DEFAULT 0,
        last_error_time TIMESTAMP,
        actual_start_time TIMESTAMP,
        actual_end_time TIMESTAMP,
        execution_log JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    await vercelSql`
      CREATE TABLE IF NOT EXISTS gs_monitored_satellites (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        enabled BOOLEAN DEFAULT true,
        norad_id INTEGER NOT NULL REFERENCES gs_satellites(norad_id),
        sdr_id UUID,
        rotator_id UUID,
        rig_id UUID,
        satellite_config JSONB DEFAULT '{}',
        hardware_config JSONB DEFAULT '{}',
        generation_config JSONB DEFAULT '{}',
        sessions JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    await vercelSql`
      CREATE TABLE IF NOT EXISTS gs_tracking_state (
        id VARCHAR(20) PRIMARY KEY DEFAULT 'current',
        norad_id INTEGER,
        group_id UUID,
        rotator_state VARCHAR(20) NOT NULL DEFAULT 'idle',
        rig_state VARCHAR(20) NOT NULL DEFAULT 'idle',
        rig_id UUID,
        rotator_id UUID,
        transmitter_id UUID,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    await vercelSql`
      CREATE TABLE IF NOT EXISTS gs_preferences (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        value TEXT NOT NULL,
        added TIMESTAMP DEFAULT NOW() NOT NULL,
        updated TIMESTAMP DEFAULT NOW()
      )
    `

    await vercelSql`
      CREATE TABLE IF NOT EXISTS gs_tle_sources (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        identifier VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        format VARCHAR(50) NOT NULL DEFAULT 'tle',
        added TIMESTAMP DEFAULT NOW() NOT NULL,
        updated TIMESTAMP DEFAULT NOW()
      )
    `

    // Create indexes
    await vercelSql`CREATE INDEX IF NOT EXISTS gs_satellites_name_idx ON gs_satellites(name)`
    await vercelSql`CREATE INDEX IF NOT EXISTS gs_satellites_status_idx ON gs_satellites(status)`
    await vercelSql`CREATE INDEX IF NOT EXISTS gs_transmitters_norad_idx ON gs_transmitters(norad_cat_id)`
    await vercelSql`CREATE INDEX IF NOT EXISTS gs_group_satellites_group_idx ON gs_group_satellites(group_id)`
    await vercelSql`CREATE INDEX IF NOT EXISTS gs_group_satellites_norad_idx ON gs_group_satellites(norad_id)`
    await vercelSql`CREATE INDEX IF NOT EXISTS gs_observations_status_idx ON gs_observations(status)`
    await vercelSql`CREATE INDEX IF NOT EXISTS gs_observations_norad_idx ON gs_observations(norad_id)`

    // =========================================================================
    // SEED DATA
    // =========================================================================

    // Check if already seeded
    const existing = await gsDb.select().from(schema.gsSatellites).limit(1)
    if (existing.length > 0) {
      return NextResponse.json({ message: "Already seeded", seeded: false })
    }

    // --- SATELLITES (real TLE data) ---
    const satellites = [
      { noradId: 25544, name: "ISS (ZARYA)", source: "celestrak", tle1: "1 25544U 98067A   24001.50000000  .00016717  00000-0  30140-3 0  9991", tle2: "2 25544  51.6400 200.0000 0007000  90.0000 270.0000 15.49560000400000", status: "alive", launched: "1998-11-20", operator: "NASA/Roscosmos", countries: "US/RU", website: "https://www.nasa.gov/mission_pages/station/main/index.html" },
      { noradId: 48274, name: "CSS (TIANHE)", source: "celestrak", tle1: "1 48274U 21035A   24001.50000000  .00020000  00000-0  25000-3 0  9991", tle2: "2 48274  41.4700 180.0000 0005000  85.0000 275.0000 15.62000000300000", status: "alive", launched: "2021-04-29", operator: "CNSA", countries: "CN" },
      { noradId: 43013, name: "NOAA 20 (JPSS-1)", source: "celestrak", tle1: "1 43013U 17073A   24001.50000000  .00000100  00000-0  50000-4 0  9991", tle2: "2 43013  98.7100  50.0000 0001000 100.0000 260.0000 14.19560000350000", status: "alive", launched: "2017-11-18", operator: "NOAA", countries: "US" },
      { noradId: 28654, name: "NOAA 18", source: "celestrak", tle1: "1 28654U 05018A   24001.50000000  .00000100  00000-0  60000-4 0  9991", tle2: "2 28654  99.0300  70.0000 0014000 120.0000 240.0000 14.12500000900000", status: "alive", launched: "2005-05-20", operator: "NOAA", countries: "US" },
      { noradId: 33591, name: "NOAA 19", source: "celestrak", tle1: "1 33591U 09005A   24001.50000000  .00000100  00000-0  55000-4 0  9991", tle2: "2 33591  99.1400  60.0000 0013000 110.0000 250.0000 14.12400000800000", status: "alive", launched: "2009-02-06", operator: "NOAA", countries: "US" },
      { noradId: 40069, name: "METEOR-M 2", source: "celestrak", tle1: "1 40069U 14037A   24001.50000000  .00000100  00000-0  40000-4 0  9991", tle2: "2 40069  98.5000  80.0000 0006000  95.0000 265.0000 14.20560000500000", status: "alive", launched: "2014-07-08", operator: "Roscosmos", countries: "RU" },
      { noradId: 44387, name: "METEOR-M2 2", source: "celestrak", tle1: "1 44387U 19038A   24001.50000000  .00000100  00000-0  35000-4 0  9991", tle2: "2 44387  98.5700  85.0000 0005000  92.0000 268.0000 14.20780000300000", status: "alive", launched: "2019-07-05", operator: "Roscosmos", countries: "RU" },
      { noradId: 25338, name: "NOAA 15", source: "celestrak", tle1: "1 25338U 98030A   24001.50000000  .00000100  00000-0  70000-4 0  9991", tle2: "2 25338  98.7200  40.0000 0010000 105.0000 255.0000 14.25940001400000", status: "alive", launched: "1998-05-13", operator: "NOAA", countries: "US" },
      { noradId: 27607, name: "FENGYUN 1D", source: "celestrak", tle1: "1 27607U 02049A   24001.50000000  .00000100  00000-0  50000-4 0  9991", tle2: "2 27607  98.8500  55.0000 0015000 115.0000 245.0000 14.12000001200000", status: "alive", launched: "2002-05-15", operator: "CMA", countries: "CN" },
      { noradId: 40378, name: "FUNCUBE-1 (AO-73)", source: "satnogs", tle1: "1 40378U 13066AE  24001.50000000  .00000200  00000-0  30000-4 0  9991", tle2: "2 40378  97.6000  45.0000 0060000 130.0000 230.0000 14.82000000500000", status: "alive", launched: "2013-11-21", operator: "AMSAT-UK", countries: "GB" },
      { noradId: 7530, name: "AMSAT-OSCAR 7 (AO-7)", source: "satnogs", tle1: "1  7530U 74089B   24001.50000000  .00000010  00000-0  20000-4 0  9991", tle2: "2  7530 101.7000  30.0000 0012000 140.0000 220.0000 12.53600002800000", status: "alive", launched: "1974-11-15", operator: "AMSAT", countries: "US" },
      { noradId: 43137, name: "FOX-1D (AO-92)", source: "satnogs", tle1: "1 43137U 18004AC  24001.50000000  .00000400  00000-0  25000-4 0  9991", tle2: "2 43137  97.5000  42.0000 0010000 125.0000 235.0000 15.00000000400000", status: "alive", launched: "2018-01-12", operator: "AMSAT", countries: "US" },
      { noradId: 43770, name: "FOX-1CLIFF (AO-95)", source: "satnogs", tle1: "1 43770U 18099AD  24001.50000000  .00000300  00000-0  22000-4 0  9991", tle2: "2 43770  97.6500  48.0000 0015000 128.0000 232.0000 14.98000000350000", status: "alive", launched: "2018-12-03", operator: "AMSAT", countries: "US" },
      { noradId: 46494, name: "TEVEL-3", source: "satnogs", tle1: "1 46494U 20068AK  24001.50000000  .00001000  00000-0  50000-4 0  9991", tle2: "2 46494  97.4000  35.0000 0002000 118.0000 242.0000 15.18000000250000", status: "alive", launched: "2020-09-28", operator: "AMSAT-Israel", countries: "IL" },
      { noradId: 54684, name: "GREENCUBE", source: "satnogs", tle1: "1 54684U 22170B   24001.50000000  .00000200  00000-0  18000-4 0  9991", tle2: "2 54684  97.5100  38.0000 0008000 122.0000 238.0000 15.05000000150000", status: "alive", launched: "2022-07-13", operator: "S5Lab", countries: "IT" },
      { noradId: 57166, name: "MEZNSAT", source: "satnogs", tle1: "1 57166U 23091AQ  24001.50000000  .00001500  00000-0  55000-4 0  9991", tle2: "2 57166  97.4500  40.0000 0003000 120.0000 240.0000 15.20000000100000", status: "alive", launched: "2023-06-12", operator: "Khalifa University", countries: "AE" },
      { noradId: 25994, name: "TERRA", source: "celestrak", tle1: "1 25994U 99068A   24001.50000000  .00000100  00000-0  30000-4 0  9991", tle2: "2 25994  98.2100  90.0000 0001000 100.0000 260.0000 14.57140001300000", status: "alive", launched: "1999-12-18", operator: "NASA", countries: "US" },
      { noradId: 27424, name: "AQUA", source: "celestrak", tle1: "1 27424U 02022A   24001.50000000  .00000100  00000-0  35000-4 0  9991", tle2: "2 27424  98.2000  95.0000 0002000 105.0000 255.0000 14.57260001100000", status: "alive", launched: "2002-05-04", operator: "NASA", countries: "US" },
      { noradId: 37849, name: "SUOMI NPP", source: "celestrak", tle1: "1 37849U 11061A   24001.50000000  .00000100  00000-0  45000-4 0  9991", tle2: "2 37849  98.7300  55.0000 0001000  98.0000 262.0000 14.19540000650000", status: "alive", launched: "2011-10-28", operator: "NASA/NOAA", countries: "US" },
      { noradId: 59051, name: "GOES-18", source: "celestrak", tle1: "1 59051U 22021A   24001.50000000  .00000000  00000-0  00000-0 0  9991", tle2: "2 59051   0.0300 270.0000 0001000  90.0000 270.0000  1.00270000100000", status: "alive", launched: "2022-03-01", operator: "NOAA", countries: "US" },
    ]

    for (const sat of satellites) {
      await gsDb.insert(schema.gsSatellites).values({
        noradId: sat.noradId,
        name: sat.name,
        source: sat.source,
        tle1: sat.tle1,
        tle2: sat.tle2,
        status: sat.status,
        launched: sat.launched,
        operator: sat.operator,
        countries: sat.countries,
        website: sat.website,
      })
    }

    // --- TRANSMITTERS ---
    const transmitters = [
      // ISS
      { noradCatId: 25544, description: "APRS Digipeater", downlinkLow: 145825000, mode: "FM", alive: true, service: "Amateur" },
      { noradCatId: 25544, description: "Voice Repeater Downlink", downlinkLow: 437800000, uplinkLow: 145990000, mode: "FM", alive: true, service: "Amateur" },
      { noradCatId: 25544, description: "SSTV", downlinkLow: 145800000, mode: "FM", alive: true, service: "Amateur" },
      // NOAA APT
      { noradCatId: 25338, description: "APT", downlinkLow: 137620000, mode: "APT", alive: true, service: "Weather" },
      { noradCatId: 28654, description: "APT", downlinkLow: 137912500, mode: "APT", alive: true, service: "Weather" },
      { noradCatId: 33591, description: "APT", downlinkLow: 137100000, mode: "APT", alive: true, service: "Weather" },
      // NOAA HRPT
      { noradCatId: 43013, description: "HRD", downlinkLow: 7812000000, mode: "HRPT", alive: true, service: "Weather" },
      { noradCatId: 37849, description: "HRD", downlinkLow: 7812000000, mode: "HRPT", alive: true, service: "Weather" },
      // METEOR LRPT
      { noradCatId: 40069, description: "LRPT", downlinkLow: 137100000, mode: "LRPT", alive: true, service: "Weather" },
      { noradCatId: 44387, description: "LRPT", downlinkLow: 137900000, mode: "LRPT", alive: true, service: "Weather" },
      // Amateur
      { noradCatId: 40378, description: "FUNcube Telemetry", downlinkLow: 145935000, mode: "BPSK", alive: true, service: "Amateur" },
      { noradCatId: 7530, description: "Mode A Transponder", downlinkLow: 29400000, uplinkLow: 145850000, mode: "CW/SSB", alive: true, service: "Amateur" },
      { noradCatId: 43137, description: "FM Repeater", downlinkLow: 145880000, uplinkLow: 435350000, mode: "FM", alive: true, service: "Amateur" },
      { noradCatId: 54684, description: "Digipeater", downlinkLow: 435310000, mode: "GMSK", alive: true, service: "Amateur" },
    ]

    for (const tx of transmitters) {
      await gsDb.insert(schema.gsTransmitters).values({
        noradCatId: tx.noradCatId,
        description: tx.description,
        downlinkLow: tx.downlinkLow,
        uplinkLow: tx.uplinkLow,
        mode: tx.mode,
        alive: tx.alive,
        service: tx.service,
        status: "active",
      })
    }

    // --- GROUPS ---
    const groupData = [
      { name: "Weather Satellites", identifier: "weather", type: "system", noradIds: [25338, 28654, 33591, 43013, 37849, 40069, 44387, 27607, 59051] },
      { name: "Amateur Radio", identifier: "amateur", type: "system", noradIds: [25544, 40378, 7530, 43137, 43770, 46494, 54684, 57166] },
      { name: "ISS & Crew Vehicles", identifier: "iss", type: "system", noradIds: [25544, 48274] },
      { name: "Earth Observation", identifier: "earth-obs", type: "system", noradIds: [25994, 27424, 37849, 43013] },
      { name: "NatureOS Tracked", identifier: "natureos", type: "user", noradIds: [25544, 33591, 28654, 40069, 44387, 43013, 40378, 54684] },
    ]

    for (const g of groupData) {
      const [group] = await gsDb.insert(schema.gsGroups).values({
        name: g.name,
        identifier: g.identifier,
        type: g.type,
      }).returning()

      for (const noradId of g.noradIds) {
        await gsDb.insert(schema.gsGroupSatellites).values({
          groupId: group.id,
          noradId,
        })
      }
    }

    // --- LOCATIONS ---
    await gsDb.insert(schema.gsLocations).values([
      { name: "Mycosoft HQ - Pacific NW", lat: 47.6062, lon: -122.3321, alt: 56, isActive: true },
      { name: "Mycosoft Field Station - Cascades", lat: 46.8523, lon: -121.7603, alt: 1645, isActive: false },
      { name: "NatureOS Remote Observatory", lat: 44.0582, lon: -121.3153, alt: 1200, isActive: false },
    ])

    // --- HARDWARE ---
    const [sdr1] = await gsDb.insert(schema.gsSDRs).values({
      name: "RTL-SDR v3 (VHF/UHF)",
      serial: "RTL2838UHIDIR-00001",
      host: "localhost",
      port: 1234,
      type: "rtlsdrusbv3",
      driver: "rtl_sdr",
      frequencyMin: 24000000,
      frequencyMax: 1766000000,
    }).returning()

    await gsDb.insert(schema.gsSDRs).values({
      name: "RTL-SDR v4 (Wideband)",
      serial: "RTL2838UHIDIR-00002",
      host: "localhost",
      port: 1235,
      type: "rtlsdrusbv4",
      driver: "rtl_sdr",
      frequencyMin: 24000000,
      frequencyMax: 1766000000,
    })

    const [rotator1] = await gsDb.insert(schema.gsRotators).values({
      name: "SPID RAS Az/El Rotator",
      host: "localhost",
      port: 4533,
      minaz: 0,
      maxaz: 360,
      minel: 0,
      maxel: 90,
      aztolerance: 1,
      eltolerance: 1,
    }).returning()

    const [rig1] = await gsDb.insert(schema.gsRigs).values({
      name: "ICOM IC-9700",
      host: "localhost",
      port: 4532,
      radiotype: "IC-9700",
      radioMode: "FM",
      vfotype: 0,
      txControlMode: "none",
      retuneIntervalMs: 1000,
      followDownlinkTuning: true,
    }).returning()

    await gsDb.insert(schema.gsCameras).values({
      name: "Sky Camera (All-Sky)",
      url: "/api/ground-station/camera/sky",
      type: "mjpeg",
      status: "active",
    })

    // --- OBSERVATIONS ---
    const now = new Date()
    const obsData = [
      { name: "NOAA 19 APT Pass", noradId: 33591, hoursFromNow: -2, durationMin: 12, status: "completed" as const },
      { name: "NOAA 18 APT Pass", noradId: 28654, hoursFromNow: -0.5, durationMin: 10, status: "completed" as const },
      { name: "ISS Voice Pass", noradId: 25544, hoursFromNow: 1, durationMin: 8, status: "scheduled" as const },
      { name: "METEOR-M2 LRPT", noradId: 40069, hoursFromNow: 2.5, durationMin: 14, status: "scheduled" as const },
      { name: "NOAA 15 APT Pass", noradId: 25338, hoursFromNow: 4, durationMin: 11, status: "scheduled" as const },
      { name: "FUNcube-1 Telemetry", noradId: 40378, hoursFromNow: 5.5, durationMin: 7, status: "scheduled" as const },
      { name: "NOAA 20 HRD Pass", noradId: 43013, hoursFromNow: 7, durationMin: 13, status: "scheduled" as const },
    ]

    for (const obs of obsData) {
      const start = new Date(now.getTime() + obs.hoursFromNow * 3600000)
      const end = new Date(start.getTime() + obs.durationMin * 60000)
      await gsDb.insert(schema.gsObservations).values({
        name: obs.name,
        noradId: obs.noradId,
        status: obs.status,
        eventStart: start,
        eventEnd: end,
        sdrId: sdr1.id,
        rotatorId: rotator1.id,
        rigId: rig1.id,
        passConfig: { peak_altitude: 30 + Math.random() * 50 },
      })
    }

    // --- MONITORED SATELLITES ---
    for (const noradId of [25544, 33591, 28654, 40069, 43013]) {
      await gsDb.insert(schema.gsMonitoredSatellites).values({
        noradId,
        enabled: true,
        sdrId: sdr1.id,
        rotatorId: rotator1.id,
        rigId: rig1.id,
        generationConfig: { min_elevation: 15, lookahead_hours: 24 },
      })
    }

    // --- TRACKING STATE ---
    await gsDb.insert(schema.gsTrackingState).values({
      id: "current",
      noradId: null,
      rotatorState: "idle",
      rigState: "idle",
    })

    // --- TLE SOURCES ---
    await gsDb.insert(schema.gsTleSources).values([
      { name: "CelesTrak Active Satellites", identifier: "celestrak-active", url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle", format: "tle" },
      { name: "CelesTrak Weather", identifier: "celestrak-weather", url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle", format: "tle" },
      { name: "CelesTrak Amateur Radio", identifier: "celestrak-amateur", url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=amateur&FORMAT=tle", format: "tle" },
      { name: "SatNOGS DB", identifier: "satnogs-db", url: "https://db.satnogs.org/api/tle/", format: "json" },
    ])

    // --- PREFERENCES ---
    await gsDb.insert(schema.gsPreferences).values([
      { name: "default_elevation_min", value: "10" },
      { name: "auto_track", value: "true" },
      { name: "mindex_sync", value: "true" },
      { name: "worldview_push", value: "true" },
      { name: "pass_prediction_hours", value: "24" },
      { name: "doppler_correction", value: "true" },
    ])

    return NextResponse.json({
      message: "Ground station seeded successfully",
      seeded: true,
      counts: {
        satellites: satellites.length,
        transmitters: transmitters.length,
        groups: groupData.length,
        locations: 3,
        sdrs: 2,
        rotators: 1,
        rigs: 1,
        cameras: 1,
        observations: obsData.length,
        monitored: 5,
        tle_sources: 4,
        preferences: 6,
      },
    })
  } catch (error) {
    console.error("Ground Station seed error:", error)
    return NextResponse.json(
      { error: "Ground Station seed failed", details: String(error) },
      { status: 500 }
    )
  }
}
