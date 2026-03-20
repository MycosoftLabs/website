/**
 * Ground Station Preferences API
 *
 * Key-value preference storage.
 */

import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { gsDb, schema } from "@/lib/ground-station/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const prefs = await gsDb.select().from(schema.gsPreferences)
    return NextResponse.json(
      prefs.map((p) => ({
        id: p.id,
        name: p.name,
        value: p.value,
        added: p.added?.toISOString(),
        updated: p.updated?.toISOString(),
      }))
    )
  } catch (error) {
    console.error("Ground Station preferences error:", error)
    return NextResponse.json(
      { error: "Ground Station preferences error", details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const existing = await gsDb
      .select()
      .from(schema.gsPreferences)
      .where(eq(schema.gsPreferences.name, body.name))
      .limit(1)

    if (existing.length > 0) {
      const [pref] = await gsDb
        .update(schema.gsPreferences)
        .set({ value: body.value, updated: new Date() })
        .where(eq(schema.gsPreferences.name, body.name))
        .returning()
      return NextResponse.json({
        id: pref.id,
        name: pref.name,
        value: pref.value,
      })
    }

    const [pref] = await gsDb
      .insert(schema.gsPreferences)
      .values({ name: body.name, value: body.value })
      .returning()

    return NextResponse.json({
      id: pref.id,
      name: pref.name,
      value: pref.value,
    })
  } catch (error) {
    console.error("Ground Station preferences update error:", error)
    return NextResponse.json(
      { error: "Ground Station preferences update failed", details: String(error) },
      { status: 500 }
    )
  }
}
