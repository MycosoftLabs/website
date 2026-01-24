import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_URL || env.mindexApiBaseUrl.replace(/\/api\/v1$/, "")

export async function GET(request: NextRequest) {
  if (!env.integrationsEnabled) {
    return NextResponse.json(
      { error: "Integrations disabled", code: "INTEGRATIONS_DISABLED", requiredEnv: ["INTEGRATIONS_ENABLED=true"] },
      { status: 503 },
    )
  }

  const deviceId = request.nextUrl.searchParams.get("device_id") || undefined
  const params = new URLSearchParams()
  if (deviceId) params.set("device_id", deviceId)

  try {
    const res = await fetch(`${MINDEX_API_URL}/api/mindex/agents/commands/queue?${params.toString()}`, {
      headers: { "X-API-Key": env.mindexApiKey || "" },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    })

    if (!res.ok) {
      return NextResponse.json(
        {
          error: "Upstream MINDEX commands queue endpoint unavailable",
          code: "UPSTREAM_UNAVAILABLE",
          status: res.status,
        },
        { status: 502 },
      )
    }

    return NextResponse.json(await res.json())
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch commands queue", code: "MINDEX_ERROR", details: String(error) },
      { status: 500 },
    )
  }
}

