/**
 * Ground Station Locations API
 *
 * CRUD for ground station locations.
 */

import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { gsDb, schema } from "@/lib/ground-station/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const locations = await gsDb.select().from(schema.gsLocations)
    return NextResponse.json(
      locations.map((loc) => ({
        id: loc.id,
        name: loc.name,
        lat: loc.lat,
        lon: loc.lon,
        alt: loc.alt,
        is_active: loc.isActive,
        added: loc.added?.toISOString(),
        updated: loc.updated?.toISOString(),
      }))
    )
  } catch (error) {
    console.error("Ground Station locations error:", error)
    return NextResponse.json(
      { error: "Ground Station locations error", details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Activate a location
    if (body.action === "activate" && body.id) {
      await gsDb
        .update(schema.gsLocations)
        .set({ isActive: false })
        .where(eq(schema.gsLocations.isActive, true))

      const [loc] = await gsDb
        .update(schema.gsLocations)
        .set({ isActive: true, updated: new Date() })
        .where(eq(schema.gsLocations.id, body.id))
        .returning()

      if (!loc) return NextResponse.json({ error: "Location not found" }, { status: 404 })
      return NextResponse.json({
        id: loc.id,
        name: loc.name,
        lat: loc.lat,
        lon: loc.lon,
        alt: loc.alt,
        is_active: loc.isActive,
      })
    }

    // Create new location
    const [loc] = await gsDb
      .insert(schema.gsLocations)
      .values({
        name: body.name,
        lat: body.lat,
        lon: body.lon,
        alt: body.alt || 0,
        isActive: body.is_active || false,
      })
      .returning()

    return NextResponse.json({
      id: loc.id,
      name: loc.name,
      lat: loc.lat,
      lon: loc.lon,
      alt: loc.alt,
      is_active: loc.isActive,
      added: loc.added?.toISOString(),
    })
  } catch (error) {
    console.error("Ground Station location create error:", error)
    return NextResponse.json(
      { error: "Ground Station location update failed", details: String(error) },
      { status: 500 }
    )
  }
}
