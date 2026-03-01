import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function GET() {
  try {
    let grounding = null
    try {
      const response = await fetch(`${MAS_API_URL}/api/myca/grounding/status`, { cache: "no-store" })
      if (response.ok) grounding = await response.json()
    } catch {
      grounding = null
    }

    let apiUsage90d = null
    try {
      const supabase = await createAdminClient()
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from("api_usage_log")
        .select("id", { count: "exact", head: true })
        .gte("called_at", cutoff)
      if (typeof count === "number") apiUsage90d = { total_calls: count }
    } catch {
      apiUsage90d = null
    }

    return NextResponse.json({
      updated_at: new Date().toISOString(),
      grounding,
      api_usage_90d: apiUsage90d,
    })
  } catch (err) {
    return NextResponse.json({ error: "Failed to load metrics" }, { status: 500 })
  }
}
