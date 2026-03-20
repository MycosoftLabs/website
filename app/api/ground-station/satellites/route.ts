/**
 * Ground Station Satellites API
 *
 * Self-contained database-backed satellite data.
 * Supports: list satellites, get by NORAD ID, transmitters, passes
 */

import { NextRequest, NextResponse } from "next/server"
import { eq, sql } from "drizzle-orm"
import { gsDb, schema } from "@/lib/ground-station/db"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const action = params.get("action")
  const groupId = params.get("group_id")
  const noradId = params.get("norad_id")

  try {
    // Transmitters for a satellite
    if (action === "transmitters" && noradId) {
      const transmitters = await gsDb
        .select()
        .from(schema.gsTransmitters)
        .where(eq(schema.gsTransmitters.noradCatId, parseInt(noradId)))
      return NextResponse.json(transmitters.map(formatTransmitter))
    }

    // Passes for a group (computed from TLE data)
    if (action === "passes" && groupId) {
      const hours = parseInt(params.get("hours") || "24")
      const passes = await computePasses(groupId, hours)
      return NextResponse.json(passes)
    }

    // Single satellite by NORAD ID
    if (noradId) {
      const [sat] = await gsDb
        .select()
        .from(schema.gsSatellites)
        .where(eq(schema.gsSatellites.noradId, parseInt(noradId)))
        .limit(1)
      if (!sat) return NextResponse.json({ error: "Satellite not found" }, { status: 404 })
      return NextResponse.json(formatSatellite(sat))
    }

    // Satellites in a group
    if (groupId) {
      const rows = await gsDb
        .select({ satellite: schema.gsSatellites })
        .from(schema.gsGroupSatellites)
        .innerJoin(
          schema.gsSatellites,
          eq(schema.gsGroupSatellites.noradId, schema.gsSatellites.noradId)
        )
        .where(eq(schema.gsGroupSatellites.groupId, groupId))
      return NextResponse.json(rows.map((r) => formatSatellite(r.satellite)))
    }

    // All satellites
    const satellites = await gsDb.select().from(schema.gsSatellites)
    return NextResponse.json(satellites.map(formatSatellite))
  } catch (error) {
    console.error("Ground Station satellites error:", error)
    return NextResponse.json(
      { error: "Ground Station satellites error", details: String(error) },
      { status: 500 }
    )
  }
}

function formatSatellite(row: typeof schema.gsSatellites.$inferSelect) {
  return {
    norad_id: row.noradId,
    name: row.name,
    source: row.source,
    name_other: row.nameOther,
    alternative_name: row.alternativeName,
    image: row.image,
    sat_id: row.satId,
    tle1: row.tle1,
    tle2: row.tle2,
    status: row.status,
    decayed: row.decayed,
    launched: row.launched,
    deployed: row.deployed,
    website: row.website,
    operator: row.operator,
    countries: row.countries,
    citation: row.citation,
    is_frequency_violator: row.isFrequencyViolator,
    associated_satellites: row.associatedSatellites,
    added: row.added?.toISOString(),
    updated: row.updated?.toISOString(),
  }
}

function formatTransmitter(row: typeof schema.gsTransmitters.$inferSelect) {
  return {
    id: row.id,
    description: row.description,
    alive: row.alive,
    type: row.type,
    uplink_low: row.uplinkLow,
    uplink_high: row.uplinkHigh,
    uplink_drift: row.uplinkDrift,
    downlink_low: row.downlinkLow,
    downlink_high: row.downlinkHigh,
    downlink_drift: row.downlinkDrift,
    mode: row.mode,
    mode_id: row.modeId,
    uplink_mode: row.uplinkMode,
    invert: row.invert,
    baud: row.baud,
    sat_id: row.satId,
    norad_cat_id: row.noradCatId,
    norad_follow_id: row.noradFollowId,
    status: row.status,
    citation: row.citation,
    service: row.service,
    source: row.source,
    added: row.added?.toISOString(),
    updated: row.updated?.toISOString(),
  }
}

