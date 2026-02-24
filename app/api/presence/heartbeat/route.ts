import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const {
      session_id,
      page_path,
      activity_type,
      app_context = "web",
      end_session = false,
    } = body

    if (!session_id || typeof session_id !== "string") {
      return NextResponse.json({ error: "session_id required" }, { status: 400 })
    }

    const now = new Date().toISOString()

    if (end_session) {
      await supabase
        .from("active_sessions")
        .update({
          is_active: false,
          ended_at: now,
          last_activity_at: now,
        })
        .eq("user_id", user.id)
        .eq("session_id", session_id)
    } else {
      await supabase.from("user_heartbeat").insert({
        user_id: user.id,
        heartbeat_at: now,
        is_online: true,
        current_page: page_path ?? "/",
        activity_type: activity_type ?? "active",
        session_id,
      })

      const { data: existing } = await supabase
        .from("active_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("session_id", session_id)
        .single()

      if (existing) {
        await supabase
          .from("active_sessions")
          .update({
            last_activity_at: now,
            is_active: true,
            app_context,
            page_path: page_path ?? "/",
            metadata: { activity_type: activity_type ?? "active" },
          })
          .eq("user_id", user.id)
          .eq("session_id", session_id)
      } else {
        await supabase.from("active_sessions").insert({
          user_id: user.id,
          session_id,
          started_at: now,
          last_activity_at: now,
          is_active: true,
          app_context,
          page_path: page_path ?? "/",
          metadata: { activity_type: activity_type ?? "active" },
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Heartbeat error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
