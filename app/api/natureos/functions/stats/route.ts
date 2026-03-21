import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * Edge Function Stats API
 *
 * Queries api_usage_log to compute real invocation counts and
 * average response times for NatureOS serverless functions.
 * Falls back to zeros when no data is available.
 */

// Map API endpoints to function names
const FUNCTION_ENDPOINTS: Record<string, string> = {
  "species-lookup": "/api/mindex/species",
  "spore-analysis": "/api/natureos/spore",
  "mycelium-network-sync": "/api/natureos/mycelium",
  "compound-identifier": "/api/mindex/compounds",
  "image-classifier": "/api/ai",
  "dna-sequence-matcher": "/api/mindex/genes",
  "weather-data-fetcher": "/api/weather",
  "alert-dispatcher": "/api/mas/notifications",
  "ai-response-handler": "/api/myca",
  "training-data-logger": "/api/myca/training",
}

interface FunctionStat {
  functionName: string
  endpoint: string
  invocations: number
  avgDuration: number
  lastRun: string | null
  errorCount: number
}

export async function GET() {
  try {
    const supabase = await createClient()
    const stats: FunctionStat[] = []

    // Query api_usage_log for each function endpoint
    for (const [funcName, endpoint] of Object.entries(FUNCTION_ENDPOINTS)) {
      try {
        // Count total invocations for this endpoint
        const { count: invocations } = await supabase
          .from("api_usage_log")
          .select("*", { count: "exact", head: true })
          .like("endpoint", `${endpoint}%`)

        // Get average response time
        const { data: avgData } = await supabase
          .from("api_usage_log")
          .select("response_time")
          .like("endpoint", `${endpoint}%`)
          .not("response_time", "is", null)
          .order("called_at", { ascending: false })
          .limit(100)

        const responseTimes = (avgData || [])
          .map((r: { response_time: number | null }) => r.response_time)
          .filter((t): t is number => t !== null)
        const avgDuration = responseTimes.length > 0
          ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
          : 0

        // Get last invocation time
        const { data: lastData } = await supabase
          .from("api_usage_log")
          .select("called_at")
          .like("endpoint", `${endpoint}%`)
          .order("called_at", { ascending: false })
          .limit(1)

        // Count errors
        const { count: errorCount } = await supabase
          .from("api_usage_log")
          .select("*", { count: "exact", head: true })
          .like("endpoint", `${endpoint}%`)
          .gte("status", 400)

        stats.push({
          functionName: funcName,
          endpoint,
          invocations: invocations || 0,
          avgDuration,
          lastRun: lastData?.[0]?.called_at || null,
          errorCount: errorCount || 0,
        })
      } catch {
        // If individual query fails, push zeros
        stats.push({
          functionName: funcName,
          endpoint,
          invocations: 0,
          avgDuration: 0,
          lastRun: null,
          errorCount: 0,
        })
      }
    }

    return NextResponse.json({
      stats,
      queriedAt: new Date().toISOString(),
      source: "api_usage_log",
    })
  } catch (error) {
    console.error("Function stats error:", error)
    // Return empty stats on error
    return NextResponse.json({
      stats: Object.entries(FUNCTION_ENDPOINTS).map(([funcName, endpoint]) => ({
        functionName: funcName,
        endpoint,
        invocations: 0,
        avgDuration: 0,
        lastRun: null,
        errorCount: 0,
      })),
      queriedAt: new Date().toISOString(),
      source: "fallback",
    })
  }
}
