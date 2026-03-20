import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

function isStaffRole(role: string | undefined): boolean {
  if (!role) return false
  const r = role.toLowerCase()
  return ["admin", "superuser", "owner", "staff"].includes(r)
}

function isServiceRequest(request: NextRequest): boolean {
  const key = request.headers.get("x-service-key")
  const expected = process.env.PRESENCE_SERVICE_KEY
  return !!(expected && key && key === expected)
}

export async function GET(request: NextRequest) {
  try {
    const serviceRequest = isServiceRequest(request)
    const supabase = serviceRequest ? await createAdminClient() : await createClient()

    let canViewAll = serviceRequest
    let currentUserId: string | null = null

    if (!serviceRequest) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      currentUserId = user.id
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
      const role = (profile?.role ?? (user.user_metadata as Record<string, unknown>)?.role ?? "user") as string
      canViewAll = isStaffRole(role)
    }

    const searchParams = request.nextUrl.searchParams
    const filterUserId = searchParams.get("user_id")

    if (filterUserId && filterUserId !== currentUserId && !canViewAll) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let query = supabase
      .from("active_sessions")
      .select("id, user_id, session_id, started_at, last_activity_at, is_active, app_context, page_path, metadata")
      .eq("is_active", true)
      .order("last_activity_at", { ascending: false })

    if (!canViewAll && currentUserId) {
      query = query.eq("user_id", currentUserId)
    } else if (filterUserId) {
      query = query.eq("user_id", filterUserId)
    }

    const { data: sessions, error } = await query

    if (error) {
      console.error("Sessions fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
    }

    const userIds = [...new Set((sessions ?? []).map((s: any) => s.user_id))]
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .in("id", userIds)

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]))

    const enriched = (sessions ?? []).map((s: any) => ({
      ...s,
      user: profileMap.get(s.user_id) ?? { id: s.user_id, full_name: null, email: null, role: "user" },
      duration_seconds: s.last_activity_at
        ? Math.round(
            (new Date().getTime() - new Date(s.last_activity_at).getTime()) / 1000
          )
        : 0,
    }))

    return NextResponse.json({ sessions: enriched })
  } catch (err) {
    console.error("Sessions GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
