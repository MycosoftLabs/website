/**
 * CREP Map Preferences API
 *
 * Persists user map preferences (bounds, zoom, layers, kingdom filter)
 * to Supabase crep_map_preferences table.
 *
 * GET: Fetch user preferences (authenticated) or default
 * POST: Save/upsert preferences
 *
 * @route GET /api/crep/preferences
 * @route POST /api/crep/preferences
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export interface CrepMapPreferences {
  id?: string
  user_id?: string | null
  name: string
  bounds?: { north: number; south: number; east: number; west: number } | null
  center_lat?: number | null
  center_lng?: number | null
  zoom?: number | null
  layers?: string[] | null
  kingdom_filter?: string | null
  created_at?: string
  updated_at?: string
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const searchParams = request.nextUrl.searchParams
    const name = searchParams.get("name") || "default"

    if (!user) {
      return NextResponse.json({ preferences: null, authenticated: false })
    }

    const { data, error } = await supabase
      .from("crep_map_preferences")
      .select("*")
      .eq("user_id", user.id)
      .eq("name", name)
      .maybeSingle()

    if (error) {
      console.error("[CREP/preferences] Supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      preferences: data as CrepMapPreferences | null,
      authenticated: true,
    })
  } catch (err) {
    console.error("[CREP/preferences] GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json() as Partial<CrepMapPreferences>
    const name = body.name || "default"

    const payload = {
      user_id: user.id,
      name,
      bounds: body.bounds ?? null,
      center_lat: body.center_lat ?? null,
      center_lng: body.center_lng ?? null,
      zoom: body.zoom ?? 8,
      layers: body.layers ?? [],
      kingdom_filter: body.kingdom_filter ?? "all",
      updated_at: new Date().toISOString(),
    }

    const { data: existing } = await supabase
      .from("crep_map_preferences")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", name)
      .maybeSingle()

    let data: CrepMapPreferences | null = null
    let error: { message: string } | null = null

    if (existing?.id) {
      const res = await supabase
        .from("crep_map_preferences")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single()
      data = res.data as CrepMapPreferences
      error = res.error as { message: string } | null
    } else {
      const res = await supabase
        .from("crep_map_preferences")
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select()
        .single()
      data = res.data as CrepMapPreferences
      error = res.error as { message: string } | null
    }

    if (error) {
      console.error("[CREP/preferences] Supabase save error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ preferences: data })
  } catch (err) {
    console.error("[CREP/preferences] POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
