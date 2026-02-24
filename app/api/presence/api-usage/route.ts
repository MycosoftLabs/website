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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await request.json().catch(() => ({}))
    const { events } = body

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ ok: true })
    }

    const rows = events.slice(0, 100).map((e: Record<string, unknown>) => ({
      user_id: user?.id ?? null,
      endpoint: String(e.endpoint ?? ""),
      method: String(e.method ?? "GET"),
      status_code: typeof e.status_code === "number" ? e.status_code : null,
      response_time_ms: typeof e.response_time_ms === "number" ? e.response_time_ms : null,
      request_size_bytes: typeof e.request_size_bytes === "number" ? e.request_size_bytes : null,
      response_size_bytes: typeof e.response_size_bytes === "number" ? e.response_size_bytes : null,
    }))

    const { error } = await supabase.from("api_usage_log").insert(rows)

    if (error) {
      console.error("API usage insert error:", error)
      return NextResponse.json({ error: "Failed to log" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("API usage POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const serviceRequest = isServiceRequest(request)
    const supabase = serviceRequest
      ? await createAdminClient()
      : await createClient()

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
      const role = profile?.role ?? (user.user_metadata as Record<string, unknown>)?.role ?? "user"
      canViewAll = isStaffRole(String(role))
    }

    const searchParams = request.nextUrl.searchParams
    const hours = Math.min(168, Math.max(1, parseInt(searchParams.get("hours") ?? "24", 10)))
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    let query = supabase
      .from("api_usage_log")
      .select("endpoint, method, status_code, response_time_ms, called_at, user_id")
      .gte("called_at", cutoff)

    if (!canViewAll && currentUserId) {
      query = query.eq("user_id", currentUserId)
    }

    const { data: logs, error } = await query.order("called_at", { ascending: false }).limit(500)

    if (error) {
      console.error("API usage fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch usage" }, { status: 500 })
    }

    const byEndpoint: Record<string, { count: number; avg_ms: number; total: number }> = {}
    let totalCalls = 0
    let totalMs = 0

    for (const log of logs ?? []) {
      const ep = log.endpoint ?? "/unknown"
      if (!byEndpoint[ep]) {
        byEndpoint[ep] = { count: 0, avg_ms: 0, total: 0 }
      }
      byEndpoint[ep].count += 1
      byEndpoint[ep].total += log.response_time_ms ?? 0
      totalCalls += 1
      totalMs += log.response_time_ms ?? 0
    }

    for (const ep of Object.keys(byEndpoint)) {
      const b = byEndpoint[ep]
      b.avg_ms = b.count > 0 ? Math.round(b.total / b.count) : 0
      delete (b as Record<string, unknown>).total
    }

    return NextResponse.json({
      period_hours: hours,
      total_calls: totalCalls,
      avg_response_ms: totalCalls > 0 ? Math.round(totalMs / totalCalls) : 0,
      by_endpoint: byEndpoint,
    })
  } catch (err) {
    console.error("API usage GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
