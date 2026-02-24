import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const ONLINE_THRESHOLD_SECONDS = 60

function isServiceRequest(request: Request): boolean {
  const key = request.headers.get("x-service-key")
  const expected = process.env.PRESENCE_SERVICE_KEY
  return !!(expected && key && key === expected)
}

export async function GET(request: Request) {
  try {
    const serviceRequest = isServiceRequest(request)

    const supabase = serviceRequest
      ? await createAdminClient()
      : await createClient()

    if (!serviceRequest) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const cutoff = new Date(Date.now() - ONLINE_THRESHOLD_SECONDS * 1000).toISOString()

    const { data: heartbeats, error: hbError } = await supabase
      .from("user_heartbeat")
      .select("user_id, heartbeat_at, current_page, activity_type, session_id")
      .gte("heartbeat_at", cutoff)
      .eq("is_online", true)
      .order("heartbeat_at", { ascending: false })

    if (hbError) {
      console.error("Heartbeat fetch error:", hbError)
      return NextResponse.json({ error: "Failed to fetch online users" }, { status: 500 })
    }

    const latestByUser = new Map<string, (typeof heartbeats)[0]>()
    for (const h of heartbeats ?? []) {
      if (!latestByUser.has(h.user_id)) {
        latestByUser.set(h.user_id, h)
      }
    }

    const userIds = Array.from(latestByUser.keys())
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .in("id", userIds)

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

    const { data: sessions } = await supabase
      .from("active_sessions")
      .select("user_id, started_at, last_activity_at")
      .eq("is_active", true)
      .in("user_id", userIds)

    const sessionMap = new Map((sessions ?? []).map((s) => [s.user_id, s]))

    const online = Array.from(latestByUser.entries()).map(([uid, hb]) => {
      const profile = profileMap.get(uid)
      const sess = sessionMap.get(uid)
      const isSuperuser = ["admin", "superuser", "owner"].includes(
        (profile?.role ?? "").toLowerCase()
      )
      const duration = sess?.started_at
        ? Math.round(
            (new Date().getTime() - new Date(sess.started_at).getTime()) / 1000
          )
        : 0

      return {
        user_id: uid,
        name: profile?.full_name ?? profile?.email ?? uid,
        email: profile?.email ?? null,
        role: profile?.role ?? "user",
        is_superuser: isSuperuser,
        current_page: hb.current_page ?? "/",
        session_duration_seconds: duration,
        last_heartbeat: hb.heartbeat_at,
      }
    })

    return NextResponse.json({ online, count: online.length })
  } catch (err) {
    console.error("Online GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