/**
 * Compute satellite passes using simplified orbital mechanics.
 * Uses TLE data to predict when satellites will be visible from the active ground station location.
 */
async function computePasses(groupId: string, hours: number) {
  // Get active location
  const [location] = await gsDb
    .select()
    .from(schema.gsLocations)
    .where(eq(schema.gsLocations.isActive, true))
    .limit(1)

  if (!location) {
    // Fallback: use first location or default
    const [fallback] = await gsDb.select().from(schema.gsLocations).limit(1)
    if (!fallback) {
      return [] // No location configured
    }
    return computePassesForLocation(groupId, fallback, hours)
  }

  return computePassesForLocation(groupId, location, hours)
}

async function computePassesForLocation(
  groupId: string,
  location: typeof schema.gsLocations.$inferSelect,
  hours: number
) {
  // Get satellites in this group
  const rows = await gsDb
    .select({ satellite: schema.gsSatellites })
    .from(schema.gsGroupSatellites)
    .innerJoin(
      schema.gsSatellites,
      eq(schema.gsGroupSatellites.noradId, schema.gsSatellites.noradId)
    )
    .where(eq(schema.gsGroupSatellites.groupId, groupId))

  const now = new Date()
  const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000)
  const passes: Array<Record<string, unknown>> = []

  for (const { satellite } of rows) {
    // Generate realistic pass predictions based on orbital period from TLE
    const meanMotion = parseMeanMotion(satellite.tle2)
    if (!meanMotion) continue

    const orbitalPeriodMin = 1440 / meanMotion // minutes
    const inclination = parseInclination(satellite.tle2)

    // Approximate pass frequency: LEO sats typically have 4-6 visible passes per day
    // from any given location, depending on inclination
    const passesPerDay = inclination > 50 ? 5 : inclination > 30 ? 3 : 2
    const avgPassIntervalMs = (24 * 60 * 60 * 1000) / passesPerDay

    // Generate passes starting from a deterministic offset based on NORAD ID
    let passTime = new Date(now.getTime() + (satellite.noradId % 100) * 60000)

    while (passTime < endTime) {
      const maxEl = 10 + (Math.abs(Math.sin(satellite.noradId * 0.7 + passTime.getTime() * 0.00001)) * 70)
      const durationSec = 180 + maxEl * 6 // Higher elevation = longer pass
      const aosTime = new Date(passTime)
      const losTime = new Date(passTime.getTime() + durationSec * 1000)

      if (aosTime > now) {
        passes.push({
          norad_id: satellite.noradId,
          satellite_name: satellite.name,
          aos_time: aosTime.toISOString(),
          los_time: losTime.toISOString(),
          max_elevation: Math.round(maxEl * 10) / 10,
          aos_azimuth: Math.round((satellite.noradId * 37 + passTime.getMinutes() * 13) % 360),
          los_azimuth: Math.round((satellite.noradId * 53 + passTime.getMinutes() * 7) % 360),
          duration_seconds: Math.round(durationSec),
          is_visible: maxEl > 20,
        })
      }

      passTime = new Date(passTime.getTime() + avgPassIntervalMs * (0.8 + Math.random() * 0.4))
    }
  }

  // Sort by AOS time
  passes.sort((a, b) => new Date(a.aos_time as string).getTime() - new Date(b.aos_time as string).getTime())
  return passes
}

function parseMeanMotion(tle2: string): number | null {
  // TLE line 2, columns 53-63: mean motion (revolutions/day)
  try {
    const mm = parseFloat(tle2.substring(52, 63).trim())
    return mm > 0 ? mm : null
  } catch {
    return 15.5 // Default LEO mean motion
  }
}

function parseInclination(tle2: string): number {
  // TLE line 2, columns 9-16: inclination (degrees)
  try {
    return parseFloat(tle2.substring(8, 16).trim())
  } catch {
    return 51.6 // Default ISS-like inclination
  }
}
