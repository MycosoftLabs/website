/**
 * Ground Station Observations API
 *
 * CRUD for scheduled satellite observations.
 */

import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { gsDb, schema } from "@/lib/ground-station/db"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const status = params.get("status")
  const noradId = params.get("norad_id")

  try {
    let query = gsDb.select({
      obs: schema.gsObservations,
      satName: schema.gsSatellites.name,
    })
    .from(schema.gsObservations)
    .leftJoin(
      schema.gsSatellites,
      eq(schema.gsObservations.noradId, schema.gsSatellites.noradId)
    )

    const conditions = []
    if (status) conditions.push(eq(schema.gsObservations.status, status))
    if (noradId) conditions.push(eq(schema.gsObservations.noradId, parseInt(noradId)))

    const rows = conditions.length > 0
      ? await query.where(and(...conditions))
      : await query

    return NextResponse.json(
      rows.map(({ obs, satName }) => formatObservation(obs, satName))
    )
  } catch (error) {
    console.error("Ground Station observations error:", error)
    return NextResponse.json(
      { error: "Ground Station observations error", details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const id = params.get("id")
  const action = params.get("action")

  try {
    if (action === "cancel" && id) {
      const [obs] = await gsDb
        .update(schema.gsObservations)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(schema.gsObservations.id, id))
        .returning()

      if (!obs) return NextResponse.json({ error: "Observation not found" }, { status: 404 })
      return NextResponse.json(formatObservation(obs))
    }

    const body = await request.json()
    const [obs] = await gsDb
      .insert(schema.gsObservations)
      .values({
        name: body.name || `Observation ${body.norad_id}`,
        noradId: body.norad_id,
        eventStart: new Date(body.event_start),
        eventEnd: new Date(body.event_end),
        sdrId: body.sdr_id,
        rotatorId: body.rotator_id,
        rigId: body.rig_id,
        satelliteConfig: body.satellite_config || {},
        passConfig: body.pass_config || {},
        hardwareConfig: body.hardware_config || {},
        sessions: body.sessions || [],
      })
      .returning()

    return NextResponse.json(formatObservation(obs))
  } catch (error) {
    console.error("Ground Station observation create error:", error)
    return NextResponse.json(
      { error: "Ground Station observation create/update failed", details: String(error) },
      { status: 500 }
    )
  }
}

function formatObservation(
  obs: typeof schema.gsObservations.$inferSelect,
  satName?: string | null
) {
  return {
    id: obs.id,
    name: obs.name,
    enabled: obs.enabled,
    status: obs.status,
    norad_id: obs.noradId,
    satellite_name: satName || obs.name,
    event_start: obs.eventStart?.toISOString(),
    event_end: obs.eventEnd?.toISOString(),
    task_start: obs.taskStart?.toISOString(),
    task_end: obs.taskEnd?.toISOString(),
    sdr_id: obs.sdrId,
    rotator_id: obs.rotatorId,
    rig_id: obs.rigId,
    satellite_config: obs.satelliteConfig,
    pass_config: obs.passConfig,
    hardware_config: obs.hardwareConfig,
    sessions: obs.sessions,
    monitored_satellite_id: obs.monitoredSatelliteId,
    generated_at: obs.generatedAt?.toISOString(),
    error_message: obs.errorMessage,
    error_count: obs.errorCount,
    last_error_time: obs.lastErrorTime?.toISOString(),
    actual_start_time: obs.actualStartTime?.toISOString(),
    actual_end_time: obs.actualEndTime?.toISOString(),
    execution_log: obs.executionLog,
    created_at: obs.createdAt?.toISOString(),
    updated_at: obs.updatedAt?.toISOString(),
  }
}
