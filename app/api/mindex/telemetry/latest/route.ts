/**
 * Latest Telemetry API Route (BFF Proxy)
 *
 * Proxies requests to MINDEX telemetry endpoints
 */

import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { getLatestTelemetry } from "@/lib/integrations/mindex"

export async function GET() {
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
    const result = await getLatestTelemetry()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching telemetry:", error)
    return NextResponse.json({ error: "Failed to fetch telemetry", code: "MINDEX_ERROR" }, { status: 500 })
  }
}
