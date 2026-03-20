/**
 * Ground Station Scheduler API
 *
 * Monitored satellites configuration for automatic observation generation.
 */

import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { gsDb, schema } from "@/lib/ground-station/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const rows = await gsDb
      .select({
        monitored: schema.gsMonitoredSatellites,
        satName: schema.gsSatellites.name,
      })
      .from(schema.gsMonitoredSatellites)
      .leftJoin(
        schema.gsSatellites,
        eq(schema.gsMonitoredSatellites.noradId, schema.gsSatellites.noradId)
      )

    return NextResponse.json(
      rows.map(({ monitored, satName }) => ({
        id: monitored.id,
        enabled: monitored.enabled,
        norad_id: monitored.noradId,
        satellite_name: satName || `SAT-${monitored.noradId}`,
        sdr_id: monitored.sdrId,
        rotator_id: monitored.rotatorId,
        rig_id: monitored.rigId,
        satellite_config: monitored.satelliteConfig,
        hardware_config: monitored.hardwareConfig,
        generation_config: monitored.generationConfig,
        sessions: monitored.sessions,
        created_at: monitored.createdAt?.toISOString(),
        updated_at: monitored.updatedAt?.toISOString(),
      }))
    )
  } catch (error) {
    console.error("Ground Station scheduler error:", error)
    return NextResponse.json(
      { error: "Ground Station scheduler error", details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const [monitored] = await gsDb
      .insert(schema.gsMonitoredSatellites)
      .values({
        noradId: body.norad_id,
        enabled: body.enabled ?? true,
        sdrId: body.sdr_id,
        rotatorId: body.rotator_id,
        rigId: body.rig_id,
        satelliteConfig: body.satellite_config || {},
        hardwareConfig: body.hardware_config || {},
        generationConfig: body.generation_config || {},
        sessions: body.sessions || [],
      })
      .returning()

    return NextResponse.json({
      id: monitored.id,
      enabled: monitored.enabled,
      norad_id: monitored.noradId,
      created_at: monitored.createdAt?.toISOString(),
      updated_at: monitored.updatedAt?.toISOString(),
    })
  } catch (error) {
    console.error("Ground Station scheduler create error:", error)
    return NextResponse.json(
      { error: "Ground Station scheduler update failed", details: String(error) },
      { status: 500 }
    )
  }
}
