import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

interface WaypointPayload {
  color?: string
  icon?: string
  notes?: string
  category?: string
}

interface ClientWaypointBody {
  id: string
  name: string
  lat: number
  lng: number
  zoom?: number | null
  source?: string
  payload?: WaypointPayload
  color?: string
  icon?: string
  notes?: string
  category?: string
  /** Set when migrating localStorage ids so upserts dedupe per user */
  client_legacy_id?: string | null
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

/** GET — list waypoints for the signed-in user */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json(
        { authenticated: false, waypoints: [] },
        {
          headers: {
            "Cache-Control": "no-store",
            "X-CREP-Waypoints-Source": "anonymous",
          },
        }
      )
    }

    const { data, error } = await supabase
      .from("crep_waypoints")
      .select("id,label,lat,lon,zoom,source,payload,client_legacy_id,created_at,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("[crep/waypoints GET]", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      waypoints: (data || []).map((row) => rowToClient(row as Parameters<typeof rowToClient>[0])),
    })
  } catch (e) {
    console.error("[crep/waypoints GET]", e)
    return NextResponse.json(
      { available: false, waypoints: [] },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-CREP-Waypoints-Source": "unavailable",
        },
      }
    )
  }
}

/** POST — upsert one or many waypoints (migration + saves) */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const items: ClientWaypointBody[] = Array.isArray(body?.waypoints)
      ? body.waypoints
      : body?.waypoint
        ? [body.waypoint]
        : []

    if (!items.length) {
      return NextResponse.json({ error: "No waypoints in body" }, { status: 400 })
    }

    const rows = items.map((w) => {
      const legacy =
        w.client_legacy_id ??
        (String(w.id).startsWith("wp-") ? w.id : String(w.id))
      const payload: WaypointPayload = {
        ...(w.payload || {}),
        color: w.color ?? w.payload?.color,
        icon: w.icon ?? w.payload?.icon,
        notes: w.notes ?? w.payload?.notes,
        category: w.category ?? w.payload?.category,
      }

      return {
        user_id: user.id,
        label: w.name,
        lat: w.lat,
        lon: w.lng,
        zoom: w.zoom ?? null,
        source: w.source ?? "crep",
        payload,
        client_legacy_id: legacy,
      }
    })

    const { data, error } = await supabase
      .from("crep_waypoints")
      .upsert(rows, { onConflict: "user_id,client_legacy_id" })
      .select("id,label,lat,lon,zoom,source,payload,client_legacy_id,created_at")

    if (error) {
      console.error("[crep/waypoints POST]", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      waypoints: (data || []).map((row) => rowToClient(row as Parameters<typeof rowToClient>[0])),
    })
  } catch (e) {
    console.error("[crep/waypoints POST]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
