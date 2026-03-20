/**
 * Ground Station Tracking API
 *
 * GET  - fetch current tracking state
 * POST - set tracking state (target satellite, rotator, rig)
 */

import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { gsDb, schema } from "@/lib/ground-station/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const [state] = await gsDb
      .select()
      .from(schema.gsTrackingState)
      .where(eq(schema.gsTrackingState.id, "current"))
      .limit(1)

    if (!state) {
      return NextResponse.json({
        norad_id: null,
        group_id: null,
        rotator_state: "idle",
        rig_state: "idle",
        rig_id: null,
        rotator_id: null,
        transmitter_id: null,
      })
    }

    return NextResponse.json({
      norad_id: state.noradId,
      group_id: state.groupId,
      rotator_state: state.rotatorState,
      rig_state: state.rigState,
      rig_id: state.rigId,
      rotator_id: state.rotatorId,
      transmitter_id: state.transmitterId,
    })
  } catch (error) {
    console.error("Ground Station tracking error:", error)
    return NextResponse.json(
      { error: "Ground Station tracking error", details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const values = {
      id: "current" as const,
      noradId: body.norad_id ?? null,
      groupId: body.group_id ?? null,
      rotatorState: body.rotator_state ?? (body.norad_id ? "tracking" : "idle"),
      rigState: body.rig_state ?? (body.norad_id ? "tracking" : "idle"),
      rigId: body.rig_id ?? null,
      rotatorId: body.rotator_id ?? null,
      transmitterId: body.transmitter_id ?? null,
      updatedAt: new Date(),
    }

    // Try update first, then insert if not exists
    const updated = await gsDb
      .update(schema.gsTrackingState)
      .set(values)
      .where(eq(schema.gsTrackingState.id, "current"))
      .returning()

    if (updated.length === 0) {
      await gsDb.insert(schema.gsTrackingState).values(values)
    }

    return NextResponse.json({
      norad_id: values.noradId,
      group_id: values.groupId,
      rotator_state: values.rotatorState,
      rig_state: values.rigState,
      rig_id: values.rigId,
      rotator_id: values.rotatorId,
      transmitter_id: values.transmitterId,
    })
  } catch (error) {
    console.error("Ground Station tracking update error:", error)
    return NextResponse.json(
      { error: "Ground Station tracking update failed", details: String(error) },
      { status: 500 }
    )
  }
}
