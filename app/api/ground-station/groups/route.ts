/**
 * Ground Station Groups API
 *
 * CRUD for satellite groups with satellite count.
 */

import { NextRequest, NextResponse } from "next/server"
import { eq, sql } from "drizzle-orm"
import { gsDb, schema } from "@/lib/ground-station/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const groups = await gsDb.select().from(schema.gsGroups)

    // Get satellite counts per group
    const counts = await gsDb
      .select({
        groupId: schema.gsGroupSatellites.groupId,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(schema.gsGroupSatellites)
      .groupBy(schema.gsGroupSatellites.groupId)

    const countMap = new Map(counts.map((c) => [c.groupId, Number(c.count)]))

    return NextResponse.json(
      groups.map((g) => ({
        id: g.id,
        name: g.name,
        identifier: g.identifier,
        type: g.type,
        satellite_count: countMap.get(g.id) || 0,
        satellite_ids: [],
        added: g.added?.toISOString(),
        updated: g.updated?.toISOString(),
      }))
    )
  } catch (error) {
    console.error("Ground Station groups error:", error)
    return NextResponse.json(
      { error: "Ground Station groups error", details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const [group] = await gsDb
      .insert(schema.gsGroups)
      .values({
        name: body.name,
        identifier: body.identifier,
        type: body.type || "user",
      })
      .returning()

    // Add satellites to group if provided
    if (body.satellite_ids?.length) {
      await gsDb.insert(schema.gsGroupSatellites).values(
        body.satellite_ids.map((noradId: number) => ({
          groupId: group.id,
          noradId,
        }))
      )
    }

    return NextResponse.json({
      id: group.id,
      name: group.name,
      identifier: group.identifier,
      type: group.type,
      satellite_count: body.satellite_ids?.length || 0,
      added: group.added?.toISOString(),
      updated: group.updated?.toISOString(),
    })
  } catch (error) {
    console.error("Ground Station group create error:", error)
    return NextResponse.json(
      { error: "Ground Station group create failed", details: String(error) },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const [group] = await gsDb
      .update(schema.gsGroups)
      .set({
        name: body.name,
        identifier: body.identifier,
        type: body.type,
        updated: new Date(),
      })
      .where(eq(schema.gsGroups.id, body.id))
      .returning()

    return NextResponse.json({
      id: group.id,
      name: group.name,
      identifier: group.identifier,
      type: group.type,
      added: group.added?.toISOString(),
      updated: group.updated?.toISOString(),
    })
  } catch (error) {
    console.error("Ground Station group update error:", error)
    return NextResponse.json(
      { error: "Ground Station group update failed", details: String(error) },
      { status: 500 }
    )
  }
}
