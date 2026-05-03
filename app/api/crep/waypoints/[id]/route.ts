import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

interface WaypointPayload {
  color?: string
  icon?: string
  notes?: string
  category?: string
}

function rowToClient(row: {
  id: string
  label: string | null
  lat: number
  lon: number
  zoom: number | null
  source: string | null
  payload: Record<string, unknown> | null
  client_legacy_id: string | null
  created_at?: string | null
}) {
  const payload = (row.payload || {}) as WaypointPayload
  return {
    id: row.id,
    name: row.label || "Waypoint",
    lat: row.lat,
    lng: row.lon,
    zoom: row.zoom,
    source: row.source || "crep",
    color: payload.color,
    icon: payload.icon,
    notes: payload.notes,
    category: payload.category,
    client_legacy_id: row.client_legacy_id,
    created_at: row.created_at ?? undefined,
  }
}

/** PATCH — update waypoint row owned by current user */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const supabase = await createClient()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const payload: WaypointPayload = {
      ...(body.payload || {}),
      color: body.color ?? body.payload?.color,
      icon: body.icon ?? body.payload?.icon,
      notes: body.notes ?? body.payload?.notes,
      category: (body.category ?? body.payload?.category) as WaypointPayload["category"],
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (typeof body.name === "string") patch.label = body.name
    if (typeof body.lat === "number") patch.lat = body.lat
    if (typeof body.lng === "number") patch.lon = body.lng
    if (body.zoom !== undefined) patch.zoom = body.zoom
    if (Object.keys(payload).length) patch.payload = payload

    const { data, error } = await supabase
      .from("crep_waypoints")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id,label,lat,lon,zoom,source,payload,client_legacy_id,created_at")
      .maybeSingle()

    if (error) {
      console.error("[crep/waypoints PATCH]", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ waypoint: rowToClient(data as Parameters<typeof rowToClient>[0]) })
  } catch (e) {
    console.error("[crep/waypoints PATCH]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

/** DELETE */
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const supabase = await createClient()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabase.from("crep_waypoints").delete().eq("id", id).eq("user_id", user.id)

    if (error) {
      console.error("[crep/waypoints DELETE]", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[crep/waypoints DELETE]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
