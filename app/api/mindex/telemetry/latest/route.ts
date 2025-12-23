/**
 * Latest Telemetry API Route (BFF Proxy)
 *
 * Proxies requests to MINDEX telemetry endpoints
 */

import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { getLatestTelemetry } from "@/lib/integrations/mindex"
import { mockTelemetry } from "@/lib/integrations/mock-data"

export async function GET() {
  // Return mock data if integrations disabled
  if (!env.integrationsEnabled) {
    return NextResponse.json({
      data: mockTelemetry,
      meta: { total: mockTelemetry.length },
    })
  }

  try {
    const result = await getLatestTelemetry()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching telemetry:", error)
    return NextResponse.json({ error: "Failed to fetch telemetry", code: "MINDEX_ERROR" }, { status: 500 })
  }
}
