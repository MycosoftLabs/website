/**
 * Devices API Route (BFF Proxy)
 *
 * Proxies requests to MINDEX device endpoints
 */

import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { getDevices } from "@/lib/integrations/mindex"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = Number.parseInt(searchParams.get("page") || "1")
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "50")
  const type = searchParams.get("type") || undefined

  if (!env.integrationsEnabled) {
    return NextResponse.json(
      {
        error: "MINDEX integration is disabled. This endpoint requires a live MINDEX backend.",
        code: "INTEGRATIONS_DISABLED",
        requiredEnv: ["INTEGRATIONS_ENABLED=true", "MINDEX_API_BASE_URL", "MINDEX_API_KEY"],
      },
      { status: 503 },
    )
  }

  try {
    const result = await getDevices({ page, pageSize })
    const devices = type ? result.data.filter((d) => d.type === type) : result.data

    return NextResponse.json({
      ...result,
      data: devices,
      meta: {
        ...result.meta,
        total: devices.length,
      },
    })
  } catch (error) {
    console.error("Error fetching devices:", error)
    return NextResponse.json({ error: "Failed to fetch devices", code: "MINDEX_ERROR" }, { status: 500 })
  }
}
